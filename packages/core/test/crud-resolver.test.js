import { test } from 'node:test'
import assert from 'node:assert/strict'
import { listRecords, getRecord, createRecord, updateRecord, deleteRecord, deleteManyRecords } from '../src/crud-resolver.js'

// ── Config modèle mock ────────────────────────────────────────────────────────

const MODEL_CONFIG = {
  name: 'Product',
  fields: [
    { name: 'id',        kind: 'scalar', type: 'Int',     isRequired: true  },
    { name: 'name',      kind: 'scalar', type: 'String',  isRequired: true  },
    { name: 'price',     kind: 'scalar', type: 'Float',   isRequired: true  },
    { name: 'isActive',  kind: 'scalar', type: 'Boolean', isRequired: false },
    { name: 'createdAt', kind: 'scalar', type: 'DateTime',isRequired: true  },
  ],
  list: {
    fields:   ['id', 'name', 'price'],
    search:   ['name'],
    filters:  ['isActive'],
    sort:     { field: 'id', dir: 'asc' },
    perPage:  20,
  },
  form: {
    fields:   ['id', 'name', 'price', 'isActive'],
    readOnly: ['id', 'createdAt'],
    hidden:   [],
  },
}

// ── Helper : crée un mock prisma qui capture les appels ──────────────────────

function makePrisma(overrides = {}) {
  const calls = {}
  const delegate = {
    findMany:   async (args) => { calls.findMany   = args; return overrides.data ?? [] },
    count:      async (args) => { calls.count      = args; return overrides.total ?? 0 },
    findUnique: async (args) => { calls.findUnique = args; return overrides.record ?? null },
    create:     async (args) => { calls.create     = args; return { id: 1, ...args.data } },
    update:     async (args) => { calls.update     = args; return { id: 1, ...args.data } },
    delete:     async (args) => { calls.delete     = args; return { id: 1 } },
    deleteMany: async (args) => { calls.deleteMany = args; return { count: args.where?.id?.in?.length ?? 0 } },
  }
  return {
    prisma: { product: delegate },
    calls,
  }
}

// ── listRecords ───────────────────────────────────────────────────────────────

test('listRecords — retourne data + pagination', async () => {
  const { prisma } = makePrisma({ data: [{ id: 1, name: 'Foo' }], total: 1 })
  const result = await listRecords(prisma, MODEL_CONFIG, { page: 1, perPage: 10 })
  assert.equal(result.total, 1)
  assert.equal(result.page, 1)
  assert.equal(result.perPage, 10)
  assert.equal(result.totalPages, 1)
  assert.equal(result.data.length, 1)
})

test('listRecords — calcule skip correctement pour page 2', async () => {
  const { prisma, calls } = makePrisma()
  await listRecords(prisma, MODEL_CONFIG, { page: 2, perPage: 5 })
  assert.equal(calls.findMany.skip, 5)
  assert.equal(calls.findMany.take, 5)
})

test('listRecords — applique le tri par défaut de la config', async () => {
  const { prisma, calls } = makePrisma()
  await listRecords(prisma, MODEL_CONFIG, {})
  assert.deepEqual(calls.findMany.orderBy, { id: 'asc' })
})

test('listRecords — tri custom via query overrides la config', async () => {
  const { prisma, calls } = makePrisma()
  await listRecords(prisma, MODEL_CONFIG, { sortField: 'name', sortDir: 'desc' })
  assert.deepEqual(calls.findMany.orderBy, { name: 'desc' })
})

test('listRecords — search construit un OR sur les champs déclarés', async () => {
  const { prisma, calls } = makePrisma()
  await listRecords(prisma, MODEL_CONFIG, { search: 'foo' })
  assert.ok(calls.findMany.where.OR, 'doit y avoir un OR')
  assert.equal(calls.findMany.where.OR.length, 1) // un seul search field
  assert.equal(calls.findMany.where.OR[0].name.contains, 'foo')
})

test('listRecords — search sur sqlite sans mode insensitive', async () => {
  const { prisma, calls } = makePrisma()
  await listRecords(prisma, MODEL_CONFIG, { search: 'foo' }, 'sqlite')
  const condition = calls.findMany.where.OR[0].name
  assert.ok(!condition.mode, 'sqlite ne doit pas avoir mode insensitive')
})

test('listRecords — filtre boolean converti correctement', async () => {
  const { prisma, calls } = makePrisma()
  await listRecords(prisma, MODEL_CONFIG, { filters: { isActive: 'true' } })
  const where = calls.findMany.where
  assert.ok(where.AND.some(c => c.isActive === true))
})

test('listRecords — filtre range avec min/max', async () => {
  const { prisma, calls } = makePrisma()
  await listRecords(prisma, MODEL_CONFIG, { filters: { price: { min: '10', max: '100' } } })
  const where = calls.findMany.where
  const priceFilter = where.AND.find(c => c.price)
  assert.equal(priceFilter.price.gte, 10)
  assert.equal(priceFilter.price.lte, 100)
})

test('listRecords — sans filtres ni search → where vide', async () => {
  const { prisma, calls } = makePrisma()
  await listRecords(prisma, MODEL_CONFIG, {})
  assert.deepEqual(calls.findMany.where, {})
})

test('listRecords — page par défaut est 1', async () => {
  const { prisma, calls } = makePrisma()
  await listRecords(prisma, MODEL_CONFIG, {})
  assert.equal(calls.findMany.skip, 0)
})

// ── getRecord ─────────────────────────────────────────────────────────────────

test('getRecord — appelle findUnique avec l\'id casté', async () => {
  const { prisma, calls } = makePrisma({ record: { id: 42, name: 'Test' } })
  const result = await getRecord(prisma, MODEL_CONFIG, '42')
  assert.deepEqual(calls.findUnique.where, { id: 42 })
  assert.equal(result.name, 'Test')
})

test('getRecord — id UUID string non converti en number', async () => {
  const { prisma, calls } = makePrisma()
  await getRecord(prisma, MODEL_CONFIG, 'abc-uuid-123')
  assert.equal(calls.findUnique.where.id, 'abc-uuid-123')
})

// ── createRecord ──────────────────────────────────────────────────────────────

test('createRecord — passe les données nettoyées à prisma.create', async () => {
  const { prisma, calls } = makePrisma()
  await createRecord(prisma, MODEL_CONFIG, { name: 'Produit', price: 50, id: 99, createdAt: '...' })
  // id est dans readOnly → doit être retiré
  assert.ok(!('id' in calls.create.data), 'id ne doit pas être dans data')
  assert.equal(calls.create.data.name, 'Produit')
  assert.equal(calls.create.data.price, 50)
})

test('createRecord — retire les champs hidden', async () => {
  const configWithHidden = {
    ...MODEL_CONFIG,
    form: { ...MODEL_CONFIG.form, hidden: ['price'] },
  }
  const { prisma, calls } = makePrisma()
  await createRecord(prisma, configWithHidden, { name: 'Test', price: 99 })
  assert.ok(!('price' in calls.create.data))
})

// ── updateRecord ──────────────────────────────────────────────────────────────

test('updateRecord — appelle update avec where.id casté et data nettoyée', async () => {
  const { prisma, calls } = makePrisma()
  await updateRecord(prisma, MODEL_CONFIG, '5', { name: 'Nouveau', id: 5 })
  assert.deepEqual(calls.update.where, { id: 5 })
  assert.ok(!('id' in calls.update.data))
  assert.equal(calls.update.data.name, 'Nouveau')
})

// ── deleteRecord ──────────────────────────────────────────────────────────────

test('deleteRecord — appelle delete avec where.id casté', async () => {
  const { prisma, calls } = makePrisma()
  await deleteRecord(prisma, MODEL_CONFIG, '7')
  assert.deepEqual(calls.delete.where, { id: 7 })
})

// ── deleteManyRecords ─────────────────────────────────────────────────────────

test('deleteManyRecords — appelle deleteMany avec ids castés', async () => {
  const { prisma, calls } = makePrisma()
  await deleteManyRecords(prisma, MODEL_CONFIG, ['1', '2', '3'])
  assert.deepEqual(calls.deleteMany.where.id.in, [1, 2, 3])
})

// ── getDelegate — modèle introuvable ─────────────────────────────────────────

test('listRecords — lève une erreur si le modèle est absent de prisma', async () => {
  const prisma = {}  // pas de delegate 'product'
  await assert.rejects(
    () => listRecords(prisma, MODEL_CONFIG, {}),
    /introuvable sur l'instance Prisma/
  )
})
