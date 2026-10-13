CREATE TABLE public.professors (
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
CREATE POLICY professors_read ON public.professors FOR SELECT TO authenticated USING (true);
CREATE POLICY professors_add ON public.professors FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE TABLE public.professor_reviews (
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
CREATE POLICY reviews_own ON public.professor_reviews FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX professor_reviews_professor_idx ON public.professor_reviews(professor_id);
CREATE TABLE public.professor_review_reports (
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
CREATE POLICY reports_read_own ON public.professor_review_reports FOR SELECT TO authenticated USING (user_id = auth.uid());
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