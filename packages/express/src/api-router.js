import { Router } from 'express'
import createError from 'http-errors'
import { listRecords, getRecord, createRecord, updateRecord, deleteRecord, deleteManyRecords } from '@panel-kit/core'
import { buildFormFields, buildListColumns, buildFilterConfig } from '@panel-kit/core'
import { requireAuth } from './auth-router.js'

export function buildApiRouter({ prisma, registry, secret }) {
  const router = Router()

  // Toutes les routes API nécessitent un token valide
  router.use(requireAuth(secret))

  // GET /admin/api/meta — retourne tous les modèles enregistrés avec leur config UI
  // C'est la route que la React app appelle au démarrage pour construire la sidebar
  // et savoir quels champs/filtres/widgets afficher
  router.get('/meta', (req, res) => {
    const models = registry.getAllModels().map(modelConfig => ({
      name:        modelConfig.name,
      label:       modelConfig.label,
      labelPlural: modelConfig.labelPlural,
      list: {
        ...modelConfig.list,
        columns: buildListColumns(modelConfig),
        filterConfig: buildFilterConfig(modelConfig),
      },
      form: {
        ...modelConfig.form,
        formFields: buildFormFields(modelConfig),
      },
      actions: modelConfig.actions.map(a => ({
        label:   a.label,
        icon:    a.icon ?? null,
        context: a.context ?? 'list',
        // La fonction onClick n'est pas sérialisable — on envoie juste le label
        // Le frontend appellera POST /admin/api/:model/actions/:label
      })),
    }))

    res.json({ success: true, models })
  })

  // ── Routes CRUD par modèle ──────────────────────────────────────────────

  // Middleware : résoudre le modèle depuis :model param
  function resolveModel(req, res, next) {
    // Prisma utilise PascalCase : "user" → "User", "invoiceItem" → "InvoiceItem"
    const raw = req.params.model
    const modelName = raw.charAt(0).toUpperCase() + raw.slice(1)
    const modelConfig = registry.getModel(modelName)

    if (!modelConfig) {
      return next(createError(404, `Modèle "${modelName}" non enregistré dans panel-kit`))
    }

    req.modelConfig = modelConfig
    next()
  }

  // GET /admin/api/:model?page=1&search=foo&sortField=name&filters[status]=PAID
  router.get('/:model', resolveModel, async (req, res, next) => {
    try {
      const result = await listRecords(prisma, req.modelConfig, {
        page:      req.query.page,
        perPage:   req.query.perPage,
        search:    req.query.search,
        sortField: req.query.sortField,
        sortDir:   req.query.sortDir,
        filters:   req.query.filters ?? {},
      }, registry._provider ?? 'postgresql')
      res.json({ success: true, ...result })
    } catch (err) {
      next(err)
    }
  })

  // GET /admin/api/:model/:id
  router.get('/:model/:id', resolveModel, async (req, res, next) => {
    try {
      const record = await getRecord(prisma, req.modelConfig, req.params.id)
      if (!record) throw createError(404, 'Enregistrement introuvable')
      res.json({ success: true, data: record })
    } catch (err) {
      next(err)
    }
  })

  // POST /admin/api/:model
  router.post('/:model', resolveModel, async (req, res, next) => {
    try {
      const record = await createRecord(prisma, req.modelConfig, req.body ?? {})
      res.status(201).json({ success: true, data: record })
    } catch (err) {
      next(err)
    }
  })

  // PUT /admin/api/:model/:id
  router.put('/:model/:id', resolveModel, async (req, res, next) => {
    try {
      const record = await updateRecord(prisma, req.modelConfig, req.params.id, req.body ?? {})
      res.json({ success: true, data: record })
    } catch (err) {
      next(err)
    }
  })

  // DELETE /admin/api/:model/:id
  router.delete('/:model/:id', resolveModel, async (req, res, next) => {
    try {
      await deleteRecord(prisma, req.modelConfig, req.params.id)
      res.json({ success: true })
    } catch (err) {
      next(err)
    }
  })

  // POST /admin/api/:model/bulk-delete  { ids: [...] }
  router.post('/:model/bulk-delete', resolveModel, async (req, res, next) => {
    try {
      const { ids } = req.body ?? {}
      if (!Array.isArray(ids) || !ids.length) throw createError(400, 'ids requis')
      await deleteManyRecords(prisma, req.modelConfig, ids)
      res.json({ success: true, deleted: ids.length })
    } catch (err) {
      next(err)
    }
  })

  // POST /admin/api/:model/actions/:actionLabel  { ids: [...] }
  // Exécute une action custom déclarée dans la config du modèle
  router.post('/:model/actions/:actionLabel', resolveModel, async (req, res, next) => {
    try {
      const { actionLabel } = req.params
      const action = req.modelConfig.actions.find(a => a.label === actionLabel)
      if (!action) throw createError(404, `Action "${actionLabel}" introuvable`)

      const { ids, record } = req.body ?? {}
      const result = await action.onClick(ids ?? record, { prisma })
      res.json({ success: true, result: result ?? null })
    } catch (err) {
      next(err)
    }
  })

  // Gestionnaire d'erreurs pour ce router
  router.use((err, req, res, _next) => {
    const status = err.status ?? 500
    res.status(status).json({
      success: false,
      error: err.message ?? 'Erreur interne',
    })
  })

  return router
}
