/**
 * Shared type definitions for Property Rotator plugin
 * This file defines all interfaces used across different components
 * to ensure type safety and clear contracts between modules
 */

/**
 * Configuration for a single property rotation rule
 */
export interface RotationConfig {
  property: string;
  terms: string[];
  subRotations?: Record<string, string[]>;
}

/**
 * Complete plugin settings structure
 */
export interface PluginSettings {
  rotations: RotationConfig[];
  shortcuts?: {
    mainShortcut?: string;
    subShortcut?: string;
  };
  propertyPrefix?: string;
}

/**
 * Block information from Logseq
 */
export interface BlockInfo {
  uuid: string;
  content: string;
  properties: Record<string, string>;
}
