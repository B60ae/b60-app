import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { supabase } from '../config/supabase'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { pushOrderToDart, getOrderStatusFromDart } from '../services/dartPos'
import { awardPoints, redeemPoints } from '../services/loyalty'

export const ordersRouter = Router()
ordersRouter.use(requireAuth)

// ─── Create Order ─────────────────────────────────────────────────────────────
ordersRouter.post('/',
  body('items').isArray({ min: 1 }),
  body('location_id').notEmpty(),
  body('total').isNumeric(),
  async (req: AuthRequest, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { items, location_id, subtotal, points_redeemed, discount, total } = req.body
    const userId = req.userId!

    try {
      // Validate and apply points redemption
      let finalDiscount = discount ?? 0
      if (points_redeemed > 0) {
        await redeemPoints(userId, 'pending', points_redeemed)
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

      // Push to Dart POS
      const dartPayload = {
        external_id: order.id,
        location_id,
        items: items.map((i: any) => ({
          sku: i.menu_item.id,
          name: i.menu_item.name,
          quantity: i.quantity,
          unit_price: i.menu_item.price,
          modifiers: i.selected_options.map((o: any) => ({ name: o.name, price: o.price_delta })),
        })),
        total,
        customer_name: req.user?.name,
        customer_phone: req.user?.phone,
      }

      let dartResponse
      try {
        dartResponse = await pushOrderToDart(dartPayload)
      } catch {
        // Log but don't fail — order is in DB, can retry
        console.error(`[Orders] Dart POS push failed for order ${order.id}`)
      }

      // Update with POS data
      const estimatedReadyAt = dartResponse
        ? new Date(Date.now() + dartResponse.estimated_ready_minutes * 60000).toISOString()
        : new Date(Date.now() + 15 * 60000).toISOString()

      const { data: updatedOrder } = await supabase
        .from('orders')
        .update({
          dart_pos_order_id: dartResponse?.pos_order_id,
          status: 'confirmed',
          estimated_ready_at: estimatedReadyAt,
        })
        .eq('id', order.id)
        .select()
        .single()

      // Award points (net of redemption)
      const pointsEarned = await awardPoints(userId, order.id, total)
      await supabase.from('orders').update({ points_earned: pointsEarned }).eq('id', order.id)

      res.status(201).json({ ...updatedOrder, points_earned: pointsEarned })

    } catch (err: any) {
      console.error('[Orders] Error:', err.message)
      res.status(500).json({ error: 'Failed to create order' })
    }
  }
)

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

// ─── Order History ────────────────────────────────────────────────────────────
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
