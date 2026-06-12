import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAdmin } from '../hooks/useAdmin.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

export default function ModelListPage() {
  const { modelName }       = useParams()
  const { models, authFetch, getModelPermissions } = useAdmin()

  const model = models.find(m => m.name.toLowerCase() === modelName)
  const perms = model ? getModelPermissions(model.name) : { view: true, create: true, edit: true, delete: true }

  const [data,       setData]       = useState([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search,     setSearch]     = useState('')
  const [filters,    setFilters]    = useState({})
  const [sortField,  setSortField]  = useState(model?.list?.sort?.field ?? 'id')
  const [sortDir,    setSortDir]    = useState(model?.list?.sort?.dir   ?? 'asc')
  const [loading,    setLoading]    = useState(true)
  const [selected,   setSelected]   = useState(new Set())
  const [confirmDelete, setConfirmDelete] = useState(null) // { id?, bulk? }

  const fetchData = useCallback(async () => {
    if (!model) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page,
        perPage:   model.list.perPage ?? 20,
        sortField,
        sortDir,
      })
      if (search) params.set('search', search)
      Object.entries(filters).forEach(([k, v]) => v && params.set(`filters[${k}]`, v))

      const res = await authFetch(`/${model.name.toLowerCase()}?${params}`)
      setData(res.data ?? [])
      setTotal(res.total ?? 0)
      setTotalPages(res.totalPages ?? 1)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [model, page, search, filters, sortField, sortDir, authFetch])

  useEffect(() => { fetchData() }, [fetchData])

  // Reset page quand search/filters/tri changent
  useEffect(() => { setPage(1) }, [search, filters, sortField, sortDir])

  function handleSort(colName) {
    if (sortField === colName) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(colName)
      setSortDir('asc')
    }
  }

  async function execDelete(id) {
    await authFetch(`/${model.name.toLowerCase()}/${id}`, { method: 'DELETE' })
    setConfirmDelete(null)
    fetchData()
  }

  async function execBulkDelete() {
    await authFetch(`/${model.name.toLowerCase()}/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ ids: [...selected] }),
    })
    setSelected(new Set())
    setConfirmDelete(null)
    fetchData()
  }

  if (!model) return <p style={{ color: 'var(--pk-sub)' }}>Modèle introuvable</p>

  const columns = model.list.columns ?? model.list.fields.map(f => ({ name: f }))

  // Colonnes cliquables → lien vers la page d'édition
  // Par défaut : id + première colonne (comme Django)
  const linkColumns = new Set(
    model.list.displayLinks
      ?? [columns[0]?.name, 'id'].filter(Boolean)
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--pk-ink)' }}>
            {model.labelPlural ?? model.name}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--pk-sub)', marginTop: 2 }}>
            {total} enregistrement{total !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Actions custom sur la sélection */}
        {model.actions?.length > 0 && selected.size > 0 && (
          <ActionsDropdown
            actions={model.actions.filter(a => a.context !== 'row')}
            onAction={async (action) => {
              await authFetch(`/${model.name.toLowerCase()}/actions/${encodeURIComponent(action.label)}`, {
                method: 'POST',
                body: JSON.stringify({ ids: [...selected] }),
              })
              fetchData()
            }}
          />
        )}

        {perms.delete && selected.size > 0 && (
          <button onClick={() => setConfirmDelete({ bulk: true })} style={btnDanger}>
            Supprimer {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
          </button>
        )}

        {/* Export */}
        <ExportMenu
          onExport={async (format) => {
            const params = new URLSearchParams({ perPage: 9999, sortField, sortDir })
            if (search) params.set('search', search)
            Object.entries(filters).forEach(([k, v]) => v && params.set(`filters[${k}]`, v))
            const res = await authFetch(`/${model.name.toLowerCase()}?${params}`)
            downloadExport(res.data ?? [], format, model.name)
          }}
        />

        {perms.create && (
          <Link to={`/model/${modelName}/new`} style={btnPrimary}>
            + Nouveau
          </Link>
        )}
      </div>

      {/* Barre de recherche + filtres */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {model.list.search?.length > 0 && (
          <input
            type="text"
            placeholder={`Rechercher…`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, maxWidth: 260 }}
          />
        )}
        {(model.list.filterConfig ?? []).map(f => (
          <FilterWidget
            key={f.name}
            config={f}
            value={filters[f.name] ?? ''}
            onChange={v => setFilters(prev => ({ ...prev, [f.name]: v }))}
          />
        ))}
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--pk-surface)',
        border: '1px solid var(--pk-border)',
        borderRadius: 'var(--pk-radius-lg)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--pk-muted)', fontSize: 14 }}>
            Chargement…
          </div>
        ) : data.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--pk-muted)', fontSize: 14 }}>
            Aucun résultat
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--pk-border)' }}>
                  {perms.delete && (
                    <th style={thStyle}>
                      <input
                        type="checkbox"
                        checked={selected.size === data.length}
                        onChange={e => setSelected(e.target.checked ? new Set(data.map(r => r.id)) : new Set())}
                      />
                    </th>
                  )}
                  {columns.map(col => (
                    <th
                      key={col.name}
                      style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort(col.name)}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {col.name}
                        {sortField === col.name ? (
                          <span style={{ fontSize: 10, color: 'var(--pk-accent)' }}>
                            {sortDir === 'asc' ? '↑' : '↓'}
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, color: 'var(--pk-muted)', opacity: 0.4 }}>↕</span>
                        )}
                      </span>
                    </th>
                  ))}
                  <th style={{ ...thStyle, width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {data.map(row => (
                  <tr
                    key={row.id}
                    style={{ borderBottom: '1px solid var(--pk-border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--pk-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {perms.delete && (
                      <td style={tdStyle}>
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={e => {
                            const next = new Set(selected)
                            e.target.checked ? next.add(row.id) : next.delete(row.id)
                            setSelected(next)
                          }}
                        />
                      </td>
                    )}
                    {columns.map(col => (
                      <td key={col.name} style={tdStyle}>
                        {linkColumns.has(col.name) ? (
                          <Link
                            to={`/model/${modelName}/${row.id}`}
                            style={{
                              color: 'var(--pk-accent)',
                              textDecoration: 'none',
                              fontWeight: 500,
                            }}
                          >
                            <CellValue value={row[col.name]} type={col.type} />
                          </Link>
                        ) : (
                          <CellValue value={row[col.name]} type={col.type} />
                        )}
                      </td>
                    ))}
                    {perms.delete && (
                      <td style={tdStyle}>
                        <button
                          onClick={() => setConfirmDelete({ id: row.id })}
                          style={{
                            fontSize: 12, color: 'var(--pk-danger)',
                            background: 'none', border: 'none',
                            cursor: 'pointer', fontWeight: 500, padding: 0,
                          }}
                        >
                          Suppr.
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialogue de confirmation de suppression */}
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={confirmDelete?.bulk
          ? `Supprimer ${selected.size} enregistrement${selected.size > 1 ? 's' : ''} ?`
          : 'Supprimer cet enregistrement ?'
        }
        message={confirmDelete?.bulk
          ? `Cette action est irréversible. Les ${selected.size} enregistrement${selected.size > 1 ? 's' : ''} sélectionné${selected.size > 1 ? 's' : ''} seront définitivement supprimé${selected.size > 1 ? 's' : ''}.`
          : 'Cette action est irréversible. L\'enregistrement sera définitivement supprimé.'
        }
        onConfirm={() => confirmDelete?.bulk ? execBulkDelete() : execDelete(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16 }}>
          <PaginBtn disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</PaginBtn>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce((acc, p, i, arr) => {
              if (i > 0 && p - arr[i-1] > 1) acc.push('…')
              acc.push(p)
              return acc
            }, [])
            .map((p, i) => typeof p === 'string'
              ? <span key={i} style={{ padding: '0 4px', color: 'var(--pk-muted)' }}>…</span>
              : <PaginBtn key={p} active={p === page} onClick={() => setPage(p)}>{p}</PaginBtn>
            )
          }
          <PaginBtn disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>→</PaginBtn>
        </div>
      )}
    </div>
  )
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function CellValue({ value, type }) {
  if (value === null || value === undefined) return <span style={{ color: 'var(--pk-muted)' }}>—</span>
  if (typeof value === 'boolean') return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
      background: value ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)',
      color: value ? 'var(--pk-success)' : 'var(--pk-danger)',
    }}>
      {value ? 'Oui' : 'Non'}
    </span>
  )
  if (type === 'datetime' || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value))) {
    return <span>{new Date(value).toLocaleDateString('fr')}</span>
  }
  const str = String(value)
  return <span title={str}>{str.length > 40 ? str.slice(0, 40) + '…' : str}</span>
}

function FilterWidget({ config, value, onChange }) {
  if (config.filterWidget === 'boolean') {
    return (
      <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
        <option value="">Tous</option>
        <option value="true">Oui</option>
        <option value="false">Non</option>
      </select>
    )
  }

  if (config.filterWidget === 'enum-select' && config.enumValues?.length > 0) {
    return (
      <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
        <option value="">Tous</option>
        {config.enumValues.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    )
  }

  // Texte libre
  return (
    <input
      type="text"
      placeholder={`Filtrer ${config.name}…`}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ ...inputStyle, maxWidth: 160 }}
    />
  )
}

function PaginBtn({ children, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 32, height: 32, borderRadius: 6, border: '1px solid var(--pk-border)',
        background: active ? 'var(--pk-accent)' : 'var(--pk-surface)',
        color: active ? '#fff' : disabled ? 'var(--pk-muted)' : 'var(--pk-ink)',
        fontSize: 13, fontWeight: 500, cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

// ── Styles réutilisables ──────────────────────────────────────────────────────

const inputStyle = {
  padding: '6px 10px', border: '1px solid var(--pk-border)',
  borderRadius: 'var(--pk-radius)', fontSize: 13,
  color: 'var(--pk-ink)', background: 'var(--pk-surface)', outline: 'none',
}

const thStyle = {
  padding: '10px 14px', textAlign: 'left', fontWeight: 600,
  fontSize: 12, color: 'var(--pk-sub)', whiteSpace: 'nowrap',
  background: 'var(--pk-bg)',
}

const tdStyle = {
  padding: '10px 14px', color: 'var(--pk-ink)', verticalAlign: 'middle',
}

function ExportMenu({ onExport }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '7px 12px', fontSize: 13, fontWeight: 500,
          background: 'var(--pk-surface)', color: 'var(--pk-sub)',
          border: '1px solid var(--pk-border)', borderRadius: 'var(--pk-radius)',
          cursor: 'pointer',
        }}
      >
        Exporter
        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, zIndex: 100,
          marginTop: 4, background: 'var(--pk-surface)',
          border: '1px solid var(--pk-border)', borderRadius: 'var(--pk-radius)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: 140,
        }}>
          {['CSV', 'JSON'].map(fmt => (
            <button
              key={fmt}
              onClick={() => { setOpen(false); onExport(fmt.toLowerCase()) }}
              style={{
                display: 'block', width: '100%', padding: '8px 14px',
                textAlign: 'left', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 13, color: 'var(--pk-ink)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--pk-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              Télécharger {fmt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function downloadExport(data, format, modelName) {
  let content, type, ext

  if (format === 'json') {
    content = JSON.stringify(data, null, 2)
    type    = 'application/json'
    ext     = 'json'
  } else {
    // CSV : en-têtes depuis la première ligne, valeurs séparées par virgule
    if (!data.length) return
    const keys    = Object.keys(data[0])
    const rows    = data.map(row =>
      keys.map(k => {
        const v = row[k]
        if (v === null || v === undefined) return ''
        const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s
      }).join(',')
    )
    content = [keys.join(','), ...rows].join('\n')
    type    = 'text/csv'
    ext     = 'csv'
  }

  const blob = new Blob([content], { type })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${modelName.toLowerCase()}-export.${ext}`
  a.click()
  URL.revokeObjectURL(url)
}

function ActionsDropdown({ actions, onAction }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '7px 12px', fontSize: 13, fontWeight: 500,
          background: 'var(--pk-surface)', color: 'var(--pk-ink)',
          border: '1px solid var(--pk-border)', borderRadius: 'var(--pk-radius)',
          cursor: 'pointer',
        }}
      >
        Actions
        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, zIndex: 100,
          marginTop: 4, background: 'var(--pk-surface)',
          border: '1px solid var(--pk-border)', borderRadius: 'var(--pk-radius)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: 160,
        }}>
          {actions.map(action => (
            <button
              key={action.label}
              onClick={() => { setOpen(false); onAction(action) }}
              style={{
                display: 'block', width: '100%', padding: '8px 14px',
                textAlign: 'left', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 13, color: 'var(--pk-ink)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--pk-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const btnPrimary = {
  display: 'inline-flex', alignItems: 'center',
  background: 'var(--pk-accent)', color: '#fff',
  border: 'none', borderRadius: 'var(--pk-radius)',
  padding: '7px 14px', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', textDecoration: 'none',
}

const btnDanger = {
  background: 'var(--pk-danger-bg)', color: 'var(--pk-danger)',
  border: '1px solid var(--pk-danger)', borderRadius: 'var(--pk-radius)',
  padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
