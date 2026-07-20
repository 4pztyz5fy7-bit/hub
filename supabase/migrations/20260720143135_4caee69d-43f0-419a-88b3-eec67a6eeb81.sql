
-- Streak fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS streak_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_best integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_date date;

-- Achievements catalog
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'trophy',
  tier text NOT NULL DEFAULT 'bronze', -- bronze | silver | gold | platinum
  metric text NOT NULL,                -- earned | conversions | requests | streak | leaderboard
  threshold numeric NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.achievements TO authenticated;
GRANT ALL    ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements are public to signed-in users"
  ON public.achievements FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage achievements"
  ON public.achievements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- User → achievement unlocks
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);
GRANT SELECT, INSERT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read their achievements"
  ON public.user_achievements FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- Seed achievements
INSERT INTO public.achievements (code, name, description, icon, tier, metric, threshold, sort_order) VALUES
  ('first_step',      'Первый шаг',         'Создайте свою первую заявку',       'rocket',    'bronze',   'requests',    1,       10),
  ('starter',         'Разгон',             'Получите 1-ю оплаченную конверсию', 'sparkles',  'bronze',   'conversions', 1,       20),
  ('ten_conversions', 'Десятка',            '10 оплаченных конверсий',           'target',    'silver',   'conversions', 10,      30),
  ('fifty_conversions','Полусотня',         '50 оплаченных конверсий',           'target',    'gold',     'conversions', 50,      40),
  ('income_10k',      'Первые 10 000 ₽',    'Заработайте 10 000 ₽',              'coins',     'bronze',   'earned',      10000,   50),
  ('income_100k',     'Сотка',              'Заработайте 100 000 ₽',             'gem',       'silver',   'earned',      100000,  60),
  ('income_500k',     'Полмиллиона',        'Заработайте 500 000 ₽',             'crown',     'gold',     'earned',      500000,  70),
  ('income_1m',       'Легенда партнёрки',  'Заработайте 1 000 000 ₽',           'trophy',    'platinum', 'earned',      1000000, 80),
  ('streak_7',        'Неделя в строю',     '7 дней подряд заходите в кабинет',  'zap',       'silver',   'streak',      7,       90),
  ('streak_30',       'Месяц дисциплины',   '30 дней подряд заходите в кабинет', 'zap',       'gold',     'streak',      30,      100)
ON CONFLICT (code) DO NOTHING;

-- Update streak on activity
CREATE OR REPLACE FUNCTION public.touch_streak()
RETURNS TABLE(streak_days integer, streak_best integer, last_activity_date date)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _last date;
  _cur integer;
  _best integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT p.last_activity_date, p.streak_days, p.streak_best
    INTO _last, _cur, _best FROM public.profiles p WHERE p.id = _uid;
  IF _last IS NULL OR _today - _last > 1 THEN
    _cur := 1;
  ELSIF _today - _last = 1 THEN
    _cur := COALESCE(_cur,0) + 1;
  END IF;
  _best := GREATEST(COALESCE(_best,0), _cur);
  UPDATE public.profiles
    SET streak_days = _cur, streak_best = _best, last_activity_date = _today, updated_at = now()
    WHERE id = _uid;
  RETURN QUERY SELECT _cur, _best, _today;
END; $$;
GRANT EXECUTE ON FUNCTION public.touch_streak() TO authenticated;

-- Award achievements for the caller
CREATE OR REPLACE FUNCTION public.award_achievements()
RETURNS TABLE(unlocked_code text, unlocked_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _earned numeric;
  _conv int;
  _req int;
  _streak int;
  _r record;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT COALESCE(SUM(amount),0) INTO _earned
    FROM public.conversions WHERE user_id = _uid AND status = 'ok';
  SELECT COUNT(*) INTO _conv
    FROM public.conversions WHERE user_id = _uid AND status = 'ok';
  SELECT COUNT(*) INTO _req
    FROM public.link_requests WHERE user_id = _uid;
  SELECT COALESCE(streak_days,0) INTO _streak
    FROM public.profiles WHERE id = _uid;

  FOR _r IN
    SELECT a.* FROM public.achievements a
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_achievements ua
      WHERE ua.user_id = _uid AND ua.achievement_id = a.id
    )
    AND (
      (a.metric = 'earned'      AND _earned >= a.threshold) OR
      (a.metric = 'conversions' AND _conv   >= a.threshold) OR
      (a.metric = 'requests'    AND _req    >= a.threshold) OR
      (a.metric = 'streak'      AND _streak >= a.threshold)
    )
  LOOP
    INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (_uid, _r.id) ON CONFLICT DO NOTHING;
    INSERT INTO public.notifications (user_id, kind, title, body, status)
      VALUES (_uid, 'achievement', 'Новое достижение: ' || _r.name, _r.description, 'unlocked');
    unlocked_code := _r.code;
    unlocked_name := _r.name;
    RETURN NEXT;
  END LOOP;
END; $$;
GRANT EXECUTE ON FUNCTION public.award_achievements() TO authenticated;

-- Leaderboard by paid income
CREATE OR REPLACE FUNCTION public.get_leaderboard(_period text DEFAULT 'week', _limit int DEFAULT 20)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  total numeric,
  conversions bigint,
  is_me boolean
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
  _since timestamptz;
  _me uuid := auth.uid();
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  _since := CASE _period
    WHEN 'day'   THEN now() - interval '1 day'
    WHEN 'week'  THEN now() - interval '7 days'
    WHEN 'month' THEN now() - interval '30 days'
    ELSE now() - interval '365 days'
  END;

  RETURN QUERY
  SELECT
    c.user_id,
    COALESCE(NULLIF(p.display_name,''), 'Партнёр') AS display_name,
    p.avatar_url,
    COALESCE(SUM(c.amount),0)::numeric AS total,
    COUNT(*)::bigint AS conversions,
    (c.user_id = _me) AS is_me
  FROM public.conversions c
  LEFT JOIN public.profiles p ON p.id = c.user_id
  WHERE c.status = 'ok' AND c.created_at >= _since
  GROUP BY c.user_id, p.display_name, p.avatar_url
  ORDER BY total DESC
  LIMIT _limit;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text,int) TO authenticated;
