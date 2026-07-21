-- Revoke anon EXECUTE from privileged SECURITY DEFINER functions.
-- Keep get_landing_stats callable by anon (public landing).
DO $$
DECLARE
  _fn text;
  _fns text[] := ARRAY[
    'has_role(uuid, app_role)',
    'is_admin()',
    'touch_streak()',
    'award_achievements()',
    'join_competition(uuid)',
    'settle_competition(uuid)',
    'get_leaderboard(text, integer)',
    'get_competition_leaderboard(uuid, integer)',
    'admin_set_link_request_status(uuid, link_status, numeric)',
    'admin_delete_payout(uuid)',
    'notify_competition_ranks()',
    'auto_settle_competitions()',
    'user_total_earned(uuid)',
    'handle_new_user()',
    'support_on_message()',
    'support_tickets_guard()',
    'competitions_notify_start()',
    'competitions_notify_status()'
  ];
BEGIN
  FOREACH _fn IN ARRAY _fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', _fn);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'skip %: %', _fn, SQLERRM;
    END;
  END LOOP;
END $$;

-- Ensure authenticated users can still call the RPCs they need.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_streak() TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_achievements() TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_competition(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_competition_leaderboard(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_link_request_status(uuid, link_status, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_payout(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_competition(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_total_earned(uuid) TO authenticated;
