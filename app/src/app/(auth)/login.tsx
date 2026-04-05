import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, TextInput, StyleSheet, Pressable,
  KeyboardAvoidingView, Platform, Animated, Dimensions,
} from 'react-native'
import { router } from 'expo-router'
import { Button } from '../../components/ui/Button'
import { Spacing, Radius, Shadows } from '../../utils/theme'
import { authApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { IMAGES } from '../../utils/constants'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const OTP_LENGTH = 6

const C = {
  bg: '#000000',
  surface: '#111111',
  input: '#1A1A1A',
  border: '#2A2A2A',
  text: '#FFFFFF',
  textSub: '#888888',
  primary: '#F05A1A',
  error: '#EF4444',
  white: '#FFFFFF',
}

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setUser = useAuthStore((s) => s.setUser)

  const slideAnim = useRef(new Animated.Value(40)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const otpRef = useRef<TextInput>(null)

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start()
  }, [])

  const handleSendOtp = async () => {
    if (!email.includes('@')) {
      setError('Enter a valid email address')
      return
    }
    setError('')
    setLoading(true)
    try {
      await authApi.sendOtp(email)
      setStep('otp')
      setOtp('')
      setTimeout(() => otpRef.current?.focus(), 300)
    } catch {
      setError('Could not send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (otp.length < OTP_LENGTH) {
      setError('Enter the full 6-digit code')
      return
    }
    setError('')
    setLoading(true)
    try {
      const { token, user } = await authApi.verifyOtp(email, otp)
      await setUser(user, token)
      router.replace('/(tabs)')
    } catch {
      setError('Incorrect code. Please check and try again.')
      setOtp('')
    } finally {
      setLoading(false)
    }
  }

  const otpDigits = otp.split('').concat(Array(OTP_LENGTH).fill('')).slice(0, OTP_LENGTH)

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: C.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Logo Block ── */}
      <View style={styles.logoBlock}>
        <Text style={styles.logoB60}>B60</Text>
        <View style={styles.logoDivider} />
        <Text style={styles.logoTagline}>SMASH BURGERS</Text>
      </View>

      {/* ── Form ── */}
      <Animated.View style={[styles.form, { transform: [{ translateY: slideAnim }], opacity: fadeAnim }]}>
        <View style={styles.formInner}>
          <Text style={styles.headline}>
            {step === 'email' ? 'SIGN IN' : 'ENTER CODE'}
          </Text>
          <Text style={styles.sub}>
            {step === 'email' ? 'Order. Earn. Repeat.' : `Code sent to ${email}`}
          </Text>

          {step === 'email' ? (
            <View>
              <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                placeholder="your@email.com"
                placeholderTextColor={C.textSub}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(t) => { setEmail(t); setError('') }}
                onSubmitEditing={handleSendOtp}
                returnKeyType="next"
              />
              {!!error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          ) : (
            <View>
              <TextInput
                ref={otpRef}
                style={styles.hiddenOtpInput}
                keyboardType="number-pad"
                value={otp}
                onChangeText={(t) => {
                  const cleaned = t.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH)
                  setOtp(cleaned)
                  setError('')
                }}
                maxLength={OTP_LENGTH}
                autoFocus
              />
              <Pressable style={styles.otpRow} onPress={() => otpRef.current?.focus()}>
                {otpDigits.map((digit, i) => (
                  <View
                    key={i}
                    style={[
                      styles.otpBox,
                      digit ? styles.otpBoxFilled : null,
                      i === otp.length && styles.otpBoxActive,
                      !!error && styles.otpBoxError,
                    ]}
                  >
                    <Text style={styles.otpDigit}>{digit}</Text>
                  </View>
                ))}
              </Pressable>
              {!!error && <Text style={[styles.errorText, { textAlign: 'center', marginTop: 6 }]}>{error}</Text>}
            </View>
          )}

          <Button
            title={step === 'email' ? 'GET CODE →' : 'VERIFY & SIGN IN'}
            onPress={step === 'email' ? handleSendOtp : handleVerifyOtp}
            loading={loading}
            fullWidth
            size="lg"
          />

          {step === 'otp' && (
            <Pressable onPress={() => { setStep('email'); setError('') }} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Change email</Text>
            </Pressable>
          )}

          <Text style={styles.terms}>
            By continuing you agree to B60's Terms of Service
          </Text>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Logo
  logoBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logoB60: {
    fontSize: 96,
    fontWeight: '900',
    color: C.primary,
    letterSpacing: -4,
    lineHeight: 92,
  },
  logoDivider: {
    width: 48,
    height: 3,
    backgroundColor: C.primary,
  },
  logoTagline: {
    fontSize: 13,
    fontWeight: '900',
    color: C.text,
    letterSpacing: 6,
    textTransform: 'uppercase',
  },

  // Form
  form: {
    backgroundColor: C.surface,
    borderTopWidth: 2,
    borderTopColor: C.border,
  },
  formInner: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  headline: {
    fontSize: 22,
    fontWeight: '900',
    color: C.text,
    letterSpacing: 2,
  },
  sub: { fontSize: 13, color: C.textSub },

  input: {
    backgroundColor: C.input,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: C.border,
    color: C.text,
    fontSize: 16,
    padding: Spacing.md,
  },
  inputError: { borderColor: C.error },
  errorText: { fontSize: 12, color: C.error, fontWeight: '600', marginTop: 4 },

  hiddenOtpInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  otpRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    marginVertical: Spacing.sm,
  },
  otpBox: {
    width: 46, height: 56,
    borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.input,
    alignItems: 'center', justifyContent: 'center',
  },
  otpBoxFilled: { borderColor: C.primary, backgroundColor: '#1A0800' },
  otpBoxActive: { borderColor: C.primary, borderWidth: 2 },
  otpBoxError: { borderColor: C.error },
  otpDigit: { fontSize: 22, fontWeight: '800', color: C.text },

  backBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  backBtnText: { fontSize: 14, color: C.textSub, fontWeight: '600' },
  terms: { fontSize: 11, color: C.textSub, textAlign: 'center' },
})
