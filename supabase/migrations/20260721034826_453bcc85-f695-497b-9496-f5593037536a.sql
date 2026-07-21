
-- 1) State columns
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS settled_at timestamptz,
  ADD COLUMN IF NOT EXISTS settled_by uuid,
  ADD COLUMN IF NOT EXISTS winners jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2) Mark conversions coming from competitions
ALTER TABLE public.conversions
  ADD COLUMN IF NOT EXISTS competition_id uuid REFERENCES public.competitions(id) ON DELETE SET NULL;

-- 3) Core settle function (safe to call by admin or by scheduler)
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
BEGIN
  -- Authorization: admin OR service role (cron)
  IF _actor IS NOT NULL THEN
    _is_admin := public.has_role(_actor, 'admin');
    IF NOT _is_admin THEN
      RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT * INTO _c FROM public.competitions WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF _c.settled_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_settled', 'settled_at', _c.settled_at);
  END IF;

  -- Compute ranking exactly like get_competition_leaderboard, but without auth.uid()
  FOR _p IN SELECT jsonb_array_elements(COALESCE(_c.prizes, '[]'::jsonb))
  LOOP
    _place  := COALESCE((_p->>'place')::int, 0);
    _amount := COALESCE((_p->>'amount')::numeric, 0);
    _label  := COALESCE(_p->>'label', _place::text || ' место');
    IF _place <= 0 OR _amount <= 0 THEN CONTINUE; END IF;

    -- Pick the winner for this place from the ranking
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
      SELECT raw.uid, raw.s AS score
      FROM raw
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
      FROM filtered
      WHERE score > 0
    )
    SELECT uid, score INTO _row FROM ranked WHERE rnk = _place;

    IF _row.uid IS NULL THEN CONTINUE; END IF;

    INSERT INTO public.conversions (user_id, offer_name, amount, status, base_amount, bonus_pct, bonus_amount, competition_id)
    VALUES (
      _row.uid,
      'Приз: ' || _c.title || ' · ' || _label,
      _amount, 'ok', _amount, 0, 0, _c.id
    );

    INSERT INTO public.notifications (user_id, kind, title, body, amount, status)
    VALUES (
      _row.uid, 'payout',
      'Победа в соревновании: ' || _c.title,
      _label || ': начислено ' || _amount::text || ' ₽',
      _amount::text, 'paid'
    );

    _winners := _winners || jsonb_build_object(
      'place', _place, 'user_id', _row.uid, 'amount', _amount, 'score', _row.score
    );
    _count := _count + 1;
    _total := _total + _amount;
  END LOOP;

  UPDATE public.competitions
    SET settled_at = now(),
        settled_by = _actor,
        winners = _winners,
        active = false,
        updated_at = now()
    WHERE id = _id;

  RETURN jsonb_build_object('ok', true, 'winners', _winners, 'count', _count, 'total', _total);
END;
$$;

REVOKE ALL ON FUNCTION public.settle_competition(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_competition(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_competition(uuid) TO service_role;

-- 4) Auto-settle scanner (used by pg_cron)
CREATE OR REPLACE FUNCTION public.auto_settle_competitions()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _n int := 0;
BEGIN
  FOR _id IN
    SELECT id FROM public.competitions
    WHERE settled_at IS NULL AND ends_at <= now()
  LOOP
    BEGIN
      PERFORM public.settle_competition(_id);
      _n := _n + 1;
    EXCEPTION WHEN OTHERS THEN
      -- swallow so one bad row doesn't block others
      RAISE NOTICE 'settle failed for %: %', _id, SQLERRM;
    END;
  END LOOP;
  RETURN _n;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_settle_competitions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_settle_competitions() TO service_role;
