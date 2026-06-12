import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseField, buildFormFields, buildFilterConfig, buildListColumns } from '../src/schema-parser.js'

// ── parseField ────────────────────────────────────────────────────────────────

test('parseField — scalaire String → widget text', () => {
  const result = parseField({ name: 'email', kind: 'scalar', type: 'String', isRequired: true })
  assert.equal(result.widget, 'text')
  assert.equal(result.type, 'string')
  assert.equal(result.filterWidget, 'search')
})

test('parseField — scalaire Boolean → widget toggle', () => {
  const result = parseField({ name: 'isActive', kind: 'scalar', type: 'Boolean', isRequired: false })
  assert.equal(result.widget, 'toggle')
  assert.equal(result.filterWidget, 'boolean')
})

test('parseField — scalaire DateTime → widget datetime', () => {
  const result = parseField({ name: 'createdAt', kind: 'scalar', type: 'DateTime', isRequired: true })
  assert.equal(result.widget, 'datetime')
  assert.equal(result.filterWidget, 'daterange')
})

test('parseField — scalaire Int → widget number', () => {
  const result = parseField({ name: 'price', kind: 'scalar', type: 'Int', isRequired: true })
  assert.equal(result.widget, 'number')
  assert.equal(result.filterWidget, 'range')
})

test('parseField — scalaire Json → pas de filterWidget', () => {
  const result = parseField({ name: 'metadata', kind: 'scalar', type: 'Json', isRequired: false })
  assert.equal(result.widget, 'json')
  assert.equal(result.filterWidget, null)
})

test('parseField — enum → widget enum-select avec enumName', () => {
  const result = parseField({ name: 'status', kind: 'enum', type: 'OrderStatus', isRequired: true })
  assert.equal(result.widget, 'enum-select')
  assert.equal(result.enumName, 'OrderStatus')
  assert.equal(result.filterWidget, 'enum-select')
})

test('parseField — relation → widget relation-select', () => {
  const result = parseField({ name: 'category', kind: 'object', type: 'Category', isRequired: false, isList: false })
  assert.equal(result.widget, 'relation-select')
  assert.equal(result.relatedModel, 'Category')
})

test('parseField — type inconnu → fallback widget text', () => {
  const result = parseField({ name: 'weird', kind: 'scalar', type: 'UnknownType', isRequired: false })
  assert.equal(result.widget, 'text')
})

// ── buildFormFields ───────────────────────────────────────────────────────────

const MOCK_MODEL_CONFIG = {
  fields: [
    { name: 'id',        kind: 'scalar', type: 'Int',     isRequired: true  },
    { name: 'email',     kind: 'scalar', type: 'String',  isRequired: true  },
    { name: 'password',  kind: 'scalar', type: 'String',  isRequired: true  },
    { name: 'status',    kind: 'enum',   type: 'Role',    isRequired: true  },
    { name: 'createdAt', kind: 'scalar', type: 'DateTime',isRequired: true  },
  ],
  form: {
    fields:   ['id', 'email', 'password', 'status', 'createdAt'],
    readOnly: ['id', 'createdAt'],
    hidden:   ['password'],
  },
}

test('buildFormFields — exclut les champs hidden', () => {
  const fields = buildFormFields(MOCK_MODEL_CONFIG)
  const names = fields.map(f => f.name)
  assert.ok(!names.includes('password'), 'password doit être exclu')
})

test('buildFormFields — marque readOnly correctement', () => {
  const fields = buildFormFields(MOCK_MODEL_CONFIG)
  const idField = fields.find(f => f.name === 'id')
  const emailField = fields.find(f => f.name === 'email')
  assert.equal(idField.readOnly, true)
  assert.equal(emailField.readOnly, false)
})

test('buildFormFields — injecte enumValues depuis enumMap', () => {
  const enumMap = { Role: ['ADMIN', 'USER', 'GUEST'] }
  const fields = buildFormFields(MOCK_MODEL_CONFIG, enumMap)
  const statusField = fields.find(f => f.name === 'status')
  assert.deepEqual(statusField.enumValues, ['ADMIN', 'USER', 'GUEST'])
})

test('buildFormFields — enumValues vide si enum absent du map', () => {
  const fields = buildFormFields(MOCK_MODEL_CONFIG, {})
  const statusField = fields.find(f => f.name === 'status')
  assert.deepEqual(statusField.enumValues, [])
})

test('buildFormFields — préserve l\'ordre de déclaration', () => {
  const fields = buildFormFields(MOCK_MODEL_CONFIG)
  const names = fields.map(f => f.name)
  // password est hidden donc absent, sinon l'ordre doit être id, email, status, createdAt
  assert.deepEqual(names, ['id', 'email', 'status', 'createdAt'])
})

// ── buildListColumns ──────────────────────────────────────────────────────────

const MOCK_LIST_CONFIG = {
  fields: [
    { name: 'id',    kind: 'scalar', type: 'Int',    isRequired: true },
    { name: 'name',  kind: 'scalar', type: 'String', isRequired: true },
    { name: 'price', kind: 'scalar', type: 'Float',  isRequired: true },
  ],
  list: { fields: ['id', 'name', 'price'] },
}

test('buildListColumns — retourne les colonnes dans l\'ordre', () => {
  const cols = buildListColumns(MOCK_LIST_CONFIG)
  assert.equal(cols.length, 3)
  assert.equal(cols[0].name, 'id')
  assert.equal(cols[1].name, 'name')
  assert.equal(cols[2].name, 'price')
})

test('buildListColumns — ignore un champ inexistant dans fields DMMF', () => {
  const config = {
    ...MOCK_LIST_CONFIG,
    list: { fields: ['id', 'ghost', 'name'] },
  }
  const cols = buildListColumns(config)
  const names = cols.map(c => c.name)
  assert.ok(!names.includes('ghost'))
  assert.equal(cols.length, 2)
})

// ── buildFilterConfig ─────────────────────────────────────────────────────────

const MOCK_FILTER_CONFIG = {
  fields: [
    { name: 'isActive', kind: 'scalar', type: 'Boolean', isRequired: false },
    { name: 'status',   kind: 'enum',   type: 'Status',  isRequired: true  },
    { name: 'metadata', kind: 'scalar', type: 'Json',    isRequired: false },
  ],
  list: { filters: ['isActive', 'status', 'metadata'] },
}

test('buildFilterConfig — Boolean → filterWidget boolean', () => {
  const filters = buildFilterConfig(MOCK_FILTER_CONFIG)
  const f = filters.find(f => f.name === 'isActive')
  assert.equal(f.filterWidget, 'boolean')
})

test('buildFilterConfig — enum → filterWidget enum-select avec values', () => {
  const filters = buildFilterConfig(MOCK_FILTER_CONFIG, { Status: ['ACTIVE', 'INACTIVE'] })
  const f = filters.find(f => f.name === 'status')
  assert.equal(f.filterWidget, 'enum-select')
  assert.deepEqual(f.enumValues, ['ACTIVE', 'INACTIVE'])
})

test('buildFilterConfig — Json → exclu des filtres (filterWidget null)', () => {
  const filters = buildFilterConfig(MOCK_FILTER_CONFIG)
  const names = filters.map(f => f.name)
  assert.ok(!names.includes('metadata'), 'Json ne doit pas apparaître dans les filtres')
})
