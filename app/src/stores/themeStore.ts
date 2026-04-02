import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LightTheme, DarkTheme, type ThemeMode } from '../utils/theme'

interface ThemeState {
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
  getColors: () => typeof LightTheme
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeMode: 'light',
      setThemeMode: (mode) => set({ themeMode: mode }),
      getColors: () => {
        const mode = get().themeMode
        return mode === 'light' ? LightTheme : DarkTheme
      },
    }),
    {
      name: 'b60-theme-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
