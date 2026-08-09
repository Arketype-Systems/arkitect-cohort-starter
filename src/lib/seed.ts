import { STARTER_STANDARDS } from './standards'
import type { Athlete, AssessmentSession, Measurement } from './types'

export const SYNTHETIC_ATHLETES: Athlete[] = [
  ['ath-a', 'Jordan', 'Ellis', 'Soccer', 'Midfielder', 'Varsity'], ['ath-b', 'Maya', 'Brooks', 'Basketball', 'Guard', 'Varsity'], ['ath-c', 'Cameron', 'Price', 'Football', 'Safety', 'Development'], ['ath-d', 'Riley', 'Morgan', 'Volleyball', 'Outside Hitter', 'Varsity'], ['ath-e', 'Alex', 'Rivera', 'Baseball', 'Shortstop', 'Development'], ['ath-f', 'Taylor', 'Kim', 'Lacrosse', 'Midfield', 'Varsity'],
].map(([id, firstName, lastName, sport, position, group]) => ({ id, firstName, lastName, sport, position, group, synthetic: true, createdAt: '2026-07-01T12:00:00.000Z' }))

export const SYNTHETIC_SESSIONS: AssessmentSession[] = [
  { id: 'session-complete', name: 'Synthetic Summer Baseline', date: '2026-07-28', athleteIds: ['ath-a', 'ath-b', 'ath-c', 'ath-d'], metricIds: STARTER_STANDARDS.metrics.map((m) => m.id), standardsVersionId: STARTER_STANDARDS.id, status: 'published', createdAt: '2026-07-28T13:00:00.000Z', updatedAt: '2026-07-28T15:00:00.000Z', publishedAt: '2026-07-28T15:00:00.000Z', synthetic: true },
  { id: 'session-draft', name: 'Synthetic Return Testing', date: '2026-08-08', athleteIds: ['ath-e', 'ath-f'], metricIds: STARTER_STANDARDS.metrics.map((m) => m.id), standardsVersionId: STARTER_STANDARDS.id, status: 'in_progress', createdAt: '2026-08-08T14:00:00.000Z', updatedAt: '2026-08-08T14:30:00.000Z', synthetic: true }
]

const values: Record<string, number[]> = { 'ath-a': [25.5, 101, 1.78, 4.66, 13], 'ath-b': [27, 96, 1.72, 4.51, 11], 'ath-c': [30.5, 116, 1.62, 4.38, 19], 'ath-d': [23, 92, 1.84, 4.78, 9] }
export const SYNTHETIC_MEASUREMENTS: Measurement[] = Object.entries(values).flatMap(([athleteId, row]) => STARTER_STANDARDS.metrics.map((metric, index) => ({ id: `m-session-complete-${athleteId}-${metric.id}`, sessionId: 'session-complete', athleteId, metricId: metric.id, attempts: [row[index], null, null].slice(0, metric.attempts), selectedAttempt: row[index], status: 'valid', updatedAt: '2026-07-28T15:00:00.000Z' })))
