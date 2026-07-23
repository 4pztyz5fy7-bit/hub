
REVOKE ALL ON FUNCTION public.recompute_offer_stats(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_recompute_offer_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_offer_stats(text) TO service_role;
