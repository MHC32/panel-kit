import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '../hooks/useAdmin.jsx'

// Recherche globale — cherche dans tous les modèles qui ont search configuré
// Accessible via la Topbar
export default function GlobalSearch() {
  const { models, authFetch } = useAdmin()
  const navigate    = useNavigate()
  const [query,     setQuery]   = useState('')
  const [results,   setResults] = useState([])
  const [loading,   setLoading] = useState(false)
  const [open,      setOpen]    = useState(false)
  const debounceRef = useRef(null)
  const inputRef    = useRef(null)
  const containerRef = useRef(null)

  // Modèles qui ont des champs de recherche configurés
  const searchableModels = models.filter(m => m.list.search?.length > 0)

  const search = useCallback(async (q) => {
    if (!q.trim() || searchableModels.length === 0) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const fetches = searchableModels.map(m =>
        authFetch(`/${m.name.toLowerCase()}?search=${encodeURIComponent(q)}&perPage=5`)
          .then(res => ({
            model: m,
            items: res.data ?? [],
          }))
          .catch(() => ({ model: m, items: [] }))
      )
      const groups = await Promise.all(fetches)
      setResults(groups.filter(g => g.items.length > 0))
    } finally {
      setLoading(false)
    }
  }, [searchableModels, authFetch])

  function handleChange(e) {
    const q = e.target.value
    setQuery(q)
    setOpen(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 300)
  }

  function handleSelect(model, record) {
    navigate(`/model/${model.name.toLowerCase()}/${record.id}`)
    setQuery('')
    setOpen(false)
    setResults([])
  }

  // Fermer si clic en dehors
  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Raccourci clavier : Ctrl+K / Cmd+K
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'var(--pk-bg)', border: '1px solid var(--pk-border)',
        borderRadius: 'var(--pk-radius)', padding: '5px 10px',
      }}>
        <svg width="13" height="13" fill="none" stroke="var(--pk-muted)" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="Rechercher… (Ctrl+K)"
          value={query}
          onChange={handleChange}
          onFocus={() => { setOpen(true); if (query) search(query) }}
          style={{
            flex: 1, border: 'none', outline: 'none',
            fontSize: 13, background: 'transparent', color: 'var(--pk-ink)',
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setOpen(false) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pk-muted)', padding: 0, lineHeight: 1 }}
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown des résultats */}
      {open && (query || results.length > 0) && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
          marginTop: 4, background: 'var(--pk-surface)',
          border: '1px solid var(--pk-border)', borderRadius: 'var(--pk-radius-lg)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          maxHeight: 360, overflowY: 'auto',
        }}>
          {loading ? (
            <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--pk-muted)' }}>
              Recherche en cours…
            </div>
          ) : results.length === 0 && query ? (
            <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--pk-muted)' }}>
              Aucun résultat pour "{query}"
            </div>
          ) : (
            results.map(group => (
              <div key={group.model.name}>
                {/* En-tête groupe */}
                <div style={{
                  padding: '6px 14px 4px',
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'var(--pk-muted)',
                  borderTop: '1px solid var(--pk-border)',
                }}>
                  {group.model.labelPlural ?? group.model.name}
                </div>
                {/* Résultats */}
                {group.items.map(record => (
                  <button
                    key={record.id}
                    onMouseDown={() => handleSelect(group.model, record)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '7px 14px',
                      background: 'none', border: 'none',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--pk-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ fontSize: 13, color: 'var(--pk-ink)', fontWeight: 500, flex: 1 }}>
                      {getRecordLabel(record)}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--pk-muted)' }}>#{record.id}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function getRecordLabel(record) {
  if (record.name)      return record.name
  if (record.title)     return record.title
  if (record.firstName) return `${record.firstName} ${record.lastName ?? ''}`.trim()
  if (record.email)     return record.email
  return `#${record.id}`
}
