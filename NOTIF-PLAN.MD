LensCal Web Push Reminders Plan
Summary
Implement real background Web Push reminders so LensCal can notify users even when the PWA/browser tab is closed.
Use the Tencent Cloud VPS as the scheduled sender host, while keeping Supabase as the source of truth. The VPS will run a cron job that calls a protected Next.js API route. That route queries Supabase for due reminders, sends Web Push notifications, and records delivery attempts to prevent duplicates.
Keep the existing in-session notification behavior as a fallback during development or when Push subscription is unavailable.
Key Changes
Notification Infrastructure
Add web-push as the server-side push sender dependency.
Add server-only env vars:SUPABASE_SERVICE_ROLE_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
PUSH_CRON_SECRET

Add client-visible env var:NEXT_PUBLIC_VAPID_PUBLIC_KEY

Update .env.example, README.md, and AGENTS.md to document these variables and the VPS cron requirement.
Keep service-role keys server-only. Never expose them through NEXT*PUBLIC*\*.
Supabase Schema
Add two tables in supabase/schema.sql.
push_subscriptions:
Stores one row per browser/device subscription.
Columns:id text primary key
user_id uuid not null references auth.users(id) on delete cascade
endpoint text not null unique
p256dh text not null
auth text not null
user_agent text
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
last_success_at timestamptz
last_failure_at timestamptz
failure_count integer not null default 0
revoked_at timestamptz

RLS:Users can select/insert/update/delete only their own subscriptions.
The server cron route uses the service role and bypasses RLS.

push_reminder_deliveries:
Prevents duplicate reminder sends.
Columns:id text primary key
user_id uuid not null references auth.users(id) on delete cascade
lens_usage_id text not null references public.lens_usages(id) on delete cascade
reminder_key text not null
scheduled_for timestamptz not null
sent_at timestamptz
status text not null check (status in ('sent', 'failed'))
error text
created_at timestamptz not null default now()

Add unique index on (user_id, lens_usage_id, reminder_key, scheduled_for).
RLS:Users may read their own delivery records if needed later.
No client insert/update policy is required for v1.

Client Subscription Flow
Update lib/notifications.ts:
Add helpers to:Convert NEXT_PUBLIC_VAPID_PUBLIC_KEY from base64url to Uint8Array.
Get the active service worker registration.
Subscribe via registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey }).
Read the subscription keys via subscription.toJSON().
Unsubscribe when reminders are disabled.

Preserve existing showTestNotification() and local timer behavior as fallback.
Update the settings reminders toggle:
When enabling reminders:Request browser notification permission.
Register/confirm service worker readiness.
Create or refresh a Push subscription.
Save subscription metadata to Supabase.
Set notificationsEnabled only if permission and subscription save both succeed.

When disabling reminders:Set notificationsEnabled to false.
Unsubscribe this browser’s Push subscription if one exists.
Mark or delete the matching push_subscriptions row.

Update the UI copy from “Browser notifications are enabled for this device” to something like “Background reminders are enabled for this device.”
Add data-layer functions in lib/data.ts:
upsertPushSubscription(supabase, userId, subscriptionInput)
revokePushSubscription(supabase, userId, endpoint)
Keep all Supabase table access inside lib/data.ts.
Server Sender
Add a server-only Supabase admin client:
New helper: lib/supabase/admin.ts
Uses NEXT_PUBLIC_SUPABASE_URL plus SUPABASE_SERVICE_ROLE_KEY.
Must only be imported from server route handlers or server scripts.
Add protected route:
app/api/push/send-due-reminders/route.ts
Accept only POST.
Require Authorization: Bearer ${PUSH_CRON_SECRET}.
Query:Active lenses.
Each user’s user_settings.notification_reminders.
Non-revoked push_subscriptions.

For each active lens/reminder:Compute scheduled_for using lens.expires_at - daysBefore, then reminder hour/minute.
Send only reminders where scheduled_for <= now.
Skip if matching (user_id, lens_usage_id, reminder_key, scheduled_for) already exists in push_reminder_deliveries.

Payload:title: Time to replace your lens
body: Your left/right daily/weekly/monthly lens is due for replacement today/tomorrow/in N days.
icon: /icon-192.png
badge: /icon-192.png
tag: same reminder key
data: { url: "/" }

On success:Insert push_reminder_deliveries.status = 'sent'.
Update subscription last_success_at, clear or leave failure_count according to implementation preference.

On failure:Insert push_reminder_deliveries.status = 'failed' only when the attempt was made.
Update last_failure_at and increment failure_count.
If Web Push returns 404/410, mark subscription revoked_at = now().

Add service worker notification click behavior:
Ensure generated/custom service worker handles notificationclick.
Close notification.
Open or focus /.
If @ducanh2912/next-pwa supports injecting custom worker code in the current setup, use that path. Otherwise document the limitation and add the smallest compatible worker customization supported by the package.
VPS Cron
Configure Tencent Cloud VPS cron to call the route every 5 minutes:
_/5 _ \* \* \* curl -fsS -X POST https://YOUR_DOMAIN/api/push/send-due-reminders -H "Authorization: Bearer YOUR_PUSH_CRON_SECRET" >/dev/null
For local testing, allow calling the route manually with the same header.
Test Plan
Static Checks
Run:npm run lint
npx tsc --noEmit
npm run build

Manual Browser Tests
Fresh user enables reminders:Permission prompt appears.
Subscription row is created in Supabase.
Settings shows enabled state.

User disables reminders:notificationsEnabled becomes false.
Browser subscription is unsubscribed.
Supabase subscription is revoked or removed.

User sends test notification:Existing test notification still works.

User replaces or edits lens dates:Due reminder schedule changes according to the new expires_at.
No duplicate push is sent for the same lens/reminder/scheduled time.

Server Sender Tests
Call API without auth header:Returns 401.

Call API with wrong secret:Returns 401.

Call API with correct secret and no due reminders:Returns 200 with zero sends.

Create a due active lens and valid subscription:API sends one notification.
Delivery row is inserted.

Call API again immediately:No duplicate send occurs.

Simulate expired subscription response 404/410:Subscription is marked revoked.

Assumptions
The app is hosted on a Tencent Cloud VPS with HTTPS enabled.
The VPS can run cron jobs.
Supabase remains the only database.
The first implementation targets Web Push for browsers/PWA only, not SMS, email, or native mobile push.
The existing in-session timer notifications remain as a fallback, but Web Push becomes the primary reminder path.
Service-role Supabase access is allowed only in server-side code and the protected cron route.
