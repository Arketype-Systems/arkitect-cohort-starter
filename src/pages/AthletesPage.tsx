import { Search, UserPlus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui'
import { db } from '../lib/db'
import { useData } from '../lib/useData'
import { initials } from '../lib/utils'

export default function AthletesPage() {
  const { athletes } = useData(); const [query, setQuery] = useState(''); const [sport, setSport] = useState('All'); const [group, setGroup] = useState('All'); const [adding, setAdding] = useState(false)
  const filtered = useMemo(() => athletes.filter((a) => `${a.firstName} ${a.lastName} ${a.position}`.toLowerCase().includes(query.toLowerCase()) && (sport === 'All' || a.sport === sport) && (group === 'All' || a.group === group)), [athletes, query, sport, group])
  const sports = [...new Set(athletes.map((a) => a.sport))].sort(); const groups = [...new Set(athletes.map((a) => a.group))].sort()
  async function addAthlete(formData: FormData) { await db.athletes.add({ id: crypto.randomUUID(), firstName: String(formData.get('firstName')), lastName: String(formData.get('lastName')), sport: String(formData.get('sport')), position: String(formData.get('position')), group: String(formData.get('group')), createdAt: new Date().toISOString() }); setAdding(false) }
  return <div className="page"><PageHeader eyebrow="Roster" title="Athletes" description="Manage the people attached to assessments and individual reports." actions={<button className="button primary" onClick={() => setAdding(true)}><UserPlus size={18} />Add athlete</button>} />
    <section className="filter-bar"><label className="search-field"><Search size={18} /><input aria-label="Search athletes" placeholder="Search by name or position" value={query} onChange={(e) => setQuery(e.target.value)} /></label><label><span>Sport</span><select value={sport} onChange={(e) => setSport(e.target.value)}><option>All</option>{sports.map((value) => <option key={value}>{value}</option>)}</select></label><label><span>Group</span><select value={group} onChange={(e) => setGroup(e.target.value)}><option>All</option>{groups.map((value) => <option key={value}>{value}</option>)}</select></label><span className="result-count">{filtered.length} athletes</span></section>
    <section className="athlete-grid">{filtered.map((athlete) => <Link className="athlete-card" key={athlete.id} to={`/athletes/${athlete.id}`}><div className="avatar">{initials(athlete.firstName, athlete.lastName)}</div><div className="athlete-card-copy"><h3>{athlete.firstName} {athlete.lastName}</h3><p>{athlete.sport} · {athlete.position || 'Position not set'}</p><span>{athlete.group}</span></div><div className="card-arrow">→</div></Link>)}</section>
    {adding && <div className="modal-backdrop" role="presentation"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-title"><div className="modal-header"><div><p className="eyebrow">Roster</p><h2 id="add-title">Add athlete</h2></div><button className="icon-button" aria-label="Close" onClick={() => setAdding(false)}><X /></button></div><form action={addAthlete}><div className="form-grid"><label>First name<input name="firstName" required /></label><label>Last name<input name="lastName" required /></label><label>Sport<input name="sport" required /></label><label>Position<input name="position" /></label><label className="wide">Group<input name="group" required /></label></div><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setAdding(false)}>Cancel</button><button className="button primary">Add athlete</button></div></form></div></div>}
  </div>
}
