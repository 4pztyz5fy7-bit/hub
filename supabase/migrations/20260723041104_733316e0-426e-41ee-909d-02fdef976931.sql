
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS income text,
  ADD COLUMN IF NOT EXISTS target_action text,
  ADD COLUMN IF NOT EXISTS work_rules text,
  ADD COLUMN IF NOT EXISTS ad_materials text,
  ADD COLUMN IF NOT EXISTS feedback text,
  ADD COLUMN IF NOT EXISTS term_completion text,
  ADD COLUMN IF NOT EXISTS term_confirmation text,
  ADD COLUMN IF NOT EXISTS avg_orders_per_courier numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.recompute_offer_stats(_offer_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req_total int := 0;
  conv_count int := 0;
  conv_sum numeric := 0;
  avg_orders numeric := 0;
BEGIN
  IF _offer_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO req_total
  FROM public.link_requests WHERE offer_id = _offer_id;

  SELECT COUNT(*), COALESCE(SUM(amount), 0) INTO conv_count, conv_sum
  FROM public.conversions WHERE offer_id = _offer_id;

  SELECT COALESCE(AVG(NULLIF(orders_count, 0)), 0) INTO avg_orders
  FROM public.link_requests
  WHERE offer_id = _offer_id
    AND status IN ('completed','finished','paid');

  UPDATE public.offers SET
    cr = CASE WHEN req_total > 0 THEN ROUND((conv_count::numeric / req_total) * 100, 2) ELSE 0 END,
    epc = CASE WHEN req_total > 0 THEN GREATEST(0, (conv_sum / req_total)::int) ELSE 0 END,
    avg_orders_per_courier = ROUND(COALESCE(avg_orders, 0), 2),
    updated_at = now()
  WHERE id = _offer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_offer_stats(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_recompute_offer_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_offer_stats(OLD.offer_id);
    RETURN OLD;
  ELSE
    PERFORM public.recompute_offer_stats(NEW.offer_id);
    IF TG_OP = 'UPDATE' AND OLD.offer_id IS DISTINCT FROM NEW.offer_id THEN
      PERFORM public.recompute_offer_stats(OLD.offer_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS conversions_recompute_offer_stats ON public.conversions;
CREATE TRIGGER conversions_recompute_offer_stats
AFTER INSERT OR UPDATE OR DELETE ON public.conversions
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_offer_stats();

DROP TRIGGER IF EXISTS link_requests_recompute_offer_stats ON public.link_requests;
CREATE TRIGGER link_requests_recompute_offer_stats
AFTER INSERT OR UPDATE OR DELETE ON public.link_requests
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_offer_stats();

-- Initial backfill
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.offers LOOP
    PERFORM public.recompute_offer_stats(r.id);
  END LOOP;
END $$;
