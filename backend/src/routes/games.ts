import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { supabase } from '../config/supabase'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { processSpin, processTap } from '../agents/games'

export const gamesRouter = Router()
gamesRouter.use(requireAuth)

const gameLimiter = rateLimit({ windowMs: 60_000, max: 30, keyGenerator: (req: any) => req.userId ?? req.ip })
gamesRouter.use(gameLimiter)

// ─── Spin Wheel ───────────────────────────────────────────────────────────────

// GET /api/games/spin/status — 1 free spin/day + 1 per order
gamesRouter.get('/spin/status', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const today = new Date().toISOString().split('T')[0]

  const [{ count: spinsUsed }, { count: ordersToday }] = await Promise.all([
    supabase.from('game_spins').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).gte('created_at', `${today}T00:00:00.000Z`),
    supabase.from('orders').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('status', 'confirmed').gte('created_at', `${today}T00:00:00.000Z`),
  ])

  const totalAllowed = 1 + (ordersToday ?? 0)
  const used = spinsUsed ?? 0
  res.json({ can_spin: used < totalAllowed, spins_left: Math.max(0, totalAllowed - used), spins_used: used })
})

// POST /api/games/spin
gamesRouter.post('/spin', async (req: AuthRequest, res) => {
  const result = await processSpin(req.userId!)
  if (!result.success) {
    const status = result.code === 'NO_SPINS_LEFT' ? 429 : 400
    return res.status(status).json({ error: result.error, code: result.code })
  }
  res.json({
    prize_type: result.prizeType,
    prize_value: result.prizeValue,
    prize_label: result.prizeLabel,
    voucher_code: result.voucherCode,
    segment_index: result.segmentIndex,
    points_awarded: result.pointsAwarded,
    spins_remaining: result.spinsRemaining,
  })
})

// ─── Smash Tap ────────────────────────────────────────────────────────────────

// GET /api/games/tap/status
gamesRouter.get('/tap/status', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const today = new Date().toISOString().split('T')[0]

  const [{ count }, { data: best }] = await Promise.all([
    supabase.from('game_tap_scores').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).gte('created_at', `${today}T00:00:00.000Z`),
    supabase.from('game_tap_scores').select('score')
      .eq('user_id', userId).order('score', { ascending: false }).limit(1).single(),
  ])

  res.json({ plays_left: Math.max(0, 3 - (count ?? 0)), best_score: best?.score ?? 0 })
})

// POST /api/games/tap
gamesRouter.post('/tap', async (req: AuthRequest, res) => {
  const { score } = req.body
  if (typeof score !== 'number') {
    return res.status(400).json({ error: 'Invalid score' })
  }

  const result = await processTap(req.userId!, score)
  if (!result.success) {
    const status = result.code === 'NO_TAP_PLAYS_LEFT' ? 429 : 400
    return res.status(status).json({ error: result.error, code: result.code })
  }
  res.json({ points_earned: result.pointsEarned, score: result.score, plays_remaining: result.playsRemaining })
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

  const userId = req.userId!
  const rank = (data ?? []).findIndex(r => r.user_id === userId) + 1
  res.json({ leaderboard: data ?? [], your_rank: rank > 0 ? rank : null, week_start: weekStart })
})

// ─── Vouchers ─────────────────────────────────────────────────────────────────

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
