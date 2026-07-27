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
    default: "ctrl+shift+j",
    title: "Main Rotation Shortcut",
    description: "Keyboard shortcut for main property rotation (e.g., ctrl+shift+j)"
  });

  schema.push({
    key: "subShortcut",
    type: "string",
    default: "ctrl+shift+k",
    title: "Sub-Rotation Shortcut",
    description: "Keyboard shortcut for sub-rotation (e.g., ctrl+shift+k)"
  });

  for (let p = 1; p <= MAX_PROPERTIES; p++) {
    const slot = defaultSettings.rotations[p - 1];
    const slotDefault = slot ?? null;

    schema.push({
      key: `propertyHeading${p}`,
      type: "heading",
      default: null,
      title: `Rotation ${p}`,
      description: `Property #${p} to rotate. Leave the name/terms blank to disable this slot.`
    });
    schema.push({
      key: `property${p}`,
      type: "string",
      default: slotDefault ? slotDefault.property : "",
      title: `Property ${p} name`,
      description: "The block property to rotate, e.g. status or type."
    });
    schema.push({
      key: `terms${p}`,
      type: "string",
      default: slotDefault ? slotDefault.terms.join(", ") : "",
      title: `Property ${p} terms`,
      description: "Comma-separated rotation terms (Option+Enter). Any number of terms."
    });
  }

  // Add heading for Property 1 sub-lists after all property configurations
  schema.push({
    key: `subListsHeading`,
    type: "heading",
    default: null,
    title: `Rotation 1 Sub-lists`,
    description: `Sub-rotation terms for Rotation 1. Each sub-list applies to the corresponding term in Rotation 1.`
  });

  // Create sub-list fields for property1
  for (let m = 1; m <= MAX_SUBLISTS; m++) {
    const term = defTerms[m - 1];
    const defSub = term ? (defSubs[term] || []).join(", ") : "";
    const termLabel = term ? `"${term}"` : `term #${m}`;
    schema.push({
      key: `property1subList${m}`,
      type: "string",
      default: defSub,
      title: `Sub-list ${m}: ${term || `(term ${m})`}`,
      description: `Sub-rotation terms for ${termLabel} (Ctrl+Shift+K). Comma-separated. Maps to position ${m} in the terms list.`
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
        mainShortcut: String(raw.mainShortcut ?? p.shortcuts?.mainShortcut ?? "ctrl+shift+j").trim(),
        subShortcut: String(raw.subShortcut ?? p.shortcuts?.subShortcut ?? "ctrl+shift+k").trim()
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
    mainShortcut: String(raw.mainShortcut ?? defaultSettings.shortcuts?.mainShortcut ?? "ctrl+shift+j").trim(),
    subShortcut: String(raw.subShortcut ?? defaultSettings.shortcuts?.subShortcut ?? "ctrl+shift+k").trim()
  };

  return { rotations, shortcuts, propertyPrefix };
}

