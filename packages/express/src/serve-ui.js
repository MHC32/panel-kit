import { createRequire } from 'module'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { Router } from 'express'

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
    // UI non buildée — retourner une page d'instruction
    router.get('*', (req, res) => {
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
  const { default: serveStatic } = await_import_workaround('serve-static')
  router.use(serveStatic(uiDistPath))

  // SPA fallback — toutes les routes non-API retournent index.html
  // La React app gère le routing côté client
  router.get('*', (req, res) => {
    res.sendFile(join(uiDistPath, 'index.html'))
  })

  return router
}

function await_import_workaround(pkg) {
  // eslint-disable-next-line no-new-func
  return new Function(`return import('${pkg}')`)().then(m => m.default ?? m)
}
