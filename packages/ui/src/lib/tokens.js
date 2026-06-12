// Tokens de design — valeurs par défaut injectées sur :root
// Le dev peut les overrider via theme: { accent, rail, ... } dans createPanel()
// L'UI lit toujours var(--pk-*) — jamais les valeurs hardcodées

export const DEFAULT_THEME = {
  accent:     '#2563EB',
  rail:       '#1E1E2E',
  railAccent: null,   // dérivé automatiquement de accent si null
  appName:    'Admin',
  logo:       null,
}

// Applique le thème reçu de /api/meta sur :root
// Appelé une fois au chargement — toute l'UI suit via var(--pk-*)
export function applyTheme(app = {}) {
  const theme = { ...DEFAULT_THEME, ...app }
  const root  = document.documentElement

  root.style.setProperty('--pk-accent',      theme.accent)
  root.style.setProperty('--pk-accent-bg',   hexToAlpha(theme.accent, 0.12))
  root.style.setProperty('--pk-rail',        theme.rail)
  // railAccent = version plus claire de accent pour les items actifs dans la sidebar
  root.style.setProperty('--pk-rail-accent', theme.railAccent ?? hexToAlpha(theme.accent, 0.25))

  // Couleurs statiques (pas customisables — assez neutres pour tout branding)
  root.style.setProperty('--pk-bg',          '#F8F9FA')
  root.style.setProperty('--pk-surface',     '#FFFFFF')
  root.style.setProperty('--pk-border',      '#E5E7EB')
  root.style.setProperty('--pk-ink',         '#111827')
  root.style.setProperty('--pk-sub',         '#6B7280')
  root.style.setProperty('--pk-muted',       '#9CA3AF')
  root.style.setProperty('--pk-danger',      '#EF4444')
  root.style.setProperty('--pk-danger-bg',   'rgba(239,68,68,0.1)')
  root.style.setProperty('--pk-success',     '#10B981')
  root.style.setProperty('--pk-warning',     '#F59E0B')
  root.style.setProperty('--pk-radius',      '8px')
  root.style.setProperty('--pk-radius-lg',   '12px')

  return theme
}

// Utilitaire : "#2563EB" + 0.12 → "rgba(37,99,235,0.12)"
function hexToAlpha(hex, alpha) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
