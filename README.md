# Property Rotator Plugin

![Beta](https://img.shields.io/badge/status-beta-orange?style=flat)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/manu4linux?label=Sponsor&logo=GitHub&style=flat)](https://github.com/sponsors/manu4linux)

Rotate Logseq block properties through a configured list of values using keyboard shortcuts. Supports GTD / PARA profiles, property prefixes, cursor-aware rotation, and sub-term cycling.

> Markdown (file-based) Logseq only. Not compatible with the DB version.

<img width="2130" height="1732" alt="Property Rotator in action" src="https://github.com/user-attachments/assets/2ea78e95-2be8-4aa3-b870-dcbb6a313b4f" />

---

## How it works

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl+Shift+,` | Rotate main property |
| `Cmd/Ctrl+Shift+.` | Cycle sub-term of current value |

- **No property on block** → adds first property with its first term
- **Property present** → advances to next term (wraps)
- **Cursor on a property line** → rotates only that property; remembered for rapid presses
- **Sub-term present** (`todo/high`) → main rotation strips it and advances the main term
- **Unrecognised properties** → untouched

Sub-rotation (`Cmd/Ctrl+Shift+.`) cycles a secondary value alongside the main term: `todo` → `todo/high` → `todo/medium` → `todo/low` → wraps. Does nothing if the current term has no sub-list configured.

---

## Profiles & Settings

| Setting | Options / Default |
|---|---|
| **Profile** | `custom` (default), `gtd`, `para` |
| **Prefix** | Short prefix prepended to property names — default `my` → `my-status::` |
| **Rotation 1 & 2** | Property name + comma-separated terms + optional sub-lists |
| **Shortcuts** | Configurable in Settings |

**Built-in profiles:**
- **gtd** — `status`: later → todo → now → doing → done → canceled; `location`: home → work
- **para** — `status`: project → area → resource → archive; `location`: home → work

---

## Setup

```bash
git clone https://github.com/ManoPaduri/logseq-kpm-property-rotator.git
cd logseq-kpm-property-rotator
npm install && npm run build
```

In Logseq: **Settings → Advanced → Developer mode → Load unpacked plugin** → select the folder.

> ⚠️ Not yet in the Logseq marketplace — install manually for now. Bug reports welcome via [GitHub Issues](https://github.com/ManoPaduri/logseq-kpm-property-rotator/issues).

---

## Support

Free, no ads, no telemetry. If it saves you time, a small contribution keeps it maintained.

[![GitHub Sponsors](https://img.shields.io/github/sponsors/manu4linux?label=Sponsor&logo=GitHub&style=flat)](https://github.com/sponsors/manu4linux)
[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/manu4linux)
[![Buy Me a Coffee](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=manu4linux&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff)](https://buymeacoffee.com/manu4linux)

---

## What's Next

Properties get powerful when combined with Logseq's query system — think auto-surfacing GTD/PARA blocks without any manual tagging. If that sounds useful, watch this repo or drop a note in [Discussions](https://github.com/ManoPaduri/logseq-kpm-property-rotator/discussions).

---

## License

MIT
