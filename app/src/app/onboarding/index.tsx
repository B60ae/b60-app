import React, { useRef, useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, Dimensions, Pressable,
  FlatList, Animated, StatusBar,
} from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import { ArrowRight, Zap, Star, MapPin, Trophy, Flame } from 'lucide-react-native'
import { Colors, Spacing, Radius, Shadows } from '../../utils/theme'

const { width: W, height: H } = Dimensions.get('window')
export const ONBOARDING_KEY = 'b60_onboarding_done'

// ─── Slide Data ────────────────────────────────────────────────────────────────

const SLIDES = [
  {
    key: 'welcome',
    tag: 'DUBAI\'S SMASH BURGER',
    title: 'WE DON\'T\nFLIP.\nWE SMASH.',
    body: 'Hand-smashed patties seared at 400°C. The crust you can\'t fake. The flavour you can\'t forget.',
    image: 'https://b60.ae/images/fancy.webp',
    accent: Colors.primary,
    icon: Flame,
    gradient: ['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.75)', '#000'] as string[],
  },
  {
    key: 'story',
    tag: 'REAL CRAFT',
    title: '400°C.\n60 SECONDS.\nPURE BEEF.',
    body: 'Fresh never frozen. Smashed hard on a blazing flat top. That caramelised crust? You can\'t get it any other way.',
    image: 'https://b60.ae/images/classic-beef.webp',
    accent: Colors.gold,
    icon: Flame,
    gradient: ['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.8)', '#000'] as string[],
  },
  {
    key: 'order',
    tag: 'PICKUP IN MINUTES',
    title: 'ORDER.\nPICK UP.\nEAT.',
    body: 'Choose your branch, build your order, skip the queue. Your smash burger is ready when you are.',
    image: 'https://b60.ae/images/vegas.webp',
    accent: Colors.primary,
    icon: Zap,
    gradient: ['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.78)', '#000'] as string[],
  },
  {
    key: 'loyalty',
    tag: 'B60 CLUB',
    title: 'EAT MORE.\nEARN MORE.\nWIN MORE.',
    body: '1 AED = 1 point. Redeem for free food, spin the wheel daily, and climb the leaderboard. Loyalty that actually pays.',
    image: 'https://b60.ae/images/fancy.webp',
    accent: '#FFD700',
    icon: Trophy,
    gradient: ['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.8)', '#000'] as string[],
  },
  {
    key: 'locations',
    tag: '4 BRANCHES',
    title: 'DUBAI &\nSHARJAH.',
    body: 'Oud Metha · Al Warqa · Muwaileh. Pick your nearest, order now.',
    image: 'https://b60.ae/images/classic-beef.webp',
    accent: Colors.primary,
    icon: MapPin,
    gradient: ['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.82)', '#000'] as string[],
  },
]

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function markOnboardingDone() {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
}

// ─── Slide Item ────────────────────────────────────────────────────────────────

function SlideItem({ item, isActive }: { item: typeof SLIDES[0]; isActive: boolean }) {
  const contentY = useRef(new Animated.Value(30)).current
  const contentOpacity = useRef(new Animated.Value(0)).current
  const tagScale = useRef(new Animated.Value(0.85)).current

  useEffect(() => {
    if (isActive) {
      contentY.setValue(30)
      contentOpacity.setValue(0)
      tagScale.setValue(0.85)
      Animated.parallel([
        Animated.spring(contentY, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10, delay: 100 }),
        Animated.timing(contentOpacity, { toValue: 1, duration: 350, useNativeDriver: true, delay: 80 }),
        Animated.spring(tagScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 12, delay: 50 }),
      ]).start()
    }
  }, [isActive])

  const Icon = item.icon

  return (
    <View style={styles.slide}>
      {/* Full-bleed food image */}
      <Image
        source={{ uri: item.image }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={400}
      />

      {/* Dark gradient overlay */}
      <LinearGradient
        colors={item.gradient}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.35, 0.65, 1]}
      />

      {/* Orange accent strip at bottom of image */}
      <View style={[styles.accentStrip, { backgroundColor: item.accent }]} />

      {/* Content block */}
      <Animated.View
        style={[
          styles.slideContent,
          { opacity: contentOpacity, transform: [{ translateY: contentY }] },
        ]}
      >
        {/* Tag pill */}
        <Animated.View
          style={[
            styles.tagPill,
            { backgroundColor: item.accent + '22', borderColor: item.accent + '55', transform: [{ scale: tagScale }] },
          ]}
        >
          <Icon size={12} color={item.accent} strokeWidth={2.5} />
          <Text style={[styles.tagText, { color: item.accent }]}>{item.tag}</Text>
        </Animated.View>

        {/* Big headline */}
        <Text style={styles.slideTitle}>{item.title}</Text>

        {/* Body */}
        <Text style={styles.slideBody}>{item.body}</Text>
      </Animated.View>
    </View>
  )
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const [activeIdx, setActiveIdx] = useState(0)
  const flatListRef = useRef<FlatList>(null)

  // Dot widths — active dot expands to 28px pill
  const dotWidths = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 28 : 8))).current
  const dotOpacities = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0.35))).current

  const animateDots = (newIdx: number) => {
    SLIDES.forEach((_, i) => {
      Animated.parallel([
        Animated.spring(dotWidths[i], {
          toValue: i === newIdx ? 28 : 8,
          useNativeDriver: false,
          tension: 200, friction: 12,
        }),
        Animated.timing(dotOpacities[i], {
          toValue: i === newIdx ? 1 : 0.35,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start()
    })
  }

  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (activeIdx < SLIDES.length - 1) {
      const next = activeIdx + 1
      flatListRef.current?.scrollToIndex({ index: next, animated: true })
      setActiveIdx(next)
      animateDots(next)
    } else {
      handleGetStarted()
    }
  }

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    await markOnboardingDone()
    router.replace('/(auth)/login')
  }

  const handleGetStarted = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    await markOnboardingDone()
    router.replace('/(auth)/login')
  }

  const isLast = activeIdx === SLIDES.length - 1
  const progress = (activeIdx + 1) / SLIDES.length

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Full-screen slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled
        bounces={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / W)
          setActiveIdx(idx)
          animateDots(idx)
        }}
        keyExtractor={(s) => s.key}
        renderItem={({ item, index }) => (
          <SlideItem item={item} isActive={index === activeIdx} />
        )}
        getItemLayout={(_, index) => ({ length: W, offset: W * index, index })}
      />

      {/* ── Bottom Controls ── */}
      <View style={styles.controls}>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        {/* Dot indicators */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  width: dotWidths[i],
                  opacity: dotOpacities[i],
                  backgroundColor: i === activeIdx ? Colors.primary : '#fff',
                },
              ]}
            />
          ))}
        </View>

        {/* Action buttons */}
        <View style={styles.btnRow}>
          {!isLast ? (
            <Pressable style={styles.skipBtn} onPress={handleSkip} hitSlop={8}>
              <Text style={styles.skipText}>SKIP</Text>
            </Pressable>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <Pressable style={[styles.nextBtn, { backgroundColor: Colors.primary, ...Shadows.glowStrong }]} onPress={goNext}>
            <Text style={styles.nextBtnText}>{isLast ? 'GET STARTED' : 'NEXT'}</Text>
            <ArrowRight size={18} color="#fff" strokeWidth={3} />
          </Pressable>
        </View>

        {/* Slide counter */}
        <Text style={styles.counter}>{activeIdx + 1} / {SLIDES.length}</Text>
      </View>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  slide: {
    width: W,
    height: H,
    justifyContent: 'flex-end',
  },

  accentStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.6,
  },

  slideContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 220,
    gap: 14,
  },

  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  slideTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 52,
    letterSpacing: -1,
    textTransform: 'uppercase',
  },

  slideBody: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 24,
    maxWidth: W * 0.82,
  },

  // ── Controls ──
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingBottom: 48,
    paddingTop: 20,
    gap: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },

  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 1,
  },

  dots: {
    flexDirection: 'row',
    gap: 5,
    alignSelf: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },

  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },

  skipBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  skipText: {
    fontSize: 13,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.5,
  },

  nextBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: Radius.lg,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  counter: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 2,
  },
})
