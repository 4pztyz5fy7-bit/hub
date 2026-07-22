REVOKE ALL ON public.team_positions FROM anon;
REVOKE ALL ON public.team_positions FROM public;
REVOKE ALL ON public.team_members FROM anon;
REVOKE ALL ON public.team_members FROM public;
REVOKE ALL ON public.user_roles FROM anon;
REVOKE ALL ON public.user_roles FROM public;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_positions TO authenticated;
GRANT ALL ON public.team_positions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;