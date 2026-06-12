import { Router } from 'express'
import { registry, createAuditLogger } from '@panel-kit/core'
import { buildApiRouter } from './api-router.js'
import { buildAuthRouter } from './auth-router.js'
import { serveUI } from './serve-ui.js'

export function createPanel(options = {}) {
  const {
    prisma,
    dmmf,
    secret,
    auth       = {},
    models     = {},
    exclude    = [],
    basePath   = '/admin',
    provider   = 'postgresql',
    theme      = {},
    auditLog   = false,   // false | true | { model: 'MyAuditLog' }
  } = options

  if (!prisma) throw new Error('[panel-kit] Option "prisma" requise')
  if (!secret) throw new Error('[panel-kit] Option "secret" requise (JWT signing)')
  if (!dmmf)   throw new Error('[panel-kit] Option "dmmf" requise — passez Prisma.dmmf depuis @prisma/client')

  // 1. Initialiser le registry avec l'instance Prisma + le DMMF du projet hôte
  registry.init(prisma, dmmf)
  registry._provider = provider

  // Stocker le thème dans le registry — exposé via /api/meta
  registry._theme = {
    appName:     theme.appName     ?? 'Admin',
    accent:      theme.accent      ?? '#2563EB',
    rail:        theme.rail        ?? '#1E1E2E',
    railAccent:  theme.railAccent  ?? null,  // null = dérivé auto de accent côté UI
    logo:        theme.logo        ?? null,
  }

  // 2. Enregistrer les modèles
  if (Object.keys(models).length > 0) {
    // Le dev a déclaré des modèles explicitement
    for (const [name, config] of Object.entries(models)) {
      registry.register(name, config)
    }
  } else {
    // Aucune déclaration → auto-enregistrer tout sauf les exclusions
    registry.registerAll(exclude)
  }

  // 3. Monter les routes sur le router
  const router = Router()

  const getPermissions = auth.getPermissions ?? null

  // Audit logger — silencieux si auditLog: false ou modèle introuvable
  const auditLogOptions = auditLog === true
    ? { enabled: true }
    : auditLog === false
      ? { enabled: false }
      : { enabled: true, ...auditLog }
  const auditLogger = createAuditLogger(prisma, auditLogOptions)

  // /admin/api/auth/* — login, logout, me
  router.use('/api/auth', buildAuthRouter({ prisma, secret, auth, registry }))

  // /admin/api/* — CRUD auto-généré
  router.use('/api', buildApiRouter({ prisma, registry, secret, getPermissions, auditLogger }))

  // /admin/* — sert la React app pré-buildée (doit être en dernier)
  router.use('/', serveUI({ basePath }))

  return router
}
