// In-memory TTL cache — zero infra cost.
// When scaling to multiple instances, swap store for Upstash Redis with one-line change.

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<any>>()

// Sweep expired keys every 60s — prevents unbounded memory growth
setInterval(() => {
  const now = Date.now()
  store.forEach((v, k) => { if (v.expiresAt < now) store.delete(k) })
}, 60_000)

export const cache = {
  get<T>(key: string): T | null {
    const entry = store.get(key)
    if (!entry) return null
    if (entry.expiresAt < Date.now()) { store.delete(key); return null }
    return entry.data as T
  },

  set<T>(key: string, data: T, ttlMs: number): void {
    store.set(key, { data, expiresAt: Date.now() + ttlMs })
  },

  del(key: string): void {
    store.delete(key)
  },

  // Invalidate all keys matching a prefix — e.g. cache.invalidate('menu:')
  invalidate(prefix: string): void {
    store.forEach((_, k) => { if (k.startsWith(prefix)) store.delete(k) })
  },

  size(): number {
    return store.size
  },
}

// TTL constants
export const TTL = {
  MENU_CATEGORIES: 5 * 60_000,   // 5 min — rarely changes
  MENU_ITEMS:      5 * 60_000,   // 5 min
  MENU_FEATURED:   5 * 60_000,   // 5 min
  LOCATIONS:       10 * 60_000,  // 10 min — almost never changes
}
