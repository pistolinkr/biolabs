# Branching and deployment

Biolabs uses **release branches** for each minor version line, deployed to **separate Vercel projects** (static frontend).

## Branch map

| Branch | Purpose | Vercel |
|--------|---------|--------|
| `main` | Development trunk (next release) | Preview only |
| `release/v2.1` | v2.1 line — hotfixes only | Project `biolabs-v2.1` Production |
| `release/v2.2` | v2.2 line (when cut) | Project `biolabs-v2.2` Production |

One Vercel project = one Production Branch. Parallel release lines need parallel Vercel projects linked to the same GitHub repo.

## Version source of truth

- Semver: [package.json](../package.json) `"version"`
- UI label: [shared/version.ts](../shared/version.ts) — keep `APP_VERSION` in sync when cutting releases

## Initial setup (v2.1)

```bash
git checkout main
git pull origin main

git checkout -b release/v2.1
git push -u origin release/v2.1

git tag -a v2.1.0 -m "Biolabs v2.1.0"
git push origin v2.1.0
```

## Vercel project: biolabs-v2.1

1. Import repo `pistolinkr/biolabs.v2` in Vercel dashboard
2. Project name: `biolabs-v2.1`
3. **Production Branch:** `release/v2.1`
4. Build settings (from [vercel.json](../vercel.json)):
   - Install: `pnpm install`
   - Build: `pnpm run build`
   - Output: `dist/public`
5. Optional domain: `v21.yourdomain.com`

See [VERCEL_SETUP_v2.1.md](./VERCEL_SETUP_v2.1.md) for dashboard steps if CLI is unavailable (billing/permissions).

Repeat for each new line (`biolabs-v2.2` → `release/v2.2`, etc.).

### Optional: skip builds on non-production branches

In Vercel → Project → Settings → Git → **Ignored Build Step**:

```bash
if [ "$VERCEL_GIT_COMMIT_REF" = "release/v2.1" ]; then exit 1; else exit 0; fi
```

(Use the branch name matching that project's Production Branch.)

## New minor release (example v2.2)

1. Merge features into `main`
2. `git checkout -b release/v2.2 main`
3. Bump `package.json` and `shared/version.ts` to `2.2.0`
4. Update [CHANGELOG.md](../CHANGELOG.md)
5. Tag `v2.2.0`, push branch + tag
6. Create Vercel project `biolabs-v2.2` with Production Branch `release/v2.2`
7. On `main`, bump to `2.3.0-dev` for ongoing work

## Hotfix (example v2.1.1)

1. Branch from `release/v2.1`: `hotfix/2.1.1-description`
2. Fix, bump to `2.1.1` in version files + CHANGELOG
3. PR into `release/v2.1` → Vercel auto-deploys
4. Cherry-pick to `main` if the bug exists on trunk

## End-of-life

- Remove custom domain from Vercel project
- Disable or delete Vercel project
- Rename branch to `archive/release-v2.1` (do not delete history)

## GitHub branch protection (recommended)

For `release/v2.1` (and each `release/v2.x`):

- Require pull request before merge
- Require status checks: `CI / build` (when enabled)
- Restrict force pushes

Configure under **Settings → Branches → Branch protection rules**.

## AI on Vercel static

Production on Vercel serves static files only. The Express `/api/ai` routes run when you deploy with:

```bash
pnpm run build
pnpm start
```

Add provider keys to server `.env` (see [.env.example](../.env.example)).
