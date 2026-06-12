import { useState, useEffect, useRef, useCallback } from 'react'
import { useAdmin } from '../hooks/useAdmin.jsx'

// Champ autocomplete pour les FK Prisma
// props:
//   relatedModel — nom PascalCase du modèle lié (ex: "Category")
//   value        — ID actuellement sélectionné
//   onChange     — callback(newId)
//   required     — boolean
//   error        — message d'erreur éventuel
export default function RelationSelect({ relatedModel, value, onChange, required, error }) {
  const { authFetch } = useAdmin()
  const [query,       setQuery]       = useState('')
  const [options,     setOptions]     = useState([])
  const [open,        setOpen]        = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [displayLabel, setDisplayLabel] = useState('')
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  const modelKey = relatedModel.toLowerCase()

  // Charger l'option courante au montage (pour afficher le label si value déjà set)
  useEffect(() => {
    if (!value) { setDisplayLabel(''); return }
    authFetch(`/${modelKey}/${value}`)
      .then(res => {
        const record = res.data
        setDisplayLabel(getLabel(record))
      })
      .catch(() => setDisplayLabel(String(value)))
  }, [value, modelKey])

  const search = useCallback((q) => {
    setLoading(true)
    authFetch(`/${modelKey}?search=${encodeURIComponent(q)}&perPage=20`)
      .then(res => setOptions(res.data ?? []))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false))
  }, [modelKey, authFetch])

  function handleInputChange(e) {
    const q = e.target.value
    setQuery(q)
    setOpen(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 300)
  }

  function handleSelect(record) {
    onChange(record.id)
    setDisplayLabel(getLabel(record))
    setQuery('')
    setOpen(false)
  }

  function handleClear() {
    onChange(null)
    setDisplayLabel('')
    setQuery('')
  }

  // Fermer le dropdown si clic en dehors
  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const hasError = Boolean(error)

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Champ d'affichage — valeur sélectionnée ou recherche */}
      <div style={{
        display: 'flex', alignItems: 'center',
        border: `1px solid ${hasError ? 'var(--pk-danger)' : 'var(--pk-border)'}`,
        borderRadius: 'var(--pk-radius)',
        background: 'var(--pk-surface)',
        overflow: 'hidden',
      }}>
        <input
          type="text"
          placeholder={displayLabel || `Rechercher ${relatedModel}…`}
          value={query}
          onFocus={() => { setOpen(true); search(query) }}
          onChange={handleInputChange}
          required={required && !value}
          style={{
            flex: 1, padding: '7px 10px',
            border: 'none', outline: 'none',
            fontSize: 13, color: 'var(--pk-ink)',
            background: 'transparent',
          }}
        />
        {/* Badge valeur sélectionnée */}
        {value && !query && (
          <span style={{
            fontSize: 11, padding: '2px 6px',
            background: 'var(--pk-accent-bg)',
            color: 'var(--pk-accent)',
            margin: '0 4px',
            borderRadius: 4,
            maxWidth: 120, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {displayLabel || value}
          </span>
        )}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              padding: '0 8px', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--pk-muted)', fontSize: 14,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--pk-surface)',
          border: '1px solid var(--pk-border)',
          borderRadius: 'var(--pk-radius)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          marginTop: 4,
          maxHeight: 220,
          overflowY: 'auto',
        }}>
          {loading ? (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--pk-muted)' }}>
              Chargement…
            </div>
          ) : options.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--pk-muted)' }}>
              Aucun résultat
            </div>
          ) : (
            options.map(record => (
              <button
                key={record.id}
                type="button"
                onMouseDown={() => handleSelect(record)}
                style={{
                  display: 'block', width: '100%',
                  padding: '8px 12px', textAlign: 'left',
                  background: record.id === value ? 'var(--pk-accent-bg)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  fontSize: 13, color: 'var(--pk-ink)',
                }}
                onMouseEnter={e => { if (record.id !== value) e.currentTarget.style.background = 'var(--pk-bg)' }}
                onMouseLeave={e => { if (record.id !== value) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontWeight: 500 }}>{getLabel(record)}</span>
                <span style={{ fontSize: 11, color: 'var(--pk-muted)', marginLeft: 6 }}>#{record.id}</span>
              </button>
            ))
          )}
        </div>
      )}

      {error && (
        <p style={{ fontSize: 11, color: 'var(--pk-danger)', marginTop: 4, fontWeight: 500 }}>
          {error}
        </p>
      )}
    </div>
  )
}

// Heuristique : trouver le meilleur label pour un enregistrement
// Cherche en priorité : name, title, label, firstName+lastName, email, puis id
function getLabel(record) {
  if (!record) return ''
  if (record.name)  return record.name
  if (record.title) return record.title
  if (record.label) return record.label
  if (record.firstName) return `${record.firstName} ${record.lastName ?? ''}`.trim()
  if (record.email) return record.email
  return `#${record.id}`
}
