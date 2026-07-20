
-- Add support tables to realtime publication (idempotent)
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;

-- Ensure trigger that updates ticket meta on new message exists
DROP TRIGGER IF EXISTS trg_support_on_message ON public.support_messages;
CREATE TRIGGER trg_support_on_message
AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.support_on_message();
