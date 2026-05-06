import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import { supabase } from '../config/supabase'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { pushOrderToDart, getOrderStatusFromDart, isLocationExcludedFromDart } from '../services/dartPos'
import { awardPoints, redeemPoints } from '../services/loyalty'

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

    const { items, location_id, subtotal, points_redeemed, discount, total } = req.body
    const userId = req.userId!

    try {
      const finalDiscount = discount ?? 0

      // Validate that submitted item prices match the menu (prevents price injection)
      const itemIds = items.map((i: any) => i.menu_item.id)
      const { data: menuItems } = await supabase
        .from('menu_items')
        .select('id, price')
        .in('id', itemIds)

      if (menuItems) {
        const priceMap = new Map(menuItems.map((m: any) => [m.id, Number(m.price)]))
        for (const item of items) {
          const realPrice = priceMap.get(item.menu_item.id)
          if (realPrice === undefined) {
            return res.status(400).json({ error: `Unknown item: ${item.menu_item.id}` })
          }
          const submittedPrice = Number(item.menu_item.price)
          if (Math.abs(submittedPrice - realPrice) > 0.01) {
            return res.status(400).json({ error: 'Price mismatch detected. Please refresh and try again.' })
          }
        }
      }

      // Validate points balance before creating order
      if (points_redeemed > 0) {
        const { data: balanceUser } = await supabase
          .from('users').select('loyalty_points').eq('id', userId).single()
        if (!balanceUser || balanceUser.loyalty_points < points_redeemed) {
          return res.status(400).json({ error: 'Insufficient points' })
        }
      }

      // Create order in Supabase
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          location_id,
          items,
          status: 'pending',
          subtotal,
          points_redeemed: points_redeemed ?? 0,
          discount: finalDiscount,
          total,
        })
        .select()
        .single()

      if (error) throw error

      // Redeem points now that we have a real order id
      if (points_redeemed > 0) {
        await redeemPoints(userId, order.id, points_redeemed)
      }

      // Push to Dart POS (skip excluded locations e.g. Ghurair)
      let dartResponse
      if (!isLocationExcludedFromDart(location_id)) {
        // Fetch dart_food_id mappings for all items in this order
        const { data: dartItems } = await supabase
          .from('menu_items')
          .select('id, dart_food_id, dart_variant_id')
          .in('id', items.map((i: any) => i.menu_item.id))

        const dartIdMap = new Map((dartItems ?? []).map((d: any) => [d.id, d]))

        // Only push items that have a dart_food_id mapped
        const mappedItems: { sku: string; variant_id: string; name: string; quantity: number; unit_price: number; modifiers: { name: string; price: number }[] }[] = []
        for (const i of items as any[]) {
          const dart = dartIdMap.get(i.menu_item.id)
          if (!dart?.dart_food_id) continue
          mappedItems.push({
            sku: dart.dart_food_id,
            variant_id: dart.dart_variant_id ?? dart.dart_food_id,
            name: i.menu_item.name,
            quantity: i.quantity,
            unit_price: i.menu_item.price,
            modifiers: (i.selected_options ?? []).map((o: any) => ({ name: o.name, price: o.price_delta })),
          })
        }

        const skippedItems = items.filter((i: any) => !dartIdMap.get(i.menu_item.id)?.dart_food_id)
        if (skippedItems.length > 0) {
          console.log(`[Orders] Skipping ${skippedItems.length} unmapped items from DartPOS: ${skippedItems.map((i: any) => i.menu_item.name).join(', ')}`)
        }

        const dartPayload = {
          external_id: order.id,
          location_id,
          items: mappedItems,
          total,
          customer_name: req.user?.name,
          customer_phone: req.user?.phone,
        }
        try {
          dartResponse = await pushOrderToDart(dartPayload)
        } catch {
          console.error(`[Orders] Dart POS push failed for order ${order.id}`)
        }
      } else {
        console.log(`[Orders] Skipping Dart POS for excluded location ${location_id} (order ${order.id})`)
      }

      // Update with POS data
      const readyMinutes = Number.isFinite(dartResponse?.estimated_ready_minutes) && dartResponse!.estimated_ready_minutes > 0
        ? dartResponse!.estimated_ready_minutes
        : 15
      const estimatedReadyAt = new Date(Date.now() + readyMinutes * 60000).toISOString()

      // Award points (net of redemption)
      const pointsEarned = await awardPoints(userId, order.id, total)

      const { data: updatedOrder } = await supabase
        .from('orders')
        .update({
          dart_pos_order_id: dartResponse?.pos_order_id,
          status: 'confirmed',
          estimated_ready_at: estimatedReadyAt,
          points_earned: pointsEarned,
        })
        .eq('id', order.id)
        .select()
        .single()

      // Update order streak for games leaderboard
      updateOrderStreak(userId).catch(e => console.error('[Orders] Streak update failed:', e))

      res.status(201).json({ ...(updatedOrder ?? order), points_earned: pointsEarned })

    } catch (err: any) {
      console.error('[Orders] Error:', err.message)
      res.status(500).json({ error: 'Failed to create order' })
    }
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
      .select('id, status, total, subtotal, points_earned, points_redeemed, discount, created_at, location_id, estimated_ready_at, items')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single()

    if (error || !data) return res.status(404).json({ error: 'Order not found' })
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
