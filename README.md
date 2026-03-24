# B60 Burgers App

Customer-facing mobile app for B60 Burgers — order pickup + loyalty points.

## Stack
- **Mobile**: Expo React Native (iOS + Android)
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **POS**: Dart POS API integration
- **Hosting**: Render (API), EAS (app builds)

## Structure
```
b60-app/
├── app/          # Expo React Native
│   ├── src/app/  # Expo Router screens
│   │   ├── (auth)/login.tsx      # Phone OTP login
│   │   ├── (tabs)/index.tsx      # Home
│   │   ├── (tabs)/menu.tsx       # Full menu
│   │   ├── (tabs)/cart.tsx       # Cart + checkout
│   │   ├── (tabs)/loyalty.tsx    # Points & history
│   │   ├── (tabs)/profile.tsx    # Profile & orders
│   │   ├── item/[id].tsx         # Item detail (modal)
│   │   └── order/[id].tsx        # Order tracking
│   ├── src/components/           # UI + feature components
│   ├── src/services/             # API client + Supabase
│   ├── src/stores/               # Zustand (cart, auth)
│   └── src/utils/                # Theme tokens, constants
├── backend/      # Node.js API
│   └── src/
│       ├── routes/   # auth, menu, orders, loyalty, locations
│       ├── services/ # dartPos.ts, loyalty.ts
│       └── middleware/auth.ts
└── supabase/     # DB migrations + seed data
```

## Setup

### 1. Supabase
- Create project at supabase.com
- Run `supabase/migrations/001_initial_schema.sql`
- Run `supabase/migrations/002_seed_data.sql`

### 2. Backend
```bash
cd backend
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET, DART_POS_URL, DART_POS_API_KEY
npm install
npm run dev
```

### 3. Mobile App
```bash
cd app
npm install
# Update app.json extra.supabaseUrl, supabaseAnonKey, apiUrl
npx expo start
```

### 4. Deploy Backend (Render)
- Connect GitHub repo to Render
- Use `backend/render.yaml` config
- Add env vars in Render dashboard

### 5. Build App (EAS)
```bash
cd app
npx eas build --platform all --profile preview
```

## Loyalty System
- 1 AED spent = 1 point earned
- 20 points = AED 1 redemption value
- Tiers: Bronze (0–999) → Silver (1000–4999) → Gold (5000+)
- Points awarded after order confirmed
- Minimum 100 points to redeem

## Dart POS Integration
Orders are pushed to Dart POS on checkout. Status is polled every 8 seconds on the order tracking screen until ready.
Configure `DART_POS_URL` and `DART_POS_API_KEY` in backend `.env`.
