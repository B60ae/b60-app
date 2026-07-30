import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, TextInput, StyleSheet, Pressable,
  Platform, Animated,
} from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { authApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { Events, recordConsent } from '../../services/analytics'
import { V3, Shadows } from '../../utils/theme'

const TERMS_VERSION = '2026-05'
const OTP_LENGTH = 6

// ─── OTP Cells ───────────────────────────────────────────────────────────────
function OtpDisplay({ otp, error }: { otp: string; error: boolean }) {
  const scaleAnims = useRef(Array.from({ length: OTP_LENGTH }, () => new Animated.Value(1))).current

  useEffect(() => {
    const idx = otp.length - 1
    if (idx >= 0 && idx < OTP_LENGTH) {
      Animated.sequence([
        Animated.timing(scaleAnims[idx], { toValue: 0.75, duration: 0, useNativeDriver: true }),
        Animated.spring(scaleAnims[idx], { toValue: 1, useNativeDriver: true, tension: 420, friction: 10 }),
      ]).start()
    }
  }, [otp])

  return (
    <View style={otpS.grid}>
      {Array.from({ length: OTP_LENGTH }, (_, i) => {
        const filled = i < otp.length
        const active = i === otp.length
        return (
          <Animated.View
            key={i}
            style={[
              otpS.cell,
              filled && !error && otpS.cellFilled,
              active && otpS.cellActive,
              error && otpS.cellError,
              { transform: [{ scale: scaleAnims[i] }] },
            ]}
          >
            <Text style={[otpS.digit, error && otpS.digitError]}>{otp[i] || ''}</Text>
          </Animated.View>
        )
      })}
    </View>
  )
}

const otpS = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 8 },
  cell: {
    flex: 1,
    aspectRatio: 0.85,
    backgroundColor: V3.s,
    borderWidth: 1,
    borderColor: V3.ln,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.iconBtn,
  },
  cellFilled: { borderColor: V3.o, backgroundColor: V3.s },
  cellActive: { borderColor: V3.o, borderWidth: 2 },
  cellError: { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.06)' },
  digit: {
    fontFamily: 'Archivo_800ExtraBold',
    fontSize: 24,
    color: V3.w,
    lineHeight: 28,
  },
  digitError: { color: '#EF4444' },
})

// ─── Number Pad ───────────────────────────────────────────────────────────────
function NumPad({
  onDigit, onDel, onResend, cooldown,
}: {
  onDigit: (d: string) => void
  onDel: () => void
  onResend: () => void
  cooldown: number
}) {
  const keys = ['1','2','3','4','5','6','7','8','9']
  return (
    <View style={pad.grid}>
      {keys.map((k) => (
        <PadKey key={k} label={k} onPress={() => onDigit(k)} />
      ))}
      <PadKey label={cooldown > 0 ? `${cooldown}s` : 'Resend'} aux onPress={cooldown === 0 ? onResend : undefined} disabled={cooldown > 0} />
      <PadKey label="0" onPress={() => onDigit('0')} />
      <PadKey label="Del" aux onPress={onDel} />
    </View>
  )
}

function PadKey({ label, aux, onPress, disabled }: { label: string; aux?: boolean; onPress?: () => void; disabled?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current
  const bg = useRef(new Animated.Value(0)).current

  const handleIn = () => {
    Animated.timing(scale, { toValue: 0.93, duration: 60, useNativeDriver: true }).start()
    Animated.timing(bg, { toValue: 1, duration: 60, useNativeDriver: false }).start()
  }
  const handleOut = () => {
    Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }).start()
    Animated.timing(bg, { toValue: 0, duration: 80, useNativeDriver: false }).start()
  }

  const backgroundColor = bg.interpolate({ inputRange: [0, 1], outputRange: [V3.s, V3.gold] })
  const textColor = bg.interpolate({ inputRange: [0, 1], outputRange: [V3.w, V3.w] })

  return (
    <Animated.View style={[pad.key, { backgroundColor }]}>
      <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={handleIn}
          onPressOut={handleOut}
          disabled={disabled}
          style={pad.inner}
          hitSlop={4}
        >
          <Animated.Text style={[aux ? pad.auxText : pad.keyText, { color: textColor }, disabled && pad.disabledText]}>
            {label}
          </Animated.Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  )
}

const pad = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 22,
    paddingBottom: 16,
  },
  key: {
    width: '30%',
    flexBasis: '30%',
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: V3.ln,
    ...Shadows.iconBtn,
  },
  inner: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  keyText: {
    fontFamily: 'Archivo_800ExtraBold',
    fontSize: 22,
    color: V3.w,
  },
  auxText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    letterSpacing: 0.8,
    color: V3.od,
    textTransform: 'uppercase',
  },
  disabledText: { color: V3.dim2 },
})

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const otpRef = useRef('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const setUser = useAuthStore((s) => s.setUser)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const shakeX = useRef(new Animated.Value(0)).current
  const shake = () =>
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -6, duration: 70, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 6, duration: 70, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -4, duration: 70, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 70, useNativeDriver: true }),
    ]).start()

  // Entry anims
  const blockY = useRef(new Animated.Value(80)).current
  const blockO = useRef(new Animated.Value(0)).current
  const copyO = useRef(new Animated.Value(0)).current
  const copyY = useRef(new Animated.Value(14)).current
  const formO = useRef(new Animated.Value(0)).current
  const formY = useRef(new Animated.Value(14)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(blockO, { toValue: 1, duration: 500, delay: 180, useNativeDriver: true }),
      Animated.spring(blockY, { toValue: 0, delay: 180, useNativeDriver: true, tension: 110, friction: 12 }),
      Animated.parallel([
        Animated.timing(copyO, { toValue: 1, duration: 450, delay: 380, useNativeDriver: true }),
        Animated.timing(copyY, { toValue: 0, duration: 450, delay: 380, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(formO, { toValue: 1, duration: 450, delay: 520, useNativeDriver: true }),
        Animated.timing(formY, { toValue: 0, duration: 450, delay: 520, useNativeDriver: true }),
      ]),
    ]).start()
  }, [])

  const isEmailValid = /.+@.+\..+/.test(email.trim())

  const handleSendOtp = async () => {
    if (!isEmailValid) { shake(); return }
    setLoading(true)
    Events.LOGIN_STARTED()
    try {
      await authApi.sendOtp(email.trim().toLowerCase())
      setEmail(email.trim().toLowerCase())
      setStep('otp')
      setCooldown(30)
      Events.LOGIN_OTP_SENT()
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch {
      setError('Could not send code. Try again.')
      shake()
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (code?: string) => {
    const c = code ?? otpRef.current
    if (c.length < OTP_LENGTH) { shake(); return }
    setLoading(true)
    try {
      const { token, user } = await authApi.verifyOtp(email, c)
      await setUser(user, token)
      Events.LOGIN_SUCCESS()
      recordConsent(TERMS_VERSION)
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.replace('/(tabs)')
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? ''
      setError(msg.includes('expired') ? 'Code expired. Tap Resend.' : 'Wrong code. Try again.')
      Events.LOGIN_FAILED('invalid_otp')
      otpRef.current = ''
      setOtp('')
      shake()
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setLoading(false)
    }
  }

  const pushDigit = (d: string) => {
    if (otpRef.current.length >= OTP_LENGTH) return
    const next = otpRef.current + d
    otpRef.current = next
    setOtp(next)
    setError('')
    if (next.length === OTP_LENGTH) {
      setTimeout(() => handleVerifyOtp(next), 360)
    }
  }

  const delDigit = () => {
    const next = otpRef.current.slice(0, -1)
    otpRef.current = next
    setOtp(next)
    setError('')
  }

  const handleResend = () => {
    otpRef.current = ''
    setOtp('')
    setError('')
    setCooldown(30)
    handleSendOtp()
  }

  // EMAIL STEP
  if (step === 'email') {
    return (
      <View style={s.root}>
        {/* Logo stage — rounded square with warm radial feel */}
        <View style={s.stage}>
          <Animated.View style={[s.logoCard, { opacity: blockO, transform: [{ translateY: blockY }] }]}>
            <Image
              source={require('../../../assets/images/icon_logo.webp')}
              style={s.logoImage}
              contentFit="contain"
            />
          </Animated.View>
        </View>

        {/* Copy */}
        <Animated.View style={[s.copy, { opacity: copyO, transform: [{ translateY: copyY }] }]}>
          <Text style={s.h1}>Skip the line.{'\n'}Rack up <Text style={s.h1Accent}>points.</Text></Text>
          <Text style={s.sub}>
            Order ahead for pickup. Earn a point on every dirham and take it off your next one.
          </Text>
        </Animated.View>

        {/* Form */}
        <Animated.View
          style={[s.form, { opacity: formO, transform: [{ translateY: formY }, { translateX: shakeX }] }]}
        >
          <Text style={s.label}>Email address</Text>
          <TextInput
            style={s.input}
            placeholder="you@email.com"
            placeholderTextColor={V3.dim2}
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
          {!!error && <Text style={s.errorText}>{error}</Text>}
          <Pressable
            style={[s.btn, (!isEmailValid || loading) && s.btnDisabled]}
            onPress={handleSendOtp}
            disabled={!isEmailValid || loading}
          >
            <Text style={s.btnLabel}>{loading ? 'Sending…' : 'Send code'}</Text>
            <Text style={s.btnArrow}>→</Text>
          </Pressable>
          <Text style={s.legal}>By continuing you agree to the B60 terms.</Text>
        </Animated.View>
      </View>
    )
  }

  // OTP STEP
  return (
    <View style={[s.root, s.rootOtp]}>
      <View style={s.otpTop}>
        <Pressable
          onPress={() => { setStep('email'); otpRef.current = ''; setOtp(''); setError('') }}
          style={s.backBtn}
          hitSlop={8}
        >
          <Text style={s.backText}>← Back</Text>
        </Pressable>
      </View>

      <View style={s.otpHead}>
        <Text style={s.otpH1}>Enter{'\n'}code</Text>
        <Text style={s.otpSub}>
          Sent to <Text style={s.otpEmail}>{email}</Text>
        </Text>
      </View>

      <Animated.View style={[s.otpCells, { transform: [{ translateX: shakeX }] }]}>
        <OtpDisplay otp={otp} error={!!error} />
        {!!error && <Text style={s.errorOtp}>{error}</Text>}
      </Animated.View>

      <View style={{ flex: 1, minHeight: 16 }} />

      <NumPad onDigit={pushDigit} onDel={delDigit} onResend={handleResend} cooldown={cooldown} />
      <Text style={s.otpLegal}>Enter your 6-digit code</Text>
    </View>
  )
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: V3.k,
    flexDirection: 'column',
  },
  rootOtp: {
    backgroundColor: V3.k,
  },

  // Logo stage
  stage: {
    flex: 1,
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  logoCard: {
    width: 180,
    height: 180,
    borderRadius: 44,
    backgroundColor: V3.s,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.cardStrong,
  },
  logoImage: {
    width: 140,
    height: 140,
  },

  // Copy
  copy: { paddingHorizontal: 24, paddingBottom: 8 },
  h1: {
    fontFamily: 'Archivo_800ExtraBold',
    fontSize: 30,
    lineHeight: 33,
    letterSpacing: -0.8,
    color: V3.w,
  },
  h1Accent: { color: V3.o },
  sub: {
    fontFamily: 'Archivo_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: V3.dim,
    marginTop: 10,
  },

  // Form
  form: { paddingHorizontal: 22, paddingBottom: 28, paddingTop: 18 },
  label: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9.5,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: V3.dim2,
    marginBottom: 8,
  },
  input: {
    backgroundColor: V3.s,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: V3.ln,
    color: V3.w,
    fontFamily: 'Archivo_700Bold',
    fontSize: 17,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 14,
    ...Shadows.iconBtn,
  },
  errorText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9.5,
    color: '#EF4444',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: -6,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: V3.o,
    paddingHorizontal: 22,
    paddingVertical: 17,
    borderRadius: 999,
    shadowColor: 'rgba(151,64,15,0.45)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  btnDisabled: {
    backgroundColor: V3.s2,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnLabel: {
    fontFamily: 'Archivo_800ExtraBold',
    fontSize: 16,
    color: '#FFFDF8',
  },
  btnArrow: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 14,
    color: 'rgba(255,253,248,0.75)',
  },
  legal: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9.5,
    color: V3.dim2,
    letterSpacing: 0.5,
    marginTop: 14,
    lineHeight: 17,
  },

  // OTP step
  otpTop: { padding: 18, paddingTop: 20 },
  backBtn: {},
  backText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: V3.od,
  },
  otpHead: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 22, gap: 8 },
  otpH1: {
    fontFamily: 'Archivo_800ExtraBold',
    fontSize: 36,
    lineHeight: 36,
    letterSpacing: -0.8,
    color: V3.w,
  },
  otpSub: {
    fontFamily: 'Archivo_400Regular',
    fontSize: 14,
    color: V3.dim,
    lineHeight: 20,
  },
  otpEmail: {
    fontFamily: 'Archivo_700Bold',
    color: V3.w,
  },
  otpCells: { paddingHorizontal: 22, gap: 8 },
  errorOtp: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9.5,
    color: '#EF4444',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  otpLegal: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9.5,
    letterSpacing: 0.5,
    color: V3.dim2,
    textAlign: 'center',
    paddingBottom: 14,
  },
})
