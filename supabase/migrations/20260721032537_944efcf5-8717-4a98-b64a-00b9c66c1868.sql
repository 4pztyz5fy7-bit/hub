
ALTER TABLE public.link_requests
  ALTER COLUMN code SET DEFAULT ('KV-' || lpad(nextval('public.link_requests_code_seq')::text, 6, '0'));
