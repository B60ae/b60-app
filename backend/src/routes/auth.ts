import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import jwt from 'jsonwebtoken'
import { supabase } from '../config/supabase'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const authRouter = Router()

// Temp OTP store (use Redis in production)
const otpStore = new Map<string, { otp: string; expires: number }>()

// ─── Send OTP ─────────────────────────────────────────────────────────────────
authRouter.post('/otp/send',
  body('phone').matches(/^\+971\d{9}$/).withMessage('Invalid UAE phone number'),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { phone } = req.body
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    otpStore.set(phone, { otp, expires: Date.now() + 5 * 60 * 1000 })

    // TODO: integrate with UAE SMS provider (Twilio / Unifonic)
    console.log(`[OTP] ${phone} → ${otp}`)

    res.json({ success: true, message: 'OTP sent' })
  }
)

// ─── Verify OTP ───────────────────────────────────────────────────────────────
authRouter.post('/otp/verify',
  body('phone').notEmpty(),
  body('otp').isLength({ min: 4, max: 6 }),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { phone, otp } = req.body
    const stored = otpStore.get(phone)

    if (!stored || stored.otp !== otp || stored.expires < Date.now()) {
      return res.status(401).json({ error: 'Invalid or expired OTP' })
    }

    otpStore.delete(phone)

    // Upsert user
    const { data: user, error } = await supabase
      .from('users')
      .upsert({ phone }, { onConflict: 'phone' })
      .select()
      .single()

    if (error) return res.status(500).json({ error: 'Failed to create user' })

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' })

    res.json({ token, user })
  }
)

// ─── Update Profile ───────────────────────────────────────────────────────────
authRouter.patch('/profile', requireAuth, async (req: AuthRequest, res) => {
  const { name, email } = req.body
  const updates: any = {}
  if (name) updates.name = name
  if (email) updates.email = email

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', req.userId!)
    .select()
    .single()

  if (error) return res.status(500).json({ error: 'Update failed' })
  res.json(data)
})

// ─── Get Profile ──────────────────────────────────────────────────────────────
authRouter.get('/me', requireAuth, async (req: AuthRequest, res) => {
  res.json(req.user)
})
