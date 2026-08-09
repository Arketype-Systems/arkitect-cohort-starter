import { describe, expect, it } from 'vitest'
import { deriveAthleteReport, reportToCsv, resolveReportVersion } from './report'
import { SYNTHETIC_ATHLETES, SYNTHETIC_MEASUREMENTS, SYNTHETIC_SESSIONS } from './seed'
import { STARTER_STANDARDS } from './standards'

describe('report derivation', () => {
  it('derives exactly one athlete, sums grades, and identifies the pinned profile and version', () => { const athlete = SYNTHETIC_ATHLETES[0]; const report = deriveAthleteReport(athlete, SYNTHETIC_SESSIONS, SYNTHETIC_MEASUREMENTS, STARTER_STANDARDS); expect(report.athlete.id).toBe(athlete.id); expect(report.scores.every((score) => SYNTHETIC_MEASUREMENTS.some((m) => m.athleteId === athlete.id && m.metricId === score.metric.id && m.selectedAttempt === score.value))).toBe(true); expect(report.overall).toBe(report.scores.reduce((sum, score) => sum + score.points, 0)); expect(report.maxPoints).toBe(20); expect(report.profile.id).toBe('profile-male'); expect(report.version.version).toBe('1.0.0'); expect(reportToCsv(report)).toContain('standards_profile') })
  it('resolves the exact standards version attached to the latest published session', () => { const newer = { ...structuredClone(STARTER_STANDARDS), id: 'v2', version: '2.0.0' }; const sessions = SYNTHETIC_SESSIONS.map((session) => session.id === 'session-complete' ? { ...session, standardsVersionId: newer.id } : session); expect(resolveReportVersion('ath-a', sessions, [STARTER_STANDARDS, newer])?.version).toBe('2.0.0') })
})
