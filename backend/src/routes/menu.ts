import { Router } from 'express'
import { supabase } from '../config/supabase'
import { cache, TTL } from '../services/cache'

export const menuRouter = Router()

// ─── Categories ───────────────────────────────────────────────────────────────
menuRouter.get('/categories', async (_, res) => {
  const KEY = 'menu:categories'
  const cached = cache.get<any[]>(KEY)
  if (cached) {
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
    return res.json(cached)
  }

  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .order('sort_order')

  if (error) return res.status(500).json({ error: 'Failed to fetch categories' })
  cache.set(KEY, data, TTL.MENU_CATEGORIES)
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
  res.json(data)
})

// ─── Items ────────────────────────────────────────────────────────────────────
menuRouter.get('/items', async (req, res) => {
  const categoryId = (req.query.category_id as string) ?? 'all'
  const KEY = `menu:items:${categoryId}`
  const cached = cache.get<any[]>(KEY)
  if (cached) {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30')
    return res.json(cached)
  }

  let query = supabase
    .from('menu_items')
    .select('*, menu_categories(name)')
    .eq('is_available', true)
    .order('sort_order')

  if (req.query.category_id) {
    query = query.eq('category_id', req.query.category_id as string)
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ error: 'Failed to fetch items' })
  cache.set(KEY, data, TTL.MENU_ITEMS)
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30')
  res.json(data)
})

// ─── Single Item ──────────────────────────────────────────────────────────────

const BURGER_ADDONS = {
  id: 'addons',
  name: 'Add-ons',
  type: 'multi' as const,
  options: [
    { id: 'extra-cheese', name: 'Extra Cheese', price_delta: 2 },
    { id: 'extra-bacon', name: 'Extra Beef Bacon', price_delta: 3 },
    { id: 'extra-jalapeno', name: 'Extra Jalapeños', price_delta: 2 },
  ],
}

const ADDON_CATEGORY_SLUGS = ['burgers', 'chicken']

menuRouter.get('/items/:id', async (req, res) => {
  const KEY = `menu:item:${req.params.id}`
  const cached = cache.get<any>(KEY)
  if (cached) return res.json(cached)

  const { data: item, error } = await supabase
    .from('menu_items')
    .select('*, menu_categories(slug)')
    .eq('id', req.params.id)
    .single()

  if (error || !item) return res.status(404).json({ error: 'Item not found' })

  const categorySlug = (item as any).menu_categories?.slug?.toLowerCase() ?? ''
  const hasAddons = ADDON_CATEGORY_SLUGS.some(s => categorySlug.includes(s))
  const customizations = hasAddons ? [BURGER_ADDONS] : []
  const result = { ...item, customizations }

  cache.set(KEY, result, TTL.MENU_ITEMS)
  res.json(result)
})

// ─── Featured ─────────────────────────────────────────────────────────────────
menuRouter.get('/featured', async (_, res) => {
  const KEY = 'menu:featured'
  const cached = cache.get<any[]>(KEY)
  if (cached) {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30')
    return res.json(cached)
  }

  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('is_featured', true)
    .eq('is_available', true)
    .order('sort_order')

  if (error) return res.status(500).json({ error: 'Failed to fetch featured' })
  cache.set(KEY, data, TTL.MENU_FEATURED)
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30')
  res.json(data)
})
