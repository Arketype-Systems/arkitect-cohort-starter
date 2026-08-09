import { afterEach, describe, expect, it } from 'vitest'
import { FieldhouseDatabase, ensureSeeded } from './db'
describe('IndexedDB persistence mapping', () => {
  const names: string[] = []; afterEach(async () => { await Promise.all(names.map((name) => indexedDB.deleteDatabase(name))) })
  it('reopens sessions and measurements with stable athlete IDs', async () => { const name = `test-${crypto.randomUUID()}`; names.push(name); const first = new FieldhouseDatabase(name); await ensureSeeded(first); const session = await first.sessions.get('session-complete'); first.close(); const reopened = new FieldhouseDatabase(name); const measurement = await reopened.measurements.where({ sessionId: 'session-complete', athleteId: 'ath-a' }).first(); expect(session?.athleteIds).toContain('ath-a'); expect(measurement?.athleteId).toBe('ath-a'); expect(measurement?.sessionId).toBe(session?.id); reopened.close() })
})
