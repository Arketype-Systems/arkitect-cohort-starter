import { bandsForMetric, resolveStandardsProfile } from './standards'
import type { Athlete, Measurement, MetricScore, MetricStandard, ScoreBand, StandardsProfile, StandardsVersion } from './types'

export function scoreMetric(metric: MetricStandard, value: number, bands: ScoreBand[] = metric.bands): MetricScore {
  const band = bands.find((candidate) => {
    const aboveMin = candidate.min === undefined || value >= candidate.min
    const belowMax = candidate.max === undefined || value < candidate.max
    return aboveMin && belowMax
  })
  if (!band) throw new Error(`No scoring band covers ${value} for ${metric.id}`)
  return { metric, value, points: band.points, band }
}

export function scoreAssessment(version: StandardsVersion, measurements: Measurement[], athleteId: string, athlete?: Athlete, assessmentDate = new Date().toISOString().slice(0, 10), profileOverride?: StandardsProfile) {
  const profile = profileOverride ?? (athlete ? resolveStandardsProfile(version, athlete, assessmentDate) : version.profiles?.[0])
  const valid = measurements.filter((m) => m.athleteId === athleteId && m.status === 'valid' && m.selectedAttempt !== null)
  const scores = version.metrics.flatMap((metric) => {
    const result = valid.find((m) => m.metricId === metric.id)
    const bands = profile ? bandsForMetric(profile, metric.id, metric.bands) : metric.bands
    return result?.selectedAttempt === null || result?.selectedAttempt === undefined || !isMetricValueValid(metric, result.selectedAttempt) ? [] : [scoreMetric(metric, result.selectedAttempt, bands)]
  })
  const missing = version.metrics.filter((metric) => metric.required && !scores.some((score) => score.metric.id === metric.id)).map((metric) => metric.name)
  const maxPoints = version.metrics.length * 4
  if (missing.length) return { complete: false as const, overall: null, maxPoints, scores, missing, standardsVersion: version.version, profile }
  const overall = scores.reduce((sum, score) => sum + score.points, 0)
  return { complete: true as const, overall, maxPoints, scores, missing: [], standardsVersion: version.version, profile }
}

export function bestAttempt(metric: MetricStandard, attempts: Array<number | null>): number | null {
  const values = attempts.filter((value): value is number => value !== null && Number.isFinite(value))
  if (!values.length) return null
  const validValues = values.filter((value) => isMetricValueValid(metric, value))
  if (!validValues.length) return values[0]
  return metric.direction === 'higher' ? Math.max(...validValues) : Math.min(...validValues)
}

export function isMetricValueValid(metric: MetricStandard, value: number | null): boolean {
  return value !== null && Number.isFinite(value) && value >= metric.validMin && value <= metric.validMax
}
