-- Per-user, per-endpoint AI call log, used to enforce rate limits from server functions.
-- A DB-backed log (not an in-memory counter) is required because server functions may run
-- as separate serverless invocations with no shared memory between calls.
create table public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  created_at timestamptz not null default now()
);

alter table public.ai_usage_log enable row level security;

create policy "ai_usage_log_select_own" on public.ai_usage_log
  for select using (auth.uid() = user_id);
create policy "ai_usage_log_insert_own" on public.ai_usage_log
  for insert with check (auth.uid() = user_id);

-- Speeds up the "how many calls in the last N minutes" check the rate limiter runs on every request.
create index ai_usage_log_user_endpoint_time_idx on public.ai_usage_log (user_id, endpoint, created_at desc);
