
DROP FUNCTION IF EXISTS public.get_competition_leaderboard(uuid, int);

DO $$ BEGIN
  CREATE TYPE public.level_tier AS ENUM ('start','silver','gold','platinum','diamond');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS min_level public.level_tier NOT NULL DEFAULT 'start';

CREATE TABLE IF NOT EXISTS public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  prize_pool numeric NOT NULL DEFAULT 0,
  prizes jsonb NOT NULL DEFAULT '[]'::jsonb,
  metric text NOT NULL DEFAULT 'earned' CHECK (metric IN ('earned','conversions','requests')),
  min_level public.level_tier NOT NULL DEFAULT 'diamond',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  banner_url text,
  rules text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitions TO authenticated;
GRANT ALL ON public.competitions TO service_role;

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "competitions_select_active" ON public.competitions;
CREATE POLICY "competitions_select_active" ON public.competitions FOR SELECT TO authenticated
  USING (active = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "competitions_admin_insert" ON public.competitions;
CREATE POLICY "competitions_admin_insert" ON public.competitions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "competitions_admin_update" ON public.competitions;
CREATE POLICY "competitions_admin_update" ON public.competitions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "competitions_admin_delete" ON public.competitions;
CREATE POLICY "competitions_admin_delete" ON public.competitions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS competitions_set_updated_at ON public.competitions;
CREATE TRIGGER competitions_set_updated_at BEFORE UPDATE ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.competitions REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.competitions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE FUNCTION public.get_competition_leaderboard(_competition_id uuid, _limit int DEFAULT 50)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  score numeric,
  is_me boolean,
  rank int
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _c public.competitions%ROWTYPE;
  _me uuid := auth.uid();
  _min numeric;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO _c FROM public.competitions WHERE id = _competition_id;
  IF NOT FOUND OR NOT _c.active THEN RETURN; END IF;
  _min := CASE _c.min_level
    WHEN 'start' THEN 0 WHEN 'silver' THEN 50000 WHEN 'gold' THEN 150000
    WHEN 'platinum' THEN 500000 WHEN 'diamond' THEN 1500000
  END;

  RETURN QUERY
  WITH raw AS (
    SELECT c.user_id AS uid,
      CASE _c.metric
        WHEN 'earned'      THEN COALESCE(SUM(c.amount),0)::numeric
        WHEN 'conversions' THEN COUNT(*)::numeric
        ELSE 0::numeric END AS s
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
  scored AS (
    SELECT raw.uid, raw.s AS score,
      COALESCE(NULLIF(p.display_name,''), 'Партнёр') AS dname, p.avatar_url AS av
    FROM raw LEFT JOIN public.profiles p ON p.id = raw.uid
    WHERE raw.uid IS NOT NULL
      AND (SELECT COALESCE(SUM(cx.amount),0) FROM public.conversions cx
           WHERE cx.user_id = raw.uid AND cx.status = 'ok') >= _min
  )
  SELECT s.uid, s.dname, s.av, s.score, (s.uid = _me),
         ROW_NUMBER() OVER (ORDER BY s.score DESC)::int
  FROM scored s
  WHERE s.score > 0
  ORDER BY s.score DESC
  LIMIT _limit;
END; $$;

REVOKE ALL ON FUNCTION public.get_competition_leaderboard(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_competition_leaderboard(uuid, int) TO authenticated;
