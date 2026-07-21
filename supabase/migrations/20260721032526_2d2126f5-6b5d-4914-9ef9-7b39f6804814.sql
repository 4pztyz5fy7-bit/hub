
-- Sequence for short human-readable request codes
CREATE SEQUENCE IF NOT EXISTS public.link_requests_code_seq START 1000;

ALTER TABLE public.link_requests
  ADD COLUMN IF NOT EXISTS code TEXT;

-- Backfill existing rows in creation order
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at) AS rn
  FROM public.link_requests
  WHERE code IS NULL
)
UPDATE public.link_requests r
SET code = 'KV-' || lpad((1000 + o.rn)::text, 6, '0')
FROM ordered o WHERE r.id = o.id;

-- Move sequence past the max backfilled value
SELECT setval(
  'public.link_requests_code_seq',
  GREATEST(1000, (SELECT COALESCE(MAX(NULLIF(regexp_replace(code, '\D', '', 'g'), '')::bigint), 1000) FROM public.link_requests))
);

-- Assign code automatically on insert
CREATE OR REPLACE FUNCTION public.link_requests_set_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'KV-' || lpad(nextval('public.link_requests_code_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_requests_set_code ON public.link_requests;
CREATE TRIGGER trg_link_requests_set_code
  BEFORE INSERT ON public.link_requests
  FOR EACH ROW EXECUTE FUNCTION public.link_requests_set_code();

-- Enforce uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS link_requests_code_unique ON public.link_requests(code);

ALTER TABLE public.link_requests ALTER COLUMN code SET NOT NULL;
