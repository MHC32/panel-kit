import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { applyTheme, DEFAULT_THEME } from '../lib/tokens.js'

const AdminContext = createContext(null)

export function AdminProvider({ apiBase, children }) {
  const [models,      setModels]      = useState([])
  const [app,         setApp]         = useState(DEFAULT_THEME)
  const [user,        setUser]        = useState(null)
  const [permissions, setPermissions] = useState({}) // { ModelName: { view, create, edit, delete } }
  const [token,       setToken]       = useState(() => localStorage.getItem('pk_token'))
  const [loading,     setLoading]     = useState(true)

  const authFetch = useCallback(async (path, opts = {}) => {
    const res = await fetch(apiBase + path, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers ?? {}),
      },
    })
    const data = await res.json()
    if (!res.ok) {
      const err = new Error(data.error ?? `HTTP ${res.status}`)
      // Attacher les erreurs par champ si présentes (erreurs Prisma validées backend)
      err.fieldError = data.fieldError ?? null
      throw err
    }
    return data
  }, [token, apiBase])

  // Charger les modèles + profil au démarrage
  useEffect(() => {
    if (!token) { setLoading(false); return }

    Promise.all([
      authFetch('/meta'),
      authFetch('/auth/me'),
    ])
      .then(([meta, me]) => {
        setModels(meta.models ?? [])
        setUser(me.user ?? null)
        setPermissions(me.user?.permissions ?? {})
        const resolvedTheme = applyTheme(meta.app ?? {})
        setApp(resolvedTheme)
      })
      .catch(() => {
        // Token expiré ou invalide
        localStorage.removeItem('pk_token')
        setToken(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  const login = useCallback(async (email, password) => {
    const res = await fetch(apiBase + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Identifiants incorrects')
    localStorage.setItem('pk_token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data
  }, [apiBase])

  const logout = useCallback(() => {
    localStorage.removeItem('pk_token')
    setToken(null)
    setUser(null)
    setModels([])
    setPermissions({})
  }, [])

  // Helper : retourne les permissions d'un modèle, défaut permissif si non défini
  const getModelPermissions = useCallback((modelName) => {
    if (!permissions || !permissions[modelName]) {
      return { view: true, create: true, edit: true, delete: true }
    }
    return permissions[modelName]
  }, [permissions])

  return (
    <AdminContext.Provider value={{ models, app, user, token, loading, authFetch, login, logout, getModelPermissions }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used inside AdminProvider')
  return ctx
}
