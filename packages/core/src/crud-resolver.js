// Génère les opérations CRUD pour n'importe quel modèle Prisma
// en utilisant l'accès dynamique prisma[modelName]

// Prisma expose les modèles en camelCase : prisma.user, prisma.invoiceItem, etc.
function getDelegate(prisma, modelName) {
  const key = modelName.charAt(0).toLowerCase() + modelName.slice(1)
  const delegate = prisma[key]
  if (!delegate) {
    throw new Error(`[panel-kit] Modèle "${modelName}" introuvable sur l'instance Prisma (cherché: prisma.${key})`)
  }
  return delegate
}

// ── LIST ─────────────────────────────────────────────────────────────────────
// Retourne { data, total, page, perPage, totalPages }
export async function listRecords(prisma, modelConfig, query = {}) {
  const delegate = getDelegate(prisma, modelConfig.name)
  const { list } = modelConfig

  const page    = Math.max(1, parseInt(query.page ?? 1))
  const perPage = parseInt(query.perPage ?? list.perPage ?? 20)
  const skip    = (page - 1) * perPage

  // ── Tri ───────────────────────────────────────────────────────────────────
  const sortField = query.sortField ?? list.sort?.field ?? 'id'
  const sortDir   = query.sortDir   ?? list.sort?.dir   ?? 'asc'
  const orderBy   = { [sortField]: sortDir }

  // ── Recherche full-text ───────────────────────────────────────────────────
  const searchWhere = buildSearchWhere(query.search, list.search)

  // ── Filtres ───────────────────────────────────────────────────────────────
  const filterWhere = buildFilterWhere(query.filters ?? {})

  const where = mergeWhere(searchWhere, filterWhere)

  const [data, total] = await Promise.all([
    delegate.findMany({ where, orderBy, skip, take: perPage }),
    delegate.count({ where }),
  ])

  return {
    data,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  }
}

// ── GET ONE ──────────────────────────────────────────────────────────────────
export async function getRecord(prisma, modelConfig, id) {
  const delegate = getDelegate(prisma, modelConfig.name)
  const record = await delegate.findUnique({ where: { id: castId(id) } })
  return record
}

// ── CREATE ───────────────────────────────────────────────────────────────────
export async function createRecord(prisma, modelConfig, data) {
  const delegate = getDelegate(prisma, modelConfig.name)
  const clean = sanitizeInput(data, modelConfig)
  return delegate.create({ data: clean })
}

// ── UPDATE ───────────────────────────────────────────────────────────────────
export async function updateRecord(prisma, modelConfig, id, data) {
  const delegate = getDelegate(prisma, modelConfig.name)
  const clean = sanitizeInput(data, modelConfig)
  return delegate.update({ where: { id: castId(id) }, data: clean })
}

// ── DELETE ───────────────────────────────────────────────────────────────────
export async function deleteRecord(prisma, modelConfig, id) {
  const delegate = getDelegate(prisma, modelConfig.name)
  return delegate.delete({ where: { id: castId(id) } })
}

// ── DELETE MANY (actions de liste) ───────────────────────────────────────────
export async function deleteManyRecords(prisma, modelConfig, ids) {
  const delegate = getDelegate(prisma, modelConfig.name)
  return delegate.deleteMany({ where: { id: { in: ids.map(castId) } } })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Retire les champs readOnly et hidden avant d'écrire en DB
function sanitizeInput(data, modelConfig) {
  const blocked = new Set([
    ...modelConfig.form.readOnly,
    ...modelConfig.form.hidden,
    'id', // toujours bloqué en écriture
  ])

  return Object.fromEntries(
    Object.entries(data).filter(([key]) => !blocked.has(key))
  )
}

// Construit la clause WHERE pour la recherche (OR sur plusieurs champs)
function buildSearchWhere(search, searchFields) {
  if (!search || !searchFields?.length) return null

  return {
    OR: searchFields.map(field => ({
      // Support des relations : "client.email" → { client: { email: { contains: ... } } }
      ...buildNestedWhere(field, { contains: search, mode: 'insensitive' }),
    })),
  }
}

// Construit la clause WHERE pour les filtres actifs
// query.filters = { status: 'PAID', isActive: 'true', ... }
function buildFilterWhere(filters) {
  if (!filters || !Object.keys(filters).length) return null

  const conditions = Object.entries(filters)
    .map(([field, value]) => {
      if (value === '' || value === undefined || value === null) return null

      // Boolean
      if (value === 'true')  return { [field]: true }
      if (value === 'false') return { [field]: false }

      // Range (number/date) : value = { min, max }
      if (typeof value === 'object' && (value.min !== undefined || value.max !== undefined)) {
        const range = {}
        if (value.min !== undefined) range.gte = isNaN(value.min) ? new Date(value.min) : Number(value.min)
        if (value.max !== undefined) range.lte = isNaN(value.max) ? new Date(value.max) : Number(value.max)
        return { [field]: range }
      }

      // Valeur simple (enum, relation id, etc.)
      return { [field]: value }
    })
    .filter(Boolean)

  return conditions.length ? { AND: conditions } : null
}

function mergeWhere(...wheres) {
  const valid = wheres.filter(Boolean)
  if (!valid.length) return {}
  if (valid.length === 1) return valid[0]
  return { AND: valid }
}

// "client.email" → { client: { email: condition } }
function buildNestedWhere(fieldPath, condition) {
  const parts = fieldPath.split('.')
  return parts.reduceRight((acc, part) => ({ [part]: acc }), condition)
}

// L'id peut être un string (UUID) ou un number (autoincrement)
function castId(id) {
  const n = Number(id)
  return isNaN(n) ? id : n
}
