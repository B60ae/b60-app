# B60 Burgers App — Lead Developer Audit & Action Plan
> Last updated: 2026-04-09 | Author: Lead Dev (Claude Sonnet 4.6)

---

## Executive Summary

Full-stack QSR pickup app — React Native (Expo SDK 51) + Node/Express backend + Supabase PostgreSQL.
Current state: **FUNCTIONAL BUT FRAGILE**. Core flows work; several critical bugs fixed this session.
Below is the complete audit, every issue categorised by severity, and the fix status.

---

## Architecture Overview

```
App (React Native / Expo Router)
  └── src/
      ├── app/           Expo Router screens
      │   ├── (tabs)/    Home, Menu, Cart, Loyalty, Profile
      │   ├── (auth)/    Login (OTP email)
      │   ├── item/[id]  Item detail
      │   ├── order/[id] Order detail
      │   ├── orders/    Order history
      │   └── order-success/
      ├── stores/        Zustand — authStore, cartStore, themeStore
      ├── services/      api.ts (axios), supabase.ts
      ├── components/    ui/ + features/
      ├── types/         index.ts (shared types)
      └── utils/         constants.ts, theme.ts

Backend (Node/Express — deployed on Railway)
  └── src/
      ├── routes/        auth, menu, orders, loyalty, locations
      ├── middleware/     auth.ts (JWT verify + Supabase user lookup)
      ├── services/      dartPos.ts, loyalty.ts
      └── config/        supabase.ts

Database (Supabase / PostgreSQL)
  └── supabase/migrations/
      ├── 001_initial_schema.sql
      └── 002_seed_data.sql
```

---

## Critical Issues (FIXED THIS SESSION)

| # | Issue | File | Fix Applied |
|---|-------|------|------------|
| C1 | Backend crashes on Railway boot — `dist/` not built before `node start` | `backend/railway.json` | Added `npm run build && npm start` |
| C2 | `redeemPoints()` called with `'pending'` as orderId before order exists → FK violation | `backend/src/routes/orders.ts` | Moved redemption after order insert |
| C3 | Loyalty/orders 401 flood — queries fired before JWT hydrated from SecureStore | `app/src/services/api.ts` + all query screens | Added `enabled: isAuthenticated` guards |
| C4 | Duplicate `Animated` import in `item/[id].tsx` → Babel crash, APK failed | `app/src/app/item/[id].tsx` | Aliased RN Animated as `RNAnimated` |
| C5 | Auto-logout on 401 fired even when not authenticated → infinite loop | `app/src/services/api.ts` | Guard: only logout if `isAuthenticated` |

---

## Schema Issues (ACTION REQUIRED)

### S1 — CRITICAL: `users.phone NOT NULL` but OTP auth only collects email

**Problem:** `001_initial_schema.sql` defines `phone text unique not null` as primary identifier.
The auth flow (`routes/auth.ts`) only uses `email` — phone is never set. Every new user insert fails silently or requires a workaround.

**Fix:** Migration `003_fix_users_email_auth.sql` — make phone nullable, add email unique index.

### S2 — MEDIUM: No `email` unique constraint on users table

**Problem:** `email` column exists but has no UNIQUE constraint. Duplicate accounts possible.

**Fix:** Included in migration 003.

### S3 — LOW: `uuid-ossp` extension deprecated pattern

**Problem:** `uuid_generate_v4()` used everywhere. PostgreSQL 13+ has `gen_random_uuid()` built-in.

**Fix:** New migrations use `gen_random_uuid()`. Existing data unaffected.

---

## Backend Issues

### B1 — MEDIUM: No input validation on order items shape

**Problem:** `POST /api/orders` validates `items` is a non-empty array but doesn't validate each item has `menu_item.id`, `menu_item.price`, etc. Malformed payloads crash the Dart POS push.

**Fix:** Added item shape validation in orders route.

### B2 — MEDIUM: Menu routes have no caching

**Problem:** Menu categories/items fetched on every request with no cache headers. With Supabase free tier rate limits, this is a risk.

**Fix:** Added `Cache-Control` headers — 60s for menu items, 300s for categories.

### B3 — LOW: `RESEND_API_KEY` missing from `.env.example`

**Problem:** Auth route imports Resend conditionally but the key isn't documented.

**Fix:** Added to `.env.example`.

### B4 — LOW: No health check for Supabase connectivity

**Problem:** `/health` endpoint only returns `{status: 'ok'}` — doesn't verify DB connection.

**Fix:** Enhanced health check pings Supabase.

---

## Frontend Issues

### F1 — MEDIUM: `users.phone` type mismatch in TypeScript types

**Problem:** `types/index.ts` declares `phone: string` as required but email-only auth never sets it.

**Fix:** Made `phone` optional in User type.

### F2 — LOW: Home screen `Find Us` links to `/(tabs)/map` which doesn't exist

**Problem:** `router.push('/(tabs)/map')` — no map tab. Causes silent navigation failure.

**Fix:** Route map tab press to locations list or remove the `onSeeAll`.

### F3 — LOW: Category quick-chips use emoji — violates brand CLAUDE.md rule

**Problem:** `CLAUDE.md` says no emojis. Home screen has emoji in category chips.

**Fix:** Replaced with text labels only.

---

## Security Audit (OWASP)

| Check | Status | Notes |
|-------|--------|-------|
| SQL Injection | SAFE | Using Supabase client (parameterized) |
| JWT secret | SAFE | Env var, not hardcoded |
| Rate limiting | SAFE | express-rate-limit applied |
| Auth on protected routes | SAFE | `requireAuth` middleware |
| CORS | ACCEPTABLE | `origin: '*'` — tighten for production |
| Error message leakage | ACCEPTABLE | Some routes expose `error.message` in dev |
| Password storage | N/A | OTP-only auth, no passwords |
| Input validation | PARTIAL | Added item shape validation this session |
| RLS on Supabase | SAFE | All tables have RLS policies |
| Secrets in code | SAFE | `.env` pattern used correctly |

---

## Performance

| Area | Status | Notes |
|------|--------|-------|
| FlatList for menu | GOOD | Using FlatList not ScrollView |
| Image caching | GOOD | expo-image used in order history |
| React Query caching | GOOD | staleTime configured |
| Bundle size | UNKNOWN | Not measured |
| JS bundle splits | NOT DONE | Single bundle |
| Hermes | ENABLED | Default in Expo SDK 51 |

---

## Deployment

| Service | Platform | Status |
|---------|----------|--------|
| Backend API | Railway | Live — `zestful-essence` |
| Database | Supabase | Live |
| App (Android) | APK | Built locally — `app-release.apk` (73MB) |
| App (iOS) | Not built | EAS required |
| OTA Updates | Not configured | EAS Update not set up |

---

## Pending / Future Work

- [ ] Set up EAS Update for OTA deployments
- [ ] Add push notifications (order status changes)
- [ ] Map screen (currently linked but missing)
- [ ] Tighten CORS to specific origins
- [ ] Add Sentry crash reporting
- [ ] Write integration tests for order flow
- [ ] Add menu item search
- [ ] Admin dashboard for order management

---

## Files Changed This Session

```
backend/railway.json                    NEW — build before start
backend/src/routes/orders.ts            FIX — items validation + redeem order
backend/src/routes/menu.ts              FIX — cache headers
backend/src/index.ts                    FIX — health check
backend/.env.example                    FIX — RESEND_API_KEY added
app/src/services/api.ts                 FIX — 401 guard
app/src/app/(tabs)/loyalty.tsx          FIX — enabled guard
app/src/app/(tabs)/profile.tsx          FIX — enabled guard
app/src/app/orders/index.tsx            FIX — enabled guard + import
app/src/app/(tabs)/index.tsx            FIX — map route, no emoji chips
app/src/types/index.ts                  FIX — phone optional
supabase/migrations/003_fix_users.sql   NEW — email auth alignment
```
