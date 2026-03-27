import React, { useRef, useState } from 'react'
import { View, Text, StyleSheet, Dimensions, Pressable, FlatList, Animated } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors, Spacing, Radius, Shadows } from '../../utils/theme'

const { width: W, height: H } = Dimensions.get('window')
export const ONBOARDING_KEY = 'b60_onboarding_done'

const SLIDES = [
  {
    key: 'smash',
    emoji: '🍔',
    title: 'SMASH IT.',
    body: 'Hand-smashed burgers made fresh to order. No shortcuts. All flavour.',
    image: 'https://b60.ae/images/fancy.webp',
    gradient: [Colors.primary, Colors.primaryDark] as [string, string],
  },
  {
    key: 'earn',
    emoji: '🏅',
    title: 'Earn Points',
    body: 'Every dirham you spend earns you loyalty points. Redeem them for free food.',
    image: 'https://b60.ae/images/vegas.webp',
    gradient: ['#1B2A4A', '#2D3E6A'] as [string, string],
  },
  {
    key: 'pickup',
    emoji: '⚡',
    title: 'Pick Up Fast',
    body: 'Order ahead, skip the wait. Your smash burger will be ready when you are.',
    image: 'https://b60.ae/images/classic-beef.webp',
    gradient: [Colors.success, '#166534'] as [string, string],
  },
]

async function markOnboardingDone() {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
}

export default function OnboardingScreen() {
  const [activeIdx, setActiveIdx] = useState(0)
  const flatListRef = useRef<FlatList>(null)
  const dotScale = useRef(SLIDES.map(() => new Animated.Value(1))).current

  const goNext = () => {
    if (activeIdx < SLIDES.length - 1) {
      const next = activeIdx + 1
      flatListRef.current?.scrollToIndex({ index: next, animated: true })
      setActiveIdx(next)
      Animated.spring(dotScale[next], { toValue: 1.4, useNativeDriver: true, tension: 200 }).start(() =>
        Animated.spring(dotScale[next], { toValue: 1, useNativeDriver: true }).start()
      )
    } else {
      handleGetStarted()
    }
  }

  const handleSkip = async () => {
    await markOnboardingDone()
    router.replace('/(auth)/login')
  }

  const handleGetStarted = async () => {
    await markOnboardingDone()
    router.replace('/(auth)/login')
  }

  const isLast = activeIdx === SLIDES.length - 1

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={(s) => s.key}
        renderItem={({ item: slide }) => (
          <View style={styles.slide}>
            {/* Background image */}
            <Image source={{ uri: slide.image }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)', '#000000']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0.3 }}
              end={{ x: 0, y: 1 }}
            />

            {/* Content */}
            <View style={styles.slideContent}>
              <Text style={styles.slideEmoji}>{slide.emoji}</Text>
              <Text style={styles.slideTitle}>{slide.title}</Text>
              <Text style={styles.slideBody}>{slide.body}</Text>
            </View>
          </View>
        )}
      />

      {/* Controls */}
      <View style={styles.controls}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <Animated.View
              key={s.key}
              style={[
                styles.dot,
                i === activeIdx ? styles.dotActive : styles.dotInactive,
                { transform: [{ scale: dotScale[i] }] },
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.btnRow}>
          {!isLast ? (
            <Pressable style={styles.skipBtn} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <Pressable style={styles.nextBtn} onPress={goNext}>
            <Text style={styles.nextBtnText}>{isLast ? 'Get Started' : 'Next →'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  slide: { width: W, height: H, justifyContent: 'flex-end' },
  slideContent: {
    padding: Spacing.xl,
    paddingBottom: 160,
    gap: Spacing.md,
  },
  slideEmoji: { fontSize: 56 },
  slideTitle: { fontSize: 44, fontWeight: '900', color: Colors.white, lineHeight: 48 },
  slideBody: { fontSize: 17, color: 'rgba(255,255,255,0.85)', lineHeight: 26, maxWidth: 300 },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
    paddingBottom: 48,
    gap: Spacing.md,
  },
  dots: { flexDirection: 'row', gap: 6, alignSelf: 'center' },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 24, backgroundColor: Colors.primary },
  dotInactive: { width: 8, backgroundColor: 'rgba(255,255,255,0.35)' },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  skipBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  skipText: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  nextBtn: {
    flex: 2,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    ...Shadows.glowStrong,
  },
  nextBtnText: { fontSize: 16, fontWeight: '900', color: Colors.white },
})
