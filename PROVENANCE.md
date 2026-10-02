# Provenance

This repository packages third-party skill content as a DeepSeek Harness plugin.
**It vendors upstream content without modification.** This file records exactly
what came from where, so the boundary between "upstream content" and "our
packaging" is auditable.

## Upstream

| Field | Value |
| --- | --- |
| Repository | <https://github.com/emilkowalski/skills> |
| Author | Emil Kowalski |
| License | MIT (see [`LICENSE`](LICENSE)) |
| Vendored commit | `e8a175de22ae1e49370fc144c1f3bb9aeedf988d` |
| Commit date | 2026-10-02 |
| Commit subject | `Add break ui skill` |
| Vendored on | 2026-10-03 |

## Vendored verbatim

These paths are byte-identical to the upstream tree at the commit above, and are
recorded with their sizes and SHA-256 digests in [`vendor-manifest.json`](vendor-manifest.json):

- `skills/` — all 14 skill directories, including every supporting document
  (`RECIPES.md`, `API.md`, `CATALOG.md`, `AUDIT.md`, `PLAN-TEMPLATE.md`,
  `PICKER.md`, `STANDARDS.md`).
- `performance-cheatsheet.md` — the upstream repository root cheat sheet.

`scripts/verify.mjs` recomputes each digest, so any accidental edit to vendored
content fails verification.

## Added by this repository

Everything else is original packaging and carries no upstream content:

| Path | Purpose |
| --- | --- |
| `package.json` | npm/DSH manifest; declares `dsh.bundle.patch` |
| `cordis.patch.yml` | Bundle patch inserting the `skill-emil` plugin row |
| `lib/index.js` | Cordis Host plugin; validates and registers the skill provider |
| `locale/en.json`, `locale/zh.json` | Plugin Manager display title and description |
| `icon.svg` | Plugin icon |
| `scripts/verify.mjs` | Offline integrity check (skills, links, digests) |
| `scripts/vendor-manifest.mjs` | Regenerates `vendor-manifest.json` after a sync |
| `vendor-manifest.json` | Upstream commit plus per-file size and SHA-256 |
| `README.md`, `PROVENANCE.md`, `LICENSE` | Documentation and licensing |
| `.github/workflows/verify.yml` | CI running the integrity check |

## How the content was obtained

```bash
git clone --depth 1 https://github.com/emilkowalski/skills.git /tmp/emil-skills
cp -R /tmp/emil-skills/skills ./skills
cp /tmp/emil-skills/performance-cheatsheet.md ./
node scripts/vendor-manifest.mjs "$(git -C /tmp/emil-skills rev-parse HEAD)"
```

## Sync procedure

Repeat the commands above with a fresh clone, then update the "Upstream" table,
regenerate the manifest, run `npm run verify`, and record the new commit in the
commit message. Never hand-edit anything under `skills/` or
`performance-cheatsheet.md`; make the change upstream and re-vendor instead.

## Licensing note

The vendored content is MIT-licensed. `LICENSE` reproduces the MIT terms and
names both the upstream copyright holder (Emil Kowalski) and this repository's
packaging copyright, because this repository distributes the vendored content.
If upstream relicenses or requests removal, this repository will follow.
