-- Lets students record the score they actually got on a graded checklist item,
-- so the app can compute their real running grade in the course (not just the
-- syllabus's declared weighting scheme).
ALTER TABLE public.course_items
  ADD COLUMN IF NOT EXISTS score_percent numeric(5,2)
  CHECK (score_percent IS NULL OR (score_percent >= 0 AND score_percent <= 100));
