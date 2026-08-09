import type { Athlete, ComparisonArchetype } from './types'
import { athleteAgeOn } from './standards'

export const SYNTHETIC_ARCHETYPES: ComparisonArchetype[] = [
  { id: 'arch-male-16-18', name: 'Male athletes · ages 16–18', active: true, priority: 20, ageMin: 16, ageMax: 18, sexes: ['male'], sports: [], positions: [], grades: [], levels: [], createdAt: '2026-07-01T12:00:00.000Z', synthetic: true },
  { id: 'arch-female-16-18', name: 'Female athletes · ages 16–18', active: true, priority: 20, ageMin: 16, ageMax: 18, sexes: ['female'], sports: [], positions: [], grades: [], levels: [], createdAt: '2026-07-01T12:00:00.000Z', synthetic: true }
]

const sameTag = (left: string, right: string) => left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase()
const sharesTag = (rules: string[], values: string[]) => !rules.length || rules.some((rule) => values.some((value) => sameTag(rule, value)))

export function matchesArchetype(archetype: ComparisonArchetype, athlete: Athlete, assessmentDate: string) {
  const age = athleteAgeOn(athlete.dateOfBirth, assessmentDate)
  return archetype.active && (!archetype.sexes.length || archetype.sexes.includes(athlete.sex)) && (archetype.ageMin === undefined || age !== null && age >= archetype.ageMin) && (archetype.ageMax === undefined || age !== null && age <= archetype.ageMax) && sharesTag(archetype.sports, athlete.sports) && sharesTag(archetype.positions, athlete.positions) && sharesTag(archetype.grades, [athlete.grade]) && sharesTag(archetype.levels, [athlete.group])
}

export function resolveArchetype(archetypes: ComparisonArchetype[], athlete: Athlete, assessmentDate: string) {
  return archetypes.filter((item) => matchesArchetype(item, athlete, assessmentDate)).sort((a, b) => b.priority - a.priority || specificity(b) - specificity(a) || a.name.localeCompare(b.name))[0]
}

function specificity(item: ComparisonArchetype) { return Number(item.ageMin !== undefined) + Number(item.ageMax !== undefined) + item.sexes.length + item.sports.length + item.positions.length + item.grades.length + item.levels.length }

export function archetypeDescription(item: ComparisonArchetype) { return [item.ageMin !== undefined || item.ageMax !== undefined ? `Ages ${item.ageMin ?? 'open'} to ${item.ageMax ?? 'open'}` : 'Any age', item.sexes.length ? item.sexes.join(', ') : 'Any sex', item.sports.length ? item.sports.join(', ') : 'Any sport', item.positions.length ? `Positions: ${item.positions.join(', ')}` : '', item.levels.length ? `Levels: ${item.levels.join(', ')}` : ''].filter(Boolean).join(' · ') }
