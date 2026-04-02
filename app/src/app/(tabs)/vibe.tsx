import React, { useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { LightTheme, DarkTheme, Spacing, Radius, Shadows } from '../../utils/theme'
import { useThemeStore } from '../../stores/themeStore'

// ─── Gallery Data ─────────────────────────────────────────────────────────────

const GALLERY_ITEMS = [
  { uri: 'https://b60.ae/images/fancy.webp',     location: 'DUBAI' },
  { uri: 'https://b60.ae/images/vegas.webp',     location: 'SHARJAH' },
  { uri: 'https://b60.ae/images/gallery-1.webp', location: 'DUBAI' },
  { uri: 'https://b60.ae/images/gallery-2.webp', location: 'ABU DHABI' },
  { uri: 'https://b60.ae/images/gallery-3.webp', location: 'DUBAI' },
  { uri: 'https://b60.ae/images/gallery-4.webp', location: 'SHARJAH' },
  { uri: 'https://b60.ae/images/gallery-5.webp', location: 'DUBAI' },
  { uri: 'https://b60.ae/images/gallery-6.webp', location: 'OUD METHA' },
  { uri: 'https://b60.ae/images/gallery-8.webp', location: 'DUBAI' },
  { uri: 'https://b60.ae/images/gallery-10.webp',location: 'SHARJAH' },
]

// Split into two columns. Left col: tall-short-tall-short... Right col: short-tall-short-tall...
const LEFT_ITEMS  = GALLERY_ITEMS.filter((_, i) => i % 2 === 0)
const RIGHT_ITEMS = GALLERY_ITEMS.filter((_, i) => i % 2 !== 0)

// ─── Image Card ───────────────────────────────────────────────────────────────

function VibeCard({
  uri,
  location,
  tall,
}: {
  uri: string
  location: string
  tall: boolean
}) {
  const scale = useRef(new Animated.Value(1)).current

  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start()

  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start()

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View
        style={[
          styles.card,
          { height: tall ? 220 : 150 },
          { transform: [{ scale }] },
        ]}
      >
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />
        {/* Location sticker */}
        <View style={[styles.sticker, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <Text style={[styles.stickerText, { color: '#F05A1A' }]}>{location}</Text>
        </View>
      </Animated.View>
    </Pressable>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function VibeScreen() {
  const themeMode = useThemeStore((s) => s.themeMode)
  const theme = themeMode === 'light' ? LightTheme : DarkTheme

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>THE VIBE</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>B60 on the streets</Text>
        </View>

        {/* Masonry grid */}
        <View style={styles.grid}>
          {/* Left column: tall, short, tall, short... */}
          <View style={styles.column}>
            {LEFT_ITEMS.map((item, idx) => (
              <VibeCard
                key={item.uri}
                uri={item.uri}
                location={item.location}
                tall={idx % 2 === 0}
              />
            ))}
          </View>

          {/* Right column: short, tall, short, tall... */}
          <View style={styles.column}>
            {RIGHT_ITEMS.map((item, idx) => (
              <VibeCard
                key={item.uri}
                uri={item.uri}
                location={item.location}
                tall={idx % 2 !== 0}
              />
            ))}
          </View>
        </View>

        {/* CTA */}
        <Pressable
          style={({ pressed }) => [
            styles.cta, 
            { backgroundColor: theme.primary, shadowColor: theme.black },
            pressed && styles.ctaPressed
          ]}
          onPress={() => router.push('/(tabs)/menu')}
        >
          <Text style={[styles.ctaText, { color: theme.white }]}>Order Now</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const GAP = 6

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    ...Typography.h1,
    fontSize: 36,
    letterSpacing: -1,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    paddingHorizontal: GAP,
    gap: GAP,
  },
  column: {
    flex: 1,
    gap: GAP,
  },
  card: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  sticker: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopRightRadius: Radius.sm,
    borderBottomLeftRadius: Radius.md,
  },
  stickerText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  cta: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xl,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    // Hard shadow for "The Vibe"
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
})
