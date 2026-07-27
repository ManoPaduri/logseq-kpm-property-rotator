/**
 * Main entry point for Property Rotator plugin
 * This module handles plugin initialization and registration
 * Contract: Provides main() function that initializes all plugin components
 */

import "@logseq/libs";
import { PluginSettings } from "./types";
import { registerShortcuts, setSettings } from "./shortcuts";
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
  console.log("[PR INIT] main() started");
  try {
    // Register the structured settings schema (native Logseq settings UI)
    registerSettings();
    console.log("[PR INIT] registerSettings done");

    // Load user settings from the schema
    const settings = loadSettings();
    console.log("[PR INIT] loadSettings done, rotations:", settings?.rotations?.length, "shortcuts:", settings?.shortcuts);

    // Force-reset shortcuts if they still have the old stale defaults
    const savedMain = String(logseq.settings?.mainShortcut ?? "");
    const savedSub = String(logseq.settings?.subShortcut ?? "");
    console.log("[PR INIT] saved shortcuts from settings - main:", savedMain, "sub:", savedSub);
    const staleValues = ["mod+shift+alt+enter", "mod+shift+enter", "mod+shift+r", "mod+shift+return", "mod+shift+1", "mod+shift+2", "mod+opt+[", "mod+opt+<", "mod+shift+o", "mod+shift+k"];
    if (staleValues.includes(savedMain) || staleValues.includes(savedSub)) {
      console.log("[PR INIT] resetting stale shortcuts");
      await logseq.updateSettings({ mainShortcut: "ctrl+shift+j", subShortcut: "ctrl+shift+k" });
      settings.shortcuts = { mainShortcut: "ctrl+shift+j", subShortcut: "ctrl+shift+k" };
    }
    // Sync UI fields based on active profile or defaults
    const activeProfile = String(logseq.settings?.profile ?? "custom").trim().toLowerCase();
    console.log("[PR INIT] activeProfile:", activeProfile);
    if (activeProfile !== "custom" && profiles[activeProfile]) {
      console.log("[PR INIT] syncing profile to UI:", activeProfile);
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

    console.log("[PR INIT] calling registerShortcuts with main:", settings?.shortcuts?.mainShortcut, "sub:", settings?.shortcuts?.subShortcut);
    // Register keyboard shortcuts with live settings
    registerShortcuts(settings);
    console.log("[PR INIT] registerShortcuts done");

    // Track current shortcuts to avoid unnecessary re-registration
    let currentMainShortcut = (settings.shortcuts?.mainShortcut || "").trim() || "ctrl+shift+j";
    let currentSubShortcut = (settings.shortcuts?.subShortcut || "").trim() || "ctrl+shift+k";

    // Register toolbar button
    registerToolbarButton();

    // Track last synced profile to detect real changes vs. our own updateSettings calls
    let lastSyncedProfile = activeProfile;
    // Block onSettingsChanged during entire init to prevent re-registration from startup updateSettings calls
    let isSyncing = true;
    // Allow settings changes after a short delay so init updateSettings calls are ignored
    setTimeout(() => { console.log("[PR INIT] isSyncing unlocked - plugin fully ready"); isSyncing = false; }, 2000);

    // Apply settings changes live, without requiring a plugin reload
    logseq.onSettingsChanged(async (newSettings: any) => {
      // Guard against re-entry caused by syncProfileToUI calling updateSettings or init
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
    console.log("[PR INIT] main() completed successfully");
  } catch (error) {
    console.error("[PR INIT] FATAL ERROR initializing Property Rotator plugin:", error);
    logseq.UI.showMsg("Error initializing Property Rotator plugin", "error");
  }
}

// Start the plugin when Logseq is ready
logseq.ready(main).catch(console.error);
