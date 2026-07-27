# LensCal - Agent Context

## What This App Does

LensCal is a contact lens replacement tracker. Users log when they open a new lens pack for each eye, and the app tracks replacement dates by lens type: daily, weekly, or monthly. Login via Supabase Auth is required. There is no guest mode, SQLite store, offline-first sync, or React Native/Expo runtime.

The app is now a Next.js PWA. It has install metadata, Workbox service-worker generation through `@ducanh2912/next-pwa`, browser notification permission/subscription controls, and background Web Push reminders. There is no timer-based or local notification delivery path. A Tencent Cloud VPS cron calls a protected Next.js API route, which uses Supabase as the source of truth and sends Push notifications with VAPID keys.

---

## Tech Stack

| Layer     | Library / Version                                                     |
| --------- | --------------------------------------------------------------------- |
| Framework | Next.js `^16.2.9` App Router, Turbopack dev, webpack production build |
| Runtime   | Node `>=20.0.0`                                                       |
| Language  | TypeScript `~5.9.2`, strict, path alias `@/*` to project root         |
| Styling   | Tailwind CSS v3, colours from `constants/palette.ts`                  |
| Font      | Plus Jakarta Sans via `next/font/google` (`--font-jakarta`)           |
| Auth + DB | `@supabase/supabase-js` `^2.108.2` + `@supabase/ssr` `^0.6.1`         |
| Icons     | `lucide-react`                                                        |
| PWA       | `@ducanh2912/next-pwa` with generated Workbox files ignored in git    |
| Web Push  | `web-push` with VAPID keys and a protected cron route                 |
| State     | React Context only: `LensProvider`                                    |

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
    settings/page.tsx     User settings, PWA install, Push controls, sign out
    replace-lens/page.tsx Open/change a lens; eye comes from ?eye=left|right
  login/page.tsx          Email/password sign-in/sign-up + Google OAuth
  auth/callback/route.ts  Supabase PKCE/OAuth code exchange, safe redirect
  api/health/route.ts     Public no-store health/debug endpoint
  api/push/send-due-reminders/route.ts Protected server-side Web Push sender
  api/push/test/route.ts  Authenticated current-user Web Push test sender

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
  notifications.ts        Browser permission and Push subscription helpers
  web-push.ts             Server-only VAPID configuration and Web Push sends
  supabase/
    admin.ts              Server-only Supabase secret/service-role client
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
supabase/schema.sql       Complete idempotent schema for new projects
supabase/migrations/      Idempotent SQL migrations for an existing hosted Supabase database
types/lens.ts             Domain and Push subscription types
worker/index.js           Custom next-pwa worker code for push/click handling
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
PushSubscriptionInput = endpoint, p256dh, auth, userAgent?
EyeState      = { eye, activeLens, latestUncomfortableEvent }
```

Important constraints:

- Only one active lens per user and eye. Enforced by Supabase partial unique index.
- Client-generated ids use Web Crypto in `lib/data.ts`.
- `dirty`, `notification_id`, SQLite, and sync flags are gone.
- Notes are capped at `MAX_NOTE_LENGTH` from `constants/lens.ts`.
- Monthly replacement days and reminder time bounds live in `SETTINGS_LIMITS`.
- Notification reminders are deduplicated by `daysBefore` + `hour` + `minute` and capped at `MAX_NOTIFICATION_REMINDERS` (currently 3).
- `push_subscriptions.endpoint` is globally unique, and every subscription row belongs to one authenticated user.
- `push_reminder_deliveries` uses `processing`, `sent`, and `failed` states with atomic claims so overlapping cron runs do not double-send.

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
  updateUsageDates(usageId, openedAt, terminalEvent?): Promise<void>;
  savePushSubscription(subscription): Promise<void>;
  revokePushSubscription(endpoint): Promise<void>;
  updateSetting(key, value): Promise<void>;
  signOut(): Promise<void>;
}
```

Login and sign-up live directly in `app/login/page.tsx`, because that page is outside the authenticated `LensProvider` shell.

---

## Data Layer

`lib/data.ts` is the only place that talks to Supabase tables. Components, providers, and route handlers must not call `.from(...)` directly.

User-session reads and writes are explicitly scoped by `user_id` in addition to RLS:

| Function                                             | Purpose                                                    |
| ---------------------------------------------------- | ---------------------------------------------------------- |
| `getActiveLenses(supabase, userId)`                  | Active lenses for current user                             |
| `getLensHistory(supabase, userId)`                   | Usage history, newest first                                |
| `getEvents(supabase, userId)`                        | Event history, newest first                                |
| `openLens(supabase, input)`                          | Insert one `lens_usages` row                               |
| `discardActiveLens(supabase, userId, id)`            | Mark an active lens discarded                              |
| `insertEvent(supabase, input)`                       | Insert one `lens_events` row                               |
| `getSettings(supabase, userId)`                      | Read or create default `user_settings`                     |
| `updateSetting(supabase, userId, key, value)`        | Validate and upsert one setting                            |
| `upsertPushSubscription(supabase, userId, input)`    | Save/refresh one browser Push subscription                 |
| `revokePushSubscription(supabase, userId, endpoint)` | Mark one browser Push subscription revoked                 |
| `getPushReminderSourceData(supabase)`                | Read all active reminder sources for the admin cron sender |
| `claimPushReminderDelivery(supabase, input)`         | Atomically claim one reminder/subscription delivery        |
| `completePushReminderDelivery(supabase, id, result)` | Mark a claimed delivery sent or failed                     |
| `recordPushSubscriptionSuccess/Failure(...)`         | Maintain subscription health and revocation state          |

The all-users cron sender is the intentional exception to user filtering. It authenticates with `PUSH_CRON_SECRET`, uses the server-only admin client, and loads only the fields needed to calculate and send reminders. It must never expose those rows in its response.

RLS in `supabase/schema.sql` also verifies that inserted/updated events reference a lens usage owned by the same authenticated user.

---

## Auth + Routing

- `proxy.ts` refreshes Supabase session cookies on each matched request.
- Unauthenticated app routes redirect to `/login?next=<safe path>`.
- `lib/navigation.ts` sanitizes redirect targets. Only same-origin relative paths are allowed.
- Authenticated users visiting `/login` are redirected to `/`.
- `/login`, `/auth/*`, Next internals, and public files with extensions are excluded from auth redirects.
- `/api/health` bypasses Supabase session refresh and returns no-store runtime/debug status for deployment checks.
- `/api/push/send-due-reminders` bypasses the browser-session redirect and performs its own `PUSH_CRON_SECRET` authentication.
- `/api/push/test` remains Supabase-session authenticated and sends only to the current user's active subscriptions.
- `app/auth/callback/route.ts` exchanges the Supabase PKCE/OAuth `code` for a session and redirects to a sanitized `next` path.

Supabase client usage:

- Client Components: `createClient()` from `lib/supabase/client.ts`
- Server Components / Route Handlers with user cookies: `createClient()` from `lib/supabase/server.ts`
- Server-only cron/admin routes: `createAdminClient()` from `lib/supabase/admin.ts`
- Environment validation: `lib/supabase/env.ts`

---

## PWA + Web Push

- `public/manifest.json` declares app identity and icons.
- `app/layout.tsx` declares manifest and icon metadata.
- `@ducanh2912/next-pwa` writes generated service-worker files to `public/` during production builds.
- Service worker is disabled in development.
- `worker/index.js` is imported into the generated service worker and handles `push` plus `notificationclick` events.
- Settings includes a PWA install card using the `beforeinstallprompt` event where browsers support it.
- `lib/notifications.ts` handles:
  - browser support/permission state
  - requesting permission
  - Push subscription and unsubscribe flow using `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `app/api/push/test/route.ts` sends a real Web Push test to the authenticated user's active subscriptions.
- `app/api/push/send-due-reminders/route.ts` handles:
  - `POST` requests with `Authorization: Bearer ${PUSH_CRON_SECRET}`
  - constant-time bearer-secret comparison before admin client creation
  - all-user active lens/reminder lookup through the Supabase secret/service-role client
  - Web Push sends through `web-push`
  - per-subscription atomic delivery claims, failed retries, and stale claim recovery through `push_reminder_deliveries`
  - stale subscription revocation on 404/410 Web Push failures

### Push Delivery Architecture

```mermaid
sequenceDiagram
    participant Browser as Browser and service worker
    participant Vendor as Browser vendor Push service
    participant App as LensCal browser app
    participant DB as Supabase
    participant Cron as VPS cron
    participant API as Next.js reminder route

    Browser->>Vendor: Create Push subscription with LensCal VAPID public key
    Vendor-->>Browser: Subscription endpoint, p256dh public key, auth secret
    Browser->>App: Return subscription details after permission is granted
    App->>DB: Save endpoint, p256dh, auth, and authenticated user_id

    Cron->>API: POST with PUSH_CRON_SECRET every five minutes
    API->>DB: Load due lenses, settings, and active subscriptions per user
    API->>API: Claim each delivery and encrypt payload for each subscription
    API->>Vendor: HTTPS Web Push request to that subscription endpoint
    Vendor->>Browser: Deliver message and wake service worker
    Browser->>Browser: Handle push event and show notification
```

Push subscription and sender credentials have distinct roles:

- `endpoint`: a browser-vendor URL that identifies one browser profile and subscription; it is the destination for the encrypted Web Push request.
- `p256dh`: a per-subscription browser public encryption key. The server uses it to encrypt a payload that only that browser subscription can decrypt.
- `auth`: a per-subscription encryption secret used with `p256dh`; it is not a public key. LensCal stores it with the subscription to encrypt outgoing payloads.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: LensCal's public sender identity. The browser uses it when creating a subscription and the server uses the matching key pair when sending.
- `VAPID_PRIVATE_KEY`: LensCal's server-only private sender key. `web-push` uses it to sign/authenticate requests to the vendor Push service; never expose it to the browser.
- `PUSH_CRON_SECRET`: a shared secret between the external cron and the protected reminder route. It authorizes cron invocations; it is unrelated to Web Push payload encryption.

One user can have multiple active subscription rows, for example a Chrome laptop browser and an installed Safari iPhone web app. The sender encrypts and sends the reminder once per active subscription. A `404` or `410` response marks only the invalid subscription inactive.

Limitations:

- Background reminders depend on HTTPS, browser Push support, configured VAPID keys, and the external VPS cron running regularly.
- Web Push is best-effort. The sender currently requests a 24-hour TTL, after which an offline device may not receive the reminder.
- Reminder times are computed by the server route from `expires_at` plus saved reminder hour/minute. Keep the Next.js Docker container timezone aligned with the app's expected user timezone unless a future per-user timezone setting is added.

---

## Supabase Migrations

- `supabase/schema.sql` is the complete idempotent schema for a new project.
- `supabase/migrations/20260726_web_push.sql` upgrades the existing hosted project without deleting lens, event, or settings data.
- Apply pending migration files before deploying application code that depends on them. The Docker deployment does not run Supabase migrations.
- If the hosted project is not linked to the Supabase CLI migration history, run the migration in the Supabase SQL Editor and record that it has been applied operationally.

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

| Variable                               |    Required | Purpose                                                                            |
| -------------------------------------- | ----------: | ---------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             |         yes | Supabase project URL                                                               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |         yes | Supabase publishable key                                                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        |    fallback | Supported for older Supabase projects                                              |
| `SUPABASE_SECRET_KEY`                  | server push | Preferred current Supabase secret key for the protected reminder sender route      |
| `SUPABASE_SERVICE_ROLE_KEY`            |    fallback | Legacy service-role key when `SUPABASE_SECRET_KEY` is unavailable                  |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`         |        push | Browser-visible VAPID public key for Push subscriptions                            |
| `VAPID_PRIVATE_KEY`                    | server push | Server-only VAPID private key used by `web-push`                                   |
| `VAPID_SUBJECT`                        | server push | VAPID subject, usually `mailto:...` or an HTTPS contact URL                        |
| `PUSH_CRON_SECRET`                     | server push | Bearer token required by `/api/push/send-due-reminders`                            |
| `TZ`                                   | server push | Node.js container timezone used to calculate reminder hours; currently Jakarta     |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`   |  production | Stable 32-byte base64 key used across Docker builds and runtime container restarts |

Do not use `EXPO_PUBLIC_*` variables. Do not add Supabase secret/service-role keys or VAPID private keys to client-visible env vars. The host cron receives only `PUSH_CRON_SECRET`; elevated Supabase and VAPID private keys stay inside the Next.js container.

`NEXT_PUBLIC_*` variables are embedded during `next build`, so the Supabase public values and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` must be present at build time. Keep the VAPID key pair stable; changing it invalidates existing browser subscriptions.

For self-hosted Docker deployments, pass `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` as both a build arg and runtime environment variable. If it changes between builds, clients with older pages or PWA-cached payloads can trigger `Failed to find Server Action` errors after deployment.

The Tencent host cron should run every five minutes and call:

```text
POST https://YOUR_DOMAIN/api/push/send-due-reminders
Authorization: Bearer YOUR_PUSH_CRON_SECRET
```

Deployment verification order:

1. Apply the hosted Supabase migration.
2. Deploy the container with all public and server-only variables.
3. Confirm `/api/health` returns `200`.
4. Confirm a missing or incorrect cron secret returns `401`, not a login redirect.
5. Enable reminders in a signed-in browser and verify a `push_subscriptions` row exists.
6. Send a test Push from Settings.
7. Invoke the cron route with the correct secret, then enable the recurring cron job.

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
6. Keep user-session reads and writes scoped by authenticated `user_id`; the protected admin cron is the intentional all-users exception.
7. Never allow two active lenses for the same user and eye. Discard the current active lens before opening a replacement.
8. Apply `supabase/schema.sql` for a new project or the appropriate migration for an existing hosted project when schema/RLS changes are made.
9. Generated PWA worker files in `public/` are ignored build artifacts.
10. Keep `AGENTS.md` current when architecture, commands, routes, or constraints change.
