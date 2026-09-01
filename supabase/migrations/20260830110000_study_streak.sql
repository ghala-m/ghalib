-- ============================================================================
-- Study/attendance streak (GitHub-contributions-style heatmap). `count` lets a day be more
-- or less "intense" (e.g. logging twice in one day) without needing separate rows per session.
-- ============================================================================
create table public.study_streak (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  count integer not null default 1,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

alter table public.study_streak enable row level security;

create policy "study_streak_select_own" on public.study_streak
  for select using (auth.uid() = user_id);
create policy "study_streak_insert_own" on public.study_streak
  for insert with check (auth.uid() = user_id);
create policy "study_streak_update_own" on public.study_streak
  for update using (auth.uid() = user_id);
create policy "study_streak_delete_own" on public.study_streak
  for delete using (auth.uid() = user_id);
