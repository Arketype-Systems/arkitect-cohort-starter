import type { MetricScore } from '../lib/types'

export function RadarChart({ scores, label }: { scores: MetricScore[]; label: string }) {
  const plotted = scores.filter((score) => score.percentile !== undefined)
  if (plotted.length < 3) return <div className="radar-unavailable"><strong>Percentile profile unavailable</strong><p>At least three tests with two or more athletes in the same comparison archetype are required.</p></div>
  const size = 360; const center = size / 2; const radius = 116; const point = (index: number, value: number) => { const angle = -Math.PI / 2 + index * Math.PI * 2 / plotted.length; return [center + Math.cos(angle) * radius * value / 100, center + Math.sin(angle) * radius * value / 100] as const }
  const rings = [25, 50, 75, 100]
  const polygon = plotted.map((score, index) => point(index, score.percentile ?? 0).join(',')).join(' ')
  return <figure className="radar-chart"><svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label} percentile radar chart`}>{rings.map((ring) => <polygon key={ring} className="radar-ring" points={plotted.map((_, index) => point(index, ring).join(',')).join(' ')} />)}{plotted.map((score, index) => { const [x, y] = point(index, 100); const [labelX, labelY] = point(index, 123); return <g key={score.metric.id}><line className="radar-axis" x1={center} y1={center} x2={x} y2={y} /><text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle">{score.metric.shortName}</text></g> })}<polygon className="radar-shape" points={polygon} />{plotted.map((score, index) => { const [x, y] = point(index, score.percentile ?? 0); return <g key={score.metric.id}><circle className="radar-point" cx={x} cy={y} r="5" /><text className="radar-value" x={x} y={y - 11} textAnchor="middle">{score.percentile}</text></g> })}</svg><figcaption>Percentile rank within {label}. Every axis uses the latest published result from athletes scored under this profile and standards version.</figcaption></figure>
}
