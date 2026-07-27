# Property Rotator Plugin — Manual Testing Guide

**Prerequisites:** Plugin is built (`npm run build:clean`) and loaded in Logseq.

---

## Step 1: Build and Load

```bash
cd myplugin/property-rotator
npm run build:clean
```

Then in Logseq:
1. **Settings** → **Advanced** → enable **Developer mode**
2. **⋯ menu** → **Plugins** → **Load unpacked plugin**
3. Select the `myplugin/property-rotator/` folder

**Expected console output:**
```
Property Rotator plugin initializing...
Property Rotator loaded settings: { rotations: [...], propertyPrefix: 'my' }
Property Rotator plugin initialized successfully
```

---

## Step 2: Test Default Setup (prefix `my`, profile `custom`)

Create a page **`Test Property Rotator`**. Create a block and place cursor inside it.

### 2a. No property — adds first property

Block: plain text, no properties.

**`Ctrl+Shift+J`** → adds `my-status:: later`

---

### 2b. Main rotation cycle

Set block to `my-status:: later`:

| # | Start | Key | Expected |
|---|---|---|---|
| 1 | `my-status:: later` | `Ctrl+Shift+J` | `my-status:: todo` |
| 2 | `my-status:: todo` | `Ctrl+Shift+J` | `my-status:: now` |
| 3 | `my-status:: now` | `Ctrl+Shift+J` | `my-status:: doing` |
| 4 | `my-status:: doing` | `Ctrl+Shift+J` | `my-status:: done` |
| 5 | `my-status:: done` | `Ctrl+Shift+J` | `my-status:: canceled` |
| 6 | `my-status:: canceled` | `Ctrl+Shift+J` | `my-status:: later` (wraps) |

After each rotation the cursor should land right after `::` on that line.

---

### 2c. Sub-rotation cycle (slash separator)

Set block to `my-status:: todo`:

| # | Start | Key | Expected |
|---|---|---|---|
| 1 | `my-status:: todo` | `Ctrl+Shift+K` | `my-status:: todo/high` |
| 2 | `my-status:: todo/high` | `Ctrl+Shift+K` | `my-status:: todo/medium` |
| 3 | `my-status:: todo/medium` | `Ctrl+Shift+K` | `my-status:: todo/low` |
| 4 | `my-status:: todo/low` | `Ctrl+Shift+K` | `my-status:: todo/high` (wraps) |

---

### 2d. Main rotation strips sub-term

| Start | Key | Expected |
|---|---|---|
| `my-status:: todo/high` | `Ctrl+Shift+J` | `my-status:: now` (sub-term stripped, main advances) |
| `my-status:: now/blocked` | `Ctrl+Shift+J` | `my-status:: doing` |

---

### 2e. `done` has no sub-list

| Start | Key | Expected |
|---|---|---|
| `my-status:: done` | `Ctrl+Shift+K` | No change, no error |

---

### 2f. Case-insensitive matching

| Start | Key | Expected |
|---|---|---|
| `my-status:: TODO` | `Ctrl+Shift+J` | `my-status:: now` |

---

## Step 3: Test Cursor-Aware Rotation

Create a block with two properties:

```
my-status:: doing
my-location:: home
```

**Cursor on `my-status` line → `Ctrl+Shift+J`** → only `my-status` rotates to `done`

**Cursor on `my-location` line → `Ctrl+Shift+J`** → only `my-location` rotates to `work`

---

## Step 4: Test Property Prefix

Open plugin **Settings** → **Property Prefix** field.

### 4a. Change prefix to `gtd`

1. Set prefix to `gtd`, close settings
2. On a new block, press `Ctrl+Shift+J` → adds `gtd-status:: later`
3. Press again → `gtd-status:: todo` (rotates correctly)

### 4b. Empty prefix falls back to `my`

1. Clear the prefix field, close settings
2. Press `Ctrl+Shift+J` → property written as `my-status:: later`

### 4c. Prefix sanitisation

1. Enter a prefix like `AB-CD!!EF` → saved as `abcd` (max 4 lowercase alphanum)

---

## Step 5: Test Quick Profiles

Open plugin **Settings** → **Quick Profile**.

> Note: field values below do not update instantly — close and re-open settings to see them reflected. Rotation logic switches immediately.

### 5a. GTD profile

1. Select **gtd** → close settings
2. Check prefix field shows `gtd` (re-open settings)
3. Press `Ctrl+Shift+J` on a blank block → `gtd-status:: later`
4. Rotate through: `later → todo → now → doing → done → canceled → later`

### 5b. PARA profile

1. Select **para** → close settings
2. Press `Ctrl+Shift+J` on a blank block → `para-status:: project`
3. Rotate: `project → area → resource → archive → project`

### 5c. Back to custom

1. Select **custom** → close settings
2. Prefix field resets to `my`
3. Rotation uses manual settings

---

## Step 6: Test Settings — Manual Configuration

Open plugin **Settings**.

### 6a. Change property name and terms (live, no reload)

1. Set **Property 1 name** to `priority`, **Terms** to `low, medium, high, critical`
2. Close settings
3. Block: `my-priority:: low` → `Ctrl+Shift+J` → rotates `low → medium → high → critical → low`

Console should show: `Property Rotator settings updated: {...}`

### 6b. Per-term sub-lists

1. Reset Property 1: name `status`, terms `todo, doing, done`
2. Set **Sub-list 1** to `high, medium, low` (maps to term 1 = `todo`)
3. Set **Sub-list 2** to `progress, blocked, review` (maps to term 2 = `doing`)
4. On `my-status:: todo` → `Ctrl+Shift+K` → `my-status:: todo/high`
5. On `my-status:: doing` → `Ctrl+Shift+K` → `my-status:: doing/progress`

### 6c. Two properties — cursor selects which rotates

1. Set Property 1: `status` (later, todo, now), Property 2: `location` (home, work)
2. Block with both properties — cursor on `my-location` line
3. `Ctrl+Shift+J` → only `my-location` rotates

---

## Step 7: Edge Cases

| # | Scenario | Setup | Action | Expected |
|---|---|---|---|---|
| 1 | No block focused | Click outside all blocks | `Ctrl+Shift+J` | Error toast: "No current block found" |
| 2 | Block with unrecognised properties only | `name:: Alice` | `Ctrl+Shift+J` | Adds `my-status:: later` (first configured property) |
| 3 | Multi-property config, only second present | Config: `type` + `status`; block has only `status:: todo` | `Ctrl+Shift+J` | `type` skipped, `status` rotates |

---

## Step 8: Verify No Console Errors

Open browser console (`Cmd+Option+I`) after each step group:
- **No red errors** from the Property Rotator plugin
- Logseq internal yellow warnings are expected and fine
- You should see structured `[Property Rotator]` log output

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| Shortcut doesn't fire | Keybinding conflict | Check Settings → Keymap, search "property-rotator" |
| Plugin doesn't appear | `dist/` missing | Run `npm run build:clean` |
| Property writes with wrong prefix | Stale settings | Close/re-open settings to confirm prefix value |
| Property won't rotate after first time | camelCase lookup mismatch | Check console for `Block properties:` log — key should match `prefixStatus` format |
| Profile fields don't update visually | Known limitation | Close and re-open settings after switching profile |
| Settings don't apply | `onSettingsChanged` not firing | Check console for `settings updated`; if absent, reload the plugin |

---

## Test Results Log

**Date:** _______________  
**Logseq version:** _______________  
**Prefix used:** _______________  

| Test | Result | Notes |
|---|---|---|
| Step 1: Plugin loads cleanly | ☐ Pass / ☐ Fail | |
| Step 2a: Adds first property on blank block | ☐ Pass / ☐ Fail | |
| Step 2b: Full main rotation cycle | ☐ Pass / ☐ Fail | |
| Step 2c: Sub-rotation with slash separator | ☐ Pass / ☐ Fail | |
| Step 2d: Main rotation strips sub-term | ☐ Pass / ☐ Fail | |
| Step 2e: done has no sub-list (does nothing) | ☐ Pass / ☐ Fail | |
| Step 2f: Case-insensitive match | ☐ Pass / ☐ Fail | |
| Step 3: Cursor-aware rotation | ☐ Pass / ☐ Fail | |
| Step 3: Cursor repositions after :: | ☐ Pass / ☐ Fail | |
| Step 4a: Custom prefix applied | ☐ Pass / ☐ Fail | |
| Step 4b: Empty prefix falls back to my | ☐ Pass / ☐ Fail | |
| Step 5a: GTD profile rotation | ☐ Pass / ☐ Fail | |
| Step 5b: PARA profile rotation | ☐ Pass / ☐ Fail | |
| Step 5c: Back to custom resets prefix | ☐ Pass / ☐ Fail | |
| Step 6a: Live settings update | ☐ Pass / ☐ Fail | |
| Step 6b: Per-term sub-lists | ☐ Pass / ☐ Fail | |
| Step 6c: Two-property cursor selection | ☐ Pass / ☐ Fail | |
| Step 7.1: No block focused → error toast | ☐ Pass / ☐ Fail | |
| Step 7.2: Unrecognised properties → adds first | ☐ Pass / ☐ Fail | |
| Step 8: No console errors | ☐ Pass / ☐ Fail | |

**Overall:** ☐ Ready for release &nbsp;&nbsp; ☐ Issues found (see notes)
