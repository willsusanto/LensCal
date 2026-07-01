# LensCal - Agent Context

## What This App Does

LensCal is a contact lens replacement tracker. Users log when they open a new lens pack for each eye, and the app tracks replacement dates by lens type: daily, weekly, or monthly. Login via Supabase Auth is required. There is no guest mode, SQLite store, offline-first sync, or React Native/Expo runtime.

The app is now a Next.js PWA. It has install metadata, Workbox service-worker generation through `@ducanh2912/next-pwa`, browser notification permission/test controls, and in-session reminder scheduling. True background Web Push with a server-side push sender is not implemented yet.

---

## Tech Stack

| Layer | Library / Version |
|---|---|
| Framework | Next.js `^16.2.9` App Router, Turbopack dev, webpack production build |
| Runtime | Node `>=20.0.0` |
| Language | TypeScript `~5.9.2`, strict, path alias `@/*` to project root |
| Styling | Tailwind CSS v3, colours from `constants/palette.ts` |
| Font | Plus Jakarta Sans via `next/font/google` (`--font-jakarta`) |
| Auth + DB | `@supabase/supabase-js` `^2.108.2` + `@supabase/ssr` `^0.6.1` |
| Icons | `lucide-react` |
| PWA | `@ducanh2912/next-pwa` with generated Workbox files ignored in git |
| State | React Context only: `LensProvider` |

---

## Project Structure

```text
app/
  layout.tsx              Root layout: font, metadata, manifest/icons, theme color
  globals.css             Tailwind directives + body baseline
  (app)/
    layout.tsx            Authenticated shell: LensProvider + BottomNav
    page.tsx              Today screen: next replacement + per-eye LensCard
    history/page.tsx      Lens usage history and event timeline
    settings/page.tsx     User settings, PWA install, notification testing, sign out
    replace-lens/page.tsx Open/change a lens; eye comes from ?eye=left|right
  login/page.tsx          Email/password sign-in + sign-up
  auth/callback/route.ts  Supabase PKCE code exchange, safe redirect

components/
  bottom-nav.tsx
  lens-card.tsx
  page-header.tsx
  segmented-control.tsx
  ui/
    badge.tsx
    button.tsx
    card.tsx
    icon-symbol.tsx       Thin lucide icon compatibility wrapper
    input.tsx
    label.tsx
    switch.tsx
    textarea.tsx

constants/
  lens.ts                 Lens options, default settings, validation limits
  palette.ts              Design tokens imported by Tailwind

lib/
  data.ts                 All Supabase table access and validation
  date-utils.ts           Date arithmetic and formatters
  navigation.ts           Safe same-origin redirect path helper
  notifications.ts        Browser notification permission/test/reminder helpers
  supabase/
    client.ts             createBrowserClient() for Client Components
    server.ts             createServerClient() for Server Components/Route Handlers
    env.ts                Supabase env validation
  utils.ts                cn() helper

providers/
  lens-provider.tsx       Global LensContext / useLens() hook

public/
  manifest.json
  favicon.png
  icon-192.png
  icon-512.png

proxy.ts                  Next.js 16 proxy: session refresh and auth redirects
supabase/schema.sql       Postgres schema, constraints, indexes, RLS policies
types/lens.ts             Domain types
```

Generated PWA files such as `public/sw.js`, `public/workbox-*.js`, and `public/swe-worker-*.js` are build artifacts and must stay ignored.

---

## Domain Model

Defined in `types/lens.ts`:

```ts
Eye           = 'left' | 'right'
LensType      = 'daily' | 'weekly' | 'monthly'
LensStatus    = 'active' | 'discarded'
LensEventType = 'opened' | 'uncomfortable' | 'discarded' | 'replaced'

LensUsage     = id, user_id, eye, opened_at, expires_at, lens_type,
                status, notes, created_at, updated_at
LensEvent     = id, user_id, lens_usage_id, event_type, event_at,
                notes, created_at
AppSettings   = defaultLensType, monthlyReplacementDays,
                notificationsEnabled, notificationReminders
NotificationReminder = daysBefore, hour, minute
EyeState      = { eye, activeLens, latestUncomfortableEvent }
```

Important constraints:

- Only one active lens per user and eye. Enforced by Supabase partial unique index.
- Client-generated ids use Web Crypto in `lib/data.ts`.
- `dirty`, `notification_id`, SQLite, and sync flags are gone.
- Notes are capped at `MAX_NOTE_LENGTH` from `constants/lens.ts`.
- Monthly replacement days and reminder time bounds live in `SETTINGS_LIMITS`.
- Notification reminders are deduplicated by `daysBefore` + `hour` + `minute` and capped at `MAX_NOTIFICATION_REMINDERS` (currently 3).

---

## State Management

All mutable app state flows through `LensProvider` in `providers/lens-provider.tsx`. Consume it with `useLens()`. Do not add Redux, Zustand, local-first stores, or a second context for the same domain.

Context shape:

```ts
{
  isReady: boolean;
  isBusy: boolean;
  settings: AppSettings;
  eyes: Record<Eye, EyeState>;
  history: LensUsage[];
  events: LensEvent[];
  refresh(): Promise<void>;
  replaceLens(eye, lensType, notes?, openedAt?): Promise<void>;
  discardLens(eye): Promise<void>;
  markUncomfortable(eye, notes?): Promise<void>;
  updateSetting(key, value): Promise<void>;
  signOut(): Promise<void>;
}
```

Login and sign-up live directly in `app/login/page.tsx`, because that page is outside the authenticated `LensProvider` shell.

---

## Data Layer

`lib/data.ts` is the only place that talks to Supabase tables. Components and providers must not call `.from(...)` directly.

Every read/update is explicitly scoped by `user_id` in addition to RLS:

| Function | Purpose |
|---|---|
| `getActiveLenses(supabase, userId)` | Active lenses for current user |
| `getLensHistory(supabase, userId)` | Usage history, newest first |
| `getEvents(supabase, userId)` | Event history, newest first |
| `openLens(supabase, input)` | Insert one `lens_usages` row |
| `discardActiveLens(supabase, userId, id)` | Mark an active lens discarded |
| `insertEvent(supabase, input)` | Insert one `lens_events` row |
| `getSettings(supabase, userId)` | Read or create default `user_settings` |
| `updateSetting(supabase, userId, key, value)` | Validate and upsert one setting |

RLS in `supabase/schema.sql` also verifies that inserted/updated events reference a lens usage owned by the same authenticated user.

---

## Auth + Routing

- `proxy.ts` refreshes Supabase session cookies on each matched request.
- Unauthenticated app routes redirect to `/login?next=<safe path>`.
- `lib/navigation.ts` sanitizes redirect targets. Only same-origin relative paths are allowed.
- Authenticated users visiting `/login` are redirected to `/`.
- `/login`, `/auth/*`, Next internals, and public files with extensions are excluded from auth redirects.
- `app/auth/callback/route.ts` exchanges the Supabase PKCE `code` for a session and redirects to a sanitized `next` path.

Supabase client usage:

- Client Components: `createClient()` from `lib/supabase/client.ts`
- Server Components / Route Handlers: `createClient()` from `lib/supabase/server.ts`
- Environment validation: `lib/supabase/env.ts`

---

## PWA + Notifications

- `public/manifest.json` declares app identity and icons.
- `app/layout.tsx` declares manifest and icon metadata.
- `@ducanh2912/next-pwa` writes generated service-worker files to `public/` during production builds.
- Service worker is disabled in development.
- Settings includes a PWA install card using the `beforeinstallprompt` event where browsers support it.
- `lib/notifications.ts` handles:
  - browser support/permission state
  - requesting permission
  - sending a test notification
  - scheduling up to 3 local in-session reminders for active lenses
  - cancelling timers and visible notifications by lens id

Limitations:

- This is browser-local notification support, not full Web Push.
- Full background push when the app is closed requires push subscriptions, VAPID keys, a push sender, and likely an additional Supabase table.

---

## Security Defaults

- `next.config.ts` sets security headers including CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Cross-Origin-Opener-Policy`.
- Supabase URL must be HTTPS in production. Localhost HTTP is allowed for development.
- `package.json` uses npm `overrides` for patched transitive dependencies used by Next/PWA tooling.
- Run `npm audit` before shipping dependency changes.

---

## UI Conventions

- Use Tailwind for layout and spacing.
- Use `palette` from `@/constants/palette` for design tokens and Tailwind theme values.
- Use `LENS_TYPE_OPTIONS`, `DEFAULT_SETTINGS`, `SETTINGS_LIMITS`, and `MAX_NOTE_LENGTH` from `@/constants/lens` instead of duplicating domain constants.
- Use `lucide-react` icons directly or through `IconSymbol` when keeping compatibility with existing icon names.
- Use `Card` from `@/components/ui/card`.
- Use `Button`, `Input`, `Textarea`, `Label`, `Switch`, and `Badge` from `components/ui`.
- Standard horizontal page padding is 16px; page content uses `pb-28` to clear the mobile bottom nav.
- Cards use 8px radius (`rounded-lg`).

---

## Environment Variables

| Variable | Required | Purpose |
|---|---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase publishable key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | fallback | Supported for older Supabase projects |

Do not use `EXPO_PUBLIC_*` variables. Do not add service-role keys to client-visible env vars.

---

## Development Commands

```bash
npm run dev      # Next dev server with Turbopack
npm run build    # Production build with webpack; also generates PWA worker files
npm run start    # Serve production build
npm run lint     # ESLint
npx tsc --noEmit # TypeScript check
npm audit        # Dependency advisory check
```

The local `npm` shim may be broken on some machines. If so, use `D:\Programs\node\npm.cmd`.

---

## Key Constraints For Agents

1. This is a Next.js 16 PWA only. Do not add Expo, React Native, SQLite, or native mobile packages.
2. Supabase is the only data source. No local-first sync, dirty flags, or offline database.
3. Login is required. Do not add guest mode.
4. All LensCal app state goes through `LensProvider`.
5. All Supabase table access goes through `lib/data.ts`.
6. Keep reads and writes scoped by authenticated `user_id`.
7. Never allow two active lenses for the same user and eye. Discard the current active lens before opening a replacement.
8. Apply `supabase/schema.sql` or equivalent migrations when schema/RLS changes are made.
9. Generated PWA worker files in `public/` are ignored build artifacts.
10. Keep `AGENTS.md` current when architecture, commands, routes, or constraints change.
