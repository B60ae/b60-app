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
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const setUser = useAuthStore((s) => s.setUser)

  const handleSendOtp = async () => {
    if (phone.length < 9) return Alert.alert('Enter a valid UAE number')
    setLoading(true)
    try {
      const formatted = phone.startsWith('+') ? phone : `+971${phone.replace(/^0/, '')}`
      await authApi.sendOtp(formatted)
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
      const formatted = phone.startsWith('+') ? phone : `+971${phone.replace(/^0/, '')}`
      const { token, user } = await authApi.verifyOtp(formatted, otp)
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
          {step === 'phone' ? 'Order. Earn.\nRepeat.' : 'Enter Your\nOTP Code'}
        </Text>
        <Text style={styles.sub}>
          {step === 'phone'
            ? 'Sign in with your UAE mobile number'
            : `Code sent to +971 ${phone}`}
        </Text>

        {/* Input */}
        {step === 'phone' ? (
          <View style={styles.inputGroup}>
            <View style={styles.prefix}>
              <Text style={styles.prefixText}>🇦🇪 +971</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="50 000 0000"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={10}
            />
          </View>
        ) : (
          <TextInput
            style={[styles.input, styles.otpInput]}
            placeholder="0 0 0 0"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
            maxLength={6}
            textAlign="center"
          />
        )}

        <Button
          title={step === 'phone' ? 'Get OTP' : 'Verify & Login'}
          onPress={step === 'phone' ? handleSendOtp : handleVerifyOtp}
          loading={loading}
          fullWidth
          size="lg"
        />

        {step === 'otp' && (
          <Pressable onPress={() => setStep('phone')} style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={{ color: Colors.textSecondary }}>← Change number</Text>
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
  inputGroup: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  prefix: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  prefixText: { color: Colors.text, fontSize: 15 },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    padding: 16,
  },
  otpInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 12,
    paddingVertical: 20,
  },
  terms: { ...Typography.caption, textAlign: 'center', marginTop: Spacing.md },
})
