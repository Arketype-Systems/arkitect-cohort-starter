import { ArrowLeft, Download, Printer, TrendingDown, TrendingUp } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { type CSSProperties } from 'react'
import { RadarChart } from '../components/RadarChart'
import { EmptyState, Notice, ScoreBadge } from '../components/ui'
import { useBrandSettings } from '../lib/branding'
import { downloadText } from '../lib/csv'
import { deriveAthleteReport, latestStandardsVersion, reportToCsv, resolveReportVersion } from '../lib/report'
import { useData } from '../lib/useData'
import { displayDate, initials } from '../lib/utils'

export default function AthleteReportPage() {
  const { athleteId } = useParams()
  const { athletes, sessions, measurements, standards } = useData()
  const brand = useBrandSettings()
  const athlete = athletes.find((item) => item.id === athleteId)
  const version = athlete ? resolveReportVersion(athlete.id, sessions, standards) ?? latestStandardsVersion(standards) : undefined
  if (!athlete || !version) return <div className="page"><EmptyState title="Report not found">The athlete or scoring standard is unavailable.</EmptyState></div>
  const report = deriveAthleteReport(athlete, sessions, measurements, version, athletes)
  const identity = `${athlete.firstName} ${athlete.lastName}`
  return <div className="page report-page">
    <div className="report-toolbar"><Link className="back-link" to="/reporting"><ArrowLeft size={16} />Reporting</Link><div><button className="button secondary" onClick={() => downloadText(`${athlete.firstName}-${athlete.lastName}-report.csv`, reportToCsv(report))}><Download size={17} />CSV</button><button className="button primary" onClick={() => window.print()}><Printer size={17} />Print report</button></div></div>
    <article className="report-document">
      <section className="report-sheet report-cover">
        <ReportHeader brand={brand} title={identity} subtitle={`${athlete.sports.join(' / ') || 'Sport not set'} · ${athlete.positions.join(' / ') || 'Position not set'} · Grade ${athlete.grade || 'not set'} · ${athlete.group}`} date={report.latestSession?.date} version={`${version.name} · v${version.version}`} profile={report.profile.name} />
        {!report.complete && <Notice tone="warning"><strong>Incomplete assessment.</strong> A point total is intentionally unavailable. Missing required tests: {report.missing.join(', ') || 'No published assessment'}.</Notice>}
        <div className="report-cover-grid">
          <div className="report-athlete-summary"><div className="report-avatar">{athlete.photoDataUrl ? <img src={athlete.photoDataUrl} alt="" /> : initials(athlete.firstName, athlete.lastName)}</div><div><p className="eyebrow">Latest published assessment</p><h2>{report.complete ? `${report.overall} of ${report.maxPoints} points` : 'Incomplete battery'}</h2><p>Each testing grade contributes 0 to 4 points. The total is the direct sum of the published grades shown in this report.</p></div><ScoreBadge score={report.overall} maxPoints={report.maxPoints} label="Point total" /></div>
          <div className="report-radar-panel"><div className="section-heading"><div><p className="eyebrow">Percentile shape</p><h2>{report.profile.name}</h2></div>{report.percentileAverage !== null && <strong>{report.percentileAverage}th avg.</strong>}</div><RadarChart scores={report.scores} label={report.profile.name} /><p className="report-method-note">Percentiles compare this athlete only with published results assigned to the same standards version and comparison archetype. A minimum of two peers is required for an axis.</p></div>
        </div>
        <div className="report-summary-strip"><div><span>Tests reported</span><strong>{report.scores.length}</strong></div><div><span>Comparison archetype</span><strong>{report.profile.name}</strong></div><div><span>Standards version</span><strong>v{version.version}</strong></div><div><span>Published sessions</span><strong>{report.sessions.length}</strong></div></div>
        <ReportFooter athleteId={athlete.id} version={version.version} page="1 / 3" />
      </section>

      <section className="report-sheet">
        <ReportHeader brand={brand} title="Testing detail" subtitle={identity} date={report.latestSession?.date} version={`v${version.version}`} profile={report.profile.name} compact />
        <div className="report-section-heading"><div><p className="eyebrow">Metric level scoring</p><h2>Results, grades, and cohort context</h2></div><p>Every row uses the athlete and standards version identified above.</p></div>
        <div className="report-detail-table"><div className="report-detail-head"><span>Test</span><span>Result</span><span>Grade</span><span>Percentile</span><span>Interpretation</span></div>{report.scores.map((score) => <div className="report-detail-row" key={score.metric.id} style={{ '--band-color': score.band.color } as CSSProperties}><div><strong>{score.metric.name}</strong><small>{score.metric.direction === 'higher' ? 'Higher is better' : 'Lower is better'}</small></div><b>{score.value} <small>{score.metric.unit}</small></b><div className="report-grade"><strong>{score.points}/4</strong><span>{score.band.label}</span></div><div className="report-percentile"><strong>{score.percentile === undefined ? '—' : `${score.percentile}th`}</strong><span>{score.cohortSize ? `${score.cohortSize} athletes` : 'Needs peers'}</span></div><p>{score.band.meaning}</p></div>)}</div>
        {!report.scores.length && <Notice tone="warning">No published results are available for this athlete and assessment.</Notice>}
        <div className="report-definition"><strong>How to read percentiles</strong><p>A percentile describes relative rank within this report's specific comparison archetype. It does not change the 0 to 4 grade, the point total, or the stored measurement. Included starter bands are editable coaching defaults, not validated population norms.</p></div>
        <ReportFooter athleteId={athlete.id} version={version.version} page="2 / 3" />
      </section>

      <section className="report-sheet">
        <ReportHeader brand={brand} title="Coaching interpretation" subtitle={identity} date={report.latestSession?.date} version={`v${version.version}`} profile={report.profile.name} compact />
        <div className="report-columns report-insights"><section><div className="insight-title good"><TrendingUp /><div><p className="eyebrow">Strengths</p><h2>Protect and progress</h2></div></div>{report.strengths.length ? report.strengths.map((score) => <div className="insight-item" key={score.metric.id}><strong>{score.metric.name} · {score.points}/4</strong><span>{score.band.meaning}</span></div>) : <p className="muted">Complete and publish the battery to identify strengths.</p>}</section><section><div className="insight-title attention"><TrendingDown /><div><p className="eyebrow">Priorities</p><h2>Direct the next block</h2></div></div>{report.priorities.length ? report.priorities.map((score) => <div className="insight-item" key={score.metric.id}><strong>{score.metric.name} · {score.points}/4</strong><span>{score.band.meaning}</span></div>) : <p className="muted">Complete and publish the battery to identify priorities.</p>}</section></div>
        <section className="report-trend-section"><div className="report-section-heading"><div><p className="eyebrow">Longitudinal context</p><h2>Published assessment history</h2></div><p>{report.sessions.length} session{report.sessions.length === 1 ? '' : 's'} for this athlete only</p></div>{report.sessions.length ? <div className="trend-line">{[...report.sessions].reverse().map((session) => <div key={session.id}><span className="trend-dot" /><strong>{displayDate(session.date)}</strong><small>{session.name}</small></div>)}</div> : <p className="muted">No published trend data is available.</p>}</section>
        <section className="report-contract-grid"><div><span>Scoring contract</span><strong>Deterministic 0 to 4 grades</strong><p>Lower and higher direction are evaluated by the versioned bands. Missing required tests never produce a total.</p></div><div><span>Comparison contract</span><strong>Pinned archetype and version</strong><p>Percentiles use same-profile, same-version published peers. Editing standards never rewrites this historical report.</p></div><div><span>Data boundary</span><strong>Generated on this device</strong><p>No athlete record is sent to Arkitect, Arketype, Supabase, or another hosted service by this starter.</p></div></section>
        <ReportFooter athleteId={athlete.id} version={version.version} page="3 / 3" />
      </section>
    </article>
  </div>
}

function ReportHeader({ brand, title, subtitle, date, version, profile, compact = false }: { brand: ReturnType<typeof useBrandSettings>; title: string; subtitle: string; date?: string; version: string; profile: string; compact?: boolean }) {
  return <header className={`report-header ${compact ? 'compact' : ''}`}><div className="report-heading"><div className="report-brand-lockup">{brand.logoDataUrl ? <img src={brand.logoDataUrl} alt="" /> : <span /> }<div><strong>{brand.organizationName}</strong><small>{brand.productName} report</small></div></div><h1>{title}</h1><p>{subtitle}</p></div><dl className="report-meta"><div><dt>Assessment</dt><dd>{displayDate(date)}</dd></div><div><dt>Battery</dt><dd>{version}</dd></div><div><dt>Archetype</dt><dd>{profile}</dd></div></dl></header>
}

function ReportFooter({ athleteId, version, page }: { athleteId: string; version: string; page: string }) { return <footer><span>Athlete ID {athleteId} · Standards version {version}</span><strong>{page}</strong></footer> }
