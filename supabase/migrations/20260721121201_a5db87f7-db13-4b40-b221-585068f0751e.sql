REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_leadership(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_team_permissions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_leadership(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_team_permissions() TO authenticated, service_role;