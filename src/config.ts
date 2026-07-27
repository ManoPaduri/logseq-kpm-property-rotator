/**
 * Configuration schema and default settings for Property Rotator plugin
 * This module handles all configuration-related operations
 * Contract: Provides RotationConfig and PluginSettings interfaces with validation
 */

import { RotationConfig, PluginSettings } from './types';
import { validateRotationConfigDetailed } from './utils/validation';

export const profileGTD: PluginSettings = {
  rotations: [
    {
      property: "status",
      terms: ["later", "todo", "now", "doing", "done", "canceled"],
      subRotations: {
        "later": ["scheduled", "waiting"],
        "todo": ["high", "medium", "low"],
        "now": ["progress", "blocked", "review"],
        "doing": ["progress", "blocked", "review"],
        "canceled": ["optional", "impossible"]
      }
    },
    {
      property: "location",
      terms: ["home", "work"]
    }
  ],
  shortcuts: {
    mainShortcut: "ctrl+shift+j",
    subShortcut: "ctrl+shift+k"
  }
};

export const profilePARA: PluginSettings = {
  rotations: [
    {
      property: "status",
      terms: ["project", "area", "resource", "archive"],
      subRotations: {
        "project": ["high", "medium", "low"],
        "area": ["scheduled", "waiting"],
        "resource": ["person", "topic", "reference"],
        "archive": ["later", "trash"]
      }
    },
    {
      property: "location",
      terms: ["home", "work"]
    }
  ],
  shortcuts: {
    mainShortcut: "ctrl+shift+j",
    subShortcut: "ctrl+shift+k"
  }
};

export const profiles: Record<string, PluginSettings> = {
  "gtd": profileGTD,
  "para": profilePARA
};

/**
 * Default plugin settings
 * Can be used as initial configuration or fallback values
 */
export const defaultSettings: PluginSettings = {
  rotations: [
    {
      property: "status",
      terms: ["later", "todo", "now", "doing", "done", "canceled"],
      subRotations: {
        "later": ["scheduled", "waiting"],
        "todo": ["high", "medium", "low"],
        "now": ["progress", "blocked", "review"],
        "doing": ["progress", "blocked", "review"],
        "canceled": ["optional", "impossible"]
      }
    },
    {
      property: "location",
      terms: ["home", "work"]
    }
  ],
  shortcuts: {
    mainShortcut: "ctrl+shift+j",
    subShortcut: "ctrl+shift+k"
  }
};

/**
 * Validate a rotation configuration object
 * @param config - The rotation config to validate
 * @returns true if valid, false otherwise
 */
export function validateRotationConfig(config: RotationConfig): boolean {
  if (!config.property || typeof config.property !== 'string') {
    return false;
  }
  
  if (!Array.isArray(config.terms) || config.terms.length === 0) {
    return false;
  }
  
  if (config.subRotations) {
    for (const key in config.subRotations) {
      if (!Array.isArray(config.subRotations[key]) || config.subRotations[key].length === 0) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Validate complete plugin settings
 * @param settings - The settings to validate
 * @returns true if valid, false otherwise
 */
export function validatePluginSettings(settings: PluginSettings): boolean {
  if (!Array.isArray(settings.rotations)) {
    return false;
  }
  
  return settings.rotations.every(validateRotationConfig);
}

/**
 * Validate plugin settings with a descriptive error message
 * @param settings - The settings to validate
 * @returns Object with isValid and error string for the first failure found
 */
export function validatePluginSettingsVerbose(
  settings: PluginSettings
): { isValid: boolean; error?: string } {
  if (!Array.isArray(settings.rotations)) {
    return { isValid: false, error: 'Settings must have a rotations array' };
  }
  for (let i = 0; i < settings.rotations.length; i++) {
    const result = validateRotationConfigDetailed(settings.rotations[i]);
    if (!result.isValid) {
      return { isValid: false, error: `Rotation #${i + 1}: ${result.error}` };
    }
  }
  return { isValid: true };
}
