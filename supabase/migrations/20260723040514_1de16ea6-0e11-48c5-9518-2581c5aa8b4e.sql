
-- Access tables
CREATE TABLE IF NOT EXISTS public.recruiter_offer_access (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id     text NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (recruiter_id, offer_id)
);
CREATE INDEX IF NOT EXISTS recruiter_offer_access_recruiter_idx
  ON public.recruiter_offer_access(recruiter_id);
CREATE INDEX IF NOT EXISTS recruiter_offer_access_offer_idx
  ON public.recruiter_offer_access(offer_id);

GRANT SELECT ON public.recruiter_offer_access TO authenticated;
GRANT ALL ON public.recruiter_offer_access TO service_role;
ALTER TABLE public.recruiter_offer_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roa admin all"  ON public.recruiter_offer_access;
DROP POLICY IF EXISTS "roa read own"   ON public.recruiter_offer_access;
CREATE POLICY "roa admin all" ON public.recruiter_offer_access
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roa read own" ON public.recruiter_offer_access
  FOR SELECT TO authenticated
  USING (auth.uid() = recruiter_id);

CREATE TABLE IF NOT EXISTS public.recruiter_category_access (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category     text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (recruiter_id, category)
);
CREATE INDEX IF NOT EXISTS recruiter_category_access_recruiter_idx
  ON public.recruiter_category_access(recruiter_id);
CREATE INDEX IF NOT EXISTS recruiter_category_access_category_idx
  ON public.recruiter_category_access(category);

GRANT SELECT ON public.recruiter_category_access TO authenticated;
GRANT ALL ON public.recruiter_category_access TO service_role;
ALTER TABLE public.recruiter_category_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rca admin all" ON public.recruiter_category_access;
DROP POLICY IF EXISTS "rca read own"  ON public.recruiter_category_access;
CREATE POLICY "rca admin all" ON public.recruiter_category_access
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "rca read own" ON public.recruiter_category_access
  FOR SELECT TO authenticated
  USING (auth.uid() = recruiter_id);

-- Helper
CREATE OR REPLACE FUNCTION public.can_recruit_offer(_uid uuid, _offer_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.recruiter_offer_access
    WHERE recruiter_id = _uid AND offer_id = _offer_id
  ) OR EXISTS (
    SELECT 1
    FROM public.recruiter_category_access rca
    JOIN public.offers o ON o.category = rca.category
    WHERE rca.recruiter_id = _uid AND o.id = _offer_id
  );
$$;
REVOKE ALL ON FUNCTION public.can_recruit_offer(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_recruit_offer(uuid, text) TO authenticated, service_role;

-- Recruiter-scoped RLS on existing tables
DROP POLICY IF EXISTS "offers recruiter update" ON public.offers;
CREATE POLICY "offers recruiter update" ON public.offers
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'recruiter'::app_role) AND public.can_recruit_offer(auth.uid(), id))
  WITH CHECK (public.has_role(auth.uid(), 'recruiter'::app_role) AND public.can_recruit_offer(auth.uid(), id));

DROP POLICY IF EXISTS "links recruiter read" ON public.link_requests;
CREATE POLICY "links recruiter read" ON public.link_requests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'recruiter'::app_role) AND public.can_recruit_offer(auth.uid(), offer_id));

DROP POLICY IF EXISTS "conversions recruiter read" ON public.conversions;
CREATE POLICY "conversions recruiter read" ON public.conversions
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'recruiter'::app_role)
    AND offer_id IS NOT NULL
    AND public.can_recruit_offer(auth.uid(), offer_id)
  );

-- Patched RPC: allow admin OR recruiter-with-access; behavior identical for admin
CREATE OR REPLACE FUNCTION public.admin_set_link_request_status(_request_id uuid, _new_status link_status, _payout_override numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _req public.link_requests%ROWTYPE;
  _offer public.offers%ROWTYPE;
  _base numeric := 0;
  _amount numeric := 0;
  _bonus_pct numeric := 0;
  _bonus_amt numeric := 0;
  _earned numeric := 0;
  _conv_id uuid;
  _is_admin boolean;
  _is_recruiter boolean;
BEGIN
  _is_admin := public.has_role(auth.uid(), 'admin');

  SELECT * INTO _req FROM public.link_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'request not found';
  END IF;

  _is_recruiter := public.has_role(auth.uid(), 'recruiter')
                   AND _req.offer_id IS NOT NULL
                   AND public.can_recruit_offer(auth.uid(), _req.offer_id);

  IF NOT (_is_admin OR _is_recruiter) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF _payout_override IS NOT NULL THEN
    UPDATE public.link_requests SET payout_override = _payout_override, updated_at = now()
      WHERE id = _request_id;
    _req.payout_override := _payout_override;
  END IF;

  IF _new_status = 'paid' AND _req.credited_at IS NULL THEN
    IF _req.offer_id IS NOT NULL THEN
      SELECT * INTO _offer FROM public.offers WHERE id = _req.offer_id;
    END IF;

    IF _req.payout_override IS NOT NULL AND _req.payout_override > 0 THEN
      _base := _req.payout_override;
    ELSIF _offer.id IS NOT NULL THEN
      IF _offer.payout_kind = 'exact' AND _offer.payout_min IS NOT NULL THEN
        _base := _offer.payout_min;
      ELSE
        _base := COALESCE(NULLIF(regexp_replace(COALESCE(_offer.payout,''), '[^0-9.]', '', 'g'), '')::numeric, 0);
        IF _base = 0 THEN _base := COALESCE(_offer.payout_max, _offer.payout_min, 0); END IF;
      END IF;
    END IF;

    IF _base > 0 THEN
      SELECT COALESCE(SUM(amount), 0) INTO _earned
        FROM public.conversions WHERE user_id = _req.user_id AND status = 'ok';
      _bonus_pct := public.level_bonus_pct(_earned);
      _bonus_amt := ROUND(_base * _bonus_pct / 100.0, 2);
      _amount := _base + _bonus_amt;

      INSERT INTO public.conversions (user_id, offer_id, offer_name, amount, status, base_amount, bonus_pct, bonus_amount)
      VALUES (_req.user_id, _req.offer_id, _req.offer_name, _amount, 'ok', _base, _bonus_pct, _bonus_amt)
      RETURNING id INTO _conv_id;

      INSERT INTO public.notifications (user_id, kind, title, body, amount, status)
      VALUES (
        _req.user_id, 'payout', 'Начисление за оффер',
        _req.offer_name || ': начислено ' || _amount::text || ' ₽'
          || CASE WHEN _bonus_pct > 0
               THEN ' (база ' || _base::text || ' ₽ + бонус уровня ' || _bonus_pct::text || '% = ' || _bonus_amt::text || ' ₽)'
               ELSE '' END,
        _amount::text, 'paid'
      );
    END IF;

    UPDATE public.link_requests
      SET status = _new_status,
          credited_at = now(),
          credit_conversion_id = _conv_id,
          updated_at = now()
      WHERE id = _request_id;
  ELSE
    UPDATE public.link_requests
      SET status = _new_status, updated_at = now()
      WHERE id = _request_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'base_amount', _base,
    'bonus_pct', _bonus_pct,
    'bonus_amount', _bonus_amt,
    'credited_amount', _amount,
    'conversion_id', _conv_id
  );
END;
$function$;
