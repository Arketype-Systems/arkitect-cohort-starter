export type Direction = 'higher' | 'lower'
export type SessionStatus = 'draft' | 'in_progress' | 'review' | 'published'
export type MeasurementStatus = 'valid' | 'invalid' | 'excluded'
export type AthleteSex = 'female' | 'male' | 'unspecified'

export interface Athlete { id: string; firstName: string; lastName: string; sex: AthleteSex; dateOfBirth: string; grade: string; sport: string; position: string; sports: string[]; positions: string[]; group: string; createdAt: string; synthetic?: boolean }
export interface ScoreBand { label: string; min?: number; max?: number; points: number; color: string; meaning: string }
export interface MetricStandard { id: string; name: string; shortName: string; unit: string; direction: Direction; weight: number; required: boolean; attempts: number; validMin: number; validMax: number; bands: ScoreBand[]; percentileContext: string }
export interface StandardsAudience { sexes: AthleteSex[]; ageMin?: number; ageMax?: number; grades: string[]; sports: string[]; positions: string[] }
export interface StandardsProfile { id: string; name: string; priority: number; audience: StandardsAudience; bandsByMetric: Record<string, ScoreBand[]> }
export interface StandardsVersion { id: string; name: string; version: string; effectiveDate: string; description: string; metrics: MetricStandard[]; profiles: StandardsProfile[]; synthetic: true }
export interface AssessmentSession { id: string; name: string; date: string; athleteIds: string[]; metricIds: string[]; standardsVersionId: string; profileIdsByAthlete?: Record<string, string>; status: SessionStatus; createdAt: string; updatedAt: string; publishedAt?: string; synthetic?: boolean }
export interface Measurement { id: string; sessionId: string; athleteId: string; metricId: string; attempts: Array<number | null>; selectedAttempt: number | null; status: MeasurementStatus; note?: string; updatedAt: string }
export interface ImportRecord { id: string; importedAt: string; fileName: string; totalRows: number; added: number; skipped: number; errors: number }
export interface AppSetting { key: string; value: string }
export interface MetricScore { metric: MetricStandard; value: number; points: number; band: ScoreBand }
export interface AthleteReport { athlete: Athlete; version: StandardsVersion; profile: StandardsProfile; sessions: AssessmentSession[]; latestSession?: AssessmentSession; scores: MetricScore[]; overall: number | null; maxPoints: number; complete: boolean; missing: string[]; strengths: MetricScore[]; priorities: MetricScore[] }
