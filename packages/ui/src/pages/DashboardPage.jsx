import { useState, useEffect } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { TrendingUp, Clock, ArrowRight } from 'lucide-react'
import { useAdmin } from '../hooks/useAdmin.jsx'
import { ModelIcon } from '../lib/modelIcon.jsx'

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'à l\'instant'
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  return `il y a ${d}j`
}

function formatCount(n) {
  if (n === null) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k'
  return String(n)
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton({ w = '100%', h = 14, radius = 6 }) {
  return (
    <div style={{
      width: w, height: h,
      borderRadius: radius,
      background: 'var(--pk-border)',
      animation: 'pk-pulse 1.4s ease-in-out infinite',
    }} />
  )
}

// ── KPI strip (featured models) ────────────────────────────────────────────

function KpiCard({ stat, loading }) {
  return (
    <Link
      to={`/model/${stat.name.toLowerCase()}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        background: 'var(--pk-surface)',
        border: '1px solid var(--pk-border)',
        borderRadius: 'var(--pk-radius-lg)',
        padding: '20px',
        textDecoration: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        flex: '1 1 160px',
        minWidth: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--pk-accent)'
        e.currentTarget.style.boxShadow = '0 0 0 3px var(--pk-accent-bg)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--pk-border)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Icône + flèche */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'var(--pk-accent-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--pk-accent)', flexShrink: 0,
        }}>
          <ModelIcon name={stat.name} size={18} />
        </div>
        <ArrowRight size={14} style={{ color: 'var(--pk-muted)', flexShrink: 0 }} />
      </div>

      {/* Count */}
      <div>
        {loading
          ? <Skeleton w="60px" h={28} radius={6} />
          : (
            <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--pk-ink)', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {formatCount(stat.count)}
            </p>
          )
        }
        <p style={{ fontSize: 12, color: 'var(--pk-muted)', marginTop: 4 }}>
          {stat.labelPlural ?? stat.name}
        </p>
      </div>

      {/* Dernière activité */}
      {stat.lastCreatedAt && !loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 'auto' }}>
          <Clock size={11} style={{ color: 'var(--pk-muted)', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: 'var(--pk-muted)' }}>
            {timeAgo(stat.lastCreatedAt)}
          </span>
        </div>
      )}
      {loading && <Skeleton w="80px" h={11} />}
    </Link>
  )
}

// ── Grille des modèles ─────────────────────────────────────────────────────

function ModelCard({ model, stat, loading }) {
  return (
    <Link
      to={`/model/${model.name.toLowerCase()}`}
      style={{
        display: 'block',
        background: 'var(--pk-surface)',
        border: '1px solid var(--pk-border)',
        borderRadius: 'var(--pk-radius-lg)',
        padding: '16px',
        textDecoration: 'none',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--pk-accent)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--pk-border)'}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 9,
        background: 'var(--pk-accent-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 10, color: 'var(--pk-accent)',
      }}>
        <ModelIcon name={model.name} size={16} />
      </div>

      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pk-ink)', marginBottom: 4 }}>
        {model.labelPlural ?? model.name}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {loading
          ? <Skeleton w="40px" h={12} />
          : (
            <span style={{ fontSize: 12, color: 'var(--pk-muted)', fontVariantNumeric: 'tabular-nums' }}>
              {stat?.count != null ? formatCount(stat.count) + ' entrée' + (stat.count !== 1 ? 's' : '') : '—'}
            </span>
          )
        }
        {stat?.lastCreatedAt && !loading && (
          <span style={{ fontSize: 11, color: 'var(--pk-muted)' }}>
            {timeAgo(stat.lastCreatedAt)}
          </span>
        )}
      </div>
    </Link>
  )
}

// ── Page principale ────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { slots = {} } = useOutletContext() ?? {}
  const { models, app, authFetch } = useAdmin()
  const [stats, setStats]   = useState([])   // [{ name, count, lastCreatedAt, featured }]
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authFetch('/dashboard')
      .then(d => { setStats(d.stats ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const statMap = Object.fromEntries(stats.map(s => [s.name, s]))

  const featuredModels = models.filter(m => m.featured)
  const allModels      = models

  return (
    <div>
      <style>{`
        @keyframes pk-pulse {
          0%, 100% { opacity: 1 }
          50%       { opacity: 0.4 }
        }
      `}</style>

      {/* Slot custom dev en tête */}
      {slots.dashboard && (
        <div style={{ marginBottom: 28 }}>{slots.dashboard}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--pk-ink)', marginBottom: 4, letterSpacing: '-0.02em' }}>
          {app.appName ?? 'Admin'}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--pk-muted)' }}>
          {models.length} modèle{models.length !== 1 ? 's' : ''} enregistré{models.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* KPI strip — uniquement si au moins un modèle featured */}
      {featuredModels.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <TrendingUp size={14} style={{ color: 'var(--pk-accent)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--pk-muted)' }}>
              Vue d'ensemble
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {featuredModels.map(m => (
              <KpiCard
                key={m.name}
                stat={{ ...m, ...(statMap[m.name] ?? { count: null, lastCreatedAt: null }) }}
                loading={loading}
              />
            ))}
          </div>
        </section>
      )}

      {/* Grille tous les modèles */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--pk-muted)' }}>
            Modèles
          </span>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
          gap: 10,
        }}>
          {allModels.map(m => (
            <ModelCard
              key={m.name}
              model={m}
              stat={statMap[m.name]}
              loading={loading}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
