import Papa from 'papaparse'
import type { Athlete, AthleteSex } from './types'

export const CSV_HEADERS = ['first_name', 'last_name', 'sex', 'date_of_birth', 'grade', 'sport', 'position', 'additional_sports', 'additional_positions', 'group'] as const
export type CsvField = typeof CSV_HEADERS[number]
export type CsvFieldMapping = Record<CsvField, string>
const REQUIRED_CSV_FIELDS: CsvField[] = ['first_name', 'last_name', 'sport', 'group']
export const CSV_TEMPLATE = `${CSV_HEADERS.join(',')}\nSam,Example,unspecified,2010-06-15,10,Soccer,Forward,Track,100m,Varsity\n`
export interface CsvRowResult { rowNumber: number; raw: Record<string, string>; athlete?: Athlete; errors: string[]; duplicate: boolean }

const normalize = (value: string) => value.trim().toLocaleLowerCase()
export const athleteKey = (athlete: Pick<Athlete, 'firstName' | 'lastName'>) => `${normalize(athlete.firstName)}::${normalize(athlete.lastName)}`

export function inferFieldMapping(headers: string[]): CsvFieldMapping {
  const aliases: Record<CsvField, string[]> = { first_name: ['first_name', 'firstname', 'first'], last_name: ['last_name', 'lastname', 'last', 'surname'], sex: ['sex', 'gender'], date_of_birth: ['date_of_birth', 'dob', 'birth_date'], grade: ['grade', 'grade_level', 'class'], sport: ['sport', 'primary_sport', 'activity'], position: ['position', 'primary_position', 'pos'], additional_sports: ['additional_sports', 'other_sports', 'sports'], additional_positions: ['additional_positions', 'other_positions', 'positions'], group: ['group', 'team', 'squad'] }
  return Object.fromEntries(CSV_HEADERS.map((field) => [field, headers.find((header) => aliases[field].includes(header)) ?? ''])) as CsvFieldMapping
}

export function parseAthleteCsv(csv: string, existing: Athlete[] = [], suppliedMapping?: CsvFieldMapping): { headers: string[]; mapping: CsvFieldMapping; rows: CsvRowResult[]; fatalErrors: string[] } {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: 'greedy', transformHeader: (header) => normalize(header).replaceAll(' ', '_') })
  const headers = parsed.meta.fields ?? []
  const mapping = suppliedMapping ?? inferFieldMapping(headers)
  const missingFields = REQUIRED_CSV_FIELDS.filter((field) => !mapping[field] || !headers.includes(mapping[field]))
  const reusedSources = Object.values(mapping).filter(Boolean).filter((source, index, all) => all.indexOf(source) !== index)
  const fatalErrors = [
    ...(missingFields.length ? [`Map required fields: ${missingFields.join(', ')}`] : []),
    ...(reusedSources.length ? ['Each CSV column can map to only one athlete field.'] : []),
    ...parsed.errors.filter((error) => error.code !== 'UndetectableDelimiter').map((error) => `CSV row ${error.row ?? 'unknown'}: ${error.message}`)
  ]
  const seen = new Set(existing.map(athleteKey))
  const rows = parsed.data.map((raw, index): CsvRowResult => {
    const source = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, String(value ?? '').trim()]))
    const clean = Object.fromEntries(CSV_HEADERS.map((field) => [field, mapping[field] ? source[mapping[field]] ?? '' : '']))
    const errors: string[] = []
    if (!clean.first_name) errors.push('First name is required.')
    if (!clean.last_name) errors.push('Last name is required.')
    if (!clean.sport) errors.push('Sport is required.')
    if (!clean.group) errors.push('Group is required.')
    const sex = (['female', 'male'].includes(normalize(clean.sex ?? '')) ? normalize(clean.sex ?? '') : 'unspecified') as AthleteSex
    const additionalSports = (clean.additional_sports ?? '').split(/[;|]/).map((value) => value.trim()).filter(Boolean)
    const additionalPositions = (clean.additional_positions ?? '').split(/[;|]/).map((value) => value.trim()).filter(Boolean)
    const sport = clean.sport ?? ''; const position = clean.position ?? ''
    const draft: Athlete = { id: crypto.randomUUID(), firstName: clean.first_name ?? '', lastName: clean.last_name ?? '', sex, dateOfBirth: clean.date_of_birth ?? '', grade: clean.grade ?? '', sport, position, sports: [...new Set([sport, ...additionalSports].filter(Boolean))], positions: [...new Set([position, ...additionalPositions].filter(Boolean))], group: clean.group ?? '', createdAt: new Date().toISOString() }
    const key = athleteKey(draft)
    const duplicate = seen.has(key)
    if (duplicate) errors.push('An athlete with this first and last name already exists in this file or database.')
    if (!errors.length) seen.add(key)
    return { rowNumber: index + 2, raw: clean, athlete: errors.length ? undefined : draft, errors, duplicate }
  })
  return { headers, mapping, rows, fatalErrors }
}

export function downloadText(filename: string, content: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url)
}

export function athletesToCsv(athletes: Athlete[]) {
  return Papa.unparse(athletes.map((athlete) => ({ first_name: athlete.firstName, last_name: athlete.lastName, sex: athlete.sex, date_of_birth: athlete.dateOfBirth, grade: athlete.grade, sport: athlete.sport, position: athlete.position, additional_sports: athlete.sports.filter((value) => value !== athlete.sport).join(';'), additional_positions: athlete.positions.filter((value) => value !== athlete.position).join(';'), group: athlete.group })), { columns: [...CSV_HEADERS] })
}
