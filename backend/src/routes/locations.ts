import { Router } from 'express'
import { supabase } from '../config/supabase'
import { cache, TTL } from '../services/cache'

export const locationsRouter = Router()

locationsRouter.get('/', async (_, res) => {
  const KEY = 'locations:all'
  const cached = cache.get<any[]>(KEY)
  if (cached) {
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
    return res.json(cached)
  }

  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .not('name', 'ilike', '%ghurair%')
    .order('name')

  if (error) return res.status(500).json({ error: 'Failed to fetch locations' })
  cache.set(KEY, data, TTL.LOCATIONS)
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
  res.json(data)
})
