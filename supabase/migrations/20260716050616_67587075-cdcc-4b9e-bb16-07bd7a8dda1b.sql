ALTER TYPE public.link_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE public.link_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE public.link_status ADD VALUE IF NOT EXISTS 'finished';
ALTER TYPE public.link_status ADD VALUE IF NOT EXISTS 'paid';
ALTER TABLE public.link_requests ADD COLUMN IF NOT EXISTS orders_count integer NOT NULL DEFAULT 0;