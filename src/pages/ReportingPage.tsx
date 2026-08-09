import { FileText, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui'
import { deriveAthleteReport } from '../lib/report'
import { useData } from '../lib/useData'
import { displayDate, initials } from '../lib/utils'

export default function ReportingPage() {
  const { athletes, sessions, measurements, standards } = useData(); const [query, setQuery] = useState(''); const version = standards[0]
  const reports = version ? athletes.map((a) => deriveAthleteReport(a, sessions, measurements, version)).filter((r) => `${r.athlete.firstName} ${r.athlete.lastName}`.toLowerCase().includes(query.toLowerCase())) : []
  return <div className="page"><PageHeader eyebrow="Individual analysis" title="Reporting" description="Open one athlete at a time. Reports use only that athlete’s published measurements." />
    <label className="search-field report-search"><Search size={18} /><input aria-label="Search reports" placeholder="Search athlete reports" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
    <section className="panel"><div className="section-heading"><div><p className="eyebrow">Report directory</p><h2>Athlete reports</h2></div><span>{reports.filter((r) => r.latestSession).length} with published results</span></div><div className="report-list">{reports.map((report) => <Link key={report.athlete.id} to={`/reporting/${report.athlete.id}`}><div className="avatar small">{initials(report.athlete.firstName, report.athlete.lastName)}</div><div><strong>{report.athlete.firstName} {report.athlete.lastName}</strong><span>{report.athlete.sport} · {report.athlete.group}</span></div><div className="report-date"><strong>{report.overall ?? 'Incomplete'}</strong><span>{report.latestSession ? displayDate(report.latestSession.date) : 'No published report'}</span></div><FileText size={19} /></Link>)}</div></section>
  </div>
}
