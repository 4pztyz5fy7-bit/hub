
-- 1. Idempotency for link_requests crediting
ALTER TABLE public.link_requests
  ADD COLUMN IF NOT EXISTS credited_at timestamptz,
  ADD COLUMN IF NOT EXISTS credit_conversion_id uuid;

-- 2. Add explicit actor_id on notifications (replaces overloading `amount` with a UUID)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS actor_id uuid;

-- Backfill actor_id from legacy moderation rows that packed UUID into `amount`
UPDATE public.notifications
SET actor_id = amount::uuid
WHERE actor_id IS NULL
  AND kind = 'moderation'
  AND amount ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 3. Atomic admin operation: set link_request status + credit balance idempotently
CREATE OR REPLACE FUNCTION public.admin_set_link_request_status(
  _request_id uuid,
  _new_status link_status,
  _payout_override numeric DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _req public.link_requests%ROWTYPE;
  _offer public.offers%ROWTYPE;
  _amount numeric := 0;
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

  -- Only credit on first transition to paid
  IF _new_status = 'paid' AND _req.credited_at IS NULL THEN
    IF _req.offer_id IS NOT NULL THEN
      SELECT * INTO _offer FROM public.offers WHERE id = _req.offer_id;
    END IF;

    IF _req.payout_override IS NOT NULL AND _req.payout_override > 0 THEN
      _amount := _req.payout_override;
    ELSIF _offer.id IS NOT NULL THEN
      -- Honor payout_kind: only auto-credit exact offers; others require an override
      IF _offer.payout_kind = 'exact' AND _offer.payout_min IS NOT NULL THEN
        _amount := _offer.payout_min;
      ELSE
        _amount := COALESCE(NULLIF(regexp_replace(COALESCE(_offer.payout,''), '[^0-9.]', '', 'g'), '')::numeric, 0);
        IF _amount = 0 THEN _amount := COALESCE(_offer.payout_max, _offer.payout_min, 0); END IF;
      END IF;
    END IF;

    IF _amount > 0 THEN
      INSERT INTO public.conversions (user_id, offer_id, offer_name, amount, status)
      VALUES (_req.user_id, _req.offer_id, _req.offer_name, _amount, 'ok')
      RETURNING id INTO _conv_id;

      INSERT INTO public.notifications (user_id, kind, title, body, amount, status)
      VALUES (
        _req.user_id, 'payout', 'Начисление за оффер',
        _req.offer_name || ': начислено ' || _amount::text || ' ₽',
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

  RETURN jsonb_build_object('ok', true, 'credited_amount', _amount, 'conversion_id', _conv_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_link_request_status(uuid, link_status, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_link_request_status(uuid, link_status, numeric) TO authenticated;

-- 4. Prevent non-admin ticket owners from tampering with admin-only fields
CREATE OR REPLACE FUNCTION public.support_tickets_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  -- Regular user updating own ticket: preserve admin-only fields
  NEW.status       := OLD.status;
  NEW.priority     := OLD.priority;
  NEW.unread_admin := OLD.unread_admin;
  NEW.last_message_at := OLD.last_message_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_tickets_guard ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_guard
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.support_tickets_guard();
