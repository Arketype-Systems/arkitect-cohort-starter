import type { Athlete, AthleteReport, AssessmentSession, Measurement, StandardsVersion } from './types'
import { scoreAssessment } from './scoring'

export function deriveAthleteReport(athlete: Athlete, sessions: AssessmentSession[], measurements: Measurement[], version: StandardsVersion): AthleteReport {
  const athleteSessions = sessions.filter((session) => session.athleteIds.includes(athlete.id) && session.status === 'published').sort((a, b) => b.date.localeCompare(a.date))
  const latestSession = athleteSessions[0]
  const latestMeasurements = latestSession ? measurements.filter((measurement) => measurement.sessionId === latestSession.id && measurement.athleteId === athlete.id) : []
  const result = scoreAssessment(version, latestMeasurements, athlete.id)
  const ordered = [...result.scores].sort((a, b) => b.points - a.points)
  return { athlete, version, sessions: athleteSessions, latestSession, scores: result.scores, overall: result.overall, complete: result.complete, missing: result.missing, strengths: ordered.slice(0, 2), priorities: ordered.slice(-2).reverse() }
}

export function reportToCsv(report: AthleteReport) {
  const header = 'athlete_id,athlete_name,assessment_date,metric,value,unit,score,band,standards_version'
  const rows = report.scores.map((score) => [report.athlete.id, `"${report.athlete.firstName} ${report.athlete.lastName}"`, report.latestSession?.date ?? '', `"${score.metric.name}"`, score.value, score.metric.unit, score.points, score.band.label, report.version.version].join(','))
  return [header, ...rows].join('\n')
}
