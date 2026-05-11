import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

// ─── Startup Validation ───────────────────────────────────────────────────────
const REQUIRED_ENVS = ['JWT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY']
for (const key of REQUIRED_ENVS) {
  if (!process.env[key]) {
    console.error(`[STARTUP] Missing required env var: ${key}`)
    process.exit(1)
  }
}
if ((process.env.JWT_SECRET ?? '').length < 32) {
  console.error('[STARTUP] JWT_SECRET must be at least 32 characters')
  process.exit(1)
}

// ─── Global Error Handlers ────────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason)
})
process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT EXCEPTION]', error)
  process.exit(1)
})

import { authRouter } from './routes/auth'
import { menuRouter } from './routes/menu'
import { ordersRouter } from './routes/orders'
import { loyaltyRouter } from './routes/loyalty'
import { locationsRouter } from './routes/locations'
import { gamesRouter } from './routes/games'
import { analyticsRouter } from './routes/analytics'
import { cache } from './services/cache'
import { retryFailedAwards } from './agents/loyalty'
import { retryFailedPrizes, resetLeaderboard } from './agents/games'

const app = express()
const PORT = process.env.PORT ?? 3001
const IS_PROD = process.env.NODE_ENV === 'production'
const INSTANCE_ID = process.env.INSTANCE_ID ?? 'local'

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet())

const ALLOWED_ORIGINS = IS_PROD
  ? ['https://b60.ae', 'https://app.b60.ae']
  : true
app.use(cors({ origin: ALLOWED_ORIGINS, methods: ['GET', 'POST', 'PATCH', 'DELETE'] }))

// Body limit — prevents large payload attacks
app.use(express.json({ limit: '50kb' }))

// Morgan: 'combined' in prod (standard log format), 'dev' locally
app.use(morgan(IS_PROD ? 'combined' : 'dev'))

// Trust Render's proxy so rate limiter + IP hashing gets real IPs
app.set('trust proxy', 1)

// Global rate limit — defence in depth
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }))

// ─── Per-route limiters ───────────────────────────────────────────────────────

// OTP send/verify: 20 per 15 min per IP
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 })

// Orders: 5 POST per minute per user — GETs skipped
const ordersLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  keyGenerator: (req: any) => req.userId ?? req.ip,
  skip: (req) => req.method === 'GET',
  message: { error: 'Too many orders placed. Please wait a moment.' },
})

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRouter)
app.use('/api/menu', menuRouter)
app.use('/api/orders', ordersLimiter, ordersRouter)
app.use('/api/loyalty', loyaltyRouter)
app.use('/api/locations', locationsRouter)
app.use('/api/games', gamesRouter)
app.use('/api/analytics', analyticsRouter)

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', async (_, res) => {
  try {
    const { error } = await (await import('./config/supabase')).supabase
      .from('locations').select('id').limit(1)
    if (error) throw error
    res.json({
      status: 'ok',
      service: 'b60-api',
      instance: INSTANCE_ID,
      db: 'ok',
      cache_keys: cache.size(),
      ts: new Date(),
    })
  } catch {
    res.status(503).json({ status: 'degraded', service: 'b60-api', instance: INSTANCE_ID, db: 'error', ts: new Date() })
  }
})

// 404
app.use((_, res) => res.status(404).json({ error: 'Not found' }))

// ─── Agent Cron Jobs ──────────────────────────────────────────────────────────

// Retry failed loyalty awards every 15 min
setInterval(async () => {
  try { await retryFailedAwards() } catch (e) { console.error('[Cron] retryFailedAwards:', e) }
}, 15 * 60 * 1000)

// Retry failed game prizes every 15 min
setInterval(async () => {
  try { await retryFailedPrizes() } catch (e) { console.error('[Cron] retryFailedPrizes:', e) }
}, 15 * 60 * 1000)

// Leaderboard weekly reset — check every hour, fire on Monday GST
setInterval(async () => {
  const now = new Date()
  const gst = new Date(now.getTime() + 4 * 60 * 60 * 1000)
  const isMonday = gst.getUTCDay() === 1
  const isMidnight = gst.getUTCHours() === 0
  if (isMonday && isMidnight) {
    try { await resetLeaderboard() } catch (e) { console.error('[Cron] resetLeaderboard:', e) }
  }
}, 60 * 60 * 1000)

const server = app.listen(PORT, () =>
  console.log(`[B60] API running on port ${PORT} | instance=${INSTANCE_ID} | env=${process.env.NODE_ENV ?? 'development'}`)
)

server.setTimeout(30000)

process.on('SIGTERM', () => {
  console.log('[SIGTERM] Graceful shutdown...')
  server.close(() => {
    console.log('[SIGTERM] Server closed')
    process.exit(0)
  })
  setTimeout(() => {
    console.error('[SIGTERM] Forced shutdown after timeout')
    process.exit(1)
  }, 10000)
})
