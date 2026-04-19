import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { supabase } from '../config/supabase'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { awardPoints } from '../services/loyalty'

export const gamesRouter = Router()
gamesRouter.use(requireAuth)

const gameLimiter = rateLimit({ windowMs: 60_000, max: 30, keyGenerator: (req: any) => req.userId ?? req.ip })
gamesRouter.use(gameLimiter)

// ─── Spin Wheel ───────────────────────────────────────────────────────────────

const SPIN_PRIZES = [
  { type: 'points', value: '10',         weight: 30 },
  { type: 'points', value: '25',         weight: 25 },
  { type: 'points', value: '50',         weight: 15 },
  { type: 'points', value: '100',        weight: 10 },
  { type: 'points', value: '250',        weight: 5  },
  { type: 'points', value: '500',        weight: 3  },
  { type: 'discount', value: '10%',      weight: 6  },
  { type: 'discount', value: '15%',      weight: 3  },
  { type: 'free_item', value: 'Classic Beef', weight: 2 },
  { type: 'nothing', value: '',          weight: 1  },
]

function pickPrize() {
  const total = SPIN_PRIZES.reduce((s, p) => s + p.weight, 0)
  let r = Math.random() * total
  for (const prize of SPIN_PRIZES) {
    r -= prize.weight
    if (r <= 0) return prize
  }
  return SPIN_PRIZES[0]
}

function generateVoucherCode() {
  return 'B60-' + Math.random().toString(36).substring(2, 8).toUpperCase()
}

// GET /api/games/spin/status — 1 free spin/day + 1 per order
gamesRouter.get('/spin/status', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { count: spinsUsed } = await supabase
    .from('game_spins')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('spun_at', todayStart.toISOString())

  const { count: ordersToday } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', todayStart.toISOString())

  const totalAllowed = 1 + (ordersToday ?? 0)
  const used = spinsUsed ?? 0
  const spinsLeft = Math.max(0, totalAllowed - used)

  res.json({ can_spin: spinsLeft > 0, spins_left: spinsLeft, spins_used: used })
})

// POST /api/games/spin — 1 free spin/day + 1 per order
gamesRouter.post('/spin', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { count: spinsUsed } = await supabase
    .from('game_spins')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('spun_at', todayStart.toISOString())

  const { count: ordersToday } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', todayStart.toISOString())

  const totalAllowed = 1 + (ordersToday ?? 0)
  if ((spinsUsed ?? 0) >= totalAllowed) {
    return res.status(429).json({ error: 'No spins left today. Place an order to get more!' })
  }

  const prize = pickPrize()

  await supabase.from('game_spins').insert({
    user_id: userId,
    prize_type: prize.type,
    prize_value: prize.value,
  })

  // Credit prize
  let voucherCode: string | null = null
  if (prize.type === 'points' && prize.value) {
    await awardPoints(userId, 'game_spin', parseInt(prize.value), true)
  } else if (prize.type === 'discount' || prize.type === 'free_item') {
    voucherCode = generateVoucherCode()
    await supabase.from('game_vouchers').insert({
      user_id: userId,
      code: voucherCode,
      voucher_type: prize.type,
      value: prize.value,
    })
  }

  // Update leaderboard spin_score
  await upsertLeaderboard(userId, { spin_score: parseInt(prize.value) || 50 })

  res.json({ prize_type: prize.type, prize_value: prize.value, voucher_code: voucherCode })
})

// ─── Smash Tap ────────────────────────────────────────────────────────────────

// POST /api/games/tap — submit tap score
gamesRouter.post('/tap', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const { score } = req.body

  if (typeof score !== 'number' || score < 0 || score > 200) {
    return res.status(400).json({ error: 'Invalid score' })
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const { count: playsToday } = await supabase
    .from('game_tap_scores')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('played_at', todayStart.toISOString())

  if ((playsToday ?? 0) >= 3) {
    return res.status(429).json({ error: 'Max 3 tap games per day' })
  }

  const pointsEarned = Math.floor(score / 10)

  await supabase.from('game_tap_scores').insert({ user_id: userId, score, points_earned: pointsEarned })

  if (pointsEarned > 0) {
    await awardPoints(userId, 'game_tap', pointsEarned, true)
  }

  await upsertLeaderboard(userId, { tap_score: score })

  res.json({ points_earned: pointsEarned, score })
})

// GET /api/games/tap/status — plays left today + best score
gamesRouter.get('/tap/status', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: todayPlays, count } = await supabase
    .from('game_tap_scores')
    .select('score', { count: 'exact' })
    .eq('user_id', userId)
    .gte('played_at', todayStart.toISOString())

  const { data: best } = await supabase
    .from('game_tap_scores')
    .select('score')
    .eq('user_id', userId)
    .order('score', { ascending: false })
    .limit(1)
    .single()

  res.json({
    plays_left: Math.max(0, 3 - (count ?? 0)),
    best_score: best?.score ?? 0,
  })
})

// ─── Leaderboard ──────────────────────────────────────────────────────────────

// GET /api/games/leaderboard — top 50 this week
gamesRouter.get('/leaderboard', async (req: AuthRequest, res) => {
  const weekStart = getWeekStart()

  const { data } = await supabase
    .from('game_leaderboard')
    .select('user_id, display_name, tap_score, spin_score, order_streak, total_score')
    .eq('week_start', weekStart)
    .order('total_score', { ascending: false })
    .limit(50)

  // Find current user rank
  const userId = req.userId!
  const rank = (data ?? []).findIndex(r => r.user_id === userId) + 1

  res.json({ leaderboard: data ?? [], your_rank: rank > 0 ? rank : null, week_start: weekStart })
})

// GET /api/games/vouchers — user's active vouchers
gamesRouter.get('/vouchers', async (req: AuthRequest, res) => {
  const { data } = await supabase
    .from('game_vouchers')
    .select('*')
    .eq('user_id', req.userId!)
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  res.json({ vouchers: data ?? [] })
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().split('T')[0]
}

async function upsertLeaderboard(userId: string, scores: { tap_score?: number; spin_score?: number; order_streak?: number }) {
  const weekStart = getWeekStart()

  const { data: user } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', userId)
    .single()

  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Player')

  const { data: existing } = await supabase
    .from('game_leaderboard')
    .select('tap_score, spin_score, order_streak')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .single()

  const tap_score = Math.max(existing?.tap_score ?? 0, scores.tap_score ?? 0)
  const spin_score = (existing?.spin_score ?? 0) + (scores.spin_score ?? 0)
  const order_streak = Math.max(existing?.order_streak ?? 0, scores.order_streak ?? 0)

  const updated = {
    user_id: userId,
    display_name: displayName,
    week_start: weekStart,
    tap_score,
    spin_score,
    order_streak,
    total_score: tap_score + spin_score + order_streak,
    updated_at: new Date().toISOString(),
  }

  await supabase.from('game_leaderboard').upsert(updated, { onConflict: 'user_id,week_start' })
}
