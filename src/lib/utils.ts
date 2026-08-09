export const initials = (firstName: string, lastName: string) => `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
export const displayDate = (date?: string) => date ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T12:00:00`)) : 'Not available'
export const scoreTone = (score: number | null, maxPoints = 20) => score === null ? 'neutral' : score / Math.max(maxPoints, 1) >= .75 ? 'good' : score / Math.max(maxPoints, 1) >= .5 ? 'ready' : 'attention'
export const localISODate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
