import { useState } from 'react'
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Pressable, Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { Button } from '../../components/ui/Button'
import { Colors, Spacing, Radius, Typography } from '../../utils/theme'
import { authApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const setUser = useAuthStore((s) => s.setUser)

  const handleSendOtp = async () => {
    if (!email.includes('@')) return Alert.alert('Enter a valid email address')
    setLoading(true)
    try {
      await authApi.sendOtp(email)
      setStep('otp')
    } catch {
      Alert.alert('Error', 'Could not send OTP. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (otp.length < 4) return Alert.alert('Enter the OTP')
    setLoading(true)
    try {
      const { token, user } = await authApi.verifyOtp(email, otp)
      await setUser(user, token)
      router.replace('/(tabs)')
    } catch {
      Alert.alert('Invalid OTP', 'Please check and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.logoCircle}>
            <Text style={styles.logoText}>B60</Text>
          </LinearGradient>
          <Text style={styles.tagline}>SMASH BURGERS</Text>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>
          {step === 'email' ? 'Order. Earn.\nRepeat.' : 'Enter Your\nOTP Code'}
        </Text>
        <Text style={styles.sub}>
          {step === 'email'
            ? 'Sign in with your email address'
            : `Code sent to ${email}`}
        </Text>

        {/* Input */}
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
          />
        ) : (
          <TextInput
            style={[styles.input, styles.otpInput]}
            placeholder="0 0 0 0 0 0"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
            maxLength={6}
            textAlign="center"
          />
        )}

        <Button
          title={step === 'email' ? 'Get OTP' : 'Verify & Login'}
          onPress={step === 'email' ? handleSendOtp : handleVerifyOtp}
          loading={loading}
          fullWidth
          size="lg"
        />

        {step === 'otp' && (
          <Pressable onPress={() => setStep('email')} style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={{ color: Colors.textSecondary }}>← Change email</Text>
          </Pressable>
        )}

        <Text style={styles.terms}>
          By continuing you agree to B60's Terms of Service
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingTop: 80, gap: Spacing.lg },
  logoContainer: { alignItems: 'center', gap: 8 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 28, fontWeight: '900', color: Colors.white },
  tagline: { fontSize: 11, fontWeight: '700', color: Colors.primary, letterSpacing: 3 },
  headline: { fontSize: 36, fontWeight: '900', color: Colors.white, lineHeight: 44 },
  sub: { ...Typography.bodySmall, marginTop: -8 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontSize: 16,
    padding: 16,
  },
  otpInput: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 12,
    paddingVertical: 20,
  },
  terms: { ...Typography.caption, textAlign: 'center', marginTop: Spacing.md },
})
