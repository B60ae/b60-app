import { useRef, useEffect } from 'react'
import { Tabs } from 'expo-router'
import { ShoppingBag, ShoppingCart, Star, MoreHorizontal } from 'lucide-react-native'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { LightTheme, DarkTheme } from '../../utils/theme'
import { useCartStore } from '../../stores/cartStore'
import { useThemeStore } from '../../stores/themeStore'

function B60TabIcon({ color }: { color: string }) {
  const isActive = color !== '#888888' && color !== '#444444' && color !== '#999999'
  return (
    <View style={[b60IconStyles.box, isActive && b60IconStyles.boxActive]}>
      <Text style={[b60IconStyles.text, isActive && b60IconStyles.textActive]}>B60</Text>
    </View>
  )
}

const b60IconStyles = StyleSheet.create({
  box: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 5, borderWidth: 1.5, borderColor: 'transparent',
  },
  boxActive: { backgroundColor: '#F05A1A', borderColor: '#F05A1A' },
  text: { fontSize: 11, fontWeight: '900', color: '#888888', letterSpacing: -0.5 },
  textActive: { color: '#ffffff' },
})

function CartTabIcon({ color, size, theme }: { color: string; size: number; theme: any }) {
  const count = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))
  const prevCount = useRef(count)
  const badgeScale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (count > prevCount.current) {
      Animated.sequence([
        Animated.spring(badgeScale, { toValue: 1.5, useNativeDriver: true, tension: 300, friction: 8 }),
        Animated.spring(badgeScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
      ]).start()
    }
    prevCount.current = count
  }, [count])

  return (
    <View>
      <ShoppingCart size={size} color={color} />
      {count > 0 && (
        <Animated.View style={[styles.badge, { backgroundColor: theme.primary, transform: [{ scale: badgeScale }] }]}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </Animated.View>
      )}
    </View>
  )
}

export default function TabsLayout() {
  const themeMode = useThemeStore((s) => s.themeMode)
  const theme = themeMode === 'light' ? LightTheme : DarkTheme

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 12,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'HOME',
          tabBarIcon: ({ color }) => <B60TabIcon color={color} />
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'ORDER',
          tabBarIcon: ({ color, size }) => <ShoppingBag size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="loyalty"
        options={{
          title: 'B60 CLUB',
          tabBarIcon: ({ color, size }) => <Star size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'MORE',
          tabBarIcon: ({ color, size }) => <MoreHorizontal size={size} color={color} />
        }}
      />
      <Tabs.Screen 
        name="vibe" 
        options={{ 
          href: null,
        }} 
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute', top: -6, right: -10,
    borderRadius: 999, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
})
