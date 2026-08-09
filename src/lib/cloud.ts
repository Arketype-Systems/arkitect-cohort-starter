export type CloudProvider = 'none' | 'supabase'
export interface CloudConnection { provider: CloudProvider; status: 'local_only' | 'configured'; projectUrl?: string }
export interface AssessmentDataProvider { kind: 'local' | 'cloud'; athleteDataBoundary: string; supportsRealtime: boolean; supportsUsers: boolean }
export const LOCAL_DATA_PROVIDER: AssessmentDataProvider = { kind: 'local', athleteDataBoundary: 'This browser profile and exported coach backups.', supportsRealtime: false, supportsUsers: false }
export const DEFAULT_CLOUD_CONNECTION: CloudConnection = { provider: 'none', status: 'local_only' }
