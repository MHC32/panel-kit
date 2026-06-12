// Champs auto-détectés comme readOnly (conventions Prisma courantes)
const AUTO_READONLY = new Set(['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at'])

// Champs auto-cachés (données sensibles — sécurité proactive)
const AUTO_HIDDEN = new Set([
  'password', 'passwordHash', 'passwordhash',
  'secret', 'secretKey', 'secretkey',
  'token', 'refreshToken', 'accessToken',
  'apiKey', 'apikey',
])

export class AdminRegistry {
  constructor() {
    this._models = []       // modèles lus depuis le DMMF
    this._configs = new Map() // configs déclarées par le dev
    this._prisma = null
    this._loaded = false
  }

  // Appelé par createPanel() au démarrage
  // dmmf doit être Prisma.dmmf importé depuis @prisma/client du projet hôte
  init(prisma, dmmf) {
    this._prisma = prisma

    if (!dmmf?.datamodel?.models) {
      throw new Error(
        '[panel-kit] DMMF manquant ou invalide.\n' +
        'Passez Prisma.dmmf à createPanel() :\n' +
        '  import { Prisma } from "@prisma/client"\n' +
        '  createPanel({ prisma, dmmf: Prisma.dmmf, ... })'
      )
    }

    this._models = dmmf.datamodel.models
    this._loaded = true
    return this
  }

  // Enregistrer un modèle avec sa config (comme admin.site.register en Django)
  register(modelName, config = {}) {
    if (!this._loaded) {
      throw new Error('[panel-kit] Appelez init(prisma) avant register()')
    }

    const model = this._models.find(m => m.name === modelName)
    if (!model) {
      throw new Error(`[panel-kit] Modèle "${modelName}" introuvable dans le schema Prisma`)
    }

    this._configs.set(modelName, this._buildConfig(model, config))
    return this // chainable : registry.register('User').register('Order')
  }

  // Auto-enregistrer tous les modèles sauf les exclusions
  registerAll(exclude = []) {
    if (!this._loaded) {
      throw new Error('[panel-kit] Appelez init(prisma) avant registerAll()')
    }

    this._models
      .filter(m => !exclude.includes(m.name))
      .forEach(m => this.register(m.name, {}))

    return this
  }

  // Récupérer la config résolue d'un modèle
  getModel(modelName) {
    return this._configs.get(modelName) ?? null
  }

  // Récupérer tous les modèles enregistrés (pour la sidebar + /api/meta)
  getAllModels() {
    return [...this._configs.values()]
  }

  get prisma() {
    return this._prisma
  }

  // ── Résolution de la config finale ────────────────────────────────────────

  _buildConfig(model, userConfig = {}) {
    const scalarFields = model.fields.filter(f => f.kind === 'scalar' || f.kind === 'enum')
    const allFieldNames = scalarFields.map(f => f.name)

    // Champs scalaires visibles par défaut (max 6 pour la liste)
    const defaultListFields = allFieldNames
      .filter(n => !AUTO_HIDDEN.has(n))
      .slice(0, 6)

    // Champs du formulaire : tout sauf les hidden
    const defaultFormFields = allFieldNames
      .filter(n => !AUTO_HIDDEN.has(n))

    const listConfig  = userConfig.list  ?? {}
    const formConfig  = userConfig.form  ?? {}
    const actionsConfig = userConfig.actions ?? []

    return {
      name:       model.name,
      // Nom affiché dans la sidebar (ex: "InvoiceItem" → "Invoice Items")
      label:      userConfig.label ?? splitCamelCase(model.name),
      labelPlural: userConfig.labelPlural ?? splitCamelCase(model.name) + 's',

      // Champs bruts du DMMF — utilisés par schema-parser pour les widgets
      fields: model.fields,

      list: {
        fields:  listConfig.fields  ?? defaultListFields,
        search:  listConfig.search  ?? [],
        filters: listConfig.filters ?? [],
        sort:    listConfig.sort    ?? { field: 'id', dir: 'asc' },
        perPage: listConfig.perPage ?? 20,
      },

      form: {
        fields:   formConfig.fields   ?? defaultFormFields,
        readOnly: formConfig.readOnly ?? allFieldNames.filter(n => AUTO_READONLY.has(n)),
        hidden:   formConfig.hidden   ?? allFieldNames.filter(n => AUTO_HIDDEN.has(n)),
        sections: formConfig.sections ?? [],
      },

      actions: actionsConfig,
    }
  }
}

// ── Singleton exporté ─────────────────────────────────────────────────────
export const registry = new AdminRegistry()

// Utilitaire : "InvoiceItem" → "Invoice Item"
function splitCamelCase(str) {
  return str.replace(/([A-Z])/g, ' $1').trim()
}

