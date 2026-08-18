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
CREATE POLICY "own events" ON public.calendar_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS calendar_events_user_date_idx ON public.calendar_events (user_id, event_date);
CREATE INDEX IF NOT EXISTS terms_user_idx ON public.terms (user_id, term_number);