import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAdmin } from '../hooks/useAdmin.jsx'
import RelationSelect from '../components/RelationSelect.jsx'

export default function ModelFormPage() {
  const { modelName, id } = useParams()
  const navigate           = useNavigate()
  const { models, authFetch, getModelPermissions } = useAdmin()

  const isNew      = id === 'new'
  const model      = models.find(m => m.name.toLowerCase() === modelName)
  const formFields = model?.form?.formFields ?? []
  const perms      = model ? getModelPermissions(model.name) : { view: true, create: true, edit: true, delete: true }

  const [values,      setValues]      = useState({})
  const [loading,     setLoading]     = useState(!isNew)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState(null)
  const [fieldErrors, setFieldErrors] = useState({}) // { fieldName: message }

  // Charger l'enregistrement existant
  useEffect(() => {
    if (isNew || !model) { setLoading(false); return }
    authFetch(`/${model.name.toLowerCase()}/${id}`)
      .then(res => { setValues(res.data ?? {}); setLoading(false) })
      .catch(() => { setError('Enregistrement introuvable'); setLoading(false) })
  }, [id, model])

  async function save() {
    if (isNew) {
      return authFetch(`/${model.name.toLowerCase()}`, {
        method: 'POST',
        body: JSON.stringify(values),
      })
    } else {
      return authFetch(`/${model.name.toLowerCase()}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(values),
      })
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setFieldErrors({})
    try {
      await save()
      navigate(`/model/${modelName}`)
    } catch (err) {
      if (err.fieldError) {
        setFieldErrors(err.fieldError)
      } else {
        const parsed = parsePrismaError(err.message)
        if (parsed) setFieldErrors(parsed)
        else setError(err.message)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit2(afterSave) {
    setSaving(true)
    setError(null)
    setFieldErrors({})
    try {
      const res = await save()
      if (afterSave === 'continue') {
        // Rester sur la page d'édition de l'enregistrement sauvegardé
        const savedId = res?.data?.id ?? id
        navigate(`/model/${modelName}/${savedId}`, { replace: true })
      } else if (afterSave === 'addAnother') {
        // Réinitialiser le formulaire pour un nouvel enregistrement
        setValues({})
        setError(null)
        setFieldErrors({})
      }
    } catch (err) {
      if (err.fieldError) {
        setFieldErrors(err.fieldError)
      } else {
        const parsed = parsePrismaError(err.message)
        if (parsed) setFieldErrors(parsed)
        else setError(err.message)
      }
    } finally {
      setSaving(false)
    }
  }

  if (!model)           return <p style={{ color: 'var(--pk-sub)' }}>Modèle introuvable</p>
  if (loading)          return <p style={{ color: 'var(--pk-muted)', fontSize: 14 }}>Chargement…</p>
  if (!perms.view)      return <AccessDenied modelName={modelName} action="voir" />
  if (isNew && !perms.create) return <AccessDenied modelName={modelName} action="créer" />
  if (!isNew && !perms.edit)  return <AccessDenied modelName={modelName} action="modifier" />

  // Grouper les champs par sections si définies
  const sections = model.form.sections?.length > 0
    ? model.form.sections
    : [{ title: null, fields: formFields.map(f => f.name) }]

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link
          to={`/model/${modelName}`}
          style={{ color: 'var(--pk-sub)', fontSize: 13, textDecoration: 'none' }}
        >
          ← {model.labelPlural}
        </Link>
        <span style={{ color: 'var(--pk-muted)' }}>/</span>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--pk-ink)' }}>
          {isNew ? `Nouveau ${model.label}` : `Modifier #${id}`}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        {sections.map((section, si) => (
          <div
            key={si}
            style={{
              background: 'var(--pk-surface)',
              border: '1px solid var(--pk-border)',
              borderRadius: 'var(--pk-radius-lg)',
              overflow: 'hidden',
              marginBottom: 16,
            }}
          >
            {section.title && (
              <div style={{
                padding: '12px 20px',
                borderBottom: '1px solid var(--pk-border)',
                fontWeight: 600, fontSize: 13,
                color: 'var(--pk-sub)',
                background: 'var(--pk-bg)',
              }}>
                {section.title}
              </div>
            )}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1px',
              background: 'var(--pk-border)',
            }}>
              {section.fields.map(fieldName => {
                const field = formFields.find(f => f.name === fieldName)
                if (!field) return null
                return (
                  <div
                    key={fieldName}
                    style={{ background: 'var(--pk-surface)', padding: '16px 20px' }}
                  >
                    <FieldInput
                      field={field}
                      value={values[fieldName] ?? ''}
                      onChange={v => setValues(prev => ({ ...prev, [fieldName]: v }))}
                      error={fieldErrors[fieldName]}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {error && (
          <div style={{
            background: 'var(--pk-danger-bg)', border: '1px solid var(--pk-danger)',
            borderRadius: 'var(--pk-radius)', padding: '10px 14px',
            fontSize: 13, color: 'var(--pk-danger)', marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="submit" disabled={saving} style={btnPrimary}>
            {saving ? 'Enregistrement…' : isNew ? 'Créer' : 'Sauvegarder'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit2('continue')}
            style={btnSecondary}
          >
            {isNew ? 'Créer et continuer' : 'Sauvegarder et continuer'}
          </button>
          {isNew && (
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSubmit2('addAnother')}
              style={btnSecondary}
            >
              Créer et ajouter un autre
            </button>
          )}
          <Link to={`/model/${modelName}`} style={{ ...btnSecondary, marginLeft: 'auto' }}>
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}

// Tente de transformer un message d'erreur Prisma en map { field: message }
// Gère P2002 (unique constraint), P2003 (FK), et les messages de validation
function parsePrismaError(message) {
  if (!message) return null

  // P2002 — Unique constraint: "Unique constraint failed on the fields: (`email`)"
  const uniqueMatch = message.match(/Unique constraint failed on the fields[:\s]*\(`(.+?)`\)/)
  if (uniqueMatch) {
    const field = uniqueMatch[1]
    return { [field]: `Cette valeur est déjà utilisée` }
  }

  // P2003 — Foreign key: "Foreign key constraint failed on the field: `userId`"
  const fkMatch = message.match(/Foreign key constraint failed on the field[:\s]*`(.+?)`/)
  if (fkMatch) {
    const field = fkMatch[1].replace('Id', '')
    return { [field]: `Référence invalide` }
  }

  return null
}

// ── FieldInput — widget selon le type ────────────────────────────────────────

function FieldInput({ field, value, onChange, error }) {
  const hasError = Boolean(error)

  const label = (
    <label style={{
      display: 'block', fontSize: 12, fontWeight: 600,
      color: hasError ? 'var(--pk-danger)' : 'var(--pk-sub)',
      marginBottom: 6, textTransform: 'capitalize',
    }}>
      {field.name}
      {field.isRequired && !field.readOnly && (
        <span style={{ color: 'var(--pk-danger)', marginLeft: 3 }}>*</span>
      )}
      {field.readOnly && (
        <span style={{
          marginLeft: 6, fontSize: 10, fontWeight: 500,
          color: 'var(--pk-muted)', background: 'var(--pk-bg)',
          padding: '1px 5px', borderRadius: 4, border: '1px solid var(--pk-border)',
        }}>
          lecture seule
        </span>
      )}
    </label>
  )

  const errorMsg = hasError ? (
    <p style={{ fontSize: 11, color: 'var(--pk-danger)', marginTop: 4, fontWeight: 500 }}>
      {error}
    </p>
  ) : null

  const fieldInputStyle = {
    ...inputStyle,
    ...(hasError ? { borderColor: 'var(--pk-danger)' } : {}),
  }

  if (field.readOnly) {
    return (
      <div>
        {label}
        <div style={{
          padding: '7px 10px', borderRadius: 'var(--pk-radius)',
          background: 'var(--pk-bg)', border: '1px solid var(--pk-border)',
          fontSize: 13, color: 'var(--pk-muted)',
          minHeight: 34,
        }}>
          {value === '' || value === null || value === undefined ? '—' : String(value)}
        </div>
      </div>
    )
  }

  if (field.widget === 'relation-select') {
    return (
      <div>
        {label}
        <RelationSelect
          relatedModel={field.relatedModel}
          value={value || null}
          onChange={onChange}
          required={field.isRequired}
          error={error}
        />
      </div>
    )
  }

  if (field.widget === 'toggle') {
    return (
      <div>
        {label}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!value}
            onChange={e => onChange(e.target.checked)}
          />
          <span style={{ fontSize: 13, color: 'var(--pk-ink)' }}>
            {value ? 'Oui' : 'Non'}
          </span>
        </label>
        {errorMsg}
      </div>
    )
  }

  if (field.widget === 'datetime') {
    const dateVal = value ? new Date(value).toISOString().slice(0, 16) : ''
    return (
      <div>
        {label}
        <input
          type="datetime-local"
          value={dateVal}
          onChange={e => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
          style={fieldInputStyle}
        />
        {errorMsg}
      </div>
    )
  }

  if (field.widget === 'number') {
    return (
      <div>
        {label}
        <input
          type="number"
          value={value}
          step="any"
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          style={fieldInputStyle}
        />
        {errorMsg}
      </div>
    )
  }

  if (field.widget === 'enum-select') {
    const options = field.enumValues ?? []
    return (
      <div>
        {label}
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          required={field.isRequired && !field.readOnly}
          style={fieldInputStyle}
        >
          {!field.isRequired && <option value="">— Choisir —</option>}
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {errorMsg}
      </div>
    )
  }

  if (field.widget === 'json') {
    return (
      <div>
        {label}
        <textarea
          value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          onChange={e => {
            try { onChange(JSON.parse(e.target.value)) }
            catch { onChange(e.target.value) }
          }}
          rows={4}
          style={{ ...fieldInputStyle, fontFamily: 'monospace', resize: 'vertical' }}
        />
        {errorMsg}
      </div>
    )
  }

  // Défaut : text
  return (
    <div>
      {label}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        required={field.isRequired && !field.readOnly}
        style={fieldInputStyle}
      />
      {errorMsg}
    </div>
  )
}

// ── Accès refusé ─────────────────────────────────────────────────────────────

function AccessDenied({ modelName, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 20px', gap: 12,
    }}>
      <svg width="40" height="40" fill="none" stroke="var(--pk-danger)" strokeWidth="1.5" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      </svg>
      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--pk-ink)' }}>
        Accès refusé
      </p>
      <p style={{ fontSize: 13, color: 'var(--pk-muted)', textAlign: 'center' }}>
        Vous n'avez pas la permission de {action} ce modèle.
      </p>
      <Link
        to={`/model/${modelName}`}
        style={{ fontSize: 13, color: 'var(--pk-accent)', textDecoration: 'none', fontWeight: 500 }}
      >
        ← Retour à la liste
      </Link>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const inputStyle = {
  width: '100%', padding: '7px 10px',
  border: '1px solid var(--pk-border)', borderRadius: 'var(--pk-radius)',
  fontSize: 13, color: 'var(--pk-ink)', background: 'var(--pk-surface)', outline: 'none',
}

const btnPrimary = {
  background: 'var(--pk-accent)', color: '#fff',
  border: 'none', borderRadius: 'var(--pk-radius)',
  padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}

const btnSecondary = {
  background: 'var(--pk-bg)', color: 'var(--pk-ink)',
  border: '1px solid var(--pk-border)', borderRadius: 'var(--pk-radius)',
  padding: '8px 18px', fontSize: 13, fontWeight: 500,
  cursor: 'pointer', textDecoration: 'none',
}
