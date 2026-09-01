-- ============================================================================
-- Real push notifications (reach the student even when the app/tab is closed)
-- ============================================================================
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- Dedup flags so the scheduled sender (a cron-triggered edge function, service-role only)
-- never re-notifies the same due item/event. Not writable by users directly — no RLS
-- policy is added for update/insert on these columns beyond what already exists on the
-- parent tables, since only the service role (which bypasses RLS) needs to set them.
alter table public.calendar_events add column if not exists notified_at timestamptz;
alter table public.course_items add column if not exists notified_at timestamptz;

-- ============================================================================
-- Morning commute briefing: home/university coordinates + a daily on/off switch.
-- Coordinates are set by the student (via "use my location" or manual geocoding on the
-- client) — this migration only stores them.
-- ============================================================================
alter table public.profiles add column if not exists home_lat double precision;
alter table public.profiles add column if not exists home_lng double precision;
alter table public.profiles add column if not exists home_address text;
alter table public.profiles add column if not exists university_lat double precision;
alter table public.profiles add column if not exists university_lng double precision;
alter table public.profiles add column if not exists university_address text;
alter table public.profiles add column if not exists commute_mode text not null default 'driving';
alter table public.profiles add column if not exists briefing_enabled boolean not null default false;
alter table public.profiles add column if not exists briefing_lead_minutes integer not null default 60;
alter table public.profiles add column if not exists briefing_buffer_minutes integer not null default 10;

-- The student's IANA timezone (e.g. 'Asia/Kuwait', 'Asia/Riyadh'). The scheduled edge
-- functions run on UTC and MUST convert through this column for every "is it time yet"
-- check — see supabase/functions/_shared/time.ts. Defaults to Kuwait since that's this app's
-- primary user base; students elsewhere should update it.
alter table public.profiles add column if not exists timezone text not null default 'Asia/Kuwait';

-- One row per calendar day the briefing was actually sent for, so the scheduled function
-- (which runs every few minutes) never sends the same day's briefing twice.
create table public.briefing_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  briefing_date date not null,
  sent_at timestamptz not null default now(),
  unique (user_id, briefing_date)
);

alter table public.briefing_log enable row level security;

create policy "briefing_log_select_own" on public.briefing_log
  for select using (auth.uid() = user_id);
