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
CREATE POLICY "own term calendar events" ON public.term_calendar_events
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS term_calendar_events_term_idx ON public.term_calendar_events (term_id, start_date);
