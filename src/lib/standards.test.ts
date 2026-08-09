import { describe, expect, it } from 'vitest'
import { STARTER_STANDARDS, validateStandardsVersion } from './standards'

describe('standards version validation', () => {
  it('accepts the complete starter contract', () => expect(validateStandardsVersion(STARTER_STANDARDS)).toEqual([]))
  it('rejects reversed points, band gaps, invalid ranges, and weight drift', () => {
    const version = structuredClone(STARTER_STANDARDS)
    version.metrics[0].bands[0].points = 100
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
})
