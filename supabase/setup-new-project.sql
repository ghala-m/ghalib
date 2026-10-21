-- ============================================================================
-- Ghalib — one-shot database setup for a NEW Supabase project.
-- Paste this whole file into: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Run it ONCE on a brand-new, empty project (tested end-to-end on PostgreSQL 16).
-- ============================================================================

-- Private storage bucket for uploaded syllabus files (policies below restrict it per user).
INSERT INTO storage.buckets (id, name, public) VALUES ('syllabi', 'syllabi', false) ON CONFLICT (id) DO NOTHING;

-- ===== supabase/migrations/20260816162909_3e96be6d-f98b-40e2-97f8-23dcace25990.sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  major TEXT,
  current_term TEXT,
  total_credits INTEGER NOT NULL DEFAULT 0,
  overall_gpa NUMERIC(4,2),
  semester_gpa NUMERIC(4,2),
  language TEXT NOT NULL DEFAULT 'ar',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own profile" ON public.profiles;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TYPE public.course_status AS ENUM ('current','completed','future');

CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  instructor TEXT,
  location TEXT,
  term TEXT,
  credits INTEGER,
  status public.course_status NOT NULL DEFAULT 'current',
  final_grade TEXT,
  is_retake BOOLEAN NOT NULL DEFAULT false,
  previous_attempt_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  archived BOOLEAN NOT NULL DEFAULT false,
  meetings JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  syllabus_path TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own courses" ON public.courses;
CREATE POLICY "own courses" ON public.courses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS courses_user_idx ON public.courses(user_id, status);

CREATE TYPE public.item_type AS ENUM ('assignment','exam','quiz','project','other');

CREATE TABLE IF NOT EXISTS public.course_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  type public.item_type NOT NULL DEFAULT 'assignment',
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  due_time TEXT,
  weight NUMERIC(5,2),
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_items TO authenticated;
GRANT ALL ON public.course_items TO service_role;
ALTER TABLE public.course_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own items" ON public.course_items;
CREATE POLICY "own items" ON public.course_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS course_items_course_idx ON public.course_items(course_id);

CREATE TABLE IF NOT EXISTS public.grade_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  category TEXT NOT NULL,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grade_weights TO authenticated;
GRANT ALL ON public.grade_weights TO service_role;
ALTER TABLE public.grade_weights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own weights" ON public.grade_weights;
CREATE POLICY "own weights" ON public.grade_weights FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS grade_weights_course_idx ON public.grade_weights(course_id);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS profiles_updated ON public.profiles;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS courses_updated ON public.courses;
CREATE TRIGGER courses_updated BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP POLICY IF EXISTS "own syllabi read" ON storage.objects;
CREATE POLICY "own syllabi read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'syllabi' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "own syllabi write" ON storage.objects;
CREATE POLICY "own syllabi write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'syllabi' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "own syllabi update" ON storage.objects;
CREATE POLICY "own syllabi update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'syllabi' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "own syllabi delete" ON storage.objects;
CREATE POLICY "own syllabi delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'syllabi' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ===== supabase/migrations/20260816162920_7a82b49d-53b4-4ac1-a897-32b120e0d75f.sql
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ===== supabase/migrations/20260817085634_63362707-1a95-4293-8949-14abc42cedf6.sql
-- Course category enum
DO $$ BEGIN
  CREATE TYPE public.course_category AS ENUM ('general', 'college', 'major', 'major_elective');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS category public.course_category NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS prerequisites text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS plan_level integer,
  ADD COLUMN IF NOT EXISTS grade_points numeric(4,2),
  ADD COLUMN IF NOT EXISTS completed_term text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS university text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS accent_color text;

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users manage their own chat messages" ON public.chat_messages;
CREATE POLICY "Users manage their own chat messages"
    ON public.chat_messages FOR ALL TO authenticated
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS chat_messages_user_created_idx
  ON public.chat_messages (user_id, created_at);

-- ===== supabase/migrations/20260818000248_af621991-ef98-4d08-a3ee-21e47aa52aaa.sql
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS nickname text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS alt_group text;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS term_number integer NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  term_number integer NOT NULL DEFAULT 1,
  start_date date,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  gpa numeric,
  credits integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.terms TO authenticated;
GRANT ALL ON public.terms TO service_role;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own terms" ON public.terms;
CREATE POLICY "own terms" ON public.terms FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  notes text,
  event_date date NOT NULL,
  event_time text,
  remind_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own events" ON public.calendar_events;
CREATE POLICY "own events" ON public.calendar_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS calendar_events_user_date_idx ON public.calendar_events (user_id, event_date);
CREATE INDEX IF NOT EXISTS terms_user_idx ON public.terms (user_id, term_number);

-- ===== supabase/migrations/20260829120000_add_item_score_percent.sql
-- Lets students record the score they actually got on a graded checklist item,
-- so the app can compute their real running grade in the course (not just the
-- syllabus's declared weighting scheme).
ALTER TABLE public.course_items
  ADD COLUMN IF NOT EXISTS score_percent numeric(5,2)
  CHECK (score_percent IS NULL OR (score_percent >= 0 AND score_percent <= 100));


-- ===== supabase/migrations/20260830100000_push_and_briefing.sql
-- ============================================================================
-- Real push notifications (reach the student even when the app/tab is closed)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

DROP POLICY IF EXISTS "push_subscriptions_select_own" ON public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);
DROP POLICY IF EXISTS "push_subscriptions_insert_own" ON public.push_subscriptions;
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
DROP POLICY IF EXISTS "push_subscriptions_delete_own" ON public.push_subscriptions;
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
CREATE TABLE IF NOT EXISTS public.briefing_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  briefing_date date not null,
  sent_at timestamptz not null default now(),
  unique (user_id, briefing_date)
);

alter table public.briefing_log enable row level security;

DROP POLICY IF EXISTS "briefing_log_select_own" ON public.briefing_log;
create policy "briefing_log_select_own" on public.briefing_log
  for select using (auth.uid() = user_id);


-- ===== supabase/migrations/20260830110000_study_streak.sql
-- ============================================================================
-- Study/attendance streak (GitHub-contributions-style heatmap). `count` lets a day be more
-- or less "intense" (e.g. logging twice in one day) without needing separate rows per session.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.study_streak (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  count integer not null default 1,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

alter table public.study_streak enable row level security;

DROP POLICY IF EXISTS "study_streak_select_own" ON public.study_streak;
create policy "study_streak_select_own" on public.study_streak
  for select using (auth.uid() = user_id);
DROP POLICY IF EXISTS "study_streak_insert_own" ON public.study_streak;
create policy "study_streak_insert_own" on public.study_streak
  for insert with check (auth.uid() = user_id);
DROP POLICY IF EXISTS "study_streak_update_own" ON public.study_streak;
create policy "study_streak_update_own" on public.study_streak
  for update using (auth.uid() = user_id);
DROP POLICY IF EXISTS "study_streak_delete_own" ON public.study_streak;
create policy "study_streak_delete_own" on public.study_streak
  for delete using (auth.uid() = user_id);


-- ===== supabase/migrations/20260831090000_ai_usage_log.sql
-- Per-user, per-endpoint AI call log, used to enforce rate limits from server functions.
-- A DB-backed log (not an in-memory counter) is required because server functions may run
-- as separate serverless invocations with no shared memory between calls.
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  created_at timestamptz not null default now()
);

alter table public.ai_usage_log enable row level security;

DROP POLICY IF EXISTS "ai_usage_log_select_own" ON public.ai_usage_log;
create policy "ai_usage_log_select_own" on public.ai_usage_log
  for select using (auth.uid() = user_id);
DROP POLICY IF EXISTS "ai_usage_log_insert_own" ON public.ai_usage_log;
create policy "ai_usage_log_insert_own" on public.ai_usage_log
  for insert with check (auth.uid() = user_id);

-- Speeds up the "how many calls in the last N minutes" check the rate limiter runs on every request.
CREATE INDEX IF NOT EXISTS ai_usage_log_user_endpoint_time_idx on public.ai_usage_log (user_id, endpoint, created_at desc);


-- ===== supabase/migrations/20260831120000_chat_sessions.sql
-- Multiple, separate advisor conversations per student (instead of one endless global chat log).
-- Structurally fixes the "chat history grows without bound" issue too: each conversation is its
-- own bounded thing, and old ones can be deleted independently.
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chat_sessions enable row level security;

DROP POLICY IF EXISTS "chat_sessions_select_own" ON public.chat_sessions;
create policy "chat_sessions_select_own" on public.chat_sessions
  for select using (auth.uid() = user_id);
DROP POLICY IF EXISTS "chat_sessions_insert_own" ON public.chat_sessions;
create policy "chat_sessions_insert_own" on public.chat_sessions
  for insert with check (auth.uid() = user_id);
DROP POLICY IF EXISTS "chat_sessions_update_own" ON public.chat_sessions;
create policy "chat_sessions_update_own" on public.chat_sessions
  for update using (auth.uid() = user_id);
DROP POLICY IF EXISTS "chat_sessions_delete_own" ON public.chat_sessions;
create policy "chat_sessions_delete_own" on public.chat_sessions
  for delete using (auth.uid() = user_id);

alter table public.chat_messages add column if not exists session_id uuid references public.chat_sessions(id) on delete cascade;
create index if not exists chat_messages_session_idx on public.chat_messages (session_id, created_at);

-- Note: pre-existing chat_messages rows (from before sessions existed) have session_id = null
-- and won't appear in the new sidebar — they're orphaned, not deleted. Safe to clean up later
-- with `delete from public.chat_messages where session_id is null;` once you've confirmed
-- nobody needs that old history.


-- ===== supabase/migrations/20260901003817_dcdfde6c-a96d-4dce-8d81-1ed387ec583e.sql
-- score on checklist items
ALTER TABLE public.course_items ADD COLUMN IF NOT EXISTS score_percent numeric(5,2) CHECK (score_percent IS NULL OR (score_percent >= 0 AND score_percent <= 100));

-- push subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_subscriptions_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_own" ON public.push_subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS notified_at timestamptz;
ALTER TABLE public.course_items ADD COLUMN IF NOT EXISTS notified_at timestamptz;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_lat double precision;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_lng double precision;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university_lat double precision;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university_lng double precision;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university_address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS commute_mode text not null default 'driving';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS briefing_enabled boolean not null default false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS briefing_lead_minutes integer not null default 60;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS briefing_buffer_minutes integer not null default 10;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text not null default 'Asia/Kuwait';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sounds_enabled boolean not null default false;

CREATE TABLE IF NOT EXISTS public.briefing_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  briefing_date date not null,
  sent_at timestamptz not null default now(),
  unique (user_id, briefing_date)
);
GRANT SELECT ON public.briefing_log TO authenticated;
GRANT ALL ON public.briefing_log TO service_role;
ALTER TABLE public.briefing_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "briefing_log_select_own" ON public.briefing_log;
CREATE POLICY "briefing_log_select_own" ON public.briefing_log FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.study_streak (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  count integer not null default 1,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_streak TO authenticated;
GRANT ALL ON public.study_streak TO service_role;
ALTER TABLE public.study_streak ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "study_streak_own" ON public.study_streak;
CREATE POLICY "study_streak_own" ON public.study_streak FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT ON public.ai_usage_log TO authenticated;
GRANT ALL ON public.ai_usage_log TO service_role;
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_usage_log_select_own" ON public.ai_usage_log;
CREATE POLICY "ai_usage_log_select_own" ON public.ai_usage_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ai_usage_log_insert_own" ON public.ai_usage_log;
CREATE POLICY "ai_usage_log_insert_own" ON public.ai_usage_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS ai_usage_log_user_endpoint_time_idx ON public.ai_usage_log (user_id, endpoint, created_at desc);

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_sessions TO authenticated;
GRANT ALL ON public.chat_sessions TO service_role;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_sessions_own" ON public.chat_sessions;
CREATE POLICY "chat_sessions_own" ON public.chat_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.chat_sessions(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON public.chat_messages (session_id, created_at);

-- ===== supabase/migrations/20260902090000_term_calendar.sql
ALTER TABLE public.terms ADD COLUMN IF NOT EXISTS weeks_count integer;

CREATE TABLE IF NOT EXISTS public.term_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term_id uuid NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  title text NOT NULL,
  event_type text NOT NULL DEFAULT 'other', -- holiday | break | exam_week | registration | deadline | other
  start_date date NOT NULL,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.term_calendar_events TO authenticated;
GRANT ALL ON public.term_calendar_events TO service_role;
ALTER TABLE public.term_calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own term calendar events" ON public.term_calendar_events;
CREATE POLICY "own term calendar events" ON public.term_calendar_events
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS term_calendar_events_term_idx ON public.term_calendar_events (term_id, start_date);


-- ===== supabase/migrations/20260903013848_b2b65237-9179-4001-9f08-f444b6cebd64.sql
ALTER TABLE public.terms ADD COLUMN IF NOT EXISTS weeks_count integer;

CREATE TABLE IF NOT EXISTS public.term_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term_id uuid NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  title text NOT NULL,
  event_type text NOT NULL DEFAULT 'other',
  start_date date NOT NULL,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.term_calendar_events TO authenticated;
GRANT ALL ON public.term_calendar_events TO service_role;

ALTER TABLE public.term_calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own term calendar events" ON public.term_calendar_events;
CREATE POLICY "own term calendar events" ON public.term_calendar_events
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS term_calendar_events_term_idx ON public.term_calendar_events (term_id, start_date);

-- ===== supabase/migrations/20260910130000_add_prep_category.sql
-- Adds a "prep" course category for non-credit foundational/intensive courses (e.g. Intensive
-- English, Precalculus prep) that a student takes before their real degree coursework starts —
-- these carry 0 credit hours and a Pass/Fail-style grade, and shouldn't be lumped in with
-- "general requirements" since they aren't a degree requirement at all.
ALTER TYPE public.course_category ADD VALUE IF NOT EXISTS 'prep';


-- ===== supabase/migrations/20260919120000_study_materials.sql
-- Saved output from the Study Tools page (summaries, flashcards, quizzes, explanations, study
-- plans), optionally linked to a course, so students can come back to material they've already
-- generated instead of only ever seeing it once in the tool's result panel.
create table if not exists public.study_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  kind text not null check (kind in ('summarize', 'flashcards', 'quiz', 'explain', 'studyPlan')),
  title text not null,
  content jsonb not null,
  source_excerpt text,
  created_at timestamptz not null default now()
);

create index if not exists study_materials_user_course_idx
  on public.study_materials (user_id, course_id, created_at desc);

alter table public.study_materials enable row level security;

drop policy if exists "study_materials_select_own" on public.study_materials;
DROP POLICY IF EXISTS "study_materials_select_own" ON public.study_materials;
create policy "study_materials_select_own" on public.study_materials
  for select using (auth.uid() = user_id);

drop policy if exists "study_materials_insert_own" on public.study_materials;
DROP POLICY IF EXISTS "study_materials_insert_own" ON public.study_materials;
create policy "study_materials_insert_own" on public.study_materials
  for insert with check (auth.uid() = user_id);

drop policy if exists "study_materials_delete_own" on public.study_materials;
DROP POLICY IF EXISTS "study_materials_delete_own" ON public.study_materials;
create policy "study_materials_delete_own" on public.study_materials
  for delete using (auth.uid() = user_id);


-- ===== supabase/migrations/20260922010000_syllabus_reset_flag.sql
-- Re-uploading a syllabus previously just appended a second copy of every checklist item and
-- grade-weight row on top of the first upload's (visible as every category duplicated in the
-- grade breakdown). This column lets a re-upload safely wipe-and-replace only what the syllabus
-- itself produced, while leaving anything the student added by hand (via the regular "add task"
-- dialog) untouched.
alter table public.course_items add column if not exists from_syllabus boolean not null default false;

-- Per-course preference for which calendar view (day/week/month) that course's page opens to.
-- Defaults to "week" — a single course's calendar is naturally read a week at a time (this
-- course's own deadlines are usually a handful of items, not a month's worth), unlike the
-- overall term calendar where month view makes more sense as the default.
alter table public.courses add column if not exists calendar_default_view text not null default 'week';
alter table public.courses drop constraint if exists courses_calendar_default_view_check;
alter table public.courses add constraint courses_calendar_default_view_check
  check (calendar_default_view in ('day', 'week', 'month'));

-- Per-course, student-chosen order for the course page's main sections (grades, materials,
-- calendar, checklist) — "sometimes I want the checklist first, sometimes the calendar first".
alter table public.courses add column if not exists section_order jsonb
  not null default '["grades", "materials", "calendar", "checklist"]'::jsonb;


-- ===== drizzle/migrations/0000_professor_rating_forum.sql
CREATE TABLE IF NOT EXISTS public.professors (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 120),
 university text NOT NULL CHECK (char_length(trim(university)) BETWEEN 2 AND 160),
 department text NOT NULL DEFAULT '' CHECK (char_length(department) <= 160),
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (name, university, department)
);
GRANT SELECT, INSERT ON public.professors TO authenticated;
GRANT ALL ON public.professors TO service_role;
ALTER TABLE public.professors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS professors_read ON public.professors;
CREATE POLICY professors_read ON public.professors FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS professors_add ON public.professors;
CREATE POLICY professors_add ON public.professors FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE TABLE IF NOT EXISTS public.professor_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 professor_id uuid NOT NULL REFERENCES public.professors(id) ON DELETE CASCADE,
 user_id uuid NOT NULL,
 rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
 course_name text NOT NULL DEFAULT '' CHECK (char_length(course_name) <= 160),
 comment text NOT NULL CHECK (char_length(trim(comment)) BETWEEN 10 AND 2000),
 is_anonymous boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (professor_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professor_reviews TO authenticated;
GRANT ALL ON public.professor_reviews TO service_role;
ALTER TABLE public.professor_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reviews_own ON public.professor_reviews;
CREATE POLICY reviews_own ON public.professor_reviews FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS professor_reviews_professor_idx ON public.professor_reviews(professor_id);
CREATE TABLE IF NOT EXISTS public.professor_review_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 review_id uuid NOT NULL REFERENCES public.professor_reviews(id) ON DELETE CASCADE,
 user_id uuid NOT NULL,
 reason text NOT NULL CHECK (char_length(trim(reason)) BETWEEN 5 AND 500),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (review_id, user_id)
);
GRANT SELECT, INSERT ON public.professor_review_reports TO authenticated;
GRANT ALL ON public.professor_review_reports TO service_role;
ALTER TABLE public.professor_review_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reports_read_own ON public.professor_review_reports;
CREATE POLICY reports_read_own ON public.professor_review_reports FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS reports_insert_own ON public.professor_review_reports;
CREATE POLICY reports_insert_own ON public.professor_review_reports FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE FUNCTION public.list_professor_reviews(p_professor_id uuid)
RETURNS TABLE(id uuid, professor_id uuid, rating integer, course_name text, comment text, is_anonymous boolean, author_name text, is_own boolean, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 SELECT r.id, r.professor_id, r.rating, r.course_name, r.comment, r.is_anonymous,
 CASE WHEN r.is_anonymous THEN NULL ELSE COALESCE(NULLIF(trim(p.full_name), ''), 'Student') END,
 r.user_id = auth.uid(), r.created_at
 FROM public.professor_reviews r LEFT JOIN public.profiles p ON p.id = r.user_id
 WHERE auth.uid() IS NOT NULL AND r.professor_id = p_professor_id
 ORDER BY r.created_at DESC LIMIT 500;
$$;
REVOKE ALL ON FUNCTION public.list_professor_reviews(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_professor_reviews(uuid) TO authenticated;
CREATE FUNCTION public.professor_rating_summary()
RETURNS TABLE(professor_id uuid, average_rating numeric, review_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 SELECT professor_id, round(avg(rating), 1), count(*) FROM public.professor_reviews
 WHERE auth.uid() IS NOT NULL GROUP BY professor_id;
$$;
REVOKE ALL ON FUNCTION public.professor_rating_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.professor_rating_summary() TO authenticated;

-- ===== drizzle/migrations/0001_study_materials_update_own.sql
GRANT UPDATE ON public.study_materials TO authenticated;
DROP POLICY IF EXISTS study_materials_update_own ON public.study_materials;
CREATE POLICY study_materials_update_own ON public.study_materials FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== drizzle/migrations/0002_course_boxes.sql
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS box_name text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS box_required integer;
