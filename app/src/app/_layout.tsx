import { useEffect, useState, Component, ReactNode } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'
import { ONBOARDING_KEY } from './onboarding/index'
import { DarkTheme, LightTheme } from '../utils/theme'

// ─── Error Boundary ───────────────────────────────────────────────────────────
class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(err: Error) { console.error('[AppErrorBoundary]', err) }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', gap: 16, padding: 32 }}>
          <Text style={{ color: '#F05A1A', fontSize: 28, fontWeight: '900' }}>B60</Text>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' }}>Something went wrong</Text>
          <Text style={{ color: '#888', fontSize: 14, textAlign: 'center' }}>Restart the app to continue</Text>
          <Pressable
            onPress={() => this.setState({ hasError: false })}
            style={{ backgroundColor: '#F05A1A', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Try Again</Text>
          </Pressable>
        </View>
      )
    }
    return this.props.children
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 2 },
  },
})

export default function RootLayout() {
  const loadSession = useAuthStore((s) => s.loadSession)
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    loadSession()
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      const needsOnboarding = !val
      setShowOnboarding(needsOnboarding)
      setOnboardingChecked(true)
      if (needsOnboarding) {
        router.replace('/onboarding/index' as any)
      }
    })
  }, [])

  const themeMode = useThemeStore((s) => s.themeMode)
  const theme = themeMode === 'light' ? LightTheme : DarkTheme

  if (!onboardingChecked) return null

  return (
    <AppErrorBoundary>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} backgroundColor={theme.background} />
          <Stack
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}
          >
            <Stack.Screen name="onboarding/index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="item/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="order/[id]" />
            <Stack.Screen name="order-success/index" />
            <Stack.Screen name="orders/index" />
            <Stack.Screen name="games/spin" options={{ presentation: 'modal' }} />
            <Stack.Screen name="games/tap" options={{ presentation: 'modal' }} />
            <Stack.Screen name="games/leaderboard" />
            <Stack.Screen name="about/index" />
            <Stack.Screen name="legal/index" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
    </AppErrorBoundary>
  )
}
