import React from 'react'
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Colors, Radius, Spacing } from '../../utils/theme'

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
  return (
    <View style={[styles.container, { height }]}>
      <Image
        source={{ uri: imageUri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={300}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.75)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        {ctaLabel && onCtaPress && (
          <Pressable onPress={onCtaPress} style={styles.cta}>
            <Text style={styles.ctaText}>{ctaLabel}</Text>
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
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
    justifyContent: 'flex-end',
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -1,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    fontWeight: '500',
  },
  cta: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.full,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
})
