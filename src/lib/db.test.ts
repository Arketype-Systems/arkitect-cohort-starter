import { afterEach, describe, expect, it } from 'vitest'
import { FieldhouseDatabase, ensureSeeded, restoreBackup, validateBackup } from './db'
import { SYNTHETIC_ATHLETES, SYNTHETIC_MEASUREMENTS, SYNTHETIC_SESSIONS } from './seed'
import { STARTER_STANDARDS } from './standards'
describe('IndexedDB persistence mapping', () => {
  const names: string[] = []; afterEach(async () => { await Promise.all(names.map((name) => indexedDB.deleteDatabase(name))) })
  it('reopens sessions and measurements with stable athlete IDs', async () => { const name = `test-${crypto.randomUUID()}`; names.push(name); const first = new FieldhouseDatabase(name); await ensureSeeded(first); const session = await first.sessions.get('session-complete'); first.close(); const reopened = new FieldhouseDatabase(name); const measurement = await reopened.measurements.where({ sessionId: 'session-complete', athleteId: 'ath-a' }).first(); expect(session?.athleteIds).toContain('ath-a'); expect(measurement?.athleteId).toBe('ath-a'); expect(measurement?.sessionId).toBe(session?.id); reopened.close() })
  it('validates every relationship before replacing the database', async () => { const payload = { formatVersion: 1 as const, athletes: SYNTHETIC_ATHLETES, sessions: SYNTHETIC_SESSIONS, measurements: SYNTHETIC_MEASUREMENTS, standards: [STARTER_STANDARDS] }; expect(validateBackup(payload).sessions).toHaveLength(2); const corrupt = structuredClone(payload); corrupt.measurements[0].athleteId = 'missing'; expect(() => validateBackup(corrupt)).toThrow('measurement references'); const name = `restore-${crypto.randomUUID()}`; names.push(name); const database = new FieldhouseDatabase(name); const summary = await restoreBackup(payload, database); expect(summary.athletes).toBe(6); expect(await database.measurements.count()).toBe(SYNTHETIC_MEASUREMENTS.length); database.close() })
  it('migrates version one backups into demographics, 0–4 grades, and pinned standards profiles', () => {
    const athletes = structuredClone(SYNTHETIC_ATHLETES) as unknown as Array<Record<string, unknown>>
    for (const athlete of athletes) { delete athlete.sex; delete athlete.dateOfBirth; delete athlete.grade; delete athlete.sports; delete athlete.positions }
    const standards = structuredClone([STARTER_STANDARDS]) as unknown as Array<Record<string, unknown>>
    delete standards[0].profiles
    const metrics = standards[0].metrics as Array<{ bands: Array<{ points: number }> }>
    metrics.forEach((metric) => metric.bands.forEach((band, index) => { band.points = (index + 1) * 20 }))
    const sessions = structuredClone(SYNTHETIC_SESSIONS) as unknown as Array<Record<string, unknown>>
    sessions.forEach((session) => delete session.profileIdsByAthlete)
    const migrated = validateBackup({ formatVersion: 1, athletes, sessions, measurements: SYNTHETIC_MEASUREMENTS, standards })
    expect(migrated.formatVersion).toBe(3)
    expect(migrated.archetypes.length).toBeGreaterThan(0)
    expect(migrated.athletes[0]).toMatchObject({ sex: 'unspecified', sports: ['Soccer'], positions: ['Midfielder'] })
    expect(migrated.standards[0].profiles[0].bandsByMetric['vertical-jump'].map((band) => band.points)).toEqual([0, 1, 2, 3, 4])
    expect(migrated.sessions[0].profileIdsByAthlete?.['ath-a']).toBe('profile-general')
  })
  it('rejects a session pinned to a profile outside its standards version', () => { const sessions = structuredClone(SYNTHETIC_SESSIONS); sessions[0].profileIdsByAthlete = { ...sessions[0].profileIdsByAthlete, 'ath-a': 'missing-profile' }; expect(() => validateBackup({ formatVersion: 2, athletes: SYNTHETIC_ATHLETES, sessions, measurements: SYNTHETIC_MEASUREMENTS, standards: [STARTER_STANDARDS] })).toThrow('pinned profile') })
  it('rejects corrupted comparison archetypes before replacing data', () => { const archetypes = [{ id: 'bad', name: '', active: true, priority: 10, ageMin: 19, ageMax: 15, sexes: ['invalid'], sports: [], positions: [], grades: [], levels: [], createdAt: new Date().toISOString() }]; expect(() => validateBackup({ formatVersion: 3, athletes: SYNTHETIC_ATHLETES, sessions: SYNTHETIC_SESSIONS, measurements: SYNTHETIC_MEASUREMENTS, standards: [STARTER_STANDARDS], archetypes })).toThrow('archetype has invalid comparison rules') })
})
