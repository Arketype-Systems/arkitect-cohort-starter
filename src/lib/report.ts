import { matchesArchetype, resolveArchetype } from './archetypes'
import type { Athlete, AthleteReport, AssessmentSession, ComparisonArchetype, Measurement, StandardsVersion } from './types'
import { scoreAssessment } from './scoring'
import { resolveStandardsProfile } from './standards'

export function cohortPercentile(value: number, peerValues: number[], direction: 'higher' | 'lower'): number | null {
  const values = peerValues.filter(Number.isFinite)
  if (values.length < 2) return null
  const favorable = values.filter((peer) => direction === 'higher' ? peer < value : peer > value).length
  const tied = values.filter((peer) => peer === value).length
  return Math.round((favorable + tied * .5) / values.length * 100)
}

function latestPeerValues(archetype: ComparisonArchetype, metricId: string, sessions: AssessmentSession[], measurements: Measurement[], versionId: string, athletes: Athlete[]): number[] {
  return athletes.flatMap((athlete) => {
    const session = sessions.filter((item) => item.status === 'published' && item.standardsVersionId === versionId && item.athleteIds.includes(athlete.id) && item.metricIds.includes(metricId) && matchesArchetype(archetype, athlete, item.date)).sort((a, b) => b.date.localeCompare(a.date) || (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt))[0]
    if (!session) return []
    const result = measurements.find((measurement) => measurement.sessionId === session.id && measurement.athleteId === athlete.id && measurement.metricId === metricId && measurement.status === 'valid' && measurement.selectedAttempt !== null)
    return result?.selectedAttempt === null || result?.selectedAttempt === undefined ? [] : [result.selectedAttempt]
  })
}

export function deriveAthleteReport(athlete: Athlete, sessions: AssessmentSession[], measurements: Measurement[], version: StandardsVersion, allAthletes: Athlete[] = [athlete], archetypes: ComparisonArchetype[] = []): AthleteReport {
  const athleteSessions = sessions.filter((session) => session.athleteIds.includes(athlete.id) && session.status === 'published').sort((a, b) => b.date.localeCompare(a.date) || (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt))
  const latestSession = athleteSessions[0]
  const latestMeasurements = latestSession ? measurements.filter((measurement) => measurement.sessionId === latestSession.id && measurement.athleteId === athlete.id) : []
  const pinnedProfileId = latestSession?.profileIdsByAthlete?.[athlete.id]
  const profile = pinnedProfileId ? version.profiles.find((item) => item.id === pinnedProfileId) : resolveStandardsProfile(version, athlete, latestSession?.date ?? new Date().toISOString().slice(0, 10))
  if (!profile) throw new Error(`Pinned standards profile ${pinnedProfileId} is missing from version ${version.version}.`)
  const archetype = resolveArchetype(archetypes, athlete, latestSession?.date ?? new Date().toISOString().slice(0, 10))
  const result = scoreAssessment(version, latestMeasurements, athlete.id, athlete, latestSession?.date, profile)
  const scores = result.scores.map((score) => { const peers = archetype ? latestPeerValues(archetype, score.metric.id, sessions, measurements, version.id, allAthletes) : []; const percentile = archetype && allAthletes.length > 1 ? cohortPercentile(score.value, peers, score.metric.direction) : null; return { ...score, percentile: percentile ?? undefined, cohortSize: percentile === null ? undefined : peers.length } })
  const ordered = [...scores].sort((a, b) => (b.percentile ?? b.points * 25) - (a.percentile ?? a.points * 25))
  const percentiles = scores.flatMap((score) => score.percentile === undefined ? [] : [score.percentile])
  return { athlete, version, profile, archetype, sessions: athleteSessions, latestSession, scores, overall: result.overall, maxPoints: result.maxPoints, complete: result.complete, missing: result.missing, strengths: ordered.slice(0, 2), priorities: ordered.slice(-2).reverse(), percentileAverage: percentiles.length ? Math.round(percentiles.reduce((sum, value) => sum + value, 0) / percentiles.length) : null }
}

export function reportToCsv(report: AthleteReport) {
  const header = 'athlete_id,athlete_name,assessment_date,metric,value,unit,grade,band,point_total,max_points,standards_version,standards_profile,comparison_archetype'
  const rows = report.scores.map((score) => [report.athlete.id, `"${report.athlete.firstName} ${report.athlete.lastName}"`, report.latestSession?.date ?? '', `"${score.metric.name}"`, score.value, score.metric.unit, score.points, score.band.label, report.overall ?? '', report.maxPoints, report.version.version, `"${report.profile.name}"`, `"${report.archetype?.name ?? ''}"`].join(','))
  return [header, ...rows].join('\n')
}

export function resolveReportVersion(athleteId: string, sessions: AssessmentSession[], versions: StandardsVersion[]): StandardsVersion | undefined {
  const latest = sessions.filter((session) => session.status === 'published' && session.athleteIds.includes(athleteId)).sort((a, b) => b.date.localeCompare(a.date) || (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt))[0]
  return versions.find((version) => version.id === latest?.standardsVersionId)
}

export function latestStandardsVersion(versions: StandardsVersion[]): StandardsVersion | undefined { return [...versions].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate) || b.version.localeCompare(a.version, undefined, { numeric: true }))[0] }
