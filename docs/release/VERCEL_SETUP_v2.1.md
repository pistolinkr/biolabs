# Vercel setup: biolabs-v2.1

Automated CLI setup was blocked (team billing / permissions). Complete these steps in the [Vercel dashboard](https://vercel.com/new).

## Prerequisites

- GitHub repo: `pistolinkr/biolabs.v2`
- Branch `release/v2.1` pushed (done)
- Tag `v2.1.0` pushed (done)
- Team billing active on the target Vercel team

## Create project

1. **Add New Project** → Import `pistolinkr/biolabs.v2`
2. **Project name:** `biolabs-v2.1`
3. **Framework Preset:** Other (uses [vercel.json](../../vercel.json))
4. **Root Directory:** `.` (repository root)
5. **Build Command:** `pnpm run build`
6. **Output Directory:** `dist/public`
7. **Install Command:** `pnpm install`

## Production branch

After import:

1. Project → **Settings** → **Git**
2. **Production Branch:** `release/v2.1`
3. Save

## Optional domain

1. Project → **Settings** → **Domains**
2. Add e.g. `v21.yourdomain.com` or attach primary domain to this project

## Optional: ignored build step

Skip preview builds on unrelated branches (saves build minutes):

```bash
if [ "$VERCEL_GIT_COMMIT_REF" = "release/v2.1" ]; then exit 1; else exit 0; fi
```

## Verify

1. Push a commit to `release/v2.1` (or redeploy from dashboard)
2. Confirm Production URL serves the landing page with **biolabs v2.1**
3. AI settings should show static-hosting note (no `/api/ai` on Vercel)

## CLI (when billing is resolved)

```bash
git checkout release/v2.1
vercel link --project biolabs-v2.1
vercel deploy --prod
```
