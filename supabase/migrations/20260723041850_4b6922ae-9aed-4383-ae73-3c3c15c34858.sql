
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  bonus_amount numeric NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  trigger_offer_id text REFERENCES public.offers(id) ON DELETE SET NULL,
  trigger_conversions_count integer NOT NULL DEFAULT 1,
  max_activations integer,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promo_codes_admin_all" ON public.promo_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "promo_codes_view_active" ON public.promo_codes FOR SELECT TO authenticated
  USING (active = true);

CREATE TRIGGER promo_codes_set_updated_at
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.promo_activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversion_id uuid REFERENCES public.conversions(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(promo_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_activations TO authenticated;
GRANT ALL ON public.promo_activations TO service_role;

ALTER TABLE public.promo_activations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promo_act_admin_all" ON public.promo_activations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "promo_act_own_read" ON public.promo_activations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS promo_activations_user_idx ON public.promo_activations(user_id);
CREATE INDEX IF NOT EXISTS promo_codes_active_idx ON public.promo_codes(active, ends_at);

-- Auto-award promo bonuses when a conversion is completed
CREATE OR REPLACE FUNCTION public.auto_apply_promos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _p public.promo_codes%ROWTYPE;
  _cnt int;
  _acts int;
  _conv_id uuid;
BEGIN
  IF NEW.status <> 'ok' THEN RETURN NEW; END IF;
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  -- Skip promo-generated conversions to avoid loops
  IF NEW.offer_name LIKE 'Промокод:%' OR NEW.offer_name LIKE 'Приз:%' THEN RETURN NEW; END IF;

  FOR _p IN
    SELECT * FROM public.promo_codes
    WHERE active = true
      AND now() BETWEEN starts_at AND ends_at
      AND bonus_amount > 0
      AND (trigger_offer_id IS NULL OR trigger_offer_id = NEW.offer_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.promo_activations pa
        WHERE pa.promo_id = promo_codes.id AND pa.user_id = NEW.user_id
      )
  LOOP
    -- Optional cap: total activations
    IF _p.max_activations IS NOT NULL THEN
      SELECT COUNT(*) INTO _acts FROM public.promo_activations WHERE promo_id = _p.id;
      IF _acts >= _p.max_activations THEN CONTINUE; END IF;
    END IF;

    -- Count qualifying user conversions during promo window
    SELECT COUNT(*) INTO _cnt
    FROM public.conversions c
    WHERE c.user_id = NEW.user_id
      AND c.status = 'ok'
      AND c.created_at >= _p.starts_at
      AND c.created_at <= NEW.created_at
      AND (_p.trigger_offer_id IS NULL OR c.offer_id = _p.trigger_offer_id)
      AND c.offer_name NOT LIKE 'Промокод:%'
      AND c.offer_name NOT LIKE 'Приз:%';

    IF _cnt < _p.trigger_conversions_count THEN CONTINUE; END IF;

    INSERT INTO public.conversions (user_id, offer_id, offer_name, amount, status, base_amount, bonus_pct, bonus_amount)
    VALUES (NEW.user_id, NULL, 'Промокод: ' || _p.title, _p.bonus_amount, 'ok', _p.bonus_amount, 0, 0)
    RETURNING id INTO _conv_id;

    INSERT INTO public.promo_activations (promo_id, user_id, conversion_id, amount)
    VALUES (_p.id, NEW.user_id, _conv_id, _p.bonus_amount)
    ON CONFLICT (promo_id, user_id) DO NOTHING;

    INSERT INTO public.notifications (user_id, kind, title, body, amount, status)
    VALUES (
      NEW.user_id, 'payout',
      'Промокод активирован: ' || _p.title,
      COALESCE(_p.description, 'Бонус за выполнение условий промокода.') ||
        ' Начислено ' || _p.bonus_amount::text || ' ₽ на баланс.',
      _p.bonus_amount::text, 'paid'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS conversions_auto_apply_promos ON public.conversions;
CREATE TRIGGER conversions_auto_apply_promos
  AFTER INSERT ON public.conversions
  FOR EACH ROW EXECUTE FUNCTION public.auto_apply_promos();
