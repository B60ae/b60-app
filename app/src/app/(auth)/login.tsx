import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, TextInput, StyleSheet, Pressable,
  KeyboardAvoidingView, Platform, Animated, Dimensions, StatusBar, Linking,
} from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { Button } from '../../components/ui/Button'
import { Spacing, Radius } from '../../utils/theme'
import { authApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { IMAGES } from '../../utils/constants'
import { Events, recordConsent } from '../../services/analytics'

const TERMS_VERSION = '2026-05'

const { width: W, height: H } = Dimensions.get('window')
const OTP_LENGTH = 6

const C = {
  bg: '#000000',
  surface: '#0D0D0D',
  card: '#111111',
  input: '#1A1A1A',
  border: '#2A2A2A',
  borderActive: '#F05A1A',
  text: '#FFFFFF',
  textSub: '#888888',
  textMuted: '#444444',
  primary: '#F05A1A',
  primaryDark: '#C94400',
  error: '#EF4444',
  success: '#22C55E',
  white: '#FFFFFF',
  yellow: '#FFE500',
}

// ─── OTP Box Display ──────────────────────────────────────────────────────────

function OtpDisplay({ otp, error }: { otp: string; error: boolean }) {
  const digits = otp.split('').concat(Array(OTP_LENGTH).fill('')).slice(0, OTP_LENGTH)
  return (
    <View style={otpStyles.row}>
      {digits.map((d, i) => {
        const isActive = i === otp.length
        const isFilled = !!d
        return (
          <View
            key={i}
            style={[
              otpStyles.box,
              isActive && otpStyles.boxActive,
              isFilled && !error && otpStyles.boxFilled,
              error && otpStyles.boxError,
            ]}
          >
            <Text style={otpStyles.digit}>{d ? '•' : ''}</Text>
            {isActive && <View style={otpStyles.cursor} />}
          </View>
        )
      })}
    </View>
  )
}

const otpStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  box: {
    width: 46, height: 56,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: C.primary, borderWidth: 2 },
  boxFilled: { borderColor: '#333', backgroundColor: '#1A0A00' },
  boxError: { borderColor: C.error },
  digit: { fontSize: 28, fontWeight: '900', color: C.primary, lineHeight: 34 },
  cursor: {
    position: 'absolute', bottom: 8,
    width: 18, height: 2.5, borderRadius: 2,
    backgroundColor: C.primary,
  },
})

// ─── Step Dots ────────────────────────────────────────────────────────────────

function StepDots({ step }: { step: 'email' | 'otp' }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0 }}>
      <View style={[stepStyles.dot, stepStyles.dotActive]} />
      <View style={[stepStyles.line, step === 'otp' && stepStyles.lineActive]} />
      <View style={[stepStyles.dot, step === 'otp' && stepStyles.dotActive]} />
    </View>
  )
}

const stepStyles = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.border },
  dotActive: { backgroundColor: C.primary },
  line: { width: 28, height: 2, backgroundColor: C.border },
  lineActive: { backgroundColor: C.primary },
})

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const otpValueRef = useRef('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const setUser = useAuthStore((s) => s.setUser)

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const cardY = useRef(new Animated.Value(60)).current
  const cardOpacity = useRef(new Animated.Value(0)).current
  const shakeAnim = useRef(new Animated.Value(0)).current
  const stepAnim = useRef(new Animated.Value(0)).current
  const logoScale = useRef(new Animated.Value(0.8)).current
  const logoOpacity = useRef(new Animated.Value(0)).current
  const otpRef = useRef<TextInput>(null)

  useEffect(() => {
    StatusBar.setBarStyle('light-content')
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(cardY, { toValue: 0, useNativeDriver: true, tension: 55, friction: 10, delay: 200 }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 500, useNativeDriver: true, delay: 200 }),
    ]).start()
  }, [])

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start()
  }

  const handleSendOtp = async () => {
    if (!termsAccepted) {
      setError('Please accept the Terms & Privacy Policy to continue')
      shake()
      return
    }
    const trimmed = email.trim().toLowerCase()
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      setError('Enter a valid email address')
      shake()
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }
    setError('')
    setLoading(true)
    Events.LOGIN_STARTED()
    try {
      await authApi.sendOtp(trimmed)
      setEmail(trimmed)
      setStep('otp')
      setResendCooldown(60)
      Events.LOGIN_OTP_SENT()
      Animated.timing(stepAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start()
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setTimeout(() => otpRef.current?.focus(), 350)
    } catch {
      setError('Could not send code. Try again.')
      Events.LOGIN_FAILED('otp_send_failed')
      shake()
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (codeOverride?: string) => {
    const code = codeOverride ?? otpValueRef.current
    if (code.length < OTP_LENGTH) {
      setError('Enter the full 6-digit code')
      shake()
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }
    setError('')
    setLoading(true)
    try {
      const { token, user } = await authApi.verifyOtp(email, code)
      await setUser(user, token)
      Events.LOGIN_SUCCESS()
      Events.TERMS_ACCEPTED(TERMS_VERSION)
      // Fire consent audit log — non-blocking
      recordConsent(TERMS_VERSION)
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.replace('/(tabs)')
    } catch {
      setError('Wrong code. Try again.')
      Events.LOGIN_FAILED('invalid_otp')
      setOtp('')
      shake()
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setStep('email')
    setOtp('')
    otpValueRef.current = ''
    setError('')
    Animated.timing(stepAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start()
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Full-bleed hero background */}
      <Image source={{ uri: IMAGES.loginHero }} style={styles.bgImage} contentFit="cover" />
      <LinearGradient
        colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.92)', C.bg]}
        style={styles.bgGradient}
        locations={[0, 0.35, 0.65, 1]}
      />

      {/* ── Logo + Brand ── */}
      <Animated.View style={[styles.logoArea, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        {/* App icon */}
        <Image
          source={require('../../../assets/images/icon.png')}
          style={styles.appIcon}
          contentFit="contain"
        />
        <View style={styles.logoDivider} />
        <Text style={styles.logoSub}>SMASH BURGERS · DUBAI</Text>
      </Animated.View>

      {/* ── Card ── */}
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ translateY: cardY }, { translateX: shakeAnim }],
            opacity: cardOpacity,
          },
        ]}
      >
        {/* Step indicator row */}
        <View style={styles.stepRow}>
          <StepDots step={step} />
          <Text style={styles.stepLabel}>{step === 'email' ? 'Step 1 of 2' : 'Step 2 of 2'}</Text>
        </View>

        {/* Headline */}
        <View style={styles.headlineRow}>
          <Text style={styles.headline}>
            {step === 'email' ? 'GET IN.' : 'CHECK EMAIL.'}
          </Text>
          {step === 'otp' && (
            <Pressable onPress={handleBack} hitSlop={12}>
              <Text style={styles.changeLink}>Change</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.sub}>
          {step === 'email'
            ? 'Enter your email to get a login code.'
            : `Code sent to\n${email}`}
        </Text>

        {/* Input */}
        {step === 'email' ? (
          <TextInput
            style={[styles.input, !!error && styles.inputError]}
            placeholder="you@email.com"
            placeholderTextColor={C.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="go"
            value={email}
            onChangeText={(t) => { setEmail(t); setError('') }}
            onSubmitEditing={handleSendOtp}
            editable={!loading}
          />
        ) : (
          <Pressable onPress={() => otpRef.current?.focus()} style={{ position: 'relative' }}>
            <TextInput
              ref={otpRef}
              style={styles.hiddenInput}
              keyboardType="number-pad"
              value={otp}
              onChangeText={(t) => {
                const clean = t.replace(/\D/g, '').slice(0, OTP_LENGTH)
                otpValueRef.current = clean
                setOtp(clean)
                setError('')
                if (clean.length === OTP_LENGTH) handleVerifyOtp(clean)
              }}
              maxLength={OTP_LENGTH}
              autoFocus
              editable={!loading}
            />
            <OtpDisplay otp={otp} error={!!error} />
          </Pressable>
        )}

        {/* Error */}
        {!!error && (
          <View style={styles.errorRow}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* CTA */}
        <Button
          title={step === 'email' ? 'SEND CODE' : 'VERIFY CODE'}
          onPress={step === 'email' ? handleSendOtp : handleVerifyOtp}
          loading={loading}
          fullWidth
          size="lg"
        />

        {/* Resend */}
        {step === 'otp' && (
          <Pressable
            onPress={() => { if (resendCooldown > 0 || loading) return; setOtp(''); setError(''); handleSendOtp() }}
            style={[styles.resendBtn, (loading || resendCooldown > 0) && { opacity: 0.4 }]}
            disabled={loading || resendCooldown > 0}
          >
            <Text style={styles.resendText}>
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </Text>
          </Pressable>
        )}

        {/* Terms checkbox */}
        {step === 'email' && (
          <Pressable style={styles.termsRow} onPress={() => { setTermsAccepted(v => !v); setError('') }}>
            <View style={[styles.checkbox, termsAccepted && styles.checkboxActive]}>
              {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.terms}>
              I agree to B60's{' '}
              <Text style={styles.termsLink} onPress={(e) => { e.stopPropagation?.(); router.push('/legal' as any) }}>
                Terms & Conditions
              </Text>
              {' '}and{' '}
              <Text style={styles.termsLink} onPress={(e) => { e.stopPropagation?.(); router.push('/legal' as any) }}>
                Privacy Policy
              </Text>
            </Text>
          </Pressable>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  bgImage: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: H * 0.58,
  },
  bgGradient: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: H * 0.72,
  },

  // Logo area
  logoArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: H * 0.05,
    gap: 12,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  logoDivider: {
    width: 40, height: 2.5,
    backgroundColor: C.primary,
    borderRadius: 2,
  },
  logoSub: {
    fontSize: 11, fontWeight: '900', color: 'rgba(255,255,255,0.7)',
    letterSpacing: 4, textTransform: 'uppercase',
  },

  // Card
  card: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#222',
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },

  stepRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 4,
  },
  stepLabel: { fontSize: 11, fontWeight: '700', color: C.textSub, letterSpacing: 0.5 },

  headlineRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headline: { fontSize: 28, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  changeLink: { fontSize: 13, fontWeight: '700', color: C.primary },
  sub: { fontSize: 13, color: C.textSub, lineHeight: 20, marginTop: -4 },

  input: {
    backgroundColor: C.input,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: C.border,
    color: C.text,
    fontSize: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    letterSpacing: 0.3,
  },
  inputError: { borderColor: C.error },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1, top: 0 },

  errorRow: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: C.error,
    marginTop: -4,
  },
  errorText: { fontSize: 13, color: C.error, fontWeight: '600' },

  resendBtn: { alignItems: 'center', paddingVertical: 4 },
  resendText: {
    fontSize: 13, color: C.textSub, fontWeight: '600', textDecorationLine: 'underline',
  },
  termsRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 4,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.input,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  checkboxActive: { backgroundColor: C.primary, borderColor: C.primary },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '900', lineHeight: 14 },
  terms: {
    flex: 1, fontSize: 11, color: C.textMuted, lineHeight: 16,
  },
  termsLink: {
    color: C.primary, fontWeight: '700', textDecorationLine: 'underline',
  },
})
