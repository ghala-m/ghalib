-- Multiple, separate advisor conversations per student (instead of one endless global chat log).
-- Structurally fixes the "chat history grows without bound" issue too: each conversation is its
-- own bounded thing, and old ones can be deleted independently.
create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chat_sessions enable row level security;

create policy "chat_sessions_select_own" on public.chat_sessions
  for select using (auth.uid() = user_id);
create policy "chat_sessions_insert_own" on public.chat_sessions
  for insert with check (auth.uid() = user_id);
create policy "chat_sessions_update_own" on public.chat_sessions
  for update using (auth.uid() = user_id);
create policy "chat_sessions_delete_own" on public.chat_sessions
  for delete using (auth.uid() = user_id);

alter table public.chat_messages add column if not exists session_id uuid references public.chat_sessions(id) on delete cascade;
create index if not exists chat_messages_session_idx on public.chat_messages (session_id, created_at);

-- Note: pre-existing chat_messages rows (from before sessions existed) have session_id = null
-- and won't appear in the new sidebar — they're orphaned, not deleted. Safe to clean up later
-- with `delete from public.chat_messages where session_id is null;` once you've confirmed
-- nobody needs that old history.
