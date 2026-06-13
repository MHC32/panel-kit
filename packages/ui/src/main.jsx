import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AdminApp from './AdminApp.jsx'

// basePath injecté dans index.html par serve-ui.js via window.__PANEL_BASE__
// Fallback sur /admin pour la compatibilité dev
const base = window.__PANEL_BASE__ ?? '/admin'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AdminApp
      apiBase={`${base}/api`}
      basename={import.meta.env.DEV ? '/' : base}
    />
  </StrictMode>
)
