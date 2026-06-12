// Boîte de dialogue de confirmation stylée — remplace window.confirm()
// Usage : <ConfirmDialog open={...} title="..." message="..." onConfirm={...} onCancel={...} danger />
export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, danger = true }) {
  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {/* Modale */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--pk-surface)',
            border: '1px solid var(--pk-border)',
            borderRadius: 'var(--pk-radius-lg)',
            padding: '24px 28px',
            maxWidth: 400,
            width: '90%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          }}
        >
          {/* Icône danger */}
          {danger && (
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'var(--pk-danger-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              <svg width="20" height="20" fill="none" stroke="var(--pk-danger)" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
          )}

          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--pk-ink)', marginBottom: 8 }}>
            {title}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--pk-sub)', marginBottom: 24, lineHeight: 1.5 }}>
            {message}
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={onCancel}
              style={{
                padding: '7px 16px', fontSize: 13, fontWeight: 500,
                background: 'var(--pk-bg)', color: 'var(--pk-ink)',
                border: '1px solid var(--pk-border)', borderRadius: 'var(--pk-radius)',
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              style={{
                padding: '7px 16px', fontSize: 13, fontWeight: 600,
                background: danger ? 'var(--pk-danger)' : 'var(--pk-accent)',
                color: '#fff',
                border: 'none', borderRadius: 'var(--pk-radius)',
                cursor: 'pointer',
              }}
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
