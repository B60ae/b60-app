import { Redirect } from 'expo-router'
import { useAuthStore } from '../stores/authStore'
import { View, ActivityIndicator } from 'react-native'
import { Colors } from '../utils/theme'

export default function Index() {
  const { isLoading, isAuthenticated } = useAuthStore()

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/login'} />
}
