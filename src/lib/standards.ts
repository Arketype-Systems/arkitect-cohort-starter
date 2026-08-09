import type { Athlete, ScoreBand, StandardsProfile, StandardsVersion } from './types'

const STARTER_METRICS: StandardsVersion['metrics'] = [
    { id: 'vertical-jump', name: 'Countermovement Vertical Jump', shortName: 'Vertical jump', unit: 'in', direction: 'higher', weight: 25, required: true, attempts: 3, validMin: 0, validMax: 60, percentileContext: 'Starter context only. Use a validated cohort before interpreting population rank.', bands: [
      { label: 'Foundation', max: 18, points: 0, color: '#c8645b', meaning: 'Build force production fundamentals.' },
      { label: 'Developing', min: 18, max: 22, points: 1, color: '#d69745', meaning: 'Continue general power development.' },
      { label: 'Ready', min: 22, max: 26, points: 2, color: '#d6b94a', meaning: 'Meets the starter readiness range.' },
      { label: 'Strong', min: 26, max: 30, points: 3, color: '#63a579', meaning: 'Strong expression of lower body power.' },
      { label: 'Exceptional', min: 30, points: 4, color: '#276f5b', meaning: 'Preserve quality and individualize loading.' }
    ]},
    { id: 'broad-jump', name: 'Standing Broad Jump', shortName: 'Broad jump', unit: 'in', direction: 'higher', weight: 20, required: true, attempts: 3, validMin: 0, validMax: 160, percentileContext: 'Starter context only. Bands are illustrative, not normative.', bands: [
      { label: 'Foundation', max: 78, points: 0, color: '#c8645b', meaning: 'Build horizontal force fundamentals.' },
      { label: 'Developing', min: 78, max: 90, points: 1, color: '#d69745', meaning: 'Progress horizontal power.' },
      { label: 'Ready', min: 90, max: 102, points: 2, color: '#d6b94a', meaning: 'Meets the starter readiness range.' },
      { label: 'Strong', min: 102, max: 114, points: 3, color: '#63a579', meaning: 'Strong horizontal power expression.' },
      { label: 'Exceptional', min: 114, points: 4, color: '#276f5b', meaning: 'Preserve quality and monitor asymmetries.' }
    ]},
    { id: 'ten-yard', name: '10 Yard Sprint', shortName: '10 yard', unit: 's', direction: 'lower', weight: 20, required: true, attempts: 2, validMin: 0.8, validMax: 4, percentileContext: 'Hand and electronic timing are not interchangeable. Keep collection methods consistent.', bands: [
      { label: 'Exceptional', max: 1.65, points: 4, color: '#276f5b', meaning: 'Exceptional starter acceleration band.' },
      { label: 'Strong', min: 1.65, max: 1.75, points: 3, color: '#63a579', meaning: 'Strong starter acceleration band.' },
      { label: 'Ready', min: 1.75, max: 1.85, points: 2, color: '#d6b94a', meaning: 'Meets the starter readiness range.' },
      { label: 'Developing', min: 1.85, max: 2.0, points: 1, color: '#d69745', meaning: 'Develop projection and early acceleration.' },
      { label: 'Foundation', min: 2.0, points: 0, color: '#c8645b', meaning: 'Build sprint positions and force application.' }
    ]},
    { id: 'pro-agility', name: '5-10-5 Pro Agility', shortName: 'Pro agility', unit: 's', direction: 'lower', weight: 20, required: true, attempts: 2, validMin: 2.5, validMax: 10, percentileContext: 'Surface, footwear, and timing method materially affect results.', bands: [
      { label: 'Exceptional', max: 4.35, points: 4, color: '#276f5b', meaning: 'Exceptional starter change of direction band.' },
      { label: 'Strong', min: 4.35, max: 4.6, points: 3, color: '#63a579', meaning: 'Strong change of direction expression.' },
      { label: 'Ready', min: 4.6, max: 4.85, points: 2, color: '#d6b94a', meaning: 'Meets the starter readiness range.' },
      { label: 'Developing', min: 4.85, max: 5.15, points: 1, color: '#d69745', meaning: 'Develop braking and reacceleration.' },
      { label: 'Foundation', min: 5.15, points: 0, color: '#c8645b', meaning: 'Build deceleration positions and control.' }
    ]},
    { id: 'bench-reps', name: 'Bench Press Repetitions', shortName: 'Bench reps', unit: 'reps', direction: 'higher', weight: 15, required: true, attempts: 1, validMin: 0, validMax: 100, percentileContext: 'The load must be standardized for a real comparison. This starter demonstrates scoring mechanics only.', bands: [
      { label: 'Foundation', max: 5, points: 0, color: '#c8645b', meaning: 'Build upper body strength capacity.' },
      { label: 'Developing', min: 5, max: 10, points: 1, color: '#d69745', meaning: 'Continue general strength development.' },
      { label: 'Ready', min: 10, max: 15, points: 2, color: '#d6b94a', meaning: 'Meets the starter readiness range.' },
      { label: 'Strong', min: 15, max: 20, points: 3, color: '#63a579', meaning: 'Strong upper body strength endurance.' },
      { label: 'Exceptional', min: 20, points: 4, color: '#276f5b', meaning: 'Preserve quality and progress deliberately.' }
    ]}
]

const bandsByMetric = () => Object.fromEntries(STARTER_METRICS.map((metric) => [metric.id, structuredClone(metric.bands)]))

export const STARTER_STANDARDS: StandardsVersion = {
  id: 'starter-us-sc-v1', name: 'Editable U.S. S&C Starter Battery', version: '1.0.0', effectiveDate: '2026-08-08', synthetic: true,
  description: 'Synthetic coaching bands for workflow demonstration. These are editable starter standards and are not validated population norms.',
  metrics: STARTER_METRICS,
  profiles: [
    { id: 'profile-general', name: 'General starter profile', priority: 0, audience: { sexes: [], grades: [], sports: [], positions: [] }, bandsByMetric: bandsByMetric() },
    { id: 'profile-female', name: 'Female starter example', priority: 10, audience: { sexes: ['female'], grades: [], sports: [], positions: [] }, bandsByMetric: bandsByMetric() },
    { id: 'profile-male', name: 'Male starter example', priority: 10, audience: { sexes: ['male'], grades: [], sports: [], positions: [] }, bandsByMetric: bandsByMetric() }
  ]
}

export function athleteAgeOn(dateOfBirth: string, onDate: string): number | null {
  if (!dateOfBirth) return null
  const birth = new Date(`${dateOfBirth}T00:00:00`); const date = new Date(`${onDate}T00:00:00`)
  if (Number.isNaN(birth.getTime()) || Number.isNaN(date.getTime())) return null
  let age = date.getFullYear() - birth.getFullYear()
  if (date.getMonth() < birth.getMonth() || (date.getMonth() === birth.getMonth() && date.getDate() < birth.getDate())) age -= 1
  return age
}

const normalizedIncludes = (values: string[], candidate: string) => !values.length || values.some((value) => value.trim().toLowerCase() === candidate.trim().toLowerCase())

export function profileMatches(profile: StandardsProfile, athlete: Athlete, assessmentDate: string): boolean {
  const age = athleteAgeOn(athlete.dateOfBirth, assessmentDate)
  const { audience } = profile
  if (audience.sexes.length && !audience.sexes.includes(athlete.sex)) return false
  if ((audience.ageMin !== undefined || audience.ageMax !== undefined) && age === null) return false
  if (audience.ageMin !== undefined && (age === null || age < audience.ageMin)) return false
  if (audience.ageMax !== undefined && (age === null || age > audience.ageMax)) return false
  if (!normalizedIncludes(audience.grades, athlete.grade)) return false
  if (audience.sports.length && !athlete.sports.some((sport) => normalizedIncludes(audience.sports, sport))) return false
  if (audience.positions.length && !athlete.positions.some((position) => normalizedIncludes(audience.positions, position))) return false
  return true
}

const profileSpecificity = (profile: StandardsProfile) => Number(Boolean(profile.audience.sexes.length)) + Number(profile.audience.ageMin !== undefined || profile.audience.ageMax !== undefined) + Number(Boolean(profile.audience.grades.length)) + Number(Boolean(profile.audience.sports.length)) + Number(Boolean(profile.audience.positions.length))

export function resolveStandardsProfile(version: StandardsVersion, athlete: Athlete, assessmentDate: string): StandardsProfile {
  const match = [...version.profiles].filter((profile) => profileMatches(profile, athlete, assessmentDate)).sort((a, b) => b.priority - a.priority || profileSpecificity(b) - profileSpecificity(a) || a.id.localeCompare(b.id))[0]
  if (!match) throw new Error(`No standards profile matches ${athlete.id} in version ${version.version}.`)
  return match
}

export function bandsForMetric(profile: StandardsProfile, metricId: string, fallback: ScoreBand[]): ScoreBand[] { return profile.bandsByMetric[metricId] ?? fallback }

export function validateStandardsVersion(version: StandardsVersion): string[] {
  const errors: string[] = []
  if (!version.version.trim()) errors.push('A version number is required.')
  if (!version.name.trim()) errors.push('A standard name is required.')
  if (!version.metrics.length) errors.push('At least one metric is required.')
  if (!version.profiles?.length) errors.push('At least one standards profile is required.')
  if (version.profiles && !version.profiles.some((profile) => !profile.audience.sexes.length && profile.audience.ageMin === undefined && profile.audience.ageMax === undefined && !profile.audience.grades.length && !profile.audience.sports.length && !profile.audience.positions.length)) errors.push('A general fallback standards profile is required.')
  if (version.metrics.reduce((sum, metric) => sum + metric.weight, 0) !== 100) errors.push('Metric weights must total 100 percent.')
  for (const metric of version.metrics) {
    if (!metric.name.trim() || !metric.unit.trim()) errors.push(`${metric.id} needs a name and unit.`)
    if (!Number.isFinite(metric.validMin) || !Number.isFinite(metric.validMax) || metric.validMin > metric.validMax) errors.push(`${metric.name} needs a valid minimum and maximum.`)
    const bandSets = [{ name: 'Default metric bands', bands: metric.bands }, ...(version.profiles ?? []).map((profile) => ({ name: profile.name, bands: profile.bandsByMetric[metric.id] ?? [] }))]
    for (const bandSet of bandSets) {
      if (bandSet.bands.length !== 5) { errors.push(`${bandSet.name}: ${metric.name} must have exactly five bands.`); continue }
      const sorted = [...bandSet.bands].sort((a, b) => (a.min ?? Number.NEGATIVE_INFINITY) - (b.min ?? Number.NEGATIVE_INFINITY))
      if (sorted[0].min !== undefined || sorted.at(-1)?.max !== undefined) errors.push(`${bandSet.name}: ${metric.name} bands must cover values below and above all cut points.`)
      for (let index = 1; index < sorted.length; index += 1) if (sorted[index - 1].max !== sorted[index].min) errors.push(`${bandSet.name}: ${metric.name} bands contain a gap or overlap.`)
      const points = sorted.map((band) => band.points)
      if ([...points].sort((a, b) => a - b).join(',') !== '0,1,2,3,4') errors.push(`${bandSet.name}: ${metric.name} points must be exactly 0, 1, 2, 3, and 4.`)
      const correctDirection = metric.direction === 'higher' ? points.every((point, index) => index === 0 || point > points[index - 1]) : points.every((point, index) => index === 0 || point < points[index - 1])
      if (!correctDirection) errors.push(`${bandSet.name}: ${metric.name} band points are reversed for its scoring direction.`)
    }
  }
  for (const profile of version.profiles ?? []) {
    if (!profile.name.trim()) errors.push('Every standards profile needs a name.')
    if (!Number.isFinite(profile.priority)) errors.push(`${profile.name} needs a numeric priority.`)
    if (profile.audience.ageMin !== undefined && profile.audience.ageMax !== undefined && profile.audience.ageMin > profile.audience.ageMax) errors.push(`${profile.name} has a reversed age range.`)
  }
  return [...new Set(errors)]
}
