import Dexie, { type EntityTable } from 'dexie'
import { STARTER_STANDARDS } from './standards'
import { validateStandardsVersion } from './standards'
import { SYNTHETIC_ATHLETES, SYNTHETIC_MEASUREMENTS, SYNTHETIC_SESSIONS } from './seed'
import type { AppSetting, Athlete, AssessmentSession, ImportRecord, Measurement, StandardsVersion } from './types'

export class FieldhouseDatabase extends Dexie {
  athletes!: EntityTable<Athlete, 'id'>; sessions!: EntityTable<AssessmentSession, 'id'>; measurements!: EntityTable<Measurement, 'id'>; standards!: EntityTable<StandardsVersion, 'id'>; imports!: EntityTable<ImportRecord, 'id'>; settings!: EntityTable<AppSetting, 'key'>
  constructor(name = 'fieldhouse-assessment') {
    super(name)
    this.version(1).stores({ athletes: 'id, lastName, sport, group, &[firstName+lastName]', sessions: 'id, date, status, *athleteIds', measurements: 'id, sessionId, athleteId, metricId, [sessionId+athleteId+metricId]', standards: 'id, version', imports: 'id, importedAt', settings: 'key' })
  }
}

export const db = new FieldhouseDatabase()

export async function ensureSeeded(database = db) {
  if (await database.settings.get('initialized')) return
  await database.transaction('rw', database.athletes, database.sessions, database.measurements, database.standards, database.settings, async () => {
    await database.standards.put(STARTER_STANDARDS)
    await database.athletes.bulkPut(SYNTHETIC_ATHLETES)
    await database.sessions.bulkPut(SYNTHETIC_SESSIONS)
    await database.measurements.bulkPut(SYNTHETIC_MEASUREMENTS)
    await database.settings.put({ key: 'initialized', value: new Date().toISOString() })
  })
}

export async function resetDemo(database = db) {
  await database.transaction('rw', [database.athletes, database.sessions, database.measurements, database.standards, database.imports, database.settings], async () => {
    await Promise.all([database.athletes.clear(), database.sessions.clear(), database.measurements.clear(), database.standards.clear(), database.imports.clear(), database.settings.clear()])
  })
  await ensureSeeded(database)
}

type BackupPayload = { formatVersion: 1; athletes: Athlete[]; sessions: AssessmentSession[]; measurements: Measurement[]; standards: StandardsVersion[]; imports?: ImportRecord[] }

function uniqueIds(records: Array<{ id: string }>, label: string) {
  const ids = records.map((record) => record.id)
  if (ids.some((id) => typeof id !== 'string' || !id)) throw new Error(`Backup validation failed: every ${label} needs an ID.`)
  if (new Set(ids).size !== ids.length) throw new Error(`Backup validation failed: duplicate ${label} IDs.`)
  return new Set(ids)
}

export function validateBackup(payload: unknown): BackupPayload {
  if (!payload || typeof payload !== 'object') throw new Error('Backup validation failed: expected a JSON object.')
  const candidate = payload as Partial<BackupPayload>
  if (candidate.formatVersion !== 1) throw new Error('Backup validation failed: unsupported format version.')
  if (![candidate.athletes, candidate.sessions, candidate.measurements, candidate.standards].every(Array.isArray)) throw new Error('Backup validation failed: required record arrays are missing.')
  const athletes = candidate.athletes!; const sessions = candidate.sessions!; const measurements = candidate.measurements!; const standards = candidate.standards!; const imports = Array.isArray(candidate.imports) ? candidate.imports : []
  const athleteIds = uniqueIds(athletes, 'athlete'); const sessionIds = uniqueIds(sessions, 'session'); uniqueIds(measurements, 'measurement'); const standardIds = uniqueIds(standards, 'standard'); if (imports.length) uniqueIds(imports, 'import record')
  if (sessions.some((session) => { const version = standards.find((item) => item.id === session.standardsVersionId); const versionMetricIds = new Set(version?.metrics.map((metric) => metric.id) ?? []); return !standardIds.has(session.standardsVersionId) || !Array.isArray(session.athleteIds) || session.athleteIds.some((id) => !athleteIds.has(id)) || !Array.isArray(session.metricIds) || session.metricIds.some((id) => !versionMetricIds.has(id)) })) throw new Error('Backup validation failed: a session references a missing athlete, metric, or standards version.')
  const measurementKeys = measurements.map((measurement) => `${measurement.sessionId}::${measurement.athleteId}::${measurement.metricId}`)
  if (new Set(measurementKeys).size !== measurementKeys.length) throw new Error('Backup validation failed: duplicate session, athlete, and metric measurement mapping.')
  if (measurements.some((measurement) => { const session = sessions.find((item) => item.id === measurement.sessionId); return !sessionIds.has(measurement.sessionId) || !athleteIds.has(measurement.athleteId) || !Array.isArray(measurement.attempts) || !session?.athleteIds.includes(measurement.athleteId) || !session.metricIds.includes(measurement.metricId) })) throw new Error('Backup validation failed: a measurement references a missing or unrelated session, athlete, metric, or attempts list.')
  for (const version of standards) { const errors = validateStandardsVersion(version); if (errors.length) throw new Error(`Backup validation failed: ${errors.join(' ')}`) }
  return { formatVersion: 1, athletes, sessions, measurements, standards, imports }
}

export async function restoreBackup(payload: unknown, database = db) {
  const backup = validateBackup(payload)
  await database.transaction('rw', [database.athletes, database.sessions, database.measurements, database.standards, database.imports, database.settings], async () => {
    await Promise.all([database.athletes.clear(), database.sessions.clear(), database.measurements.clear(), database.standards.clear(), database.imports.clear(), database.settings.clear()])
    await database.athletes.bulkPut(backup.athletes); await database.sessions.bulkPut(backup.sessions); await database.measurements.bulkPut(backup.measurements); await database.standards.bulkPut(backup.standards); await database.imports.bulkPut(backup.imports ?? []); await database.settings.put({ key: 'initialized', value: new Date().toISOString() })
  })
  return { athletes: backup.athletes.length, sessions: backup.sessions.length, measurements: backup.measurements.length, standards: backup.standards.length }
}
