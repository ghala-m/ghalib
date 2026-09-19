-- Saved output from the Study Tools page (summaries, flashcards, quizzes, explanations, study
-- plans), optionally linked to a course, so students can come back to material they've already
-- generated instead of only ever seeing it once in the tool's result panel.
create table if not exists public.study_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  kind text not null check (kind in ('summarize', 'flashcards', 'quiz', 'explain', 'studyPlan')),
  title text not null,
  content jsonb not null,
  source_excerpt text,
  created_at timestamptz not null default now()
);

create index if not exists study_materials_user_course_idx
  on public.study_materials (user_id, course_id, created_at desc);

alter table public.study_materials enable row level security;

drop policy if exists "study_materials_select_own" on public.study_materials;
create policy "study_materials_select_own" on public.study_materials
  for select using (auth.uid() = user_id);

drop policy if exists "study_materials_insert_own" on public.study_materials;
create policy "study_materials_insert_own" on public.study_materials
  for insert with check (auth.uid() = user_id);

drop policy if exists "study_materials_delete_own" on public.study_materials;
create policy "study_materials_delete_own" on public.study_materials
  for delete using (auth.uid() = user_id);
