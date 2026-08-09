import { describe, expect, it } from 'vitest'
import { parseAthleteCsv } from './csv'
import type { Athlete } from './types'

const existing: Athlete[] = [{ id: 'a', firstName: 'Sam', lastName: 'Example', sport: 'Soccer', position: 'Forward', group: 'Varsity', createdAt: '2026' }]
describe('CSV validation', () => {
  it('rejects missing required headers without losing the preview', () => { const result = parseAthleteCsv('first_name,last_name\nLee,Stone'); expect(result.fatalErrors[0]).toContain('sport'); expect(result.rows).toHaveLength(1) })
  it('keeps valid rows while surfacing invalid rows', () => { const result = parseAthleteCsv('first_name,last_name,sport,position,group\nLee,Stone,Tennis,Singles,Varsity\n,Missing,Tennis,,Varsity'); expect(result.rows[0].athlete?.firstName).toBe('Lee'); expect(result.rows[1].errors).toContain('First name is required.') })
  it('blocks database and within-file duplicates case insensitively', () => { const result = parseAthleteCsv('first_name,last_name,sport,position,group\nsam,example,Soccer,Forward,Varsity\nLee,Stone,Tennis,,Varsity\nLEE,STONE,Tennis,,Varsity', existing); expect(result.rows[0].duplicate).toBe(true); expect(result.rows[2].duplicate).toBe(true) })
})
