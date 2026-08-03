import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import { supabase } from '../config/supabase'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { getOrderStatusFromDart } from '../services/dartPos'
import { processOrder, processDartAsync } from '../agents/order'
import { award as awardLoyalty } from '../agents/loyalty'

export const ordersRouter = Router()
ordersRouter.use(requireAuth)
// Rate limiting applied at index.ts level (ordersLimiter) — not duplicated here

// ─── Create Order ─────────────────────────────────────────────────────────────
ordersRouter.post('/',
  body('items').isArray({ min: 1 }),
  body('items.*.menu_item.id').notEmpty().withMessage('Each item must have menu_item.id'),
  body('items.*.menu_item.price').isNumeric().withMessage('Each item must have menu_item.price'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Each item quantity must be >= 1'),
  body('location_id').notEmpty(),
  body('total').isNumeric(),
  body('subtotal').isNumeric(),
  async (req: AuthRequest, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { items, location_id, subtotal, points_redeemed, discount, total, voucher_code } = req.body
    const userId = req.userId!

    const result = await processOrder({
      userId,
      locationId: location_id,
      items: items.map((i: any) => ({
        id: i.menu_item.id,
        name: i.menu_item.name,
        price: i.menu_item.price,
        quantity: i.quantity,
        customizations: i.selected_options,
      })),
      subtotal,
      discount: discount ?? 0,
      total,
      pointsRedeemed: points_redeemed ?? 0,
      voucherCode: voucher_code,
      customerName: req.user?.name,
      customerPhone: req.user?.phone,
    })

    if (!result.success) {
      const statusCode = result.code === 'PRICE_MISMATCH' || result.code === 'INSUFFICIENT_POINTS'
        ? 400
        : result.code === 'SUSPENDED'
        ? 403
        : 500
      return res.status(statusCode).json({ error: result.error, code: result.code })
    }

    // Respond immediately — client gets 201 before DartPOS is even attempted
    res.status(201).json({
      id: result.orderId,
      status: 'pending',
      total: result.total,
      estimated_ready_at: result.estimatedReadyAt,
    })

    // Fire-and-forget background work — never blocks the response
    processDartAsync(result.orderId!, {
      userId,
      locationId: location_id,
      items: req.body.items.map((i: any) => ({
        id: i.menu_item.id,
        name: i.menu_item.name,
        price: i.menu_item.price,
        quantity: i.quantity,
        customizations: i.selected_options,
      })),
      subtotal,
      discount: discount ?? 0,
      total,
      pointsRedeemed: points_redeemed ?? 0,
      voucherCode: voucher_code,
      customerName: req.user?.name,
      customerPhone: req.user?.phone,
    }).catch(e => console.error('[Orders] DartPOS async error:', e))

    awardLoyalty({
      userId,
      sourceId: result.orderId!,
      amount: total,
      source: 'order',
    }).catch(e => console.error('[Orders] Loyalty award error:', e))

    updateOrderStreak(userId).catch(e => console.error('[Orders] Streak update failed:', e))
  }
)

// ─── Order History (must be before /:id) ──────────────────────────────────────
ordersRouter.get('/history', async (req: AuthRequest, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, total, subtotal, points_earned, points_redeemed, discount, created_at, location_id, estimated_ready_at, items')
    .eq('user_id', req.userId!)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return res.status(500).json({ error: 'Failed to fetch history' })

  // items is stored as jsonb — already includes menu_item snapshot
  res.json(data ?? [])
})

// ─── Get Order ────────────────────────────────────────────────────────────────
ordersRouter.get('/:id',
  param('id').isUUID().withMessage('Invalid order id'),
  async (req: AuthRequest, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid order id' })

    const { data, error } = await supabase
      .from('orders')
      .select('id, status, total, subtotal, points_earned, points_redeemed, discount, created_at, location_id, estimated_ready_at, items, dart_pos_order_id')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single()

    if (error || !data) return res.status(404).json({ error: 'Order not found' })

    // Sync status from Dart POS on every fetch while order is active
    if (data.dart_pos_order_id && !['ready', 'completed', 'cancelled'].includes(data.status)) {
      const posStatus = await getOrderStatusFromDart(data.dart_pos_order_id)
      if (posStatus?.status && posStatus.status !== data.status) {
        await supabase.from('orders').update({ status: posStatus.status }).eq('id', req.params.id)
        data.status = posStatus.status
      }
    }

    res.json(data)
  }
)

// ─── Track Order ──────────────────────────────────────────────────────────────
ordersRouter.get('/:id/track', async (req: AuthRequest, res) => {
  const { data: order } = await supabase
    .from('orders')
    .select('status, estimated_ready_at, dart_pos_order_id')
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .single()

  if (!order) return res.status(404).json({ error: 'Order not found' })

  // Sync status from Dart POS
  if (order.dart_pos_order_id && !['ready', 'completed', 'cancelled'].includes(order.status)) {
    const posStatus = await getOrderStatusFromDart(order.dart_pos_order_id)
    if (posStatus?.status && posStatus.status !== order.status) {
      await supabase.from('orders').update({ status: posStatus.status }).eq('id', req.params.id)
      order.status = posStatus.status
    }
  }

  res.json({ status: order.status, estimated_ready_at: order.estimated_ready_at })
})

// ─── Cancel Order ─────────────────────────────────────────────────────────────
ordersRouter.post('/:id/cancel', async (req: AuthRequest, res) => {
  const { data: order } = await supabase
    .from('orders')
    .select('status, points_earned')
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .single()

  if (!order) return res.status(404).json({ error: 'Order not found' })
  if (!['pending', 'confirmed'].includes(order.status)) {
    return res.status(400).json({ error: 'Order cannot be cancelled at this stage' })
  }

  await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', req.params.id)

  // Reverse points earned on this order
  if (order.points_earned > 0) {
    await supabase.rpc('increment_loyalty_points', {
      user_id_input: req.userId!,
      delta: -order.points_earned,
    })
    await supabase.from('loyalty_transactions').insert({
      user_id: req.userId!,
      order_id: req.params.id,
      type: 'cancelled',
      points: -order.points_earned,
      description: `Points reversed for cancelled order`,
    })
  }

  res.json({ success: true })
})

// ─── Streak Helper ────────────────────────────────────────────────────────────

async function updateOrderStreak(userId: string) {
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('game_streaks')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!existing) {
    await supabase.from('game_streaks').insert({
      user_id: userId, current_streak: 1, longest_streak: 1, last_order_date: today,
    })
    return
  }

  const last = existing.last_order_date
  if (last === today) return // already counted today

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const newStreak = last === yesterdayStr ? existing.current_streak + 1 : 1
  const longest = Math.max(existing.longest_streak, newStreak)

  await supabase.from('game_streaks').update({
    current_streak: newStreak, longest_streak: longest, last_order_date: today, updated_at: new Date().toISOString(),
  }).eq('user_id', userId)

  // Sync to leaderboard
  const weekStart = getWeekStart()
  const { data: user } = await supabase.from('users').select('name, email').eq('id', userId).single()
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Player')

  await supabase.from('game_leaderboard').upsert({
    user_id: userId, display_name: displayName, week_start: weekStart, order_streak: newStreak, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,week_start' })
}

function getWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().split('T')[0]
}
