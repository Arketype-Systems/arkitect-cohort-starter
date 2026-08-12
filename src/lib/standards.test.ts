import { describe, expect, it } from 'vitest'
import { duplicateStandardsMetric, removeStandardsMetric, resolveStandardsProfile, STARTER_STANDARDS, validateStandardsVersion } from './standards'
import { SYNTHETIC_ATHLETES } from './seed'

describe('standards version validation', () => {
  it('accepts the complete starter contract', () => expect(validateStandardsVersion(STARTER_STANDARDS)).toEqual([]))
  it('rejects reversed points, band gaps, and invalid ranges', () => {
    const version = structuredClone(STARTER_STANDARDS)
    version.metrics[0].bands[0].points = 4
    version.metrics[1].bands[1].min = 79
    version.metrics[2].validMin = 5
    version.metrics[2].validMax = 1
    const errors = validateStandardsVersion(version).join(' ')
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
  it('requires at least one test to contribute to the point total', () => { const version = structuredClone(STARTER_STANDARDS); version.metrics.forEach((metric) => { metric.required = false }); expect(validateStandardsVersion(version).join(' ')).toContain('At least one test must be required') })
  it('duplicates a complete test across every standards profile without changing the original version', () => {
    const next = duplicateStandardsMetric(STARTER_STANDARDS, 'vertical-jump', 'new-test')
    expect(STARTER_STANDARDS.metrics).toHaveLength(5)
    expect(next.metrics).toHaveLength(6)
    expect(next.metrics.at(-1)).toMatchObject({ id: 'new-test', name: 'Countermovement Vertical Jump copy', shortName: 'Vertical jump copy', weight: 0 })
    expect(next.profiles.every((profile) => profile.bandsByMetric['new-test']?.length === 5)).toBe(true)
    expect(validateStandardsVersion(next)).toEqual([])
  })
  it('removes a test and its profile bands only from the draft version', () => {
    const next = removeStandardsMetric(STARTER_STANDARDS, 'bench-reps')
    expect(STARTER_STANDARDS.metrics).toHaveLength(5)
    expect(next.metrics.map((metric) => metric.id)).not.toContain('bench-reps')
    expect(next.profiles.every((profile) => profile.bandsByMetric['bench-reps'] === undefined)).toBe(true)
  })
})
