export type Direction = 'higher' | 'lower'
export type SessionStatus = 'draft' | 'in_progress' | 'review' | 'published'
export type MeasurementStatus = 'valid' | 'invalid' | 'excluded'

export interface Athlete { id: string; firstName: string; lastName: string; sport: string; position: string; group: string; createdAt: string; synthetic?: boolean }
export interface ScoreBand { label: string; min?: number; max?: number; points: number; color: string; meaning: string }
export interface MetricStandard { id: string; name: string; shortName: string; unit: string; direction: Direction; weight: number; required: boolean; attempts: number; validMin: number; validMax: number; bands: ScoreBand[]; percentileContext: string }
export interface StandardsVersion { id: string; name: string; version: string; effectiveDate: string; description: string; metrics: MetricStandard[]; synthetic: true }
export interface AssessmentSession { id: string; name: string; date: string; athleteIds: string[]; metricIds: string[]; standardsVersionId: string; status: SessionStatus; createdAt: string; updatedAt: string; publishedAt?: string; synthetic?: boolean }
export interface Measurement { id: string; sessionId: string; athleteId: string; metricId: string; attempts: Array<number | null>; selectedAttempt: number | null; status: MeasurementStatus; note?: string; updatedAt: string }
export interface ImportRecord { id: string; importedAt: string; fileName: string; totalRows: number; added: number; skipped: number; errors: number }
export interface AppSetting { key: string; value: string }
export interface MetricScore { metric: MetricStandard; value: number; points: number; band: ScoreBand }
export interface AthleteReport { athlete: Athlete; version: StandardsVersion; sessions: AssessmentSession[]; latestSession?: AssessmentSession; scores: MetricScore[]; overall: number | null; complete: boolean; missing: string[]; strengths: MetricScore[]; priorities: MetricScore[] }
