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
  body('email').isEmail().withMessage('Invalid email address'),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { email } = req.body
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 })

    // Send OTP via Supabase email
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: { otp_code: otp },
      },
    })

    if (error) {
      // Fallback: log OTP for testing (remove in production)
      console.log(`[OTP] ${email} → ${otp}`)
    }

    console.log(`[OTP] ${email} → ${otp}`)
    res.json({ success: true, message: 'OTP sent' })
  }
)

// ─── Verify OTP ───────────────────────────────────────────────────────────────
authRouter.post('/otp/verify',
  body('email').isEmail(),
  body('otp').isLength({ min: 4, max: 6 }),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { email, otp } = req.body
    const stored = otpStore.get(email)

    if (!stored || stored.otp !== otp || stored.expires < Date.now()) {
      return res.status(401).json({ error: 'Invalid or expired OTP' })
    }

    otpStore.delete(email)

    // Upsert user by email
    const { data: user, error } = await supabase
      .from('users')
      .upsert({ email, phone: email }, { onConflict: 'email' })
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
