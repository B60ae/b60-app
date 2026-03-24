import Constants from 'expo-constants'

export const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'https://b60.ae/api'
export const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl ?? ''
export const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey ?? ''

export const POINTS_PER_AED = 1           // 1 point per 1 AED spent
export const POINTS_TO_AED = 0.05         // 20 points = 1 AED
export const MIN_REDEEM_POINTS = 100      // minimum points to redeem

export const LOCATIONS = [
  { id: 'oud-metha', name: 'Oud Metha', city: 'Dubai' },
  { id: 'al-ghurair', name: 'Al Ghurair', city: 'Dubai' },
  { id: 'muwaileh', name: 'Muwaileh', city: 'Sharjah' },
  { id: 'al-warqa', name: 'Al Warqa', city: 'Dubai' },
]

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Order Received',
  confirmed: 'Confirmed',
  preparing: 'Being Prepared',
  ready: 'Ready for Pickup!',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  preparing: '#F05A1A',
  ready: '#22C55E',
  completed: '#666666',
  cancelled: '#EF4444',
}
