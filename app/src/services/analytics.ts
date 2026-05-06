import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { useAuthStore } from '../stores/authStore'

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0'
const PLATFORM = Platform.OS as 'android' | 'ios'

// Events queue — flushed in batches to avoid hammering the API
type AnalyticsEvent = { event_name: string; properties?: Record<string, unknown> }
const queue: AnalyticsEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

// ─── Public API ───────────────────────────────────────────────────────────────

export const analytics = {
  track,
  screen,
  flush,
}

function track(eventName: string, properties?: Record<string, unknown>) {
  queue.push({ event_name: eventName, properties })
  scheduleFlush()
}

function screen(name: string, extra?: Record<string, unknown>) {
  track('screen_view', { screen: name, ...extra })
}

// ─── Flush ────────────────────────────────────────────────────────────────────

function scheduleFlush() {
  if (flushTimer) return
  // Auto-flush after 3s or when queue reaches 20
  if (queue.length >= 20) {
    flush()
    return
  }
  flushTimer = setTimeout(() => flush(), 3000)
}

async function flush() {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null }
  if (queue.length === 0) return

  const { token, isAuthenticated } = useAuthStore.getState()
  if (!isAuthenticated || !token) {
    // Not logged in — discard anonymous events (no PII risk, no consent)
    queue.length = 0
    return
  }

  const batch = queue.splice(0, 50)

  try {
    const { API_URL } = await import('../utils/constants')
    await fetch(`${API_URL}/analytics/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        events: batch,
        platform: PLATFORM,
        app_version: APP_VERSION,
      }),
    })
  } catch {
    // Silently drop on network error — analytics must never break the app
  }
}

// ─── Consent ──────────────────────────────────────────────────────────────────

export async function recordConsent(version: string): Promise<void> {
  const { token } = useAuthStore.getState()
  if (!token) return
  try {
    const { API_URL } = await import('../utils/constants')
    await fetch(`${API_URL}/analytics/consent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ version, platform: PLATFORM }),
    })
  } catch {
    // Non-blocking
  }
}

// ─── Named event helpers (type-safe shortcuts) ────────────────────────────────

export const Events = {
  // Auth
  LOGIN_STARTED:        () => track('login_started'),
  LOGIN_OTP_SENT:       () => track('login_otp_sent'),
  LOGIN_SUCCESS:        () => track('login_success'),
  LOGIN_FAILED:         (reason: string) => track('login_failed', { reason }),
  LOGOUT:               () => track('logout'),

  // Onboarding
  ONBOARDING_STARTED:   () => track('onboarding_started'),
  ONBOARDING_COMPLETE:  () => track('onboarding_complete'),

  // Menu
  MENU_VIEWED:          (category?: string) => track('menu_viewed', { category }),
  ITEM_VIEWED:          (itemId: string, name: string, price: number) =>
                          track('item_viewed', { item_id: itemId, name, price }),

  // Cart
  ADD_TO_CART:          (itemId: string, name: string, price: number) =>
                          track('add_to_cart', { item_id: itemId, name, price }),
  REMOVE_FROM_CART:     (itemId: string) => track('remove_from_cart', { item_id: itemId }),
  CART_VIEWED:          () => track('cart_viewed'),

  // Orders
  CHECKOUT_STARTED:     (total: number, itemCount: number) =>
                          track('checkout_started', { total, item_count: itemCount }),
  ORDER_PLACED:         (orderId: string, total: number, locationId: string) =>
                          track('order_placed', { order_id: orderId, total, location_id: locationId }),
  ORDER_VIEWED:         (orderId: string) => track('order_viewed', { order_id: orderId }),
  POINTS_REDEEMED:      (points: number) => track('points_redeemed', { points }),

  // Loyalty
  LOYALTY_VIEWED:       () => track('loyalty_viewed'),

  // Games
  SPIN_PLAYED:          (prizeType: string, prizeValue: string) =>
                          track('spin_played', { prize_type: prizeType, prize_value: prizeValue }),
  TAP_GAME_PLAYED:      (score: number, pointsEarned: number) =>
                          track('tap_game_played', { score, points_earned: pointsEarned }),
  LEADERBOARD_VIEWED:   () => track('leaderboard_viewed'),

  // Legal
  TERMS_ACCEPTED:       (version: string) => track('terms_accepted', { version }),
  PRIVACY_POLICY_VIEWED: () => track('privacy_policy_viewed'),
}
