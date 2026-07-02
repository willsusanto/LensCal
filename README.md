# LensCal

LensCal is a Next.js PWA for tracking soft contact lens usage separately for the left and right eye.

## Features

- Supabase Auth login
- Supabase-backed lens history and settings
- Independent left and right lens status
- Day count and replacement progress
- Replace, discard, and discomfort events per eye
- Installable PWA shell

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
5. Restart the Next.js dev server after editing `.env.local`.

## Self-Hosted Deploy Notes

Set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` to a stable base64-encoded 32-byte value in production. Next.js uses it to encrypt Server Action references; changing it on every Docker rebuild can make clients with an older page send action requests that the new deployment cannot resolve.

Generate one once:

```bash
openssl rand -base64 32
```

For Docker builds, pass the same value as both a build argument and runtime environment variable.

## Notes

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported for older Supabase projects that still show an anon key label. The old Expo variable names are not read by the PWA.
