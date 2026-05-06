import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import jwt from 'jsonwebtoken'
import { createHash, randomInt } from 'crypto'
import { supabase } from '../config/supabase'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const authRouter = Router()

const OTP_TTL_MS        = 5 * 60 * 1000   // 5 minutes
const MAX_OTP_ATTEMPTS  = 5
const LOCKOUT_MS        = 15 * 60 * 1000  // 15 minutes after 5 wrong attempts
const JWT_TTL           = '7d'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex')
}

async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.log(`[OTP] ${email} → ${otp}`)
    return
  }
  const { Resend } = await import('resend')
  const resend = new Resend(resendApiKey)
  const result = await resend.emails.send({
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
  if (result.error) {
    console.error('[Resend error]', JSON.stringify(result.error))
    throw new Error(result.error.message)
  }
  console.log('[Resend OK] id=', result.data?.id)
}

// ─── POST /otp/send ───────────────────────────────────────────────────────────

authRouter.post('/otp/send',
  body('email').isEmail().withMessage('Invalid email address'),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const email = (req.body.email as string).toLowerCase().trim()
    console.log('[OTP send] storing for email:', JSON.stringify(email))

    // Check if currently locked out
    const { data: existing } = await supabase
      .from('otp_store')
      .select('locked_until')
      .eq('email', email)
      .single()

    if (existing?.locked_until && new Date(existing.locked_until) > new Date()) {
      return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' })
    }

    const otp = randomInt(100000, 999999).toString()
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString()

    // Upsert into DB — replaces any previous OTP for this email
    await supabase.from('otp_store').upsert({
      email,
      otp_hash: hashOtp(otp),
      attempts: 0,
      locked_until: null,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    }, { onConflict: 'email' })

    try {
      await sendOtpEmail(email, otp)
      console.log(`[OTP sent] ${email}`)
    } catch (err: any) {
      console.error('[OTP email failed]', err?.message ?? err)
      console.log(`[OTP FALLBACK] ${email} → ${otp}`)
    }

    // Always return success — no user enumeration
    res.json({ success: true, message: 'OTP sent' })
  }
)

// ─── POST /otp/verify ─────────────────────────────────────────────────────────

authRouter.post('/otp/verify',
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const email = (req.body.email as string).toLowerCase().trim()
    const { otp } = req.body
    console.log('[OTP verify] looking up email:', JSON.stringify(email), 'otp len:', otp?.length)

    // Fetch OTP record
    const { data: record, error: fetchErr } = await supabase
      .from('otp_store')
      .select('otp_hash, attempts, locked_until, expires_at')
      .eq('email', email)
      .single()

    console.log('[OTP verify] record found:', !!record, 'fetchErr:', fetchErr?.message ?? null)

    // Generic error — don't reveal whether email exists
    const invalid = () => res.status(401).json({ error: 'Invalid or expired code' })

    if (!record) return invalid()

    // Check lockout
    if (record.locked_until && new Date(record.locked_until) > new Date()) {
      return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' })
    }

    // Check expiry
    if (new Date(record.expires_at) < new Date()) {
      await supabase.from('otp_store').delete().eq('email', email)
      return invalid()
    }

    // Check hash match
    console.log('[OTP verify] hash match:', record.otp_hash === hashOtp(otp), 'expires_at:', record.expires_at)
    if (record.otp_hash !== hashOtp(otp)) {
      const newAttempts = (record.attempts ?? 0) + 1
      if (newAttempts >= MAX_OTP_ATTEMPTS) {
        // Lock out for 15 min
        await supabase.from('otp_store').update({
          attempts: newAttempts,
          locked_until: new Date(Date.now() + LOCKOUT_MS).toISOString(),
        }).eq('email', email)
        return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' })
      }
      await supabase.from('otp_store').update({ attempts: newAttempts }).eq('email', email)
      return invalid()
    }

    // Valid — delete OTP record immediately (single-use)
    await supabase.from('otp_store').delete().eq('email', email)

    // Find or create user
    let { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, loyalty_points, token_version')
      .eq('email', email)
      .single()

    if (!user) {
      const insert = await supabase
        .from('users')
        .insert({ email, name: '' })
        .select('id, email, name, loyalty_points, token_version')
        .single()
      user = insert.data
      error = insert.error
    }

    if (error || !user) {
      console.error('[Auth] Failed to find/create user:', error?.message)
      return res.status(500).json({ error: 'Failed to create account' })
    }

    // Sign JWT with token_version embedded — allows revocation
    const token = jwt.sign(
      { userId: user.id, tv: user.token_version ?? 0 },
      process.env.JWT_SECRET!,
      { expiresIn: JWT_TTL }
    )

    res.json({ token, user })
  }
)

// ─── POST /logout ─────────────────────────────────────────────────────────────
// Bumps token_version — invalidates ALL existing tokens for this user

authRouter.post('/logout', requireAuth, async (req: AuthRequest, res) => {
  await supabase
    .from('users')
    .update({ token_version: (req.user.token_version ?? 0) + 1 })
    .eq('id', req.userId!)

  res.json({ success: true })
})

// ─── PATCH /profile ───────────────────────────────────────────────────────────

authRouter.patch('/profile', requireAuth, async (req: AuthRequest, res) => {
  const { name, phone } = req.body
  const updates: any = {}
  if (name && typeof name === 'string') updates.name = name.trim().slice(0, 100)
  if (phone !== undefined) {
    if (phone !== null && !/^\+?[0-9\s\-()]{8,20}$/.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' })
    }
    updates.phone = phone
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nothing to update' })
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', req.userId!)
    .select('id, email, name, phone, loyalty_points')
    .single()

  if (error) return res.status(500).json({ error: 'Update failed' })
  res.json(data)
})

// ─── GET /me ──────────────────────────────────────────────────────────────────

authRouter.get('/me', requireAuth, async (req: AuthRequest, res) => {
  res.json(req.user)
})
