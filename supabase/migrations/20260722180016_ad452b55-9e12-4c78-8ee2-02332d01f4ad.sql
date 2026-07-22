DROP POLICY IF EXISTS "team_positions manage by leadership" ON public.team_positions;
CREATE POLICY "team_positions manage by admin or leadership" ON public.team_positions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_leadership(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_leadership(auth.uid()));

DROP POLICY IF EXISTS "team_members manage by leadership" ON public.team_members;
CREATE POLICY "team_members manage by admin or leadership" ON public.team_members
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_leadership(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_leadership(auth.uid()));