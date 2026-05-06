import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import rateLimit from 'express-rate-limit'
import { createHash } from 'crypto'
import { supabase } from '../config/supabase'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const analyticsRouter = Router()
analyticsRouter.use(requireAuth)

// Tighter rate limit — analytics can be noisy
const analyticsLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  keyGenerator: (req: any) => req.userId ?? req.ip,
})
analyticsRouter.use(analyticsLimiter)

// POST /api/analytics/events — batch ingest from client
analyticsRouter.post('/events',
  body('events').isArray({ min: 1, max: 50 }),
  body('events.*.event_name').isString().isLength({ min: 1, max: 80 }),
  body('events.*.properties').optional().isObject(),
  body('platform').optional().isIn(['android', 'ios']),
  body('app_version').optional().isString().isLength({ max: 20 }),
  async (req: AuthRequest, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { events, platform, app_version } = req.body
    const userId = req.userId!

    const rows = (events as Array<{ event_name: string; properties?: object }>).map((e) => ({
      user_id: userId,
      event_name: e.event_name,
      properties: e.properties ?? {},
      platform: platform ?? null,
      app_version: app_version ?? null,
    }))

    const { error } = await supabase.from('analytics_events').insert(rows)
    if (error) {
      console.error('[Analytics] insert error:', error.message)
      return res.status(500).json({ error: 'Failed to record events' })
    }

    res.json({ ok: true, recorded: rows.length })
  }
)

// POST /api/analytics/consent — record legal acceptance
analyticsRouter.post('/consent',
  body('version').isString().isLength({ min: 1, max: 20 }),
  body('platform').optional().isIn(['android', 'ios']),
  async (req: AuthRequest, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { version, platform } = req.body
    const userId = req.userId!
    const now = new Date().toISOString()

    // Hash the IP — never store raw IP
    const rawIp = req.ip ?? ''
    const ipHash = createHash('sha256').update(rawIp).digest('hex')

    // Update user's accepted version
    const { data: user, error: userErr } = await supabase
      .from('users')
      .update({
        terms_accepted_at: now,
        terms_version: version,
        privacy_accepted_at: now,
      })
      .eq('id', userId)
      .select('email')
      .single()

    if (userErr) return res.status(500).json({ error: 'Failed to update consent' })

    // Write consent audit log
    await supabase.from('consent_log').insert({
      user_id: userId,
      email: user.email,
      version,
      accepted_at: now,
      ip_hash: ipHash,
      platform: platform ?? null,
    })

    res.json({ ok: true, version, accepted_at: now })
  }
)
