# LensCal → Next.js App Router PWA — Migration Plan

## Goal

Convert the Expo SDK 54 / React Native app into a Next.js 15 App Router PWA.

- **Supabase is the sole data source.** SQLite, the dirty-flag sync, and all offline-first logic are removed.
- **Login is required.** There is no guest / offline mode.
- **All native dependencies are removed** — no Expo, no React Native, no Android/iOS packages.
- **Notifications are deferred** — stub them out so the build passes; implement Web Push later.
- **Priority: UI + routing first.**

---

## Priority Order

| Priority | Steps |
|---|---|
| Now (UI + routing) | 1 – 14 |
| Next (settings screen) | 15 |
| Later (notifications + cleanup) | 16 – 17 |

---

## Route Mapping

| Expo Router (current) | Next.js App Router (target) | Notes |
|---|---|---|
| `app/_layout.tsx` | `app/layout.tsx` | Root layout: font, providers, nav shell |
| `app/(tabs)/_layout.tsx` | `app/(app)/layout.tsx` | Authenticated shell + bottom nav |
| `app/(tabs)/index.tsx` | `app/(app)/page.tsx` | Today / dashboard screen |
| `app/(tabs)/history.tsx` | `app/(app)/history/page.tsx` | Lens usage history |
| `app/(tabs)/settings.tsx` | `app/(app)/settings/page.tsx` | User settings |
| `app/replace-lens.tsx` (modal) | `app/(app)/replace-lens/page.tsx` | Full page; `?eye=` search param |
| *(none)* | `app/login/page.tsx` | New: email/password login + sign-up |
| *(none)* | `app/auth/callback/route.ts` | New: Supabase PKCE callback handler |

---

## Steps

---

### Step 1 — Scaffold the Next.js project

Bootstrap a new Next.js 15 app on the current branch. Use the App Router, TypeScript strict mode, Tailwind CSS, and the `@/*` import alias to match the existing path alias.

```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --turbopack
```

- Confirm `strict: true` is set in `tsconfig.json` and `@/*` maps to the project root.
- Keep the existing `types/`, `constants/`, and `lib/date-utils.ts` — they are pure TypeScript with no React Native imports and need zero changes.
- Delete `app.json`, `metro.config.js`, and `scripts/reset-project.js` — they are Expo-specific.

---

### Step 2 — Strip all Expo / React Native dependencies

Replace `package.json` entirely. Remove every native or Expo-specific package. Add the new web dependencies.

**Remove:**

| Package(s) | Reason |
|---|---|
| `expo`, `expo-router`, `expo-*` (all) | Expo framework |
| `react-native`, `react-native-*` (all) | Native primitives |
| `@react-navigation/*` | Replaced by Next.js router |
| `@expo/vector-icons` | Replaced by `lucide-react` |
| `@react-native-async-storage/async-storage` | Session handled by Supabase SSR cookies |
| `@react-native-community/datetimepicker` | Replaced by `<input type="date">` |
| `react-native-url-polyfill` | Not needed in browser/Node |
| `expo-sqlite` | Replaced by Supabase |
| `eslint-config-expo` | Replaced by `eslint-config-next` |

**Add:**

```bash
npm install @supabase/supabase-js @supabase/ssr lucide-react next-pwa
```

Keep `react` and `react-dom` — they are unchanged.

---

### Step 3 — Configure PWA manifest + service worker

Use `next-pwa` to generate the Workbox service worker automatically. Create the web manifest manually.

**`next.config.ts`:**

```ts
import withPWA from 'next-pwa';

const nextConfig = { /* ... */ };

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);
```

**`public/manifest.json`:**

```json
{
  "name": "LensCal",
  "short_name": "LensCal",
  "description": "Contact lens replacement tracker",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F6FAFE",
  "theme_color": "#101216",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- Export/resize existing icons from `assets/images/` into `public/icon-192.png` and `public/icon-512.png`.
- Reference the manifest in `app/layout.tsx` via the Next.js `metadata.manifest` field.

---

### Step 4 — Set up design system (palette + fonts)

Keep `constants/palette.ts` unchanged. Wire those values into Tailwind's theme config so every palette colour is available as a Tailwind utility class. Load Plus Jakarta Sans via `next/font/google` instead of bundled `.ttf` files.

**`tailwind.config.ts`:**

```ts
import { palette } from './constants/palette';

export default {
  theme: {
    extend: {
      colors: palette,
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
      },
    },
  },
};
```

**`app/layout.tsx`:**

```ts
import { Plus_Jakarta_Sans } from 'next/font/google';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800'],
});
```

- Delete `lib/app-fonts.ts` — font loading is handled by Next.js.
- Delete `components/app-text.tsx` — typography is now CSS classes.
- Delete `assets/fonts/*.ttf` — served by Google Fonts CDN.

---

### Step 5 — Rewrite Supabase client + add auth middleware

Replace `lib/supabase.ts` with two clients using `@supabase/ssr`. Add Next.js middleware to protect all routes.

**New files:**

- `lib/supabase/client.ts` — `createBrowserClient()` for Client Components.
- `lib/supabase/server.ts` — `createServerClient()` for Server Components and Route Handlers, reads cookies from the Next.js request.
- `middleware.ts` (project root) — refreshes the session cookie on every request; redirects to `/login` if there is no valid session. Exclude `/login` and `/auth/callback` from the matcher.
- `app/auth/callback/route.ts` — exchanges the Supabase PKCE `code` param for a session cookie, then redirects to `/`.

**Rename env vars in `.env.local`:**

```
EXPO_PUBLIC_SUPABASE_URL       →  NEXT_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY  →  NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

### Step 6 — Create the login page (`app/login/page.tsx`)

All routes except `/login` and `/auth/callback` are protected by middleware. The login page handles both sign-in and sign-up via a tab toggle.

- `'use client'` component.
- Email + password fields.
- Toggle between Sign In / Sign Up views.
- On success, Supabase fires the auth callback which sets the session cookie and redirects to `/`.
- Show inline error messages for invalid credentials or failed sign-up.
- Port the `signIn` / `signUp` logic from `LensProvider` directly into the page — no provider needed here.

---

### Step 7 — Rewrite the data layer (`lib/data.ts`)

Delete `lib/local-db.ts` and `lib/sync.ts`. All reads/writes go directly to the Supabase browser client. Create a thin wrapper at `lib/data.ts`.

| Old (`local-db`) | New (`lib/data.ts`) |
|---|---|
| `getActiveLenses()` | `supabase.from('lens_usages').select('*').eq('status', 'active').eq('user_id', uid)` |
| `getLensHistory()` | `supabase.from('lens_usages').select('*').eq('user_id', uid).order('opened_at', { ascending: false })` |
| `getEvents()` | `supabase.from('lens_events').select('*').eq('user_id', uid).order('event_at', { ascending: false })` |
| `openLens()` | `supabase.from('lens_usages').insert(row)` |
| `discardLens()` | `supabase.from('lens_usages').update({ status: 'discarded', updated_at: now }).eq('id', id)` |
| `insertEvent()` | `supabase.from('lens_events').insert(row)` |
| `getSettings()` / `updateSetting()` | `supabase.from('user_settings').upsert(row)` (new table — Step 8) |

**Type changes:**

- Remove `dirty` from `LensUsage` and `LensEvent` types — no longer needed.
- Remove `notification_id` from `LensUsage` — deferred to notifications step.
- `user_id` is always the authenticated user's UUID; always filter by it.
- Client-side ID generation pattern is unchanged.

---

### Step 8 — Add `user_settings` table to Supabase

Settings were stored in SQLite's `app_settings` key-value table. In the PWA they live in Supabase so they persist across devices.

Add to `supabase/schema.sql`:

```sql
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_lens_type text not null default 'monthly'
    check (default_lens_type in ('daily', 'weekly', 'monthly')),
  monthly_replacement_days integer not null default 28,
  notifications_enabled boolean not null default true,
  reminder_hour integer not null default 8,
  reminder_minute integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Users manage own settings"
  on public.user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Settings are upserted on first login (with defaults) and on every `updateSetting()` call.

---

### Step 9 — Adapt `LensProvider` for the web

Keep the `LensProvider` / `useLens()` pattern. Mark the provider `'use client'`. Remove every Expo/SQLite import and replace them with `lib/data.ts` calls.

| Remove from `LensProvider` | Replace with |
|---|---|
| All `local-db` imports | `lib/data.ts` functions |
| `cancelLensNotification`, `scheduleReplacementNotification` | No-op stubs (deferred) |
| `testDateOffsetDays`, `advanceTestDay`, `resetTestDate` | Remove — QA-only feature |
| `isSupabaseConfigured` guard | Remove — always configured |
| `syncNow()` | Remove — no dirty-flag sync |
| `syncMessage` | Remove |

The slimmed `LensContextValue` interface exposes: `eyes`, `history`, `events`, `settings`, `isReady`, `isBusy`, `currentDate`, `replaceLens`, `discardLens`, `markUncomfortable`, `updateSetting`, `signOut`.

---

### Step 10 — Build the root layout + navigation shell

**`app/layout.tsx` (root):**

- Attach the Plus Jakarta Sans CSS variable to `<html>`.
- Set `metadata.manifest = '/manifest.json'`.
- Add `<meta name="theme-color" content="#101216">`.
- Import `globals.css`.

**`app/(app)/layout.tsx` (authenticated shell):**

- `'use client'` component.
- Wraps `{children}` in `<LensProvider>`.
- Renders a fixed bottom nav with three tabs: **Today** (`/`), **History** (`/history`), **Settings** (`/settings`).
- Uses `usePathname()` to highlight the active tab.
- The nav replicates the dark pill look from `palette.black` using a `<nav>` element with Tailwind — no React Native imports.
- Page content area has `pb-24` to clear the nav.

Delete `components/floating-tab-bar.tsx` — the nav is inlined in the shell layout.

---

### Step 11 — Migrate shared components

Replace every React Native primitive with an HTML + CSS equivalent. Keep filenames and public props identical where possible.

| Old component | Replacement | Action |
|---|---|---|
| `components/app-text.tsx` | Standard `<p>`, `<h1>`, `<input>` with Tailwind font classes | **Delete** |
| `components/animated-pressable.tsx` | `<button>` with `active:scale-[0.985] transition-transform duration-100` | **Rewrite** |
| `components/action-button.tsx` | `<button>` with Tailwind classes matching `palette` colours | **Rewrite** |
| `components/segmented-control.tsx` | Styled radio-button group rendered as a pill toggle | **Rewrite** |
| `components/ui/primitives.tsx` (`Card`) | `<div>` with border, rounded corners, box-shadow via Tailwind | **Rewrite** |
| `components/ui/icon-symbol.tsx` | `lucide-react` icon components | **Rewrite** |
| `components/floating-tab-bar.tsx` | Inlined in `app/(app)/layout.tsx` | **Delete** |
| `lib/haptics.ts` | `navigator.vibrate(10)` shim, or remove | **Simplify** |
| `components/haptic-tab.tsx`, `hello-wave.tsx`, `parallax-scroll-view.tsx`, `external-link.tsx`, `themed-*.tsx` | Expo template leftovers | **Delete** |
| `hooks/use-color-scheme*.ts` | Remove (no dark mode switching needed yet) | **Delete** |

---

### Step 12 — Port the Today screen (`app/(app)/page.tsx`)

Direct port of `app/(tabs)/index.tsx`. Replace all React Native layout primitives with `<div>` + Tailwind flexbox. Business logic is unchanged.

- `'use client'` — consumes `useLens()`.
- "NEXT REPLACEMENT" summary card at the top showing the nearest `expires_at` date.
- Two `<LensCard>` components (left eye, right eye).
- `LensCard` rewritten as HTML/CSS (see Step 11). Progress bar, day counter, and status badge are all `<div>` elements.
- Card CTA navigates to `/replace-lens?eye=left` or `/replace-lens?eye=right` via `useRouter().push()`.

---

### Step 13 — Port the Replace Lens screen (`app/(app)/replace-lens/page.tsx`)

Previously a stack modal; on web it becomes a full page. The `?eye=` search param is read via Next.js `useSearchParams()`.

- `'use client'`; reads `searchParams.get('eye')`, falls back to `'left'`.
- Lens type: reuse `SegmentedControl` (rewritten in Step 11).
- Start date: `<input type="date">` replaces `@react-native-community/datetimepicker`. Default value is today. Formatted with `startOfLocalDay()` from `lib/date-utils.ts`.
- Expiry preview: same `expirationFor()` from `lib/date-utils.ts` — zero changes.
- Notes: `<textarea>`.
- Save button calls `replaceLens(eye, lensType, notes, startDate)` from `useLens()`, then `router.push('/')`.
- Back button at the top calls `router.back()`.

---

### Step 14 — Port the History screen (`app/(app)/history/page.tsx`)

Direct port of `app/(tabs)/history.tsx`.

- `'use client'`; reads `history` and `events` from `useLens()`.
- Each `UsageRow` is a `<div>` card with an inline event timeline.
- Status badge (ACTIVE / DISCARDED) uses Tailwind pill classes matching `palette.surfaceBlue` / `palette.faint`.
- Replace `IconSymbol name="eye.fill"` with `lucide-react` `<Eye />`.
- Event labels (`Opened`, `Marked uncomfortable`, `Discarded`, `Replaced`) are unchanged.

---

### Step 15 — Port the Settings screen (`app/(app)/settings/page.tsx`)

Port of `app/(tabs)/settings.tsx`. Most UI is straightforward.

- `'use client'`; reads `settings` and `updateSetting` from `useLens()`.
- Default lens type: reuse `SegmentedControl`.
- Monthly replacement days: `<input type="number">` with `+` / `−` buttons (replaces the native `Stepper`).
- Notifications toggle: `<input type="checkbox" role="switch">`. Mark reminder time fields as `disabled` when toggle is off. The toggle UI works; actual notification scheduling is deferred.
- Reminder hour/minute: two `<input type="number">` fields (0–23, 0–59).
- Sign Out button calls `signOut()` from `useLens()`, which redirects to `/login`.

---

### Step 16 — Notifications (deferred)

PWA push notifications require VAPID-based Web Push, a service worker `push` event handler, and a server-side sender.

**For now:** replace `lib/notifications.ts` with a stub that exports the same function signatures but does nothing. This keeps the build passing and lets the settings toggle render without errors.

```ts
// lib/notifications.ts (stub)
export async function ensureNotificationPermissions() { return false; }
export async function scheduleReplacementNotification() { return null; }
export async function cancelLensNotification() {}
```

**When implementing later:**

- Use the browser `PushManager` API to subscribe.
- Store the `PushSubscription` JSON in a new `push_subscriptions` Supabase table.
- A Next.js API route or Supabase Edge Function sends the push payload at `expires_at` time.
- The Workbox service worker (from `next-pwa`) handles the `push` event and shows the notification.

---

### Step 17 — Cleanup + update AGENTS.md

Once all screens are working:

- Delete all remaining Expo/RN files that were not already removed: `app.json`, `metro.config.js`, `scripts/reset-project.js`, `components/haptic-tab.tsx`, `components/hello-wave.tsx`, `components/parallax-scroll-view.tsx`, `components/external-link.tsx`, `components/themed-text.tsx`, `components/themed-view.tsx`, `hooks/use-color-scheme.ts`, `hooks/use-color-scheme.web.ts`, `hooks/use-theme-color.ts`.
- Delete `.lavish/pwa-migration-plan.html` (this artifact).
- Rewrite `AGENTS.md` to reflect the new Next.js stack, new folder structure, and removed dependencies.
- Run `npm run lint` and `npx tsc --noEmit` to catch any remaining type errors.

---

## Risks

### No data migration path
Existing users who tracked lenses in the Expo app's SQLite database will lose their local data. Users who did not sign into Supabase have no cloud copy. This is acceptable if the PWA is a fresh deployment.

### Offline support removed
The PWA requires a network connection for every read/write. The service worker will cache the app shell for offline loading, but lens data will not be available without internet.

### Supabase unique constraint
The `lens_usages` partial unique index in Supabase is scoped to `(user_id, eye) WHERE status = 'active'`. Confirm the deployed schema matches `supabase/schema.sql` before the first write — otherwise the one-active-lens-per-eye constraint won't hold.

### Date picker UX regression
`<input type="date">` behaviour varies significantly across browsers. If the default picker is unacceptable, add `react-day-picker` as a lightweight cross-browser alternative.

---

## Implementation Checklist

- [ ] Step 1 — Scaffold Next.js project
- [ ] Step 2 — Strip Expo/RN deps, add web deps
- [ ] Step 3 — PWA manifest + service worker
- [ ] Step 4 — Design system (palette + fonts)
- [ ] Step 5 — Supabase client + middleware
- [ ] Step 6 — Login page
- [ ] Step 7 — Rewrite data layer (`lib/data.ts`)
- [ ] Step 8 — `user_settings` Supabase table
- [ ] Step 9 — Adapt `LensProvider`
- [ ] Step 10 — Root layout + navigation shell
- [ ] Step 11 — Migrate shared components
- [ ] Step 12 — Today screen
- [ ] Step 13 — Replace Lens screen
- [ ] Step 14 — History screen
- [ ] Step 15 — Settings screen
- [ ] Step 16 — Notifications stub (+ full implementation later)
- [ ] Step 17 — Cleanup + update `AGENTS.md`
