CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  major TEXT,
  current_term TEXT,
  total_credits INTEGER NOT NULL DEFAULT 0,
  overall_gpa NUMERIC(4,2),
  semester_gpa NUMERIC(4,2),
  language TEXT NOT NULL DEFAULT 'ar',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TYPE public.course_status AS ENUM ('current','completed','future');

CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  instructor TEXT,
  location TEXT,
  term TEXT,
  credits INTEGER,
  status public.course_status NOT NULL DEFAULT 'current',
  final_grade TEXT,
  is_retake BOOLEAN NOT NULL DEFAULT false,
  previous_attempt_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  archived BOOLEAN NOT NULL DEFAULT false,
  meetings JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  syllabus_path TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own courses" ON public.courses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX courses_user_idx ON public.courses(user_id, status);

CREATE TYPE public.item_type AS ENUM ('assignment','exam','quiz','project','other');

CREATE TABLE public.course_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  type public.item_type NOT NULL DEFAULT 'assignment',
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  due_time TEXT,
  weight NUMERIC(5,2),
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_items TO authenticated;
GRANT ALL ON public.course_items TO service_role;
ALTER TABLE public.course_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own items" ON public.course_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX course_items_course_idx ON public.course_items(course_id);

CREATE TABLE public.grade_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  category TEXT NOT NULL,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grade_weights TO authenticated;
GRANT ALL ON public.grade_weights TO service_role;
ALTER TABLE public.grade_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weights" ON public.grade_weights FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX grade_weights_course_idx ON public.grade_weights(course_id);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER courses_updated BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "own syllabi read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'syllabi' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own syllabi write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'syllabi' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own syllabi update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'syllabi' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own syllabi delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'syllabi' AND auth.uid()::text = (storage.foldername(name))[1]);