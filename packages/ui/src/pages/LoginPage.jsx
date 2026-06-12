import { useState } from 'react'
import { useAdmin } from '../hooks/useAdmin.jsx'

export default function LoginPage() {
  const { login, app } = useAdmin()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--pk-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: 'var(--pk-surface)',
        border: '1px solid var(--pk-border)',
        borderRadius: 'var(--pk-radius-lg)',
        padding: '2rem',
        width: '100%',
        maxWidth: '380px',
      }}>
        {/* Logo / Nom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.75rem' }}>
          <div style={{
            width: 36, height: 36,
            borderRadius: 'var(--pk-radius)',
            background: 'var(--pk-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 16,
            flexShrink: 0,
          }}>
            {app.logo
              ? <img src={app.logo} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
              : (app.appName?.[0] ?? 'A').toUpperCase()
            }
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--pk-ink)' }}>
            {app.appName ?? 'Admin'}
          </span>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--pk-ink)', marginBottom: '0.25rem' }}>
          Connexion
        </h1>
        <p style={{ fontSize: 13, color: 'var(--pk-sub)', marginBottom: '1.5rem' }}>
          Accès réservé aux administrateurs
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@exemple.com"
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              background: 'var(--pk-danger-bg)',
              border: '1px solid var(--pk-danger)',
              borderRadius: 'var(--pk-radius)',
              padding: '0.625rem 0.75rem',
              fontSize: 13,
              color: 'var(--pk-danger)',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'var(--pk-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--pk-radius)',
              padding: '0.625rem 1rem',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: '0.25rem',
            }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--pk-sub)',
  marginBottom: '0.375rem',
}

const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid var(--pk-border)',
  borderRadius: 'var(--pk-radius)',
  fontSize: 14,
  color: 'var(--pk-ink)',
  background: 'var(--pk-bg)',
  outline: 'none',
}
