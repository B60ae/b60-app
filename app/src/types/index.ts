// ─── User ───────────────────────────────────────────────────────────────────
export interface User {
  id: string
  phone: string
  name: string
  email?: string
  avatar_url?: string
  loyalty_points: number
  created_at: string
}

// ─── Menu ────────────────────────────────────────────────────────────────────
export interface MenuCategory {
  id: string
  name: string
  slug: string
  sort_order: number
}

export interface MenuItem {
  id: string
  category_id: string
  name: string
  description: string
  price: number
  image_url: string
  is_available: boolean
  is_featured: boolean
  calories?: number
  customizations?: Customization[]
}

export interface Customization {
  id: string
  name: string
  type: 'single' | 'multi'
  options: CustomizationOption[]
}

export interface CustomizationOption {
  id: string
  name: string
  price_delta: number
}

// ─── Cart ────────────────────────────────────────────────────────────────────
export interface CartItem {
  menu_item: MenuItem
  quantity: number
  selected_options: CustomizationOption[]
  notes?: string
  line_total: number
}

export interface Cart {
  items: CartItem[]
  location_id: string
  subtotal: number
  points_redeemed: number
  discount: number
  total: number
}

// ─── Order ───────────────────────────────────────────────────────────────────
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'

export interface Order {
  id: string
  user_id: string
  location_id: string
  items: CartItem[]
  status: OrderStatus
  subtotal: number
  points_redeemed: number
  discount: number
  total: number
  points_earned: number
  dart_pos_order_id?: string
  estimated_ready_at?: string
  created_at: string
  updated_at: string
}

// ─── Location ────────────────────────────────────────────────────────────────
export interface Location {
  id: string
  name: string
  address: string
  city: string
  phone: string
  lat: number
  lng: number
  is_open: boolean
  open_hours: string
}

// ─── Loyalty ─────────────────────────────────────────────────────────────────
export interface LoyaltyTransaction {
  id: string
  user_id: string
  order_id?: string
  type: 'earned' | 'redeemed' | 'expired' | 'bonus'
  points: number
  description: string
  created_at: string
}

export interface LoyaltyBalance {
  total_points: number
  redeemable_points: number
  aed_value: number
  tier: 'Bronze' | 'Silver' | 'Gold'
  next_tier_points?: number
}
