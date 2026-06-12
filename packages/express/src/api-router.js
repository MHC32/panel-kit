import { Router } from 'express'
import createError from 'http-errors'
import { listRecords, getRecord, createRecord, updateRecord, deleteRecord, deleteManyRecords } from '@panel-kit/core'
import { buildFormFields, buildListColumns, buildFilterConfig } from '@panel-kit/core'
import { requireAuth, resolvePermissions } from './auth-router.js'

// Transforme un message Prisma en { field: message } ou null
function parsePrismaError(message) {
  if (!message) return null

  // P2002 — Unique constraint
  const uniqueMatch = message.match(/Unique constraint failed on the fields[:\s]*\(`(.+?)`\)/)
  if (uniqueMatch) return { [uniqueMatch[1]]: 'Cette valeur est déjà utilisée' }

  // P2003 — Foreign key constraint
  const fkMatch = message.match(/Foreign key constraint failed on the field[:\s]*`(.+?)`/)
  if (fkMatch) return { [fkMatch[1].replace('Id', '')]: 'Référence invalide' }

  return null
}

export function buildApiRouter({ prisma, registry, secret, getPermissions, auditLogger }) {
  const audit = auditLogger ?? { log: async () => {} }
  const router = Router()

  // Toutes les routes API nécessitent un token valide
  router.use(requireAuth(secret))

  // GET /admin/api/meta — retourne thème + modèles enregistrés avec leur config UI
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
        filterConfig: buildFilterConfig(modelConfig, registry._enums ?? {}),
      },
      form: {
        ...modelConfig.form,
        formFields: buildFormFields(modelConfig, registry._enums ?? {}),
      },
      actions: modelConfig.actions.map(a => ({
        label:   a.label,
        icon:    a.icon ?? null,
        context: a.context ?? 'list',
      })),

      inlines: (modelConfig.inlines ?? []).map(inline => {
        const inlineConfig = registry.getModel(inline.model)
        return {
          model:     inline.model,
          fk:        inline.fk,
          label:     inline.label,
          extra:     inline.extra,
          canAdd:    inline.canAdd,
          canDelete: inline.canDelete,
          // Champs du formulaire inline (sans la FK elle-même qui est auto-remplie)
          formFields: inlineConfig
            ? buildFormFields(inlineConfig, registry._enums ?? {})
                .filter(f => f.name !== inline.fk)
            : [],
        }
      }),
    }))

    res.json({
      success: true,
      app:     registry._theme ?? { appName: 'Admin', accent: '#2563EB', rail: '#1E1E2E', railAccent: null, logo: null },
      models,
    })
  })

  // ── Routes CRUD par modèle ──────────────────────────────────────────────

  // Middleware : résoudre le modèle depuis :model param
  function resolveModel(req, res, next) {
    const raw = req.params.model
    const modelName = raw.charAt(0).toUpperCase() + raw.slice(1)
    const modelConfig = registry.getModel(modelName)

    if (!modelConfig) {
      return next(createError(404, `Modèle "${modelName}" non enregistré dans panel-kit`))
    }

    req.modelConfig = modelConfig
    next()
  }

  // Middleware : vérifier qu'une action est autorisée pour ce modèle + utilisateur
  // action = 'view' | 'create' | 'edit' | 'delete'
  function checkPermission(action) {
    return async (req, res, next) => {
      if (!getPermissions) return next() // mode permissif par défaut
      try {
        const perms = await resolvePermissions(getPermissions, req.panelUser, req.modelConfig.name)
        if (!perms[action]) {
          return next(createError(403, `Accès refusé — action "${action}" non autorisée sur "${req.modelConfig.name}"`))
        }
        next()
      } catch (err) {
        next(err)
      }
    }
  }

  // GET /admin/api/:model?page=1&search=foo&sortField=name&filters[status]=PAID
  router.get('/:model', resolveModel, checkPermission('view'), async (req, res, next) => {
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
  router.get('/:model/:id', resolveModel, checkPermission('view'), async (req, res, next) => {
    try {
      const record = await getRecord(prisma, req.modelConfig, req.params.id)
      if (!record) throw createError(404, 'Enregistrement introuvable')
      res.json({ success: true, data: record })
    } catch (err) {
      next(err)
    }
  })

  // POST /admin/api/:model
  router.post('/:model', resolveModel, checkPermission('create'), async (req, res, next) => {
    try {
      const record = await createRecord(prisma, req.modelConfig, req.body ?? {})
      audit.log({ action: 'CREATE', model: req.modelConfig.name, recordId: record.id, userId: req.panelUser.sub })
      res.status(201).json({ success: true, data: record })
    } catch (err) {
      next(err)
    }
  })

  // PUT /admin/api/:model/:id
  router.put('/:model/:id', resolveModel, checkPermission('edit'), async (req, res, next) => {
    try {
      const before = await getRecord(prisma, req.modelConfig, req.params.id)
      const record = await updateRecord(prisma, req.modelConfig, req.params.id, req.body ?? {})
      audit.log({ action: 'UPDATE', model: req.modelConfig.name, recordId: record.id, userId: req.panelUser.sub, before, after: record })
      res.json({ success: true, data: record })
    } catch (err) {
      next(err)
    }
  })

  // DELETE /admin/api/:model/:id
  router.delete('/:model/:id', resolveModel, checkPermission('delete'), async (req, res, next) => {
    try {
      await deleteRecord(prisma, req.modelConfig, req.params.id)
      audit.log({ action: 'DELETE', model: req.modelConfig.name, recordId: req.params.id, userId: req.panelUser.sub })
      res.json({ success: true })
    } catch (err) {
      next(err)
    }
  })

  // POST /admin/api/:model/bulk-delete  { ids: [...] }
  router.post('/:model/bulk-delete', resolveModel, checkPermission('delete'), async (req, res, next) => {
    try {
      const { ids } = req.body ?? {}
      if (!Array.isArray(ids) || !ids.length) throw createError(400, 'ids requis')
      await deleteManyRecords(prisma, req.modelConfig, ids)
      for (const id of ids) {
        audit.log({ action: 'DELETE', model: req.modelConfig.name, recordId: id, userId: req.panelUser.sub })
      }
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
  // Transforme les erreurs Prisma en format structuré { field, message }
  router.use((err, req, res, _next) => {
    const status = err.status ?? 500
    const fieldError = parsePrismaError(err.message)

    if (fieldError) {
      return res.status(422).json({
        success:    false,
        error:      'Erreur de validation',
        fieldError,
      })
    }

    res.status(status).json({
      success: false,
      error: err.message ?? 'Erreur interne',
    })
  })

  return router
}
