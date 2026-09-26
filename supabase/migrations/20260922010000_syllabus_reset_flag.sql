-- Re-uploading a syllabus previously just appended a second copy of every checklist item and
-- grade-weight row on top of the first upload's (visible as every category duplicated in the
-- grade breakdown). This column lets a re-upload safely wipe-and-replace only what the syllabus
-- itself produced, while leaving anything the student added by hand (via the regular "add task"
-- dialog) untouched.
alter table public.course_items add column if not exists from_syllabus boolean not null default false;

-- Per-course preference for which calendar view (day/week/month) that course's page opens to.
-- Defaults to "week" — a single course's calendar is naturally read a week at a time (this
-- course's own deadlines are usually a handful of items, not a month's worth), unlike the
-- overall term calendar where month view makes more sense as the default.
alter table public.courses add column if not exists calendar_default_view text not null default 'week';
alter table public.courses drop constraint if exists courses_calendar_default_view_check;
alter table public.courses add constraint courses_calendar_default_view_check
  check (calendar_default_view in ('day', 'week', 'month'));

-- Per-course, student-chosen order for the course page's main sections (grades, materials,
-- calendar, checklist) — "sometimes I want the checklist first, sometimes the calendar first".
alter table public.courses add column if not exists section_order jsonb
  not null default '["grades", "materials", "calendar", "checklist"]'::jsonb;
