import { Router } from 'express'
import { supabase } from '../config/supabase'

export const menuRouter = Router()

// ─── Categories ───────────────────────────────────────────────────────────────
menuRouter.get('/categories', async (_, res) => {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .order('sort_order')

  if (error) return res.status(500).json({ error: 'Failed to fetch categories' })
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
  res.json(data)
})

// ─── Items ────────────────────────────────────────────────────────────────────
menuRouter.get('/items', async (req, res) => {
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
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30')
  res.json(data)
})

// ─── Single Item ──────────────────────────────────────────────────────────────

// Add-ons only available for burger/chicken items (not drinks, sides, desserts)
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
  const { data: item, error } = await supabase
    .from('menu_items')
    .select('*, menu_categories(slug)')
    .eq('id', req.params.id)
    .single()

  if (error || !item) return res.status(404).json({ error: 'Item not found' })

  const categorySlug = (item as any).menu_categories?.slug?.toLowerCase() ?? ''
  const hasAddons = ADDON_CATEGORY_SLUGS.some(s => categorySlug.includes(s))

  // Only expose add-ons group — strip any existing customizations (removes Heat Level etc.)
  const customizations = hasAddons ? [BURGER_ADDONS] : []

  res.json({ ...item, customizations })
})

// ─── Featured ─────────────────────────────────────────────────────────────────
menuRouter.get('/featured', async (_, res) => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('is_featured', true)
    .eq('is_available', true)
    .order('sort_order')

  if (error) return res.status(500).json({ error: 'Failed to fetch featured' })
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30')
  res.json(data)
})
