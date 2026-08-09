// @vitest-environment node

import { mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { importStudioHandoff, validateStudioHandoffPackage } from './studio-handoff.mjs'

const artifactIds = {
  intake: '10000000-0000-4000-8000-000000000001',
  scoring: '10000000-0000-4000-8000-000000000002',
  insight: '10000000-0000-4000-8000-000000000003',
}

function syntheticPackage() {
  return {
    packageType: 'arkitect_studio_handoff',
    schemaVersion: 1,
    exportedAt: '2026-08-08T12:00:00.000Z',
    committedManifest: {
      schemaVersion: 1,
      manifestType: 'assessment_system_manifest',
      sourcePolicy: 'committed_versions_only',
      project: { name: 'Synthetic Assessment System' },
      metrics: [{ id: 'metric-one', direction: 'higher' }],
      openQuestions: [{ workspace: 'intake', items: ['Synthetic unresolved decision'] }],
    },
    workspaceArtifacts: [
      { workspace: 'intake', artifactId: artifactIds.intake, version: 2, committedAt: '2026-08-08T11:00:00.000Z', payload: { qualities: [{ name: 'Synthetic quality' }] } },
      { workspace: 'scoring_rubric', artifactId: artifactIds.scoring, version: 3, committedAt: '2026-08-08T11:10:00.000Z', payload: { scoringDirection: 'higher' } },
      { workspace: 'insight', artifactId: artifactIds.insight, version: 4, committedAt: '2026-08-08T11:20:00.000Z', payload: { reportIntent: 'Synthetic coach view' } },
    ],
  }
}

async function fixtureFile(pkg = syntheticPackage()) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'studio-handoff-'))
  const inputPath = path.join(root, 'handoff.json')
  const original = `${JSON.stringify(pkg, null, 2)}\n`
  await writeFile(inputPath, original)
  return { inputPath, original, repoRoot: path.join(root, 'repo') }
}

describe('Studio handoff import', () => {
  it('imports a valid package and preserves every artifact payload', async () => {
    const fixture = await fixtureFile()
    const result = await importStudioHandoff(fixture)

    expect(result.artifactCount).toBe(3)
    expect(await readFile(path.join(result.contextRoot, 'studio-handoff.original.json'), 'utf8')).toBe(fixture.original)
    const artifact = JSON.parse(await readFile(path.join(result.contextRoot, 'artifacts', '002.json'), 'utf8'))
    expect(artifact.payload).toEqual(syntheticPackage().workspaceArtifacts[1].payload)
    expect(await readFile(path.join(result.contextRoot, 'INDEX.md'), 'utf8')).toContain('scoring\\_rubric v3')
  })

  it('rejects malformed and unsupported packages', () => {
    expect(() => validateStudioHandoffPackage({ schemaVersion: 1 })).toThrow('packageType')
    expect(() => validateStudioHandoffPackage({ ...syntheticPackage(), schemaVersion: 2 })).toThrow('schemaVersion must be 1')
    expect(() => validateStudioHandoffPackage({ ...syntheticPackage(), workspaceArtifacts: [] })).toThrow('workspaceArtifacts')
  })

  it('rejects path-shaped workspace keys and symbolic-link inputs', async () => {
    const unsafe = syntheticPackage()
    unsafe.workspaceArtifacts[0].workspace = '../../outside'
    expect(() => validateStudioHandoffPackage(unsafe)).toThrow('safe lowercase workspace key')

    const fixture = await fixtureFile()
    const linkedInput = path.join(path.dirname(fixture.inputPath), 'linked.json')
    await symlink(fixture.inputPath, linkedInput)
    await expect(importStudioHandoff({ ...fixture, inputPath: linkedInput })).rejects.toThrow('symbolic link')
  })

  it('preserves the committed manifest without interpreting its decisions', async () => {
    const pkg = syntheticPackage()
    pkg.committedManifest.futureContract = { nested: [null, true, 3.25, { exact: 'keep this' }] }
    const fixture = await fixtureFile(pkg)
    const result = await importStudioHandoff(fixture)
    const manifest = JSON.parse(await readFile(result.manifestPath, 'utf8'))

    expect(manifest).toEqual(pkg.committedManifest)
    expect(manifest.futureContract.nested[3].exact).toBe('keep this')
  })
})
