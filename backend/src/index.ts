import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import { authRouter } from './routes/auth'
import { menuRouter } from './routes/menu'
import { ordersRouter } from './routes/orders'
import { loyaltyRouter } from './routes/loyalty'
import { locationsRouter } from './routes/locations'

const app = express()
const PORT = process.env.PORT ?? 3001

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE'] }))
app.use(express.json())
app.use(morgan('dev'))

// Trust Railway's proxy so rate limiter gets real IPs
app.set('trust proxy', 1)

// Rate limiting
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }))

// Auth endpoints get stricter limit
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 })

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRouter)
app.use('/api/menu', menuRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/loyalty', loyaltyRouter)
app.use('/api/locations', locationsRouter)

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

app.listen(PORT, () => console.log(`🍔 B60 API running on port ${PORT}`))
