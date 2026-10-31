import { Suspense, useEffect, useState, type CSSProperties } from "react";
import {
  BarChart3,
  ClipboardCheck,
  Database,
  Dumbbell,
  Menu,
  Radar,
  Settings,
  ShieldCheck,
  Trophy,
  Users,
  X,
  FileText,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { contrastText, contrastRatio } from "../lib/branding-validation";
import { useBrandSettings } from "../lib/branding";
import { useDialogFocus } from "../lib/dialog-focus";
import { useData } from "../lib/useData";

const workLinks = [
  { to: "/", label: "Dashboard", icon: BarChart3, end: true },
  { to: "/athletes", label: "Athletes", icon: Users },
  { to: "/testing", label: "Testing", icon: ClipboardCheck },
  { to: "/reporting", label: "Reporting", icon: FileText },
  { to: "/rankings", label: "Rankings", icon: Trophy },
];
const setupLinks = [
  { to: "/standards", label: "Standards", icon: Dumbbell },
  { to: "/comparisons", label: "Comparison groups", icon: Users },
  { to: "/database", label: "Data and backup", icon: Database },
  { to: "/settings", label: "Settings", icon: Settings },
];
function NavGroup({
  links,
  close,
}: {
  links: typeof workLinks;
  close: () => void;
}) {
  return (
    <>
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={close}>
          <Icon size={18} />
          <span>{label}</span>
        </NavLink>
      ))}
    </>
  );
}
export default function Shell() {
  const [open, setOpen] = useState(false);
  const brand = useBrandSettings();
  useEffect(() => {
    document.title = `${brand.organizationName} · ${brand.productName}`;
  }, [brand.organizationName, brand.productName]);
  const data = useData();
  useDialogFocus();
  const synthetic =
    data.athletes.length > 0 &&
    data.athletes.every((athlete) => athlete.synthetic === true) &&
    data.sessions.every((session) => session.synthetic === true);
  const style = {
    "--green": brand.primaryColor,
    "--primary-contrast": contrastText(brand.primaryColor),
    "--brand-text":
      contrastRatio(brand.primaryColor, "#f2f5f6") >= 4.5
        ? brand.primaryColor
        : "#164e5a",
    "--green-dark": brand.primaryColor,
    "--lime": brand.accentColor,
    "--ink": "#17242b",
    "--shell-fg": contrastText(brand.inkColor),
    "--nav-active":
      contrastRatio(brand.accentColor, "#274650") >= 4.5
        ? brand.accentColor
        : contrastText("#274650"),
    "--brand-primary": brand.primaryColor,
    "--brand-accent": brand.accentColor,
    "--brand-shell": brand.inkColor,
    "--body-font": brand.bodyFont,
    "--display-font": brand.displayFont,
  } as CSSProperties;
  return (
    <div className={`app-shell brand-${brand.direction}`} style={style}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside
        className={`sidebar ${open ? "open" : ""}`}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label="Workspace navigation"
      >
        <div className="brand">
          {brand.logoDataUrl ? (
            <img className="brand-logo" src={brand.logoDataUrl} alt="" />
          ) : (
            <span className="brand-mark">
              <Radar size={22} />
            </span>
          )}
          <div>
            <strong>{brand.organizationName}</strong>
            <small>{brand.productName}</small>
          </div>
          <button
            className="mobile-close icon-button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X />
          </button>
        </div>
        <nav aria-label="Main navigation">
          <span className="nav-label">Workspace</span>
          <NavGroup links={workLinks} close={() => setOpen(false)} />
          <span className="nav-label nav-break">Setup</span>
          <NavGroup links={setupLinks} close={() => setOpen(false)} />
        </nav>
        <div className="data-boundary">
          <ShieldCheck size={18} />
          <div>
            <strong>Saved on this device</strong>
            <span>Export a backup to keep another copy.</span>
          </div>
        </div>
      </aside>
      {open && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <section className="main-column">
        <div className="topbar">
          <button
            className="menu-button icon-button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </button>
          <div className="topbar-title">
            <span className="status-dot" />
            <span>Assessment workspace</span>
          </div>
          <div className="topbar-meta">
            {synthetic
              ? "Synthetic demo"
              : data.athletes.length
                ? "Local workspace"
                : "Empty workspace"}
          </div>
        </div>
        <main id="main-content">
          {data.ready ? (
            <Suspense
              fallback={
                <div className="page" role="status">
                  Opening view…
                </div>
              }
            >
              <Outlet />
            </Suspense>
          ) : (
            <div className="page" role="status">
              Loading your saved records…
            </div>
          )}
        </main>
      </section>
    </div>
  );
}
