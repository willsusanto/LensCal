begin;

-- Preserve existing reminder settings while migrating from the legacy
-- reminder_hour/reminder_minute columns to the multi-reminder JSON array.
alter table public.user_settings
  add column if not exists notification_reminders jsonb;

update public.user_settings
set notification_reminders = jsonb_build_array(
  jsonb_build_object(
    'daysBefore', 0,
    'hour', reminder_hour,
    'minute', reminder_minute
  )
)
where notification_reminders is null;

alter table public.user_settings
  alter column notification_reminders set default '[{"daysBefore":0,"hour":8,"minute":0}]'::jsonb,
  alter column notification_reminders set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_settings_notification_reminders_chk'
      and conrelid = 'public.user_settings'::regclass
  ) then
    alter table public.user_settings
      add constraint user_settings_notification_reminders_chk
      check (
        jsonb_typeof(notification_reminders) = 'array'
        and jsonb_array_length(notification_reminders) <= 3
      );
  end if;
end $$;

create table if not exists public.push_subscriptions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_count integer not null default 0,
  revoked_at timestamptz
);

create index if not exists push_subscriptions_user_active_idx
  on public.push_subscriptions (user_id, revoked_at);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users can read their own push subscriptions" on public.push_subscriptions;
create policy "Users can read their own push subscriptions"
  on public.push_subscriptions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own push subscriptions" on public.push_subscriptions;
create policy "Users can insert their own push subscriptions"
  on public.push_subscriptions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own push subscriptions" on public.push_subscriptions;
create policy "Users can update their own push subscriptions"
  on public.push_subscriptions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own push subscriptions" on public.push_subscriptions;
create policy "Users can delete their own push subscriptions"
  on public.push_subscriptions
  for delete
  using (auth.uid() = user_id);

revoke all on public.push_subscriptions from anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, insert, update, delete on public.push_subscriptions to service_role;

create table if not exists public.push_reminder_deliveries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lens_usage_id text not null references public.lens_usages(id) on delete cascade,
  reminder_key text not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  status text not null,
  error text,
  attempt_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_reminder_deliveries
  add column if not exists attempt_count integer not null default 1,
  add column if not exists updated_at timestamptz not null default now();

alter table public.push_reminder_deliveries
  drop constraint if exists push_reminder_deliveries_status_check;

alter table public.push_reminder_deliveries
  add constraint push_reminder_deliveries_status_check
  check (status in ('processing', 'sent', 'failed'));

create unique index if not exists push_reminder_deliveries_unique_idx
  on public.push_reminder_deliveries (user_id, lens_usage_id, reminder_key, scheduled_for);

create index if not exists push_reminder_deliveries_user_created_idx
  on public.push_reminder_deliveries (user_id, created_at desc);

alter table public.push_reminder_deliveries enable row level security;

drop policy if exists "Users can read their own push reminder deliveries" on public.push_reminder_deliveries;
create policy "Users can read their own push reminder deliveries"
  on public.push_reminder_deliveries
  for select
  using (auth.uid() = user_id);

revoke all on public.push_reminder_deliveries from anon;
grant select on public.push_reminder_deliveries to authenticated;
grant select, insert, update, delete on public.push_reminder_deliveries to service_role;

commit;
