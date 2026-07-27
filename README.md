# Property Rotator Plugin

![Beta](https://img.shields.io/badge/status-beta-orange?style=flat)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/manu4linux?label=Sponsor&logo=GitHub&style=flat)](https://github.com/sponsors/manu4linux)

> ⚠️ **Beta release** — core features are working and tested, but rough edges may exist. Feedback and bug reports welcome via [GitHub Issues](https://github.com/ManoPaduri/logseq-kpm-property-rotator/issues).

> 🛒 **Not yet in the Logseq marketplace** — install manually for now (see [Setup](#setup) below).

Rotate Logseq block properties through a list of values using keyboard shortcuts. Supports quick profiles (GTD / PARA), property prefixes, cursor-aware rotation, and sub-term cycling.

> **Note:** Works only with Logseq **Markdown (file-based)** version. Not compatible with the DB version.

---

## Shortcuts

| Action | Default Key |
|---|---|
| Main rotation | `Ctrl+Shift+J` |
| Sub-rotation | `Ctrl+Shift+K` |

Both shortcuts can be changed in plugin Settings.

---

## Quick Profiles

Open plugin Settings → **Quick Profile** to select a preset:

| Profile | Properties & Terms |
|---|---|
| **custom** | Use manual settings below (default) |
| **gtd** | `status`: later → todo → now → doing → done → canceled; `location`: home → work |
| **para** | `status`: project → area → resource → archive; `location`: home → work |

> **Note:** After switching profiles, field values in settings do not update instantly — close and re-open settings to see them reflected. The rotation logic switches immediately.

---

## Property Prefix

A short prefix (2–4 chars) is prepended to every property name with a dash.

| Prefix | Resulting property |
|---|---|
| `my` (default) | `my-status:: later` |
| `gtd` | `gtd-status:: later` |
| `para` | `para-status:: project` |

- When a profile is selected, the prefix defaults to the profile name (`gtd` or `para`).
- Switching back to `custom` resets the prefix to `my`.
- You can always override the prefix manually in the Prefix field.

---

## Cursor-Aware Rotation

When the cursor is **on a specific property line** inside a block, the shortcut rotates **only that first property1** — regardless of which property cursor is on.

```
  my-status:: doing       ← cursor here → Ctrl+Shift+J rotates status
  my-location:: home
```

```
  my-status:: doing
  my-location:: home      ← cursor here → Ctrl+Shift+J rotates location
```

If the cursor is not on a recognised property line, the first configured property1 is rotated as normal.

After every rotation, the cursor is placed right after `::` on the updated property line.

---

## Default Rotations (`custom` profile)

**Property 1 — `my-status`:**

| Main term | Sub-list (`Ctrl+Shift+K`) |
|---|---|
| `later` | `scheduled`, `waiting` |
| `todo` | `high`, `medium`, `low` |
| `now` | `progress`, `blocked`, `review` |
| `doing` | `progress`, `blocked`, `review` |
| `done` | *(none)* |
| `canceled` | `optional`, `impossible` |

**Property 2 — `my-location`:** `home` → `work` → `home` …

---

<img width="2130" height="1732" alt="Kapture 2026-07-27 at 02 51 36" src="https://github.com/user-attachments/assets/2ea78e95-2be8-4aa3-b870-dcbb6a313b4f" />

---
## Behaviour by Block State

### 1. No property on block

```
- Buy groceries
```

**`Ctrl+Shift+J`** → adds first property with first term:

```
- Buy groceries
  my-status:: later
```

---

### 2. Main property present

```
- Buy groceries
  my-status:: todo
```

**`Ctrl+Shift+J`** → advances to next term:

```
- Buy groceries
  my-status:: now
```

Wraps: `now` → `doing` → `done` → `canceled` → `later` → …

---

### 3. Both properties — cursor selects which to rotate

```
- Task
  my-status:: doing
  my-location:: home    ← cursor on this line
```

**`Ctrl+Shift+J`** → only `my-location` rotates:

```
- Task
  my-status:: doing
  my-location:: work
```

---

### 4. Sub-term present — main rotation clears it

```
- Task
  my-status:: todo/high
```

**`Ctrl+Shift+J`** → sub-term stripped, main advances:

```
- Task
  my-status:: now
```

---

### 5. Empty or missing value

```
- Task
  my-status::
```

**`Ctrl+Shift+J`** → sets first term:

```
- Task
  my-status:: later
```

---

### 6. Unrecognised properties — ignored

```
- Task
  priority:: urgent
```

**`Ctrl+Shift+J`** → unrecognised properties untouched, first rotation property added:

```
- Task
  priority:: urgent
  my-status:: later
```

---

## Sub-rotation (`Ctrl+Shift+K`)

Cycles a sub-term **alongside** the current main term. Main term is unchanged.

```
my-status:: todo          →  my-status:: todo/high
my-status:: todo/high     →  my-status:: todo/medium
my-status:: todo/medium   →  my-status:: todo/low
my-status:: todo/low      →  my-status:: todo/high   (wraps)
```

Sub-terms are joined with `/`. If the current main term has no sub-list, `Ctrl+Shift+K` does nothing.

---

## Settings Reference

| Setting | Description |
|---|---|
| **Active Profile** | `custom` / `gtd` / `para` |
| **Prefix** | Short prefix for all property names (default: `my`) |
| **Property 1 / Terms 1** | Manual property name and comma-separated term list |
| **Sub-list slots** | Per-term sub-term lists for property 1 |
| **Property 2 / Terms 2** | Second rotation property |
| **Main Shortcut** | Default `ctrl+shift+j` |
| **Sub Shortcut** | Default `ctrl+shift+k` |

---

## Setup

```bash
git clone https://github.com/ManoPaduri/logseq-kpm-property-rotator.git
cd logseq-kpm-property-rotator
npm install
npm run build
```

Then in Logseq: **Settings → Advanced → Developer mode → Load unpacked plugin** → select the cloned folder.

---

## Support

This plugin is free and built in personal time — no ads, no telemetry, no paywalls.

If it saves you time in your daily Logseq pkm workflow, a small contribution goes a long way:

- **It keeps the plugin maintained** — bug fixes, compatibility updates as Logseq evolves, and new features based on real user feedback.
- **It funds focused work** — even a small amount means I can carve out dedicated time rather than squeezing this in between everything else.
- **It creates a direct connection** — supporters who contribute often share how they use the plugin, which directly shapes what gets built next.

> Every contribution, however small, signals that this work matters — and that's what keeps it going.

[![GitHub Sponsors](https://img.shields.io/github/sponsors/manu4linux?label=Sponsor&logo=GitHub&style=flat)](https://github.com/sponsors/manu4linux)
[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/manu4linux)
[![Buy Me a Coffee](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=manu4linux&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff)](https://buymeacoffee.com/manu4linux)


---

## What's Next

> 💡 **Side note:** This plugin is a foundation. Properties become much more powerful when combined with Logseq's query system or namespace-based file organisation — giving you at-a-glance views and structure without extra effort.
>
> The next area of focus may be making that organisation effortless: think query templates that surface your GTD/PARA properties automatically, or namespace conventions that keep everything findable with zero maintenance.
>
> If that sounds useful to you, watch this repo or leave a note in [Discussions](https://github.com/ManoPaduri/logseq-kpm-property-rotator/discussions).

---

## License

MIT
