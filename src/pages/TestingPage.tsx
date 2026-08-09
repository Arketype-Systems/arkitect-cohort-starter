import { ArrowRight, ClipboardPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader, StatusPill } from '../components/ui'
import { useData } from '../lib/useData'
import { displayDate } from '../lib/utils'

export default function TestingPage() {
  const { sessions, measurements } = useData(); const ordered = [...sessions].sort((a, b) => b.date.localeCompare(a.date))
  return <div className="page"><PageHeader eyebrow="Capture workflow" title="Testing" description="Create, continue, review, and publish assessment sessions." actions={<Link className="button primary" to="/testing/new"><ClipboardPlus size={18} />New session</Link>} />
    <section className="session-grid">{ordered.map((session) => { const captured = measurements.filter((m) => m.sessionId === session.id && m.selectedAttempt !== null).length; const expected = session.athleteIds.length * session.metricIds.length; return <article className="session-card panel" key={session.id}><div className="session-card-head"><div><StatusPill tone={session.status === 'published' ? 'good' : session.status === 'review' ? 'ready' : 'warning'}>{session.status.replace('_', ' ')}</StatusPill><h2>{session.name}</h2><p>{displayDate(session.date)}</p></div><span className="session-count"><strong>{session.athleteIds.length}</strong>athletes</span></div><div className="session-details"><span>Battery<strong>{session.metricIds.length} metrics</strong></span><span>Results<strong>{captured} of {expected}</strong></span><span>Standard<strong>v1.0.0</strong></span></div><Link className="button secondary full" to={session.status === 'published' || session.status === 'review' ? `/testing/${session.id}/review` : `/testing/${session.id}/live`}>{session.status === 'published' ? 'View published session' : session.status === 'review' ? 'Continue review' : 'Continue live intake'}<ArrowRight size={17} /></Link></article> })}</section>
  </div>
}
