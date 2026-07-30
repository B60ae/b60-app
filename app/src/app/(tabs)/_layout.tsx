import { useRef, useEffect } from 'react'
import { Tabs } from 'expo-router'
import { LayoutGrid, Star, MoreHorizontal } from 'lucide-react-native'
import { View, Text, StyleSheet, Animated, Platform } from 'react-native'
import { LightTheme, DarkTheme, V3 } from '../../utils/theme'
import { useCartStore } from '../../stores/cartStore'
import { useThemeStore } from '../../stores/themeStore'

function HomeTabIcon({ focused }: { focused: boolean }) {
  return (
    <View style={styles.homeIcon}>
      <Text style={[styles.homeText, focused && styles.homeTextActive]}>B60</Text>
    </View>
  )
}

function CartBadge({ color, size }: { color: string; size: number }) {
  const count = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))
  const prevCount = useRef(count)
  const badgeScale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (count > prevCount.current) {
      Animated.sequence([
        Animated.spring(badgeScale, { toValue: 1.45, useNativeDriver: true, tension: 300, friction: 8 }),
        Animated.spring(badgeScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
      ]).start()
    }
    prevCount.current = count
  }, [count])

  return (
    <View>
      <LayoutGrid size={size} color={color} strokeWidth={1.8} />
      {count > 0 && (
        <Animated.View style={[styles.badge, { transform: [{ scale: badgeScale }] }]}>
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
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,
        tabBarStyle: {
          backgroundColor: theme.tabBarBg,
          borderTopWidth: 1,
          borderTopColor: V3.ln,
          height: Platform.OS === 'ios' ? 80 : 62,
          paddingBottom: Platform.OS === 'ios' ? 20 : 0,
          paddingTop: 0,
          // Lift shadow
          shadowColor: '#1E1206',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.05,
          shadowRadius: 18,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 8,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 10,
          paddingBottom: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <HomeTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Order',
          tabBarIcon: ({ color, size }) => <CartBadge color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="loyalty"
        options={{
          title: 'B60 Club',
          tabBarIcon: ({ color, size }) => <Star size={22} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <MoreHorizontal size={22} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="vibe"
        options={{ href: null }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  homeIcon: {
    height: 24,
    justifyContent: 'center',
  },
  homeText: {
    fontFamily: 'Archivo_800ExtraBold',
    fontSize: 14,
    letterSpacing: -0.5,
    color: V3.dim2,
  },
  homeTextActive: {
    color: V3.od,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: V3.o,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFDF8',
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 9,
    fontWeight: '500',
  },
})
