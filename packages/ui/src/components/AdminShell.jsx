import { useState } from 'react'
import { NavLink, useLocation, Outlet } from 'react-router-dom'
import { useAdmin } from '../hooks/useAdmin.jsx'
import GlobalSearch from './GlobalSearch.jsx'

// ── Icône par modèle ──────────────────────────────────────────────────────────
// Décompose "InvoiceItem" → ["invoice","item"], cherche le premier mot-clé connu
const ICON_KEYWORDS = {
  user: 'person',     customer: 'person',  staff: 'person',    employee: 'person',  member: 'person',
  order: 'cart',      invoice: 'cart',     sale: 'cart',       purchase: 'cart',    booking: 'cart',
  product: 'box',     item: 'box',         inventory: 'box',   stock: 'box',        sku: 'box',
  category: 'tag',    tag: 'tag',          label: 'tag',       type: 'tag',
  payment: 'dollar',  transaction: 'dollar', wallet: 'dollar', price: 'dollar',
  room: 'building',   hotel: 'building',   tenant: 'building', property: 'building',
  setting: 'gear',    config: 'gear',      option: 'gear',
  post: 'doc',        article: 'doc',      page: 'doc',        content: 'doc',
}

function modelIcon(modelName) {
  const words = modelName.replace(/([A-Z])/g, ' $1').trim().toLowerCase().split(' ')
  for (const word of words) {
    if (ICON_KEYWORDS[word]) return ICON_KEYWORDS[word]
  }
  return 'table'
}

const ICONS = {
  person:   <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  cart:     <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  box:      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  tag:      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  dollar:   <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  building: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h6M3 15h6M15 9h6M15 15h6"/></svg>,
  gear:     <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>,
  doc:      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  table:    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>,
  dashboard:<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({ open, onClose }) {
  const { models, app, user, logout, getModelPermissions } = useAdmin()
  const visibleModels = models.filter(m => getModelPermissions(m.name).view)

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 40,
          }}
        />
      )}

      <aside style={{
        width: 220,
        minWidth: 220,
        background: 'var(--pk-rail)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: open ? 'fixed' : 'sticky',
        top: 0,
        left: 0,
        zIndex: open ? 50 : 'auto',
        flexShrink: 0,
        // Mobile : caché par défaut, visible si open
        transform: open ? 'translateX(0)' : undefined,
      }}>
        {/* Logo */}
        <div style={{
          height: 52,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <div style={{
            width: 30, height: 30,
            borderRadius: 8,
            background: 'var(--pk-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0,
          }}>
            {app.logo
              ? <img src={app.logo} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
              : (app.appName?.[0] ?? 'A').toUpperCase()
            }
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em' }}>
            {app.appName ?? 'Admin'}
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {/* Dashboard */}
          <SidebarLink to="/dashboard" label="Dashboard" icon={ICONS.dashboard} />

          {/* Séparateur modèles */}
          {visibleModels.length > 0 && (
            <>
              <SidebarDivider label="Données" />
              {visibleModels.map(m => (
                <SidebarLink
                  key={m.name}
                  to={`/model/${m.name.toLowerCase()}`}
                  label={m.labelPlural ?? m.name}
                  icon={ICONS[modelIcon(m.name)]}
                />
              ))}
            </>
          )}
        </nav>

        {/* User bas */}
        <div style={{
          padding: '10px 12px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28,
              borderRadius: '50%',
              background: 'var(--pk-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>
              {(user?.name?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#fff', fontSize: 12, fontWeight: 600, truncate: true, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name ?? user?.email ?? '—'}
              </p>
            </div>
            <button
              onClick={logout}
              title="Déconnexion"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.4)', padding: 4, borderRadius: 6,
                display: 'flex', alignItems: 'center',
              }}
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

function SidebarLink({ to, label, icon }) {
  const { pathname } = useLocation()
  const active = pathname === to || pathname.startsWith(to + '/')

  return (
    <NavLink
      to={to}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '7px 10px',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 500,
        textDecoration: 'none',
        marginBottom: 2,
        background: active ? 'var(--pk-rail-accent)' : 'transparent',
        color: active ? '#fff' : 'rgba(255,255,255,0.5)',
        transition: 'background 0.15s, color 0.15s',
        lineHeight: 1,
      }}
    >
      {/* Conteneur icône fixe — évite le décalage entre items */}
      <span style={{
        width: 16, height: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        opacity: active ? 1 : 0.6,
      }}>
        {icon}
      </span>
      <span style={{ lineHeight: 1 }}>{label}</span>
    </NavLink>
  )
}

function SidebarDivider({ label }) {
  return (
    <>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '6px 2px' }} />
      {label && (
        <p style={{
          fontSize: 10, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.2)',
          padding: '2px 10px 4px',
        }}>
          {label}
        </p>
      )}
    </>
  )
}

// ── Topbar ────────────────────────────────────────────────────────────────────

function Topbar({ onMenuClick, headerActionsSlot }) {
  const { user, logout } = useAdmin()
  const { pathname } = useLocation()

  const crumb = pathname === '/dashboard'
    ? 'Dashboard'
    : pathname.split('/').filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' / ')

  return (
    <header style={{
      height: 52,
      background: 'var(--pk-surface)',
      borderBottom: '1px solid var(--pk-border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 10,
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      {/* Bouton hamburger — visible uniquement mobile */}
      <button
        className="pk-hamburger"
        onClick={onMenuClick}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--pk-ink)', padding: 4, borderRadius: 6,
          display: 'flex', alignItems: 'center',
        }}
      >
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--pk-ink)' }}>
        {crumb}
      </span>
      <GlobalSearch />
      {headerActionsSlot}
    </header>
  )
}

// ── Shell principal ───────────────────────────────────────────────────────────

export default function AdminShell({ slots = {} }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Breakpoint CSS — sidebar cachée sous 768px */}
      <style>{`
        @media (max-width: 767px) {
          .pk-sidebar-static { display: none !important; }
        }
        @media (min-width: 768px) {
          .pk-hamburger { display: none !important; }
        }
      `}</style>

      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--pk-bg)' }}>

        {/* Sidebar desktop — statique */}
        <div className="pk-sidebar-static">
          <Sidebar open={false} onClose={() => {}} />
        </div>

        {/* Sidebar mobile — drawer overlay */}
        {mobileOpen && <Sidebar open={true} onClose={() => setMobileOpen(false)} />}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <Topbar
            onMenuClick={() => setMobileOpen(true)}
            headerActionsSlot={slots.headerActions}
          />
          <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            <Outlet context={{ slots }} />
          </main>
        </div>
      </div>
    </>
  )
}

function LogoutIcon() {
  return (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
    </svg>
  )
}
