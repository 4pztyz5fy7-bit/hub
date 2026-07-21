
-- ============ EXCLUSIVE OFFERS ============
DO $$ BEGIN
  CREATE TYPE public.level_tier AS ENUM ('start','silver','gold','platinum','diamond');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS min_level public.level_tier NOT NULL DEFAULT 'start';

CREATE INDEX IF NOT EXISTS offers_min_level_idx ON public.offers(min_level);

-- Helper: total earned by user (from ok conversions)
CREATE OR REPLACE FUNCTION public.user_total_earned(_uid uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::numeric
  FROM public.conversions
  WHERE user_id = _uid AND status = 'ok';
$$;

GRANT EXECUTE ON FUNCTION public.user_total_earned(uuid) TO authenticated;

-- Helper: tier threshold
CREATE OR REPLACE FUNCTION public.level_min_earned(_tier public.level_tier)
RETURNS numeric
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _tier
    WHEN 'start'    THEN 0
    WHEN 'silver'   THEN 50000
    WHEN 'gold'     THEN 150000
    WHEN 'platinum' THEN 500000
    WHEN 'diamond'  THEN 1500000
  END::numeric;
$$;

GRANT EXECUTE ON FUNCTION public.level_min_earned(public.level_tier) TO authenticated;

-- ============ COMPETITIONS ============
CREATE TABLE IF NOT EXISTS public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  prize_pool numeric NOT NULL DEFAULT 0,
  prizes jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{place:1,amount:50000,label:"1 место"}, ...]
  metric text NOT NULL DEFAULT 'earned' CHECK (metric IN ('earned','conversions','requests')),
  min_level public.level_tier NOT NULL DEFAULT 'diamond',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  banner_url text,
  rules text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.competitions TO authenticated;
GRANT ALL ON public.competitions TO service_role;

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions FORCE ROW LEVEL SECURITY;

CREATE POLICY "competitions_read_all_auth"
  ON public.competitions FOR SELECT TO authenticated USING (true);

CREATE POLICY "competitions_admin_insert"
  ON public.competitions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "competitions_admin_update"
  ON public.competitions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "competitions_admin_delete"
  ON public.competitions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER competitions_touch_updated_at
  BEFORE UPDATE ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS competitions_active_idx ON public.competitions(active, ends_at DESC);

-- Leaderboard for a specific competition
CREATE OR REPLACE FUNCTION public.get_competition_leaderboard(_competition_id uuid, _limit int DEFAULT 50)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  score numeric,
  is_me boolean,
  rank bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _c public.competitions%ROWTYPE;
  _me uuid := auth.uid();
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO _c FROM public.competitions WHERE id = _competition_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'competition not found'; END IF;

  -- Access gate: user must have reached competition's min_level
  IF public.user_total_earned(_me) < public.level_min_earned(_c.min_level)
     AND NOT public.has_role(_me, 'admin') THEN
    RAISE EXCEPTION 'level_locked' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH src AS (
    SELECT
      CASE
        WHEN _c.metric = 'requests' THEN lr.user_id
        ELSE c.user_id
      END AS uid,
      CASE
        WHEN _c.metric = 'earned'      THEN COALESCE(c.amount, 0)
        WHEN _c.metric = 'conversions' THEN 1
        WHEN _c.metric = 'requests'    THEN 1
      END::numeric AS val
    FROM public.conversions c
      FULL OUTER JOIN public.link_requests lr
        ON false -- separate branches; we UNION-emulate via CASE with two selects below
    WHERE false
  ),
  earned_src AS (
    SELECT user_id AS uid, amount AS val
    FROM public.conversions
    WHERE status = 'ok'
      AND created_at >= _c.starts_at AND created_at < _c.ends_at
      AND _c.metric = 'earned'
  ),
  conv_src AS (
    SELECT user_id AS uid, 1::numeric AS val
    FROM public.conversions
    WHERE status = 'ok'
      AND created_at >= _c.starts_at AND created_at < _c.ends_at
      AND _c.metric = 'conversions'
  ),
  req_src AS (
    SELECT user_id AS uid, 1::numeric AS val
    FROM public.link_requests
    WHERE created_at >= _c.starts_at AND created_at < _c.ends_at
      AND _c.metric = 'requests'
  ),
  all_src AS (
    SELECT * FROM earned_src
    UNION ALL SELECT * FROM conv_src
    UNION ALL SELECT * FROM req_src
  ),
  agg AS (
    SELECT uid, SUM(val)::numeric AS score
    FROM all_src
    WHERE uid IS NOT NULL
    GROUP BY uid
  )
  SELECT
    a.uid AS user_id,
    COALESCE(NULLIF(p.display_name, ''), 'Партнёр') AS display_name,
    p.avatar_url,
    a.score,
    (a.uid = _me) AS is_me,
    ROW_NUMBER() OVER (ORDER BY a.score DESC) AS rank
  FROM agg a
  LEFT JOIN public.profiles p ON p.id = a.uid
  ORDER BY a.score DESC
  LIMIT _limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_competition_leaderboard(uuid, int) TO authenticated;

-- Realtime for competitions
ALTER TABLE public.competitions REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='competitions';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.competitions';
  END IF;
END $$;
