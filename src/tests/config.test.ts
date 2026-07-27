/**
 * Unit tests for configuration validation
 * These tests can be run independently by agents working on configuration
 */

import { 
  validateRotationConfig, 
  validatePluginSettings,
  defaultSettings 
} from '../config';
import { RotationConfig } from '../types';

describe('validateRotationConfig', () => {
  test('should validate correct config', () => {
    const config: RotationConfig = {
      property: 'status',
      terms: ['todo', 'doing', 'done']
    };
    expect(validateRotationConfig(config)).toBe(true);
  });

  test('should reject config without property', () => {
    const config = { property: '', terms: ['todo', 'doing'] } as RotationConfig;
    expect(validateRotationConfig(config)).toBe(false);
  });

  test('should reject config without terms', () => {
    const config = { property: 'status', terms: [] } as RotationConfig;
    expect(validateRotationConfig(config)).toBe(false);
  });

  test('should reject config with empty sub-rotation array', () => {
    const config: RotationConfig = {
      property: 'status',
      terms: ['todo', 'doing'],
      subRotations: {
        'todo': []
      }
    };
    expect(validateRotationConfig(config)).toBe(false);
  });

  test('should accept sub-rotation key not in terms (validator does not cross-check)', () => {
    const config: RotationConfig = {
      property: 'status',
      terms: ['todo', 'doing'],
      subRotations: {
        'unknown-key': ['a', 'b']
      }
    };
    expect(validateRotationConfig(config)).toBe(true);
  });
});

describe('validatePluginSettings', () => {
  test('should validate correct settings', () => {
    expect(validatePluginSettings(defaultSettings)).toBe(true);
  });

  test('should reject settings without rotations array', () => {
    const settings = { rotations: null } as any;
    expect(validatePluginSettings(settings)).toBe(false);
  });
});
