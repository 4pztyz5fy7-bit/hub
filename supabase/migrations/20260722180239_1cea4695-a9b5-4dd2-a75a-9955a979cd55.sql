GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_positions TO authenticated;
GRANT ALL ON public.team_positions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_leadership(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_team_permissions() TO authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_leadership(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.current_team_permissions() TO service_role;