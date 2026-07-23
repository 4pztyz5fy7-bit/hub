ALTER TABLE public.offers
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

NOTIFY pgrst, 'reload schema';