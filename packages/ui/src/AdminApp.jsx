import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AdminProvider, useAdmin } from './hooks/useAdmin.jsx'
import { applyTheme } from './lib/tokens.js'
import AdminShell from './components/AdminShell.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ModelListPage from './pages/ModelListPage.jsx'
import ModelFormPage from './pages/ModelFormPage.jsx'

// Appliquer les tokens par défaut immédiatement (avant que /meta réponde)
applyTheme({})

function ProtectedRoutes({ slots, modelOverrides, routes }) {
  const { token, loading } = useAdmin()

  if (loading) return (
    <div style={{
      height: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--pk-bg)', color: 'var(--pk-muted)', fontSize: 14,
    }}>
      Chargement…
    </div>
  )

  if (!token) return <LoginPage />

  return (
    <Routes>
      <Route path="/" element={<AdminShell slots={slots} />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        <Route path="model/:modelName"     element={<ModelListWrapper     overrides={modelOverrides} />} />
        <Route path="model/:modelName/:id" element={<ModelFormWrapper     overrides={modelOverrides} />} />

        {/* Routes custom injectées par le dev */}
        {routes.map(r => (
          <Route key={r.path} path={r.path} element={<r.component />} />
        ))}
      </Route>
    </Routes>
  )
}

function ModelListWrapper({ overrides }) {
  const { modelName } = useParams()
  const name = modelName.charAt(0).toUpperCase() + modelName.slice(1)
  const Override = overrides?.[name]?.ListPage
  return Override ? <Override /> : <ModelListPage />
}

function ModelFormWrapper({ overrides }) {
  const { modelName } = useParams()
  const name = modelName.charAt(0).toUpperCase() + modelName.slice(1)
  const Override = overrides?.[name]?.FormPage
  return Override ? <Override /> : <ModelFormPage />
}

export default function AdminApp({
  apiBase        = '/admin/api',
  basename       = '/admin',
  slots          = {},
  modelOverrides = {},
  routes         = [],
}) {
  return (
    <BrowserRouter basename={basename}>
      <AdminProvider apiBase={apiBase}>
        <ProtectedRoutes slots={slots} modelOverrides={modelOverrides} routes={routes} />
      </AdminProvider>
    </BrowserRouter>
  )
}
