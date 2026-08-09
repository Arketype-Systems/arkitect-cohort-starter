import { describe, expect, it } from 'vitest'
import { matchesArchetype, resolveArchetype } from './archetypes'
import { SYNTHETIC_ATHLETES } from './seed'
import type { ComparisonArchetype } from './types'

const base: ComparisonArchetype = { id: 'base', name: 'Male soccer · ages 16–18', active: true, priority: 10, ageMin: 16, ageMax: 18, sexes: ['male'], sports: ['Soccer'], positions: [], grades: [], levels: [], createdAt: '2026-08-09T12:00:00.000Z' }

describe('database comparison archetypes', () => {
  it('matches assessment-date age, sex, and any listed sport', () => {
    expect(matchesArchetype({ ...base, sports: [' soccer '] }, SYNTHETIC_ATHLETES[0], '2026-07-28')).toBe(true)
    expect(matchesArchetype(base, SYNTHETIC_ATHLETES[1], '2026-07-28')).toBe(false)
    expect(matchesArchetype(base, SYNTHETIC_ATHLETES[0], '2028-07-28')).toBe(false)
  })

  it('supports optional position, grade, and level refinements', () => {
    const detailed = { ...base, positions: ['Midfielder'], grades: ['11'], levels: ['Varsity'] }
    expect(matchesArchetype(detailed, SYNTHETIC_ATHLETES[0], '2026-07-28')).toBe(true)
    expect(matchesArchetype({ ...detailed, levels: ['Development'] }, SYNTHETIC_ATHLETES[0], '2026-07-28')).toBe(false)
  })

  it('resolves overlap by priority, then specificity, without consulting a scoring profile', () => {
    const broad = { ...base, id: 'broad', name: 'Broad', sports: [], priority: 10 }
    const specific = { ...base, id: 'specific', name: 'Specific', priority: 10 }
    const priority = { ...broad, id: 'priority', name: 'Priority', priority: 20 }
    expect(resolveArchetype([broad, specific], SYNTHETIC_ATHLETES[0], '2026-07-28')?.id).toBe('specific')
    expect(resolveArchetype([specific, priority], SYNTHETIC_ATHLETES[0], '2026-07-28')?.id).toBe('priority')
  })
})
