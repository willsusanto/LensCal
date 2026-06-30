# LensCal — Agent Context

## Critical: Expo has changed

**Always read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any Expo-related code.** APIs, config, and plugin options differ significantly between SDK versions. Do not rely on training data.

---

## What This App Does

LensCal is a contact lens replacement tracker. Users log when they open a new lens pack for each eye (left/right), and the app tracks the expiration date based on the lens type (daily / weekly / monthly). It sends a local push notification when a replacement is due. Cloud sync to Supabase is optional.

---

## Tech Stack

| Layer            | Library / Version                                                    |
| ---------------- | -------------------------------------------------------------------- |
| Framework        | Expo SDK ~54.0.34, React Native 0.81.5, React 19.1.0                 |
| Router           | expo-router ~6.0.23 (file-based, typed routes)                       |
| Local DB         | expo-sqlite ~16.0.10 (WAL mode, offline-first)                       |
| Cloud sync       | @supabase/supabase-js ^2.108.2 (optional)                            |
| Notifications    | expo-notifications ~0.32.17                                          |
| Animations       | react-native-reanimated ~4.1.1, react-native-gesture-handler ~2.28.0 |
| State            | React Context — single `LensProvider`                                |
| Language         | TypeScript ~5.9.2 (strict, path alias `@/*` → project root)          |
| New Architecture | Enabled (`newArchEnabled: true`, React Compiler enabled)             |

---

## Project Structure

```
app/
  _layout.tsx          Root layout: font loading, ThemeProvider, LensProvider, Stack navigator
  replace-lens.tsx     Modal screen — open or change a lens for one eye
  (tabs)/
    _layout.tsx        Tab bar (Today / History / Settings)
    index.tsx          "Today" screen — next replacement date + per-eye LensCard
    history.tsx        Full lens usage history with event timeline per usage
    settings.tsx       App settings (lens type, replacement days, notifications)

components/            Shared UI components
  lens-card.tsx        Per-eye card showing active lens status and actions
  action-button.tsx    Primary CTA button
  animated-pressable.tsx  Pressable with scale animation
  app-text.tsx         Text + TextInput with Plus Jakarta Sans applied
  segmented-control.tsx   Tab-style toggle (used for lens type selection)
  floating-tab-bar.tsx Custom floating bottom tab bar
  ui/
    icon-symbol.tsx    SF Symbols wrapper (iOS native / fallback on Android/web)
    primitives.tsx     Card component

constants/
  palette.ts           All design tokens (colours). Single source of truth for UI colours.
  theme.ts             Theme helpers

lib/
  local-db.ts          SQLite schema + all CRUD. Owns the `dirty` sync flag logic.
  sync.ts              Push dirty rows to Supabase, pull remote rows back.
  notifications.ts     Schedule / cancel replacement reminders via expo-notifications.
  supabase.ts          Supabase client (null when env vars are absent).
  date-utils.ts        Date arithmetic: expiration, daysRemaining, formatters.
  haptics.ts           Haptic feedback helpers.
  app-fonts.ts         Font family constants + configureAppFonts().

providers/
  lens-provider.tsx    Global LensContext / useLens() hook — all app state lives here.

types/
  lens.ts              All domain types (see below).

supabase/
  schema.sql           Supabase Postgres schema with RLS policies.
```

---

## Domain Model (`types/lens.ts`)

```ts
Eye           = 'left' | 'right'
LensType      = 'daily' | 'weekly' | 'monthly'
LensStatus    = 'active' | 'discarded'
LensEventType = 'opened' | 'uncomfortable' | 'discarded' | 'replaced'

LensUsage     — one lens pack for one eye: id, eye, opened_at, expires_at,
                lens_type, status, notes, notification_id, dirty
LensEvent     — audit log entry for a LensUsage: id, lens_usage_id,
                event_type, event_at, notes, dirty
AppSettings   — defaultLensType, monthlyReplacementDays, notificationsEnabled,
                reminderHour, reminderMinute
EyeState      — { eye, activeLens: LensUsage | null, latestUncomfortableEvent: LensEvent | null }
```

**Constraints:**

- Only one `active` lens per eye at a time (enforced by a unique partial index in SQLite and Supabase).
- IDs are generated client-side: `` `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,10)}` ``

---

## State Management

All mutable app state flows through `LensProvider` (`providers/lens-provider.tsx`). Consume it with the `useLens()` hook. Do not add separate state stores.

Key values exposed:

- `eyes` — `Record<Eye, EyeState>` with active lens + latest uncomfortable event per eye
- `history` — all `LensUsage` records (newest first)
- `events` — all `LensEvent` records
- `settings` — `AppSettings`
- `session` — Supabase `Session | null`
- `isSupabaseConfigured` — boolean, false when env vars are absent
- `currentDate` — advances with `testDateOffsetDays` for QA (hidden from UI in production)

Key actions: `replaceLens`, `discardLens`, `markUncomfortable`, `updateSetting`, `syncNow`, `signIn`, `signUp`, `signOut`

---

## Data Layer

### SQLite (primary / offline-first)

- Database: `lenscal.db`, opened once via singleton `getDatabase()`.
- Three tables: `lens_usages`, `lens_events`, `app_settings`.
- `dirty INTEGER` flag (1 = needs sync, 0 = clean). All local writes set `dirty = 1`.
- Call `initDatabase()` once at startup (idempotent, uses `CREATE TABLE IF NOT EXISTS`).

### Supabase (optional cloud sync)

- Configured via `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- `supabase` client is `null` when vars are absent; always check `isSupabaseConfigured` before use.
- `syncWithSupabase()` in `lib/sync.ts`: pushes dirty rows, then pulls all remote rows for the user.
- RLS is enforced: users can only read/write their own rows.
- `notification_id` is local-only and is stripped before pushing to Supabase.

---

## Notifications

- Disabled entirely on web (`process.env.EXPO_OS === 'web'` guard).
- Android uses notification channel `lens-replacements`.
- A notification is scheduled when a lens is opened; cancelled when the lens is discarded.
- Trigger time = `expires_at` date at `reminderHour:reminderMinute` local time.
- If the trigger is in the past at scheduling time, no notification is created.

---

## Routing

Expo Router v6 with `typedRoutes` enabled. Main routes:

- `/(tabs)/` — Today screen (default)
- `/(tabs)/history`
- `/(tabs)/settings`
- `/replace-lens?eye=left|right` — modal, accepts `eye` search param

Navigate to the replace-lens modal with:

```ts
router.push({ pathname: "/replace-lens", params: { eye: "left" } });
```

---

## UI Conventions

- **Colours:** always use `palette` from `@/constants/palette`. Never hardcode colour strings.
- **Typography:** use `<Text>` and `<TextInput>` from `@/components/app-text` — they apply Plus Jakarta Sans automatically. Do not use RN's raw `<Text>` in screens.
- **Font weights:** 700 (bold body), 800/900 (headings). The app uses a custom weight mapping.
- **Icons:** `<IconSymbol name="..." />` from `@/components/ui/icon-symbol` (SF Symbols on iOS, Material on Android/web).
- **Cards:** use the `<Card>` primitive from `@/components/ui/primitives`.
- **Pressables:** use `<AnimatedPressable>` for interactive elements to get the scale animation.
- **Spacing:** 16px horizontal padding standard, 12-16px gap between sections.
- `borderCurve: 'continuous'` on all rounded containers for the iOS squircle look.

---

## Development Commands

```bash
expo start           # Start dev server (opens Expo Go / dev client)
expo start --ios     # iOS simulator
expo start --android # Android emulator
expo start --web     # Web browser
expo lint            # Run ESLint (eslint-config-expo)
node ./scripts/reset-project.js  # Reset to blank project scaffold
```

---

## Environment Variables

| Variable                        | Required | Purpose              |
| ------------------------------- | -------- | -------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`      | No       | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | No       | Supabase anon key    |

Without both vars the app runs fully offline. Set them in a `.env.local` file (not committed).

---

## Key Constraints for Agents

1. **Read Expo 54 docs** before using any Expo API — especially `expo-router`, `expo-sqlite`, `expo-notifications`.
2. **Do not add a second state store.** All state goes through `LensProvider`.
3. **Offline-first.** All writes go to SQLite first. Supabase sync is secondary and optional.
4. **Web platform has no notifications** — guard with `process.env.EXPO_OS === 'web'`.
5. **New Architecture is enabled.** Avoid libraries that are not compatible with the new arch.
6. **React Compiler is enabled.** Do not manually add `useMemo`/`useCallback` unless there is a measurable reason — the compiler handles most memoisation.
7. **Unique active lens constraint.** Never allow two active lenses for the same eye — discard the existing one first via `discardLens`.
