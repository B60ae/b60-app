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
  let decoded: { userId: string; iat: number; exp: number }

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!, {
      algorithms: ['HS256'],
      // Reject tokens issued before this Unix timestamp (rotate if compromised)
      clockTolerance: 30,
    }) as { userId: string; iat: number; exp: number }
  } catch (err: any) {
    const msg = err?.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'
    return res.status(401).json({ error: msg })
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, name, loyalty_points, terms_accepted_at, terms_version, is_suspended')
    .eq('id', decoded.userId)
    .single()

  if (error || !user) return res.status(401).json({ error: 'User not found' })

  // Block suspended accounts before any route logic executes
  if ((user as any).is_suspended) {
    return res.status(403).json({ error: 'Account suspended. Contact support at info@b60.ae' })
  }

  req.userId = decoded.userId
  req.user = user
  next()
}
