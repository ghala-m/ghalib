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
  CREATE POLICY "Users manage their own chat messages"
    ON public.chat_messages FOR ALL TO authenticated
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS chat_messages_user_created_idx
  ON public.chat_messages (user_id, created_at);