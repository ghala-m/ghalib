-- Adds a "prep" course category for non-credit foundational/intensive courses (e.g. Intensive
-- English, Precalculus prep) that a student takes before their real degree coursework starts —
-- these carry 0 credit hours and a Pass/Fail-style grade, and shouldn't be lumped in with
-- "general requirements" since they aren't a degree requirement at all.
ALTER TYPE public.course_category ADD VALUE IF NOT EXISTS 'prep';
