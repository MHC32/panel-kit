import { useState, useEffect } from 'react'
import { useAdmin } from '../hooks/useAdmin.jsx'

// Inline formset — sous-table dans le formulaire parent (équivalent TabularInline Django)
// Props:
//   inline      — config de l'inline ({ model, fk, label, extra, canAdd, canDelete, formFields })
//   parentId    — ID de l'enregistrement parent (null si nouveau)
//   onSaveRef   — ref callback(parentId) → appelé par le parent après son propre save
export default function InlineFormSet({ inline, parentId, registerSave }) {
  const { authFetch } = useAdmin()
  const modelKey = inline.model.toLowerCase()

  // Chaque row : { _id?, _deleted?, _new?, ...fields }
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(Boolean(parentId))

  // Charger les enregistrements existants
  useEffect(() => {
    if (!parentId) {
      setRows(buildEmptyRows(inline.extra))
      setLoading(false)
      return
    }

    setLoading(true)
    authFetch(`/${modelKey}?filters[${inline.fk}]=${parentId}&perPage=200`)
      .then(res => {
        const existing = (res.data ?? []).map(r => ({ ...r, _saved: true }))
        const empties  = buildEmptyRows(inline.extra)
        setRows([...existing, ...empties])
      })
      .catch(() => setRows(buildEmptyRows(inline.extra)))
      .finally(() => setLoading(false))
  }, [parentId])

  // Exposer la fonction save au parent via registerSave callback
  useEffect(() => {
    if (!registerSave) return
    registerSave(async (resolvedParentId) => {
      const ops = []

      for (const row of rows) {
        const isBlank = isEmptyRow(row, inline.formFields)

        if (row._saved && row._deleted) {
          // Supprimer
          ops.push(authFetch(`/${modelKey}/${row.id}`, { method: 'DELETE' }))
        } else if (row._saved && !row._deleted) {
          // Mettre à jour si modifié
          const data = extractData(row, inline.formFields, resolvedParentId, inline.fk)
          ops.push(authFetch(`/${modelKey}/${row.id}`, {
            method: 'PUT',
            body:   JSON.stringify(data),
          }))
        } else if (!row._saved && !isBlank) {
          // Créer
          const data = extractData(row, inline.formFields, resolvedParentId, inline.fk)
          ops.push(authFetch(`/${modelKey}`, {
            method: 'POST',
            body:   JSON.stringify(data),
          }))
        }
        // Lignes vides non-modifiées → ignorées
      }

      await Promise.all(ops)
    })
  }, [rows, inline, modelKey, registerSave])

  function updateRow(idx, field, value) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  function markDeleted(idx) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, _deleted: true } : r))
  }

  function addRow() {
    setRows(prev => [...prev, { _new: true }])
  }

  const visibleRows = rows.filter(r => !r._deleted)

  return (
    <div style={{
      background: 'var(--pk-surface)',
      border: '1px solid var(--pk-border)',
      borderRadius: 'var(--pk-radius-lg)',
      overflow: 'hidden',
      marginBottom: 16,
    }}>
      {/* En-tête */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--pk-border)',
        background: 'var(--pk-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--pk-sub)' }}>
          {inline.label}
          {visibleRows.filter(r => r._saved).length > 0 && (
            <span style={{
              marginLeft: 6, fontSize: 11, color: 'var(--pk-muted)',
              background: 'var(--pk-border)', padding: '1px 6px', borderRadius: 99,
            }}>
              {visibleRows.filter(r => r._saved).length}
            </span>
          )}
        </span>
        {inline.canAdd && (
          <button
            type="button"
            onClick={addRow}
            style={{
              fontSize: 12, padding: '3px 10px',
              background: 'var(--pk-accent-bg)', color: 'var(--pk-accent)',
              border: '1px solid var(--pk-accent)', borderRadius: 'var(--pk-radius)',
              cursor: 'pointer', fontWeight: 600,
            }}
          >
            + Ajouter
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '16px 20px', fontSize: 13, color: 'var(--pk-muted)' }}>
          Chargement…
        </div>
      ) : visibleRows.length === 0 ? (
        <div style={{ padding: '16px 20px', fontSize: 13, color: 'var(--pk-muted)', fontStyle: 'italic' }}>
          Aucun enregistrement lié.
          {inline.canAdd && <span> Cliquez sur "+ Ajouter" pour en créer.</span>}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--pk-border)' }}>
                {inline.formFields.map(f => (
                  <th key={f.name} style={thStyle}>{f.name}</th>
                ))}
                {inline.canDelete && <th style={{ ...thStyle, width: 40 }}></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                if (row._deleted) return null
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--pk-border)' }}>
                    {inline.formFields.map(f => (
                      <td key={f.name} style={tdStyle}>
                        <InlineCellInput
                          field={f}
                          value={row[f.name] ?? ''}
                          onChange={v => updateRow(idx, f.name, v)}
                        />
                      </td>
                    ))}
                    {inline.canDelete && (
                      <td style={tdStyle}>
                        <button
                          type="button"
                          onClick={() => markDeleted(idx)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--pk-danger)', fontSize: 16, lineHeight: 1,
                            padding: '0 4px',
                          }}
                          title="Supprimer cette ligne"
                        >
                          ×
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Widget inline simplifié (pas de label) ────────────────────────────────────

function InlineCellInput({ field, value, onChange }) {
  const style = {
    width: '100%', padding: '5px 8px',
    border: '1px solid var(--pk-border)', borderRadius: 6,
    fontSize: 12, color: 'var(--pk-ink)', background: 'var(--pk-surface)',
    outline: 'none',
  }

  if (field.readOnly) {
    return <span style={{ color: 'var(--pk-muted)', fontSize: 12 }}>{value ?? '—'}</span>
  }

  if (field.widget === 'toggle') {
    return (
      <input
        type="checkbox"
        checked={!!value}
        onChange={e => onChange(e.target.checked)}
      />
    )
  }

  if (field.widget === 'number') {
    return (
      <input
        type="number"
        value={value}
        step="any"
        onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        style={{ ...style, maxWidth: 100 }}
      />
    )
  }

  if (field.widget === 'enum-select') {
    return (
      <select value={value} onChange={e => onChange(e.target.value)} style={style}>
        {!field.isRequired && <option value="">—</option>}
        {(field.enumValues ?? []).map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    )
  }

  if (field.widget === 'datetime') {
    const dateVal = value ? new Date(value).toISOString().slice(0, 16) : ''
    return (
      <input
        type="datetime-local"
        value={dateVal}
        onChange={e => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
        style={style}
      />
    )
  }

  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={style}
    />
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildEmptyRows(count) {
  return Array.from({ length: count }, () => ({ _new: true }))
}

function isEmptyRow(row, formFields) {
  return formFields.every(f => {
    const v = row[f.name]
    return v === undefined || v === null || v === ''
  })
}

function extractData(row, formFields, parentId, fk) {
  const data = { [fk]: parentId }
  for (const f of formFields) {
    if (f.readOnly) continue
    if (row[f.name] !== undefined) data[f.name] = row[f.name]
  }
  return data
}

const thStyle = {
  padding: '8px 12px', textAlign: 'left', fontWeight: 600,
  fontSize: 11, color: 'var(--pk-sub)', background: 'var(--pk-bg)',
}

const tdStyle = { padding: '6px 12px', verticalAlign: 'middle' }
