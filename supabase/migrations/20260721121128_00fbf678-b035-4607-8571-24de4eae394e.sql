CREATE OR REPLACE FUNCTION public.is_team_member(_uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.user_id = _uid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_leadership(_uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.team_positions tp ON tp.id = tm.position_id
    WHERE tm.user_id = _uid AND tp.is_leadership = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_leadership(uuid) TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_positions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_positions TO service_role;
GRANT ALL ON public.team_members TO service_role;

DROP POLICY IF EXISTS "team_members read for team" ON public.team_members;
DROP POLICY IF EXISTS "team_members manage by leadership" ON public.team_members;
DROP POLICY IF EXISTS "team_positions read for team" ON public.team_positions;
DROP POLICY IF EXISTS "team_positions manage by leadership" ON public.team_positions;

CREATE POLICY "team_members read for team"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_team_member(auth.uid())
);

CREATE POLICY "team_members manage by leadership"
ON public.team_members
FOR ALL
TO authenticated
USING (
  public.is_leadership(auth.uid())
)
WITH CHECK (
  public.is_leadership(auth.uid())
);

CREATE POLICY "team_positions read for team"
ON public.team_positions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_team_member(auth.uid())
);

CREATE POLICY "team_positions manage by leadership"
ON public.team_positions
FOR ALL
TO authenticated
USING (
  public.is_leadership(auth.uid())
)
WITH CHECK (
  public.is_leadership(auth.uid())
);