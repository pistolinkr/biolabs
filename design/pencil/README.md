# Pencil designs — Biolabs tool hub

Open **`biolabs-tool-hub.pen`** in Pencil (`highagency.pencildev`). Regenerate with `python3 build-biolabs-pen.py`. See [`BUILD.md`](BUILD.md) for MCP export steps.

## Variables (match `client/src/index.css`)

| Name | Dark | Light |
|------|------|-------|
| background | `#0A0A0A` | `#F0F0F0` |
| foreground | `#F2F2F2` | `#141414` |
| card | `#111111` | `#FFFFFF` |
| border | `#2A2A2A` | `#C8C8C8` |
| accent | `#7C8A99` | `#5A6878` |
| muted-foreground | `#8A8A8A` | `#5A6878` |

Corner radius: **0** everywhere.

## Frames to draw

1. **Landing / Hub / 1440×900** — tool grid (see `docs/design/biolabs-tool-expansion.md`)
2. **Tool / Gaster / 1440×900** — reference from running app
3. **Tool / Helix / 1440×900** — sequence + variant shell
4. **Tool / Strata / 1440×900** — layers + viewport

## Components

- `ToolCard` — name, route pill, tagline, description, status badge
- `RoutePill` — mono 9px, border only
- `StatusBadge` — LIVE | BETA | SOON

Full measurements and copy: [`docs/design/biolabs-tool-expansion.md`](../docs/design/biolabs-tool-expansion.md).
