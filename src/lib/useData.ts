import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

export function useData() {
  const athletes = useLiveQuery(() => db.athletes.toArray(), []) ?? []
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? []
  const measurements = useLiveQuery(() => db.measurements.toArray(), []) ?? []
  const standards = useLiveQuery(() => db.standards.toArray(), []) ?? []
  const imports = useLiveQuery(() => db.imports.orderBy('importedAt').reverse().toArray(), []) ?? []
  const archetypes = useLiveQuery(() => db.archetypes.orderBy('priority').reverse().toArray(), []) ?? []
  return { athletes, sessions, measurements, standards, imports, archetypes, ready: standards.length > 0 }
}
