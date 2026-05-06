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
if (!process.env.DART_POS_EXCLUDED_LOCATIONS) {
  console.warn('[STARTUP] DART_POS_EXCLUDED_LOCATIONS not set — all locations will push to DartPOS')
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

const app = express()
const PORT = process.env.PORT ?? 3001

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet())
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'development'
  ? true
  : ['https://b60.ae', 'https://app.b60.ae']
app.use(cors({ origin: ALLOWED_ORIGINS, methods: ['GET', 'POST', 'PATCH', 'DELETE'] }))
app.use(express.json())
app.use(morgan('dev'))

// Trust Railway's proxy so rate limiter gets real IPs
app.set('trust proxy', 1)

// Rate limiting
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }))

// Auth endpoints get stricter limit
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 })
// Orders: 5 per minute per user (anti-spam)
const ordersLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  keyGenerator: (req: any) => req.userId ?? req.ip,
  skip: (req) => req.method === 'GET',
})

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRouter)
app.use('/api/menu', menuRouter)
app.use('/api/orders', ordersLimiter, ordersRouter)
app.use('/api/loyalty', loyaltyRouter)
app.use('/api/locations', locationsRouter)
app.use('/api/games', gamesRouter)
app.use('/api/analytics', analyticsRouter)

// Health check — includes DB ping
app.get('/health', async (_, res) => {
  try {
    const { error } = await (await import('./config/supabase')).supabase
      .from('locations').select('id').limit(1)
    if (error) throw error
    res.json({ status: 'ok', service: 'b60-api', db: 'ok', ts: new Date() })
  } catch {
    res.status(503).json({ status: 'degraded', service: 'b60-api', db: 'error', ts: new Date() })
  }
})

// 404
app.use((_, res) => res.status(404).json({ error: 'Not found' }))

const server = app.listen(PORT, () => console.log(`[B60] API running on port ${PORT}`))

// Request timeout — prevent hung connections
server.setTimeout(30000)

// Graceful shutdown
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
