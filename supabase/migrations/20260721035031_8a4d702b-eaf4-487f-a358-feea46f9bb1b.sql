
-- 1) Notify eligible users when a competition starts (INSERT active OR UPDATE inactive->active)
CREATE OR REPLACE FUNCTION public.competitions_notify_start()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _became_active boolean;
  _min numeric;
BEGIN
  _became_active := (TG_OP = 'INSERT' AND NEW.active)
                 OR (TG_OP = 'UPDATE' AND NEW.active AND COALESCE(OLD.active, false) = false);
  IF NOT _became_active THEN RETURN NEW; END IF;
  IF NEW.settled_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.ends_at <= now() THEN RETURN NEW; END IF;

  _min := public.level_min_earned(NEW.min_level);

  INSERT INTO public.notifications (user_id, kind, title, body, status)
  SELECT
    p.id,
    'competition',
    'Новый турнир: ' || NEW.title,
    'Открыт приём заявок. Призовой фонд ' || NEW.prize_pool::text || ' ₽. Доступно уровню '
      || CASE NEW.min_level
           WHEN 'start' THEN 'Старт'
           WHEN 'silver' THEN 'Серебро'
           WHEN 'gold' THEN 'Золото'
           WHEN 'platinum' THEN 'Платина'
           WHEN 'diamond' THEN 'Бриллиант'
         END || '+.',
    'active'
  FROM public.profiles p
  WHERE (
    SELECT COALESCE(SUM(cx.amount),0)
    FROM public.conversions cx
    WHERE cx.user_id = p.id AND cx.status = 'ok'
  ) >= _min;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_competitions_notify_start ON public.competitions;
CREATE TRIGGER trg_competitions_notify_start
  AFTER INSERT OR UPDATE ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION public.competitions_notify_start();

-- 2) Notify participants on status/date changes
CREATE OR REPLACE FUNCTION public.competitions_notify_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _msg text;
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;
  IF NEW.settled_at IS NOT NULL AND OLD.settled_at IS NULL THEN
    RETURN NEW; -- settle handles its own notifications
  END IF;

  IF OLD.active = true AND NEW.active = false AND NEW.settled_at IS NULL THEN
    _msg := 'Приём заявок временно приостановлен.';
  ELSIF OLD.ends_at IS DISTINCT FROM NEW.ends_at AND NEW.active AND NEW.settled_at IS NULL THEN
    _msg := 'Изменена дата завершения: ' || to_char(NEW.ends_at AT TIME ZONE 'UTC', 'DD.MM.YYYY HH24:MI') || ' UTC.';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, kind, title, body, status)
  SELECT cp.user_id, 'competition', 'Обновление турнира: ' || NEW.title, _msg, 'active'
  FROM public.competition_participants cp
  WHERE cp.competition_id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_competitions_notify_status ON public.competitions;
CREATE TRIGGER trg_competitions_notify_status
  AFTER UPDATE ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION public.competitions_notify_status();

-- 3) Extend settle_competition: notify ALL participants that turnir ended (winners get their place too)
CREATE OR REPLACE FUNCTION public.settle_competition(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _c public.competitions%ROWTYPE;
  _actor uuid := auth.uid();
  _is_admin boolean := false;
  _p jsonb;
  _place int;
  _amount numeric;
  _label text;
  _row record;
  _winners jsonb := '[]'::jsonb;
  _count int := 0;
  _total numeric := 0;
  _winner_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF _actor IS NOT NULL THEN
    _is_admin := public.has_role(_actor, 'admin');
    IF NOT _is_admin THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  END IF;

  SELECT * INTO _c FROM public.competitions WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF _c.settled_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_settled', 'settled_at', _c.settled_at);
  END IF;

  FOR _p IN SELECT jsonb_array_elements(COALESCE(_c.prizes, '[]'::jsonb))
  LOOP
    _place  := COALESCE((_p->>'place')::int, 0);
    _amount := COALESCE((_p->>'amount')::numeric, 0);
    _label  := COALESCE(_p->>'label', _place::text || ' место');
    IF _place <= 0 OR _amount <= 0 THEN CONTINUE; END IF;

    WITH raw AS (
      SELECT c.user_id AS uid,
        CASE _c.metric
          WHEN 'earned'      THEN COALESCE(SUM(c.amount),0)::numeric
          WHEN 'conversions' THEN COUNT(*)::numeric
          ELSE 0::numeric
        END AS s
      FROM public.conversions c
      WHERE c.status = 'ok'
        AND c.created_at >= _c.starts_at AND c.created_at < _c.ends_at
        AND _c.metric IN ('earned','conversions')
      GROUP BY c.user_id
      UNION ALL
      SELECT r.user_id AS uid, COUNT(*)::numeric AS s
      FROM public.link_requests r
      WHERE _c.metric = 'requests'
        AND r.created_at >= _c.starts_at AND r.created_at < _c.ends_at
      GROUP BY r.user_id
    ),
    filtered AS (
      SELECT raw.uid, raw.s AS score FROM raw
      WHERE raw.uid IS NOT NULL
        AND (SELECT COALESCE(SUM(cx.amount),0) FROM public.conversions cx
             WHERE cx.user_id = raw.uid AND cx.status = 'ok')
          >= public.level_min_earned(_c.min_level)
        AND EXISTS (
          SELECT 1 FROM public.competition_participants cp
          WHERE cp.competition_id = _c.id AND cp.user_id = raw.uid
        )
    ),
    ranked AS (
      SELECT uid, score, ROW_NUMBER() OVER (ORDER BY score DESC, uid) AS rnk
      FROM filtered WHERE score > 0
    )
    SELECT uid, score INTO _row FROM ranked WHERE rnk = _place;

    IF _row.uid IS NULL THEN CONTINUE; END IF;

    INSERT INTO public.conversions (user_id, offer_name, amount, status, base_amount, bonus_pct, bonus_amount, competition_id)
    VALUES (_row.uid, 'Приз: ' || _c.title || ' · ' || _label, _amount, 'ok', _amount, 0, 0, _c.id);

    INSERT INTO public.notifications (user_id, kind, title, body, amount, status)
    VALUES (
      _row.uid, 'payout',
      'Победа в соревновании: ' || _c.title,
      _label || ': начислено ' || _amount::text || ' ₽',
      _amount::text, 'paid'
    );

    _winners := _winners || jsonb_build_object('place', _place, 'user_id', _row.uid, 'amount', _amount, 'score', _row.score);
    _winner_ids := array_append(_winner_ids, _row.uid);
    _count := _count + 1;
    _total := _total + _amount;
  END LOOP;

  -- Non-winner participants: closing notice
  INSERT INTO public.notifications (user_id, kind, title, body, status)
  SELECT cp.user_id, 'competition',
    'Турнир завершён: ' || _c.title,
    'Спасибо за участие! Победители получили призы. Ждём вас в новых турнирах.',
    'active'
  FROM public.competition_participants cp
  WHERE cp.competition_id = _c.id AND NOT (cp.user_id = ANY(_winner_ids));

  UPDATE public.competitions
    SET settled_at = now(), settled_by = _actor, winners = _winners, active = false, updated_at = now()
    WHERE id = _id;

  RETURN jsonb_build_object('ok', true, 'winners', _winners, 'count', _count, 'total', _total);
END;
$$;

REVOKE ALL ON FUNCTION public.settle_competition(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_competition(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_competition(uuid) TO service_role;

-- 4) Daily leaderboard-rank notifications for active competitions
CREATE OR REPLACE FUNCTION public.notify_competition_ranks()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _c public.competitions%ROWTYPE;
  _n int := 0;
  _hrs int;
BEGIN
  FOR _c IN
    SELECT * FROM public.competitions
    WHERE active = true AND settled_at IS NULL AND ends_at > now() AND starts_at <= now()
  LOOP
    _hrs := GREATEST(0, EXTRACT(EPOCH FROM (_c.ends_at - now()))::int / 3600);

    WITH raw AS (
      SELECT c.user_id AS uid,
        CASE _c.metric
          WHEN 'earned'      THEN COALESCE(SUM(c.amount),0)::numeric
          WHEN 'conversions' THEN COUNT(*)::numeric
          ELSE 0::numeric
        END AS s
      FROM public.conversions c
      WHERE c.status = 'ok'
        AND c.created_at >= _c.starts_at AND c.created_at < _c.ends_at
        AND _c.metric IN ('earned','conversions')
      GROUP BY c.user_id
      UNION ALL
      SELECT r.user_id AS uid, COUNT(*)::numeric AS s
      FROM public.link_requests r
      WHERE _c.metric = 'requests'
        AND r.created_at >= _c.starts_at AND r.created_at < _c.ends_at
      GROUP BY r.user_id
    ),
    filtered AS (
      SELECT raw.uid, raw.s AS score FROM raw
      WHERE raw.uid IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.competition_participants cp
          WHERE cp.competition_id = _c.id AND cp.user_id = raw.uid
        )
    ),
    ranked AS (
      SELECT uid, score, ROW_NUMBER() OVER (ORDER BY score DESC, uid)::int AS rnk,
             COUNT(*) OVER () AS total
      FROM filtered WHERE score > 0
    )
    INSERT INTO public.notifications (user_id, kind, title, body, status)
    SELECT
      r.uid, 'competition',
      'Турнир «' || _c.title || '»: ваше место #' || r.rnk,
      'Текущий счёт: ' ||
        CASE _c.metric WHEN 'earned' THEN r.score::text || ' ₽' ELSE r.score::text END
        || ' из ' || r.total || ' участников. До финиша: ' || _hrs || ' ч.',
      'active'
    FROM ranked r;

    -- Also nudge participants with zero score
    INSERT INTO public.notifications (user_id, kind, title, body, status)
    SELECT cp.user_id, 'competition',
      'Турнир «' || _c.title || '»: пора включаться',
      'Вы пока не набрали очки. До финиша осталось ' || _hrs || ' ч.',
      'active'
    FROM public.competition_participants cp
    WHERE cp.competition_id = _c.id
      AND NOT EXISTS (
        SELECT 1 FROM public.conversions cx
        WHERE cx.user_id = cp.user_id AND cx.status = 'ok'
          AND cx.created_at >= _c.starts_at AND cx.created_at < _c.ends_at
      )
      AND _c.metric IN ('earned','conversions');

    _n := _n + 1;
  END LOOP;
  RETURN _n;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_competition_ranks() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_competition_ranks() TO service_role;
