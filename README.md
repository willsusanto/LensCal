# LensCal

An installable contact lens replacement tracker that keeps the schedule for each eye clear and sends reminders when it is time for a new pair.

I built LensCal because I wanted a simple way to remember when I opened my contact lenses—especially when the left and right lenses were replaced on different days. It keeps an independent timeline for each eye, records replacement history and discomfort events, and sends configurable background reminders even when the app is closed.

It runs as a Next.js PWA, so it can be installed from a supported browser without needing a separate native app.

## Features

- Track daily, weekly, or monthly lenses independently for each eye
- See lens age, replacement progress, and the next replacement date at a glance
- Replace or discard a lens without affecting the other eye
- Record discomfort events and optional notes
- Review lens usage and event history
- Correct opening dates and terminal events when a past entry is inaccurate
- Configure up to three replacement reminders at different times
- Receive background Web Push notifications when the app is closed
- Install the PWA on supported desktop and mobile browsers
- Sign in with email and password or Google OAuth

## How Reminders Work

LensCal uses Web Push rather than an in-page timer, which means reminders can arrive after the app has been closed:

1. The user enables notifications and the browser creates a Push subscription.
2. LensCal saves that subscription to the user's Supabase account.
3. A scheduled job checks every five minutes for lenses that are due for a reminder.
4. The server sends the reminder through the browser's Push service.
5. LensCal's service worker receives it and displays the notification.

Each reminder is claimed before it is sent so that overlapping checks do not produce duplicate notifications. Invalid browser subscriptions are automatically disabled when a Push service reports that they have expired.

Supabase is the source of truth. LensCal does not use a local database, guest mode, or timer-based notification fallback.

## Tech Stack

| Area | Technology |
| --- | --- |
| Application | Next.js 16 App Router, React 19, TypeScript |
| Styling | Tailwind CSS, Lucide icons |
| Authentication | Supabase Auth, Google OAuth |
| Data | Supabase PostgreSQL, Row Level Security |
| PWA | `@ducanh2912/next-pwa`, Workbox |
| Notifications | Web Push, VAPID, custom service worker |
| Deployment | Docker, GitHub Actions, self-hosted VPS |

## Roadmap

- Calendar view for browsing lens activity and replacement dates over time
- Per-user time zones for reminder scheduling
- Expanded automated coverage for date calculations and reminder delivery rules

## Run Locally

### Prerequisites

- Node.js 20 or newer
- A Supabase project

### Installation

```bash
git clone https://github.com/willsusanto/LensCal.git
cd LensCal
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL printed by Next.js.

On Windows PowerShell, copy the environment file with:

```powershell
Copy-Item .env.example .env.local
```

## Supabase Setup

Supabase is required. Unauthenticated visitors are redirected to `/login`.

1. Create a Supabase project.
2. For a new project, run `supabase/schema.sql` in the Supabase SQL Editor.
3. For an existing hosted project, apply pending files from `supabase/migrations/` in filename order.
4. Add your Supabase URL and publishable key to `.env.local`.
5. Configure Google OAuth in Supabase if you want to use Google sign-in.
6. Restart the development server after changing environment variables.

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is supported as a fallback for older Supabase projects that still use the anon-key label.

### Google OAuth

In Supabase, open **Authentication > Providers > Google**, enable the provider, and add the client ID and secret from Google Cloud.

Add Supabase's provider callback URL as an authorized redirect URI in Google Cloud:

```text
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

Then add the application callback URLs under **Authentication > URL Configuration > Redirect URLs** in Supabase:

```text
http://localhost:3000/auth/callback
https://YOUR_DOMAIN/auth/callback
```

The app uses Supabase's hosted OAuth redirect, so the same flow works in desktop browsers, mobile Safari, and an installed PWA.

## Web Push Setup

LensCal uses Web Push for background reminders. There is no browser timer fallback: the browser stores a Push subscription in Supabase, and a protected server job sends reminders through the browser vendor's Push service.

Generate one VAPID key pair and keep it stable:

```bash
npx web-push generate-vapid-keys
```

Configure:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` with the public key
- `VAPID_PRIVATE_KEY` with the private key
- `VAPID_SUBJECT` with a contact such as `mailto:admin@example.com`
- `PUSH_CRON_SECRET` with a separate, randomly generated secret
- `SUPABASE_SECRET_KEY`, or the legacy `SUPABASE_SERVICE_ROLE_KEY`, for the server-side reminder sender

Never expose the Supabase secret key, VAPID private key, or cron secret through a `NEXT_PUBLIC_*` variable.

The sender requests a 24-hour time-to-live. Web Push remains best-effort: an offline device may receive a queued reminder later, or the Push provider may expire it sooner.

## Self-Hosted Deployment

The Next.js container needs the variables documented in `.env.example`. Public variables are embedded during `next build`, so they must be available at build time as well as runtime.

Set `TZ=Asia/Jakarta` while LensCal has no per-user time-zone setting. Reminder hours are currently calculated in the Node.js process time zone.

Set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` to a stable, base64-encoded 32-byte value:

```bash
openssl rand -base64 32
```

Pass the same value as a Docker build argument and a runtime environment variable. Changing it between builds can cause clients with an older or PWA-cached page to submit Server Action references that the new deployment cannot resolve.

### Reminder Cron

The cron host needs only `PUSH_CRON_SECRET`. Keep the Supabase administrator credential and VAPID private key inside the Next.js container.

Verify the protected route manually:

```bash
curl -i -X POST https://YOUR_DOMAIN/api/push/send-due-reminders \
  -H "Authorization: Bearer YOUR_PUSH_CRON_SECRET"
```

Then invoke it every five minutes:

```cron
*/5 * * * * /usr/bin/curl -fsS -X POST https://YOUR_DOMAIN/api/push/send-due-reminders -H "Authorization: Bearer YOUR_PUSH_CRON_SECRET" >> /var/log/lenscal-push.log 2>&1
```

The endpoint bypasses browser-session redirects and performs its own bearer-secret authentication before creating the Supabase administrator client. It never returns user reminder data.

Database migrations are not run by the Docker deployment. Apply pending migrations before deploying application code that depends on them.

## Verification

```bash
npm run lint
npx tsc --noEmit
npm run build
npm audit
```

## Current Trade-offs

- Reminder times use the server's configured time zone rather than a time zone stored per user.
- Web Push depends on HTTPS, browser support, notification permission, stable VAPID keys, and a regularly running external cron.
- Background delivery is best-effort and ultimately depends on the browser vendor's Push service.
- The application requires an account and network access; it does not provide guest or offline-first data storage.
