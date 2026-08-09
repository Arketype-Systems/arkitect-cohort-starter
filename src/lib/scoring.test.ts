import { describe, expect, it } from 'vitest'
import { bestAttempt, scoreAssessment, scoreMetric } from './scoring'
import { STARTER_STANDARDS } from './standards'
import type { Measurement } from './types'

const metric = (id: string) => STARTER_STANDARDS.metrics.find((item) => item.id === id)!
const measurement = (athleteId: string, metricId: string, value: number): Measurement => ({ id: `${athleteId}-${metricId}`, sessionId: 'session', athleteId, metricId, attempts: [value], selectedAttempt: value, status: 'valid', updatedAt: '2026-08-08' })

describe('versioned deterministic scoring', () => {
  it('scores higher-is-better and exact half-open boundaries', () => {
    expect(scoreMetric(metric('vertical-jump'), 17.99).points).toBe(20)
    expect(scoreMetric(metric('vertical-jump'), 18).points).toBe(40)
    expect(scoreMetric(metric('vertical-jump'), 30).points).toBe(100)
    expect(bestAttempt(metric('vertical-jump'), [24, 26, 25])).toBe(26)
  })
  it('scores lower-is-better and exact boundaries in the correct direction', () => {
    expect(scoreMetric(metric('ten-yard'), 1.64).points).toBe(100)
    expect(scoreMetric(metric('ten-yard'), 1.65).points).toBe(80)
    expect(scoreMetric(metric('ten-yard'), 2).points).toBe(20)
    expect(bestAttempt(metric('ten-yard'), [1.82, 1.76])).toBe(1.76)
  })
  it('never allocates missing required metric weight', () => {
    const partial = STARTER_STANDARDS.metrics.slice(0, 4).map((item) => measurement('ath-a', item.id, item.direction === 'higher' ? 25 : 1.8))
    expect(scoreAssessment(STARTER_STANDARDS, partial, 'ath-a')).toMatchObject({ complete: false, overall: null, standardsVersion: '1.0.0' })
  })
  it('isolates measurements by athlete identity', () => {
    const exceptional: Record<string, number> = { 'vertical-jump': 30, 'broad-jump': 114, 'ten-yard': 1, 'pro-agility': 4, 'bench-reps': 20 }
    const a = STARTER_STANDARDS.metrics.map((item) => measurement('ath-a', item.id, exceptional[item.id]))
    const b = STARTER_STANDARDS.metrics.slice(0, 4).map((item) => measurement('ath-b', item.id, item.direction === 'higher' ? 1 : 100))
    expect(scoreAssessment(STARTER_STANDARDS, [...a, ...b], 'ath-a').overall).toBe(100)
    expect(scoreAssessment(STARTER_STANDARDS, [...a, ...b], 'ath-b').overall).toBeNull()
  })
})
