# Rotation Logic

How the plugin decides what to write when a shortcut is pressed.

---

## Configuration Sources

Settings are built from one of two sources, resolved in this order:

1. **Active Profile** (`gtd` or `para`) — all rotation and property settings come from the profile. Manual fields are ignored.
2. **Custom** — rotation properties and terms are read from the manual fields in plugin Settings.

A **Property Prefix** (2–4 chars) is always applied. It is prepended to every property name with a dash (e.g. prefix `gtd` → `gtd-status`). Defaults to the profile name when a profile is active, or `my` for custom.

---

## Default Configuration (`custom` profile, prefix `my`)

**Property 1 — `my-status`:**

| # | Main term | Sub-list (`Cmd/Ctrl+Shift+.`) |
|---|---|---|
| 1 | `later` | `scheduled`, `waiting` |
| 2 | `todo` | `high`, `medium`, `low` |
| 3 | `now` | `progress`, `blocked`, `review` |
| 4 | `doing` | `progress`, `blocked`, `review` |
| 5 | `done` | *(none — key does nothing)* |
| 6 | `canceled` | `optional`, `impossible` |

**Property 2 — `my-location`:** `home` → `work` → `home` …

---

## GTD Profile (prefix `gtd`)

**`gtd-status`:** `later` → `todo` → `now` → `doing` → `done` → `canceled`

Sub-lists same as default above.

**`gtd-location`:** `home` → `work`

---

## PARA Profile (prefix `para`)

**`para-status`:** `project` → `area` → `resource` → `archive`

**`para-location`:** `home` → `work`

---

## Cursor-Aware Property Selection

Before choosing which property to rotate, the plugin detects which property line the cursor is currently on using `logseq.Editor.getEditingBlockContent()` + `getEditingCursorPosition()`.

```
my-status:: doing       ← cursor here → rotates my-status
my-location:: home
```

```
my-status:: doing
my-location:: home      ← cursor here → rotates my-location
```

If the cursor is not on a recognised property line, the plugin scans configured properties in order and uses the **first one found on the block**.

After a successful write, the cursor is repositioned right after `::` on the updated property line via `focusPropertyLine()`, which calls `logseq.Editor.editBlock({ pos })`.

---

## Property Key Normalisation

Logseq stores properties in `block.properties` with **camelCase** keys:

| Written to file | Read from `block.properties` |
|---|---|
| `gtd-status` | `gtdStatus` |
| `my-location` | `myLocation` |
| `para-status` | `paraStatus` |

The plugin applies this normalisation when reading current values, and writes with the hyphenated form.

---

## Main Rotation (`Cmd/Ctrl+Shift+,`)

### Step 1 — Select property

Use cursor line detection (above). Fall back to first configured property present on block.

### Step 2 — Strip sub-terms, advance main term

All sub-terms (from any sub-list) are stripped. The main term advances to the next in the list. Wraps around.

```
terms: [later, todo, now, doing, done, canceled]

my-status:: todo/high   →  my-status:: now      (sub-term stripped, todo → now)
my-status:: now/blocked →  my-status:: doing    (sub-term stripped, now → doing)
my-status:: doing       →  my-status:: done
my-status:: done        →  my-status:: canceled
my-status:: canceled    →  my-status:: later    (wraps)
```

### Step 3 — Write back

Calls `setBlockProperty()` which uses `logseq.Editor.upsertBlockProperty()`. Only the matched property is updated. All others are untouched.

---

## Sub-Rotation (`Cmd/Ctrl+Shift+.`)

Adds or cycles a sub-term **alongside** the current main term. The main term is unchanged.

Sub-terms are joined with `/` (not comma).

```
my-status:: todo          →  my-status:: todo/high
my-status:: todo/high     →  my-status:: todo/medium
my-status:: todo/medium   →  my-status:: todo/low
my-status:: todo/low      →  my-status:: todo/high   (wraps)
```

If the current main term has no sub-list configured (e.g. `done`), `Cmd/Ctrl+Shift+.` does **nothing**.

---

## Value Parsing

Values are parsed by splitting on **both** `,` and `/`, then trimming whitespace. Matching is case-insensitive.

```
my-status:: Todo          ← matches "todo" ✓
my-status:: TODO          ← matches "todo" ✓
my-status:: todo/high     ← main="todo", sub="high"
my-status:: todo, high    ← also parsed correctly
```

---

## Decision Tree

```
Press Cmd/Ctrl+Shift+, or Cmd/Ctrl+Shift+.
│
├─ Block found?
│   └─ No → show error, stop
│
├─ Cursor on a recognised property line?
│   ├─ Yes → use that property
│   └─ No  → scan configured properties, use first one found on block
│
├─ Property found on block?
│   │
│   ├─ Yes (main rotation):
│   │   ├─ Value empty/null     → set first term
│   │   ├─ Value matches a term → strip sub-terms + advance to next term
│   │   └─ Value unrecognised   → set first term
│   │
│   ├─ Yes (sub-rotation):
│   │   ├─ Term has sub-list → add/cycle sub-term, keep main term
│   │   └─ No sub-list       → do nothing
│   │
│   └─ No → add ALL configured properties, each with their first term
│
└─ On success → reposition cursor after :: on that property line
```

---

## Edge Cases

| Situation | Result |
|---|---|
| No block focused | Show error, do nothing |
| Block has no configured property | Add **all** configured properties, each with first term |
| Property value is empty | Set first term |
| Property value not in any term list | Set first term |
| Cursor on unrecognised line | Fall back to first property in config |
| Both properties present, no cursor hint | First configured property wins |
| `Cmd/Ctrl+Shift+.` on term with no sub-list | Do nothing silently |
| `Cmd/Ctrl+Shift+,` with sub-term present | Sub-term stripped, main advances |
| Profile active | Manual fields ignored, profile terms used |

---

## Block Resolution Order

`getCurrentBlock()` tries three methods in order:
1. `logseq.Editor.checkEditing()` — returns UUID of actively editing block; fetches block + live content via `getEditingBlockContent()`
2. `logseq.Editor.getCurrentBlock()` — fallback
3. `logseq.Editor.getSelectedBlocks()[0]` — final fallback

Returns `null` if all three fail.

---

## Source

- `src/rotation.ts` — `rotateProperty()`, `handleMainRotation()`, `handleSubRotation()`
- `src/shortcuts.ts` — `handleRotation()`, `setSettings()`, `registerShortcuts()`
- `src/config.ts` — `defaultSettings`, `profileGTD`, `profilePARA`, `profiles`
- `src/ui/settings.ts` — `buildSettingsFromSchema()`, prefix and profile resolution
- `src/api/logseq.ts` — `getCurrentBlock()`, `getCursorProperty()`, `setBlockProperty()`, `focusPropertyLine()`, `getBlockProperty()`
- `src/main.ts` — startup, `onSettingsChanged` handler
