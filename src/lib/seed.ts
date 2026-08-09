import { STARTER_STANDARDS } from './standards'
import type { Athlete, AssessmentSession, Measurement } from './types'

export const SYNTHETIC_ATHLETES: Athlete[] = [
  { id: 'ath-a', firstName: 'Jordan', lastName: 'Ellis', sex: 'male', dateOfBirth: '2009-03-14', grade: '11', sport: 'Soccer', position: 'Midfielder', sports: ['Soccer', 'Track'], positions: ['Midfielder', '400m'], group: 'Varsity' },
  { id: 'ath-b', firstName: 'Maya', lastName: 'Brooks', sex: 'female', dateOfBirth: '2009-09-22', grade: '11', sport: 'Basketball', position: 'Guard', sports: ['Basketball'], positions: ['Guard'], group: 'Varsity' },
  { id: 'ath-c', firstName: 'Cameron', lastName: 'Price', sex: 'male', dateOfBirth: '2010-01-08', grade: '10', sport: 'Football', position: 'Safety', sports: ['Football', 'Track'], positions: ['Safety', 'Sprinter'], group: 'Development' },
  { id: 'ath-d', firstName: 'Riley', lastName: 'Morgan', sex: 'female', dateOfBirth: '2008-11-30', grade: '12', sport: 'Volleyball', position: 'Outside Hitter', sports: ['Volleyball', 'Basketball'], positions: ['Outside Hitter', 'Forward'], group: 'Varsity' },
  { id: 'ath-e', firstName: 'Alex', lastName: 'Rivera', sex: 'male', dateOfBirth: '2011-05-17', grade: '9', sport: 'Baseball', position: 'Shortstop', sports: ['Baseball'], positions: ['Shortstop'], group: 'Development' },
  { id: 'ath-f', firstName: 'Taylor', lastName: 'Kim', sex: 'female', dateOfBirth: '2010-07-03', grade: '10', sport: 'Lacrosse', position: 'Midfield', sports: ['Lacrosse', 'Soccer'], positions: ['Midfield', 'Defender'], group: 'Varsity' },
].map((athlete) => ({ ...athlete, synthetic: true, createdAt: '2026-07-01T12:00:00.000Z' })) as Athlete[]

export const SYNTHETIC_SESSIONS: AssessmentSession[] = [
  { id: 'session-complete', name: 'Synthetic Summer Baseline', date: '2026-07-28', athleteIds: ['ath-a', 'ath-b', 'ath-c', 'ath-d'], metricIds: STARTER_STANDARDS.metrics.map((m) => m.id), standardsVersionId: STARTER_STANDARDS.id, profileIdsByAthlete: { 'ath-a': 'profile-male', 'ath-b': 'profile-female', 'ath-c': 'profile-male', 'ath-d': 'profile-female' }, status: 'published', createdAt: '2026-07-28T13:00:00.000Z', updatedAt: '2026-07-28T15:00:00.000Z', publishedAt: '2026-07-28T15:00:00.000Z', synthetic: true },
  { id: 'session-draft', name: 'Synthetic Return Testing', date: '2026-08-08', athleteIds: ['ath-e', 'ath-f'], metricIds: STARTER_STANDARDS.metrics.map((m) => m.id), standardsVersionId: STARTER_STANDARDS.id, profileIdsByAthlete: { 'ath-e': 'profile-male', 'ath-f': 'profile-female' }, status: 'in_progress', createdAt: '2026-08-08T14:00:00.000Z', updatedAt: '2026-08-08T14:30:00.000Z', synthetic: true }
]

const values: Record<string, number[]> = { 'ath-a': [25.5, 101, 1.78, 4.66, 13], 'ath-b': [27, 96, 1.72, 4.51, 11], 'ath-c': [30.5, 116, 1.62, 4.38, 19], 'ath-d': [23, 92, 1.84, 4.78, 9] }
export const SYNTHETIC_MEASUREMENTS: Measurement[] = Object.entries(values).flatMap(([athleteId, row]) => STARTER_STANDARDS.metrics.map((metric, index) => ({ id: `m-session-complete-${athleteId}-${metric.id}`, sessionId: 'session-complete', athleteId, metricId: metric.id, attempts: [row[index], null, null].slice(0, metric.attempts), selectedAttempt: row[index], status: 'valid', updatedAt: '2026-07-28T15:00:00.000Z' })))
