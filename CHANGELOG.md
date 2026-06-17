# Changelog

All notable changes to Biolabs are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.3.1] - 2026-06-17

### Changed

- Phaeleon drug interaction report translation uses Google Translate (no AI API key required)

## [2.1.0] - 2026-06-10

### Added

- AI research assistant (chat, explain, residue analysis) with modular server providers
- Full i18n (en, ko, ja, de, fr, es, zh) with regional locale suggestion
- Command palette Ask AI overlay
- Viewport measurement mode, polymer overlay feedback, source panel scroll fixes
- Version branch deployment docs and CI workflow

### Changed

- Landing footer: `biolabs v2.1`, G.Gear Vanguard Service tagline
- Version display unified via `shared/version.ts`

### Notes

- Vercel static hosting deploys the frontend only; `/api/ai` requires Node/Docker (`pnpm start`).

[2.3.1]: https://github.com/pistolinkr/biolabs/releases/tag/v2.3.1
[2.1.0]: https://github.com/pistolinkr/biolabs.v2/releases/tag/v2.1.0
