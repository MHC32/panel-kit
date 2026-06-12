import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import createError from 'http-errors'

export function buildAuthRouter({ prisma, secret, auth }) {
  const router = Router()

  const {
    userModel     = 'User',
    loginField    = 'email',
    passwordField = 'passwordHash',
    isAdmin       = (user) => user.isAdmin === true || user.role === 'SUPER_ADMIN',
  } = auth

  // Accès dynamique au modèle User sur l'instance Prisma
  function getUserDelegate() {
    const key = userModel.charAt(0).toLowerCase() + userModel.slice(1)
    return prisma[key]
  }

  // POST /admin/api/auth/login
  router.post('/login', async (req, res, next) => {
    try {
      const { email, password } = req.body ?? {}
      if (!email || !password) throw createError(400, 'Email et mot de passe requis')

      const delegate = getUserDelegate()
      const user = await delegate.findFirst({
        where: { [loginField]: email },
      })

      if (!user) throw createError(401, 'Identifiants incorrects')

      const valid = await bcrypt.compare(password, user[passwordField])
      if (!valid) throw createError(401, 'Identifiants incorrects')

      // Vérifier que l'utilisateur est bien admin
      if (!isAdmin(user)) throw createError(403, 'Accès refusé — droits insuffisants')

      const token = jwt.sign(
        { sub: user.id, email: user[loginField], panel: true },
        secret,
        { expiresIn: '8h' }
      )

      res.json({
        success: true,
        token,
        user: {
          id:    user.id,
          email: user[loginField],
          name:  user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user.name ?? user[loginField],
        },
      })
    } catch (err) {
      next(err)
    }
  })

  // POST /admin/api/auth/logout
  router.post('/logout', (req, res) => {
    // JWT stateless — le client supprime son token
    res.json({ success: true })
  })

  // GET /admin/api/auth/me
  router.get('/me', requireAuth(secret), async (req, res, next) => {
    try {
      const delegate = getUserDelegate()
      const user = await delegate.findUnique({ where: { id: req.panelUser.sub } })
      if (!user) throw createError(401, 'Session invalide')

      res.json({
        success: true,
        user: {
          id:    user.id,
          email: user[loginField],
          name:  user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user.name ?? user[loginField],
        },
      })
    } catch (err) {
      next(err)
    }
  })

  return router
}

// Middleware de vérification du token panel-kit
export function requireAuth(secret) {
  return (req, res, next) => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return next(createError(401, 'Non authentifié'))
    }

    try {
      const payload = jwt.verify(header.slice(7), secret)
      if (!payload.panel) return next(createError(401, 'Token invalide'))
      req.panelUser = payload
      next()
    } catch {
      next(createError(401, 'Session expirée'))
    }
  }
}
