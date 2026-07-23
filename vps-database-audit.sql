-- =========================================================================
-- KVANT: полный аудит и корректировка базы (безопасность + чистота).
-- =========================================================================

-- 1. Убираем дубли RLS-политик на profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- 2. competition_participants: закрываем SELECT (USING true) — теперь виден только
--    свой ряд; полный список отдаёт SECURITY DEFINER функция get_competition_leaderboard.
DROP POLICY IF EXISTS "read participants" ON public.competition_participants;
CREATE POLICY "participants read self or admin"
  ON public.competition_participants FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 3. email_settings: явная политика DELETE только для админов (fail-closed уже был,
--    но декларация делает намерение явным и убирает предупреждение сканера).
CREATE POLICY "email_settings_admin_delete"
  ON public.email_settings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. FORCE ROW LEVEL SECURITY на всех пользовательских таблицах — RLS применяется
--    даже к владельцу таблицы (защита от прямых запросов сервисной ролью в приложении).
ALTER TABLE public.achievements              FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ai_settings               FORCE ROW LEVEL SECURITY;
ALTER TABLE public.banners                   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.competition_participants  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.conversions               FORCE ROW LEVEL SECURITY;
ALTER TABLE public.link_requests             FORCE ROW LEVEL SECURITY;
ALTER TABLE public.news_posts                FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notifications             FORCE ROW LEVEL SECURITY;
ALTER TABLE public.offers                    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests           FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.promo_activations         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes               FORCE ROW LEVEL SECURITY;
ALTER TABLE public.recruiter_category_access FORCE ROW LEVEL SECURITY;
ALTER TABLE public.recruiter_offer_access    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.team_members              FORCE ROW LEVEL SECURITY;
ALTER TABLE public.team_positions            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements         FORCE ROW LEVEL SECURITY;

-- 5. Revoke EXECUTE у anon/public на функции, которые не должны вызываться извне.
--    Оставляем публичный доступ только для: get_landing_stats, level_bonus_pct, level_min_earned.
REVOKE ALL ON FUNCTION public.auto_apply_promos()                     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_settle_competitions()              FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.award_achievements()                    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_recruit_offer(uuid, text)           FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.competitions_notify_start()             FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.competitions_notify_status()            FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_super_admin_luxmailu()            FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user()                       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.link_requests_set_code()                FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_competition_ranks()              FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_support_message()                FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recompute_offer_stats(text)             FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at()                        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.support_on_message()                    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.support_tickets_guard()                 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.team_members_sync_role()                FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_recompute_offer_stats()             FROM PUBLIC, anon, authenticated;

-- Пользовательские SECURITY DEFINER функции: авторизованный доступ, но не анонимный.
REVOKE ALL ON FUNCTION public.admin_delete_payout(uuid)                                       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_link_request_status(uuid, link_status, numeric)       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_team_permissions()                                      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_competition_leaderboard(uuid, integer)                      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_leaderboard(text, integer)                                  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role)                                        FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin()                                                      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_leadership(uuid)                                             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_team_member(uuid)                                            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_competition(uuid)                                          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.settle_competition(uuid)                                        FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.touch_streak()                                                  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_total_earned(uuid)                                         FROM PUBLIC, anon;

-- Гарантируем EXECUTE для authenticated там, где клиент действительно вызывает.
GRANT EXECUTE ON FUNCTION public.admin_delete_payout(uuid)                                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_link_request_status(uuid, link_status, numeric)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_achievements()                                         TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_recruit_offer(uuid, text)                                TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_team_permissions()                                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_competition_leaderboard(uuid, integer)                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, integer)                               TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role)                                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin()                                                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_leadership(uuid)                                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid)                                         TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_competition(uuid)                                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_competition(uuid)                                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_streak()                                               TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_total_earned(uuid)                                      TO authenticated;

-- Публичные функции лендинга остаются доступны и anon, и authenticated.
GRANT EXECUTE ON FUNCTION public.get_landing_stats()          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.level_bonus_pct(numeric)     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.level_min_earned(level_tier) TO anon, authenticated;

-- 6. Индексы под самые частые фильтры (безопасно и ускоряет чтение).
CREATE INDEX IF NOT EXISTS idx_conversions_user_status_created
  ON public.conversions (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversions_offer_id
  ON public.conversions (offer_id);
CREATE INDEX IF NOT EXISTS idx_link_requests_user_created
  ON public.link_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_link_requests_offer_status
  ON public.link_requests (offer_id, status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_user_status
  ON public.payout_requests (user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_created
  ON public.support_messages (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_roles_user
  ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_competition_participants_comp
  ON public.competition_participants (competition_id, user_id);