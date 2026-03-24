import { Router } from 'express'
import { supabase } from '../config/supabase'

export const locationsRouter = Router()

locationsRouter.get('/', async (_, res) => {
  const { data, error } = await supabase.from('locations').select('*').order('name')
  if (error) return res.status(500).json({ error: 'Failed to fetch locations' })
  res.json(data)
})
