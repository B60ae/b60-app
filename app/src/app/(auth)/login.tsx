import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, TextInput, StyleSheet, Pressable, Alert,
  KeyboardAvoidingView, Platform, Animated, Dimensions,
} from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { Button } from '../../components/ui/Button'
import { Colors, Spacing, Radius, Shadows } from '../../utils/theme'
import { authApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const OTP_LENGTH = 6

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [focusedOtpIdx, setFocusedOtpIdx] = useState(0)
  const setUser = useAuthStore((s) => s.setUser)

  const slideAnim = useRef(new Animated.Value(60)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const otpRef = useRef<TextInput>(null)

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start()
  }, [])

  const handleSendOtp = async () => {
    if (!email.includes('@')) return Alert.alert('Enter a valid email address')
    setLoading(true)
    try {
      await authApi.sendOtp(email)
      setStep('otp')
      setOtp('')
      setTimeout(() => otpRef.current?.focus(), 300)
    } catch {
      Alert.alert('Error', 'Could not send OTP. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (otp.length < OTP_LENGTH) return Alert.alert('Enter the full OTP code')
    setLoading(true)
    try {
      const { token, user } = await authApi.verifyOtp(email, otp)
      await setUser(user, token)
      router.replace('/(tabs)')
    } catch {
      Alert.alert('Invalid OTP', 'Please check and try again.')
      setOtp('')
    } finally {
      setLoading(false)
    }
  }

  const otpDigits = otp.split('').concat(Array(OTP_LENGTH).fill('')).slice(0, OTP_LENGTH)

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Top food image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: 'https://b60.ae/images/vegas.webp' }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={400}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', Colors.background]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0.4 }}
          end={{ x: 0, y: 1 }}
        />
        {/* B60 Logo overlay */}
        <View style={styles.logoOverlay}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>B60</Text>
          </View>
          <Text style={styles.logoTagline}>SMASH BURGERS</Text>
        </View>
      </View>

      {/* Form card */}
      <Animated.View style={[styles.formCard, { transform: [{ translateY: slideAnim }], opacity: fadeAnim }]}>
        <Text style={styles.headline}>
          {step === 'email' ? 'Sign In' : 'Enter OTP'}
        </Text>
        <Text style={styles.sub}>
          {step === 'email'
            ? 'Order. Earn. Repeat.'
            : `Code sent to ${email}`}
        </Text>

        {step === 'email' ? (
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor={Colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={handleSendOtp}
            returnKeyType="next"
          />
        ) : (
          /* OTP digit boxes */
          <View>
            <TextInput
              ref={otpRef}
              style={styles.hiddenOtpInput}
              keyboardType="number-pad"
              value={otp}
              onChangeText={(t) => {
                const cleaned = t.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH)
                setOtp(cleaned)
                setFocusedOtpIdx(Math.min(cleaned.length, OTP_LENGTH - 1))
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
                  ]}
                >
                  <Text style={styles.otpDigit}>{digit}</Text>
                </View>
              ))}
            </Pressable>
          </View>
        )}

        <Button
          title={step === 'email' ? 'Get OTP →' : 'Verify & Sign In'}
          onPress={step === 'email' ? handleSendOtp : handleVerifyOtp}
          loading={loading}
          fullWidth
          size="lg"
        />

        {step === 'otp' && (
          <Pressable onPress={() => setStep('email')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Change email</Text>
          </Pressable>
        )}

        <Text style={styles.terms}>
          By continuing you agree to B60's Terms of Service
        </Text>
      </Animated.View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  imageContainer: {
    height: SCREEN_HEIGHT * 0.42,
    justifyContent: 'flex-end',
    backgroundColor: Colors.surface,
  },
  logoOverlay: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  logoBox: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.md,
    ...Shadows.glowStrong,
  },
  logoText: { fontSize: 32, fontWeight: '900', color: Colors.white, letterSpacing: 2 },
  logoTagline: { fontSize: 11, fontWeight: '700', color: Colors.white, letterSpacing: 4, marginTop: 6, opacity: 0.9 },
  formCard: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  headline: { fontSize: 30, fontWeight: '900', color: Colors.text },
  sub: { fontSize: 14, color: Colors.textSecondary, marginTop: -8 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    color: Colors.text,
    fontSize: 16,
    padding: Spacing.md,
  },
  hiddenOtpInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  otpRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    marginVertical: Spacing.sm,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryTint,
  },
  otpBoxActive: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  otpDigit: { fontSize: 22, fontWeight: '800', color: Colors.text },
  backBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  backBtnText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
  terms: { fontSize: 11, color: Colors.textMuted, textAlign: 'center' },
})
