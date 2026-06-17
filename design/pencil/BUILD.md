# Biolabs tool hub — Pencil build guide

## Files

| File | Purpose |
|------|---------|
| `biolabs-tool-hub.pen` | Main design document (frames + components + variables) |
| `biolabs-variables.json` | Copy-paste payload for Pencil MCP `set_variables` |
| `build-biolabs-pen.py` | Regenerate `.pen` from spec (safe to re-run) |

## Open in Pencil

1. Install **Pencil** (`highagency.pencildev`) in Cursor.
2. Open `design/pencil/biolabs-tool-hub.pen`.
3. Toggle **Mode** theme (dark / light) on any frame to preview both palettes.

## Canvas layout

```
Components (-520,0)     Landing / Hub (0,0)          Tool / Gaster (1540,0)
                        Tool / Helix (0,960)         Tool / Strata (1540,960)
```

## Frames

| Frame | Size | Contents |
|-------|------|----------|
| Landing / Hub / 1440 | 1440×900 | Hero, 5-card tool grid, capabilities 2×2 |
| Tool / Gaster / 1440 | 1440×900 | Data · Viewport · Inspector |
| Tool / Helix / 1440 | 1440×900 | Input · Sequence · Inspector |
| Tool / Strata / 1440 | 1440×900 | Layers · Viewport · Properties |

## Reusable components

- `RoutePill` — mono route label, 9px
- `StatusBadge` — LIVE / BETA / SOON pill
- `ToolCard` — icon, name, route, tagline, description, status
- `AppHeader` — BIOLABS brand + theme / ⌘K hints

Landing tool cards are `ref` instances of `ToolCard` with `descendants` overrides.

## Pencil MCP (when enabled)

If the Pencil MCP server is available in chat with the file open:

```
set_variables filePath=design/pencil/biolabs-tool-hub.pen variables=<contents of biolabs-variables.json>
get_screenshot filePath=design/pencil/biolabs-tool-hub.pen nodeId=LndHub
export_nodes filePath=design/pencil/biolabs-tool-hub.pen outputDir=design/pencil/exports nodeIds=["LndHub","FrGstr","FrHelx","FrStrt"]
```

## Regenerate from spec

After editing `docs/design/biolabs-tool-expansion.md` or copy, update `build-biolabs-pen.py` and run:

```bash
python3 design/pencil/build-biolabs-pen.py
```

## Sign-off checklist

- [ ] Dark + light Mode themes match `client/src/index.css`
- [ ] Corner radius 0 on all panels
- [ ] Tool grid matches landing IA (5 tools, SOON at 50% opacity)
- [ ] Helix / Strata dock widths match spec (280 · flex · 320)
- [ ] Export PNG @2x for PR review
