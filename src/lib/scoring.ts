import type { Measurement, MetricScore, MetricStandard, StandardsVersion } from './types'

export function scoreMetric(metric: MetricStandard, value: number): MetricScore {
  const band = metric.bands.find((candidate) => {
    const aboveMin = candidate.min === undefined || value >= candidate.min
    const belowMax = candidate.max === undefined || value < candidate.max
    return aboveMin && belowMax
  })
  if (!band) throw new Error(`No scoring band covers ${value} for ${metric.id}`)
  return { metric, value, points: band.points, band }
}

export function scoreAssessment(version: StandardsVersion, measurements: Measurement[], athleteId: string) {
  const valid = measurements.filter((m) => m.athleteId === athleteId && m.status === 'valid' && m.selectedAttempt !== null)
  const scores = version.metrics.flatMap((metric) => {
    const result = valid.find((m) => m.metricId === metric.id)
    return result?.selectedAttempt === null || result?.selectedAttempt === undefined ? [] : [scoreMetric(metric, result.selectedAttempt)]
  })
  const missing = version.metrics.filter((metric) => metric.required && !scores.some((score) => score.metric.id === metric.id)).map((metric) => metric.name)
  if (missing.length) return { complete: false as const, overall: null, scores, missing, standardsVersion: version.version }
  const totalWeight = scores.reduce((sum, score) => sum + score.metric.weight, 0)
  const overall = Math.round(scores.reduce((sum, score) => sum + score.points * score.metric.weight, 0) / totalWeight)
  return { complete: true as const, overall, scores, missing: [], standardsVersion: version.version }
}

export function bestAttempt(metric: MetricStandard, attempts: Array<number | null>): number | null {
  const values = attempts.filter((value): value is number => value !== null && Number.isFinite(value))
  if (!values.length) return null
  return metric.direction === 'higher' ? Math.max(...values) : Math.min(...values)
}
