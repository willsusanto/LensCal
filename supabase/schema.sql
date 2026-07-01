create table if not exists public.lens_usages (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  eye text not null check (eye in ('left', 'right')),
  opened_at timestamptz not null,
  expires_at timestamptz not null,
  lens_type text not null check (lens_type in ('daily', 'weekly', 'monthly')),
  status text not null check (status in ('active', 'discarded')),
  notes text constraint lens_usages_notes_length_chk
    check (char_length(coalesce(notes, '')) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lens_usages_expires_after_opened_chk check (expires_at > opened_at)
);

create index if not exists lens_usages_user_eye_status_idx
  on public.lens_usages (user_id, eye, status, opened_at desc);

create unique index if not exists lens_usages_one_active_per_eye_idx
  on public.lens_usages (user_id, eye)
  where status = 'active';

create table if not exists public.lens_events (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lens_usage_id text not null references public.lens_usages(id) on delete cascade,
  event_type text not null check (event_type in ('opened', 'uncomfortable', 'discarded', 'replaced')),
  event_at timestamptz not null,
  notes text constraint lens_events_notes_length_chk
    check (char_length(coalesce(notes, '')) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists lens_events_user_event_at_idx
  on public.lens_events (user_id, event_at desc);

alter table public.lens_usages enable row level security;
alter table public.lens_events enable row level security;

drop policy if exists "Users can read their own lens usages" on public.lens_usages;
create policy "Users can read their own lens usages"
  on public.lens_usages
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own lens usages" on public.lens_usages;
create policy "Users can insert their own lens usages"
  on public.lens_usages
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own lens usages" on public.lens_usages;
create policy "Users can update their own lens usages"
  on public.lens_usages
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read their own lens events" on public.lens_events;
create policy "Users can read their own lens events"
  on public.lens_events
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own lens events" on public.lens_events;
create policy "Users can insert their own lens events"
  on public.lens_events
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.lens_usages
      where lens_usages.id = lens_events.lens_usage_id
        and lens_usages.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update their own lens events" on public.lens_events;
create policy "Users can update their own lens events"
  on public.lens_events
  for update
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.lens_usages
      where lens_usages.id = lens_events.lens_usage_id
        and lens_usages.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.lens_usages
      where lens_usages.id = lens_events.lens_usage_id
        and lens_usages.user_id = auth.uid()
    )
  );

-- User settings (one row per user)
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_lens_type text not null default 'monthly'
    check (default_lens_type in ('daily', 'weekly', 'monthly')),
  monthly_replacement_days integer not null default 28
    constraint user_settings_monthly_replacement_days_chk
    check (monthly_replacement_days between 1 and 90),
  notifications_enabled boolean not null default true,
  reminder_hour integer not null default 8
    constraint user_settings_reminder_hour_chk
    check (reminder_hour between 0 and 23),
  reminder_minute integer not null default 0
    constraint user_settings_reminder_minute_chk
    check (reminder_minute between 0 and 59),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "Users manage own settings" on public.user_settings;
create policy "Users manage own settings"
  on public.user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'lens_usages_notes_length_chk'
  ) then
    alter table public.lens_usages
      add constraint lens_usages_notes_length_chk
      check (char_length(coalesce(notes, '')) <= 1000);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'lens_usages_expires_after_opened_chk'
  ) then
    alter table public.lens_usages
      add constraint lens_usages_expires_after_opened_chk
      check (expires_at > opened_at);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'lens_events_notes_length_chk'
  ) then
    alter table public.lens_events
      add constraint lens_events_notes_length_chk
      check (char_length(coalesce(notes, '')) <= 1000);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'user_settings_monthly_replacement_days_chk'
  ) then
    alter table public.user_settings
      add constraint user_settings_monthly_replacement_days_chk
      check (monthly_replacement_days between 1 and 90);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'user_settings_reminder_hour_chk'
  ) then
    alter table public.user_settings
      add constraint user_settings_reminder_hour_chk
      check (reminder_hour between 0 and 23);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'user_settings_reminder_minute_chk'
  ) then
    alter table public.user_settings
      add constraint user_settings_reminder_minute_chk
      check (reminder_minute between 0 and 59);
  end if;
end $$;
