# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

B60 Burgers — customer-facing pickup + loyalty app. Two deployable units: `app/` (React Native/Expo) and `backend/` (Node/Express on Railway).

## Commands

### App (`cd app`)
```bash
npx expo start                          # dev server
npx expo run:android                    # local Android build
npm run build:preview                   # EAS APK (internal distribution)
npm run build:production                # EAS AAB (Play Store)
```

### Backend (`cd backend`)
```bash
npm run dev        # tsx watch — hot reload
npm run build      # tsc → dist/
npm start          # node dist/index.js (production)
```

Backend auto-deploys to Railway on `git push` to main. Build command is `npm run build && npm start`.

### EAS builds
Preview profile produces an APK. Production profile produces an AAB. Queue time ~10–15 min on free tier. To check build status: `npx eas build:list`.

## Architecture

### Request Flow
```
App (Expo) → axios (src/services/api.ts) → Railway backend → Supabase PostgreSQL
                                                           ↘ DartPOS REST API (local IP, needs ngrok tunnel)
```

Auth: Email OTP via Resend → backend issues HS256 JWT → stored in SecureStore → sent as `Authorization: Bearer <token>` on every request. `requireAuth` middleware verifies JWT then looks up user in Supabase `users` table.

### App State
- **authStore** (Zustand + SecureStore persistence) — user object, JWT token, `isAuthenticated`, `updatePoints()`
- **cartStore** (Zustand + SecureStore persistence) — items array, location, points redemption
- **themeStore** (Zustand) — `'light' | 'dark'` mode

React Query wraps all API calls with 5-min stale cache. **Always add `enabled: isAuthenticated` to queries that require auth** — without this, 401s fire before the JWT loads from SecureStore on cold start.

### Navigation (Expo Router)
File-based routing under `src/app/`. Tabs live in `(tabs)/`. Auth screens in `(auth)/`. `_layout.tsx` at root checks AsyncStorage for onboarding completion and gates the stack accordingly.

Navigation to dynamic routes must use `router.push('/item/${id}' as any)` — TypedRoutes is disabled.

### Theme
All colors/spacing/shadows come from `src/utils/theme.ts`. Use `LightTheme`/`DarkTheme` objects, never hardcode hex values per-screen. The `login.tsx` screen has a local `C` color object — this is a known exception (dark-only screen).

### Backend Routes
All routes under `/api/`:
- `POST /api/auth/send-otp` + `POST /api/auth/verify-otp` — email OTP, returns JWT
- `GET /api/menu/items` + `GET /api/menu/categories` — cached 60s/300s
- `POST /api/orders` — validates item prices against DB (anti-injection), pushes to DartPOS, awards points
- `GET/POST /api/loyalty/*` — balance, history, redeem
- `GET /api/locations` — branch list

### DartPOS Integration
`backend/src/services/dartPos.ts` pushes orders to `DART_POS_URL/api/Tablet/InsertOrder`. The POS IP (`139.99.115.240:8908`) is local-network only — Railway cannot reach it directly. **Requires ngrok tunnel on the branch PC** with the public URL set as `DART_POS_URL` in Railway env vars. Al Ghurair location is excluded from DartPOS push (set `DART_POS_EXCLUDED_LOCATIONS` in Railway to the location UUID).

### Loyalty / Points
- 1 AED spent = 1 point (`POINTS_PER_AED`)
- 20 points = 1 AED redemption (`POINTS_TO_AED = 0.05`)
- Min 100 points to redeem (`MIN_REDEEM_POINTS`)
- Tiers: Bronze 0–999 / Silver 1000–4999 / Gold 5000+
- Points awarded in `backend/src/services/loyalty.ts` after order insert, never before

## Key Conventions

- **No emojis in UI** — use `lucide-react-native` icons only. Category pills are text-only.
- **Images**: always use `expo-image` (not RN `Image`) for caching. `cart.tsx` and `profile.tsx` still use RN Image — known issue to fix.
- **Lists**: FlashList (`@shopify/flash-list`) for menu grid, FlatList for shorter lists. Never ScrollView + map for data lists.
- **Animations**: `react-native-reanimated` v3 for new code. Some legacy `Animated` API usage in home screen — acceptable but don't extend it.
- **Touch targets**: all interactive elements ≥ 44pt via `hitSlop` where needed.
- B60 primary orange: `#F05A1A`. Default new design elements to this color.

## Environment Variables

### Backend (Railway)
```
SUPABASE_URL
SUPABASE_SERVICE_KEY
JWT_SECRET                    # must be ≥ 32 chars
DART_POS_URL                  # ngrok public URL for branch PC
DART_POS_EXCLUDED_LOCATIONS   # UUID of Al Ghurair location
RESEND_API_KEY
```

### App (`app.json` → `extra`)
```
apiUrl          # Railway backend URL
supabaseUrl
supabaseAnonKey
```

## Supabase

Tables with RLS enabled: `users`, `menu_items`, `menu_categories`, `orders`, `order_items`, `locations`, `loyalty_transactions`, `game_spins`, `game_tap_scores`, `game_streaks`, `game_leaderboard`, `game_vouchers`.

Migrations in `supabase/migrations/`. Always use `gen_random_uuid()` not `uuid_generate_v4()`.

The `users` table uses email-based auth (OTP). `phone` column is nullable. `email` has a unique constraint added in migration `003`.
