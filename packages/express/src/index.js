import { Router } from 'express'
import { registry } from '@panel-kit/core'
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
    provider   = 'postgresql',   // 'postgresql' | 'mysql' | 'sqlite' | 'mongodb'
  } = options

  if (!prisma) throw new Error('[panel-kit] Option "prisma" requise')
  if (!secret) throw new Error('[panel-kit] Option "secret" requise (JWT signing)')
  if (!dmmf)   throw new Error('[panel-kit] Option "dmmf" requise — passez Prisma.dmmf depuis @prisma/client')

  // 1. Initialiser le registry avec l'instance Prisma + le DMMF du projet hôte
  registry.init(prisma, dmmf)
  registry._provider = provider

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

  // /admin/api/auth/* — login, logout, me
  router.use('/api/auth', buildAuthRouter({ prisma, secret, auth }))

  // /admin/api/* — CRUD auto-généré
  router.use('/api', buildApiRouter({ prisma, registry, secret }))

  // /admin/* — sert la React app pré-buildée (doit être en dernier)
  router.use('/', serveUI({ basePath }))

  return router
}
