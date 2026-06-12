# panel-kit

Admin panel auto-généré pour Node.js + Prisma + PostgreSQL (ou SQLite).  
Branchez-le sur votre app Express en 5 minutes — CRUD complet, auth JWT, thème configurable.

> Inspiré de Django Admin. Pensé pour les projets qui veulent un back-office sans sacrifier une semaine de dev.

---

## Sommaire

- [Installation](#installation)
- [Démarrage rapide](#démarrage-rapide)
- [Référence `createPanel()`](#référence-createpanel)
  - [Options racine](#options-racine)
  - [Options `auth`](#options-auth)
  - [Options `theme`](#options-theme)
  - [Config par modèle](#config-par-modèle)
    - [list](#list)
    - [form](#form)
    - [actions](#actions)
    - [inlines](#inlines)
- [Dashboard](#dashboard)
- [Permissions](#permissions)
- [Audit log](#audit-log)
- [Recherche globale](#recherche-globale)
- [Export CSV / JSON](#export-csv--json)
- [Architecture](#architecture)

---

## Installation

```bash
npm install @panel-kit/express @panel-kit/core @panel-kit/ui
```

`@panel-kit/ui` contient la React app pré-buildée — elle est servie automatiquement par `@panel-kit/express`.

---

## Démarrage rapide

```js
// server.js
import express from 'express'
import { PrismaClient, Prisma } from '@prisma/client'
import { createPanel } from '@panel-kit/express'

const app    = express()
const prisma = new PrismaClient()

app.use(express.json())

app.use('/admin', createPanel({
  prisma,
  dmmf:   Prisma.dmmf,
  secret: process.env.ADMIN_SECRET,

  auth: {
    userModel:     'User',
    loginField:    'email',
    passwordField: 'passwordHash',
    isAdmin:       (user) => user.role === 'SUPER_ADMIN',
  },
}))

app.listen(3000)
```

Ouvrez `http://localhost:3000/admin` — panel-kit auto-détecte tous vos modèles Prisma et génère le CRUD.

> **Important** : `Prisma.dmmf` vient du `@prisma/client` de **votre projet**, pas de panel-kit.  
> Il doit être passé explicitement pour que panel-kit lise votre schéma.

---

## Référence `createPanel()`

### Options racine

| Option | Type | Défaut | Description |
|---|---|---|---|
| `prisma` | `PrismaClient` | — | **Requis.** Votre instance Prisma. |
| `dmmf` | `Prisma.dmmf` | — | **Requis.** Le DMMF de votre projet : `import { Prisma } from '@prisma/client'`. |
| `secret` | `string` | — | **Requis.** Clé de signature JWT. Utilisez une valeur longue et aléatoire en prod. |
| `provider` | `'postgresql'` \| `'sqlite'` | `'postgresql'` | Adapte les requêtes (ex: `mode: 'insensitive'` désactivé sur SQLite). |
| `models` | `object` | `{}` | Config par modèle. Si omis, tous les modèles sont auto-enregistrés. |
| `exclude` | `string[]` | `[]` | Modèles à exclure de l'auto-enregistrement. |
| `basePath` | `string` | `'/admin'` | Chemin de base (doit correspondre au `app.use()`). |
| `auth` | `object` | voir ci-dessous | Config d'authentification. |
| `theme` | `object` | voir ci-dessous | Thème visuel. |
| `auditLog` | `boolean \| object` | `false` | Active le journal d'audit. |

---

### Options `auth`

```js
auth: {
  userModel:     'User',         // Nom du modèle Prisma contenant les admins
  loginField:    'email',        // Champ utilisé comme identifiant
  passwordField: 'passwordHash', // Champ contenant le hash bcrypt
  isAdmin:       (user) => user.role === 'SUPER_ADMIN', // Qui a accès ?
  getPermissions: (user, modelName) => ({  // Optionnel — permissions fines
    view:   true,
    create: user.role !== 'VIEWER',
    edit:   user.role !== 'VIEWER',
    delete: user.role === 'SUPER_ADMIN',
  }),
}
```

`getPermissions` est appelé à chaque requête CRUD. Si absent, tout est autorisé pour les admins.

---

### Options `theme`

```js
theme: {
  appName:  'Mon Admin',   // Nom affiché dans la sidebar
  accent:   '#7C3AED',     // Couleur principale (boutons, liens actifs)
  rail:     '#1A0A2E',     // Fond de la sidebar
  logo:     '/logo.png',   // URL du logo (optionnel)
}
```

---

### Config par modèle

Si `models` est omis, panel-kit enregistre tous les modèles avec une config par défaut.  
Dès qu'un modèle est déclaré dans `models`, seuls les modèles déclarés sont exposés.

```js
models: {
  User:     { /* config */ },
  Product:  { /* config */ },
  Category: {},  // zéro config — auto
}
```

#### list

Contrôle la page de liste (colonnes, recherche, filtres, tri, pagination).

```js
User: {
  list: {
    fields:        ['id', 'email', 'firstName', 'role', 'createdAt'],
    search:        ['email', 'firstName', 'lastName'],  // champs cherchables
    filters:       ['isActive', 'role'],                // filtres latéraux
    sort:          { field: 'createdAt', dir: 'desc' }, // tri par défaut
    perPage:       25,                                  // lignes par page
    dateHierarchy: 'createdAt',                         // drill-down date
  },
}
```

**`dateHierarchy`** : ajoute un navigateur Année → Mois → Jour au-dessus de la liste.  
Fonctionne sur n'importe quel champ `DateTime`.

#### form

Contrôle le formulaire de création / édition.

```js
Product: {
  form: {
    readOnly: ['id', 'createdAt', 'updatedAt'],  // champs affichés mais non éditables
    hidden:   ['passwordHash', 'internalNote'],   // champs masqués complètement
    sections: [                                   // regroupement visuel (optionnel)
      { title: 'Informations', fields: ['name', 'description', 'categoryId'] },
      { title: 'Prix & Stock', fields: ['price', 'stock'] },
      { title: 'Statut',       fields: ['isActive'] },
    ],
  },
}
```

Sans `sections`, tous les champs sont affichés à plat dans l'ordre déclaré.

**Widgets auto-détectés depuis le type Prisma :**

| Type Prisma | Widget |
|---|---|
| `String` | Champ texte |
| `Int`, `Float`, `Decimal` | Champ numérique |
| `Boolean` | Toggle |
| `DateTime` | Date/heure picker |
| `Json` | Éditeur JSON |
| `Enum` | Select avec toutes les valeurs |
| Relation (`@relation`) | Autocomplete avec recherche |

#### actions

Actions personnalisées déclenchées sur une sélection de la liste.

```js
Product: {
  actions: [
    {
      label:   'Désactiver la sélection',
      context: 'list',   // 'list' = action sur sélection multiple
      onClick: async (ids, { prisma }) => {
        await prisma.product.updateMany({
          where: { id: { in: ids } },
          data:  { isActive: false },
        })
      },
    },
  ],
}
```

#### inlines

Sous-tables éditables directement dans le formulaire parent (TabularInline).

```js
Order: {
  inlines: [
    {
      model:     'OrderItem',     // modèle enfant (doit être enregistré)
      fk:        'orderId',       // clé étrangère sur l'enfant
      label:     'Lignes de commande',
      extra:     1,               // lignes vides affichées par défaut
      canAdd:    true,            // autoriser l'ajout de lignes
      canDelete: true,            // autoriser la suppression de lignes
    },
  ],
}
```

---

## Dashboard

Le dashboard affiche automatiquement les compteurs de chaque modèle.  
Marquez un modèle `featured: true` pour le faire apparaître dans le **KPI strip** en haut.

```js
models: {
  Order:   { featured: true, list: { ... } },
  Product: { featured: true, list: { ... } },
  User:    { featured: true, list: { ... } },
}
```

Les cartes KPI affichent : nombre total d'enregistrements + date du dernier ajout.  
Un seul appel API au chargement — pas de N requêtes séparées.

Vous pouvez injecter vos propres widgets via le slot `dashboard` :

```jsx
<AdminProvider>
  <AdminShell slots={{
    dashboard: <MyKpiCards />,
    headerActions: <ExportButton />,
  }} />
</AdminProvider>
```

---

## Permissions

Pour un contrôle fin par modèle et par action, déclarez `getPermissions` dans `auth` :

```js
auth: {
  // ...
  getPermissions: (user, modelName) => {
    if (user.role === 'SUPER_ADMIN') {
      return { view: true, create: true, edit: true, delete: true }
    }
    if (modelName === 'User') {
      return { view: true, create: false, edit: false, delete: false }
    }
    return { view: true, create: true, edit: true, delete: false }
  },
}
```

- **Backend** : chaque route CRUD vérifie les permissions avant d'exécuter.
- **Frontend** : les boutons/colonnes inutilisables sont masqués automatiquement.
- Par défaut (sans `getPermissions`) : tout est autorisé pour les admins.

---

## Audit log

Enregistre chaque CREATE, UPDATE et DELETE avec le diff des champs modifiés.

```js
createPanel({
  // ...
  auditLog: true,  // ou { model: 'MyAuditLog' } pour un modèle personnalisé
})
```

Ajoutez ce modèle à votre `schema.prisma` :

```prisma
model PanelAuditLog {
  id        String   @id @default(uuid())
  action    String   // CREATE | UPDATE | DELETE
  model     String
  recordId  String
  userId    String?
  changes   Json?    // { field: { from, to } }
  createdAt DateTime @default(now())
}
```

Si le modèle est absent du schéma, panel-kit affiche un avertissement et continue sans planter.

---

## Recherche globale

Disponible via `Ctrl+K` (ou `Cmd+K` sur Mac).  
Cherche en parallèle dans tous les modèles qui ont au moins un champ `search` déclaré.

```js
User: {
  list: {
    search: ['email', 'firstName', 'lastName'],  // ces champs sont inclus
  },
}
```

---

## Export CSV / JSON

Disponible dans chaque liste via le menu **Exporter**.  
Exporte les données filtrées et triées de la page courante.

- **CSV** : compatible Excel, séparateur virgule, encodage UTF-8 avec BOM.
- **JSON** : tableau d'objets bruts.

---

## Architecture

```
panel-kit/
├── packages/
│   ├── core/          # Registry, CRUD resolver, schema parser, audit log
│   ├── express/       # Middleware Express — monte l'API + sert l'UI
│   └── ui/            # React app pré-buildée (sidebar, listes, formulaires)
└── playground/        # Exemple complet avec SQLite — prêt à lancer
```

**Flux d'une requête :**

```
Browser → GET /admin/*         → serve-ui.js sert index.html (SPA)
Browser → GET /admin/api/meta  → liste des modèles + config UI
Browser → POST /admin/api/auth/login → JWT
Browser → GET /admin/api/user  → listRecords() → Prisma → PostgreSQL
```

**Démarrer le playground :**

```bash
cd playground
npm install
npx prisma migrate dev
node src/seed.js
node src/server.js
# → http://localhost:3000/admin
# email: admin@panel-kit.dev  /  password: admin123
```
