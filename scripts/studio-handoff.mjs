import { randomUUID } from 'node:crypto'
import { lstat, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const STUDIO_HANDOFF_PACKAGE_TYPE = 'arkitect_studio_handoff'
export const STUDIO_HANDOFF_SCHEMA_VERSION = 1
export const STUDIO_CONTEXT_DIRECTORY = path.join('.arkitect', 'studio-context')

const MAX_PACKAGE_BYTES = 25 * 1024 * 1024
const MAX_ARTIFACTS = 100
const SAFE_WORKSPACE_KEY = /^[a-z][a-z0-9_]{0,63}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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
  if (!isRecord(manifest)) fail('committedManifest must be an object.')
  if (manifest.schemaVersion !== 1 || manifest.manifestType !== 'assessment_system_manifest') {
    fail('committedManifest must be an Assessment System Manifest with schemaVersion 1.')
  }
  if (manifest.sourcePolicy !== 'committed_versions_only') {
    fail('committedManifest must use committed_versions_only source policy.')
  }

  const artifacts = value.workspaceArtifacts
  if (!Array.isArray(artifacts) || artifacts.length === 0 || artifacts.length > MAX_ARTIFACTS) {
    fail(`workspaceArtifacts must contain between 1 and ${MAX_ARTIFACTS} artifacts.`)
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
    requireTimestamp(artifact.committedAt, `${field}.committedAt`)
    if (!isRecord(artifact.payload)) fail(`${field}.payload must be an object.`)

    const identity = `${artifact.workspace}:${artifact.artifactId}:${artifact.version}`
    if (identities.has(identity)) fail(`${field} duplicates another committed artifact.`)
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
    return `- [${markdownText(artifact.workspace)} v${artifact.version}](artifacts/${number}.json)`
  })

  return `# Coach Studio context

This private, local directory contains the coach-authored decisions exported from Assessment System Studio. It is ignored by Git.

## Coding agent rules

1. Read the committed manifest and every workspace artifact before proposing product behavior.
2. Treat the files as authoritative coaching context. Preserve explicit decisions, limitations, unresolved questions, scoring direction, standards lineage, and report intent.
3. Do not silently repair, reinterpret, average, or replace a coaching decision. Surface conflicts and missing implementation detail to the coach.
4. Keep athlete identities, athlete rows, credentials, and private exports out of Git.

## Package

- Handoff schema: ${pkg.schemaVersion}
- Exported at: ${markdownText(pkg.exportedAt)}
- Original package: [studio-handoff.original.json](studio-handoff.original.json)
- Committed manifest: [assessment-system-manifest.json](assessment-system-manifest.json)
- Workspace artifacts: ${pkg.workspaceArtifacts.length}

## Workspace artifacts

${artifactRows.join('\n')}
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
    await writeFile(
      path.join(temporaryRoot, 'assessment-system-manifest.json'),
      jsonDocument(pkg.committedManifest),
      { mode: 0o600 },
    )
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
    manifestPath: path.join(contextRoot, 'assessment-system-manifest.json'),
  }
}
