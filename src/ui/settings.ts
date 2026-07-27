/**
 * Settings panel component for Property Rotator plugin
 * This module handles settings UI and persistence
 * Contract: Provides settings registration and validation
 */

import "@logseq/libs";
import { defaultSettings, profiles } from '../config';
import { PluginSettings, RotationConfig } from '../types';

/** Maximum number of properties exposed in the native settings UI */
export const MAX_PROPERTIES = 2;
/** Maximum number of per-term sub-list slots per property */
export const MAX_SUBLISTS = 6;

/**
 * Register the structured settings schema for the plugin.
 * Uses Logseq's native per-plugin settings UI. For each of MAX_PROPERTIES
 * rotation slots there is a property name, a comma-separated (unlimited) terms
 * field, and MAX_SUBLISTS sub-list fields keyed by property index
 * (property{P}subList{M}), where sub-list M maps to the property's Mth term.
 */
export function registerSettings(): void {
  const d = defaultSettings.rotations[0];
  const defTerms = d.terms;
  const defSubs = d.subRotations || {};

  const schema: any[] = [];

  // Profile selector
  schema.push({
    key: "profileHeading",
    type: "heading",
    default: null,
    title: "Quick Profile",
    description: "Select a preset profile to apply its rotation settings. Overrides all manual rotation fields below. Note: field values below do not update instantly here — close and re-open settings to see them reflected."
  });
  schema.push({
    key: "profile",
    type: "enum",
    default: "custom",
    title: "Active Profile",
    description: "custom = use manual settings below",
    enumPicker: "select",
    enumChoices: ["custom", "gtd", "para"]
  });

  // Property prefix
  schema.push({
    key: "prefixHeading",
    type: "heading",
    default: null,
    title: "Property Prefix",
    description: "Optional short prefix (2-4 chars) prepended to every property name with a dash. E.g. prefix \"gtd\" turns \"status\" into \"gtd-status\"."
  });
  schema.push({
    key: "propertyPrefix",
    type: "string",
    default: "my",
    title: "Prefix",
    description: "Short prefix (2-4 chars) prepended to property names. Default: my. Profiles default to their own name (gtd / para)."
  });

  // Keyboard shortcuts section
  schema.push({
    key: "shortcutsHeading",
    type: "heading",
    default: null,
    title: "Keyboard Shortcuts",
    description: "Customize keyboard shortcuts for property rotation"
  });

  schema.push({
    key: "mainShortcut",
    type: "string",
    default: "mod+shift+,",
    title: "Main Rotation Shortcut",
    description: "Keyboard shortcut for main property rotation. Use 'mod' for Cmd on Mac / Ctrl on Windows (e.g., mod+shift+,)"
  });

  schema.push({
    key: "subShortcut",
    type: "string",
    default: "mod+shift+.",
    title: "Sub-Rotation Shortcut",
    description: "Keyboard shortcut for sub-rotation. Use 'mod' for Cmd on Mac / Ctrl on Windows (e.g., mod+shift+.)"
  });

  for (let p = 1; p <= MAX_PROPERTIES; p++) {
    const slot = defaultSettings.rotations[p - 1];
    const slotDefault = slot ?? null;

    schema.push({
      key: `propertyHeading${p}`,
      type: "heading",
      default: null,
      title: `Rotation ${p}`,
      description: `A block property and the list of values it cycles through. Leave the fields below blank to turn this rotation off.`
    });
    schema.push({
      key: `property${p}`,
      type: "string",
      default: slotDefault ? slotDefault.property : "",
      title: `Rotation ${p} — Property Name`,
      description: "The name of the block property this rotation changes, e.g. status or priority."
    });
    schema.push({
      key: `terms${p}`,
      type: "string",
      default: slotDefault ? slotDefault.terms.join(", ") : "",
      title: `Rotation ${p} — Values`,
      description: "The list of values to cycle through, in order. Separate with commas, e.g. todo, doing, done."
    });
  }

  // Add heading for Property 1 sub-lists after all property configurations
  schema.push({
    key: `subListsHeading`,
    type: "heading",
    default: null,
    title: `Rotation 1 — Sub-values (optional)`,
    description: `Optional second-level values for each value in Rotation 1. Press the sub-rotation shortcut to cycle them; they appear after a slash, e.g. "todo/high".`
  });

  // Create sub-list fields for property1
  for (let m = 1; m <= MAX_SUBLISTS; m++) {
    const term = defTerms[m - 1];
    const defSub = term ? (defSubs[term] || []).join(", ") : "";
    schema.push({
      key: `property1subList${m}`,
      type: "string",
      default: defSub,
      title: term ? `Sub-values for "${term}"` : `Sub-values (value ${m})`,
      description: term
        ? `Values cycled when Rotation 1 is set to "${term}". Separate with commas, e.g. high, medium, low.`
        : `Values cycled for value #${m} of Rotation 1. Separate with commas.`
    });
  }

  logseq.useSettingsSchema(schema);
}

/** Split a comma-separated field into a trimmed, non-empty term list */
function parseCsv(raw: unknown): string[] {
  return String(raw ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Convert the flat Logseq settings-schema values into a PluginSettings object.
 * Iterates each property slot (property{P} / terms{P}) and attaches any
 * sub-lists (property{P}subList{M}) to the property's Mth term.
 * Slots with a blank name or blank terms are skipped.
 * Falls back to defaultSettings if no valid property is configured.
 * @param raw - The raw logseq.settings object (flat key/value)
 */
export function buildSettingsFromSchema(raw: any): PluginSettings {
  if (!raw) return defaultSettings;

  const rawPrefixStr = String(raw.propertyPrefix ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4);
  const profile = String(raw.profile ?? "custom").trim().toLowerCase();

  // Prefix fallback: profile name if profile active, otherwise "my"
  const prefixFallback = (profile !== "custom" && profiles[profile]) ? profile : "my";
  const propertyPrefix = rawPrefixStr || prefixFallback;

  // If a profile is selected, return it directly (ignore manual fields)
  if (profile !== "custom" && profiles[profile]) {
    const p = profiles[profile];
    return {
      ...p,
      propertyPrefix,
      shortcuts: {
        mainShortcut: String(raw.mainShortcut ?? p.shortcuts?.mainShortcut ?? "mod+shift+,").trim(),
        subShortcut: String(raw.subShortcut ?? p.shortcuts?.subShortcut ?? "mod+shift+.").trim()
      }
    };
  }

  const rotations: RotationConfig[] = [];

  for (let p = 1; p <= MAX_PROPERTIES; p++) {
    const property = String(raw[`property${p}`] ?? "").trim();
    const terms = parseCsv(raw[`terms${p}`]);
    if (!property || terms.length === 0) continue;

    const subRotations: Record<string, string[]> = {};

    // Only create sub-rotations for property1
    if (p === 1) {
      for (let m = 1; m <= MAX_SUBLISTS; m++) {
        const term = terms[m - 1];
        if (!term) continue;
        const subs = parseCsv(raw[`property${p}subList${m}`]);
        if (subs.length > 0) subRotations[term] = subs;
      }
    }

    const config: RotationConfig = { property, terms };
    if (Object.keys(subRotations).length > 0) config.subRotations = subRotations;
    rotations.push(config);
  }

  if (rotations.length === 0) return defaultSettings;

  // Parse shortcut settings
  const shortcuts = {
    mainShortcut: String(raw.mainShortcut ?? defaultSettings.shortcuts?.mainShortcut ?? "mod+shift+,").trim(),
    subShortcut: String(raw.subShortcut ?? defaultSettings.shortcuts?.subShortcut ?? "mod+shift+.").trim()
  };

  return { rotations, shortcuts, propertyPrefix };
}

