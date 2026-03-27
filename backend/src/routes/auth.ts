import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import jwt from 'jsonwebtoken'
import { supabase } from '../config/supabase'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const authRouter = Router()

// Temp OTP store (use Redis in production)
const otpStore = new Map<string, { otp: string; expires: number }>()

async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    // No email provider — just log it (for local dev / Railway logs)
    console.log(`[OTP] ${email} → ${otp}`)
    return
  }

  const { Resend } = await import('resend')
  const resend = new Resend(resendApiKey)

  await resend.emails.send({
    from: 'B60 Burgers <noreply@b60.ae>',
    to: email,
    subject: 'Your B60 login code',
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px;background:#111;color:#fff;border-radius:12px">
        <h2 style="color:#F05A1A;margin:0 0 8px">B60 BURGERS</h2>
        <p style="color:#aaa;margin:0 0 24px">Your one-time login code:</p>
        <div style="font-size:48px;font-weight:900;letter-spacing:12px;color:#fff;text-align:center;padding:24px;background:#1a1a1a;border-radius:8px;margin-bottom:24px">${otp}</div>
        <p style="color:#666;font-size:13px">Expires in 5 minutes. Don't share this code.</p>
      </div>
    `,
  })
}

// ─── Send OTP ─────────────────────────────────────────────────────────────────
authRouter.post('/otp/send',
  body('email').isEmail().withMessage('Invalid email address'),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { email } = req.body
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 })

    try {
      await sendOtpEmail(email, otp)
    } catch (err) {
      console.error('[OTP email failed]', err)
      console.log(`[OTP FALLBACK] ${email} → ${otp}`)
    }

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
      .upsert({ email }, { onConflict: 'email' })
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
