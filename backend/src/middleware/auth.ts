import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { supabase } from '../config/supabase'

export interface AuthRequest extends Request {
  userId?: string
  user?: any
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = authHeader.slice(7)
  let decoded: { userId: string; tv?: number; iat: number; exp: number }

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!, {
      algorithms: ['HS256'],
      clockTolerance: 30,
    }) as { userId: string; tv?: number; iat: number; exp: number }
  } catch (err: any) {
    const msg = err?.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'
    return res.status(401).json({ error: msg })
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, name, loyalty_points, terms_accepted_at, terms_version, is_suspended, token_version')
    .eq('id', decoded.userId)
    .single()

  if (error || !user) return res.status(401).json({ error: 'User not found' })

  // Token revocation check — if token_version doesn't match, token was invalidated (logout)
  if ((decoded.tv ?? 0) !== (user.token_version ?? 0)) {
    return res.status(401).json({ error: 'Token revoked' })
  }

  if (user.is_suspended) {
    return res.status(403).json({ error: 'Account suspended. Contact support at info@b60.ae' })
  }

  req.userId = decoded.userId
  req.user = user
  next()
}
