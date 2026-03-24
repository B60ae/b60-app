import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import type { User } from '../types'

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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: async (user, token) => {
    await SecureStore.setItemAsync('authToken', token)
    await SecureStore.setItemAsync('userData', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },

  loadSession: async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken')
      const userData = await SecureStore.getItemAsync('userData')
      if (token && userData) {
        set({ user: JSON.parse(userData), token, isAuthenticated: true })
      }
    } catch {
      // no session
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('authToken')
    await SecureStore.deleteItemAsync('userData')
    set({ user: null, token: null, isAuthenticated: false })
  },

  updatePoints: (points) => {
    const user = get().user
    if (user) {
      const updated = { ...user, loyalty_points: points }
      set({ user: updated })
      SecureStore.setItemAsync('userData', JSON.stringify(updated))
    }
  },
}))
