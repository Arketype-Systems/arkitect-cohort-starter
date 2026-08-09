import Dexie, { type EntityTable } from 'dexie'
import { STARTER_STANDARDS } from './standards'
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
