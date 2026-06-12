// Point d'entrée public du package @panel-kit/ui
// Le dev importe AdminApp pour monter son panel custom
export { default as AdminApp } from './AdminApp.jsx'
export { useAdmin, AdminProvider } from './hooks/useAdmin.jsx'
export { applyTheme } from './lib/tokens.js'
