import { randomUUID } from 'node:crypto'
import { lstat, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const STUDIO_HANDOFF_PACKAGE_TYPE = 'arkitect_studio_handoff'
export const STUDIO_HANDOFF_SCHEMA_VERSION = 1
export const STUDIO_CONTEXT_DIRECTORY = path.join('.arkitect', 'studio-context')

const MAX_PACKAGE_BYTES = 25 * 1024 * 1024
const MAX_ARTIFACTS = 500
const MAX_CONTEXT_RECORDS = 10_000
const SAFE_WORKSPACE_KEY = /^[a-z][a-z0-9_]{0,63}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ARTIFACT_STATUSES = new Set(['draft', 'committed', 'superseded'])

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function fail(message) {
  throw new Error(`Studio handoff import failed: ${message}`)
}

function requireTimestamp(value, field) {
  if (typeof value !== 'string' || value.length < 20 || value.length > 40 || Number.isNaN(Date.parse(value))) {
    fail(`${field} must be an ISO 8601 timestamp.`)
  }
}

function requireUuid(value, field) {
  if (typeof value !== 'string' || !UUID.test(value)) {
    fail(`${field} must be a UUID.`)
  }
}

function requirePositiveInteger(value, field) {
  if (!Number.isInteger(value) || value < 1) {
    fail(`${field} must be a positive integer.`)
  }
}

function requireRecord(value, field) {
  if (!isRecord(value)) fail(`${field} must be an object.`)
}

function requireRecordArray(value, field, maximum = MAX_CONTEXT_RECORDS) {
  if (!Array.isArray(value) || value.length > maximum || value.some((item) => !isRecord(item))) {
    fail(`${field} must be an array of at most ${maximum} objects.`)
  }
}

/**
 * Validates only the versioned transfer envelope and immutable provenance.
 * Coach-authored payloads remain opaque and are never normalized or repaired.
 */
export function validateStudioHandoffPackage(value) {
  if (!isRecord(value)) fail('the JSON root must be an object.')
  if (value.packageType !== STUDIO_HANDOFF_PACKAGE_TYPE) {
    fail(`packageType must be "${STUDIO_HANDOFF_PACKAGE_TYPE}".`)
  }
  if (value.schemaVersion !== STUDIO_HANDOFF_SCHEMA_VERSION) {
    fail(`schemaVersion must be ${STUDIO_HANDOFF_SCHEMA_VERSION}.`)
  }
  requireTimestamp(value.exportedAt, 'exportedAt')

  const manifest = value.committedManifest
  if (manifest !== null) {
    if (!isRecord(manifest)) fail('committedManifest must be an object or null.')
    if (manifest.schemaVersion !== 1 || manifest.manifestType !== 'assessment_system_manifest') {
      fail('committedManifest must be an Assessment System Manifest with schemaVersion 1.')
    }
    if (manifest.sourcePolicy !== 'committed_versions_only') {
      fail('committedManifest must use committed_versions_only source policy.')
    }
  }

  requireRecord(value.project, 'project')
  requireRecordArray(value.decisionEvents, 'decisionEvents')
  requireRecordArray(value.studioConversations, 'studioConversations')
  requireRecordArray(value.otherSystems, 'otherSystems', 1_000)
  requireRecord(value.authority, 'authority')
  for (const field of ['committedManifest', 'committedArtifacts', 'draftsAndConversations']) {
    if (typeof value.authority[field] !== 'string' || value.authority[field].length === 0) {
      fail(`authority.${field} must be a nonempty string.`)
    }
  }
  requireRecord(value.dataBoundary, 'dataBoundary')
  if (value.dataBoundary.containsAthleteRows !== false) {
    fail('dataBoundary.containsAthleteRows must be false.')
  }
  if (
    value.dataBoundary.freeTextMayContainSensitiveContent !== undefined &&
    value.dataBoundary.freeTextMayContainSensitiveContent !== true
  ) {
    fail('dataBoundary.freeTextMayContainSensitiveContent must be true when present.')
  }
  if (typeof value.dataBoundary.description !== 'string' || value.dataBoundary.description.length === 0) {
    fail('dataBoundary.description must be a nonempty string.')
  }
  if (value.manifestSummary !== null) requireRecord(value.manifestSummary, 'manifestSummary')
  requireRecord(value.coverage, 'coverage')
  if (typeof value.codingAgentPrompt !== 'string' || value.codingAgentPrompt.length === 0) {
    fail('codingAgentPrompt must be a nonempty string.')
  }
  if (!new Set([
    'committed_manifest',
    'cohort_system',
    'requested_project',
    'current_coach_manifest',
    'instructor_fallback',
    'draft_cohort_system',
    'primary',
    'most_recent',
  ]).has(value.selectionReason)) {
    fail('selectionReason is not supported by schemaVersion 1.')
  }
  if (value.agentIndexMarkdown !== undefined && typeof value.agentIndexMarkdown !== 'string') {
    fail('agentIndexMarkdown must be a string when present.')
  }

  const artifacts = value.workspaceArtifacts
  if (!Array.isArray(artifacts) || artifacts.length > MAX_ARTIFACTS) {
    fail(`workspaceArtifacts must be an array of at most ${MAX_ARTIFACTS} artifacts.`)
  }

  const identities = new Set()
  artifacts.forEach((artifact, index) => {
    const field = `workspaceArtifacts[${index}]`
    if (!isRecord(artifact)) fail(`${field} must be an object.`)
    if (typeof artifact.workspace !== 'string' || !SAFE_WORKSPACE_KEY.test(artifact.workspace)) {
      fail(`${field}.workspace must be a safe lowercase workspace key.`)
    }
    requireUuid(artifact.artifactId, `${field}.artifactId`)
    requirePositiveInteger(artifact.version, `${field}.version`)
    if (!ARTIFACT_STATUSES.has(artifact.status)) {
      fail(`${field}.status must be draft, committed, or superseded.`)
    }
    if (artifact.status === 'draft') {
      if (artifact.committedAt !== null) fail(`${field}.committedAt must be null for a draft.`)
    } else {
      requireTimestamp(artifact.committedAt, `${field}.committedAt`)
    }
    if (!Object.hasOwn(artifact, 'payload')) fail(`${field}.payload is required.`)

    const identity = `${artifact.artifactId}:${artifact.version}`
    if (identities.has(identity)) fail(`${field} duplicates another artifact version.`)
    identities.add(identity)
  })

  return value
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate)
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative)
}

async function existingLstat(filePath) {
  try {
    return await lstat(filePath)
  } catch (error) {
    if (error && error.code === 'ENOENT') return null
    throw error
  }
}

async function assertSafeDestination(repoRoot, localRoot, contextRoot) {
  const resolvedRepo = path.resolve(repoRoot)
  if (!isInside(resolvedRepo, localRoot) || !isInside(resolvedRepo, contextRoot)) {
    fail('the local context destination escaped the repository.')
  }

  for (const candidate of [resolvedRepo, localRoot, contextRoot]) {
    const details = await existingLstat(candidate)
    if (details?.isSymbolicLink()) fail('the local context destination cannot contain symbolic links.')
    if (candidate !== contextRoot && details && !details.isDirectory()) {
      fail('the local context parent must be a directory.')
    }
    if (candidate === contextRoot && details && !details.isDirectory()) {
      fail('the existing local context must be a directory.')
    }
  }
}

function jsonDocument(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

function markdownText(value) {
  const printable = [...String(value)]
    .map((character) => {
      const code = character.charCodeAt(0)
      return code < 32 || code === 127 ? ' ' : character
    })
    .join('')
  return printable.replace(/([\\`*_[\]<>])/g, '\\$1').slice(0, 100)
}

function buildIndex(pkg) {
  const artifactRows = pkg.workspaceArtifacts.map((artifact, index) => {
    const number = String(index + 1).padStart(3, '0')
    return `- [${markdownText(artifact.workspace)} v${artifact.version} (${artifact.status})](artifacts/${number}.json)`
  })
  const manifestLine = pkg.committedManifest
    ? '[assessment-system-manifest.json](assessment-system-manifest.json)'
    : 'None was current at export. Do not invent or infer one.'
  const artifactList = artifactRows.length > 0 ? artifactRows.join('\n') : '- No saved artifact versions were exported.'

  return `# Coach Studio context

This private, local directory contains the coach-authored decisions exported from Assessment System Studio. It is ignored by Git.

## Coding agent rules

1. Read the original package, authority guidance, data boundary, project metadata, manifest summary, coverage, exported coding-agent prompt, every workspace artifact, every decision event, every Studio conversation, and the committed manifest when one exists.
2. Treat a current committed manifest and artifacts marked committed as committed authority. Superseded artifacts are historical authority, not the current specification.
3. Treat drafts, decision events, conversations, other-system inventory, and open questions as saved context that may be unresolved. They inform the build but do not override committed authority by themselves. For each parallel system, only a manifest labeled current_committed_manifest is current authority for that system. Never apply another system's rules unless the coach explicitly chooses it.
4. Never manufacture a committed manifest from draft-only context. Do not silently repair, reinterpret, average, or replace a coaching decision. Surface conflicts and missing implementation detail to the coach.
5. Follow the exported authority guidance when sources disagree, while preserving every source. Review coach-entered free text before sharing it with any external service. Keep athlete identities, athlete rows, credentials, and private exports out of Git.

## Authority

- Current committed manifest: ${manifestLine}
- Authority guidance: [authority-guidance.json](authority-guidance.json)
- Data boundary: [data-boundary.json](data-boundary.json)

## Package

- Handoff schema: ${pkg.schemaVersion}
- Exported at: ${markdownText(pkg.exportedAt)}
- Selection reason: ${markdownText(pkg.selectionReason)}
- Original package: [studio-handoff.original.json](studio-handoff.original.json)
- Handoff metadata: [handoff-metadata.json](handoff-metadata.json)
- Project metadata: [project-metadata.json](project-metadata.json)
- Manifest summary: [manifest-summary.json](manifest-summary.json)
- Export coverage: [coverage.json](coverage.json)
- Other-system inventory: [other-system-inventory.json](other-system-inventory.json)
- Decision events: [decision-events.json](decision-events.json)
- Studio conversations: [studio-conversations.json](studio-conversations.json)
- Exported coding-agent prompt: [coding-agent-prompt.md](coding-agent-prompt.md)
- Exported agent index: ${pkg.agentIndexMarkdown === undefined ? 'Not included in this package.' : '[exported-agent-index.md](exported-agent-index.md)'}
- Workspace artifacts: ${pkg.workspaceArtifacts.length}

## Workspace artifacts

${artifactList}
`
}

export async function importStudioHandoff({ inputPath, repoRoot }) {
  const resolvedInput = path.resolve(inputPath)
  const resolvedRepo = path.resolve(repoRoot)
  const inputDetails = await lstat(resolvedInput).catch((error) => {
    if (error && error.code === 'ENOENT') fail('the input file does not exist.')
    throw error
  })
  if (!inputDetails.isFile() || inputDetails.isSymbolicLink()) {
    fail('the input must be a regular JSON file, not a directory or symbolic link.')
  }
  if (path.extname(resolvedInput).toLowerCase() !== '.json') fail('the input file must end in .json.')
  if ((await stat(resolvedInput)).size > MAX_PACKAGE_BYTES) {
    fail(`the input file exceeds ${MAX_PACKAGE_BYTES / 1024 / 1024} MB.`)
  }

  const original = await readFile(resolvedInput, 'utf8')
  let parsed
  try {
    parsed = JSON.parse(original)
  } catch {
    fail('the input file is not valid JSON.')
  }
  const pkg = validateStudioHandoffPackage(parsed)

  const localRoot = path.join(resolvedRepo, '.arkitect')
  const contextRoot = path.join(resolvedRepo, STUDIO_CONTEXT_DIRECTORY)
  await assertSafeDestination(resolvedRepo, localRoot, contextRoot)
  await mkdir(localRoot, { recursive: true, mode: 0o700 })

  const temporaryRoot = path.join(localRoot, `.studio-context-${process.pid}-${randomUUID()}`)
  const previousRoot = path.join(localRoot, `.studio-context-previous-${process.pid}-${randomUUID()}`)
  await mkdir(path.join(temporaryRoot, 'artifacts'), { recursive: true, mode: 0o700 })

  try {
    await writeFile(path.join(temporaryRoot, 'studio-handoff.original.json'), original, { mode: 0o600 })
    if (pkg.committedManifest) {
      await writeFile(
        path.join(temporaryRoot, 'assessment-system-manifest.json'),
        jsonDocument(pkg.committedManifest),
        { mode: 0o600 },
      )
    }
    await Promise.all([
      ['handoff-metadata.json', {
        exportedAt: pkg.exportedAt,
        packageType: pkg.packageType,
        schemaVersion: pkg.schemaVersion,
        selectionReason: pkg.selectionReason,
      }],
      ['project-metadata.json', pkg.project],
      ['manifest-summary.json', pkg.manifestSummary],
      ['coverage.json', pkg.coverage],
      ['other-system-inventory.json', pkg.otherSystems],
      ['authority-guidance.json', pkg.authority],
      ['data-boundary.json', pkg.dataBoundary],
      ['decision-events.json', pkg.decisionEvents],
      ['studio-conversations.json', pkg.studioConversations],
    ].map(([file, value]) => writeFile(path.join(temporaryRoot, file), jsonDocument(value), { mode: 0o600 })))
    await writeFile(path.join(temporaryRoot, 'coding-agent-prompt.md'), pkg.codingAgentPrompt, { mode: 0o600 })
    if (pkg.agentIndexMarkdown !== undefined) {
      await writeFile(path.join(temporaryRoot, 'exported-agent-index.md'), pkg.agentIndexMarkdown, { mode: 0o600 })
    }
    await Promise.all(pkg.workspaceArtifacts.map((artifact, index) =>
      writeFile(
        path.join(temporaryRoot, 'artifacts', `${String(index + 1).padStart(3, '0')}.json`),
        jsonDocument(artifact),
        { mode: 0o600 },
      ),
    ))
    await writeFile(path.join(temporaryRoot, 'INDEX.md'), buildIndex(pkg), { mode: 0o600 })

    const existing = await existingLstat(contextRoot)
    if (existing) await rename(contextRoot, previousRoot)
    try {
      await rename(temporaryRoot, contextRoot)
    } catch (error) {
      if (existing) await rename(previousRoot, contextRoot)
      throw error
    }
    if (existing) await rm(previousRoot, { recursive: true, force: true })
  } catch (error) {
    await rm(temporaryRoot, { recursive: true, force: true })
    throw error
  }

  return {
    artifactCount: pkg.workspaceArtifacts.length,
    contextRoot,
    manifestPath: pkg.committedManifest ? path.join(contextRoot, 'assessment-system-manifest.json') : null,
  }
}
