import { describe, expect, it } from 'vitest'
import { resolveStandardsProfile, STARTER_STANDARDS, validateStandardsVersion } from './standards'
import { SYNTHETIC_ATHLETES } from './seed'

describe('standards version validation', () => {
  it('accepts the complete starter contract', () => expect(validateStandardsVersion(STARTER_STANDARDS)).toEqual([]))
  it('rejects reversed points, band gaps, invalid ranges, and weight drift', () => {
    const version = structuredClone(STARTER_STANDARDS)
    version.metrics[0].bands[0].points = 4
    version.metrics[1].bands[1].min = 79
    version.metrics[2].validMin = 5
    version.metrics[2].validMax = 1
    version.metrics[3].weight = 10
    const errors = validateStandardsVersion(version).join(' ')
    expect(errors).toContain('weights must total 100')
    expect(errors).toContain('reversed')
    expect(errors).toContain('gap or overlap')
    expect(errors).toContain('valid minimum and maximum')
  })
  it('resolves sex profiles deterministically and preserves a general fallback', () => { expect(resolveStandardsProfile(STARTER_STANDARDS, SYNTHETIC_ATHLETES[0], '2026-08-08').id).toBe('profile-male'); expect(resolveStandardsProfile(STARTER_STANDARDS, SYNTHETIC_ATHLETES[1], '2026-08-08').id).toBe('profile-female'); const unspecified = { ...SYNTHETIC_ATHLETES[0], id: 'other', sex: 'unspecified' as const }; expect(resolveStandardsProfile(STARTER_STANDARDS, unspecified, '2026-08-08').id).toBe('profile-general') })
  it('matches a targeted profile across sex, age, grade, sport, and position', () => {
    const version = structuredClone(STARTER_STANDARDS)
    version.profiles.push({ ...structuredClone(version.profiles[0]), id: 'profile-varsity-guard', name: 'Varsity female basketball guards', priority: 50, audience: { sexes: ['female'], ageMin: 15, ageMax: 17, grades: ['11'], sports: ['Basketball'], positions: ['Guard'] } })
    expect(resolveStandardsProfile(version, SYNTHETIC_ATHLETES[1], '2026-08-08').id).toBe('profile-varsity-guard')
    expect(resolveStandardsProfile(version, { ...SYNTHETIC_ATHLETES[1], positions: ['Forward'], position: 'Forward' }, '2026-08-08').id).toBe('profile-female')
  })
  it('rejects duplicate identities and malformed audience values', () => { const version = structuredClone(STARTER_STANDARDS); version.profiles[1].id = version.profiles[0].id; version.profiles[1].audience.ageMin = -1; version.metrics[1].id = version.metrics[0].id; const errors = validateStandardsVersion(version).join(' '); expect(errors).toContain('unique nonempty ID'); expect(errors).toContain('nonnegative whole-number minimum age') })
})
