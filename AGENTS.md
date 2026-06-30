# LensCal — Agent Context

## What This App Does

LensCal is a contact lens replacement tracker. Users log when they open a new lens pack for each eye (left/right), and the app tracks the expiration date based on the lens type (daily / weekly / monthly). It sends reminders when a replacement is due. **Login via Supabase Auth is required — there is no offline/guest mode.**

---

## Tech Stack

| Layer | Library / Version |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript ~5.9.2 (strict, path alias `@/*` → project root) |
| Styling | Tailwind CSS v3 — colours sourced from `constants/palette.ts` |
| Font | Plus Jakarta Sans via `next/font/google` (CSS var `--font-jakarta`) |
| Auth + DB | @supabase/supabase-js ^2.108.2 + @supabase/ssr ^0.6.1 |
| Icons | lucide-react |
| PWA | @ducanh2912/next-pwa (Workbox SW, disabled in dev) |
| State | React Context — single `LensProvider` |

---

## Project Structure

```
app/
  layout.tsx              Root layout: Plus Jakarta Sans, PWA metadata, theme-color
  globals.css             Tailwind directives + body baseline
  (app)/
    layout.tsx            Authenticated shell: LensProvider + BottomNav
    page.tsx              Today screen — next replacement date + per-eye LensCard
    history/page.tsx      Lens usage history with event timeline
    settings/page.tsx     User settings
    replace-lens/page.tsx Open/change a lens (eye via ?eye= search param)
  login/
    page.tsx              Email/password sign-in + sign-up toggle
  auth/
    callback/route.ts     Supabase PKCE code exchange → session cookie → redirect /

components/
  bottom-nav.tsx          Fixed bottom nav bar (Today / History / Settings)
  lens-card.tsx           Per-eye card showing active lens status and actions
  action-button.tsx       Primary CTA button
  animated-pressable.tsx  Button with scale-press CSS transition
  segmented-control.tsx   Tab-style toggle (lens type selector)
  ui/
    icon-symbol.tsx       lucide-react icon wrapper
    primitives.tsx        Card component

constants/
  palette.ts              All design tokens. Imported by tailwind.config.ts and used inline.

lib/
  data.ts                 All Supabase CRUD — the only place that talks to the DB.
  supabase/
    client.ts             createBrowserClient() — use in Client Components
    server.ts             createServerClient() — use in Server Components / Route Handlers
  notifications.ts        Web Push stubs (implementation deferred). No-op exports only.
  haptics.ts              navigator.vibrate() shim. No-op on unsupported browsers.
  date-utils.ts           Date arithmetic: expirationFor, daysRemaining, formatters.

middleware.ts             Session refresh on every request; redirects unauthenticated users to /login.

providers/
  lens-provider.tsx       Global LensContext / useLens() hook — all app state lives here.

types/
  lens.ts                 All domain types (see below).

supabase/
  schema.sql              Postgres schema + RLS policies (lens_usages, lens_events, user_settings).
```

---

## Domain Model (`types/lens.ts`)

```ts
Eye           = 'left' | 'right'
LensType      = 'daily' | 'weekly' | 'monthly'
LensStatus    = 'active' | 'discarded'
LensEventType = 'opened' | 'uncomfortable' | 'discarded' | 'replaced'

LensUsage     — id, user_id, eye, opened_at, expires_at, lens_type,
                status, notes, created_at, updated_at
LensEvent     — id, user_id, lens_usage_id, event_type, event_at,
                notes, created_at
AppSettings   — defaultLensType, monthlyReplacementDays, notificationsEnabled,
                reminderHour, reminderMinute
EyeState      — { eye, activeLens: LensUsage | null, latestUncomfortableEvent: LensEvent | null }
```

**Constraints:**
- Only one `active` lens per eye at a time — enforced by a unique partial index in Supabase.
- IDs are client-side generated: `` `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,10)}` ``
- `dirty` and `notification_id` fields are **gone** — they were SQLite-only concepts.

---

## State Management

All mutable app state flows through `LensProvider` (`providers/lens-provider.tsx`). Consume it with `useLens()`. Do not add separate state stores.

**Context shape:**

```ts
{
  isReady: boolean;
  isBusy: boolean;
  settings: AppSettings;
  eyes: Record<Eye, EyeState>;
  history: LensUsage[];
  events: LensEvent[];
  refresh: () => Promise<void>;
  replaceLens(eye, lensType, notes?, openedAt?): Promise<void>;
  discardLens(eye): Promise<void>;
  markUncomfortable(eye, notes?): Promise<void>;
  updateSetting(key, value): Promise<void>;
  signIn(email, password): Promise<void>;
  signUp(email, password): Promise<void>;
  signOut(): Promise<void>;
}
```

---

## Data Layer (`lib/data.ts`)

Every database call goes through `lib/data.ts`. Functions accept a `SupabaseClient` as their first argument. The LensProvider passes the browser client.

| Function | Supabase table |
|---|---|
| `getActiveLenses(supabase)` | `lens_usages` WHERE status = 'active' |
| `getLensHistory(supabase)` | `lens_usages` ORDER BY opened_at DESC |
| `getEvents(supabase)` | `lens_events` ORDER BY event_at DESC |
| `openLens(supabase, input)` | INSERT into `lens_usages` |
| `discardActiveLens(supabase, id)` | UPDATE `lens_usages` SET status = 'discarded' |
| `insertEvent(supabase, input)` | INSERT into `lens_events` |
| `getSettings(supabase, userId)` | `user_settings` — creates default row if absent |
| `updateSetting(supabase, userId, key, value)` | UPSERT into `user_settings` |

RLS is enforced server-side; Supabase automatically filters by the authenticated user.

---

## Auth + Routing

- **Middleware** (`middleware.ts`): refreshes the session cookie and redirects any unauthenticated request to `/login`. Excludes `/login`, `/auth/callback`, and Next.js static assets.
- **Auth callback** (`app/auth/callback/route.ts`): exchanges the PKCE `code` param for a session cookie, then redirects to `/`.
- **Login page** (`app/login/page.tsx`): email/password form, toggle between sign-in and sign-up. Calls `supabase.auth.signInWithPassword` / `signUp` directly.
- **`signOut()`** in `LensProvider`: calls `supabase.auth.signOut()` then `router.push('/login')`.

**Supabase client usage:**
- Client Components → `createClient()` from `lib/supabase/client.ts`
- Server Components / Route Handlers → `createClient()` from `lib/supabase/server.ts`

---

## Routing

Next.js App Router with `(app)` route group for the authenticated shell.

| URL | File |
|---|---|
| `/` | `app/(app)/page.tsx` |
| `/history` | `app/(app)/history/page.tsx` |
| `/settings` | `app/(app)/settings/page.tsx` |
| `/replace-lens?eye=left\|right` | `app/(app)/replace-lens/page.tsx` |
| `/login` | `app/login/page.tsx` |

Navigate with `useRouter()` from `next/navigation` or `<Link href="...">`.

---

## UI Conventions

- **Colours:** always import `palette` from `@/constants/palette`. Never hardcode colour strings.
- **Typography:** `font-sans` applies Plus Jakarta Sans via CSS variable. Use Tailwind font-weight classes: `font-bold` (700), `font-extrabold` (800), `font-black` (900).
- **Icons:** `lucide-react` components (e.g. `<Calendar />`, `<Eye />`, `<Settings />`).
- **Cards:** use the `<Card>` primitive from `@/components/ui/primitives`.
- **Pressables:** use `<AnimatedPressable>` — it's an HTML `<button>` with `active:scale-[0.985] transition-transform`.
- **Spacing:** 16px horizontal padding standard, 12–16px gap between sections.
- Bottom nav is 62px tall; page content has `pb-28` to clear it.
- Inline styles using `palette` tokens are fine for one-off colours; prefer Tailwind for layout.

---

## Supabase Tables

| Table | Purpose |
|---|---|
| `lens_usages` | One row per lens pack per eye |
| `lens_events` | Audit log (opened / uncomfortable / discarded / replaced) |
| `user_settings` | Per-user app settings (default lens type, reminder time, etc.) |

All tables have RLS enabled. Users can only access their own rows.

---

## Notifications (Deferred)

`lib/notifications.ts` currently exports **no-op stubs**. Web Push implementation comes later.  
Do not import from `expo-notifications` — that package is not installed.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (required) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (required) |

Set both in `.env.local`. The app will not function without them.

---

## Development Commands

```bash
npm run dev      # Next.js dev server (Turbopack)
npm run build    # Production build (also generates SW via next-pwa)
npm run start    # Serve production build
npm run lint     # ESLint (eslint-config-next)
```

---

## Key Constraints for Agents

1. **Supabase is the only data source.** No SQLite, no local-first, no dirty-flag sync.
2. **Login is required.** Middleware enforces auth on every route except `/login` and `/auth/callback`.
3. **All state goes through `LensProvider`.** Do not add a second state store.
4. **Unique active lens constraint.** Never allow two active lenses for the same eye. Call `discardActiveLens` first.
5. **`lib/data.ts` is the only place that talks to Supabase tables.** Do not write raw Supabase queries in components or the provider.
6. **Use `lib/supabase/client.ts` in Client Components, `lib/supabase/server.ts` in Server Components.**
7. **Notifications are stubbed.** Do not use `expo-notifications`. `lib/notifications.ts` exports no-ops.
8. **Do not install React Native or Expo packages.** The project is Next.js only.


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
