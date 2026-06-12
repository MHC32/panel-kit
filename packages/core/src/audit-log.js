// Audit log optionnel — enregistre les actions CREATE/UPDATE/DELETE
// Si le modèle d'audit n'existe pas dans Prisma, toutes les opérations sont silencieuses

export function createAuditLogger(prisma, options = {}) {
  // options.model  = nom du modèle Prisma pour stocker les logs (défaut: 'PanelAuditLog')
  // options.enabled = boolean (défaut: false)
  if (!options.enabled) return NO_OP_LOGGER

  const modelName = typeof options.model === 'string' ? options.model : 'PanelAuditLog'
  const modelKey  = modelName.charAt(0).toLowerCase() + modelName.slice(1)
  const delegate  = prisma[modelKey]

  if (!delegate) {
    console.warn(
      `[panel-kit] auditLog activé mais le modèle "${modelName}" est introuvable sur l'instance Prisma.\n` +
      `Ajoutez ce modèle dans votre schema.prisma pour activer l'audit log :\n\n` +
      AUDIT_SCHEMA_SNIPPET
    )
    return NO_OP_LOGGER
  }

  return {
    async log({ action, model, recordId, userId, before, after }) {
      try {
        const changes = computeChanges(before, after)
        await delegate.create({
          data: {
            action,
            model,
            recordId:  String(recordId),
            userId:    userId ? String(userId) : null,
            changes:   changes ? JSON.stringify(changes) : null,
          },
        })
      } catch {
        // Ne pas bloquer l'opération principale si le log échoue
      }
    },
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const NO_OP_LOGGER = { log: async () => {} }

// Calcule un diff { field: { from, to } } entre avant et après
function computeChanges(before, after) {
  if (!before && !after) return null
  if (!before) return null  // CREATE — pas de diff pertinent (le record est dans after)
  if (!after)  return null  // DELETE — idem

  const changes = {}
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])
  for (const key of allKeys) {
    const bv = before[key]
    const av = after[key]
    // Comparer en JSON pour gérer les objets/dates
    if (JSON.stringify(bv) !== JSON.stringify(av)) {
      changes[key] = { from: bv, to: av }
    }
  }
  return Object.keys(changes).length ? changes : null
}

export const AUDIT_SCHEMA_SNIPPET = `
model PanelAuditLog {
  id        Int      @id @default(autoincrement())
  action    String   // CREATE | UPDATE | DELETE
  model     String
  recordId  String
  userId    String?
  changes   String?  // JSON { field: { from, to } }
  createdAt DateTime @default(now())

  @@index([model, recordId])
  @@index([userId])
}
`
