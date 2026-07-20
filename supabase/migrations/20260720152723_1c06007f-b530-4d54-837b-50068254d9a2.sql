
CREATE OR REPLACE FUNCTION public.level_bonus_pct(_earned numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _earned >= 1500000 THEN 12
    WHEN _earned >= 500000  THEN 8
    WHEN _earned >= 150000  THEN 5
    WHEN _earned >= 50000   THEN 2
    ELSE 0
  END::numeric;
$$;

GRANT EXECUTE ON FUNCTION public.level_bonus_pct(numeric) TO authenticated, anon, service_role;

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
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _req FROM public.link_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'request not found';
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

      INSERT INTO public.conversions (user_id, offer_id, offer_name, amount, status)
      VALUES (_req.user_id, _req.offer_id, _req.offer_name, _amount, 'ok')
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
