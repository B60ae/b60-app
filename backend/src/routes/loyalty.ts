import { Router } from 'express'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { supabase } from '../config/supabase'
import { getBalance } from '../services/loyalty'

export const loyaltyRouter = Router()
loyaltyRouter.use(requireAuth)

loyaltyRouter.get('/balance', async (req: AuthRequest, res) => {
  const balance = await getBalance(req.userId!)
  res.json(balance)
})

loyaltyRouter.get('/history', async (req: AuthRequest, res) => {
  const { data, error } = await supabase
    .from('loyalty_transactions')
    .select('*')
    .eq('user_id', req.userId!)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return res.status(500).json({ error: 'Failed to fetch history' })
  res.json(data)
})
