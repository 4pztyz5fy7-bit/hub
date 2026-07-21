
-- Participants table
CREATE TABLE IF NOT EXISTS public.competition_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.competition_participants TO authenticated;
GRANT ALL ON public.competition_participants TO service_role;

ALTER TABLE public.competition_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read participants"
  ON public.competition_participants FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "join self"
  ON public.competition_participants FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "leave self"
  ON public.competition_participants FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "admin manages participants"
  ON public.competition_participants FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.competition_participants;

-- RPC: join with level check
CREATE OR REPLACE FUNCTION public.join_competition(_competition_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _c public.competitions%ROWTYPE;
  _earned numeric;
  _min numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO _c FROM public.competitions WHERE id = _competition_id AND active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF now() >= _c.ends_at THEN RETURN jsonb_build_object('ok', false, 'error', 'ended'); END IF;

  _min := public.level_min_earned(_c.min_level);
  SELECT COALESCE(SUM(amount),0) INTO _earned FROM public.conversions WHERE user_id = _uid AND status = 'ok';
  IF _earned < _min THEN
    RETURN jsonb_build_object('ok', false, 'error', 'level', 'required', _min, 'earned', _earned);
  END IF;

  INSERT INTO public.competition_participants (competition_id, user_id)
    VALUES (_competition_id, _uid)
    ON CONFLICT (competition_id, user_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END; $$;

REVOKE ALL ON FUNCTION public.join_competition(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_competition(uuid) TO authenticated;
