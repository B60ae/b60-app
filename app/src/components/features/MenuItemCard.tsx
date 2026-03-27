import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Plus } from 'lucide-react-native'
import { Colors, Radius, Spacing, Shadows } from '../../utils/theme'
import type { MenuItem } from '../../types'

interface MenuItemCardProps {
  item: MenuItem
  onPress: () => void
  onAddToCart: () => void
}

export function MenuItemCard({ item, onPress, onAddToCart }: MenuItemCardProps) {
  const cardScale = useSharedValue(1)
  const addScale = useSharedValue(1)

  const cardAnim = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }))

  const addAnim = useAnimatedStyle(() => ({
    transform: [{ scale: addScale.value }],
  }))

  const handleCardPressIn = () => {
    cardScale.value = withSpring(0.97, { damping: 15, stiffness: 300 })
  }

  const handleCardPressOut = () => {
    cardScale.value = withSpring(1, { damping: 15, stiffness: 300 })
  }

  const handleAddToCart = () => {
    if (!item.is_available) return
    addScale.value = withSpring(0.75, { damping: 10, stiffness: 400 }, () => {
      addScale.value = withSpring(1, { damping: 12, stiffness: 300 })
    })
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onAddToCart()
  }

  return (
    <Animated.View
      style={[
        styles.wrapper,
        item.is_featured && styles.featuredBorder,
        cardAnim,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handleCardPressIn}
        onPressOut={handleCardPressOut}
        style={styles.card}
        disabled={!item.is_available}
      >
        {/* Image block */}
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

          {/* Gradient — bottom third */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
            style={styles.gradient}
          />

          {/* Featured badge — top-left */}
          {item.is_featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>🔥 HOT</Text>
            </View>
          )}

          {/* Item name — sits on gradient */}
          <Text style={styles.nameOverlay} numberOfLines={2}>
            {item.name}
          </Text>

          {/* Price pill — bottom-right */}
          <View style={styles.pricePill}>
            <Text style={styles.priceText}>AED {Number(item.price || 0).toFixed(0)}</Text>
          </View>

          {/* Sold out overlay */}
          {!item.is_available && (
            <View style={styles.soldOutOverlay}>
              <Text style={styles.soldOutText}>Sold Out</Text>
            </View>
          )}
        </View>

        {/* Footer — add button only */}
        <View style={styles.footer}>
          <Animated.View style={addAnim}>
            <Pressable
              onPress={handleAddToCart}
              style={[styles.addBtn, !item.is_available && styles.addBtnDisabled]}
              hitSlop={10}
              disabled={!item.is_available}
            >
              <Plus size={18} color={Colors.white} strokeWidth={2.5} />
            </Pressable>
          </Animated.View>
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
    borderWidth: 1,
    borderColor: '#EEEEEE',
    ...Shadows.card,
    margin: 4,
  },
  featuredBorder: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.white,
  },
  imageContainer: {
    height: 180,
    justifyContent: 'flex-end',
  },
  image: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 40,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '33%',
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  featuredText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.3,
  },
  nameOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    right: 60,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  pricePill: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(150,150,150,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOutText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  footer: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    alignItems: 'flex-end',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    backgroundColor: '#CCCCCC',
  },
})
