import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AdminApp from './AdminApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AdminApp
      apiBase="/admin/api"
      basename={import.meta.env.DEV ? '/' : '/admin'}
    />
  </StrictMode>
)
