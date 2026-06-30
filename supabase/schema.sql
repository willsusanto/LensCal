create table if not exists public.lens_usages (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  eye text not null check (eye in ('left', 'right')),
  opened_at timestamptz not null,
  expires_at timestamptz not null,
  lens_type text not null check (lens_type in ('daily', 'weekly', 'monthly')),
  status text not null check (status in ('active', 'discarded')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lens_usages_user_eye_status_idx
  on public.lens_usages (user_id, eye, status, opened_at desc);

create table if not exists public.lens_events (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lens_usage_id text not null references public.lens_usages(id) on delete cascade,
  event_type text not null check (event_type in ('opened', 'uncomfortable', 'discarded', 'replaced')),
  event_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists lens_events_user_event_at_idx
  on public.lens_events (user_id, event_at desc);

alter table public.lens_usages enable row level security;
alter table public.lens_events enable row level security;

create policy "Users can read their own lens usages"
  on public.lens_usages
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own lens usages"
  on public.lens_usages
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own lens usages"
  on public.lens_usages
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can read their own lens events"
  on public.lens_events
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own lens events"
  on public.lens_events
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own lens events"
  on public.lens_events
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
