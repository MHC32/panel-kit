import { Link, useOutletContext } from 'react-router-dom'
import { useAdmin } from '../hooks/useAdmin.jsx'
import { modelIconKey, ICONS } from '../lib/modelIcon.jsx'

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
  const iconKey = modelIconKey(model.name)
  const icon    = ICONS[iconKey] ?? ICONS.table

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
        width: 36, height: 36,
        borderRadius: 10,
        background: 'var(--pk-accent-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 12,
        color: 'var(--pk-accent)',
      }}>
        {icon}
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pk-ink)', marginBottom: 2 }}>
        {model.labelPlural ?? model.name}
      </p>
      <p style={{ fontSize: 11, color: 'var(--pk-muted)' }}>
        {model.list.fields.length} colonne{model.list.fields.length !== 1 ? 's' : ''}
      </p>
    </Link>
  )
}
