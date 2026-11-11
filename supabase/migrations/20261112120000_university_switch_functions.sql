-- Atomic university switch / restore.
-- Previously the app did snapshot → wipe → profile update as separate requests, so a network
-- failure half-way could leave a student with wiped data. A plpgsql function runs in ONE
-- transaction: either everything happens or nothing does.
--
-- Safe to re-run (CREATE OR REPLACE). Runs as the signed-in student (SECURITY INVOKER),
-- so row-level security still applies and only their own rows are touched.
-- Requires 20261104120000_score_fraction_drop_lowest_university_archive.sql to be applied first.

-- Tables owned by a student, parents first (restore inserts in this order, wipe deletes in reverse).
CREATE OR REPLACE FUNCTION public._university_tables()
RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT ARRAY['terms','courses','grade_weights','course_items','calendar_events',
               'study_streak','chat_sessions','chat_messages','study_materials'];
$$;

-- Snapshot the live data into university_archives (no-op when there is nothing to keep).
CREATE OR REPLACE FUNCTION public._archive_current_university(p_university text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tables jsonb := '{}'::jsonb;
  v_rows jsonb;
  v_profile jsonb;
  v_t text;
BEGIN
  IF coalesce(btrim(p_university), '') = '' THEN RETURN; END IF;

  FOREACH v_t IN ARRAY public._university_tables() LOOP
    EXECUTE format(
      'SELECT coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) FROM public.%I t WHERE t.user_id = $1', v_t)
      INTO v_rows USING v_uid;
    v_tables := v_tables || jsonb_build_object(v_t, v_rows);
  END LOOP;

  -- Nothing worth archiving (same rule as the app: needs at least one course or term).
  IF jsonb_array_length(v_tables->'courses') = 0 AND jsonb_array_length(v_tables->'terms') = 0 THEN
    RETURN;
  END IF;

  SELECT jsonb_build_object(
           'college', p.college, 'major', p.major, 'current_term', p.current_term,
           'term_number', p.term_number, 'total_credits', p.total_credits,
           'overall_gpa', p.overall_gpa, 'semester_gpa', p.semester_gpa,
           'onboarding_completed', p.onboarding_completed)
    INTO v_profile FROM public.profiles p WHERE p.id = v_uid;

  INSERT INTO public.university_archives (user_id, university, snapshot, expires_at, delete_at)
  VALUES (v_uid, btrim(p_university),
          jsonb_build_object('version', 1, 'profile', coalesce(v_profile, '{}'::jsonb), 'tables', v_tables),
          now() + interval '30 days', now() + interval '395 days');
END $$;

-- Remove all the student's study data (retake links first: courses reference each other).
CREATE OR REPLACE FUNCTION public._wipe_university_data()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tables text[] := public._university_tables();
  i int;
BEGIN
  UPDATE public.courses SET previous_attempt_id = NULL, is_retake = false
   WHERE user_id = v_uid AND previous_attempt_id IS NOT NULL;
  FOR i IN REVERSE array_length(v_tables, 1)..1 LOOP
    EXECUTE format('DELETE FROM public.%I WHERE user_id = $1', v_tables[i]) USING v_uid;
  END LOOP;
END $$;

-- Student moves to another university.
CREATE OR REPLACE FUNCTION public.switch_university(p_new_university text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_current text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF coalesce(btrim(p_new_university), '') = '' THEN RAISE EXCEPTION 'university required'; END IF;

  SELECT university INTO v_current FROM public.profiles WHERE id = v_uid FOR UPDATE;

  PERFORM public._archive_current_university(v_current);
  PERFORM public._wipe_university_data();

  UPDATE public.profiles SET
    university = btrim(p_new_university), college = NULL, major = NULL, current_term = NULL,
    term_number = 1, total_credits = 0, overall_gpa = NULL, semester_gpa = NULL,
    onboarding_completed = false, university_switched_at = now()
  WHERE id = v_uid;
END $$;

-- Bring an archived university back (the current one is archived first, so this is reversible).
CREATE OR REPLACE FUNCTION public.restore_university_archive(p_archive_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_arch public.university_archives%ROWTYPE;
  v_current text;
  v_snap jsonb;
  v_t text;
  v_rows jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO v_arch FROM public.university_archives
   WHERE id = p_archive_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND OR v_arch.expires_at < now() THEN RAISE EXCEPTION 'expired'; END IF;
  v_snap := v_arch.snapshot;

  SELECT university INTO v_current FROM public.profiles WHERE id = v_uid FOR UPDATE;
  PERFORM public._archive_current_university(v_current);
  PERFORM public._wipe_university_data();

  FOREACH v_t IN ARRAY public._university_tables() LOOP
    v_rows := coalesce(v_snap->'tables'->v_t, '[]'::jsonb);
    CONTINUE WHEN jsonb_array_length(v_rows) = 0;
    IF v_t = 'courses' THEN
      -- Insert without retake links, re-link afterwards (self reference).
      EXECUTE 'INSERT INTO public.courses SELECT * FROM jsonb_populate_recordset(null::public.courses, '
              '(SELECT jsonb_agg(r - ''previous_attempt_id'') FROM jsonb_array_elements($1) r))'
        USING v_rows;
      UPDATE public.courses c SET previous_attempt_id = x.previous_attempt_id
        FROM jsonb_populate_recordset(null::public.courses, v_rows) x
       WHERE c.id = x.id AND x.previous_attempt_id IS NOT NULL AND c.user_id = v_uid;
    ELSE
      EXECUTE format('INSERT INTO public.%I SELECT * FROM jsonb_populate_recordset(null::public.%I, $1)', v_t, v_t)
        USING v_rows;
    END IF;
  END LOOP;

  UPDATE public.profiles p SET
    university = v_arch.university, college = r.college, major = r.major,
    current_term = r.current_term, term_number = r.term_number, total_credits = r.total_credits,
    overall_gpa = r.overall_gpa, semester_gpa = r.semester_gpa,
    onboarding_completed = r.onboarding_completed, university_switched_at = now()
  FROM jsonb_populate_record(null::public.profiles, coalesce(v_snap->'profile', '{}'::jsonb)) r
  WHERE p.id = v_uid;

  DELETE FROM public.university_archives WHERE id = p_archive_id;
END $$;

REVOKE ALL ON FUNCTION public._university_tables() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._archive_current_university(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._wipe_university_data() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.switch_university(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_university_archive(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._university_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION public._archive_current_university(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public._wipe_university_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.switch_university(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_university_archive(uuid) TO authenticated;
