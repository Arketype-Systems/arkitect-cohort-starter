import type { Athlete, AthleteReport, AssessmentSession, Measurement, StandardsVersion } from './types'
import { scoreAssessment } from './scoring'
import { resolveStandardsProfile } from './standards'

export function deriveAthleteReport(athlete: Athlete, sessions: AssessmentSession[], measurements: Measurement[], version: StandardsVersion): AthleteReport {
  const athleteSessions = sessions.filter((session) => session.athleteIds.includes(athlete.id) && session.status === 'published').sort((a, b) => b.date.localeCompare(a.date) || (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt))
  const latestSession = athleteSessions[0]
  const latestMeasurements = latestSession ? measurements.filter((measurement) => measurement.sessionId === latestSession.id && measurement.athleteId === athlete.id) : []
  const profile = version.profiles.find((item) => item.id === latestSession?.profileIdsByAthlete?.[athlete.id]) ?? resolveStandardsProfile(version, athlete, latestSession?.date ?? new Date().toISOString().slice(0, 10))
  const result = scoreAssessment(version, latestMeasurements, athlete.id, athlete, latestSession?.date, profile)
  const ordered = [...result.scores].sort((a, b) => b.points - a.points)
  return { athlete, version, profile, sessions: athleteSessions, latestSession, scores: result.scores, overall: result.overall, maxPoints: result.maxPoints, complete: result.complete, missing: result.missing, strengths: ordered.slice(0, 2), priorities: ordered.slice(-2).reverse() }
}

export function reportToCsv(report: AthleteReport) {
  const header = 'athlete_id,athlete_name,assessment_date,metric,value,unit,grade,band,point_total,max_points,standards_version,standards_profile'
  const rows = report.scores.map((score) => [report.athlete.id, `"${report.athlete.firstName} ${report.athlete.lastName}"`, report.latestSession?.date ?? '', `"${score.metric.name}"`, score.value, score.metric.unit, score.points, score.band.label, report.overall ?? '', report.maxPoints, report.version.version, `"${report.profile.name}"`].join(','))
  return [header, ...rows].join('\n')
}

export function resolveReportVersion(athleteId: string, sessions: AssessmentSession[], versions: StandardsVersion[]): StandardsVersion | undefined {
  const latest = sessions.filter((session) => session.status === 'published' && session.athleteIds.includes(athleteId)).sort((a, b) => b.date.localeCompare(a.date) || (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt))[0]
  return versions.find((version) => version.id === latest?.standardsVersionId)
}

export function latestStandardsVersion(versions: StandardsVersion[]): StandardsVersion | undefined {
  return [...versions].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate) || b.version.localeCompare(a.version))[0]
}
