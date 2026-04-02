import React from 'react'
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { LightTheme, DarkTheme, Radius, Spacing, Typography } from '../../utils/theme'
import { useThemeStore } from '../../stores/themeStore'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface HeroBannerProps {
  imageUri: string
  title: string
  subtitle?: string
  ctaLabel?: string
  onCtaPress?: () => void
  height?: number
}

export function HeroBanner({
  imageUri,
  title,
  subtitle,
  ctaLabel,
  onCtaPress,
  height = 260,
}: HeroBannerProps) {
  const themeMode = useThemeStore((s) => s.themeMode)
  const theme = themeMode === 'light' ? LightTheme : DarkTheme

  return (
    <View style={[styles.container, { height }]}>
      <Image
        source={{ uri: imageUri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={300}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', theme.overlay]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.white, transform: [{ rotate: '-1deg' }] }]}>{title}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.9)' }]}>{subtitle}</Text>}
        {ctaLabel && onCtaPress && (
          <Pressable 
            onPress={onCtaPress} 
            style={[
              styles.cta, 
              { 
                backgroundColor: theme.yellow, 
                borderColor: theme.black,
                shadowColor: theme.black 
              }
            ]}
          >
            <Text style={[styles.ctaText, { color: theme.black }]}>{ctaLabel} →</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  title: {
    ...Typography.h1,
    fontSize: 48,
    letterSpacing: -1.5,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    fontWeight: '600',
    maxWidth: '85%',
  },
  cta: {
    marginTop: Spacing.lg,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 2,
    // Neobrutalist shadow
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
})
