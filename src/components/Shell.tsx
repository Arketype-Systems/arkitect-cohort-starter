import { useState, type CSSProperties } from 'react'
import { Activity, BarChart3, ClipboardCheck, Database, Dumbbell, Menu, Radar, Settings, ShieldCheck, Trophy, Users, X } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useBrandSettings } from '../lib/branding'

const primaryLinks = [
  { to: '/', label: 'Dashboard', icon: BarChart3, end: true },
  { to: '/athletes', label: 'Athletes', icon: Users },
  { to: '/testing', label: 'Testing', icon: ClipboardCheck },
  { to: '/database', label: 'Database', icon: Database },
  { to: '/standards', label: 'Standards', icon: Dumbbell }
]
const insightLinks = [
  { to: '/reporting', label: 'Reporting', icon: Activity },
  { to: '/rankings', label: 'Rankings', icon: Trophy },
  { to: '/settings', label: 'Settings', icon: Settings }
]
function NavGroup({ links, close }: { links: typeof primaryLinks; close: () => void }) { return <>{links.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={close}><Icon size={19} /><span>{label}</span></NavLink>)}</> }
export default function Shell() {
  const [open, setOpen] = useState(false); const brand = useBrandSettings(); const style = { '--green': brand.primaryColor, '--green-dark': brand.primaryColor, '--lime': brand.accentColor, '--ink': brand.inkColor, '--brand-primary': brand.primaryColor, '--brand-accent': brand.accentColor, '--brand-shell': brand.inkColor, '--body-font': brand.bodyFont, '--display-font': brand.displayFont } as CSSProperties
  return <div className={`app-shell brand-${brand.direction}`} style={style}>
    <aside className={`sidebar ${open ? 'open' : ''}`}><div className="brand">{brand.logoDataUrl ? <img className="brand-logo" src={brand.logoDataUrl} alt="" /> : <span className="brand-mark"><Radar size={19} /></span>}<div><strong>{brand.organizationName}</strong><small>{brand.productName}</small></div><button className="mobile-close icon-button" onClick={() => setOpen(false)} aria-label="Close navigation"><X /></button></div>
      <nav><NavGroup links={primaryLinks} close={() => setOpen(false)} /><div className="nav-break" /><NavGroup links={insightLinks} close={() => setOpen(false)} /></nav>
      <div className="data-boundary"><ShieldCheck size={18} /><div><strong>Stored on this device</strong><span>Supabase is not connected. No athlete data leaves this browser.</span></div></div>
    </aside>
    {open && <button className="scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <section className="main-column"><div className="topbar"><button className="menu-button icon-button" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu /></button><div className="topbar-title"><span className="status-dot" /><span><b>DEVICE DATABASE</b> IndexedDB connected</span></div><div className="topbar-meta">Synthetic demo</div></div><main><Outlet /></main></section>
  </div>
}
