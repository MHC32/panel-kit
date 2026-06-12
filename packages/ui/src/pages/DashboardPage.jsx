import { useOutletContext } from 'react-router-dom'
import { useAdmin } from '../hooks/useAdmin.jsx'

export default function DashboardPage() {
  const { slots = {} } = useOutletContext() ?? {}
  const { models, app } = useAdmin()

  return (
    <div>
      {/* Slot custom du dev — ses KPI cards s'affichent ici en premier */}
      {slots.dashboard && (
        <div style={{ marginBottom: 24 }}>
          {slots.dashboard}
        </div>
      )}

      {/* Stats auto-générées */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--pk-ink)', marginBottom: 4 }}>
          Bienvenue sur {app.appName ?? 'Admin'}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--pk-sub)' }}>
          {models.length} modèle{models.length !== 1 ? 's' : ''} enregistré{models.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 12,
      }}>
        {models.map(m => (
          <ModelCard key={m.name} model={m} />
        ))}
      </div>
    </div>
  )
}

function ModelCard({ model }) {
  return (
    <a
      href={`/model/${model.name.toLowerCase()}`}
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
        width: 32, height: 32,
        borderRadius: 8,
        background: 'var(--pk-accent-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 10,
      }}>
        <svg width="16" height="16" fill="none" stroke="var(--pk-accent)" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9h18M3 15h18M9 3v18"/>
        </svg>
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pk-ink)', marginBottom: 2 }}>
        {model.labelPlural ?? model.name}
      </p>
      <p style={{ fontSize: 11, color: 'var(--pk-muted)' }}>
        {model.list.fields.length} colonnes
      </p>
    </a>
  )
}
