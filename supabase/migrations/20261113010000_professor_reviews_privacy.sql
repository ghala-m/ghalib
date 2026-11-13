-- Professor forum privacy:
--  * Only students of the SAME university as the professor can read the reviews / ratings
--    (admins can, for moderation).
--  * The reviewer's name never leaves the database: at most the first letter is returned.
--    Reviews marked anonymous return no letter at all.
-- Safe to re-run. Needs the catalog tables from 20261112160000 (for matching university aliases)
-- and is_app_admin() from 20261112140000.

-- Normalises a stored university value to its catalog official name (matching English/Arabic
-- names and aliases); unknown free-text values are only trimmed/lower-cased.
CREATE OR REPLACE FUNCTION public.university_key(p_value text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH n AS (SELECT lower(regexp_replace(btrim(coalesce(p_value, '')), '\s+', ' ', 'g')) AS v)
  SELECT COALESCE(
    (SELECT lower(u.official) FROM public.catalog_universities u, n
      WHERE n.v <> '' AND (lower(u.official) = n.v OR lower(u.ar) = n.v OR lower(u.en) = n.v
            OR EXISTS (SELECT 1 FROM unnest(u.aliases) a WHERE lower(btrim(a)) = n.v))
      LIMIT 1),
    (SELECT v FROM n));
$$;
REVOKE ALL ON FUNCTION public.university_key(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.university_key(text) TO authenticated;

-- May the signed-in student see this professor's reviews?
-- A professor with no university recorded is visible to everyone; a student who hasn't set their
-- own university yet sees nothing until they do (the app prompts them to).
CREATE OR REPLACE FUNCTION public.can_see_professor(p_professor_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_app_admin()
    OR EXISTS (
      SELECT 1
      FROM public.professors pr
      LEFT JOIN public.profiles me ON me.id = auth.uid()
      WHERE pr.id = p_professor_id
        AND (
          public.university_key(pr.university) = ''
          OR (public.university_key(me.university) <> ''
              AND public.university_key(pr.university) = public.university_key(me.university))
        )
    )
  );
$$;
REVOKE ALL ON FUNCTION public.can_see_professor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_see_professor(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_professor_reviews(p_professor_id uuid)
RETURNS TABLE(id uuid, professor_id uuid, rating integer, course_name text, comment text,
              is_anonymous boolean, author_name text, is_own boolean, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.id, r.professor_id, r.rating, r.course_name, r.comment, r.is_anonymous,
         -- first letter only (NULL when anonymous or when the student has no name)
         CASE WHEN r.is_anonymous THEN NULL
              ELSE NULLIF(left(btrim(COALESCE(p.full_name, '')), 1), '') END,
         r.user_id = auth.uid(), r.created_at
  FROM public.professor_reviews r
  LEFT JOIN public.profiles p ON p.id = r.user_id
  WHERE r.professor_id = p_professor_id AND public.can_see_professor(p_professor_id)
  ORDER BY r.created_at DESC LIMIT 500;
$$;
REVOKE ALL ON FUNCTION public.list_professor_reviews(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_professor_reviews(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.professor_rating_summary()
RETURNS TABLE(professor_id uuid, average_rating numeric, review_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.professor_id, round(avg(r.rating), 1), count(*)
  FROM public.professor_reviews r
  WHERE public.can_see_professor(r.professor_id)
  GROUP BY r.professor_id;
$$;
REVOKE ALL ON FUNCTION public.professor_rating_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.professor_rating_summary() TO authenticated;
