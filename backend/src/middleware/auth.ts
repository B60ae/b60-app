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
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single()

    if (error || !user) return res.status(401).json({ error: 'User not found' })

    req.userId = decoded.userId
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
