import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, TextInput, StyleSheet, Pressable,
  KeyboardAvoidingView, Platform, Animated, Dimensions, StatusBar,
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

const { width: W, height: H } = Dimensions.get('window')
const OTP_LENGTH = 6

const C = {
  bg: '#000000',
  surface: '#0D0D0D',
  card: '#141414',
  input: '#1C1C1C',
  border: '#2A2A2A',
  borderActive: '#F05A1A',
  text: '#FFFFFF',
  textSub: '#666666',
  textMuted: '#444444',
  primary: '#F05A1A',
  primaryDark: '#C94400',
  error: '#EF4444',
  success: '#22C55E',
  white: '#FFFFFF',
}

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepDots({ step }: { step: 'email' | 'otp' }) {
  return (
    <View style={dotStyles.row}>
      <View style={[dotStyles.dot, dotStyles.dotActive]} />
      <View style={[dotStyles.line, step === 'otp' && dotStyles.lineActive]} />
      <View style={[dotStyles.dot, step === 'otp' && dotStyles.dotActive]} />
    </View>
  )
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.border,
  },
  dotActive: { backgroundColor: C.primary },
  line: { width: 32, height: 2, backgroundColor: C.border },
  lineActive: { backgroundColor: C.primary },
})

// ─── OTP Box ─────────────────────────────────────────────────────────────────

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
            <Text style={otpStyles.digit}>{d}</Text>
            {isActive && <View style={otpStyles.cursor} />}
          </View>
        )
      })}
    </View>
  )
}

const otpStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  box: {
    width: 48, height: 60,
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
  digit: { fontSize: 24, fontWeight: '800', color: C.text },
  cursor: {
    position: 'absolute', bottom: 10,
    width: 16, height: 2, borderRadius: 1,
    backgroundColor: C.primary,
  },
})

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setUser = useAuthStore((s) => s.setUser)

  const formY = useRef(new Animated.Value(60)).current
  const formOpacity = useRef(new Animated.Value(0)).current
  const stepAnim = useRef(new Animated.Value(0)).current
  const shakeAnim = useRef(new Animated.Value(0)).current
  const otpRef = useRef<TextInput>(null)

  useEffect(() => {
    StatusBar.setBarStyle('light-content')
    Animated.parallel([
      Animated.spring(formY, { toValue: 0, useNativeDriver: true, tension: 55, friction: 10 }),
      Animated.timing(formOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start()
  }, [])

  const goToOtp = () => {
    Animated.timing(stepAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start()
  }

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start()
  }

  const handleSendOtp = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      setError('Enter a valid email address')
      shake()
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }
    setError('')
    setLoading(true)
    try {
      await authApi.sendOtp(trimmed)
      setEmail(trimmed)
      setStep('otp')
      goToOtp()
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setTimeout(() => otpRef.current?.focus(), 350)
    } catch {
      setError('Could not send code. Try again.')
      shake()
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (otp.length < OTP_LENGTH) {
      setError('Enter the full 6-digit code')
      shake()
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }
    setError('')
    setLoading(true)
    try {
      const { token, user } = await authApi.verifyOtp(email, otp)
      await setUser(user, token)
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.replace('/(tabs)')
    } catch {
      setError('Wrong code. Check and try again.')
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
    setError('')
    Animated.timing(stepAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start()
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ── Background image ── */}
      <Image
        source={{ uri: IMAGES.loginHero }}
        style={styles.bgImage}
        contentFit="cover"
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.7)', C.bg]}
        style={styles.bgGradient}
      />

      {/* ── Logo ── */}
      <View style={styles.logoArea}>
        <Text style={styles.logoText}>B60</Text>
        <View style={styles.logoDivider} />
        <Text style={styles.logoSub}>SMASH BURGERS</Text>
      </View>

      {/* ── Form Card ── */}
      <Animated.View
        style={[
          styles.card,
          {
            transform: [
              { translateY: formY },
              { translateX: shakeAnim },
            ],
            opacity: formOpacity,
          },
        ]}
      >
        {/* Step dots */}
        <View style={styles.stepRow}>
          <StepDots step={step} />
          <Text style={styles.stepLabel}>
            {step === 'email' ? 'Step 1 of 2' : 'Step 2 of 2'}
          </Text>
        </View>

        {/* Headline */}
        <View style={styles.headlineRow}>
          <Text style={styles.headline}>
            {step === 'email' ? 'GET IN.' : 'CHECK YOUR EMAIL.'}
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
            : `We sent a 6-digit code to\n${email}`}
        </Text>

        {/* Input */}
        {step === 'email' ? (
          <View>
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
          </View>
        ) : (
          <Pressable onPress={() => otpRef.current?.focus()} style={{ position: 'relative' }}>
            <TextInput
              ref={otpRef}
              style={styles.hiddenInput}
              keyboardType="number-pad"
              value={otp}
              onChangeText={(t) => {
                const clean = t.replace(/\D/g, '').slice(0, OTP_LENGTH)
                setOtp(clean)
                setError('')
                if (clean.length === OTP_LENGTH) handleVerifyOtp()
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
            onPress={() => {
              setOtp('')
              setError('')
              handleSendOtp()
            }}
            style={styles.resendBtn}
            disabled={loading}
          >
            <Text style={styles.resendText}>Resend code</Text>
          </Pressable>
        )}

        {/* Terms */}
        <Text style={styles.terms}>
          By signing in you agree to B60's Terms of Service and Privacy Policy.
        </Text>
      </Animated.View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  bgImage: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: H * 0.55,
  },
  bgGradient: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: H * 0.65,
  },

  logoArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: H * 0.06,
  },
  logoText: {
    fontSize: 100,
    fontWeight: '900',
    color: C.primary,
    letterSpacing: -6,
    lineHeight: 96,
    textShadowColor: 'rgba(240,90,26,0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
  },
  logoDivider: { width: 52, height: 3, backgroundColor: C.primary, marginVertical: 10 },
  logoSub: {
    fontSize: 12, fontWeight: '900', color: C.white,
    letterSpacing: 7, textTransform: 'uppercase', opacity: 0.85,
  },

  card: {
    backgroundColor: C.surface,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stepLabel: { fontSize: 11, fontWeight: '700', color: C.textSub, letterSpacing: 0.5 },

  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headline: {
    fontSize: 26, fontWeight: '900', color: C.text,
    letterSpacing: -0.5,
  },
  changeLink: {
    fontSize: 13, fontWeight: '700', color: C.primary,
  },
  sub: {
    fontSize: 13, color: C.textSub, lineHeight: 20, marginTop: -4,
  },

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

  hiddenInput: {
    position: 'absolute', opacity: 0, width: 1, height: 1, top: 0,
  },

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
  resendText: { fontSize: 13, color: C.textSub, fontWeight: '600', textDecorationLine: 'underline' },

  terms: {
    fontSize: 11, color: C.textMuted,
    textAlign: 'center', lineHeight: 16, marginTop: 4,
  },
})
