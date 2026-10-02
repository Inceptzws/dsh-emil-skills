/**
 * dsh-emil-skills — a DeepSeek Harness skill-bundle plugin.
 *
 * Registers every skill directory under `../skills/` with the Harness skill
 * registry (`ctx.skills`). The skills themselves are Emil Kowalski's
 * design-engineering skills, vendored verbatim from
 * https://github.com/emilkowalski/skills (see PROVENANCE.md).
 *
 * Zero runtime dependencies: the only APIs used are `node:fs`, `node:path`
 * and the `ctx.skills.registerProvider` service seam, so the package installs
 * from a plain `link:`, git or npm spec without a build step.
 *
 * The provider shape mirrors the shipped first-party
 * `@deepseek-ai/dsh-skill-office` provider so the two stay interchangeable.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Cordis plugin identity. */
const name = 'skill-emil'

/** Service seam this plugin feeds. */
const inject = ['skills']

/** Provider name reported to the skill registry. */
const PROVIDER_NAME = 'dsh-emil-skills'

/** Precedence rank for packaged skill providers and local bundled roots. */
const BUNDLED_SKILL_RANK = 600

/** Skill names must match the Harness kebab-case grammar. */
const SKILL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Leading YAML frontmatter block; capture group 1 is the field body. */
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u

/**
 * Split one SKILL.md document into its frontmatter fields and body.
 *
 * Only the flat, single-line `key: value` fields this bundle uses are read.
 * Values are taken verbatim after the first colon, so a description that
 * itself contains `: ` survives, and matching outer quotes are stripped.
 *
 * @param raw - complete SKILL.md text.
 * @param where - path used in error messages.
 * @returns the parsed field map plus the body after the frontmatter.
 */
function parseSkillDocument(raw, where) {
  const frontmatter = FRONTMATTER_PATTERN.exec(raw)
  if (frontmatter === null) {
    throw new Error(`dsh-emil-skills: ${where} has no YAML frontmatter`)
  }
  const fields = new Map()
  for (const line of frontmatter[1].split(/\r?\n/)) {
    // Ignore blank lines, comments, and nested/continuation lines.
    if (line.length === 0 || /^\s/u.test(line) || line.startsWith('#')) continue
    const colon = line.indexOf(':')
    if (colon <= 0) continue
    const key = line.slice(0, colon).trim()
    let value = line.slice(colon + 1).trim()
    const quoted =
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    if (quoted) value = value.slice(1, -1)
    fields.set(key, value)
  }
  return { fields, body: raw.slice(frontmatter[0].length) }
}

/**
 * Read and validate one skill's frontmatter.
 *
 * @param raw - complete SKILL.md text.
 * @param where - path used in error messages.
 * @param directoryName - directory name the frontmatter name must equal.
 * @returns validated metadata and the skill body.
 */
function parseSkillMetadata(raw, where, directoryName) {
  const { fields, body } = parseSkillDocument(raw, where)
  const skillName = fields.get('name')
  const description = fields.get('description')
  if (typeof skillName !== 'string' || skillName.length === 0) {
    throw new Error(`dsh-emil-skills: ${where} has no frontmatter name`)
  }
  if (typeof description !== 'string' || description.length === 0) {
    throw new Error(`dsh-emil-skills: ${where} has no frontmatter description`)
  }
  if (skillName !== directoryName) {
    throw new Error(
      `dsh-emil-skills: ${where} declares name "${skillName}" but its directory is "${directoryName}"`,
    )
  }
  if (!SKILL_NAME_PATTERN.test(skillName)) {
    throw new Error(`dsh-emil-skills: ${where} has an invalid skill name "${skillName}"`)
  }
  return {
    name: skillName,
    description,
    invocation: {
      // Upstream marks a few skills with `disable-model-invocation: true`;
      // they stay reachable through explicit user invocation.
      modelInvocable: fields.get('disable-model-invocation') !== 'true',
      userInvocable: fields.get('user-invocable') !== 'false',
    },
    content: body.trim(),
  }
}

/**
 * Enumerate and validate the skill directories shipped in this package.
 *
 * @param assetRoot - absolute path to the package's `skills/` directory.
 * @returns one candidate per skill directory, sorted by name.
 */
function collectCandidates(assetRoot) {
  const entries = readdirSync(assetRoot, { withFileTypes: true, encoding: 'utf8' })
  const candidates = []
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const directory = join(assetRoot, entry.name)
    // Follow directory symlinks the same way the filesystem provider does, and
    // skip anything that is not a directory (a loose .md file is reference
    // material, not a skill).
    let isDirectory = entry.isDirectory()
    if (!isDirectory && entry.isSymbolicLink()) {
      try {
        isDirectory = statSync(directory).isDirectory()
      } catch {
        isDirectory = false
      }
    }
    if (!isDirectory) continue

    const locator = join(directory, 'SKILL.md')
    const parsed = parseSkillMetadata(readFileSync(locator, 'utf8'), locator, entry.name)
    candidates.push({
      name: parsed.name,
      description: parsed.description,
      invocation: parsed.invocation,
      provider: PROVIDER_NAME,
      source: 'bundled',
      rank: BUNDLED_SKILL_RANK,
      resourceBase: {
        kind: 'directory',
        path: directory,
      },
      locator,
    })
  }
  if (candidates.length === 0) {
    throw new Error(`dsh-emil-skills: no skills found under ${assetRoot}`)
  }
  return candidates
}

/**
 * Register Emil Kowalski's design-engineering skills with the Harness.
 *
 * @param ctx - Cordis context carrying the skill registry.
 * @param config - optional `assetRoot` override for packaged deployments.
 */
function apply(ctx, config = {}) {
  const assetRoot = config.assetRoot ?? fileURLToPath(new URL('../skills/', import.meta.url))
  if (typeof assetRoot !== 'string' || !isAbsolute(assetRoot)) {
    throw new Error('dsh-emil-skills: assetRoot must be an absolute directory')
  }
  if (!statSync(assetRoot).isDirectory()) {
    throw new Error(`dsh-emil-skills: assetRoot is not a directory: ${assetRoot}`)
  }

  // Validate every vendored skill at mount time: a broken skill fails loud
  // here instead of surfacing as a missing skill later.
  const candidates = collectCandidates(assetRoot)

  const provider = {
    name: PROVIDER_NAME,
    list: () => Promise.resolve(candidates),
    async get(candidate, options) {
      // `rank` and `locator` are provider-internal, exactly as in the shipped
      // Office provider, and must not leak into the registry result.
      const { rank: _rank, locator, ...summary } = candidate
      const raw = await readFile(locator, { encoding: 'utf8', signal: options.signal })
      return { ...summary, content: parseSkillDocument(raw, locator).body.trim() }
    },
  }

  ctx.skills.registerProvider(() => provider)
}

export { apply, inject, name }
