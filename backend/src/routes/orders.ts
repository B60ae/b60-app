import { Router } from 'express'
import { body, param, validationResult } from 'express-validator'
import rateLimit from 'express-rate-limit'
import { supabase } from '../config/supabase'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { pushOrderToDart, getOrderStatusFromDart, isLocationExcludedFromDart } from '../services/dartPos'
import { awardPoints, redeemPoints } from '../services/loyalty'

export const ordersRouter = Router()
ordersRouter.use(requireAuth)

// Per-user order rate limit: max 5 orders per minute
const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req: any) => req.userId ?? req.ip,
  message: { error: 'Too many orders placed. Please wait a moment.' },
})

// ─── Create Order ─────────────────────────────────────────────────────────────
ordersRouter.post('/', orderLimiter,
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
        const dartPayload = {
          external_id: order.id,
          location_id,
          items: items.map((i: any) => ({
            sku: i.menu_item.id,
            name: i.menu_item.name,
            quantity: i.quantity,
            unit_price: i.menu_item.price,
            modifiers: (i.selected_options ?? []).map((o: any) => ({ name: o.name, price: o.price_delta })),
          })),
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
    .select('*')
    .eq('user_id', req.userId!)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return res.status(500).json({ error: 'Failed to fetch history' })
  res.json(data)
})

// ─── Get Order ────────────────────────────────────────────────────────────────
ordersRouter.get('/:id', async (req: AuthRequest, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .single()

  if (error) return res.status(404).json({ error: 'Order not found' })
  res.json(data)
})

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
