import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return <header className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{actions && <div className="header-actions">{actions}</div>}</header>
}
export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) { return <div className="empty-state"><div className="empty-icon"><AlertCircle size={22} /></div><h3>{title}</h3><p>{children}</p>{action}</div> }
export function StatusPill({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) { return <span className={`status-pill ${tone}`}>{children}</span> }
export function ScoreBadge({ score, label = 'Score' }: { score: number | null; label?: string }) { return <div className={`score-badge ${score === null ? 'neutral' : score >= 80 ? 'good' : score >= 60 ? 'ready' : 'attention'}`}><strong>{score ?? 'Incomplete'}</strong><span>{score === null ? 'Required metrics missing' : label}</span></div> }
export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'success' | 'warning' }) { return <div className={`notice ${tone}`}>{tone === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}<div>{children}</div></div> }
export function Progress({ value, max = 100 }: { value: number; max?: number }) { return <div className="progress" aria-label={`${value} of ${max}`}><span style={{ width: `${Math.min(100, value / max * 100)}%` }} /></div> }
