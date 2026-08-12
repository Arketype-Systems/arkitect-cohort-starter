import { describe, expect, it } from 'vitest'
import { bestAttempt, isMetricValueValid, scoreAssessment, scoreMetric } from './scoring'
import { STARTER_STANDARDS } from './standards'
import type { Measurement } from './types'

const metric = (id: string) => STARTER_STANDARDS.metrics.find((item) => item.id === id)!
const measurement = (athleteId: string, metricId: string, value: number): Measurement => ({ id: `${athleteId}-${metricId}`, sessionId: 'session', athleteId, metricId, attempts: [value], selectedAttempt: value, status: 'valid', updatedAt: '2026-08-08' })

describe('versioned deterministic scoring', () => {
  it('scores higher-is-better and exact half-open boundaries', () => {
    expect(scoreMetric(metric('vertical-jump'), 17.99).points).toBe(0)
    expect(scoreMetric(metric('vertical-jump'), 18).points).toBe(1)
    expect(scoreMetric(metric('vertical-jump'), 30).points).toBe(4)
    expect(bestAttempt(metric('vertical-jump'), [24, 26, 25])).toBe(26)
  })
  it('scores lower-is-better and exact boundaries in the correct direction', () => {
    expect(scoreMetric(metric('ten-yard'), 1.64).points).toBe(4)
    expect(scoreMetric(metric('ten-yard'), 1.65).points).toBe(3)
    expect(scoreMetric(metric('ten-yard'), 2).points).toBe(0)
    expect(bestAttempt(metric('ten-yard'), [1.82, 1.76])).toBe(1.76)
  })
  it('uses metric-specific validation ranges', () => {
    expect(isMetricValueValid(metric('ten-yard'), 1.8)).toBe(true)
    expect(isMetricValueValid(metric('ten-yard'), 12)).toBe(false)
    expect(isMetricValueValid(metric('vertical-jump'), 59.9)).toBe(true)
    expect(isMetricValueValid(metric('vertical-jump'), 61)).toBe(false)
    expect(bestAttempt(metric('vertical-jump'), [24, 100, 23])).toBe(24)
  })
  it('never allocates points for a missing required metric', () => {
    const partial = STARTER_STANDARDS.metrics.slice(0, 4).map((item) => measurement('ath-a', item.id, item.direction === 'higher' ? 25 : 1.8))
    expect(scoreAssessment(STARTER_STANDARDS, partial, 'ath-a')).toMatchObject({ complete: false, overall: null, standardsVersion: '1.0.0' })
  })
  it('reports optional tests without adding them to the required point total', () => {
    const version = structuredClone(STARTER_STANDARDS)
    version.metrics[4].required = false
    const rows = version.metrics.map((item) => measurement('ath-a', item.id, item.direction === 'higher' ? item.validMax : item.validMin))
    const result = scoreAssessment(version, rows, 'ath-a')
    expect(result).toMatchObject({ complete: true, overall: 16, maxPoints: 16 })
    expect(result.scores).toHaveLength(5)
  })
  it('treats an out-of-range required result as incomplete even if its stored status says valid', () => { const rows = STARTER_STANDARDS.metrics.map((item) => measurement('ath-a', item.id, item.id === 'ten-yard' ? 12 : item.direction === 'higher' ? 25 : 4)); expect(scoreAssessment(STARTER_STANDARDS, rows, 'ath-a').overall).toBeNull() })
  it('isolates measurements by athlete identity', () => {
    const exceptional: Record<string, number> = { 'vertical-jump': 30, 'broad-jump': 114, 'ten-yard': 1, 'pro-agility': 4, 'bench-reps': 20 }
    const a = STARTER_STANDARDS.metrics.map((item) => measurement('ath-a', item.id, exceptional[item.id]))
    const b = STARTER_STANDARDS.metrics.slice(0, 4).map((item) => measurement('ath-b', item.id, item.direction === 'higher' ? 1 : 100))
    expect(scoreAssessment(STARTER_STANDARDS, [...a, ...b], 'ath-a').overall).toBe(20)
    expect(scoreAssessment(STARTER_STANDARDS, [...a, ...b], 'ath-b').overall).toBeNull()
  })
})
