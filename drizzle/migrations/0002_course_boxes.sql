ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS box_name text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS box_required integer;