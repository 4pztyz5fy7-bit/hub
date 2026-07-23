-- VPS hotfix: add the full offer-editing columns used by the admin panel.
-- Run on the VPS database, then restart the API/app process so the schema cache reloads.

BEGIN;

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS cr numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_new boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allowed text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS denied text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS landing text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS payout_kind text NOT NULL DEFAULT 'exact'::text,
  ADD COLUMN IF NOT EXISTS payout_min numeric,
  ADD COLUMN IF NOT EXISTS payout_max numeric,
  ADD COLUMN IF NOT EXISTS city_payouts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS min_level public.level_tier NOT NULL DEFAULT 'start'::public.level_tier,
  ADD COLUMN IF NOT EXISTS income text,
  ADD COLUMN IF NOT EXISTS target_action text,
  ADD COLUMN IF NOT EXISTS work_rules text,
  ADD COLUMN IF NOT EXISTS ad_materials text,
  ADD COLUMN IF NOT EXISTS feedback text,
  ADD COLUMN IF NOT EXISTS term_completion text,
  ADD COLUMN IF NOT EXISTS term_confirmation text,
  ADD COLUMN IF NOT EXISTS avg_orders_per_courier numeric NOT NULL DEFAULT 0;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT SELECT ON public.offers TO anon;
GRANT ALL ON public.offers TO service_role;

-- PostgREST/Supabase API schema cache reload.
NOTIFY pgrst, 'reload schema';

COMMIT;