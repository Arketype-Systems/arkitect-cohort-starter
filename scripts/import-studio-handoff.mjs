#!/usr/bin/env node

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { importStudioHandoff } from './studio-handoff.mjs'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDirectory, '..')
const [input, ...extra] = process.argv.slice(2)

if (!input || extra.length > 0 || input === '--help' || input === '-h') {
  console.log('Usage: npm run studio:import -- /path/to/arkitect-studio-handoff.json')
  process.exit(input === '--help' || input === '-h' ? 0 : 1)
}

try {
  const result = await importStudioHandoff({ inputPath: path.resolve(process.cwd(), input), repoRoot })
  console.log(`Imported ${result.artifactCount} committed Studio artifacts.`)
  console.log(`Local context: ${path.relative(repoRoot, result.contextRoot)}/INDEX.md`)
  console.log('This directory is ignored by Git. Ask your coding agent to read it before making changes.')
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Studio handoff import failed.')
  process.exit(1)
}
