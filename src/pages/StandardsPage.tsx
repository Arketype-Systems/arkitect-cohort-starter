import { ArrowDown, ArrowUp, Info } from 'lucide-react'
import { Notice, PageHeader, StatusPill } from '../components/ui'
import { useData } from '../lib/useData'
import { displayDate } from '../lib/utils'

export default function StandardsPage() {
  const { standards } = useData(); const version = standards[0]; if (!version) return null
  return <div className="page"><PageHeader eyebrow="Scoring contract" title="Standards" description="Inspect the exact metrics, directions, weights, and five bands used in every score." actions={<StatusPill tone="warning">Editable starter standards</StatusPill>} />
    <Notice tone="warning"><strong>Not validated population norms.</strong> These synthetic bands create a coherent working example. A qualified coach must replace and version them before making population claims or consequential decisions.</Notice>
    <section className="standards-summary panel"><div><span>Standard</span><strong>{version.name}</strong></div><div><span>Version</span><strong>{version.version}</strong></div><div><span>Effective</span><strong>{displayDate(version.effectiveDate)}</strong></div><div><span>Required score weight</span><strong>{version.metrics.reduce((sum, m) => sum + m.weight, 0)}%</strong></div></section>
    <section className="standards-list">{version.metrics.map((metric) => <article className="panel standard-card" key={metric.id}><header><div><div className="metric-title"><h2>{metric.name}</h2><StatusPill>{metric.required ? 'Required' : 'Optional'}</StatusPill></div><p>{metric.percentileContext}</p></div><div className="direction-card">{metric.direction === 'higher' ? <ArrowUp /> : <ArrowDown />}<span>{metric.direction === 'higher' ? 'Higher is better' : 'Lower is better'}</span><strong>{metric.weight}% weight</strong></div></header><div className="band-grid">{metric.bands.map((band, index) => <div key={band.label} style={{ borderTopColor: band.color }}><span>Band {index + 1}</span><strong>{band.label}</strong><b>{band.points} points</b><small>{band.min === undefined ? `< ${band.max}` : band.max === undefined ? `≥ ${band.min}` : `${band.min} to < ${band.max}`} {metric.unit}</small><p>{band.meaning}</p></div>)}</div></article>)}</section>
    <section className="panel incomplete-contract"><Info /><div><p className="eyebrow">Incomplete score contract</p><h2>Missing means Incomplete</h2><p>If any required metric is absent, invalid, or excluded, the application returns no overall score. It does not substitute averages, allocate missing weight, or combine measurements from another athlete. Every completed score carries standards version {version.version}.</p></div></section>
  </div>
}
