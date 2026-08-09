import { describe, expect, it } from 'vitest'
import { deriveAthleteReport, reportToCsv } from './report'
import { SYNTHETIC_ATHLETES, SYNTHETIC_MEASUREMENTS, SYNTHETIC_SESSIONS } from './seed'
import { STARTER_STANDARDS } from './standards'

describe('report derivation', () => {
  it('derives exactly one athlete and identifies the standard version', () => { const athlete = SYNTHETIC_ATHLETES[0]; const report = deriveAthleteReport(athlete, SYNTHETIC_SESSIONS, SYNTHETIC_MEASUREMENTS, STARTER_STANDARDS); expect(report.athlete.id).toBe(athlete.id); expect(report.scores.every((score) => SYNTHETIC_MEASUREMENTS.some((m) => m.athleteId === athlete.id && m.metricId === score.metric.id && m.selectedAttempt === score.value))).toBe(true); expect(report.version.version).toBe('1.0.0'); expect(reportToCsv(report)).toContain('standards_version') })
})
