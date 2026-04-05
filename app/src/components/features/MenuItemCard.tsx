import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Plus } from 'lucide-react-native'
import { LightTheme, DarkTheme, Radius, Spacing, Shadows, Typography } from '../../utils/theme'
import { useThemeStore } from '../../stores/themeStore'
import { DirhamSymbol } from '../ui/DirhamSymbol'
import type { MenuItem } from '../../types'

interface MenuItemCardProps {
  item: MenuItem
  onPress: () => void
  onAddToCart: () => void
}

export function MenuItemCard({ item, onPress, onAddToCart }: MenuItemCardProps) {
  const themeMode = useThemeStore((s) => s.themeMode)
  const theme = themeMode === 'light' ? LightTheme : DarkTheme
  
  const cardScale = useSharedValue(1)
  const addScale = useSharedValue(1)

  const cardAnim = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }))

  const addAnim = useAnimatedStyle(() => ({
    transform: [{ scale: addScale.value }],
  }))

  const handleCardPressIn = () => {
    cardScale.value = withSpring(0.94, { damping: 6, stiffness: 600 })
  }

  const handleCardPressOut = () => {
    cardScale.value = withSpring(1, { damping: 8, stiffness: 350 })
  }

  const handleAddToCart = () => {
    if (!item.is_available) return
    addScale.value = withSequence(
      withSpring(0.7, { damping: 4, stiffness: 800 }),
      withSpring(1, { damping: 6, stiffness: 400 })
    )
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
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
        accessibilityRole="button"
        accessibilityLabel={item.is_available ? `View ${item.name}` : `${item.name}, sold out`}
        accessibilityState={{ disabled: !item.is_available }}
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

          {/* Featured badge — top-left sticker */}
          {item.is_featured && (
            <View style={[styles.featuredBadge, { backgroundColor: theme.primary, borderColor: theme.black }]}>
              <Text style={[styles.featuredText, { color: theme.white }]}>🔥 HOT</Text>
            </View>
          )}

          {/* Item name — sits on gradient */}
          <Text style={[styles.nameOverlay, { color: theme.white }]} numberOfLines={2}>
            {item.name}
          </Text>

          {/* Price pill — bottom-right sticker */}
          <View style={[styles.pricePill, { backgroundColor: '#1A1A1A', borderColor: '#FFFFFF' }]}>
            <View style={styles.priceInner}>
              <DirhamSymbol size={12} color="#FFFFFF" />
              <Text style={[styles.priceText, { color: '#FFFFFF' }]}>{Number(item.price || 0).toFixed(0)}</Text>
            </View>
          </View>

          {/* Sold out overlay */}
          {!item.is_available && (
            <View style={styles.soldOutOverlay}>
              <Text style={styles.soldOutText}>Sold Out</Text>
            </View>
          )}
        </View>

        {/* Footer — add button only */}
        <View style={[styles.footer, { backgroundColor: theme.surface }]}>
          <Animated.View style={addAnim}>
            <Pressable
              onPress={handleAddToCart}
              style={[
                styles.addBtn,
                { backgroundColor: theme.primary, borderColor: theme.black },
                !item.is_available && { backgroundColor: theme.border }
              ]}
              hitSlop={10}
              disabled={!item.is_available}
              accessibilityRole="button"
              accessibilityLabel={`Add ${item.name} to cart`}
              accessibilityState={{ disabled: !item.is_available }}
            >
              <Plus size={20} color={theme.white} strokeWidth={3} />
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
    borderRadius: Radius.md,
    margin: 6,
    borderWidth: 2,
    borderColor: '#0D0D0D',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0D0D0D',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  featuredBorder: {
    borderWidth: 3,
  },
  card: {
    flex: 1,
    borderRadius: Radius.md - 2,
    overflow: 'hidden',
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
    height: '40%',
  },
  featuredBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    transform: [{ rotate: '-3deg' }],
  },
  featuredText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  nameOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 65,
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 4,
    lineHeight: 18,
  },
  pricePill: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    transform: [{ rotate: '2deg' }],
  },
  priceInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '900',
  },
  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOutText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Neobrutalist shadow
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
})
