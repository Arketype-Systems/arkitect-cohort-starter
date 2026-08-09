export const initials = (firstName: string, lastName: string) => `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
export const displayDate = (date?: string) => date ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T12:00:00`)) : 'Not available'
export const scoreTone = (score: number | null) => score === null ? 'neutral' : score >= 80 ? 'good' : score >= 60 ? 'ready' : 'attention'
