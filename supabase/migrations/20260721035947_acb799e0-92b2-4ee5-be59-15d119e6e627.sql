CREATE OR REPLACE FUNCTION public.get_landing_stats()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH
    partners AS (
      SELECT count(*)::int AS c FROM public.profiles p
      WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin')
    ),
    offers_active AS (SELECT count(*)::int AS c FROM public.offers WHERE active = true),
    paid_sum AS (SELECT COALESCE(sum(amount),0)::numeric AS s FROM public.payout_requests WHERE status = 'paid'),
    conv_agg AS (SELECT COALESCE(sum(amount),0)::numeric AS s, count(*)::int AS c FROM public.conversions WHERE status = 'ok'),
    top_offers AS (
      SELECT id, name, category, payout, cr, epc, is_new
      FROM public.offers WHERE active = true
      ORDER BY epc DESC NULLS LAST LIMIT 6
    ),
    recent_conv AS (
      SELECT offer_name, amount, user_id, created_at FROM public.conversions
      WHERE status = 'ok' ORDER BY created_at DESC LIMIT 10
    ),
    recent_signups AS (
      SELECT p.id, p.display_name, p.email, p.created_at FROM public.profiles p
      WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin')
      ORDER BY p.created_at DESC LIMIT 8
    ),
    recent_offers AS (
      SELECT name, created_at FROM public.offers
      WHERE active = true ORDER BY created_at DESC LIMIT 5
    ),
    recent_payouts AS (
      SELECT amount, user_id, created_at FROM public.payout_requests
      WHERE status = 'paid' ORDER BY created_at DESC LIMIT 8
    ),
    recent_reqs AS (
      SELECT offer_name, user_id, status::text AS status, orders_count, created_at
      FROM public.link_requests ORDER BY created_at DESC LIMIT 12
    ),
    all_uids AS (
      SELECT user_id FROM recent_conv WHERE user_id IS NOT NULL
      UNION SELECT user_id FROM recent_payouts WHERE user_id IS NOT NULL
      UNION SELECT user_id FROM recent_reqs WHERE user_id IS NOT NULL
    ),
    names AS (
      SELECT p.id, p.display_name, p.email FROM public.profiles p
      JOIN all_uids u ON u.user_id = p.id
    )
  SELECT jsonb_build_object(
    'partners', (SELECT c FROM partners),
    'offersCount', (SELECT c FROM offers_active),
    'totalPaid', (SELECT s FROM paid_sum) + (SELECT s FROM conv_agg),
    'completedConversions', (SELECT c FROM conv_agg),
    'topOffers', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM top_offers t), '[]'::jsonb),
    'recentConv', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM recent_conv t), '[]'::jsonb),
    'recentSignups', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM recent_signups t), '[]'::jsonb),
    'recentOffers', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM recent_offers t), '[]'::jsonb),
    'recentPayouts', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM recent_payouts t), '[]'::jsonb),
    'recentReqs', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM recent_reqs t), '[]'::jsonb),
    'names', COALESCE((SELECT jsonb_object_agg(id::text, jsonb_build_object('display_name', display_name, 'email', email)) FROM names), '{}'::jsonb)
  );
$function$;