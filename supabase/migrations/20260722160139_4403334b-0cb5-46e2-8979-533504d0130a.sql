
CREATE OR REPLACE FUNCTION public.notify_support_message()
RETURNS TRIGGER AS $$
DECLARE
  v_ticket public.support_tickets%ROWTYPE;
  v_admin_id uuid;
  v_preview text;
BEGIN
  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = NEW.ticket_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  v_preview := left(NEW.text, 140);

  IF NEW.from_admin THEN
    -- notify ticket owner (skip if admin is the owner)
    IF v_ticket.user_id IS NOT NULL AND v_ticket.user_id <> NEW.author_id THEN
      INSERT INTO public.notifications (user_id, kind, title, body, actor_id)
      VALUES (v_ticket.user_id, 'support_reply',
              'Ответ поддержки: ' || coalesce(v_ticket.subject, 'Обращение'),
              v_preview, NEW.author_id);
    END IF;
  ELSE
    -- notify all admins
    FOR v_admin_id IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      IF v_admin_id <> NEW.author_id THEN
        INSERT INTO public.notifications (user_id, kind, title, body, actor_id)
        VALUES (v_admin_id, 'support_new_message',
                'Новое сообщение в тикете: ' || coalesce(v_ticket.subject, 'Обращение'),
                v_preview, NEW.author_id);
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_support_message ON public.support_messages;
CREATE TRIGGER trg_notify_support_message
AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_support_message();
