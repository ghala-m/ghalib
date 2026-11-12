-- Daily purge of expired university archives, even for students who never reopen the app.
-- Safe to re-run. If pg_cron isn't enabled on your project, this does nothing and tells you so
-- (enable it in Supabase: Database -> Extensions -> pg_cron, then run this file again).
--
-- Why "delete_at + 30 days": when a student opens settings the app deletes the archive AND its
-- uploaded syllabus files (Storage can't be cleaned from SQL). The 30 days of grace give returning
-- students that clean path first; this job is the backstop that guarantees the personal data rows
-- are gone for everyone, as promised (1 year after the 30-day restore window).

CREATE OR REPLACE FUNCTION public.purge_expired_university_archives()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.university_archives WHERE delete_at < now() - interval '30 days';
$$;
REVOKE ALL ON FUNCTION public.purge_expired_university_archives() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    -- Replace any previous schedule with the same name.
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purge-university-archives';
    PERFORM cron.schedule('purge-university-archives', '30 3 * * *',
                          'SELECT public.purge_expired_university_archives()');
    RAISE NOTICE 'pg_cron job purge-university-archives scheduled (daily 03:30 UTC).';
  ELSE
    RAISE NOTICE 'pg_cron is not available here - archives are purged only when students open settings.';
  END IF;
END $$;
