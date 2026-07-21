GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_positions TO authenticated;
GRANT ALL ON public.team_positions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
GRANT EXECUTE ON FUNCTION public.current_team_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_leadership(uuid) TO authenticated;

-- Remove duplicate leadership position that isn't system
DELETE FROM public.team_positions WHERE code = 'rukov';