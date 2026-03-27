import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Plus } from 'lucide-react-native'
import { Colors, Radius, Spacing, Shadows } from '../../utils/theme'
import type { MenuItem } from '../../types'

interface MenuItemCardProps {
  item: MenuItem
  onPress: (item: MenuItem) => void
  onQuickAdd: (item: MenuItem) => void
}

export function MenuItemCard({ item, onPress, onQuickAdd }: MenuItemCardProps) {
  const scale = useSharedValue(1)
  const addScale = useSharedValue(1)

  const cardAnim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const addAnim = useAnimatedStyle(() => ({ transform: [{ scale: addScale.value }] }))

  const handleAdd = () => {
    addScale.value = withSpring(0.8, {}, () => { addScale.value = withSpring(1) })
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onQuickAdd(item)
  }

  return (
    <Animated.View style={[styles.wrapper, item.is_featured && Shadows.glowStrong, cardAnim]}>
      <Pressable
        onPress={() => onPress(item)}
        onPressIn={() => { scale.value = withSpring(0.97) }}
        onPressOut={() => { scale.value = withSpring(1) }}
        style={styles.card}
      >
        <View style={styles.imageContainer}>
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.image}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Text style={styles.placeholderEmoji}>🍔</Text>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.gradient}
          />
          {item.is_featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>🔥 HOT</Text>
            </View>
          )}
          <Text style={styles.nameOverlay} numberOfLines={2}>{item.name}</Text>
        </View>

        <View style={styles.footer}>
          {item.description ? (
            <Text style={styles.desc} numberOfLines={1}>{item.description}</Text>
          ) : null}
          <View style={styles.priceRow}>
            <Text style={styles.price}>AED {item.price.toFixed(0)}</Text>
            <Animated.View style={addAnim}>
              <Pressable onPress={handleAdd} style={styles.addBtn} hitSlop={8}>
                <Plus size={16} color={Colors.white} strokeWidth={3} />
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    ...Shadows.card,
    margin: 4,
  },
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  imageContainer: {
    height: 180,
    justifyContent: 'flex-end',
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  imagePlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  placeholderEmoji: { fontSize: 40 },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '65%',
  },
  featuredBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  featuredText: { fontSize: 10, fontWeight: '800', color: Colors.white },
  nameOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    right: 10,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  footer: {
    padding: Spacing.sm + 2,
    backgroundColor: Colors.white,
  },
  desc: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
