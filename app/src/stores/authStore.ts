import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import * as SecureStore from 'expo-secure-store'
import type { User } from '../types'

// Custom storage adapter wrapping expo-secure-store
const secureStorage = createJSONStorage(() => ({
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
}))

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: User, token: string) => Promise<void>
  loadSession: () => Promise<void>
  logout: () => Promise<void>
  updatePoints: (points: number) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,

      // persist middleware handles storage + save token for axios interceptor
      setUser: async (user, token) => {
        await SecureStore.setItemAsync('authToken', token)
        set({ user, token, isAuthenticated: true })
      },

      // No-op: persist rehydrates automatically on startup
      loadSession: async () => {},

      logout: async () => {
        await SecureStore.deleteItemAsync('authToken')
        set({ user: null, token: null, isAuthenticated: false })
      },

      updatePoints: (points) => {
        const user = get().user
        if (user) {
          set({ user: { ...user, loyalty_points: points } })
        }
      },
    }),
    {
      name: 'b60-auth',
      storage: secureStorage,
      // Only persist auth-relevant fields; isLoading is runtime state
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.isLoading = false
      },
    }
  )
)
