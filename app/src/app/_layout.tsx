import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'
import { ONBOARDING_KEY } from './onboarding/index'
import { DarkTheme, LightTheme } from '../utils/theme'

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
      setShowOnboarding(!val)
      setOnboardingChecked(true)
    })
  }, [])

  const themeMode = useThemeStore((s) => s.themeMode)
  const theme = themeMode === 'light' ? LightTheme : DarkTheme

  if (!onboardingChecked) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} backgroundColor={theme.background} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
            {showOnboarding && <Stack.Screen name="onboarding/index" />}
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="item/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="order/[id]" />
            <Stack.Screen name="order-success/index" />
            <Stack.Screen name="orders/index" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
