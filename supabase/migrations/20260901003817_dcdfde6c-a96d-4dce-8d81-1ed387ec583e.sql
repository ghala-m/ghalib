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
CREATE POLICY "ai_usage_log_select_own" ON public.ai_usage_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
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
CREATE POLICY "chat_sessions_own" ON public.chat_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.chat_sessions(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON public.chat_messages (session_id, created_at);