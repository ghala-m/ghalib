-- 1) Raw score entry (earned / max) + "drop the lowest" flag on checklist items.
--    score_percent stays the single source of truth for grade maths; the app derives it from
--    score_earned / score_max so older rows (percent only) keep working untouched.
ALTER TABLE public.course_items
  ADD COLUMN IF NOT EXISTS score_earned numeric(8,2)
    CHECK (score_earned IS NULL OR score_earned >= 0),
  ADD COLUMN IF NOT EXISTS score_max numeric(8,2)
    CHECK (score_max IS NULL OR score_max > 0),
  ADD COLUMN IF NOT EXISTS drop_lowest boolean NOT NULL DEFAULT false;

-- 2) Switching university: the old university's data is snapshotted here and kept for 30 days
--    Lifecycle: day 0-30  = restorable ("expires_at" is the restore deadline)
--               day 30-395 = read-only archive (can be viewed, not edited or restored)
--               after "delete_at" (30 days + 1 year) = permanently deleted.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS university_switched_at timestamptz,
  ADD COLUMN IF NOT EXISTS college text;

CREATE TABLE IF NOT EXISTS public.university_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  university text NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  delete_at timestamptz NOT NULL DEFAULT (now() + interval '395 days')
);

ALTER TABLE public.university_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own university archives"
  ON public.university_archives FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own university archives"
  ON public.university_archives FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own university archives"
  ON public.university_archives FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS university_archives_user_idx
  ON public.university_archives (user_id, delete_at);

-- Optional: call this from pg_cron (e.g. daily) to purge archives past their delete_at even for students
-- who never open the app. The app also purges the signed-in student's expired archives.
CREATE OR REPLACE FUNCTION public.purge_expired_university_archives()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.university_archives WHERE delete_at < now();
$$;
REVOKE ALL ON FUNCTION public.purge_expired_university_archives() FROM PUBLIC, anon, authenticated;
