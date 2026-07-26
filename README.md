# LensCal

LensCal is a Next.js PWA for tracking soft contact lens usage separately for the left and right eye.

## Features

- Supabase Auth login
- Google OAuth login
- Supabase-backed lens history and settings
- Independent left and right lens status
- Day count and replacement progress
- Replace, discard, and discomfort events per eye
- Installable PWA shell
- Background Web Push replacement reminders

## Run Locally

```bash
npm install
npm run dev
```

Open the printed local Next.js URL in your browser.

## Supabase Setup

Supabase is required. The Next.js proxy redirects every app route to `/login` until a Supabase session exists.

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local`.
4. Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
5. For background reminders, also fill in `SUPABASE_SECRET_KEY` (or the legacy `SUPABASE_SERVICE_ROLE_KEY`), `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and `PUSH_CRON_SECRET`.
6. Restart the Next.js dev server after editing `.env.local`.

## Web Push Setup

LensCal uses Web Push exclusively for reminders. There is no browser timer fallback. The browser saves a Push subscription in Supabase, and the protected server job sends due reminders through the browser vendor's Push service.

Generate one VAPID key pair and keep it stable:

```bash
npx web-push generate-vapid-keys
```

- Put the public key in `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- Put the private key in `VAPID_PRIVATE_KEY`.
- Set `VAPID_SUBJECT` to a contact such as `mailto:admin@example.com`.
- Generate a separate random `PUSH_CRON_SECRET`; do not reuse a VAPID or Supabase key.
- Keep the Supabase secret key, VAPID private key, and cron secret only in the Next.js Docker container environment.

The sender uses `TTL: 86400`, so a Push service may queue a reminder for an offline device for up to 24 hours. Web Push remains best-effort and may expire or be retained for less time by the Push provider.

## Tencent Docker and Cron

The Next.js container needs all variables from `.env.example`. Set `TZ=Asia/Jakarta` in the container while LensCal has no per-user timezone setting; reminder hours are calculated in the Node.js process timezone.

The host cron needs only `PUSH_CRON_SECRET`. Store it in a root-owned environment file or script rather than committing it or placing elevated Supabase/VAPID keys in cron.

After deploying the schema and restarting the container, manually verify the protected route:

```bash
curl -i -X POST https://YOUR_DOMAIN/api/push/send-due-reminders \
  -H "Authorization: Bearer YOUR_PUSH_CRON_SECRET"
```

Then call it every five minutes:

```bash
*/5 * * * * /usr/bin/curl -fsS -X POST https://YOUR_DOMAIN/api/push/send-due-reminders -H "Authorization: Bearer YOUR_PUSH_CRON_SECRET" >> /var/log/lenscal-push.log 2>&1
```

The cron endpoint bypasses browser-session redirects but performs its own bearer-secret authentication. It processes due reminders for all users through a server-only Supabase admin client. The cron host must never receive the Supabase secret key or VAPID private key.

### Google login

In Supabase, open **Authentication > Providers > Google**, enable the provider,
and add the Google OAuth client ID and secret from Google Cloud. In Google
Cloud, add Supabase's provider callback URL as an authorized redirect URI:

- `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

Then add these application callback URLs under **Authentication > URL
Configuration > Redirect URLs** in Supabase:

- `http://localhost:3000/auth/callback` for local development
- `https://YOUR_DOMAIN/auth/callback` for production

The login button uses Supabase's hosted OAuth redirect, so it works in desktop
browsers and on iOS Safari when the PWA is installed.
## Self-Hosted Deploy Notes

Set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` to a stable base64-encoded 32-byte value in production. Next.js uses it to encrypt Server Action references; changing it on every Docker rebuild can make clients with an older page send action requests that the new deployment cannot resolve.

Generate one once:

```bash
openssl rand -base64 32
```

For Docker builds, pass the same value as both a build argument and runtime environment variable.

## Notes

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported for older Supabase projects that still show an anon key label. The old Expo variable names are not read by the PWA.
