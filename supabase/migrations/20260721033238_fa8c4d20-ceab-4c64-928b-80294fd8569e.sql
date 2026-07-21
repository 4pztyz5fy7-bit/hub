
ALTER TABLE public.payout_requests REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.admin_delete_payout(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.payout_requests%ROWTYPE;
  _amount_str text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _row FROM public.payout_requests WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  _amount_str := to_char(_row.amount, 'FM999999990.00');

  DELETE FROM public.payout_requests WHERE id = _id;

  INSERT INTO public.notifications (user_id, kind, title, body, amount, status)
  VALUES (
    _row.user_id,
    'payout',
    CASE WHEN _row.status = 'paid'
         THEN 'Выплата отменена'
         ELSE 'Заявка на выплату удалена' END,
    CASE WHEN _row.status = 'paid'
         THEN 'Выплата ' || _amount_str || ' ₽ отменена администратором. Сумма возвращена на баланс.'
         ELSE 'Заявка на вывод ' || _amount_str || ' ₽ удалена администратором.' END,
    _amount_str,
    'rejected'
  );

  RETURN jsonb_build_object('ok', true, 'refunded', _row.status = 'paid', 'amount', _row.amount);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_payout(uuid) TO authenticated;
