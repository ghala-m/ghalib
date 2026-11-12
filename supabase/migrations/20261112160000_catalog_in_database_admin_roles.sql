-- Catalog in the database + two admin levels. Safe to re-run (never overwrites admin edits).
-- Requires 20261112140000_catalog_reports_admin.sql (app_admins, is_app_admin) to be applied first.
--
-- Roles:
--   student = "student admin": the one extra control page (/admin): triage reports + edit the catalog.
--   tech    = "technical admin": everything a student admin has, plus managing admins and a
--             platform overview. A tech admin also has an ordinary student account (their own data).
--             Aggregate numbers only - no admin can read other students' private study data.

-- 1) Roles ---------------------------------------------------------------------------------
-- Existing admin rows (you, the site owner) become tech; admins added later default to student.
ALTER TABLE public.app_admins ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'tech';
ALTER TABLE public.app_admins ALTER COLUMN role SET DEFAULT 'student';
ALTER TABLE public.app_admins DROP CONSTRAINT IF EXISTS app_admins_role_check;
ALTER TABLE public.app_admins ADD CONSTRAINT app_admins_role_check CHECK (role IN ('student', 'tech'));

CREATE OR REPLACE FUNCTION public.is_tech_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_admins WHERE user_id = auth.uid() AND role = 'tech');
$$;

-- Returns 'tech', 'student' or NULL for the signed-in user.
CREATE OR REPLACE FUNCTION public.my_admin_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.app_admins WHERE user_id = auth.uid();
$$;

-- 2) Catalog tables ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalog_universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  official text NOT NULL UNIQUE,
  ar text NOT NULL,
  en text NOT NULL,
  type text NOT NULL DEFAULT 'private' CHECK (type IN ('public', 'private')),
  aliases text[] NOT NULL DEFAULT '{}',
  verified boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS public.catalog_colleges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES public.catalog_universities(id) ON DELETE CASCADE,
  ar text NOT NULL,
  en text,
  sort integer NOT NULL DEFAULT 0,
  UNIQUE (university_id, ar)
);
CREATE TABLE IF NOT EXISTS public.catalog_majors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES public.catalog_colleges(id) ON DELETE CASCADE,
  en text NOT NULL,
  ar text NOT NULL,
  sort integer NOT NULL DEFAULT 0,
  UNIQUE (college_id, en)
);
CREATE INDEX IF NOT EXISTS catalog_colleges_university_idx ON public.catalog_colleges (university_id);
CREATE INDEX IF NOT EXISTS catalog_majors_college_idx ON public.catalog_majors (college_id);

ALTER TABLE public.catalog_universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_majors ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['catalog_universities', 'catalog_colleges', 'catalog_majors'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Signed-in users read %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Signed-in users read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins insert %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Admins insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.is_app_admin())', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins update %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Admins update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (public.is_app_admin()) WITH CHECK (public.is_app_admin())', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins delete %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Admins delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (public.is_app_admin())', t);
  END LOOP;
END $$;

-- 3) Seed from the catalog that used to live in the code (only when the table is empty) ----
DO $seed$
DECLARE
  cat jsonb := $catalog$[{"official": "Kuwait University", "ar": "جامعة الكويت", "en": "Kuwait University", "type": "public", "aliases": ["KU", "Kuwait Univ"], "verified": true, "colleges": [{"ar": "كلية الآداب", "en": "Arts", "majors": [{"en": "Arabic Language and Literature", "ar": "اللغة العربية وآدابها"}, {"en": "English Language and Literature", "ar": "اللغة الإنجليزية وآدابها"}, {"en": "French Language and Cultures", "ar": "اللغة الفرنسية وثقافاتها"}, {"en": "History", "ar": "التاريخ"}, {"en": "Philosophy", "ar": "الفلسفة"}, {"en": "Comparative Literary and Cultural Studies", "ar": "الدراسات الأدبية والثقافية المقارنة"}, {"en": "Mass Communication", "ar": "الإعلام (الصحافة، الإذاعة والتلفزيون، العلاقات العامة والاتصال الرقمي)"}]}, {"ar": "كلية العلوم", "en": "Science", "majors": [{"en": "Data Science and Artificial Intelligence", "ar": "علوم البيانات والذكاء الاصطناعي"}, {"en": "Cybersecurity", "ar": "الأمن السيبراني"}, {"en": "Computer Science", "ar": "علوم الحاسوب"}, {"en": "Chemistry", "ar": "الكيمياء"}, {"en": "Applied Chemistry", "ar": "الكيمياء التطبيقية"}, {"en": "Physics", "ar": "الفيزياء"}, {"en": "Engineering Physics", "ar": "الفيزياء الهندسية"}, {"en": "Mathematics", "ar": "الرياضيات"}, {"en": "Financial Mathematics", "ar": "الرياضيات المالية"}, {"en": "Statistics", "ar": "الإحصاء"}, {"en": "Statistics and Operations Research", "ar": "الإحصاء وبحوث العمليات"}, {"en": "Geology", "ar": "الجيولوجيا (علوم الأرض)"}, {"en": "Geophysics", "ar": "الجيوفيزياء"}, {"en": "Biological Sciences", "ar": "العلوم البيولوجية"}, {"en": "Biochemistry", "ar": "الكيمياء الحيوية"}, {"en": "Marine Science", "ar": "علوم البحار"}, {"en": "Human Biology", "ar": "علم الأحياء البشري"}]}, {"ar": "كلية الهندسة والبترول", "en": "Engineering and Petroleum", "majors": [{"en": "Civil Engineering", "ar": "الهندسة المدنية"}, {"en": "Mechanical Engineering", "ar": "الهندسة الميكانيكية"}, {"en": "Electrical Engineering", "ar": "الهندسة الكهربائية"}, {"en": "Chemical Engineering", "ar": "الهندسة الكيميائية"}, {"en": "Petroleum Engineering", "ar": "هندسة البترول"}, {"en": "Industrial and Management Engineering", "ar": "الهندسة الصناعية والإدارية"}, {"en": "Computer Engineering", "ar": "هندسة الكمبيوتر"}]}, {"ar": "كلية العلوم الإدارية", "en": "Business Administration", "majors": [{"en": "Accounting", "ar": "المحاسبة"}, {"en": "Finance and Financial Institutions", "ar": "التمويل والمنشآت المالية"}, {"en": "Marketing", "ar": "التسويق"}, {"en": "Management", "ar": "الإدارة"}, {"en": "Management Information Systems (MIS)", "ar": "نظم المعلومات الإدارية"}, {"en": "Economics", "ar": "الاقتصاد"}, {"en": "Public Administration", "ar": "الإدارة العامة"}, {"en": "Quantitative Methods and Information Systems", "ar": "الأساليب الكمية ونظم المعلومات"}]}, {"ar": "كلية علوم الحياة", "en": "Life Sciences", "majors": [{"en": "Environmental Technology Management", "ar": "إدارة التقنية البيئية"}, {"en": "Food Science and Human Nutrition", "ar": "علم الغذاء وتغذية الإنسان"}, {"en": "Communication Disorders", "ar": "اضطرابات التواصل"}]}, {"ar": "كلية العلوم الاجتماعية", "en": "Social Sciences", "majors": [{"en": "Geography (GIS)", "ar": "الجغرافيا (نظم المعلومات الجغرافية)"}, {"en": "Information Studies", "ar": "دراسات المعلومات"}, {"en": "Political Science", "ar": "العلوم السياسية"}, {"en": "Psychology", "ar": "علم النفس"}, {"en": "Sociology and Social Work", "ar": "علم الاجتماع والخدمة الاجتماعية"}]}, {"ar": "كلية التربية", "en": "Education", "majors": [{"en": "Kindergarten", "ar": "رياض الأطفال"}, {"en": "Elementary (Arts track)", "ar": "الابتدائية - المسار الأدبي (عربي، إنجليزي، دراسات إسلامية، دراسات اجتماعية)"}, {"en": "Elementary (Science track)", "ar": "الابتدائية - المسار العلمي (رياضيات، علوم)"}, {"en": "Middle and Secondary (Sciences)", "ar": "المتوسط والثانوي - علمي (رياضيات، كيمياء، فيزياء، أحياء، جيولوجيا، حاسوب)"}, {"en": "Middle and Secondary (Arts)", "ar": "المتوسط والثانوي - أدبي (عربي، إنجليزي، تاريخ، جغرافيا، علم نفس، فلسفة، دراسات إسلامية)"}]}, {"ar": "كلية العلوم الطبية المساندة", "en": "Allied Health Sciences", "majors": [{"en": "Biomedical Science Technology", "ar": "تكنولوجيا العلوم الطبية الحيوية"}, {"en": "Radiologic Sciences", "ar": "علوم الأشعة"}, {"en": "Physical Therapy", "ar": "العلاج الطبيعي"}, {"en": "Occupational Therapy", "ar": "العلاج المهني"}, {"en": "Health Information Management", "ar": "إدارة المعلومات الصحية"}]}, {"ar": "كلية الصحة العامة", "en": "Public Health", "majors": [{"en": "Public Health Practice", "ar": "ممارسة الصحة العامة"}]}, {"ar": "كلية الطب", "en": "Medicine", "majors": [{"en": "Medicine", "ar": "الطب البشري"}]}, {"ar": "كلية الصيدلة", "en": "Pharmacy", "majors": [{"en": "Pharmacy (PharmD)", "ar": "الصيدلة (دكتور صيدلة)"}]}, {"ar": "كلية طب الأسنان", "en": "Dentistry", "majors": [{"en": "Dentistry", "ar": "طب الأسنان"}]}, {"ar": "كلية الحقوق", "en": "Law", "majors": [{"en": "Law", "ar": "القانون (برنامج موحد)"}]}, {"ar": "كلية العمارة", "en": "Architecture", "majors": [{"en": "Architecture", "ar": "العمارة"}, {"en": "Landscape Architecture", "ar": "عمارة البيئة"}, {"en": "Visual and Interior Design", "ar": "التصميم المرئي والداخلي"}]}, {"ar": "كلية الشريعة", "en": "Sharia", "majors": [{"en": "Creed and Dawah", "ar": "العقيدة والدعوة"}, {"en": "Tafsir and Hadith", "ar": "التفسير والحديث"}, {"en": "Fiqh and Usul Al-Fiqh", "ar": "الفقه وأصوله"}, {"en": "Sharia Politics", "ar": "السياسة الشرعية"}]}]}, {"official": "Gulf University for Science and Technology", "ar": "الجامعة الخليجية للعلوم والتكنولوجيا", "en": "Gulf University for Science and Technology", "type": "private", "aliases": ["GUST"], "verified": true, "colleges": [{"ar": "كلية إدارة الأعمال", "en": "Business Administration", "majors": [{"en": "Accounting", "ar": "المحاسبة"}, {"en": "Finance", "ar": "التمويل والمنشآت المالية"}, {"en": "Management Information Systems", "ar": "إدارة نظم المعلومات"}, {"en": "International Business", "ar": "إدارة الأعمال الدولية"}, {"en": "Marketing", "ar": "التسويق"}]}, {"ar": "كلية الآداب والعلوم", "en": "Arts and Sciences", "majors": [{"en": "English (Literature)", "ar": "اللغة الإنجليزية (الأدب)"}, {"en": "English (Translation and Linguistics)", "ar": "اللغة الإنجليزية (الترجمة واللغويات)"}, {"en": "Mass Communication (Radio and Television)", "ar": "الإعلام (الراديو والتلفزيون)"}, {"en": "Mass Communication (Public Relations and Communication)", "ar": "الإعلام (العلاقات العامة والاتصال)"}, {"en": "Mass Communication (Visual Communication)", "ar": "الإعلام (الاتصال المرئي)"}, {"en": "Computer Science", "ar": "علوم الحاسوب"}]}, {"ar": "كلية الهندسة والعمارة", "en": "Engineering and Architecture", "majors": [{"en": "Computer Engineering", "ar": "هندسة الحاسوب"}]}]}, {"official": "American University of Kuwait", "ar": "الجامعة الأمريكية في الكويت", "en": "American University of Kuwait", "type": "private", "aliases": ["AUK"], "verified": true, "colleges": [{"ar": "كلية العلوم والفنون", "en": "Arts and Sciences", "majors": [{"en": "Design (Graphic Design)", "ar": "التصميم (مسار التصميم الجرافيكي)"}, {"en": "Media and Communication Studies", "ar": "الإعلام والدراسات الإعلامية"}, {"en": "English Language and Literature", "ar": "اللغة الإنجليزية وآدابها"}, {"en": "International Relations", "ar": "العلاقات الدولية"}, {"en": "Social and Behavioral Sciences (Anthropology)", "ar": "العلوم الاجتماعية والسلوكية (مسار الأنثروبولوجيا)"}]}, {"ar": "كلية الهندسة والعلوم التطبيقية", "en": "Engineering and Applied Sciences", "majors": [{"en": "Computer Engineering", "ar": "هندسة الكمبيوتر"}, {"en": "Electrical Engineering", "ar": "الهندسة الكهربائية"}, {"en": "Systems Engineering", "ar": "هندسة الأنظمة"}, {"en": "Computer Science", "ar": "علوم الكمبيوتر"}, {"en": "Information Systems", "ar": "نظم المعلومات"}]}, {"ar": "كلية الإدارة والاقتصاد", "en": "Business and Economics", "majors": [{"en": "Accounting", "ar": "المحاسبة"}, {"en": "Finance", "ar": "التمويل"}, {"en": "Management", "ar": "الإدارة"}, {"en": "Marketing", "ar": "التسويق"}, {"en": "Economics", "ar": "الاقتصاد"}, {"en": "Human Resource Management", "ar": "إدارة الموارد البشرية"}]}]}, {"official": "American University of the Middle East", "ar": "الجامعة الأمريكية في الشرق الأوسط", "en": "American University of the Middle East", "type": "private", "aliases": ["AUM"], "verified": true, "colleges": [{"ar": "كلية الهندسة والتكنولوجيا", "en": "Engineering and Technology", "majors": [{"en": "Civil Engineering", "ar": "الهندسة المدنية"}, {"en": "Mechanical Engineering", "ar": "الهندسة الميكانيكية"}, {"en": "Electrical Engineering", "ar": "الهندسة الكهربائية"}, {"en": "Chemical Engineering", "ar": "الهندسة الكيميائية"}, {"en": "Industrial Engineering", "ar": "الهندسة الصناعية"}, {"en": "Computer Engineering", "ar": "هندسة الكمبيوتر"}, {"en": "Architectural Engineering", "ar": "الهندسة المعمارية"}, {"en": "Information Systems and Technology / Telecommunications and Networking", "ar": "نظم وتكنولوجيا المعلومات / تكنولوجيا الاتصالات والشبكات"}]}, {"ar": "كلية إدارة الأعمال", "en": "Business Administration", "majors": [{"en": "Accounting", "ar": "المحاسبة"}, {"en": "Finance", "ar": "التمويل"}, {"en": "Human Resource Management", "ar": "إدارة الموارد البشرية"}, {"en": "Marketing", "ar": "التسويق"}, {"en": "Management Information Systems (MIS)", "ar": "نظم المعلومات الإدارية (MIS)"}]}]}, {"official": "Arab Open University - Kuwait", "ar": "الجامعة العربية المفتوحة - الكويت", "en": "Arab Open University - Kuwait", "type": "private", "aliases": ["AOU", "Arab Open University"], "verified": true, "colleges": [{"ar": "كلية الدراسات التجارية", "en": "Business Studies", "majors": [{"en": "Management (Systems Practice)", "ar": "الإدارة / النظم الإدارية"}, {"en": "Marketing", "ar": "التسويق"}, {"en": "Accounting", "ar": "المحاسبة"}, {"en": "Economics", "ar": "الاقتصاد"}, {"en": "Management Information Systems", "ar": "نظم المعلومات الإدارية"}]}, {"ar": "كلية الدراسات الحاسوبية", "en": "Computer Studies", "majors": [{"en": "IT and Computing (Computer Science)", "ar": "تقنية المعلومات والحوسبة (علوم الكمبيوتر)"}, {"en": "IT and Computing (Computing with Business)", "ar": "تقنية المعلومات والحوسبة (الحوسبة مع الأعمال)"}, {"en": "IT and Computing (Networking and Data Security)", "ar": "تقنية المعلومات والحوسبة (الشبكات وأمن البيانات)"}, {"en": "IT and Computing (Web Development)", "ar": "تقنية المعلومات والحوسبة (تطوير حلول الويب)"}]}, {"ar": "كلية دراسات اللغات", "en": "Language Studies", "majors": [{"en": "English Language and Literature", "ar": "اللغة الإنجليزية وآدابها"}]}]}, {"official": "International University of Kuwait", "ar": "الجامعة الدولية في الكويت", "en": "International University of Kuwait", "type": "private", "aliases": ["IUK"], "verified": true, "colleges": [{"ar": "كلية إدارة الأعمال", "en": "Business Administration", "majors": [{"en": "Accounting", "ar": "المحاسبة"}, {"en": "Banking Services and Investment Management", "ar": "الخدمات المصرفية وإدارة الاستثمار"}, {"en": "Finance and Financial Technology", "ar": "المالية والتقنية المالية"}, {"en": "Healthcare Management", "ar": "إدارة الرعاية الصحية"}, {"en": "Information Systems", "ar": "نظم المعلومات"}, {"en": "Marketing", "ar": "التسويق"}, {"en": "Supply Chain Management and Logistics", "ar": "إدارة سلاسل الإمداد والخدمات اللوجستية"}]}, {"ar": "كلية الهندسة", "en": "Engineering", "majors": [{"en": "Industrial Engineering", "ar": "الهندسة الصناعية"}, {"en": "Biomedical Engineering", "ar": "الهندسة الطبية الحيوية"}, {"en": "Electrical Engineering", "ar": "الهندسة الكهربائية"}, {"en": "Computer Engineering", "ar": "هندسة الحاسوب"}, {"en": "Computer Science and Cybersecurity Engineering", "ar": "علوم الحاسوب وهندسة الأمن السيبراني"}, {"en": "Architectural and Design Engineering", "ar": "الهندسة المعمارية والتصميم"}, {"en": "Civil and Architectural Engineering", "ar": "الهندسة المدنية والمعمارية"}]}, {"ar": "كلية الآداب", "en": "Arts", "majors": [{"en": "English Language", "ar": "اللغة الإنجليزية"}, {"en": "Communication and Speech Disorders", "ar": "اضطرابات التواصل والنطق"}, {"en": "Journalism and Electronic Publishing", "ar": "الصحافة والنشر الإلكتروني"}, {"en": "Public Relations and Advertising", "ar": "العلاقات العامة والإعلان"}, {"en": "Sociology", "ar": "علم الاجتماع"}, {"en": "Social Services", "ar": "الخدمات الاجتماعية"}]}]}, {"official": "Kuwait College of Science and Technology", "ar": "كلية الكويت للعلوم والتكنولوجيا", "en": "Kuwait College of Science and Technology", "type": "private", "aliases": ["KCST"], "verified": true, "colleges": [{"ar": "كلية الهندسة والتكنولوجيا", "en": "Engineering and Technology", "majors": [{"en": "Computer Engineering", "ar": "هندسة الحاسوب"}, {"en": "Electronics and Communications Engineering", "ar": "هندسة الإلكترونيات والاتصالات"}, {"en": "Computer Science", "ar": "علوم الكمبيوتر"}]}]}, {"official": "Abdullah Al Salem University", "ar": "جامعة عبدالله السالم", "en": "Abdullah Al Salem University", "type": "public", "aliases": ["AASU"], "verified": true, "colleges": [{"ar": "كلية هندسة الحاسوب والنظم", "en": "Systems and Computer Engineering", "majors": [{"en": "Computer Systems Engineering", "ar": "هندسة أنظمة الحاسوب"}, {"en": "Cybersecurity Engineering", "ar": "هندسة الأمن السيبراني"}, {"en": "Data Science and Artificial Intelligence", "ar": "علوم البيانات والذكاء الاصطناعي"}, {"en": "Software Engineering", "ar": "هندسة البرمجيات"}]}, {"ar": "كلية الهندسة والطاقة", "en": "Engineering and Energy", "majors": [{"en": "Biomedical Engineering and Microsystems", "ar": "الهندسة الطبية الحيوية والآلات الدقيقة"}, {"en": "Agricultural and Bioresource Engineering", "ar": "الهندسة الزراعية والموارد الحيوية"}, {"en": "Energy Systems Engineering", "ar": "هندسة أنظمة الطاقة"}, {"en": "Environmental Engineering and Sustainability", "ar": "الهندسة البيئية والاستدامة"}, {"en": "Materials Science and Engineering", "ar": "هندسة وعلوم المواد"}, {"en": "Robotics and Mechatronics Engineering", "ar": "هندسة الروبوتات والميكاترونكس"}]}, {"ar": "كلية إدارة وريادة الأعمال", "en": "Business Management and Entrepreneurship", "majors": [{"en": "Digital Marketing", "ar": "التسويق الرقمي"}, {"en": "Entrepreneurship and Innovation", "ar": "ريادة الأعمال والابتكار"}, {"en": "Supply Chain and Logistics Management", "ar": "إدارة سلسلة التوريد والخدمات اللوجستية"}]}, {"ar": "كلية الطب والعلوم الصحية", "en": "Medicine and Health Sciences", "majors": [{"en": "Medicine (MD)", "ar": "الطب (دكتور في الطب)"}]}, {"ar": "كلية الدراسات التكاملية", "en": "Integrative Studies", "majors": []}]}, {"official": "American International University - Kuwait", "ar": "الجامعة الأمريكية الدولية - الكويت", "en": "American International University - Kuwait", "type": "private", "aliases": ["AIU"], "verified": true, "colleges": [{"ar": "كلية إدارة الأعمال", "en": "Business Administration", "majors": [{"en": "Entrepreneurship", "ar": "ريادة الأعمال"}, {"en": "Marketing", "ar": "التسويق"}, {"en": "Accounting", "ar": "المحاسبة"}, {"en": "Finance", "ar": "المالية"}, {"en": "Global Supply Chain Management", "ar": "إدارة سلاسل الإمداد العالمية"}, {"en": "Management", "ar": "الإدارة"}]}, {"ar": "كلية العمارة والتصميم", "en": "Architecture & Design", "majors": [{"en": "Graphic Design", "ar": "التصميم الجرافيكي"}, {"en": "Interior Design", "ar": "التصميم الداخلي"}]}, {"ar": "كلية الهندسة", "en": "Engineering", "majors": [{"en": "Chemical Engineering", "ar": "الهندسة الكيميائية"}, {"en": "Biomedical Engineering", "ar": "الهندسة الطبية الحيوية"}, {"en": "Civil Engineering", "ar": "الهندسة المدنية"}, {"en": "Computer Science", "ar": "علوم الحاسوب"}, {"en": "Electrical and Computer Engineering", "ar": "الهندسة الكهربائية وهندسة الحاسوب"}, {"en": "Industrial Engineering", "ar": "الهندسة الصناعية"}, {"en": "Mechanical Engineering", "ar": "الهندسة الميكانيكية"}]}, {"ar": "كلية التربية", "en": "Education", "majors": [{"en": "Education in Science", "ar": "التربية في العلوم"}, {"en": "Secondary Education in English", "ar": "التعليم الثانوي في اللغة الإنجليزية"}, {"en": "Secondary Education in Math", "ar": "التعليم الثانوي في الرياضيات"}, {"en": "Elementary Education in Math", "ar": "التعليم الابتدائي في الرياضيات"}, {"en": "Elementary Education in English", "ar": "التعليم الابتدائي في اللغة الإنجليزية"}]}, {"ar": "كلية الآداب والعلوم", "en": "Arts and Sciences", "majors": [{"en": "Biotechnology", "ar": "التقنية الحيوية"}]}]}, {"official": "Kuwait Maastricht Business School", "ar": "كلية كويت ماسترخت لإدارة الأعمال", "en": "Kuwait Maastricht Business School", "type": "private", "aliases": ["KMBS", "Kuwait Maastricht College of Management"], "verified": true, "colleges": [{"ar": "كلية كويت ماسترخت لإدارة الأعمال", "en": "Kuwait Maastricht Business School", "majors": [{"en": "MBA Program", "ar": "ماجستير إدارة الأعمال (MBA)"}, {"en": "MM Program", "ar": "ماجستير الإدارة العامة (MM)"}]}]}]$catalog$::jsonb;
  u jsonb; c jsonb; m jsonb;
  uid uuid; cid uuid;
  ui int := 0; ci int; mi int;
BEGIN
  IF EXISTS (SELECT 1 FROM public.catalog_universities) THEN RETURN; END IF;
  FOR u IN SELECT * FROM jsonb_array_elements(cat) LOOP
    ui := ui + 1;
    INSERT INTO public.catalog_universities (official, ar, en, type, aliases, verified, sort)
    VALUES (u->>'official', u->>'ar', u->>'en', u->>'type',
            COALESCE(ARRAY(SELECT jsonb_array_elements_text(u->'aliases')), '{}'),
            (u->>'verified')::boolean, ui)
    RETURNING id INTO uid;
    ci := 0;
    FOR c IN SELECT * FROM jsonb_array_elements(u->'colleges') LOOP
      ci := ci + 1;
      INSERT INTO public.catalog_colleges (university_id, ar, en, sort)
      VALUES (uid, c->>'ar', c->>'en', ci) RETURNING id INTO cid;
      mi := 0;
      FOR m IN SELECT * FROM jsonb_array_elements(c->'majors') LOOP
        mi := mi + 1;
        INSERT INTO public.catalog_majors (college_id, en, ar, sort)
        VALUES (cid, m->>'en', m->>'ar', mi);
      END LOOP;
    END LOOP;
  END LOOP;
END
$seed$;

-- 4) Technical-admin tools -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_admins()
RETURNS TABLE (user_id uuid, email text, role text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_tech_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT a.user_id, u.email::text, a.role, a.created_at
    FROM public.app_admins a JOIN auth.users u ON u.id = a.user_id
    ORDER BY a.created_at;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_admin(p_email text, p_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_tech_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_role NOT IN ('student', 'tech') THEN RAISE EXCEPTION 'bad role'; END IF;
  SELECT id INTO v_id FROM auth.users WHERE lower(email) = lower(btrim(p_email));
  IF v_id IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
  -- Never demote the last technical admin (including yourself).
  IF p_role <> 'tech' AND EXISTS (SELECT 1 FROM public.app_admins WHERE user_id = v_id AND role = 'tech')
     AND (SELECT count(*) FROM public.app_admins WHERE role = 'tech') <= 1 THEN
    RAISE EXCEPTION 'last tech admin';
  END IF;
  INSERT INTO public.app_admins (user_id, role) VALUES (v_id, p_role)
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
END $$;

CREATE OR REPLACE FUNCTION public.admin_remove_admin(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_tech_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF EXISTS (SELECT 1 FROM public.app_admins WHERE user_id = p_user_id AND role = 'tech')
     AND (SELECT count(*) FROM public.app_admins WHERE role = 'tech') <= 1 THEN
    RAISE EXCEPTION 'last tech admin';
  END IF;
  DELETE FROM public.app_admins WHERE user_id = p_user_id;
END $$;

-- Aggregate platform numbers only (no student content).
CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.is_tech_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'students', (SELECT count(*) FROM public.profiles),
    'onboarded', (SELECT count(*) FROM public.profiles WHERE onboarding_completed),
    'courses', (SELECT count(*) FROM public.courses),
    'open_reports', (SELECT count(*) FROM public.catalog_reports WHERE status = 'open'),
    'archives', (SELECT count(*) FROM public.university_archives),
    'ai_calls_24h', (SELECT count(*) FROM public.ai_usage_log WHERE created_at > now() - interval '24 hours'),
    'by_university', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('university', university, 'count', n) ORDER BY n DESC)
      FROM (SELECT COALESCE(NULLIF(btrim(university), ''), '-') AS university, count(*) AS n
            FROM public.profiles GROUP BY 1) x), '[]'::jsonb),
    'ai_by_endpoint_24h', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('endpoint', endpoint, 'count', n) ORDER BY n DESC)
      FROM (SELECT endpoint, count(*) AS n FROM public.ai_usage_log
            WHERE created_at > now() - interval '24 hours' GROUP BY 1) y), '[]'::jsonb)
  ) INTO r;
  RETURN r;
END $$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['is_tech_admin()', 'my_admin_role()', 'admin_list_admins()',
      'admin_set_admin(text, text)', 'admin_remove_admin(uuid)', 'admin_overview()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;
