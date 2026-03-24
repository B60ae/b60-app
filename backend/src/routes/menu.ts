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
  res.json(data)
})

// ─── Single Item ──────────────────────────────────────────────────────────────
menuRouter.get('/items/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(404).json({ error: 'Item not found' })
  res.json(data)
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
  res.json(data)
})
