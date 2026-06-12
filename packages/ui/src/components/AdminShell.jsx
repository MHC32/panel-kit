import { useState } from 'react'
import { NavLink, useLocation, Outlet } from 'react-router-dom'
import { LayoutDashboard } from 'lucide-react'
import { useAdmin } from '../hooks/useAdmin.jsx'
import GlobalSearch from './GlobalSearch.jsx'
import { ModelIcon } from '../lib/modelIcon.jsx'

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
          <SidebarLink to="/dashboard" label="Dashboard" icon={<LayoutDashboard size={14} strokeWidth={1.8} />} />

          {/* Séparateur modèles */}
          {visibleModels.length > 0 && (
            <>
              <SidebarDivider label="Données" />
              {visibleModels.map(m => (
                <SidebarLink
                  key={m.name}
                  to={`/model/${m.name.toLowerCase()}`}
                  label={m.labelPlural ?? m.name}
                  icon={<ModelIcon name={m.name} size={14} />}
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
