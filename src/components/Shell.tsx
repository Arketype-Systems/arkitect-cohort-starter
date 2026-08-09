import { useState } from 'react'
import { Activity, BarChart3, ClipboardCheck, Database, Dumbbell, Menu, ShieldCheck, Users, X } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard', icon: BarChart3, end: true }, { to: '/athletes', label: 'Athletes', icon: Users }, { to: '/testing', label: 'Testing', icon: ClipboardCheck }, { to: '/reporting', label: 'Reporting', icon: Activity }, { to: '/standards', label: 'Standards', icon: Dumbbell }, { to: '/database', label: 'Local database', icon: Database }
]
export default function Shell() {
  const [open, setOpen] = useState(false)
  return <div className="app-shell">
    <aside className={`sidebar ${open ? 'open' : ''}`}><div className="brand"><span className="brand-mark">F</span><div><strong>Fieldhouse</strong><small>Assessment starter</small></div><button className="mobile-close icon-button" onClick={() => setOpen(false)} aria-label="Close navigation"><X /></button></div>
      <nav>{links.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}><Icon size={19} /><span>{label}</span></NavLink>)}</nav>
      <div className="data-boundary"><ShieldCheck size={18} /><div><strong>Stored on this device</strong><span>No athlete data is sent to Arkitect or a hosted service.</span></div></div>
    </aside>
    {open && <button className="scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <section className="main-column"><div className="topbar"><button className="menu-button icon-button" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu /></button><div className="topbar-title"><span className="status-dot" />Local database ready</div><div className="topbar-meta">Synthetic demo</div></div><main><Outlet /></main></section>
  </div>
}
