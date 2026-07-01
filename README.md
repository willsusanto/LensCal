# LensCal

LensCal is a Next.js PWA for tracking soft contact lens usage separately for the left and right eye.

## Features

- Supabase Auth login
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
5. For background reminders, also fill in `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and `PUSH_CRON_SECRET`.
6. Restart the Next.js dev server after editing `.env.local`.

## Web Push Cron

Generate VAPID keys once and store them in your environment. The private key and Supabase service-role key must only exist on the server.

On the Tencent Cloud VPS that hosts the app, call the protected sender route every 5 minutes:

```bash
*/5 * * * * curl -fsS -X POST https://YOUR_DOMAIN/api/push/send-due-reminders -H "Authorization: Bearer YOUR_PUSH_CRON_SECRET" >/dev/null
```

## Notes

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported for older Supabase projects that still show an anon key label. The old Expo variable names are not read by the PWA.
