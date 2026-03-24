import { supabase } from '../config/supabase'

const POINTS_PER_AED = 1      // 1 AED = 1 point
const POINTS_TO_AED = 0.05    // 1 point = AED 0.05 (20 pts = AED 1)

export async function awardPoints(userId: string, orderId: string, orderTotal: number): Promise<number> {
  const pointsToAward = Math.floor(orderTotal * POINTS_PER_AED)
  if (pointsToAward <= 0) return 0

  // Record transaction
  await supabase.from('loyalty_transactions').insert({
    user_id: userId,
    order_id: orderId,
    type: 'earned',
    points: pointsToAward,
    description: `Points earned on order #${orderId.slice(-6).toUpperCase()}`,
  })

  // Update user balance
  const { data: user } = await supabase
    .from('users')
    .select('loyalty_points')
    .eq('id', userId)
    .single()

  await supabase
    .from('users')
    .update({ loyalty_points: (user?.loyalty_points ?? 0) + pointsToAward })
    .eq('id', userId)

  return pointsToAward
}

export async function redeemPoints(userId: string, orderId: string, pointsToRedeem: number): Promise<number> {
  if (pointsToRedeem <= 0) return 0

  const { data: user } = await supabase
    .from('users')
    .select('loyalty_points')
    .eq('id', userId)
    .single()

  if (!user || user.loyalty_points < pointsToRedeem) {
    throw new Error('Insufficient points')
  }

  const discountAmount = pointsToRedeem * POINTS_TO_AED

  // Record transaction
  await supabase.from('loyalty_transactions').insert({
    user_id: userId,
    order_id: orderId,
    type: 'redeemed',
    points: -pointsToRedeem,
    description: `${pointsToRedeem} points redeemed for AED ${discountAmount.toFixed(0)} off`,
  })

  // Deduct from balance
  await supabase
    .from('users')
    .update({ loyalty_points: user.loyalty_points - pointsToRedeem })
    .eq('id', userId)

  return discountAmount
}

export async function getBalance(userId: string) {
  const { data: user } = await supabase
    .from('users')
    .select('loyalty_points')
    .eq('id', userId)
    .single()

  const points = user?.loyalty_points ?? 0
  const tier = points >= 5000 ? 'Gold' : points >= 1000 ? 'Silver' : 'Bronze'
  const tiers = [
    { name: 'Bronze', min: 0, max: 999 },
    { name: 'Silver', min: 1000, max: 4999 },
    { name: 'Gold', min: 5000, max: Infinity },
  ]
  const nextTier = tiers.find(t => t.min > points)

  return {
    total_points: points,
    redeemable_points: points,
    aed_value: parseFloat((points * POINTS_TO_AED).toFixed(2)),
    tier,
    next_tier_points: nextTier?.min,
  }
}
