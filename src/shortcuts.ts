/**
 * Keyboard shortcut handlers for Property Rotator plugin
 * This module handles keyboard shortcut registration and execution
 * Contract: Provides registerShortcuts() function that integrates with Logseq
 */

import "@logseq/libs";
import { rotateProperty } from './rotation';
import { defaultSettings } from './config';
import { PluginSettings } from './types';
import { getCurrentBlock, setBlockProperty, getCursorProperty, focusPropertyLine } from './api/logseq';

// Store settings for use in handler
let currentSettings: PluginSettings = defaultSettings;

/**
 * Update the active settings used by the rotation handler.
 * Call this when the user changes settings so no reload is required.
 * @param settings - The new plugin settings
 */
export function setSettings(settings: PluginSettings): void {
  currentSettings = settings;
}

/**
 * Register all keyboard shortcuts for the plugin
 * @param settings - Current plugin settings
 */
export function registerShortcuts(settings: PluginSettings = defaultSettings): void {
  currentSettings = settings;

  const mainShortcut = (settings.shortcuts?.mainShortcut || "").trim() || "ctrl+shift+j";
  const subShortcut = (settings.shortcuts?.subShortcut || "").trim() || "ctrl+shift+k";
  console.log("[PR SHORTCUTS] registerShortcuts called - main:", mainShortcut, "sub:", subShortcut);

  // mode: "global" uses register-shortcut! (dynamic) — fires even when editor is focused
  // The key insight from cycle-todo-dwim: use checkEditing() to get the block UUID
  logseq.App.registerCommandPalette(
    {
      key: "property-rotator/main",
      label: "Rotate Property",
      keybinding: { binding: mainShortcut, mode: "global" }
    },
    async () => { console.log("[Property Rotator] main palette/shortcut triggered"); await handleRotation(false); }
  );

  logseq.App.registerCommandPalette(
    {
      key: "property-rotator/sub",
      label: "Sub-Rotate Property",
      keybinding: { binding: subShortcut, mode: "global" }
    },
    async () => { console.log("[Property Rotator] sub palette/shortcut triggered"); await handleRotation(true); }
  );

  console.log("[PR SHORTCUTS] registerCommandPalette done - shortcuts registered with mode:global");
}

/**
 * Export handleRotation for use by other modules
 * @param useSubRotation - Whether to use sub-rotation
 */
export async function handleRotation(useSubRotation: boolean): Promise<void> {
  console.log("[PR] handleRotation called, useSubRotation:", useSubRotation);
  const block = await getCurrentBlock();
  console.log("[PR] getCurrentBlock result:", JSON.stringify(block ? { uuid: block.uuid, content: block.content?.substring(0, 80), propKeys: Object.keys(block.properties || {}) } : null));

  if (!block) {
    console.log("[PR] No block found - is cursor inside a block in edit mode?");
    logseq.UI.showMsg("No current block found", "error");
    return;
  }

  const rotations = currentSettings?.rotations || defaultSettings.rotations;
  console.log("[PR] rotations count:", rotations.length, "prefix:", (currentSettings?.propertyPrefix ?? "").trim() || "(none)");

  // Build prefixed property name helper
  const rawPrefix = (currentSettings?.propertyPrefix ?? "").trim();
  // effectiveProp: the key written to the block (e.g. "gtd-status")
  // lookupKey: Logseq normalises "gtd-status" → "gtdStatus" (camelCase) in block.properties
  const prefixProp = (name: string) => rawPrefix ? `${rawPrefix}-${name}` : name;
  // Logseq normalises "gtd-status" → "gtdStatus" (camelCase) in block.properties
  const lookupKey = (name: string) => prefixProp(name).replace(/-([a-z])/g, (_, c) => c.toUpperCase());

  // Detect which property the cursor is on — prioritise that one
  const cursorProp = await getCursorProperty();
  console.log("[PR] cursorProp:", cursorProp);

  // If cursor is on a configured secondary property, rotate only that one
  if (cursorProp) {
    const cursorRotation = rotations.find(r =>
      prefixProp(r.property).toLowerCase() === cursorProp ||
      lookupKey(r.property).toLowerCase() === cursorProp
    );
    if (cursorRotation) {
      const effectiveProp = prefixProp(cursorRotation.property);
      const raw = block.properties[lookupKey(cursorRotation.property)];
      const currentValue = raw !== undefined && raw !== null ? String(raw) : null;
      const newValue = rotateProperty(currentValue, cursorRotation, useSubRotation);
      if (newValue === null) return;
      const saved = await setBlockProperty(block.uuid, effectiveProp, newValue);
      if (saved) {
        logseq.UI.showMsg(`Rotated ${effectiveProp}: ${currentValue} → ${newValue}`, "success");
        await focusPropertyLine(block.uuid, effectiveProp);
      } else {
        logseq.UI.showMsg(`Failed to save ${effectiveProp}`, "error");
      }
      return;
    }
  }

  console.log("[PR] scanning rotations for existing property...");
  for (const rotation of rotations) {
    const effectiveProp = prefixProp(rotation.property);
    const raw = block.properties[lookupKey(rotation.property)];
    const currentValue = raw !== undefined && raw !== null ? String(raw) : null;
    console.log("[PR] rotation:", rotation.property, "effectiveProp:", effectiveProp, "lookupKey:", lookupKey(rotation.property), "raw:", raw, "currentValue:", currentValue);

    if (currentValue !== null) {
      const newValue = rotateProperty(currentValue, rotation, useSubRotation);

      if (newValue === null) return;

      const saved = await setBlockProperty(block.uuid, effectiveProp, newValue);

      if (saved) {
        logseq.UI.showMsg(`Rotated ${effectiveProp}: ${currentValue} → ${newValue}`, "success");
        await focusPropertyLine(block.uuid, effectiveProp);
      } else {
        logseq.UI.showMsg(`Failed to save ${effectiveProp}`, "error");
      }
      return;
    }
  }

  // No existing property found — add all configured properties with their first terms
  console.log("[PR] no existing property found - will add first terms");
  const validRotations = rotations.filter(r => r.terms.length > 0);
  console.log("[PR] validRotations:", validRotations.length);
  if (validRotations.length === 0) {
    logseq.UI.showMsg("No rotations configured", "warning");
    return;
  }

  for (const rotation of validRotations) {
    const effectiveProp = prefixProp(rotation.property);
    const firstTerm = rotation.terms[0];
    await setBlockProperty(block.uuid, effectiveProp, firstTerm);
  }

  const firstProp = prefixProp(validRotations[0].property);
  const addedNames = validRotations.map(r => prefixProp(r.property)).join(", ");
  logseq.UI.showMsg(`Added ${addedNames}`, "success");
  await focusPropertyLine(block.uuid, firstProp);
}
