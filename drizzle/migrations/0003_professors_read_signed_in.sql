DROP POLICY IF EXISTS professors_read ON public.professors;
CREATE POLICY professors_read ON public.professors FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);