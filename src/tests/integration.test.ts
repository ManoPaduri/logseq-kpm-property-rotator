/**
 * Integration tests for Property Rotator plugin
 * Tests component interactions with mocked Logseq API
 */

import { rotateProperty } from '../rotation';
import { validatePluginSettings, validatePluginSettingsVerbose, defaultSettings } from '../config';
import { showSuccess, showError, showWarning } from '../ui/notifications';
import { handleRotation, setSettings } from '../shortcuts';
import { buildSettingsFromSchema } from '../ui/settings';
import { profileGTD, profilePARA, profiles } from '../config';

// Prevent the real @logseq/libs UMD bundle from executing in the test env.
jest.mock('@logseq/libs', () => ({}));

// The plugin accesses the Logseq API via the global `logseq` object
// (declared by @logseq/libs). Provide a mock for it.
const mockLogseq = {
  Editor: {
    getCurrentBlock: jest.fn(),
    getSelectedBlocks: jest.fn().mockResolvedValue(null),
    getBlock: jest.fn(),
    getBlockProperty: jest.fn(),
    upsertBlockProperty: jest.fn(),
    editBlock: jest.fn().mockResolvedValue(undefined),
    getEditingBlockContent: jest.fn().mockResolvedValue('')
  },
  UI: {
    showMsg: jest.fn()
  },
  App: {
    registerUIItem: jest.fn(),
    registerCommandShortcut: jest.fn()
  },
  provideModel: jest.fn(),
  useSettingsSchema: jest.fn(),
  onSettingsChanged: jest.fn(),
  ready: jest.fn(),
  settings: null as any
};

(globalThis as any).logseq = mockLogseq;

describe('Rotation workflow integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('full rotation cycle: null → later → todo → now → doing → done → canceled → later', () => {
    const config = defaultSettings.rotations[0];

    const step1 = rotateProperty(null, config);
    expect(step1).toBe('later');

    const step2 = rotateProperty(step1, config);
    expect(step2).toBe('todo');

    const step3 = rotateProperty(step2, config);
    expect(step3).toBe('now');

    const step4 = rotateProperty(step3, config);
    expect(step4).toBe('doing');

    const step5 = rotateProperty(step4, config);
    expect(step5).toBe('done');

    const step6 = rotateProperty(step5, config);
    expect(step6).toBe('canceled');

    const step7 = rotateProperty(step6, config);
    expect(step7).toBe('later');
  });

  test('sub-rotation workflow: todo → todo/high → todo/medium → todo/low → todo/high', () => {
    const config = defaultSettings.rotations[0];

    const base = rotateProperty('todo', config, true);
    expect(base).toBe('todo/high');

    const step2 = rotateProperty(base, config, true);
    expect(step2).toBe('todo/medium');

    const step3 = rotateProperty(step2, config, true);
    expect(step3).toBe('todo/low');

    const step4 = rotateProperty(step3, config, true);
    expect(step4).toBe('todo/high');
  });

  test('settings validation passes for defaultSettings', () => {
    expect(validatePluginSettings(defaultSettings)).toBe(true);
  });
});

describe('Notification system integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('showSuccess calls logseq.UI.showMsg with success type', () => {
    showSuccess('Rotated status: todo → doing');
    expect(mockLogseq.UI.showMsg).toHaveBeenCalledWith('Rotated status: todo → doing', 'success');
  });

  test('showError calls logseq.UI.showMsg with error type', () => {
    showError('No matching property found');
    expect(mockLogseq.UI.showMsg).toHaveBeenCalledWith('No matching property found', 'error');
  });

  test('showWarning calls logseq.UI.showMsg with warning type', () => {
    showWarning('No property to rotate');
    expect(mockLogseq.UI.showMsg).toHaveBeenCalledWith('No property to rotate', 'warning');
  });
});

describe('API wrapper integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getCurrentBlock returns null when no block is focused', async () => {
    (mockLogseq.Editor.getCurrentBlock as jest.Mock).mockResolvedValue(null);
    (mockLogseq.Editor.getSelectedBlocks as jest.Mock).mockResolvedValue(null);
    const { getCurrentBlock } = await import('../api/logseq');
    const result = await getCurrentBlock();
    expect(result).toBeNull();
  });

  test('getCurrentBlock returns BlockInfo when block exists', async () => {
    const blockData = { uuid: 'abc-123', content: 'status:: todo', properties: { status: 'todo' } };
    (mockLogseq.Editor.getCurrentBlock as jest.Mock).mockResolvedValue(blockData);
    (mockLogseq.Editor.getBlock as jest.Mock).mockResolvedValue(blockData);
    const { getCurrentBlock } = await import('../api/logseq');
    const result = await getCurrentBlock();
    expect(result).toEqual({ uuid: 'abc-123', content: 'status:: todo', properties: { status: 'todo' } });
  });

  test('getBlockProperty returns null when property missing', async () => {
    (mockLogseq.Editor.getBlockProperty as jest.Mock).mockResolvedValue(null);
    const { getBlockProperty } = await import('../api/logseq');
    const result = await getBlockProperty('abc-123', 'status');
    expect(result).toBeNull();
  });

  test('setBlockProperty returns true on success', async () => {
    (mockLogseq.Editor.upsertBlockProperty as jest.Mock).mockResolvedValue(undefined);
    const { setBlockProperty } = await import('../api/logseq');
    const result = await setBlockProperty('abc-123', 'status', 'doing');
    expect(result).toBe(true);
  });

  test('setBlockProperty returns false on error', async () => {
    (mockLogseq.Editor.upsertBlockProperty as jest.Mock).mockRejectedValue(new Error('API error'));
    const { setBlockProperty } = await import('../api/logseq');
    const result = await setBlockProperty('abc-123', 'status', 'doing');
    expect(result).toBe(false);
  });
});

describe('Settings workflow integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validatePluginSettings passes for defaultSettings', () => {
    expect(validatePluginSettings(defaultSettings)).toBe(true);
  });

  test('validatePluginSettingsVerbose returns isValid true for defaultSettings', () => {
    const result = validatePluginSettingsVerbose(defaultSettings);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('validatePluginSettingsVerbose returns error for missing property name', () => {
    const bad = { rotations: [{ property: '', terms: ['a', 'b'] }] };
    const result = validatePluginSettingsVerbose(bad as any);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Rotation #1');
  });

  test('validatePluginSettingsVerbose returns error for empty terms array', () => {
    const bad = { rotations: [{ property: 'status', terms: [] }] };
    const result = validatePluginSettingsVerbose(bad as any);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Rotation #1');
  });

  test('validatePluginSettingsVerbose rejects sub-rotation key not in terms', () => {
    const bad = {
      rotations: [{
        property: 'status',
        terms: ['todo', 'done'],
        subRotations: { 'unknown': ['a', 'b'] }
      }]
    };
    const result = validatePluginSettingsVerbose(bad as any);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/unknown/);
  });
});

describe('buildSettingsFromSchema (native settings UI)', () => {
  test('builds a single rotation from property1 + terms1 (comma-separated)', () => {
    const raw = {
      property1: 'status',
      terms1: 'todo, doing, done'
    };
    const result = buildSettingsFromSchema(raw);
    expect(result.rotations).toHaveLength(1);
    expect(result.rotations[0].property).toBe('status');
    expect(result.rotations[0].terms).toEqual(['todo', 'doing', 'done']);
    expect(result.rotations[0].subRotations).toBeUndefined();
  });

  test('attaches sub-lists to the property term at the matching index', () => {
    const raw = {
      property1: 'status',
      terms1: 'todo, doing, done',
      property1subList1: 'high, medium, low',
      property1subList2: 'in-progress, blocked'
    };
    const result = buildSettingsFromSchema(raw);
    expect(result.rotations[0].subRotations).toEqual({
      todo: ['high', 'medium', 'low'],
      doing: ['in-progress', 'blocked']
    });
  });

  test('supports multiple properties, second with no sub-lists', () => {
    const raw = {
      property1: 'type',
      terms1: 'project, area, resource, archive',
      property1subList1: 'high, medium, low',
      property2: 'status',
      terms2: 'later, scheduled, waiting, todo, now, doing, done'
    };
    const result = buildSettingsFromSchema(raw);
    expect(result.rotations).toHaveLength(2);
    expect(result.rotations[0].property).toBe('type');
    expect(result.rotations[0].terms).toEqual(['project', 'area', 'resource', 'archive']);
    expect(result.rotations[0].subRotations).toEqual({ project: ['high', 'medium', 'low'] });
    expect(result.rotations[1].property).toBe('status');
    expect(result.rotations[1].terms).toHaveLength(7);
    expect(result.rotations[1].subRotations).toBeUndefined();
  });

  test('supports unlimited terms via the comma-separated field', () => {
    const many = Array.from({ length: 30 }, (_, i) => `t${i + 1}`);
    const raw = { property1: 'stage', terms1: many.join(', ') };
    const result = buildSettingsFromSchema(raw);
    expect(result.rotations[0].terms).toHaveLength(30);
    expect(result.rotations[0].terms[29]).toBe('t30');
  });

  test('maps sub-list slot M to the property\'s Mth term', () => {
    const raw = {
      property1: 'status',
      terms1: 'todo, doing, done',
      property1subList3: 'x, y'
    };
    const result = buildSettingsFromSchema(raw);
    expect(result.rotations[0].subRotations).toEqual({ done: ['x', 'y'] });
  });

  test('skips a property slot with a blank name', () => {
    const raw = { property1: '', terms1: 'a, b', property2: 'status', terms2: 'todo, done' };
    const result = buildSettingsFromSchema(raw);
    expect(result.rotations).toHaveLength(1);
    expect(result.rotations[0].property).toBe('status');
  });

  test('skips a property slot with blank terms', () => {
    const raw = { property1: 'status', terms1: '' };
    expect(buildSettingsFromSchema(raw)).toEqual(defaultSettings);
  });

  test('falls back to defaults when nothing is configured', () => {
    expect(buildSettingsFromSchema({})).toEqual(defaultSettings);
  });

  test('falls back to defaults for null/undefined input', () => {
    expect(buildSettingsFromSchema(null)).toEqual(defaultSettings);
    expect(buildSettingsFromSchema(undefined)).toEqual(defaultSettings);
  });

  test('produces settings that pass validation', () => {
    const raw = {
      property1: 'status',
      terms1: 'todo, done',
      property1subList1: 'high, low'
    };
    const result = buildSettingsFromSchema(raw);
    expect(validatePluginSettings(result)).toBe(true);
  });
});

describe('buildSettingsFromSchema — profile selection', () => {
  test('gtd profile overrides manual fields', () => {
    const raw = {
      profile: 'gtd',
      property1: 'ignored',
      terms1: 'ignored',
      mainShortcut: 'ctrl+shift+j',
      subShortcut: 'ctrl+shift+k'
    };
    const result = buildSettingsFromSchema(raw);
    expect(result.rotations).toEqual(profileGTD.rotations);
    expect(result.shortcuts?.mainShortcut).toBe('ctrl+shift+j');
  });

  test('para profile overrides manual fields', () => {
    const raw = { profile: 'para', property1: 'ignored', terms1: 'ignored' };
    const result = buildSettingsFromSchema(raw);
    expect(result.rotations).toEqual(profilePARA.rotations);
  });

  test('custom profile uses manual fields', () => {
    const raw = { profile: 'custom', property1: 'status', terms1: 'a, b, c' };
    const result = buildSettingsFromSchema(raw);
    expect(result.rotations[0].property).toBe('status');
    expect(result.rotations[0].terms).toEqual(['a', 'b', 'c']);
  });

  test('unknown profile falls back to manual fields', () => {
    const raw = { profile: 'unknown', property1: 'status', terms1: 'a, b' };
    const result = buildSettingsFromSchema(raw);
    expect(result.rotations[0].property).toBe('status');
  });

  test('profiles record contains gtd and para', () => {
    expect(profiles['gtd']).toBeDefined();
    expect(profiles['para']).toBeDefined();
    expect(profiles['gtd'].rotations.length).toBeGreaterThan(0);
    expect(profiles['para'].rotations.length).toBeGreaterThan(0);
  });
});

describe('buildSettingsFromSchema — property prefix', () => {
  test('custom profile defaults prefix to my', () => {
    const raw = { profile: 'custom', property1: 'status', terms1: 'a, b', propertyPrefix: '' };
    const result = buildSettingsFromSchema(raw);
    expect(result.propertyPrefix).toBe('my');
  });

  test('gtd profile defaults prefix to gtd when prefix blank', () => {
    const raw = { profile: 'gtd', propertyPrefix: '' };
    const result = buildSettingsFromSchema(raw);
    expect(result.propertyPrefix).toBe('gtd');
  });

  test('para profile defaults prefix to para when prefix blank', () => {
    const raw = { profile: 'para', propertyPrefix: '' };
    const result = buildSettingsFromSchema(raw);
    expect(result.propertyPrefix).toBe('para');
  });

  test('explicit prefix overrides profile default', () => {
    const raw = { profile: 'gtd', propertyPrefix: 'abc' };
    const result = buildSettingsFromSchema(raw);
    expect(result.propertyPrefix).toBe('abc');
  });

  test('prefix is sanitised to lowercase alphanumeric max 4 chars', () => {
    const raw = { profile: 'custom', property1: 'status', terms1: 'a, b', propertyPrefix: 'AB-CD!!EF' };
    const result = buildSettingsFromSchema(raw);
    expect(result.propertyPrefix).toBe('abcd');
  });
});

describe('camelCase key normalisation (property lookup)', () => {
  const toCamel = (hyphenated: string) =>
    hyphenated.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

  test('gtd-status normalises to gtdStatus', () => {
    expect(toCamel('gtd-status')).toBe('gtdStatus');
  });

  test('my-location normalises to myLocation', () => {
    expect(toCamel('my-location')).toBe('myLocation');
  });

  test('para-status normalises to paraStatus', () => {
    expect(toCamel('para-status')).toBe('paraStatus');
  });

  test('no-prefix property passes through unchanged', () => {
    expect(toCamel('status')).toBe('status');
  });

  test('multi-segment key is fully camelCased', () => {
    expect(toCamel('my-long-prop-name')).toBe('myLongPropName');
  });
});

describe('GTD profile structure', () => {
  test('gtd status property has expected terms', () => {
    const statusRotation = profileGTD.rotations.find(r => r.property === 'status');
    expect(statusRotation).toBeDefined();
    expect(statusRotation!.terms).toEqual(['later', 'todo', 'now', 'doing', 'done', 'canceled']);
  });

  test('gtd status has sub-rotations for key terms', () => {
    const statusRotation = profileGTD.rotations.find(r => r.property === 'status');
    expect(statusRotation!.subRotations).toBeDefined();
    expect(statusRotation!.subRotations!['todo']).toContain('high');
    expect(statusRotation!.subRotations!['later']).toContain('scheduled');
  });

  test('gtd location property has expected terms', () => {
    const locRotation = profileGTD.rotations.find(r => r.property === 'location');
    expect(locRotation).toBeDefined();
    expect(locRotation!.terms).toContain('home');
    expect(locRotation!.terms).toContain('work');
  });
});

describe('PARA profile structure', () => {
  test('para status property has expected terms', () => {
    const statusRotation = profilePARA.rotations.find(r => r.property === 'status');
    expect(statusRotation).toBeDefined();
    expect(statusRotation!.terms).toEqual(['project', 'area', 'resource', 'archive']);
  });

  test('para location property exists', () => {
    const locRotation = profilePARA.rotations.find(r => r.property === 'location');
    expect(locRotation).toBeDefined();
    expect(locRotation!.terms).toContain('home');
    expect(locRotation!.terms).toContain('work');
  });
});

describe('Rotation with prefix — full cycle simulation', () => {
  test('gtd profile rotation cycle using prefixed camelCase lookup key', () => {
    const config = profileGTD.rotations.find(r => r.property === 'status')!;

    const step1 = rotateProperty(null, config);
    expect(step1).toBe('later');
    const step2 = rotateProperty(step1, config);
    expect(step2).toBe('todo');
    const step3 = rotateProperty(step2, config);
    expect(step3).toBe('now');
    const step4 = rotateProperty('canceled', config);
    expect(step4).toBe('later');
  });

  test('para profile rotation cycle', () => {
    const config = profilePARA.rotations.find(r => r.property === 'status')!;

    expect(rotateProperty(null, config)).toBe('project');
    expect(rotateProperty('project', config)).toBe('area');
    expect(rotateProperty('area', config)).toBe('resource');
    expect(rotateProperty('resource', config)).toBe('archive');
    expect(rotateProperty('archive', config)).toBe('project');
  });
});

describe('handleRotation end-to-end', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSettings(defaultSettings);
  });

  const mockBlock = (uuid: string, content: string, properties: Record<string, string>) => {
    const b = { uuid, content, properties };
    (mockLogseq.Editor.getCurrentBlock as jest.Mock).mockResolvedValue(b);
    (mockLogseq.Editor.getSelectedBlocks as jest.Mock).mockResolvedValue(null);
    (mockLogseq.Editor.getBlock as jest.Mock).mockResolvedValue(b);
  };

  test('rotates property and shows success notification', async () => {
    setSettings({
      rotations: [{ property: 'status', terms: ['todo', 'doing', 'done'] }]
    });
    mockBlock('block-1', 'status:: todo', { status: 'todo' });
    (mockLogseq.Editor.upsertBlockProperty as jest.Mock).mockResolvedValue(undefined);

    await handleRotation(false);

    expect(mockLogseq.Editor.upsertBlockProperty).toHaveBeenCalledWith('block-1', 'status', 'doing');
    expect(mockLogseq.UI.showMsg).toHaveBeenCalledWith(
      expect.stringContaining('todo → doing'),
      'success'
    );
  });

  test('adds all properties when no matching property found on block', async () => {
    setSettings(defaultSettings);
    mockBlock('block-2', 'unrelated:: value', { unrelated: 'value' });
    (mockLogseq.Editor.upsertBlockProperty as jest.Mock).mockResolvedValue(undefined);

    await handleRotation(false);

    expect(mockLogseq.Editor.upsertBlockProperty).toHaveBeenCalledWith('block-2', 'status', 'later');
    expect(mockLogseq.Editor.upsertBlockProperty).toHaveBeenCalledWith('block-2', 'location', 'home');
  });

  test('shows error when no block is focused', async () => {
    (mockLogseq.Editor.getCurrentBlock as jest.Mock).mockResolvedValue(null);
    (mockLogseq.Editor.getSelectedBlocks as jest.Mock).mockResolvedValue(null);

    await handleRotation(false);

    expect(mockLogseq.UI.showMsg).toHaveBeenCalledWith('No current block found', 'error');
  });

  test('page is blank: adds all properties with first terms', async () => {
    setSettings(defaultSettings);
    mockBlock('block-blank', '', {});
    (mockLogseq.Editor.upsertBlockProperty as jest.Mock).mockResolvedValue(undefined);

    await handleRotation(false);

    expect(mockLogseq.Editor.upsertBlockProperty).toHaveBeenCalledWith('block-blank', 'status', 'later');
    expect(mockLogseq.Editor.upsertBlockProperty).toHaveBeenCalledWith('block-blank', 'location', 'home');
  });

  test('page has text only: adds all properties with first terms', async () => {
    setSettings(defaultSettings);
    mockBlock('block-text', 'Just some plain text with no properties', {});
    (mockLogseq.Editor.upsertBlockProperty as jest.Mock).mockResolvedValue(undefined);

    await handleRotation(false);

    expect(mockLogseq.Editor.upsertBlockProperty).toHaveBeenCalledWith('block-text', 'status', 'later');
    expect(mockLogseq.Editor.upsertBlockProperty).toHaveBeenCalledWith('block-text', 'location', 'home');
  });

  test('page has unrecognised properties only: adds all configured properties', async () => {
    setSettings(defaultSettings);
    mockBlock('block-other', 'name:: Alice\ncategory:: work', { name: 'Alice', category: 'work' });
    (mockLogseq.Editor.upsertBlockProperty as jest.Mock).mockResolvedValue(undefined);

    await handleRotation(false);

    expect(mockLogseq.Editor.upsertBlockProperty).toHaveBeenCalledWith('block-other', 'status', 'later');
    expect(mockLogseq.Editor.upsertBlockProperty).toHaveBeenCalledWith('block-other', 'location', 'home');
  });

  test('page has only one of our properties while the other is missing', async () => {
    setSettings({
      rotations: [
        { property: 'type', terms: ['project', 'area', 'resource'] },
        { property: 'status', terms: ['todo', 'doing', 'done'] }
      ]
    });
    mockBlock('block-partial', 'status:: todo', { status: 'todo' });
    (mockLogseq.Editor.upsertBlockProperty as jest.Mock).mockResolvedValue(undefined);

    await handleRotation(false);

    expect(mockLogseq.Editor.upsertBlockProperty).toHaveBeenCalledTimes(1);
    expect(mockLogseq.Editor.upsertBlockProperty).toHaveBeenCalledWith(
      'block-partial',
      'status',
      'doing'
    );
    expect(mockLogseq.UI.showMsg).toHaveBeenCalledWith(
      expect.stringContaining('todo → doing'),
      'success'
    );
  });
});
