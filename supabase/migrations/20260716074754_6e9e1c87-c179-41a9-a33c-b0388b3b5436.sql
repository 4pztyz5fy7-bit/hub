ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS payout_kind text NOT NULL DEFAULT 'exact',
  ADD COLUMN IF NOT EXISTS payout_min numeric,
  ADD COLUMN IF NOT EXISTS payout_max numeric,
  ADD COLUMN IF NOT EXISTS city_payouts jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'offers_payout_kind_check') THEN
    ALTER TABLE public.offers
      ADD CONSTRAINT offers_payout_kind_check
      CHECK (payout_kind IN ('exact','up_to','from','range'));
  END IF;
END $$;