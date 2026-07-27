/**
 * Main entry point for Property Rotator plugin
 * This module handles plugin initialization and registration
 * Contract: Provides main() function that initializes all plugin components
 */

import "@logseq/libs";
import { PluginSettings } from "./types";
import { registerShortcuts, setSettings, handleRotation } from "./shortcuts";
import { registerToolbarButton } from "./ui/toolbar";
import { registerSettings, buildSettingsFromSchema, MAX_SUBLISTS } from "./ui/settings";
import { defaultSettings, profiles } from "./config";

/**
 * When a profile is active, write its values into the manual UI fields
 * so the user can see what the profile contains (fields act as read-only display).
 */
async function syncProfileToUI(profileKey: string): Promise<void> {
  const p = profiles[profileKey];
  if (!p) return;
  const r1 = p.rotations[0];
  const r2 = p.rotations[1];
  const defSubs = r1?.subRotations || {};
  const defTerms = r1?.terms || [];
  const update: Record<string, string> = {
    property1: r1?.property ?? "",
    terms1: defTerms.join(", "),
    property2: r2?.property ?? "",
    terms2: (r2?.terms ?? []).join(", "),
    propertyPrefix: profileKey  // default prefix = profile name
  };
  for (let m = 1; m <= MAX_SUBLISTS; m++) {
    const term = defTerms[m - 1];
    update[`property1subList${m}`] = term ? (defSubs[term] || []).join(", ") : "";
  }
  await logseq.updateSettings(update);
}

/**
 * Build the current plugin settings from the native settings schema fields.
 * The builder is defensive and always returns a valid PluginSettings
 * (falling back to defaults if no terms are configured).
 */
function loadSettings(): PluginSettings {
  return buildSettingsFromSchema(logseq.settings);
}

/**
 * Main plugin initialization function
 * Called when Logseq loads the plugin
 */
async function main() {
  try {
    // Register the structured settings schema (native Logseq settings UI)
    registerSettings();

    // Load user settings from the schema
    const settings = loadSettings();

    // Force-reset shortcuts if they still have the old stale defaults
    const savedMain = String(logseq.settings?.mainShortcut ?? "");
    const savedSub = String(logseq.settings?.subShortcut ?? "");
    const staleValues = ["mod+shift+alt+enter", "mod+shift+enter", "mod+shift+r", "mod+shift+return", "mod+shift+1", "mod+shift+2", "mod+opt+[", "mod+opt+<", "mod+shift+o", "mod+shift+k"];
    if (staleValues.includes(savedMain) || staleValues.includes(savedSub)) {
      await logseq.updateSettings({ mainShortcut: "ctrl+shift+j", subShortcut: "ctrl+shift+k" });
      settings.shortcuts = { mainShortcut: "ctrl+shift+j", subShortcut: "ctrl+shift+k" };
    }
    // Sync UI fields based on active profile or defaults
    const activeProfile = String(logseq.settings?.profile ?? "custom").trim().toLowerCase();
    if (activeProfile !== "custom" && profiles[activeProfile]) {
      await syncProfileToUI(activeProfile);
    } else {
      const d = defaultSettings.rotations[0];
      const d2 = defaultSettings.rotations[1];
      const defTerms = d.terms;
      const defSubs = d.subRotations || {};
      const subListUpdate: Record<string, string> = {
        property1: d.property,
        terms1: defTerms.join(", "),
        property2: d2?.property ?? "",
        terms2: d2 ? d2.terms.join(", ") : ""
      };
      for (let m = 1; m <= MAX_SUBLISTS; m++) {
        const term = defTerms[m - 1];
        subListUpdate[`property1subList${m}`] = term ? (defSubs[term] || []).join(", ") : "";
      }
      await logseq.updateSettings(subListUpdate);
    }

    // Register keyboard shortcuts with live settings
    registerShortcuts(settings);

    // Track current shortcuts to avoid unnecessary re-registration
    let currentMainShortcut = (settings.shortcuts?.mainShortcut || "").trim() || "ctrl+shift+j";
    let currentSubShortcut = (settings.shortcuts?.subShortcut || "").trim() || "ctrl+shift+k";

    // Register toolbar button
    registerToolbarButton();

    // Use raw keydown to trigger rotation - works regardless of editor state
    // top.document is cross-origin in some Logseq builds — fall back safely
    const targetDoc = (() => {
      try { if (top?.document) return top.document; } catch { /* cross-origin blocked */ }
      try { if (window.parent?.document) return window.parent.document; } catch { /* blocked */ }
      return document;
    })();
    console.log("[Property Rotator] keydown target doc:", targetDoc === document ? "plugin-iframe" : "top/parent");
    targetDoc.addEventListener("keydown", async (e: KeyboardEvent) => {
      const main = (settings.shortcuts?.mainShortcut || "").trim() || "ctrl+shift+j";
      const sub = (settings.shortcuts?.subShortcut || "").trim() || "ctrl+shift+k";

      const key = e.key.toLowerCase();
      const isCtrl = e.ctrlKey;
      const isShift = e.shiftKey;
      const isMeta = e.metaKey;

      const parseBinding = (binding: string) => {
        const parts = binding.toLowerCase().split("+");
        return {
          ctrl: parts.includes("ctrl"),
          shift: parts.includes("shift"),
          meta: parts.includes("mod") || parts.includes("meta") || parts.includes("cmd"),
          key: parts[parts.length - 1]
        };
      };

      const mainB = parseBinding(main);
      const subB = parseBinding(sub);

      const matchesMain = mainB.ctrl === isCtrl && mainB.shift === isShift && mainB.meta === isMeta && mainB.key === key;
      const matchesSub = subB.ctrl === isCtrl && subB.shift === isShift && subB.meta === isMeta && subB.key === key;

      if (matchesMain) {
        console.log("[Property Rotator] keydown matched main shortcut");
        e.preventDefault();
        e.stopPropagation();
        await handleRotation(false);
      } else if (matchesSub) {
        console.log("[Property Rotator] keydown matched sub shortcut");
        e.preventDefault();
        e.stopPropagation();
        await handleRotation(true);
      }
    });

    // Track last synced profile to detect real changes vs. our own updateSettings calls
    let lastSyncedProfile = activeProfile;
    let isSyncing = false;

    // Apply settings changes live, without requiring a plugin reload
    logseq.onSettingsChanged(async (newSettings: any) => {
      // Guard against re-entry caused by syncProfileToUI calling updateSettings
      if (isSyncing) return;

      const newProfile = String(newSettings?.profile ?? "custom").trim().toLowerCase();

      // Only sync if profile actually changed (not triggered by our own updateSettings)
      if (newProfile !== "custom" && profiles[newProfile] && newProfile !== lastSyncedProfile) {
        isSyncing = true;
        lastSyncedProfile = newProfile;
        await syncProfileToUI(newProfile);
        isSyncing = false;
      } else if (newProfile === "custom" && lastSyncedProfile !== "custom") {
        lastSyncedProfile = "custom";
        isSyncing = true;
        await logseq.updateSettings({ propertyPrefix: "my" });
        isSyncing = false;
      }

      const updated = buildSettingsFromSchema(newSettings);
      setSettings(updated);

      // Only re-register shortcuts if they actually changed
      const newMainShortcut = (updated.shortcuts?.mainShortcut || "").trim() || "ctrl+shift+j";
      const newSubShortcut = (updated.shortcuts?.subShortcut || "").trim() || "ctrl+shift+k";

      if (newMainShortcut !== currentMainShortcut || newSubShortcut !== currentSubShortcut) {
        registerShortcuts(updated);
        currentMainShortcut = newMainShortcut;
        currentSubShortcut = newSubShortcut;
      }

    });
  } catch (error) {
    console.error("Error initializing Property Rotator plugin:", error);
    logseq.UI.showMsg("Error initializing Property Rotator plugin", "error");
  }
}

// Start the plugin when Logseq is ready
logseq.ready(main).catch(console.error);
