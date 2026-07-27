/**
 * Unit tests for rotation logic
 * These tests can be run independently by agents working on core logic
 */

import { rotateProperty } from '../rotation';
import { RotationConfig } from '../types';

describe('rotateProperty', () => {
  const basicConfig: RotationConfig = {
    property: 'status',
    terms: ['todo', 'doing', 'done']
  };

  test('should return first term for null value', () => {
    expect(rotateProperty(null, basicConfig)).toBe('todo');
  });

  test('should return first term for empty string', () => {
    expect(rotateProperty('', basicConfig)).toBe('todo');
  });

  test('should rotate single term correctly', () => {
    expect(rotateProperty('todo', basicConfig)).toBe('doing');
    expect(rotateProperty('doing', basicConfig)).toBe('done');
    expect(rotateProperty('done', basicConfig)).toBe('todo');
  });

  test('sub-terms are stripped when subRotations configured (slash separator)', () => {
    const configWithSubs: RotationConfig = {
      property: 'status',
      terms: ['todo', 'doing', 'done'],
      subRotations: { 'todo': ['high', 'medium'], 'doing': ['high', 'medium'] }
    };
    expect(rotateProperty('todo/high', configWithSubs)).toBe('doing');
    expect(rotateProperty('doing/high', configWithSubs)).toBe('done');
  });

  test('sub-terms stripped from comma notation when subRotations configured', () => {
    const configWithSubs: RotationConfig = {
      property: 'status',
      terms: ['todo', 'doing', 'done'],
      subRotations: { 'todo': ['high', 'medium'] }
    };
    expect(rotateProperty('todo, high', configWithSubs)).toBe('doing');
  });

  test('should set first term if no match found (unrecognised value replaced)', () => {
    expect(rotateProperty('other', basicConfig)).toBe('todo');
  });

  test('should handle case-insensitive matching', () => {
    expect(rotateProperty('TODO', basicConfig)).toBe('doing');
    expect(rotateProperty('ToDo', basicConfig)).toBe('doing');
  });
});

describe('rotateProperty — single term no trailing comma', () => {
  const config: RotationConfig = {
    property: 'status',
    terms: ['later', 'todo', 'now']
  };

  test('single main term has no trailing comma or separator', () => {
    const result = rotateProperty(null, config);
    expect(result).toBe('later');
    expect(result).not.toMatch(/,/);
  });

  test('advancing single term produces no trailing comma', () => {
    expect(rotateProperty('later', config)).toBe('todo');
    expect(rotateProperty('todo', config)).toBe('now');
  });
});

describe('rotateProperty — slash separator parsing', () => {
  const config: RotationConfig = {
    property: 'status',
    terms: ['later', 'todo', 'now', 'doing', 'done', 'canceled'],
    subRotations: {
      'todo': ['high', 'medium', 'low'],
      'now': ['progress', 'blocked', 'review']
    }
  };

  test('parses slash-joined sub-term from main rotation value', () => {
    expect(rotateProperty('todo/high', config)).toBe('now');
  });

  test('parses comma-joined sub-term from main rotation value', () => {
    expect(rotateProperty('todo, high', config)).toBe('now');
  });

  test('sub-rotation result uses slash separator', () => {
    const result = rotateProperty('todo', config, true);
    expect(result).toBe('todo/high');
  });

  test('sub-rotation cycles with slash separator', () => {
    expect(rotateProperty('todo/high', config, true)).toBe('todo/medium');
    expect(rotateProperty('todo/medium', config, true)).toBe('todo/low');
    expect(rotateProperty('todo/low', config, true)).toBe('todo/high');
  });

  test('main rotation strips slash sub-term and advances', () => {
    expect(rotateProperty('todo/high', config)).toBe('now');
    expect(rotateProperty('now/blocked', config)).toBe('doing');
  });
});

describe('rotateProperty — sub-term stripping on main rotation', () => {
  const config: RotationConfig = {
    property: 'status',
    terms: ['later', 'todo', 'now', 'doing', 'done', 'canceled'],
    subRotations: {
      'later': ['scheduled', 'waiting'],
      'todo': ['high', 'medium', 'low'],
      'now': ['progress', 'blocked', 'review'],
      'doing': ['progress', 'blocked', 'review'],
      'canceled': ['optional', 'impossible']
    }
  };

  test('strips sub-term from all known sub-lists on main rotation', () => {
    expect(rotateProperty('later/scheduled', config)).toBe('todo');
    expect(rotateProperty('later/waiting', config)).toBe('todo');
    expect(rotateProperty('doing/blocked', config)).toBe('done');
    expect(rotateProperty('canceled/impossible', config)).toBe('later');
  });

  test('main rotation on bare term (no sub-term) still advances', () => {
    expect(rotateProperty('later', config)).toBe('todo');
    expect(rotateProperty('done', config)).toBe('canceled');
    expect(rotateProperty('canceled', config)).toBe('later');
  });
});

describe('rotateProperty with sub-rotations', () => {
  const subConfig: RotationConfig = {
    property: 'status',
    terms: ['todo', 'doing', 'done'],
    subRotations: {
      'todo': ['high', 'medium', 'low'],
      'doing': ['in-progress', 'blocked', 'review']
    }
  };

  test('should use sub-rotation when enabled', () => {
    expect(rotateProperty('todo', subConfig, true)).toBe('todo/high');
    expect(rotateProperty('todo/high', subConfig, true)).toBe('todo/medium');
  });

  test('should cycle through sub-terms', () => {
    expect(rotateProperty('todo/high', subConfig, true)).toBe('todo/medium');
    expect(rotateProperty('todo/medium', subConfig, true)).toBe('todo/low');
    expect(rotateProperty('todo/low', subConfig, true)).toBe('todo/high');
  });

  test('sub-rotation does nothing when term has no sub-list', () => {
    expect(rotateProperty('done', subConfig, true)).toBeNull();
  });
});
