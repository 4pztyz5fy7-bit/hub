-- Fix double-count of unread messages: ticket starts at 0, trigger increments per message
ALTER TABLE public.support_tickets ALTER COLUMN unread_admin SET DEFAULT 0;
UPDATE public.support_tickets t SET unread_admin = (
  SELECT count(*) FROM public.support_messages m
  WHERE m.ticket_id = t.id AND m.from_admin = false AND m.created_at > COALESCE(
    (SELECT max(created_at) FROM public.support_messages m2 WHERE m2.ticket_id = t.id AND m2.from_admin = true),
    '1970-01-01'::timestamptz
  )
);
UPDATE public.support_tickets t SET unread_user = (
  SELECT count(*) FROM public.support_messages m
  WHERE m.ticket_id = t.id AND m.from_admin = true AND m.created_at > COALESCE(
    (SELECT max(created_at) FROM public.support_messages m2 WHERE m2.ticket_id = t.id AND m2.from_admin = false),
    '1970-01-01'::timestamptz
  )
);