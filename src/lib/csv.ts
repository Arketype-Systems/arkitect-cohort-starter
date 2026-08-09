import Papa from 'papaparse'
import type { Athlete } from './types'

export const CSV_HEADERS = ['first_name', 'last_name', 'sport', 'position', 'group'] as const
export type CsvField = typeof CSV_HEADERS[number]
export type CsvFieldMapping = Record<CsvField, string>
const REQUIRED_CSV_FIELDS: CsvField[] = ['first_name', 'last_name', 'sport', 'group']
export const CSV_TEMPLATE = `${CSV_HEADERS.join(',')}\nSam,Example,Soccer,Forward,Varsity\n`
export interface CsvRowResult { rowNumber: number; raw: Record<string, string>; athlete?: Athlete; errors: string[]; duplicate: boolean }

const normalize = (value: string) => value.trim().toLocaleLowerCase()
export const athleteKey = (athlete: Pick<Athlete, 'firstName' | 'lastName'>) => `${normalize(athlete.firstName)}::${normalize(athlete.lastName)}`

export function inferFieldMapping(headers: string[]): CsvFieldMapping {
  const aliases: Record<CsvField, string[]> = { first_name: ['first_name', 'firstname', 'first'], last_name: ['last_name', 'lastname', 'last', 'surname'], sport: ['sport', 'activity'], position: ['position', 'pos'], group: ['group', 'team', 'squad'] }
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
    const draft = { id: crypto.randomUUID(), firstName: clean.first_name ?? '', lastName: clean.last_name ?? '', sport: clean.sport ?? '', position: clean.position ?? '', group: clean.group ?? '', createdAt: new Date().toISOString() }
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
  return Papa.unparse(athletes.map((athlete) => ({ first_name: athlete.firstName, last_name: athlete.lastName, sport: athlete.sport, position: athlete.position, group: athlete.group })), { columns: [...CSV_HEADERS] })
}
