import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { API_URL } from '../utils/constants'
import type { MenuItem, MenuCategory, Order, Cart, LoyaltyBalance, LoyaltyTransaction, Location } from '../types'

const client = axios.create({ baseURL: API_URL, timeout: 15000 })

client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('authToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Menu ─────────────────────────────────────────────────────────────────
export const menuApi = {
  getCategories: () => client.get<MenuCategory[]>('/menu/categories').then(r => r.data),
  getItems: (categoryId?: string) =>
    client.get<MenuItem[]>('/menu/items', { params: { category_id: categoryId } }).then(r => r.data),
  getItem: (id: string) => client.get<MenuItem>(`/menu/items/${id}`).then(r => r.data),
  getFeatured: () => client.get<MenuItem[]>('/menu/featured').then(r => r.data),
}

// ─── Orders ───────────────────────────────────────────────────────────────
export const ordersApi = {
  create: (cart: Cart) => client.post<Order>('/orders', cart).then(r => r.data),
  get: (id: string) => client.get<Order>(`/orders/${id}`).then(r => r.data),
  getHistory: () => client.get<Order[]>('/orders/history').then(r => r.data),
  track: (id: string) => client.get<{ status: string; estimated_ready_at: string }>(`/orders/${id}/track`).then(r => r.data),
}

// ─── Loyalty ──────────────────────────────────────────────────────────────
export const loyaltyApi = {
  getBalance: () => client.get<LoyaltyBalance>('/loyalty/balance').then(r => r.data),
  getHistory: () => client.get<LoyaltyTransaction[]>('/loyalty/history').then(r => r.data),
}

// ─── Locations ────────────────────────────────────────────────────────────
export const locationsApi = {
  getAll: () => client.get<Location[]>('/locations').then(r => r.data),
}

// ─── Auth ─────────────────────────────────────────────────────────────────
export const authApi = {
  sendOtp: (phone: string) => client.post('/auth/otp/send', { phone }).then(r => r.data),
  verifyOtp: (phone: string, otp: string) =>
    client.post<{ token: string; user: any }>('/auth/otp/verify', { phone, otp }).then(r => r.data),
  updateProfile: (data: { name?: string; email?: string }) =>
    client.patch('/auth/profile', data).then(r => r.data),
}
