// @vitest-environment node

import { access, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildStudioArtifactCatalog, importStudioHandoff, summarizeStudioHandoffPackage, validateStudioHandoffPackage } from './studio-handoff.mjs'

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
    project: {
      id: '10000000-0000-4000-8000-000000000010',
      name: 'Synthetic Assessment System',
      current_workspace: 'insight',
    },
    committedManifest: {
      schemaVersion: 1,
      manifestType: 'assessment_system_manifest',
      sourcePolicy: 'committed_versions_only',
      project: { name: 'Synthetic Assessment System' },
      metrics: [{ id: 'metric-one', direction: 'higher' }],
      openQuestions: [{ workspace: 'intake', items: ['Synthetic unresolved decision'] }],
    },
    workspaceArtifacts: [
      { workspace: 'intake', artifactId: artifactIds.intake, version: 1, status: 'superseded', committedAt: '2026-08-08T10:00:00.000Z', payload: { qualities: [{ name: 'Synthetic prior quality' }] } },
      { workspace: 'intake', artifactId: artifactIds.intake, version: 2, status: 'committed', committedAt: '2026-08-08T11:00:00.000Z', payload: { qualities: [{ name: 'Synthetic quality' }] } },
      { workspace: 'scoring_rubric', artifactId: artifactIds.scoring, version: 3, status: 'committed', committedAt: '2026-08-08T11:10:00.000Z', payload: { scoringDirection: 'higher' } },
      { workspace: 'insight', artifactId: artifactIds.insight, version: 4, status: 'committed', committedAt: '2026-08-08T11:20:00.000Z', payload: { reportIntent: 'Synthetic coach view' } },
    ],
    decisionEvents: [{ eventType: 'synthetic_decision_saved', payload: { exact: true } }],
    studioConversations: [{ workspace: 'intake', messages: [{ role: 'coach', content: 'Synthetic context only.' }] }],
    otherSystems: [{ name: 'Synthetic secondary system', status: 'active' }],
    authority: { committedManifest: 'Current manifest is authoritative.', committedArtifacts: 'Preserve history.', draftsAndConversations: 'Unresolved context.' },
    dataBoundary: { containsAthleteRows: false, description: 'Synthetic system design only.', localImportOnly: true },
    manifestSummary: { version: 1, isCurrent: true },
    coverage: { artifactVersions: 4, decisionEvents: 1, studioConversations: 1 },
    selectionReason: 'committed_manifest',
    codingAgentPrompt: 'Read all synthetic context before changing behavior.',
    agentIndexMarkdown: '# Exported synthetic index',
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
  it('classifies ready, partial, and foundation packages without exposing payload values', () => {
    const ready = summarizeStudioHandoffPackage(syntheticPackage())
    expect(ready).toMatchObject({
      readiness: 'ready',
      currentManifest: true,
      committedWorkspaces: ['intake v2', 'scoring_rubric v3', 'insight v4'],
      draftWorkspaces: [],
      supersededWorkspaces: ['intake v1'],
      orientationArtifactFiles: ['artifacts/002.json', 'artifacts/003.json', 'artifacts/004.json'],
      otherSystemCount: 1,
    })

    const partialPackage = syntheticPackage()
    partialPackage.committedManifest = null
    const partial = summarizeStudioHandoffPackage(partialPackage)
    expect(partial).toMatchObject({ readiness: 'partial', currentManifest: false })

    const foundationPackage = syntheticPackage()
    foundationPackage.committedManifest = null
    foundationPackage.workspaceArtifacts = foundationPackage.workspaceArtifacts.map((artifact) => ({
      ...artifact,
      status: 'draft',
      committedAt: null,
    }))
    const foundation = summarizeStudioHandoffPackage(foundationPackage)
    expect(foundation).toMatchObject({
      readiness: 'foundation',
      currentManifest: false,
      committedWorkspaces: [],
      draftWorkspaces: ['intake v1', 'intake v2', 'scoring_rubric v3', 'insight v4'],
    })

    expect(JSON.stringify({ ready, partial, foundation })).not.toContain('Synthetic context only')
  })

  it('catalogs identical draft payloads without exposing artifact IDs or payload values', () => {
    const pkg = syntheticPackage()
    pkg.workspaceArtifacts.push({
      ...structuredClone(pkg.workspaceArtifacts[1]),
      version: 5,
      status: 'draft',
      committedAt: null,
    })
    const catalog = buildStudioArtifactCatalog(pkg)
    expect(catalog.at(-1)).toMatchObject({
      file: 'artifacts/005.json',
      workspace: 'intake',
      version: 5,
      status: 'draft',
      samePayloadAs: { file: 'artifacts/002.json', workspace: 'intake', version: 2, status: 'committed' },
      readDuringOrientation: false,
    })
    expect(JSON.stringify(catalog)).not.toContain(artifactIds.intake)
    expect(JSON.stringify(catalog)).not.toContain('Synthetic quality')
  })

  it('imports a valid package and preserves every artifact payload', async () => {
    const fixture = await fixtureFile()
    const result = await importStudioHandoff(fixture)

    expect(result.artifactCount).toBe(4)
    expect(await readFile(path.join(result.contextRoot, 'studio-handoff.original.json'), 'utf8')).toBe(fixture.original)
    const artifact = JSON.parse(await readFile(path.join(result.contextRoot, 'artifacts', '002.json'), 'utf8'))
    expect(artifact).toEqual(syntheticPackage().workspaceArtifacts[1])
    const index = await readFile(path.join(result.contextRoot, 'INDEX.md'), 'utf8')
    expect(index).toContain('intake v2 (committed)')
    expect(index).toContain('scoring\\_rubric v3 (committed)')
    expect(index).toContain('drafts, decision events, conversations')
    expect(index).toContain('Readiness: **READY**')
    expect(index).toContain('archival byte copy')
    expect(result.summary).toMatchObject({ readiness: 'ready', currentManifest: true })
    expect(JSON.parse(await readFile(path.join(result.contextRoot, 'artifact-catalog.json'), 'utf8'))).toHaveLength(4)
  })

  it('rejects malformed and unsupported packages', () => {
    expect(() => validateStudioHandoffPackage({ schemaVersion: 1 })).toThrow('packageType')
    expect(() => validateStudioHandoffPackage({ ...syntheticPackage(), schemaVersion: 2 })).toThrow('schemaVersion must be 1')
    expect(() => validateStudioHandoffPackage({ ...syntheticPackage(), decisionEvents: null })).toThrow('decisionEvents')
    const invalidStatus = syntheticPackage()
    invalidStatus.workspaceArtifacts[0].status = 'maybe'
    expect(() => validateStudioHandoffPackage(invalidStatus)).toThrow('status must be draft, committed, or superseded')
    const committedDraft = syntheticPackage()
    committedDraft.workspaceArtifacts[0] = { ...committedDraft.workspaceArtifacts[0], status: 'draft' }
    expect(() => validateStudioHandoffPackage(committedDraft)).toThrow('committedAt must be null for a draft')
    expect(() => validateStudioHandoffPackage({ ...syntheticPackage(), dataBoundary: { containsAthleteRows: true, description: 'Unsafe.' } })).toThrow('containsAthleteRows must be false')
  })

  it('accepts authority-safe selection labels without rejecting older packages', () => {
    for (const selectionReason of [
      'committed_manifest',
      'cohort_system',
      'requested_project',
      'current_coach_manifest',
      'instructor_fallback',
      'draft_cohort_system',
      'primary',
      'most_recent',
    ]) {
      expect(
        validateStudioHandoffPackage({
          ...syntheticPackage(),
          dataBoundary: {
            containsAthleteRows: false,
            description: 'Synthetic system design only.',
            freeTextMayContainSensitiveContent: true,
          },
          selectionReason,
        }).selectionReason,
      ).toBe(selectionReason)
    }
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

  it('imports draft-only work without inventing a committed manifest and preserves all context', async () => {
    const pkg = syntheticPackage()
    pkg.committedManifest = null
    pkg.workspaceArtifacts = [
      {
        workspace: 'intake',
        artifactId: artifactIds.intake,
        version: 5,
        status: 'draft',
        committedAt: null,
        payload: { exactDraft: { tests: ['Synthetic test'], unresolved: true } },
      },
    ]
    pkg.decisionEvents = [{ eventType: 'draft_changed', exactPayload: { field: 'synthetic' } }]
    pkg.studioConversations = [{ workspace: 'intake', exactTranscript: [{ role: 'coach', content: 'Keep this unresolved.' }] }]
    pkg.otherSystems = [{ exactInventory: { kind: 'synthetic_local_file', state: 'not_imported' } }]
    pkg.authority = {
      committedManifest: 'No current manifest exists.',
      committedArtifacts: 'Preserve committed history.',
      draftsAndConversations: 'Do not promote unresolved context.',
      exactPolicy: { currentAuthority: 'none' },
    }
    pkg.dataBoundary = { containsAthleteRows: false, description: 'Synthetic system design only.', exactPolicy: { export: 'system_design_only' } }
    pkg.manifestSummary = { isCurrent: false, changedSourceArtifacts: ['intake'] }
    pkg.coverage = { artifactVersions: 1, draftArtifactVersions: 1 }
    pkg.selectionReason = 'cohort_system'
    pkg.codingAgentPrompt = 'Preserve the exact synthetic draft without promoting it.'
    pkg.agentIndexMarkdown = '# Exact exported draft index'
    const fixture = await fixtureFile(pkg)
    const result = await importStudioHandoff(fixture)

    expect(result.manifestPath).toBeNull()
    await expect(access(path.join(result.contextRoot, 'assessment-system-manifest.json'))).rejects.toThrow()
    expect(JSON.parse(await readFile(path.join(result.contextRoot, 'artifacts', '001.json'), 'utf8'))).toEqual(pkg.workspaceArtifacts[0])
    expect(JSON.parse(await readFile(path.join(result.contextRoot, 'handoff-metadata.json'), 'utf8'))).toEqual({
      exportedAt: pkg.exportedAt,
      packageType: pkg.packageType,
      schemaVersion: pkg.schemaVersion,
      selectionReason: pkg.selectionReason,
    })
    expect(JSON.parse(await readFile(path.join(result.contextRoot, 'project-metadata.json'), 'utf8'))).toEqual(pkg.project)
    expect(JSON.parse(await readFile(path.join(result.contextRoot, 'manifest-summary.json'), 'utf8'))).toEqual(pkg.manifestSummary)
    expect(JSON.parse(await readFile(path.join(result.contextRoot, 'coverage.json'), 'utf8'))).toEqual(pkg.coverage)
    expect(JSON.parse(await readFile(path.join(result.contextRoot, 'decision-events.json'), 'utf8'))).toEqual(pkg.decisionEvents)
    expect(JSON.parse(await readFile(path.join(result.contextRoot, 'studio-conversations.json'), 'utf8'))).toEqual(pkg.studioConversations)
    expect(JSON.parse(await readFile(path.join(result.contextRoot, 'other-system-inventory.json'), 'utf8'))).toEqual(pkg.otherSystems)
    expect(JSON.parse(await readFile(path.join(result.contextRoot, 'authority-guidance.json'), 'utf8'))).toEqual(pkg.authority)
    expect(JSON.parse(await readFile(path.join(result.contextRoot, 'data-boundary.json'), 'utf8'))).toEqual(pkg.dataBoundary)
    expect(await readFile(path.join(result.contextRoot, 'coding-agent-prompt.md'), 'utf8')).toBe(pkg.codingAgentPrompt)
    expect(await readFile(path.join(result.contextRoot, 'exported-agent-index.md'), 'utf8')).toBe(pkg.agentIndexMarkdown)
    expect(await readFile(path.join(result.contextRoot, 'INDEX.md'), 'utf8')).toContain('None was current at export. Do not invent or infer one.')
    expect(await readFile(path.join(result.contextRoot, 'INDEX.md'), 'utf8')).toContain('Readiness: **FOUNDATION**')
    expect(result.summary).toMatchObject({ readiness: 'foundation', currentManifest: false })
  })
})
