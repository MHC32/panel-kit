import { createRequire } from 'module'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { Router, static as expressStatic } from 'express'

// Sert les fichiers statiques de la React app pré-buildée (@panel-kit/ui/dist)
export function serveUI({ basePath = '/admin' }) {
  const router = Router()

  // Chercher le dossier dist de @panel-kit/ui
  const require = createRequire(import.meta.url)
  let uiDistPath = null

  try {
    const uiPkg = require.resolve('@panel-kit/ui/package.json')
    const candidate = join(dirname(uiPkg), 'dist')
    if (existsSync(candidate)) uiDistPath = candidate
  } catch {
    // En développement (monorepo) — chercher le dist relatif
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const candidate = join(__dirname, '../../../ui/dist')
    if (existsSync(candidate)) uiDistPath = candidate
  }

  if (!uiDistPath) {
    router.use((req, res) => {
      res.send(`
        <html><body style="font-family:sans-serif;padding:2rem">
          <h2>panel-kit UI non trouvée</h2>
          <p>Exécutez <code>npm run build --workspace=packages/ui</code> pour builder l'interface.</p>
        </body></html>
      `)
    })
    return router
  }

  // Servir les assets statiques (JS, CSS, images)
  router.use(expressStatic(uiDistPath))

  // SPA fallback — toutes les routes non-asset retournent index.html
  router.use((req, res) => {
    res.sendFile(join(uiDistPath, 'index.html'))
  })

  return router
}
