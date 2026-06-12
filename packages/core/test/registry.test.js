import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AdminRegistry } from '../src/registry.js'

// DMMF minimal réutilisable dans tous les tests
const MOCK_DMMF = {
  datamodel: {
    models: [
      {
        name: 'User',
        fields: [
          { name: 'id',           kind: 'scalar', type: 'Int',      isRequired: true  },
          { name: 'email',        kind: 'scalar', type: 'String',   isRequired: true  },
          { name: 'passwordHash', kind: 'scalar', type: 'String',   isRequired: true  },
          { name: 'isActive',     kind: 'scalar', type: 'Boolean',  isRequired: false },
          { name: 'role',         kind: 'enum',   type: 'Role',     isRequired: true  },
          { name: 'createdAt',    kind: 'scalar', type: 'DateTime', isRequired: true  },
          { name: 'updatedAt',    kind: 'scalar', type: 'DateTime', isRequired: true  },
        ],
      },
      {
        name: 'Post',
        fields: [
          { name: 'id',      kind: 'scalar', type: 'Int',    isRequired: true },
          { name: 'title',   kind: 'scalar', type: 'String', isRequired: true },
          { name: 'content', kind: 'scalar', type: 'String', isRequired: false },
        ],
      },
    ],
    enums: [
      { name: 'Role', values: [{ name: 'ADMIN' }, { name: 'USER' }] },
    ],
  },
}

const MOCK_PRISMA = {}

function makeRegistry() {
  const r = new AdminRegistry()
  r.init(MOCK_PRISMA, MOCK_DMMF)
  return r
}

// ── init ──────────────────────────────────────────────────────────────────────

test('registry.init — charge les enums du DMMF', () => {
  const r = makeRegistry()
  assert.deepEqual(r._enums['Role'], ['ADMIN', 'USER'])
})

test('registry.init — lève une erreur si DMMF invalide', () => {
  const r = new AdminRegistry()
  assert.throws(
    () => r.init(MOCK_PRISMA, {}),
    /DMMF manquant ou invalide/
  )
})

test('registry.init — lève une erreur si DMMF absent', () => {
  const r = new AdminRegistry()
  assert.throws(
    () => r.init(MOCK_PRISMA, null),
    /DMMF manquant ou invalide/
  )
})

// ── register ──────────────────────────────────────────────────────────────────

test('registry.register — enregistre un modèle existant', () => {
  const r = makeRegistry()
  r.register('User', {})
  assert.ok(r.getModel('User') !== null)
})

test('registry.register — lève une erreur pour modèle inconnu', () => {
  const r = makeRegistry()
  assert.throws(
    () => r.register('Ghost', {}),
    /introuvable dans le schema Prisma/
  )
})

test('registry.register — est chainable', () => {
  const r = makeRegistry()
  const result = r.register('User').register('Post')
  assert.equal(result, r)
})

// ── _buildConfig — valeurs par défaut ─────────────────────────────────────────

test('_buildConfig — label auto depuis camelCase', () => {
  const r = makeRegistry()
  r.register('User', {})
  assert.equal(r.getModel('User').label, 'User')
})

test('_buildConfig — labelPlural auto ajoute s', () => {
  const r = makeRegistry()
  r.register('Post', {})
  assert.equal(r.getModel('Post').labelPlural, 'Posts')
})

test('_buildConfig — label custom respecté', () => {
  const r = makeRegistry()
  r.register('User', { label: 'Utilisateur', labelPlural: 'Utilisateurs' })
  assert.equal(r.getModel('User').label, 'Utilisateur')
  assert.equal(r.getModel('User').labelPlural, 'Utilisateurs')
})

test('_buildConfig — passwordHash auto-caché dans form.hidden', () => {
  const r = makeRegistry()
  r.register('User', {})
  const hidden = r.getModel('User').form.hidden
  assert.ok(hidden.includes('passwordHash'))
})

test('_buildConfig — id et createdAt auto-readOnly', () => {
  const r = makeRegistry()
  r.register('User', {})
  const readOnly = r.getModel('User').form.readOnly
  assert.ok(readOnly.includes('id'))
  assert.ok(readOnly.includes('createdAt'))
  assert.ok(readOnly.includes('updatedAt'))
})

test('_buildConfig — featured false par défaut', () => {
  const r = makeRegistry()
  r.register('User', {})
  assert.equal(r.getModel('User').featured, false)
})

test('_buildConfig — featured true si déclaré', () => {
  const r = makeRegistry()
  r.register('User', { featured: true })
  assert.equal(r.getModel('User').featured, true)
})

test('_buildConfig — inlines vide par défaut', () => {
  const r = makeRegistry()
  r.register('User', {})
  assert.deepEqual(r.getModel('User').inlines, [])
})

test('_buildConfig — inline résolu avec valeurs par défaut', () => {
  const r = makeRegistry()
  r.register('User', {
    inlines: [{ model: 'Post', fk: 'userId' }],
  })
  const inline = r.getModel('User').inlines[0]
  assert.equal(inline.model, 'Post')
  assert.equal(inline.fk, 'userId')
  assert.equal(inline.extra, 1)
  assert.equal(inline.canAdd, true)
  assert.equal(inline.canDelete, true)
})

// ── registerAll ───────────────────────────────────────────────────────────────

test('registerAll — enregistre tous les modèles du DMMF', () => {
  const r = makeRegistry()
  r.registerAll()
  assert.ok(r.getModel('User') !== null)
  assert.ok(r.getModel('Post') !== null)
})

test('registerAll — respecte les exclusions', () => {
  const r = makeRegistry()
  r.registerAll(['Post'])
  assert.ok(r.getModel('User') !== null)
  assert.equal(r.getModel('Post'), null)
})

// ── getAllModels ──────────────────────────────────────────────────────────────

test('getAllModels — retourne tous les modèles enregistrés', () => {
  const r = makeRegistry()
  r.register('User').register('Post')
  assert.equal(r.getAllModels().length, 2)
})

test('getAllModels — retourne une copie (pas la map interne)', () => {
  const r = makeRegistry()
  r.register('User')
  const list = r.getAllModels()
  list.push({ name: 'Fake' })
  assert.equal(r.getAllModels().length, 1)
})
