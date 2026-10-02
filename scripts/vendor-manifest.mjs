#!/usr/bin/env node
/**
 * Regenerate `vendor-manifest.json` from the vendored skill tree.
 *
 * Run after syncing upstream: `node scripts/vendor-manifest.mjs <upstream-commit>`.
 * `scripts/verify.mjs` then fails if any vendored byte drifts from the record,
 * so accidental local edits to upstream content are caught before release.
 */

import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const UPSTREAM = 'https://github.com/emilkowalski/skills'
const upstreamCommit = process.argv[2]

if (upstreamCommit === undefined) {
  console.error('usage: node scripts/vendor-manifest.mjs <upstream-commit-sha>')
  process.exitCode = 1
  throw new Error('missing upstream commit')
}

/** Recursively list files under a directory, repository-relative and POSIX-style. */
function walk(directory) {
  const found = []
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const full = join(directory, entry.name)
    if (entry.isDirectory()) found.push(...walk(full))
    else if (entry.isFile()) found.push(relative(ROOT, full).split(sep).join('/'))
  }
  return found
}

const paths = [...walk(join(ROOT, 'skills')), 'performance-cheatsheet.md'].sort()
const files = {}
for (const path of paths) {
  const bytes = readFileSync(join(ROOT, path))
  files[path] = {
    bytes: statSync(join(ROOT, path)).size,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  }
}

const manifest = {
  upstream: UPSTREAM,
  upstreamCommit,
  vendoredAt: new Date().toISOString(),
  license: 'MIT',
  files,
}
writeFileSync(join(ROOT, 'vendor-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`vendor-manifest.json: ${paths.length} files recorded at ${upstreamCommit}`)
