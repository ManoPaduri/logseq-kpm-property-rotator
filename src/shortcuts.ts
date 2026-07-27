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

  // Register via command palette (block-editing-only fires when typing in a block)
  // NOTE: requires full Logseq restart to activate the keybinding
  logseq.App.registerCommandPalette(
    {
      key: "property-rotator/main",
      label: "Rotate Property",
      keybinding: { binding: mainShortcut, mode: "editing" }
    },
    async () => { console.log("[Property Rotator] main palette/shortcut triggered"); await handleRotation(false); }
  );

  logseq.App.registerCommandPalette(
    {
      key: "property-rotator/sub",
      label: "Sub-Rotate Property",
      keybinding: { binding: subShortcut, mode: "editing" }
    },
    async () => { console.log("[Property Rotator] sub palette/shortcut triggered"); await handleRotation(true); }
  );

  // Fallback: raw keydown on top.document (works when Logseq shortcut system blocks the plugin)
  const targetDoc = (() => {
    try { if (top?.document) { console.log("[PR SHORTCUTS] attaching keydown to top.document"); return top.document; } }
    catch { console.log("[PR SHORTCUTS] top.document blocked, trying window.parent"); }
    try { if (window.parent?.document) return window.parent.document; }
    catch { console.log("[PR SHORTCUTS] window.parent.document blocked, using own document"); }
    return document;
  })();

  console.log("[PR SHORTCUTS] keydown listener target:", targetDoc === top?.document ? "top.document" : targetDoc === window.parent?.document ? "window.parent.document" : "own document");

  targetDoc.addEventListener("keydown", async (e: KeyboardEvent) => {
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    // Log EVERY keydown so we know the listener fires at all
    console.log("[PR KEYDOWN] FIRED key:", JSON.stringify(e.key), "ctrl:", ctrl, "shift:", shift, "alt:", e.altKey, "target:", (e.target as HTMLElement)?.tagName, (e.target as HTMLElement)?.className?.substring?.(0,40));

    const main = (currentSettings.shortcuts?.mainShortcut || "ctrl+shift+j").trim().toLowerCase();
    const sub = (currentSettings.shortcuts?.subShortcut || "ctrl+shift+k").trim().toLowerCase();
    console.log("[PR KEYDOWN] comparing against main:", main, "sub:", sub);

    const matchesShortcut = (shortcut: string, ev: KeyboardEvent) => {
      const parts = shortcut.split("+");
      const needCtrl = parts.includes("ctrl") || parts.includes("mod");
      const needMeta = parts.includes("meta");
      const needShift = parts.includes("shift");
      const needAlt = parts.includes("alt");
      const keyPart = parts[parts.length - 1];
      const result = (ev.ctrlKey || ev.metaKey) === (needCtrl || needMeta) &&
             ev.shiftKey === needShift &&
             ev.altKey === needAlt &&
             ev.key.toLowerCase() === keyPart;
      console.log("[PR KEYDOWN] matchesShortcut('", shortcut, "') needCtrl:", needCtrl, "needShift:", needShift, "keyPart:", keyPart, "→", result);
      return result;
    };

    const mainMatch = matchesShortcut(main, e);
    const subMatch = !mainMatch && matchesShortcut(sub, e);

    if (mainMatch) {
      console.log("[PR KEYDOWN] ✓ main shortcut matched! calling handleRotation(false)");
      e.preventDefault();
      e.stopPropagation();
      await handleRotation(false);
    } else if (subMatch) {
      console.log("[PR KEYDOWN] ✓ sub shortcut matched! calling handleRotation(true)");
      e.preventDefault();
      e.stopPropagation();
      await handleRotation(true);
    } else {
      console.log("[PR KEYDOWN] no shortcut match for key:", JSON.stringify(e.key));
    }
  }, true);

  console.log("[PR SHORTCUTS] keydown listener attached successfully");
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
