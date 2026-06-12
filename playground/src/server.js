import express from 'express'
import { PrismaClient, Prisma } from '@prisma/client'
import { createPanel } from '@panel-kit/express'

const app  = express()
const prisma = new PrismaClient()

app.use(express.json())

// ── Routes métier normales du projet ──────────────────────────────────────
app.get('/api/ping', (req, res) => res.json({ ok: true }))

// ── panel-kit branché sur /admin ──────────────────────────────────────────
app.use('/admin', createPanel({
  prisma,
  dmmf:     Prisma.dmmf,
  provider: 'sqlite',
  secret:   process.env.ADMIN_SECRET ?? 'dev-secret-change-in-prod',
  theme: {
    appName: 'Playground Admin',
    accent:  '#7C3AED',
    rail:    '#1A0A2E',
  },

  auth: {
    userModel:     'User',
    loginField:    'email',
    passwordField: 'passwordHash',
    isAdmin:       (user) => user.role === 'SUPER_ADMIN',
  },

  // Déclarer uniquement les modèles qu'on veut exposer
  // (si omis → tous les modèles sont auto-enregistrés)
  models: {
    User: {
      list: {
        fields:  ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'createdAt'],
        search:  ['email', 'firstName', 'lastName'],
        filters: ['isActive', 'role'],
      },
      form: {
        readOnly: ['id', 'createdAt', 'updatedAt'],
        hidden:   ['passwordHash'],
      },
    },

    Product: {
      list: {
        fields:  ['id', 'name', 'price', 'stock', 'isActive', 'createdAt'],
        search:  ['name', 'description'],
        filters: ['isActive', 'categoryId'],
        sort:    { field: 'createdAt', dir: 'desc' },
      },
      form: {
        readOnly: ['id', 'createdAt', 'updatedAt'],
        sections: [
          { title: 'Informations',  fields: ['name', 'description', 'categoryId'] },
          { title: 'Prix & Stock',  fields: ['price', 'stock'] },
          { title: 'Statut',        fields: ['isActive'] },
        ],
      },
      actions: [
        {
          label:   'Désactiver la sélection',
          context: 'list',
          onClick: async (ids, { prisma: db }) => {
            await db.product.updateMany({
              where: { id: { in: ids } },
              data:  { isActive: false },
            })
          },
        },
      ],
    },

    Order: {
      list: {
        fields:        ['id', 'status', 'total', 'userId', 'createdAt'],
        filters:       ['status'],
        sort:          { field: 'createdAt', dir: 'desc' },
        dateHierarchy: 'createdAt',   // date_hierarchy sur createdAt
      },
      form: {
        readOnly: ['id', 'total', 'createdAt', 'updatedAt'],
      },
      // Inline : OrderItems dans le formulaire Order
      inlines: [
        {
          model: 'OrderItem',
          fk:    'orderId',
          label: 'Lignes de commande',
          extra: 1,
        },
      ],
    },

    Category: {},   // zéro config — tout auto

    // OrderItem exposé séparément pour l'autocomplete inline
    OrderItem: {
      form: {
        readOnly: ['id', 'createdAt', 'updatedAt'],
      },
    },
  },
}))

const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => {
  console.log(`Playground running → http://localhost:${PORT}`)
  console.log(`Admin panel      → http://localhost:${PORT}/admin`)
  console.log(`Admin API meta   → http://localhost:${PORT}/admin/api/meta`)
})
