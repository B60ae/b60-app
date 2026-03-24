import { create } from 'zustand'
import type { CartItem, MenuItem, CustomizationOption } from '../types'
import { POINTS_PER_AED, POINTS_TO_AED } from '../utils/constants'

interface CartState {
  items: CartItem[]
  locationId: string
  pointsToRedeem: number
  addItem: (item: MenuItem, quantity: number, options: CustomizationOption[], notes?: string) => void
  removeItem: (index: number) => void
  updateQuantity: (index: number, quantity: number) => void
  setLocation: (locationId: string) => void
  setPointsToRedeem: (points: number) => void
  clearCart: () => void
  subtotal: () => number
  discount: () => number
  total: () => number
  pointsEarned: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  locationId: '',
  pointsToRedeem: 0,

  addItem: (menuItem, quantity, selectedOptions, notes) => {
    const optionsCost = selectedOptions.reduce((sum, o) => sum + o.price_delta, 0)
    const lineTotal = (menuItem.price + optionsCost) * quantity
    set((state) => ({
      items: [...state.items, { menu_item: menuItem, quantity, selected_options: selectedOptions, notes, line_total: lineTotal }],
    }))
  },

  removeItem: (index) =>
    set((state) => ({ items: state.items.filter((_, i) => i !== index) })),

  updateQuantity: (index, quantity) =>
    set((state) => {
      const items = [...state.items]
      if (quantity <= 0) {
        items.splice(index, 1)
      } else {
        const item = items[index]
        const optionsCost = item.selected_options.reduce((sum, o) => sum + o.price_delta, 0)
        items[index] = {
          ...item,
          quantity,
          line_total: (item.menu_item.price + optionsCost) * quantity,
        }
      }
      return { items }
    }),

  setLocation: (locationId) => set({ locationId }),

  setPointsToRedeem: (points) => set({ pointsToRedeem: points }),

  clearCart: () => set({ items: [], pointsToRedeem: 0 }),

  subtotal: () => get().items.reduce((sum, item) => sum + item.line_total, 0),

  discount: () => get().pointsToRedeem * POINTS_TO_AED,

  total: () => {
    const s = get().subtotal()
    const d = get().discount()
    return Math.max(0, s - d)
  },

  pointsEarned: () => Math.floor(get().total() * POINTS_PER_AED),
}))
