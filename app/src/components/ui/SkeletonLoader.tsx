import React, { useEffect, useRef } from 'react'
import { Animated, View, StyleSheet, ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Colors, Radius } from '../../utils/theme'

interface SkeletonLoaderProps {
  variant?: 'card' | 'row' | 'banner' | 'circle'
  width?: number | string
  height?: number
  style?: ViewStyle
}

export function SkeletonLoader({ variant = 'card', width, height, style }: SkeletonLoaderProps) {
  const shimmer = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] })

  const dimensions = getDimensions(variant, width, height)

  return (
    <Animated.View style={[styles.base, dimensions, style, { opacity }]}>
      <LinearGradient
        colors={['#E8E8E8', '#F5F5F5', '#E8E8E8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  )
}

function getDimensions(variant: string, width?: number | string, height?: number) {
  switch (variant) {
    case 'card':
      return { width: width ?? '100%', height: height ?? 220, borderRadius: Radius.lg }
    case 'row':
      return { width: width ?? '100%', height: height ?? 64, borderRadius: Radius.md }
    case 'banner':
      return { width: width ?? '100%', height: height ?? 160, borderRadius: Radius.lg }
    case 'circle':
      return { width: width ?? 48, height: height ?? 48, borderRadius: Radius.full }
    default:
      return { width: width ?? '100%', height: height ?? 80, borderRadius: Radius.md }
  }
}

export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <View style={skeletonStyles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonLoader key={i} variant="card" style={skeletonStyles.gridItem} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    backgroundColor: '#E8E8E8',
  },
})

const skeletonStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  gridItem: {
    width: '47%',
    height: 220,
  },
})
