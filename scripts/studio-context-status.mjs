#!/usr/bin/env node

import { lstat, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { STUDIO_CONTEXT_DIRECTORY, summarizeStudioHandoffPackage } from './studio-handoff.mjs'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDirectory, '..')
const maximumPackageBytes = 25 * 1024 * 1024
const argumentsList = process.argv.slice(2)
const json = argumentsList.includes('--json')
const positional = argumentsList.filter((argument) => argument !== '--json')

if (positional.length > 1 || positional.includes('--help') || positional.includes('-h')) {
  console.log('Usage: npm run studio:status -- [path/to/handoff.json] [--json]')
  process.exit(positional.includes('--help') || positional.includes('-h') ? 0 : 1)
}

const packagePath = positional[0]
  ? path.resolve(process.cwd(), positional[0])
  : path.join(repoRoot, STUDIO_CONTEXT_DIRECTORY, 'studio-handoff.original.json')

try {
  const details = await lstat(packagePath)
  if (!details.isFile() || details.isSymbolicLink()) {
    throw new Error('The Studio handoff must be a regular JSON file.')
  }
  if (details.size > maximumPackageBytes) {
    throw new Error('The Studio handoff exceeds 25 MB.')
  }

  const parsed = JSON.parse(await readFile(packagePath, 'utf8'))
  const summary = summarizeStudioHandoffPackage(parsed)

  if (json) {
    console.log(JSON.stringify(summary, null, 2))
    process.exit(0)
  }

  const list = (items) => items.length > 0 ? items.join(', ') : 'None'
  console.log(`Studio readiness: ${summary.readiness.toUpperCase()}`)
  console.log(`Current committed manifest: ${summary.currentManifest ? 'Yes' : 'No'}`)
  console.log(`Current committed workspace versions: ${list(summary.committedWorkspaces)}`)
  console.log(`Draft workspace versions: ${list(summary.draftWorkspaces)}`)
  console.log(`Unchanged draft payloads: ${list(summary.unchangedDrafts)}`)
  console.log(`Orientation artifact files: ${list(summary.orientationArtifactFiles)}`)
  console.log(`Superseded workspace versions: ${list(summary.supersededWorkspaces)}`)
  console.log(`Decision events: ${summary.decisionEventCount}`)
  console.log(`Studio conversations: ${summary.studioConversationCount}`)
  console.log(`Isolated parallel systems: ${summary.otherSystemCount}`)

  if (summary.readiness === 'ready') {
    console.log('Next step: The coding agent may propose one bounded change from the current committed manifest, then wait for coach approval before editing.')
  } else if (summary.readiness === 'partial') {
    console.log('Next step: The coding agent may use committed workspace decisions for compatible plumbing. It must ask the coach before replacing cross-workspace scoring, reporting, or workflow behavior.')
  } else {
    console.log('Next step: Keep the generic starter behavior. The coding agent must ask the coach which draft decisions to approve before tailoring domain behavior.')
  }
} catch (error) {
  console.error(error instanceof Error ? `Studio status failed: ${error.message}` : 'Studio status failed.')
  process.exit(1)
}
