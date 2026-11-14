DROP POLICY IF EXISTS "professors_read" ON public.professors;
CREATE POLICY "professors_read" ON public.professors FOR SELECT TO authenticated
USING (created_by = auth.uid() OR public.can_see_professor(id));