import Dexie, { type EntityTable } from 'dexie'
import { SYNTHETIC_ARCHETYPES } from './archetypes'
import { resolveStandardsProfile, STARTER_STANDARDS, validateStandardsVersion } from './standards'
import { SYNTHETIC_ATHLETES, SYNTHETIC_MEASUREMENTS, SYNTHETIC_SESSIONS } from './seed'
import type { AppSetting, Athlete, AssessmentSession, ComparisonArchetype, ImportRecord, Measurement, StandardsVersion } from './types'

export class FieldhouseDatabase extends Dexie {
  athletes!: EntityTable<Athlete, 'id'>; sessions!: EntityTable<AssessmentSession, 'id'>; measurements!: EntityTable<Measurement, 'id'>; standards!: EntityTable<StandardsVersion, 'id'>; archetypes!: EntityTable<ComparisonArchetype, 'id'>; imports!: EntityTable<ImportRecord, 'id'>; settings!: EntityTable<AppSetting, 'key'>
  constructor(name = 'fieldhouse-assessment') {
    super(name)
    this.version(1).stores({ athletes: 'id, lastName, sport, group, &[firstName+lastName]', sessions: 'id, date, status, *athleteIds', measurements: 'id, sessionId, athleteId, metricId, [sessionId+athleteId+metricId]', standards: 'id, version', imports: 'id, importedAt', settings: 'key' })
    this.version(2).stores({ athletes: 'id, lastName, sport, group, sex, grade, &[firstName+lastName]', sessions: 'id, date, status, *athleteIds', measurements: 'id, sessionId, athleteId, metricId, [sessionId+athleteId+metricId]', standards: 'id, version', imports: 'id, importedAt', settings: 'key' }).upgrade(async (transaction) => {
      await transaction.table('athletes').toCollection().modify((athlete: Partial<Athlete>) => {
        athlete.sex ??= 'unspecified'; athlete.dateOfBirth ??= ''; athlete.grade ??= ''; athlete.sports = athlete.sports?.length ? athlete.sports : athlete.sport ? [athlete.sport] : []; athlete.positions = athlete.positions?.length ? athlete.positions : athlete.position ? [athlete.position] : []
      })
      await transaction.table('standards').toCollection().modify((version: Partial<StandardsVersion>) => {
        for (const metric of version.metrics ?? []) {
          const ordered = [...metric.bands].sort((a, b) => (a.min ?? Number.NEGATIVE_INFINITY) - (b.min ?? Number.NEGATIVE_INFINITY))
          ordered.forEach((band, index) => { band.points = metric.direction === 'higher' ? index : 4 - index })
        }
        if (!version.profiles?.length && version.metrics?.length) version.profiles = [{ id: 'profile-general', name: 'General migrated profile', priority: 0, audience: { sexes: [], grades: [], sports: [], positions: [] }, bandsByMetric: Object.fromEntries(version.metrics.map((metric) => [metric.id, structuredClone(metric.bands)])) }]
      })
      await transaction.table('standards').put(structuredClone(STARTER_STANDARDS))
      const athletes = await transaction.table('athletes').toArray() as Athlete[]; const standards = await transaction.table('standards').toArray() as StandardsVersion[]
      await transaction.table('sessions').toCollection().modify((session: AssessmentSession) => { if (session.profileIdsByAthlete) return; const version = standards.find((item) => item.id === session.standardsVersionId); if (!version) return; session.profileIdsByAthlete = Object.fromEntries(session.athleteIds.flatMap((id) => { const athlete = athletes.find((item) => item.id === id); return athlete ? [[id, resolveStandardsProfile(version, athlete, session.date).id]] : [] })) })
    })
    this.version(3).stores({ athletes: 'id, lastName, sport, group, sex, grade, &[firstName+lastName]', sessions: 'id, date, status, *athleteIds', measurements: 'id, sessionId, athleteId, metricId, [sessionId+athleteId+metricId]', standards: 'id, version', archetypes: 'id, name, active, priority, *sexes, *sports', imports: 'id, importedAt', settings: 'key' }).upgrade(async (transaction) => { await transaction.table('archetypes').bulkPut(structuredClone(SYNTHETIC_ARCHETYPES)) })
  }
}

export const db = new FieldhouseDatabase()

export async function ensureSeeded(database = db) {
  if (await database.settings.get('initialized')) return
  await database.transaction('rw', [database.athletes, database.sessions, database.measurements, database.standards, database.archetypes, database.settings], async () => {
    await database.standards.put(STARTER_STANDARDS)
    await database.athletes.bulkPut(SYNTHETIC_ATHLETES)
    await database.sessions.bulkPut(SYNTHETIC_SESSIONS)
    await database.measurements.bulkPut(SYNTHETIC_MEASUREMENTS)
    await database.archetypes.bulkPut(SYNTHETIC_ARCHETYPES)
    await database.settings.put({ key: 'initialized', value: new Date().toISOString() })
  })
}

export async function resetDemo(database = db) {
  await database.transaction('rw', [database.athletes, database.sessions, database.measurements, database.standards, database.archetypes, database.imports, database.settings], async () => {
    await Promise.all([database.athletes.clear(), database.sessions.clear(), database.measurements.clear(), database.standards.clear(), database.archetypes.clear(), database.imports.clear(), database.settings.clear()])
  })
  await ensureSeeded(database)
}

type BackupPayload = { formatVersion: 3; athletes: Athlete[]; sessions: AssessmentSession[]; measurements: Measurement[]; standards: StandardsVersion[]; archetypes: ComparisonArchetype[]; imports?: ImportRecord[] }

function normalizeAthlete(athlete: Athlete): Athlete {
  return { ...athlete, sex: athlete.sex ?? 'unspecified', dateOfBirth: athlete.dateOfBirth ?? '', grade: athlete.grade ?? '', sports: athlete.sports?.length ? athlete.sports : athlete.sport ? [athlete.sport] : [], positions: athlete.positions?.length ? athlete.positions : athlete.position ? [athlete.position] : [] }
}

function normalizeStandard(version: StandardsVersion): StandardsVersion {
  const normalized = structuredClone(version)
  if (!normalized.profiles?.length) {
    for (const metric of normalized.metrics) {
      const ordered = [...metric.bands].sort((a, b) => (a.min ?? Number.NEGATIVE_INFINITY) - (b.min ?? Number.NEGATIVE_INFINITY))
      ordered.forEach((band, index) => { band.points = metric.direction === 'higher' ? index : 4 - index })
    }
    normalized.profiles = [{ id: 'profile-general', name: 'General migrated profile', priority: 0, audience: { sexes: [], grades: [], sports: [], positions: [] }, bandsByMetric: Object.fromEntries(normalized.metrics.map((metric) => [metric.id, structuredClone(metric.bands)])) }]
  }
  return normalized
}

function uniqueIds(records: Array<{ id: string }>, label: string) {
  const ids = records.map((record) => record.id)
  if (ids.some((id) => typeof id !== 'string' || !id)) throw new Error(`Backup validation failed: every ${label} needs an ID.`)
  if (new Set(ids).size !== ids.length) throw new Error(`Backup validation failed: duplicate ${label} IDs.`)
  return new Set(ids)
}

function validateArchetype(value: unknown) {
  if (!value || typeof value !== 'object') return true
  const record = value as ComparisonArchetype
  const arrays = [record.sexes, record.sports, record.positions, record.grades, record.levels]
  return typeof record.name !== 'string' || !record.name.trim() || typeof record.active !== 'boolean' || !Number.isFinite(record.priority) || !arrays.every(Array.isArray) || Array.isArray(record.sexes) && record.sexes.some((sex) => !['female', 'male', 'unspecified'].includes(sex)) || record.ageMin !== undefined && !Number.isFinite(record.ageMin) || record.ageMax !== undefined && !Number.isFinite(record.ageMax) || record.ageMin !== undefined && record.ageMax !== undefined && record.ageMin > record.ageMax
}

export function validateBackup(payload: unknown): BackupPayload {
  if (!payload || typeof payload !== 'object') throw new Error('Backup validation failed: expected a JSON object.')
  const candidate = payload as Omit<Partial<BackupPayload>, 'formatVersion'> & { formatVersion?: number }
  if (candidate.formatVersion !== 1 && candidate.formatVersion !== 2 && candidate.formatVersion !== 3) throw new Error('Backup validation failed: unsupported format version.')
  if (![candidate.athletes, candidate.sessions, candidate.measurements, candidate.standards].every(Array.isArray)) throw new Error('Backup validation failed: required record arrays are missing.')
  const athletes = candidate.athletes!.map(normalizeAthlete); const measurements = candidate.measurements!; const standards = candidate.standards!.map(normalizeStandard); const archetypes = Array.isArray(candidate.archetypes) ? candidate.archetypes : structuredClone(SYNTHETIC_ARCHETYPES); const imports = Array.isArray(candidate.imports) ? candidate.imports : []
  const sessions = candidate.sessions!.map((session) => {
    if (session.profileIdsByAthlete) return session
    const version = standards.find((item) => item.id === session.standardsVersionId)
    if (!version) return session
    return { ...session, profileIdsByAthlete: Object.fromEntries(session.athleteIds.flatMap((id) => { const athlete = athletes.find((item) => item.id === id); return athlete ? [[id, resolveStandardsProfile(version, athlete, session.date).id]] : [] })) }
  })
  const athleteIds = uniqueIds(athletes, 'athlete'); const sessionIds = uniqueIds(sessions, 'session'); uniqueIds(measurements, 'measurement'); const standardIds = uniqueIds(standards, 'standard'); if (imports.length) uniqueIds(imports, 'import record')
  if (sessions.some((session) => { const version = standards.find((item) => item.id === session.standardsVersionId); const versionMetricIds = new Set(version?.metrics.map((metric) => metric.id) ?? []); const versionProfileIds = new Set(version?.profiles.map((profile) => profile.id) ?? []); const pinned = Object.entries(session.profileIdsByAthlete ?? {}); return !standardIds.has(session.standardsVersionId) || !Array.isArray(session.athleteIds) || session.athleteIds.some((id) => !athleteIds.has(id)) || !Array.isArray(session.metricIds) || session.metricIds.some((id) => !versionMetricIds.has(id)) || pinned.some(([athleteId, profileId]) => !session.athleteIds.includes(athleteId) || !versionProfileIds.has(profileId)) })) throw new Error('Backup validation failed: a session references a missing athlete, metric, standards version, or pinned profile.')
  const measurementKeys = measurements.map((measurement) => `${measurement.sessionId}::${measurement.athleteId}::${measurement.metricId}`)
  if (new Set(measurementKeys).size !== measurementKeys.length) throw new Error('Backup validation failed: duplicate session, athlete, and metric measurement mapping.')
  if (measurements.some((measurement) => { const session = sessions.find((item) => item.id === measurement.sessionId); return !sessionIds.has(measurement.sessionId) || !athleteIds.has(measurement.athleteId) || !Array.isArray(measurement.attempts) || !session?.athleteIds.includes(measurement.athleteId) || !session.metricIds.includes(measurement.metricId) })) throw new Error('Backup validation failed: a measurement references a missing or unrelated session, athlete, metric, or attempts list.')
  for (const version of standards) { const errors = validateStandardsVersion(version); if (errors.length) throw new Error(`Backup validation failed: ${errors.join(' ')}`) }
  uniqueIds(archetypes, 'archetype')
  if (archetypes.some(validateArchetype)) throw new Error('Backup validation failed: an archetype has invalid comparison rules.')
  return { formatVersion: 3, athletes, sessions, measurements, standards, archetypes, imports }
}

export async function restoreBackup(payload: unknown, database = db) {
  const backup = validateBackup(payload)
  await database.transaction('rw', [database.athletes, database.sessions, database.measurements, database.standards, database.archetypes, database.imports, database.settings], async () => {
    await Promise.all([database.athletes.clear(), database.sessions.clear(), database.measurements.clear(), database.standards.clear(), database.archetypes.clear(), database.imports.clear(), database.settings.clear()])
    await database.athletes.bulkPut(backup.athletes); await database.sessions.bulkPut(backup.sessions); await database.measurements.bulkPut(backup.measurements); await database.standards.bulkPut(backup.standards); await database.archetypes.bulkPut(backup.archetypes); await database.imports.bulkPut(backup.imports ?? []); await database.settings.put({ key: 'initialized', value: new Date().toISOString() })
  })
  return { athletes: backup.athletes.length, sessions: backup.sessions.length, measurements: backup.measurements.length, standards: backup.standards.length, archetypes: backup.archetypes.length }
}
