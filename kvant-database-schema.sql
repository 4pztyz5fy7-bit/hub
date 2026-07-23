-- ============================================================
-- КВАНТ — полная схема базы данных (public)
-- Вставьте целиком в SQL Editor Supabase и выполните.
-- ============================================================

BEGIN;

-- Расширения
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================== ENUMS ===========================
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin','user'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.level_tier AS ENUM ('start','silver','gold','platinum','diamond'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.link_status AS ENUM ('new','review','approved','rejected','in_progress','completed','finished','paid'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.payout_status AS ENUM ('pending','processing','paid','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========================= SEQUENCES =========================
CREATE SEQUENCE IF NOT EXISTS public.link_requests_code_seq;

-- ========================== TABLES ===========================
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'trophy'::text,
  tier text NOT NULL DEFAULT 'bronze'::text,
  metric text NOT NULL,
  threshold numeric NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.banners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT ''::text,
  text text NOT NULL DEFAULT ''::text,
  button_label text NOT NULL DEFAULT 'Подробнее'::text,
  button_url text NOT NULL DEFAULT ''::text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.competition_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.competitions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  prize_pool numeric NOT NULL DEFAULT 0,
  prizes jsonb NOT NULL DEFAULT '[]'::jsonb,
  metric text NOT NULL DEFAULT 'earned'::text,
  min_level level_tier NOT NULL DEFAULT 'diamond'::level_tier,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  banner_url text,
  rules text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  settled_by uuid,
  winners jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE TABLE IF NOT EXISTS public.conversions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  offer_id text,
  offer_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  base_amount numeric,
  bonus_pct numeric,
  bonus_amount numeric,
  competition_id uuid
);
CREATE TABLE IF NOT EXISTS public.email_settings (
  id smallint NOT NULL DEFAULT 1,
  enabled boolean NOT NULL DEFAULT false,
  smtp_host text NOT NULL DEFAULT ''::text,
  smtp_port integer NOT NULL DEFAULT 587,
  smtp_secure boolean NOT NULL DEFAULT false,
  smtp_user text NOT NULL DEFAULT ''::text,
  smtp_pass text NOT NULL DEFAULT ''::text,
  from_email text NOT NULL DEFAULT ''::text,
  from_name text NOT NULL DEFAULT 'КВАНТ'::text,
  reply_to text NOT NULL DEFAULT ''::text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
CREATE TABLE IF NOT EXISTS public.link_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  offer_id text,
  offer_name text NOT NULL,
  offer_tag text,
  source text,
  sub text,
  link text,
  status link_status NOT NULL DEFAULT 'new'::link_status,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  orders_count integer NOT NULL DEFAULT 0,
  payout_override numeric,
  credited_at timestamptz,
  credit_conversion_id uuid,
  code text NOT NULL DEFAULT ('KV-'::text || lpad((nextval('link_requests_code_seq'::regclass))::text, 6, '0'::text))
);
CREATE TABLE IF NOT EXISTS public.news_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL DEFAULT ''::text,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  amount text,
  status text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid
);
CREATE TABLE IF NOT EXISTS public.offers (
  id text NOT NULL,
  name text NOT NULL,
  tag text NOT NULL,
  advertiser text,
  geo text,
  payout text NOT NULL,
  epc integer NOT NULL DEFAULT 0,
  hold text,
  goal text,
  description text,
  requirements text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  category text,
  cr numeric NOT NULL DEFAULT 0,
  is_new boolean NOT NULL DEFAULT false,
  allowed text[] NOT NULL DEFAULT '{}'::text[],
  denied text[] NOT NULL DEFAULT '{}'::text[],
  landing text,
  image_url text,
  payout_kind text NOT NULL DEFAULT 'exact'::text,
  payout_min numeric,
  payout_max numeric,
  city_payouts jsonb NOT NULL DEFAULT '[]'::jsonb,
  min_level level_tier NOT NULL DEFAULT 'start'::level_tier,
  income text,
  target_action text,
  work_rules text,
  ad_materials text,
  feedback text,
  term_completion text,
  term_confirmation text,
  avg_orders_per_courier numeric NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  method text NOT NULL,
  destination text,
  status payout_status NOT NULL DEFAULT 'pending'::payout_status,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  email text,
  display_name text,
  telegram text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  bank jsonb,
  phone text,
  bio text,
  city text,
  website text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  blocked boolean NOT NULL DEFAULT false,
  blocked_reason text,
  blocked_at timestamptz,
  warnings_count integer NOT NULL DEFAULT 0,
  streak_days integer NOT NULL DEFAULT 0,
  streak_best integer NOT NULL DEFAULT 0,
  last_activity_date date
);
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  author_id uuid NOT NULL,
  from_admin boolean NOT NULL DEFAULT false,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open'::text,
  priority text NOT NULL DEFAULT 'normal'::text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  unread_user integer NOT NULL DEFAULT 0,
  unread_admin integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.team_members (
  user_id uuid NOT NULL,
  position_id uuid NOT NULL,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.team_positions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  permissions text[] NOT NULL DEFAULT '{}'::text[],
  is_leadership boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL
);

-- ======================== CONSTRAINTS ========================
DO $$ BEGIN ALTER TABLE achievements ADD CONSTRAINT achievements_code_key UNIQUE (code); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE achievements ADD CONSTRAINT achievements_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE banners ADD CONSTRAINT banners_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE competition_participants ADD CONSTRAINT competition_participants_competition_id_user_id_key UNIQUE (competition_id, user_id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE competition_participants ADD CONSTRAINT competition_participants_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE competition_participants ADD CONSTRAINT competition_participants_competition_id_fkey FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE competition_participants ADD CONSTRAINT competition_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE competitions ADD CONSTRAINT competitions_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE competitions ADD CONSTRAINT competitions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE competitions ADD CONSTRAINT competitions_metric_check CHECK ((metric = ANY (ARRAY['earned'::text, 'conversions'::text, 'requests'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE conversions ADD CONSTRAINT conversions_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE conversions ADD CONSTRAINT conversions_competition_id_fkey FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE conversions ADD CONSTRAINT conversions_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE conversions ADD CONSTRAINT conversions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE email_settings ADD CONSTRAINT email_settings_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE email_settings ADD CONSTRAINT email_settings_singleton CHECK ((id = 1)); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE link_requests ADD CONSTRAINT link_requests_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE link_requests ADD CONSTRAINT link_requests_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE link_requests ADD CONSTRAINT link_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE news_posts ADD CONSTRAINT news_posts_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE offers ADD CONSTRAINT offers_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE offers ADD CONSTRAINT offers_payout_kind_check CHECK ((payout_kind = ANY (ARRAY['exact'::text, 'up_to'::text, 'from'::text, 'range'::text]))); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE payout_requests ADD CONSTRAINT payout_requests_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE payout_requests ADD CONSTRAINT payout_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE payout_requests ADD CONSTRAINT payout_requests_amount_check CHECK ((amount > (0)::numeric)); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE support_messages ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE support_messages ADD CONSTRAINT support_messages_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE support_messages ADD CONSTRAINT support_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE team_members ADD CONSTRAINT team_members_pkey PRIMARY KEY (user_id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE team_members ADD CONSTRAINT team_members_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE team_members ADD CONSTRAINT team_members_position_id_fkey FOREIGN KEY (position_id) REFERENCES team_positions(id) ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE team_members ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE team_positions ADD CONSTRAINT team_positions_code_key UNIQUE (code); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE team_positions ADD CONSTRAINT team_positions_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE user_achievements ADD CONSTRAINT user_achievements_user_id_achievement_id_key UNIQUE (user_id, achievement_id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE user_achievements ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE user_achievements ADD CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE user_achievements ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; WHEN others THEN NULL; END $$;

-- ========================== INDEXES ==========================
CREATE INDEX IF NOT EXISTS competitions_active_idx ON public.competitions USING btree (active, ends_at DESC);
CREATE INDEX IF NOT EXISTS conversions_user_id_created_at_idx ON public.conversions USING btree (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS link_requests_code_unique ON public.link_requests USING btree (code);
CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx ON public.notifications USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS offers_min_level_idx ON public.offers USING btree (min_level);
CREATE INDEX IF NOT EXISTS support_messages_ticket_idx ON public.support_messages USING btree (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON public.support_tickets USING btree (user_id, last_message_at DESC);

-- ========================= FUNCTIONS =========================
-- Role helper functions (needed by later policies and function bodies)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$function$
;
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$function$
;



CREATE OR REPLACE FUNCTION public.admin_delete_payout(_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _row public.payout_requests%ROWTYPE;
  _amount_str text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
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
$function$
;
CREATE OR REPLACE FUNCTION public.admin_set_link_request_status(_request_id uuid, _new_status link_status, _payout_override numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _req public.link_requests%ROWTYPE;
  _offer public.offers%ROWTYPE;
  _base numeric := 0;
  _amount numeric := 0;
  _bonus_pct numeric := 0;
  _bonus_amt numeric := 0;
  _earned numeric := 0;
  _conv_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _req FROM public.link_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'request not found';
  END IF;

  IF _payout_override IS NOT NULL THEN
    UPDATE public.link_requests SET payout_override = _payout_override, updated_at = now()
      WHERE id = _request_id;
    _req.payout_override := _payout_override;
  END IF;

  IF _new_status = 'paid' AND _req.credited_at IS NULL THEN
    IF _req.offer_id IS NOT NULL THEN
      SELECT * INTO _offer FROM public.offers WHERE id = _req.offer_id;
    END IF;

    IF _req.payout_override IS NOT NULL AND _req.payout_override > 0 THEN
      _base := _req.payout_override;
    ELSIF _offer.id IS NOT NULL THEN
      IF _offer.payout_kind = 'exact' AND _offer.payout_min IS NOT NULL THEN
        _base := _offer.payout_min;
      ELSE
        _base := COALESCE(NULLIF(regexp_replace(COALESCE(_offer.payout,''), '[^0-9.]', '', 'g'), '')::numeric, 0);
        IF _base = 0 THEN _base := COALESCE(_offer.payout_max, _offer.payout_min, 0); END IF;
      END IF;
    END IF;

    IF _base > 0 THEN
      SELECT COALESCE(SUM(amount), 0) INTO _earned
        FROM public.conversions WHERE user_id = _req.user_id AND status = 'ok';
      _bonus_pct := public.level_bonus_pct(_earned);
      _bonus_amt := ROUND(_base * _bonus_pct / 100.0, 2);
      _amount := _base + _bonus_amt;

      INSERT INTO public.conversions (user_id, offer_id, offer_name, amount, status, base_amount, bonus_pct, bonus_amount)
      VALUES (_req.user_id, _req.offer_id, _req.offer_name, _amount, 'ok', _base, _bonus_pct, _bonus_amt)
      RETURNING id INTO _conv_id;

      INSERT INTO public.notifications (user_id, kind, title, body, amount, status)
      VALUES (
        _req.user_id, 'payout', 'Начисление за оффер',
        _req.offer_name || ': начислено ' || _amount::text || ' ₽'
          || CASE WHEN _bonus_pct > 0
               THEN ' (база ' || _base::text || ' ₽ + бонус уровня ' || _bonus_pct::text || '% = ' || _bonus_amt::text || ' ₽)'
               ELSE '' END,
        _amount::text, 'paid'
      );
    END IF;

    UPDATE public.link_requests
      SET status = _new_status,
          credited_at = now(),
          credit_conversion_id = _conv_id,
          updated_at = now()
      WHERE id = _request_id;
  ELSE
    UPDATE public.link_requests
      SET status = _new_status, updated_at = now()
      WHERE id = _request_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'base_amount', _base,
    'bonus_pct', _bonus_pct,
    'bonus_amount', _bonus_amt,
    'credited_amount', _amount,
    'conversion_id', _conv_id
  );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.auto_settle_competitions()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _id uuid;
  _n int := 0;
BEGIN
  FOR _id IN
    SELECT id FROM public.competitions
    WHERE settled_at IS NULL AND ends_at <= now()
  LOOP
    BEGIN
      PERFORM public.settle_competition(_id);
      _n := _n + 1;
    EXCEPTION WHEN OTHERS THEN
      -- swallow so one bad row doesn't block others
      RAISE NOTICE 'settle failed for %: %', _id, SQLERRM;
    END;
  END LOOP;
  RETURN _n;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.award_achievements()
 RETURNS TABLE(unlocked_code text, unlocked_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _earned numeric;
  _conv int;
  _req int;
  _streak int;
  _r record;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT COALESCE(SUM(amount),0) INTO _earned
    FROM public.conversions WHERE user_id = _uid AND status = 'ok';
  SELECT COUNT(*) INTO _conv
    FROM public.conversions WHERE user_id = _uid AND status = 'ok';
  SELECT COUNT(*) INTO _req
    FROM public.link_requests WHERE user_id = _uid;
  SELECT COALESCE(streak_days,0) INTO _streak
    FROM public.profiles WHERE id = _uid;

  FOR _r IN
    SELECT a.* FROM public.achievements a
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_achievements ua
      WHERE ua.user_id = _uid AND ua.achievement_id = a.id
    )
    AND (
      (a.metric = 'earned'      AND _earned >= a.threshold) OR
      (a.metric = 'conversions' AND _conv   >= a.threshold) OR
      (a.metric = 'requests'    AND _req    >= a.threshold) OR
      (a.metric = 'streak'      AND _streak >= a.threshold)
    )
  LOOP
    INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (_uid, _r.id) ON CONFLICT DO NOTHING;
    INSERT INTO public.notifications (user_id, kind, title, body, status)
      VALUES (_uid, 'achievement', 'Новое достижение: ' || _r.name, _r.description, 'unlocked');
    unlocked_code := _r.code;
    unlocked_name := _r.name;
    RETURN NEXT;
  END LOOP;
END; $function$
;
CREATE OR REPLACE FUNCTION public.competitions_notify_start()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _became_active boolean;
  _min numeric;
BEGIN
  _became_active := (TG_OP = 'INSERT' AND NEW.active)
                 OR (TG_OP = 'UPDATE' AND NEW.active AND COALESCE(OLD.active, false) = false);
  IF NOT _became_active THEN RETURN NEW; END IF;
  IF NEW.settled_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.ends_at <= now() THEN RETURN NEW; END IF;

  _min := public.level_min_earned(NEW.min_level);

  INSERT INTO public.notifications (user_id, kind, title, body, status)
  SELECT
    p.id,
    'competition',
    'Новый турнир: ' || NEW.title,
    'Открыт приём заявок. Призовой фонд ' || NEW.prize_pool::text || ' ₽. Доступно уровню '
      || CASE NEW.min_level
           WHEN 'start' THEN 'Старт'
           WHEN 'silver' THEN 'Серебро'
           WHEN 'gold' THEN 'Золото'
           WHEN 'platinum' THEN 'Платина'
           WHEN 'diamond' THEN 'Бриллиант'
         END || '+.',
    'active'
  FROM public.profiles p
  WHERE (
    SELECT COALESCE(SUM(cx.amount),0)
    FROM public.conversions cx
    WHERE cx.user_id = p.id AND cx.status = 'ok'
  ) >= _min;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.competitions_notify_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _msg text;
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;
  IF NEW.settled_at IS NOT NULL AND OLD.settled_at IS NULL THEN
    RETURN NEW; -- settle handles its own notifications
  END IF;

  IF OLD.active = true AND NEW.active = false AND NEW.settled_at IS NULL THEN
    _msg := 'Приём заявок временно приостановлен.';
  ELSIF OLD.ends_at IS DISTINCT FROM NEW.ends_at AND NEW.active AND NEW.settled_at IS NULL THEN
    _msg := 'Изменена дата завершения: ' || to_char(NEW.ends_at AT TIME ZONE 'UTC', 'DD.MM.YYYY HH24:MI') || ' UTC.';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, kind, title, body, status)
  SELECT cp.user_id, 'competition', 'Обновление турнира: ' || NEW.title, _msg, 'active'
  FROM public.competition_participants cp
  WHERE cp.competition_id = NEW.id;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.current_team_permissions()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT jsonb_build_object(
        'position_code', tp.code,
        'position_name', tp.name,
        'is_leadership', tp.is_leadership,
        'permissions', to_jsonb(tp.permissions)
      )
      FROM public.team_members tm
      JOIN public.team_positions tp ON tp.id = tm.position_id
      WHERE tm.user_id = auth.uid()
      LIMIT 1),
    CASE WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN
      jsonb_build_object(
        'position_code', 'legacy_admin',
        'position_name', 'Администратор',
        'is_leadership', true,
        'permissions', to_jsonb(ARRAY['*']::text[])
      )
    ELSE
      jsonb_build_object('position_code', null, 'position_name', null, 'is_leadership', false, 'permissions', '[]'::jsonb)
    END
  );
$function$
;
CREATE OR REPLACE FUNCTION public.get_competition_leaderboard(_competition_id uuid, _limit integer DEFAULT 50)
 RETURNS TABLE(user_id uuid, display_name text, avatar_url text, score numeric, is_me boolean, rank integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _c public.competitions%ROWTYPE;
  _me uuid := auth.uid();
  _min numeric;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO _c FROM public.competitions WHERE id = _competition_id;
  IF NOT FOUND OR NOT _c.active THEN RETURN; END IF;
  _min := CASE _c.min_level
    WHEN 'start' THEN 0 WHEN 'silver' THEN 50000 WHEN 'gold' THEN 150000
    WHEN 'platinum' THEN 500000 WHEN 'diamond' THEN 1500000
  END;

  RETURN QUERY
  WITH raw AS (
    SELECT c.user_id AS uid,
      CASE _c.metric
        WHEN 'earned'      THEN COALESCE(SUM(c.amount),0)::numeric
        WHEN 'conversions' THEN COUNT(*)::numeric
        ELSE 0::numeric END AS s
    FROM public.conversions c
    WHERE c.status = 'ok'
      AND c.created_at >= _c.starts_at AND c.created_at < _c.ends_at
      AND _c.metric IN ('earned','conversions')
    GROUP BY c.user_id
    UNION ALL
    SELECT r.user_id AS uid, COUNT(*)::numeric AS s
    FROM public.link_requests r
    WHERE _c.metric = 'requests'
      AND r.created_at >= _c.starts_at AND r.created_at < _c.ends_at
    GROUP BY r.user_id
  ),
  scored AS (
    SELECT raw.uid, raw.s AS score,
      COALESCE(NULLIF(p.display_name,''), 'Партнёр') AS dname, p.avatar_url AS av
    FROM raw LEFT JOIN public.profiles p ON p.id = raw.uid
    WHERE raw.uid IS NOT NULL
      AND (SELECT COALESCE(SUM(cx.amount),0) FROM public.conversions cx
           WHERE cx.user_id = raw.uid AND cx.status = 'ok') >= _min
  )
  SELECT s.uid, s.dname, s.av, s.score, (s.uid = _me),
         ROW_NUMBER() OVER (ORDER BY s.score DESC)::int
  FROM scored s
  WHERE s.score > 0
  ORDER BY s.score DESC
  LIMIT _limit;
END; $function$
;
CREATE OR REPLACE FUNCTION public.get_landing_stats()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH
    partners AS (
      SELECT count(*)::int AS c FROM public.profiles p
      WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin')
    ),
    offers_active AS (SELECT count(*)::int AS c FROM public.offers WHERE active = true),
    paid_sum AS (SELECT COALESCE(sum(amount),0)::numeric AS s FROM public.payout_requests WHERE status = 'paid'),
    conv_agg AS (SELECT COALESCE(sum(amount),0)::numeric AS s, count(*)::int AS c FROM public.conversions WHERE status = 'ok'),
    top_offers AS (
      SELECT id, name, category, payout, cr, epc, is_new
      FROM public.offers WHERE active = true
      ORDER BY epc DESC NULLS LAST LIMIT 6
    ),
    recent_conv AS (
      SELECT offer_name, amount, user_id, created_at FROM public.conversions
      WHERE status = 'ok' ORDER BY created_at DESC LIMIT 10
    ),
    recent_signups AS (
      SELECT p.id, p.display_name, p.email, p.created_at FROM public.profiles p
      WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin')
      ORDER BY p.created_at DESC LIMIT 8
    ),
    recent_offers AS (
      SELECT name, created_at FROM public.offers
      WHERE active = true ORDER BY created_at DESC LIMIT 5
    ),
    recent_payouts AS (
      SELECT amount, user_id, created_at FROM public.payout_requests
      WHERE status = 'paid' ORDER BY created_at DESC LIMIT 8
    ),
    recent_reqs AS (
      SELECT offer_name, user_id, status::text AS status, orders_count, created_at
      FROM public.link_requests ORDER BY created_at DESC LIMIT 12
    ),
    all_uids AS (
      SELECT user_id FROM recent_conv WHERE user_id IS NOT NULL
      UNION SELECT user_id FROM recent_payouts WHERE user_id IS NOT NULL
      UNION SELECT user_id FROM recent_reqs WHERE user_id IS NOT NULL
    ),
    names AS (
      SELECT p.id, p.display_name, p.email FROM public.profiles p
      JOIN all_uids u ON u.user_id = p.id
    )
  SELECT jsonb_build_object(
    'partners', (SELECT c FROM partners),
    'offersCount', (SELECT c FROM offers_active),
    'totalPaid', (SELECT s FROM paid_sum) + (SELECT s FROM conv_agg),
    'completedConversions', (SELECT c FROM conv_agg),
    'topOffers', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM top_offers t), '[]'::jsonb),
    'recentConv', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM recent_conv t), '[]'::jsonb),
    'recentSignups', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM recent_signups t), '[]'::jsonb),
    'recentOffers', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM recent_offers t), '[]'::jsonb),
    'recentPayouts', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM recent_payouts t), '[]'::jsonb),
    'recentReqs', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM recent_reqs t), '[]'::jsonb),
    'names', COALESCE((SELECT jsonb_object_agg(id::text, jsonb_build_object('display_name', display_name, 'email', email)) FROM names), '{}'::jsonb)
  );
$function$
;
CREATE OR REPLACE FUNCTION public.get_leaderboard(_period text DEFAULT 'week'::text, _limit integer DEFAULT 20)
 RETURNS TABLE(user_id uuid, display_name text, avatar_url text, total numeric, conversions bigint, is_me boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _since timestamptz;
  _me uuid := auth.uid();
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  _since := CASE _period
    WHEN 'day'   THEN now() - interval '1 day'
    WHEN 'week'  THEN now() - interval '7 days'
    WHEN 'month' THEN now() - interval '30 days'
    ELSE now() - interval '365 days'
  END;

  RETURN QUERY
  SELECT
    c.user_id,
    COALESCE(NULLIF(p.display_name,''), 'Партнёр') AS display_name,
    p.avatar_url,
    COALESCE(SUM(c.amount),0)::numeric AS total,
    COUNT(*)::bigint AS conversions,
    (c.user_id = _me) AS is_me
  FROM public.conversions c
  LEFT JOIN public.profiles p ON p.id = c.user_id
  WHERE c.status = 'ok' AND c.created_at >= _since
  GROUP BY c.user_id, p.display_name, p.avatar_url
  ORDER BY total DESC
  LIMIT _limit;
END; $function$
;
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE
    SET avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.is_leadership(_uid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.team_positions tp ON tp.id = tm.position_id
    WHERE tm.user_id = _uid AND tp.is_leadership = true
  );
$function$
;
CREATE OR REPLACE FUNCTION public.is_team_member(_uid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.user_id = _uid
  );
$function$
;
CREATE OR REPLACE FUNCTION public.join_competition(_competition_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _c public.competitions%ROWTYPE;
  _earned numeric;
  _min numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO _c FROM public.competitions WHERE id = _competition_id AND active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF now() >= _c.ends_at THEN RETURN jsonb_build_object('ok', false, 'error', 'ended'); END IF;

  _min := public.level_min_earned(_c.min_level);
  SELECT COALESCE(SUM(amount),0) INTO _earned FROM public.conversions WHERE user_id = _uid AND status = 'ok';
  IF _earned < _min THEN
    RETURN jsonb_build_object('ok', false, 'error', 'level', 'required', _min, 'earned', _earned);
  END IF;

  INSERT INTO public.competition_participants (competition_id, user_id)
    VALUES (_competition_id, _uid)
    ON CONFLICT (competition_id, user_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END; $function$
;
CREATE OR REPLACE FUNCTION public.level_bonus_pct(_earned numeric)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _earned >= 1500000 THEN 12
    WHEN _earned >= 500000  THEN 8
    WHEN _earned >= 150000  THEN 5
    WHEN _earned >= 50000   THEN 2
    ELSE 0
  END::numeric;
$function$
;
CREATE OR REPLACE FUNCTION public.level_min_earned(_tier level_tier)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE _tier
    WHEN 'start'    THEN 0
    WHEN 'silver'   THEN 50000
    WHEN 'gold'     THEN 150000
    WHEN 'platinum' THEN 500000
    WHEN 'diamond'  THEN 1500000
  END::numeric;
$function$
;
CREATE OR REPLACE FUNCTION public.link_requests_set_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'KV-' || lpad(nextval('public.link_requests_code_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.notify_competition_ranks()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _c public.competitions%ROWTYPE;
  _n int := 0;
  _hrs int;
BEGIN
  FOR _c IN
    SELECT * FROM public.competitions
    WHERE active = true AND settled_at IS NULL AND ends_at > now() AND starts_at <= now()
  LOOP
    _hrs := GREATEST(0, EXTRACT(EPOCH FROM (_c.ends_at - now()))::int / 3600);

    WITH raw AS (
      SELECT c.user_id AS uid,
        CASE _c.metric
          WHEN 'earned'      THEN COALESCE(SUM(c.amount),0)::numeric
          WHEN 'conversions' THEN COUNT(*)::numeric
          ELSE 0::numeric
        END AS s
      FROM public.conversions c
      WHERE c.status = 'ok'
        AND c.created_at >= _c.starts_at AND c.created_at < _c.ends_at
        AND _c.metric IN ('earned','conversions')
      GROUP BY c.user_id
      UNION ALL
      SELECT r.user_id AS uid, COUNT(*)::numeric AS s
      FROM public.link_requests r
      WHERE _c.metric = 'requests'
        AND r.created_at >= _c.starts_at AND r.created_at < _c.ends_at
      GROUP BY r.user_id
    ),
    filtered AS (
      SELECT raw.uid, raw.s AS score FROM raw
      WHERE raw.uid IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.competition_participants cp
          WHERE cp.competition_id = _c.id AND cp.user_id = raw.uid
        )
    ),
    ranked AS (
      SELECT uid, score, ROW_NUMBER() OVER (ORDER BY score DESC, uid)::int AS rnk,
             COUNT(*) OVER () AS total
      FROM filtered WHERE score > 0
    )
    INSERT INTO public.notifications (user_id, kind, title, body, status)
    SELECT
      r.uid, 'competition',
      'Турнир «' || _c.title || '»: ваше место #' || r.rnk,
      'Текущий счёт: ' ||
        CASE _c.metric WHEN 'earned' THEN r.score::text || ' ₽' ELSE r.score::text END
        || ' из ' || r.total || ' участников. До финиша: ' || _hrs || ' ч.',
      'active'
    FROM ranked r;

    -- Also nudge participants with zero score
    INSERT INTO public.notifications (user_id, kind, title, body, status)
    SELECT cp.user_id, 'competition',
      'Турнир «' || _c.title || '»: пора включаться',
      'Вы пока не набрали очки. До финиша осталось ' || _hrs || ' ч.',
      'active'
    FROM public.competition_participants cp
    WHERE cp.competition_id = _c.id
      AND NOT EXISTS (
        SELECT 1 FROM public.conversions cx
        WHERE cx.user_id = cp.user_id AND cx.status = 'ok'
          AND cx.created_at >= _c.starts_at AND cx.created_at < _c.ends_at
      )
      AND _c.metric IN ('earned','conversions');

    _n := _n + 1;
  END LOOP;
  RETURN _n;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$
;
CREATE OR REPLACE FUNCTION public.settle_competition(_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _c public.competitions%ROWTYPE;
  _actor uuid := auth.uid();
  _is_admin boolean := false;
  _p jsonb;
  _place int;
  _amount numeric;
  _label text;
  _row record;
  _winners jsonb := '[]'::jsonb;
  _count int := 0;
  _total numeric := 0;
  _winner_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF _actor IS NOT NULL THEN
    _is_admin := public.has_role(_actor, 'admin');
    IF NOT _is_admin THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  END IF;

  SELECT * INTO _c FROM public.competitions WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF _c.settled_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_settled', 'settled_at', _c.settled_at);
  END IF;

  FOR _p IN SELECT jsonb_array_elements(COALESCE(_c.prizes, '[]'::jsonb))
  LOOP
    _place  := COALESCE((_p->>'place')::int, 0);
    _amount := COALESCE((_p->>'amount')::numeric, 0);
    _label  := COALESCE(_p->>'label', _place::text || ' место');
    IF _place <= 0 OR _amount <= 0 THEN CONTINUE; END IF;

    WITH raw AS (
      SELECT c.user_id AS uid,
        CASE _c.metric
          WHEN 'earned'      THEN COALESCE(SUM(c.amount),0)::numeric
          WHEN 'conversions' THEN COUNT(*)::numeric
          ELSE 0::numeric
        END AS s
      FROM public.conversions c
      WHERE c.status = 'ok'
        AND c.created_at >= _c.starts_at AND c.created_at < _c.ends_at
        AND _c.metric IN ('earned','conversions')
      GROUP BY c.user_id
      UNION ALL
      SELECT r.user_id AS uid, COUNT(*)::numeric AS s
      FROM public.link_requests r
      WHERE _c.metric = 'requests'
        AND r.created_at >= _c.starts_at AND r.created_at < _c.ends_at
      GROUP BY r.user_id
    ),
    filtered AS (
      SELECT raw.uid, raw.s AS score FROM raw
      WHERE raw.uid IS NOT NULL
        AND (SELECT COALESCE(SUM(cx.amount),0) FROM public.conversions cx
             WHERE cx.user_id = raw.uid AND cx.status = 'ok')
          >= public.level_min_earned(_c.min_level)
        AND EXISTS (
          SELECT 1 FROM public.competition_participants cp
          WHERE cp.competition_id = _c.id AND cp.user_id = raw.uid
        )
    ),
    ranked AS (
      SELECT uid, score, ROW_NUMBER() OVER (ORDER BY score DESC, uid) AS rnk
      FROM filtered WHERE score > 0
    )
    SELECT uid, score INTO _row FROM ranked WHERE rnk = _place;

    IF _row.uid IS NULL THEN CONTINUE; END IF;

    INSERT INTO public.conversions (user_id, offer_name, amount, status, base_amount, bonus_pct, bonus_amount, competition_id)
    VALUES (_row.uid, 'Приз: ' || _c.title || ' · ' || _label, _amount, 'ok', _amount, 0, 0, _c.id);

    INSERT INTO public.notifications (user_id, kind, title, body, amount, status)
    VALUES (
      _row.uid, 'payout',
      'Победа в соревновании: ' || _c.title,
      _label || ': начислено ' || _amount::text || ' ₽',
      _amount::text, 'paid'
    );

    _winners := _winners || jsonb_build_object('place', _place, 'user_id', _row.uid, 'amount', _amount, 'score', _row.score);
    _winner_ids := array_append(_winner_ids, _row.uid);
    _count := _count + 1;
    _total := _total + _amount;
  END LOOP;

  -- Non-winner participants: closing notice
  INSERT INTO public.notifications (user_id, kind, title, body, status)
  SELECT cp.user_id, 'competition',
    'Турнир завершён: ' || _c.title,
    'Спасибо за участие! Победители получили призы. Ждём вас в новых турнирах.',
    'active'
  FROM public.competition_participants cp
  WHERE cp.competition_id = _c.id AND NOT (cp.user_id = ANY(_winner_ids));

  UPDATE public.competitions
    SET settled_at = now(), settled_by = _actor, winners = _winners, active = false, updated_at = now()
    WHERE id = _id;

  RETURN jsonb_build_object('ok', true, 'winners', _winners, 'count', _count, 'total', _total);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.support_on_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.support_tickets
  SET
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at,
    status = CASE
      WHEN NEW.from_admin THEN 'pending'
      ELSE 'open'
    END,
    unread_user = CASE WHEN NEW.from_admin THEN unread_user + 1 ELSE unread_user END,
    unread_admin = CASE WHEN NEW.from_admin THEN unread_admin ELSE unread_admin + 1 END
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.support_tickets_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  -- Regular user updating own ticket: preserve admin-only fields
  NEW.status       := OLD.status;
  NEW.priority     := OLD.priority;
  NEW.unread_admin := OLD.unread_admin;
  NEW.last_message_at := OLD.last_message_at;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.team_members_sync_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.user_roles WHERE user_id = OLD.user_id AND role = 'admin';
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.touch_streak()
 RETURNS TABLE(streak_days integer, streak_best integer, last_activity_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _last date;
  _cur integer;
  _best integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT p.last_activity_date, p.streak_days, p.streak_best
    INTO _last, _cur, _best FROM public.profiles p WHERE p.id = _uid;
  IF _last IS NULL OR _today - _last > 1 THEN
    _cur := 1;
  ELSIF _today - _last = 1 THEN
    _cur := COALESCE(_cur,0) + 1;
  END IF;
  _best := GREATEST(COALESCE(_best,0), _cur);
  UPDATE public.profiles
    SET streak_days = _cur, streak_best = _best, last_activity_date = _today, updated_at = now()
    WHERE id = _uid;
  RETURN QUERY SELECT _cur, _best, _today;
END; $function$
;
CREATE OR REPLACE FUNCTION public.user_total_earned(_uid uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(amount), 0)::numeric
  FROM public.conversions
  WHERE user_id = _uid AND status = 'ok';
$function$
;

-- ========================== TRIGGERS =========================

-- Триггер на создание пользователя (auth.users)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================== GRANTS ==========================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competition_participants TO authenticated;
GRANT ALL ON public.competition_participants TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitions TO authenticated;
GRANT ALL ON public.competitions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversions TO authenticated;
GRANT ALL ON public.conversions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_settings TO authenticated;
GRANT ALL ON public.email_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.link_requests TO authenticated;
GRANT ALL ON public.link_requests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_posts TO authenticated;
GRANT ALL ON public.news_posts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payout_requests TO authenticated;
GRANT ALL ON public.payout_requests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_positions TO authenticated;
GRANT ALL ON public.team_positions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT ON public.offers, public.banners, public.news_posts, public.achievements TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- ============================ RLS ============================
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements FORCE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners FORCE ROW LEVEL SECURITY;
ALTER TABLE public.competition_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_participants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.link_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_posts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.team_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_positions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;

-- ========================= POLICIES ==========================
DROP POLICY IF EXISTS "achievements are public to signed-in users" ON public.achievements;
CREATE POLICY "achievements are public to signed-in users" ON public.achievements AS PERMISSIVE FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admins manage achievements" ON public.achievements;
CREATE POLICY "admins manage achievements" ON public.achievements AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "banners admin delete" ON public.banners;
CREATE POLICY "banners admin delete" ON public.banners AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "banners admin insert" ON public.banners;
CREATE POLICY "banners admin insert" ON public.banners AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "banners admin update" ON public.banners;
CREATE POLICY "banners admin update" ON public.banners AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "banners public read active" ON public.banners;
CREATE POLICY "banners public read active" ON public.banners AS PERMISSIVE FOR SELECT TO anon, authenticated USING (((active = true) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "admin manages participants" ON public.competition_participants;
CREATE POLICY "admin manages participants" ON public.competition_participants AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "join self" ON public.competition_participants;
CREATE POLICY "join self" ON public.competition_participants AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "leave self" ON public.competition_participants;
CREATE POLICY "leave self" ON public.competition_participants AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "read participants" ON public.competition_participants;
CREATE POLICY "read participants" ON public.competition_participants AS PERMISSIVE FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "competitions_admin_delete" ON public.competitions;
CREATE POLICY "competitions_admin_delete" ON public.competitions AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "competitions_admin_insert" ON public.competitions;
CREATE POLICY "competitions_admin_insert" ON public.competitions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "competitions_admin_update" ON public.competitions;
CREATE POLICY "competitions_admin_update" ON public.competitions AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "competitions_read_all_auth" ON public.competitions;
CREATE POLICY "competitions_read_all_auth" ON public.competitions AS PERMISSIVE FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "competitions_select_active" ON public.competitions;
CREATE POLICY "competitions_select_active" ON public.competitions AS PERMISSIVE FOR SELECT TO authenticated USING (((active = true) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "conversions read admin" ON public.conversions;
CREATE POLICY "conversions read admin" ON public.conversions AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "conversions read own" ON public.conversions;
CREATE POLICY "conversions read own" ON public.conversions AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "conversions write admin" ON public.conversions;
CREATE POLICY "conversions write admin" ON public.conversions AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "email_settings_admin_insert" ON public.email_settings;
CREATE POLICY "email_settings_admin_insert" ON public.email_settings AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) AND (id = 1)));
DROP POLICY IF EXISTS "email_settings_admin_select" ON public.email_settings;
CREATE POLICY "email_settings_admin_select" ON public.email_settings AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "email_settings_admin_update" ON public.email_settings;
CREATE POLICY "email_settings_admin_update" ON public.email_settings AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "links admin delete" ON public.link_requests;
CREATE POLICY "links admin delete" ON public.link_requests AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "links admin update" ON public.link_requests;
CREATE POLICY "links admin update" ON public.link_requests AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (true);
DROP POLICY IF EXISTS "links insert own" ON public.link_requests;
CREATE POLICY "links insert own" ON public.link_requests AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "links read admin" ON public.link_requests;
CREATE POLICY "links read admin" ON public.link_requests AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "links read own" ON public.link_requests;
CREATE POLICY "links read own" ON public.link_requests AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "news admin delete" ON public.news_posts;
CREATE POLICY "news admin delete" ON public.news_posts AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "news admin insert" ON public.news_posts;
CREATE POLICY "news admin insert" ON public.news_posts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "news admin update" ON public.news_posts;
CREATE POLICY "news admin update" ON public.news_posts AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "news public read published" ON public.news_posts;
CREATE POLICY "news public read published" ON public.news_posts AS PERMISSIVE FOR SELECT TO anon, authenticated USING (((published = true) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "Admins can update all notifications" ON public.notifications;
CREATE POLICY "Admins can update all notifications" ON public.notifications AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
CREATE POLICY "Admins can view all notifications" ON public.notifications AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "notif admin all" ON public.notifications;
CREATE POLICY "notif admin all" ON public.notifications AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "notif insert own" ON public.notifications;
CREATE POLICY "notif insert own" ON public.notifications AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "notif read own" ON public.notifications;
CREATE POLICY "notif read own" ON public.notifications AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "notif update own" ON public.notifications;
CREATE POLICY "notif update own" ON public.notifications AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "offers admin delete" ON public.offers;
CREATE POLICY "offers admin delete" ON public.offers AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "offers admin update" ON public.offers;
CREATE POLICY "offers admin update" ON public.offers AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (true);
DROP POLICY IF EXISTS "offers admin write" ON public.offers;
CREATE POLICY "offers admin write" ON public.offers AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "offers read all auth" ON public.offers;
CREATE POLICY "offers read all auth" ON public.offers AS PERMISSIVE FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "payouts admin delete" ON public.payout_requests;
CREATE POLICY "payouts admin delete" ON public.payout_requests AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "payouts admin update" ON public.payout_requests;
CREATE POLICY "payouts admin update" ON public.payout_requests AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (true);
DROP POLICY IF EXISTS "payouts insert own" ON public.payout_requests;
CREATE POLICY "payouts insert own" ON public.payout_requests AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "payouts read admin" ON public.payout_requests;
CREATE POLICY "payouts read admin" ON public.payout_requests AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "payouts read own" ON public.payout_requests;
CREATE POLICY "payouts read own" ON public.payout_requests AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "profiles select all for admin" ON public.profiles;
CREATE POLICY "profiles select all for admin" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "profiles select own" ON public.profiles;
CREATE POLICY "profiles select own" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = id));
DROP POLICY IF EXISTS "profiles update admin" ON public.profiles;
CREATE POLICY "profiles update admin" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (true);
DROP POLICY IF EXISTS "profiles update own" ON public.profiles;
CREATE POLICY "profiles update own" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));
DROP POLICY IF EXISTS "messages_insert_participant" ON public.support_messages;
CREATE POLICY "messages_insert_participant" ON public.support_messages AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((author_id = auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR (EXISTS (SELECT 1 FROM public.support_tickets t WHERE ((t.id = support_messages.ticket_id) AND (t.user_id = auth.uid())))))));
DROP POLICY IF EXISTS "messages_select_ticket_participant" ON public.support_messages;
CREATE POLICY "messages_select_ticket_participant" ON public.support_messages AS PERMISSIVE FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR (EXISTS (SELECT 1 FROM public.support_tickets t WHERE ((t.id = support_messages.ticket_id) AND (t.user_id = auth.uid()))))));
DROP POLICY IF EXISTS "tickets_insert_own" ON public.support_tickets;
CREATE POLICY "tickets_insert_own" ON public.support_tickets AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
DROP POLICY IF EXISTS "tickets_select_own_or_admin" ON public.support_tickets;
CREATE POLICY "tickets_select_own_or_admin" ON public.support_tickets AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "tickets_update_own_or_admin" ON public.support_tickets;
CREATE POLICY "tickets_update_own_or_admin" ON public.support_tickets AS PERMISSIVE FOR UPDATE TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "team_members manage by leadership" ON public.team_members;
CREATE POLICY "team_members manage by leadership" ON public.team_members AS PERMISSIVE FOR ALL TO authenticated USING (is_leadership(auth.uid())) WITH CHECK (is_leadership(auth.uid()));
DROP POLICY IF EXISTS "team_members read for team" ON public.team_members;
CREATE POLICY "team_members read for team" ON public.team_members AS PERMISSIVE FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR is_team_member(auth.uid())));
DROP POLICY IF EXISTS "team_positions manage by leadership" ON public.team_positions;
CREATE POLICY "team_positions manage by leadership" ON public.team_positions AS PERMISSIVE FOR ALL TO authenticated USING (is_leadership(auth.uid())) WITH CHECK (is_leadership(auth.uid()));
DROP POLICY IF EXISTS "team_positions read for team" ON public.team_positions;
CREATE POLICY "team_positions read for team" ON public.team_positions AS PERMISSIVE FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR is_team_member(auth.uid())));
DROP POLICY IF EXISTS "users read their achievements" ON public.user_achievements;
CREATE POLICY "users read their achievements" ON public.user_achievements AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "roles admin delete" ON public.user_roles;
CREATE POLICY "roles admin delete" ON public.user_roles AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "roles admin insert" ON public.user_roles;
CREATE POLICY "roles admin insert" ON public.user_roles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "roles read all admin" ON public.user_roles;
CREATE POLICY "roles read all admin" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "roles read own" ON public.user_roles;
CREATE POLICY "roles read own" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));

-- ========================= REALTIME ==========================
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;
ALTER TABLE public.link_requests REPLICA IDENTITY FULL;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.link_requests; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;
ALTER TABLE public.payout_requests REPLICA IDENTITY FULL;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.payout_requests; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;
ALTER TABLE public.conversions REPLICA IDENTITY FULL;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversions; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;
ALTER TABLE public.banners REPLICA IDENTITY FULL;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.banners; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;
ALTER TABLE public.news_posts REPLICA IDENTITY FULL;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.news_posts; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;
ALTER TABLE public.competitions REPLICA IDENTITY FULL;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.competitions; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;
ALTER TABLE public.competition_participants REPLICA IDENTITY FULL;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.competition_participants; EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;

COMMIT;

-- Готово. Не забудьте создать администратора через Authentication → Users
-- и вставить строку в public.user_roles (user_id, role='admin').
