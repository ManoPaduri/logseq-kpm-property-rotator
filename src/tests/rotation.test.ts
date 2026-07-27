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

describe('rotateProperty — sub-terms and separator handling', () => {
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

  test('result has no trailing separator when no sub-term', () => {
    expect(rotateProperty(null, config)).not.toMatch(/[,\/]/);
  });

  test('main rotation strips slash sub-term and advances', () => {
    expect(rotateProperty('todo/high', config)).toBe('now');
    expect(rotateProperty('now/blocked', config)).toBe('doing');
  });

  test('main rotation strips comma sub-term and advances', () => {
    expect(rotateProperty('todo, high', config)).toBe('now');
  });

  test('strips sub-term across all known sub-lists', () => {
    expect(rotateProperty('later/scheduled', config)).toBe('todo');
    expect(rotateProperty('doing/blocked', config)).toBe('done');
    expect(rotateProperty('canceled/impossible', config)).toBe('later');
  });

  test('main rotation on bare term still advances', () => {
    expect(rotateProperty('later', config)).toBe('todo');
    expect(rotateProperty('done', config)).toBe('canceled');
    expect(rotateProperty('canceled', config)).toBe('later');
  });

  test('sub-rotation appends first sub-term with slash', () => {
    expect(rotateProperty('todo', config, true)).toBe('todo/high');
  });

  test('sub-rotation cycles through sub-terms', () => {
    expect(rotateProperty('todo/high', config, true)).toBe('todo/medium');
    expect(rotateProperty('todo/medium', config, true)).toBe('todo/low');
    expect(rotateProperty('todo/low', config, true)).toBe('todo/high');
  });

  test('sub-rotation returns null when term has no sub-list', () => {
    expect(rotateProperty('done', config, true)).toBeNull();
  });
});
