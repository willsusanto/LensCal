# LensCal

LensCal is an Expo + React Native app for tracking soft contact lens usage separately for the left and right eye.

## Features

- Local-first SQLite storage
- Independent left and right lens status
- Day count and replacement progress
- Replace, discard, and discomfort events per eye
- Per-device local replacement notifications
- Optional Supabase auth and sync

## Run Locally

```bash
npm install
npm run start
```

Open the app with Expo Go, an iOS simulator, or an Android emulator.

## Supabase Sync

Sync is optional. The app works locally without Supabase credentials.

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env`.
4. Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
5. Restart Expo.

## Notes

Local notifications are scheduled on each device. After signing in and syncing on a second device, LensCal schedules reminders locally for active synced lenses.
