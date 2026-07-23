-- KVANT database — full schema dump (all migrations combined)
-- Generated: 2026-07-23T04:35:55Z


-- ============================================================
-- Migration: 20260715190818_7901c5a5-788a-45f9-bf0b-56076dd6620f.sql
-- ============================================================

-- ============ Enums ============
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin', 'user'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ profiles ============
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  telegram text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ user_roles ============
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============ Profile RLS ============
DROP POLICY IF EXISTS "profiles select own" ON public.profiles;
CREATE POLICY "profiles select own" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles select all for admin" ON public.profiles;
CREATE POLICY "profiles select all for admin" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "profiles update own" ON public.profiles;
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles update admin" ON public.profiles;
CREATE POLICY "profiles update admin" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ user_roles RLS ============
DROP POLICY IF EXISTS "roles read own" ON public.user_roles;
CREATE POLICY "roles read own" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "roles read all admin" ON public.user_roles;
CREATE POLICY "roles read all admin" ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ Auto profile + default user role on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ offers (admin-managed catalog) ============
CREATE TABLE IF NOT EXISTS public.offers (
  id text PRIMARY KEY,
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
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "offers read all auth" ON public.offers;
CREATE POLICY "offers read all auth" ON public.offers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "offers admin write" ON public.offers;
CREATE POLICY "offers admin write" ON public.offers FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "offers admin update" ON public.offers;
CREATE POLICY "offers admin update" ON public.offers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "offers admin delete" ON public.offers;
CREATE POLICY "offers admin delete" ON public.offers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_offers_updated ON public.offers;
CREATE TRIGGER trg_offers_updated BEFORE UPDATE ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ payout_requests ============
DO $$ BEGIN CREATE TYPE public.payout_status AS ENUM ('pending', 'processing', 'paid', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  method text NOT NULL,
  destination text,
  status public.payout_status NOT NULL DEFAULT 'pending',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.payout_requests TO authenticated;
GRANT ALL ON public.payout_requests TO service_role;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payouts read own" ON public.payout_requests;
CREATE POLICY "payouts read own" ON public.payout_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "payouts read admin" ON public.payout_requests;
CREATE POLICY "payouts read admin" ON public.payout_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "payouts insert own" ON public.payout_requests;
CREATE POLICY "payouts insert own" ON public.payout_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "payouts admin update" ON public.payout_requests;
CREATE POLICY "payouts admin update" ON public.payout_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_payouts_updated ON public.payout_requests;
CREATE TRIGGER trg_payouts_updated BEFORE UPDATE ON public.payout_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ link_requests ============
DO $$ BEGIN CREATE TYPE public.link_status AS ENUM ('new', 'review', 'approved', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.link_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id text REFERENCES public.offers(id) ON DELETE SET NULL,
  offer_name text NOT NULL,
  offer_tag text,
  source text,
  sub text,
  link text,
  status public.link_status NOT NULL DEFAULT 'new',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.link_requests TO authenticated;
GRANT ALL ON public.link_requests TO service_role;
ALTER TABLE public.link_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "links read own" ON public.link_requests;
CREATE POLICY "links read own" ON public.link_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "links read admin" ON public.link_requests;
CREATE POLICY "links read admin" ON public.link_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "links insert own" ON public.link_requests;
CREATE POLICY "links insert own" ON public.link_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "links admin update" ON public.link_requests;
CREATE POLICY "links admin update" ON public.link_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_links_updated ON public.link_requests;
CREATE TRIGGER trg_links_updated BEFORE UPDATE ON public.link_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- Migration: 20260715190831_dc2576b0-796c-4511-af8f-9f7c680c99c3.sql
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;


-- ============================================================
-- Migration: 20260715191020_e6de9784-9b96-4326-b783-540c13a27479.sql
-- ============================================================

CREATE POLICY "roles admin insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles admin delete" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


-- ============================================================
-- Migration: 20260716040408_ca392c29-7237-4156-8666-894be3481466.sql
-- ============================================================

-- 1. Extend offers with fields the UI already renders
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS cr numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_new boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allowed text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS denied text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS landing text;

-- 2. Conversions (attributed clicks/leads shown on dashboard)
CREATE TABLE IF NOT EXISTS public.conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id text REFERENCES public.offers(id) ON DELETE SET NULL,
  offer_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversions TO authenticated;
GRANT ALL ON public.conversions TO service_role;
ALTER TABLE public.conversions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversions read own" ON public.conversions;
CREATE POLICY "conversions read own" ON public.conversions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "conversions insert own" ON public.conversions;
CREATE POLICY "conversions insert own" ON public.conversions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "conversions read admin" ON public.conversions;
CREATE POLICY "conversions read admin" ON public.conversions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "conversions write admin" ON public.conversions;
CREATE POLICY "conversions write admin" ON public.conversions FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS conversions_user_id_created_at_idx ON public.conversions (user_id, created_at DESC);

-- 3. Notifications for the bell/list on dashboard
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  amount text,
  status text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif read own" ON public.notifications;
CREATE POLICY "notif read own" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif insert own" ON public.notifications;
CREATE POLICY "notif insert own" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif update own" ON public.notifications;
CREATE POLICY "notif update own" ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif admin all" ON public.notifications;
CREATE POLICY "notif admin all" ON public.notifications FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx ON public.notifications (user_id, created_at DESC);

-- 4. Bank details on profile (used by payout flow)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bank jsonb;

-- 5. Seed the offer catalog (idempotent upsert)
INSERT INTO public.offers
  (id, name, tag, category, advertiser, geo, payout, epc, cr, is_new, hold, goal, description, requirements, allowed, denied, landing, active)
VALUES
  ('gpb','Газпромбанк Gold','BANK','Банки','Газпромбанк','RU','4 500 ₽',120,4.1,false,'45 дней','Активация карты + первая покупка от 1 000 ₽','Премиальная дебетовая карта Gold с кэшбэком до 10% в выбранных категориях, бесплатным обслуживанием при обороте от 30 000 ₽ и приветственным бонусом 2 000 ₽ новым клиентам.','Возраст клиента 21–65 лет, гражданство РФ' || E'\n' || 'Первое оформление карты в банке за последние 180 дней' || E'\n' || 'Активация в течение 14 дней с момента заявки', ARRAY['SEO','Контекст по бренд-запросам','Email-рассылки по своей базе','Telegram-каналы'], ARRAY['Cashback- и купон-сервисы','Мотивированный трафик','Спам в мессенджерах','Brand bidding в Яндексе'],'https://gpb.ru/lp/gold', true),
  ('skl','Skillbox: Дизайн интерьеров','EDU','Образование','Skillbox','RU, BY, KZ','15%',85,3.2,false,'30 дней','Оплата курса от 40 000 ₽','Онлайн-курс по дизайну интерьеров: 9 месяцев практики, портфолио из 4 проектов, диплом и помощь в трудоустройстве. Выплата — 15% от суммы первой оплаты клиента.','Оплата в течение 21 дня после первого клика' || E'\n' || 'Клиент не проходил обучение в Skillbox ранее' || E'\n' || 'Промокоды платформы аннулируют выплату', ARRAY['Тематический контент','YouTube-обзоры','Instagram/TikTok','Таргет с прогревом'], ARRAY['Brand bidding','Cashback-сервисы','Adult- и gambling-площадки'],'https://skillbox.ru/design-interior', true),
  ('tin','Т-Инвестиции: брокерский счёт','FIN','Инвестиции','Т-Банк','RU','2 800 ₽',142,5.8,true,'60 дней','Открытие счёта + первое пополнение от 10 000 ₽','Брокерский счёт с бесплатным обслуживанием, доступом к акциям РФ, фондам и обучающим материалам. Клиент получает 3 акции в подарок — оффер отлично конвертит на финансовом трафике.','Возраст клиента от 18 лет, гражданство РФ' || E'\n' || 'Пополнение в течение 30 дней с момента регистрации' || E'\n' || 'Верификация паспорта через Т-ID', ARRAY['SEO','Финансовые блоги','Telegram-каналы про инвестиции','Email-рассылки'], ARRAY['Cashback','Мотив-трафик','Спам-рассылки','Brand bidding'],'https://tinkoff.ru/invest/', true),
  ('lvl','Level.Travel: туры в Турцию','TRV','Путешествия','Level.Travel','RU','2,5%',58,2.1,false,'После окончания тура','Оплаченный тур в Турцию','Онлайн-агрегатор туров с более чем 200 туроператорами. Выплата — 2,5% от стоимости оплаченного тура в Турцию. Средний чек — 120 000 ₽.','Тур должен состояться (без отмены до даты вылета)' || E'\n' || 'Оплата в течение 7 дней после клика' || E'\n' || 'Клиент не отменяет и не переносит тур', ARRAY['Travel-блоги','SEO','YouTube-обзоры','Тематические Telegram-каналы'], ARRAY['Brand bidding','Cashback','Adult-площадки'],'https://level.travel/turkey', true),
  ('sgl','Согласие: ОСАГО онлайн','INS','Страхование','СК Согласие','RU','850 ₽',72,3.4,false,'14 дней','Оплаченный полис ОСАГО','Оформление полиса ОСАГО онлайн за 10 минут. Электронный полис приходит на email. Выплачивается за каждый оплаченный полис независимо от суммы.','Клиент — физическое лицо, водитель с правами РФ' || E'\n' || 'Оплата полиса в течение 3 дней после расчёта' || E'\n' || 'Один клиент — одна выплата в год', ARRAY['Автоблоги','SEO','Контекст по не-брендовым запросам','Telegram-каналы'], ARRAY['Brand bidding','Cashback','Мотив-трафик'],'https://soglasie.ru/osago', true),
  ('alf','Альфа-Инвестиции','BANK','Инвестиции','Альфа-Банк','RU','1 200 ₽',96,4.4,true,'45 дней','Открытие счёта + пополнение от 5 000 ₽','Брокерский счёт от Альфа-Банка с доступом к акциям, облигациям и валюте. Приветственный бонус — 5 акций российских компаний.','Возраст от 18 лет, гражданство РФ' || E'\n' || 'Пополнение в течение 21 дня' || E'\n' || 'Клиент — новый в Альфа-Инвестициях', ARRAY['Финансовые блоги','SEO','Telegram-каналы','YouTube'], ARRAY['Cashback','Мотив-трафик','Brand bidding'],'https://alfabank.ru/invest', true),
  ('spr','Skypro Web-разработка','EDU','Образование','Skypro','RU, BY, KZ','3 800 ₽',110,2.9,false,'30 дней','Оплата курса','Профессия «Веб-разработчик» — 10 месяцев обучения с помощью в трудоустройстве. Первая оплата от 5 000 ₽ засчитывается как конверсия.','Оплата в течение 21 дня' || E'\n' || 'Клиент — новый ученик Skypro' || E'\n' || 'Возврат в первые 14 дней отменяет выплату', ARRAY['Тематический контент','YouTube','Instagram/TikTok','Таргет'], ARRAY['Brand bidding','Cashback','Adult'],'https://sky.pro/webdev', true),
  ('avs','Aviasales Search','TRV','Путешествия','Aviasales','RU, BY, KZ, UA','1,8%',24,1.6,false,'После вылета','Купленный авиабилет','Крупнейший поисковик авиабилетов в СНГ. Выплата — 1,8% от стоимости билета. Работает на любом трафике, где есть спрос на путешествия.','Билет должен быть оплачен и не возвращён' || E'\n' || 'Полёт состоялся' || E'\n' || 'Оплата в течение 24 часов после клика', ARRAY['Travel-контент','SEO','Telegram','YouTube'], ARRAY['Brand bidding по Aviasales','Cashback','Adult'],'https://aviasales.ru', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tag = EXCLUDED.tag,
  category = EXCLUDED.category,
  advertiser = EXCLUDED.advertiser,
  geo = EXCLUDED.geo,
  payout = EXCLUDED.payout,
  epc = EXCLUDED.epc,
  cr = EXCLUDED.cr,
  is_new = EXCLUDED.is_new,
  hold = EXCLUDED.hold,
  goal = EXCLUDED.goal,
  description = EXCLUDED.description,
  requirements = EXCLUDED.requirements,
  allowed = EXCLUDED.allowed,
  denied = EXCLUDED.denied,
  landing = EXCLUDED.landing,
  active = EXCLUDED.active,
  updated_at = now();


-- ============================================================
-- Migration: 20260716041430_70e9a957-cec9-491a-99b8-6ab0c9e7c373.sql
-- ============================================================

-- Закрываем возможность обычному пользователю создавать себе конверсии
DROP POLICY IF EXISTS "conversions insert own" ON public.conversions;

-- Явные админ-политики на INSERT/UPDATE/DELETE (были только через ALL — оставляем для совместимости,
-- но добавляем именованные DELETE-политики там, где их не было)
DROP POLICY IF EXISTS "links admin delete" ON public.link_requests;
CREATE POLICY "links admin delete" ON public.link_requests
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "payouts admin delete" ON public.payout_requests;
CREATE POLICY "payouts admin delete" ON public.payout_requests
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Пользователь не может менять чужие / свои завершённые заявки на выплату
-- (осталось админу через "payouts admin update")

-- Дополнительная защита: пользователь не может назначать себе роль
-- (уже покрыто "roles admin insert" — INSERT требует has_role admin).

-- Явно ограничиваем роли на всех политиках, где было {public}, чтобы они не срабатывали для anon
ALTER POLICY "conversions read admin" ON public.conversions TO authenticated;
ALTER POLICY "conversions read own"   ON public.conversions TO authenticated;
ALTER POLICY "conversions write admin" ON public.conversions TO authenticated;

ALTER POLICY "notif admin all"    ON public.notifications TO authenticated;
ALTER POLICY "notif insert own"   ON public.notifications TO authenticated;
ALTER POLICY "notif read own"     ON public.notifications TO authenticated;
ALTER POLICY "notif update own"   ON public.notifications TO authenticated;

-- Пользователь не должен уметь удалять свои уведомления (иначе может стереть админскую рассылку)
DROP POLICY IF EXISTS "notif delete own" ON public.notifications;
-- Удалять уведомления может только админ (покрыто "notif admin all" через FOR ALL)

-- Убедимся, что RLS включён везде
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications   ENABLE ROW LEVEL SECURITY;

-- Форсим RLS даже для владельца таблиц (защита от случайных SECURITY DEFINER функций без search_path)
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;

-- Серверная проверка роли — RPC, доступный только авторизованным
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;


-- ============================================================
-- Migration: 20260716041448_cba48694-859b-4e49-92bb-33f39023a14e.sql
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.is_admin()                         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)    FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.is_admin()                         TO service_role;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)    TO service_role;


-- ============================================================
-- Migration: 20260716041950_d450a70a-e1b0-4bab-84d9-28d43efed9fe.sql
-- ============================================================
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================
-- Migration: 20260716043805_afbd7c9e-73eb-4d86-b533-866aed0a14e7.sql
-- ============================================================
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS image_url text;

-- ============================================================
-- Migration: 20260716044834_b87656c0-ccec-427a-904c-ffd84900ea01.sql
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ============================================================
-- Migration: 20260716050616_67587075-cdcc-4b9e-bb16-07bd7a8dda1b.sql
-- ============================================================
ALTER TYPE public.link_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE public.link_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE public.link_status ADD VALUE IF NOT EXISTS 'finished';
ALTER TYPE public.link_status ADD VALUE IF NOT EXISTS 'paid';
ALTER TABLE public.link_requests ADD COLUMN IF NOT EXISTS orders_count integer NOT NULL DEFAULT 0;

-- ============================================================
-- Migration: 20260716074754_6e9e1c87-c179-41a9-a33c-b0388b3b5436.sql
-- ============================================================
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

-- ============================================================
-- Migration: 20260720111534_1cb0b887-6cfa-42cf-a5e6-3c189c0ea12d.sql
-- ============================================================
ALTER TABLE public.link_requests ADD COLUMN IF NOT EXISTS payout_override numeric;

-- ============================================================
-- Migration: 20260720114124_bacd7b65-8c6b-4ff8-8752-4f83265803b6.sql
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS warnings_count integer NOT NULL DEFAULT 0;

-- allow admins to update any profile (block/warn)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- allow admins to view all profiles (needed for moderation panel)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- allow admins to view all notifications (for moderation review)
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
CREATE POLICY "Admins can view all notifications"
ON public.notifications FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- allow admins to update notifications (mark read/handled)
DROP POLICY IF EXISTS "Admins can update all notifications" ON public.notifications;
CREATE POLICY "Admins can update all notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- ============================================================
-- Migration: 20260720124404_5c754999-5a15-49b7-9250-66158f879eca.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unread_user INT NOT NULL DEFAULT 0,
  unread_admin INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets FORCE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_admin BOOLEAN NOT NULL DEFAULT false,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.support_messages FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Tickets
CREATE POLICY "tickets_select_own_or_admin" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "tickets_insert_own" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tickets_update_own_or_admin" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Messages
CREATE POLICY "messages_select_ticket_participant" ON public.support_messages
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
  );

CREATE POLICY "messages_insert_participant" ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
    )
  );

-- Trigger: on new message update ticket meta + unread counters
CREATE OR REPLACE FUNCTION public.support_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE TRIGGER support_messages_after_insert
AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.support_on_message();

CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON public.support_tickets(user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS support_messages_ticket_idx ON public.support_messages(ticket_id, created_at);


-- ============================================================
-- Migration: 20260720124414_1d730dbe-efe6-4d05-b103-4a95d6eee8d2.sql
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.support_on_message() FROM PUBLIC, anon, authenticated;


-- ============================================================
-- Migration: 20260720125335_65e8fabc-3eb0-48b1-abcb-ce5643fa7f39.sql
-- ============================================================
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

-- ============================================================
-- Migration: 20260720125728_f5758429-7cba-431c-8378-27489999e057.sql
-- ============================================================

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['notifications','link_requests','payout_requests','conversions','offers','profiles','support_tickets','support_messages','user_roles']
  LOOP
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;


-- ============================================================
-- Migration: 20260720130313_7b8d223e-1a0a-426e-ad2d-7bb98cb1a47f.sql
-- ============================================================

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


-- ============================================================
-- Migration: 20260720130827_75eb7eb3-8142-4396-8248-96cf332782a1.sql
-- ============================================================

-- 1. Idempotency for link_requests crediting
ALTER TABLE public.link_requests
  ADD COLUMN IF NOT EXISTS credited_at timestamptz,
  ADD COLUMN IF NOT EXISTS credit_conversion_id uuid;

-- 2. Add explicit actor_id on notifications (replaces overloading `amount` with a UUID)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS actor_id uuid;

-- Backfill actor_id from legacy moderation rows that packed UUID into `amount`
UPDATE public.notifications
SET actor_id = amount::uuid
WHERE actor_id IS NULL
  AND kind = 'moderation'
  AND amount ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 3. Atomic admin operation: set link_request status + credit balance idempotently
CREATE OR REPLACE FUNCTION public.admin_set_link_request_status(
  _request_id uuid,
  _new_status link_status,
  _payout_override numeric DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _req public.link_requests%ROWTYPE;
  _offer public.offers%ROWTYPE;
  _amount numeric := 0;
  _conv_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
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

  -- Only credit on first transition to paid
  IF _new_status = 'paid' AND _req.credited_at IS NULL THEN
    IF _req.offer_id IS NOT NULL THEN
      SELECT * INTO _offer FROM public.offers WHERE id = _req.offer_id;
    END IF;

    IF _req.payout_override IS NOT NULL AND _req.payout_override > 0 THEN
      _amount := _req.payout_override;
    ELSIF _offer.id IS NOT NULL THEN
      -- Honor payout_kind: only auto-credit exact offers; others require an override
      IF _offer.payout_kind = 'exact' AND _offer.payout_min IS NOT NULL THEN
        _amount := _offer.payout_min;
      ELSE
        _amount := COALESCE(NULLIF(regexp_replace(COALESCE(_offer.payout,''), '[^0-9.]', '', 'g'), '')::numeric, 0);
        IF _amount = 0 THEN _amount := COALESCE(_offer.payout_max, _offer.payout_min, 0); END IF;
      END IF;
    END IF;

    IF _amount > 0 THEN
      INSERT INTO public.conversions (user_id, offer_id, offer_name, amount, status)
      VALUES (_req.user_id, _req.offer_id, _req.offer_name, _amount, 'ok')
      RETURNING id INTO _conv_id;

      INSERT INTO public.notifications (user_id, kind, title, body, amount, status)
      VALUES (
        _req.user_id, 'payout', 'Начисление за оффер',
        _req.offer_name || ': начислено ' || _amount::text || ' ₽',
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

  RETURN jsonb_build_object('ok', true, 'credited_amount', _amount, 'conversion_id', _conv_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_link_request_status(uuid, link_status, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_link_request_status(uuid, link_status, numeric) TO authenticated;

-- 4. Prevent non-admin ticket owners from tampering with admin-only fields
CREATE OR REPLACE FUNCTION public.support_tickets_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  -- Regular user updating own ticket: preserve admin-only fields
  NEW.status       := OLD.status;
  NEW.priority     := OLD.priority;
  NEW.unread_admin := OLD.unread_admin;
  NEW.last_message_at := OLD.last_message_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_tickets_guard ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_guard
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.support_tickets_guard();


-- ============================================================
-- Migration: 20260720143135_4caee69d-43f0-419a-88b3-eec67a6eeb81.sql
-- ============================================================

-- Streak fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS streak_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_best integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_date date;

-- Achievements catalog
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'trophy',
  tier text NOT NULL DEFAULT 'bronze', -- bronze | silver | gold | platinum
  metric text NOT NULL,                -- earned | conversions | requests | streak | leaderboard
  threshold numeric NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.achievements TO authenticated;
GRANT ALL    ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements are public to signed-in users"
  ON public.achievements FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage achievements"
  ON public.achievements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- User → achievement unlocks
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);
GRANT SELECT, INSERT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read their achievements"
  ON public.user_achievements FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- Seed achievements
INSERT INTO public.achievements (code, name, description, icon, tier, metric, threshold, sort_order) VALUES
  ('first_step',      'Первый шаг',         'Создайте свою первую заявку',       'rocket',    'bronze',   'requests',    1,       10),
  ('starter',         'Разгон',             'Получите 1-ю оплаченную конверсию', 'sparkles',  'bronze',   'conversions', 1,       20),
  ('ten_conversions', 'Десятка',            '10 оплаченных конверсий',           'target',    'silver',   'conversions', 10,      30),
  ('fifty_conversions','Полусотня',         '50 оплаченных конверсий',           'target',    'gold',     'conversions', 50,      40),
  ('income_10k',      'Первые 10 000 ₽',    'Заработайте 10 000 ₽',              'coins',     'bronze',   'earned',      10000,   50),
  ('income_100k',     'Сотка',              'Заработайте 100 000 ₽',             'gem',       'silver',   'earned',      100000,  60),
  ('income_500k',     'Полмиллиона',        'Заработайте 500 000 ₽',             'crown',     'gold',     'earned',      500000,  70),
  ('income_1m',       'Легенда партнёрки',  'Заработайте 1 000 000 ₽',           'trophy',    'platinum', 'earned',      1000000, 80),
  ('streak_7',        'Неделя в строю',     '7 дней подряд заходите в кабинет',  'zap',       'silver',   'streak',      7,       90),
  ('streak_30',       'Месяц дисциплины',   '30 дней подряд заходите в кабинет', 'zap',       'gold',     'streak',      30,      100)
ON CONFLICT (code) DO NOTHING;

-- Update streak on activity
CREATE OR REPLACE FUNCTION public.touch_streak()
RETURNS TABLE(streak_days integer, streak_best integer, last_activity_date date)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END; $$;
GRANT EXECUTE ON FUNCTION public.touch_streak() TO authenticated;

-- Award achievements for the caller
CREATE OR REPLACE FUNCTION public.award_achievements()
RETURNS TABLE(unlocked_code text, unlocked_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END; $$;
GRANT EXECUTE ON FUNCTION public.award_achievements() TO authenticated;

-- Leaderboard by paid income
CREATE OR REPLACE FUNCTION public.get_leaderboard(_period text DEFAULT 'week', _limit int DEFAULT 20)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  total numeric,
  conversions bigint,
  is_me boolean
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
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
END; $$;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text,int) TO authenticated;


-- ============================================================
-- Migration: 20260720143635_6fc589ee-95ab-4159-b162-18ed99a9cffd.sql
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
$$;

-- ============================================================
-- Migration: 20260720143830_da32eef3-7ca7-43d1-9c7a-23c9a6a8933e.sql
-- ============================================================

-- BANNERS
CREATE TABLE IF NOT EXISTS public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  text text NOT NULL DEFAULT '',
  button_label text NOT NULL DEFAULT 'Подробнее',
  button_url text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "banners public read active" ON public.banners;
CREATE POLICY "banners public read active" ON public.banners FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "banners admin insert" ON public.banners;
CREATE POLICY "banners admin insert" ON public.banners FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "banners admin update" ON public.banners;
CREATE POLICY "banners admin update" ON public.banners FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "banners admin delete" ON public.banners;
CREATE POLICY "banners admin delete" ON public.banners FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS banners_set_updated_at ON public.banners;
CREATE TRIGGER banners_set_updated_at BEFORE UPDATE ON public.banners FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- NEWS
CREATE TABLE IF NOT EXISTS public.news_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.news_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_posts TO authenticated;
GRANT ALL ON public.news_posts TO service_role;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "news public read published" ON public.news_posts;
CREATE POLICY "news public read published" ON public.news_posts FOR SELECT TO anon, authenticated USING (published = true OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "news admin insert" ON public.news_posts;
CREATE POLICY "news admin insert" ON public.news_posts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "news admin update" ON public.news_posts;
CREATE POLICY "news admin update" ON public.news_posts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "news admin delete" ON public.news_posts;
CREATE POLICY "news admin delete" ON public.news_posts FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS news_set_updated_at ON public.news_posts;
CREATE TRIGGER news_set_updated_at BEFORE UPDATE ON public.news_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- Migration: 20260720152723_1c06007f-b530-4d54-837b-50068254d9a2.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.level_bonus_pct(_earned numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _earned >= 1500000 THEN 12
    WHEN _earned >= 500000  THEN 8
    WHEN _earned >= 150000  THEN 5
    WHEN _earned >= 50000   THEN 2
    ELSE 0
  END::numeric;
$$;

GRANT EXECUTE ON FUNCTION public.level_bonus_pct(numeric) TO authenticated, anon, service_role;

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
  IF NOT public.has_role(auth.uid(), 'admin') THEN
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

      INSERT INTO public.conversions (user_id, offer_id, offer_name, amount, status)
      VALUES (_req.user_id, _req.offer_id, _req.offer_name, _amount, 'ok')
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
$function$;


-- ============================================================
-- Migration: 20260720152900_308b971c-f555-4a98-988b-d0e55fac4fc6.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_landing_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
    partners AS (SELECT count(*)::int AS c FROM public.profiles),
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
      SELECT id, display_name, email, created_at FROM public.profiles
      ORDER BY created_at DESC LIMIT 8
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
$$;

REVOKE ALL ON FUNCTION public.get_landing_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_landing_stats() TO anon, authenticated, service_role;


-- ============================================================
-- Migration: 20260721032301_3970d3f5-a944-4c4d-8c31-8ea9826267bd.sql
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill missing profiles and roles for existing auth users
INSERT INTO public.profiles (id, email, display_name, avatar_url, created_at)
SELECT u.id, u.email,
  COALESCE(NULLIF(u.raw_user_meta_data->>'display_name',''), split_part(u.email,'@',1)),
  NULLIF(u.raw_user_meta_data->>'avatar_url',''),
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::app_role FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id AND r.role = 'user'
WHERE r.user_id IS NULL;


-- ============================================================
-- Migration: 20260721032526_2d2126f5-6b5d-4914-9ef9-7b39f6804814.sql
-- ============================================================

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


-- ============================================================
-- Migration: 20260721032537_944efcf5-8717-4a98-b64a-00b9c66c1868.sql
-- ============================================================

ALTER TABLE public.link_requests
  ALTER COLUMN code SET DEFAULT ('KV-' || lpad(nextval('public.link_requests_code_seq')::text, 6, '0'));


-- ============================================================
-- Migration: 20260721032911_05c8a5df-dfe4-4151-a0af-2ef2c55bd072.sql
-- ============================================================

ALTER TABLE public.conversions
  ADD COLUMN IF NOT EXISTS base_amount numeric,
  ADD COLUMN IF NOT EXISTS bonus_pct numeric,
  ADD COLUMN IF NOT EXISTS bonus_amount numeric;

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
  IF NOT public.has_role(auth.uid(), 'admin') THEN
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
$function$;

GRANT EXECUTE ON FUNCTION public.level_bonus_pct(numeric) TO authenticated;


-- ============================================================
-- Migration: 20260721033238_fa8c4d20-ceab-4c64-928b-80294fd8569e.sql
-- ============================================================

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


-- ============================================================
-- Migration: 20260721033625_70348c67-1901-46b5-9b44-d709587127de.sql
-- ============================================================

-- ============ EXCLUSIVE OFFERS ============
DO $$ BEGIN
  DO $lvl$ BEGIN CREATE TYPE public.level_tier AS ENUM ('start','silver','gold','platinum','diamond'); EXCEPTION WHEN duplicate_object THEN NULL; END $lvl$;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS min_level public.level_tier NOT NULL DEFAULT 'start';

CREATE INDEX IF NOT EXISTS offers_min_level_idx ON public.offers(min_level);

-- Helper: total earned by user (from ok conversions)
CREATE OR REPLACE FUNCTION public.user_total_earned(_uid uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::numeric
  FROM public.conversions
  WHERE user_id = _uid AND status = 'ok';
$$;

GRANT EXECUTE ON FUNCTION public.user_total_earned(uuid) TO authenticated;

-- Helper: tier threshold
CREATE OR REPLACE FUNCTION public.level_min_earned(_tier public.level_tier)
RETURNS numeric
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _tier
    WHEN 'start'    THEN 0
    WHEN 'silver'   THEN 50000
    WHEN 'gold'     THEN 150000
    WHEN 'platinum' THEN 500000
    WHEN 'diamond'  THEN 1500000
  END::numeric;
$$;

GRANT EXECUTE ON FUNCTION public.level_min_earned(public.level_tier) TO authenticated;

-- ============ COMPETITIONS ============
CREATE TABLE IF NOT EXISTS public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  prize_pool numeric NOT NULL DEFAULT 0,
  prizes jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{place:1,amount:50000,label:"1 место"}, ...]
  metric text NOT NULL DEFAULT 'earned' CHECK (metric IN ('earned','conversions','requests')),
  min_level public.level_tier NOT NULL DEFAULT 'diamond',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  banner_url text,
  rules text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.competitions TO authenticated;
GRANT ALL ON public.competitions TO service_role;

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions FORCE ROW LEVEL SECURITY;

CREATE POLICY "competitions_read_all_auth"
  ON public.competitions FOR SELECT TO authenticated USING (true);

CREATE POLICY "competitions_admin_insert"
  ON public.competitions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "competitions_admin_update"
  ON public.competitions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "competitions_admin_delete"
  ON public.competitions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER competitions_touch_updated_at
  BEFORE UPDATE ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS competitions_active_idx ON public.competitions(active, ends_at DESC);

-- Leaderboard for a specific competition
CREATE OR REPLACE FUNCTION public.get_competition_leaderboard(_competition_id uuid, _limit int DEFAULT 50)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  score numeric,
  is_me boolean,
  rank bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _c public.competitions%ROWTYPE;
  _me uuid := auth.uid();
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO _c FROM public.competitions WHERE id = _competition_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'competition not found'; END IF;

  -- Access gate: user must have reached competition's min_level
  IF public.user_total_earned(_me) < public.level_min_earned(_c.min_level)
     AND NOT public.has_role(_me, 'admin') THEN
    RAISE EXCEPTION 'level_locked' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH src AS (
    SELECT
      CASE
        WHEN _c.metric = 'requests' THEN lr.user_id
        ELSE c.user_id
      END AS uid,
      CASE
        WHEN _c.metric = 'earned'      THEN COALESCE(c.amount, 0)
        WHEN _c.metric = 'conversions' THEN 1
        WHEN _c.metric = 'requests'    THEN 1
      END::numeric AS val
    FROM public.conversions c
      FULL OUTER JOIN public.link_requests lr
        ON false -- separate branches; we UNION-emulate via CASE with two selects below
    WHERE false
  ),
  earned_src AS (
    SELECT user_id AS uid, amount AS val
    FROM public.conversions
    WHERE status = 'ok'
      AND created_at >= _c.starts_at AND created_at < _c.ends_at
      AND _c.metric = 'earned'
  ),
  conv_src AS (
    SELECT user_id AS uid, 1::numeric AS val
    FROM public.conversions
    WHERE status = 'ok'
      AND created_at >= _c.starts_at AND created_at < _c.ends_at
      AND _c.metric = 'conversions'
  ),
  req_src AS (
    SELECT user_id AS uid, 1::numeric AS val
    FROM public.link_requests
    WHERE created_at >= _c.starts_at AND created_at < _c.ends_at
      AND _c.metric = 'requests'
  ),
  all_src AS (
    SELECT * FROM earned_src
    UNION ALL SELECT * FROM conv_src
    UNION ALL SELECT * FROM req_src
  ),
  agg AS (
    SELECT uid, SUM(val)::numeric AS score
    FROM all_src
    WHERE uid IS NOT NULL
    GROUP BY uid
  )
  SELECT
    a.uid AS user_id,
    COALESCE(NULLIF(p.display_name, ''), 'Партнёр') AS display_name,
    p.avatar_url,
    a.score,
    (a.uid = _me) AS is_me,
    ROW_NUMBER() OVER (ORDER BY a.score DESC) AS rank
  FROM agg a
  LEFT JOIN public.profiles p ON p.id = a.uid
  ORDER BY a.score DESC
  LIMIT _limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_competition_leaderboard(uuid, int) TO authenticated;

-- Realtime for competitions
ALTER TABLE public.competitions REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='competitions';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.competitions';
  END IF;
END $$;


-- ============================================================
-- Migration: 20260721033638_2fa5a163-009e-4628-9c9d-9d63e3bac73f.sql
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.user_total_earned(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_competition_leaderboard(uuid, int) FROM PUBLIC, anon;


-- ============================================================
-- Migration: 20260721034355_d474aade-6095-4db0-ba9e-0348ea598991.sql
-- ============================================================

DROP FUNCTION IF EXISTS public.get_competition_leaderboard(uuid, int);

DO $$ BEGIN
  DO $lvl$ BEGIN CREATE TYPE public.level_tier AS ENUM ('start','silver','gold','platinum','diamond'); EXCEPTION WHEN duplicate_object THEN NULL; END $lvl$;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS min_level public.level_tier NOT NULL DEFAULT 'start';

CREATE TABLE IF NOT EXISTS public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  prize_pool numeric NOT NULL DEFAULT 0,
  prizes jsonb NOT NULL DEFAULT '[]'::jsonb,
  metric text NOT NULL DEFAULT 'earned' CHECK (metric IN ('earned','conversions','requests')),
  min_level public.level_tier NOT NULL DEFAULT 'diamond',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  banner_url text,
  rules text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitions TO authenticated;
GRANT ALL ON public.competitions TO service_role;

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "competitions_select_active" ON public.competitions;
CREATE POLICY "competitions_select_active" ON public.competitions FOR SELECT TO authenticated
  USING (active = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "competitions_admin_insert" ON public.competitions;
CREATE POLICY "competitions_admin_insert" ON public.competitions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "competitions_admin_update" ON public.competitions;
CREATE POLICY "competitions_admin_update" ON public.competitions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "competitions_admin_delete" ON public.competitions;
CREATE POLICY "competitions_admin_delete" ON public.competitions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS competitions_set_updated_at ON public.competitions;
DROP TRIGGER IF EXISTS competitions_set_updated_at ON public.competitions;
CREATE TRIGGER competitions_set_updated_at BEFORE UPDATE ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.competitions REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.competitions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE FUNCTION public.get_competition_leaderboard(_competition_id uuid, _limit int DEFAULT 50)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  score numeric,
  is_me boolean,
  rank int
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
END; $$;

REVOKE ALL ON FUNCTION public.get_competition_leaderboard(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_competition_leaderboard(uuid, int) TO authenticated;


-- ============================================================
-- Migration: 20260721034522_0f0d33d8-e51e-4936-b1b5-fc88edc96aa6.sql
-- ============================================================

-- Participants table
CREATE TABLE IF NOT EXISTS public.competition_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.competition_participants TO authenticated;
GRANT ALL ON public.competition_participants TO service_role;

ALTER TABLE public.competition_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read participants"
  ON public.competition_participants FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "join self"
  ON public.competition_participants FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "leave self"
  ON public.competition_participants FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "admin manages participants"
  ON public.competition_participants FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.competition_participants;

-- RPC: join with level check
CREATE OR REPLACE FUNCTION public.join_competition(_competition_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
END; $$;

REVOKE ALL ON FUNCTION public.join_competition(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_competition(uuid) TO authenticated;


-- ============================================================
-- Migration: 20260721034826_453bcc85-f695-497b-9496-f5593037536a.sql
-- ============================================================

-- 1) State columns
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS settled_at timestamptz,
  ADD COLUMN IF NOT EXISTS settled_by uuid,
  ADD COLUMN IF NOT EXISTS winners jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2) Mark conversions coming from competitions
ALTER TABLE public.conversions
  ADD COLUMN IF NOT EXISTS competition_id uuid REFERENCES public.competitions(id) ON DELETE SET NULL;

-- 3) Core settle function (safe to call by admin or by scheduler)
CREATE OR REPLACE FUNCTION public.settle_competition(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  -- Authorization: admin OR service role (cron)
  IF _actor IS NOT NULL THEN
    _is_admin := public.has_role(_actor, 'admin');
    IF NOT _is_admin THEN
      RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT * INTO _c FROM public.competitions WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF _c.settled_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_settled', 'settled_at', _c.settled_at);
  END IF;

  -- Compute ranking exactly like get_competition_leaderboard, but without auth.uid()
  FOR _p IN SELECT jsonb_array_elements(COALESCE(_c.prizes, '[]'::jsonb))
  LOOP
    _place  := COALESCE((_p->>'place')::int, 0);
    _amount := COALESCE((_p->>'amount')::numeric, 0);
    _label  := COALESCE(_p->>'label', _place::text || ' место');
    IF _place <= 0 OR _amount <= 0 THEN CONTINUE; END IF;

    -- Pick the winner for this place from the ranking
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
      SELECT raw.uid, raw.s AS score
      FROM raw
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
      FROM filtered
      WHERE score > 0
    )
    SELECT uid, score INTO _row FROM ranked WHERE rnk = _place;

    IF _row.uid IS NULL THEN CONTINUE; END IF;

    INSERT INTO public.conversions (user_id, offer_name, amount, status, base_amount, bonus_pct, bonus_amount, competition_id)
    VALUES (
      _row.uid,
      'Приз: ' || _c.title || ' · ' || _label,
      _amount, 'ok', _amount, 0, 0, _c.id
    );

    INSERT INTO public.notifications (user_id, kind, title, body, amount, status)
    VALUES (
      _row.uid, 'payout',
      'Победа в соревновании: ' || _c.title,
      _label || ': начислено ' || _amount::text || ' ₽',
      _amount::text, 'paid'
    );

    _winners := _winners || jsonb_build_object(
      'place', _place, 'user_id', _row.uid, 'amount', _amount, 'score', _row.score
    );
    _count := _count + 1;
    _total := _total + _amount;
  END LOOP;

  UPDATE public.competitions
    SET settled_at = now(),
        settled_by = _actor,
        winners = _winners,
        active = false,
        updated_at = now()
    WHERE id = _id;

  RETURN jsonb_build_object('ok', true, 'winners', _winners, 'count', _count, 'total', _total);
END;
$$;

REVOKE ALL ON FUNCTION public.settle_competition(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_competition(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_competition(uuid) TO service_role;

-- 4) Auto-settle scanner (used by pg_cron)
CREATE OR REPLACE FUNCTION public.auto_settle_competitions()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.auto_settle_competitions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_settle_competitions() TO service_role;


-- ============================================================
-- Migration: 20260721035031_8a4d702b-eaf4-487f-a358-feea46f9bb1b.sql
-- ============================================================

-- 1) Notify eligible users when a competition starts (INSERT active OR UPDATE inactive->active)
CREATE OR REPLACE FUNCTION public.competitions_notify_start()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

DROP TRIGGER IF EXISTS trg_competitions_notify_start ON public.competitions;
CREATE TRIGGER trg_competitions_notify_start
  AFTER INSERT OR UPDATE ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION public.competitions_notify_start();

-- 2) Notify participants on status/date changes
CREATE OR REPLACE FUNCTION public.competitions_notify_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

DROP TRIGGER IF EXISTS trg_competitions_notify_status ON public.competitions;
CREATE TRIGGER trg_competitions_notify_status
  AFTER UPDATE ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION public.competitions_notify_status();

-- 3) Extend settle_competition: notify ALL participants that turnir ended (winners get their place too)
CREATE OR REPLACE FUNCTION public.settle_competition(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.settle_competition(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_competition(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_competition(uuid) TO service_role;

-- 4) Daily leaderboard-rank notifications for active competitions
CREATE OR REPLACE FUNCTION public.notify_competition_ranks()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.notify_competition_ranks() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_competition_ranks() TO service_role;


-- ============================================================
-- Migration: 20260721035947_acb799e0-92b2-4ee5-be59-15d119e6e627.sql
-- ============================================================
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
$function$;

-- ============================================================
-- Migration: 20260721053511_8795ff4e-7a42-4029-b0bf-874956fcdf64.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_settings (
  id smallint PRIMARY KEY DEFAULT 1,
  enabled boolean NOT NULL DEFAULT false,
  smtp_host text NOT NULL DEFAULT '',
  smtp_port integer NOT NULL DEFAULT 587,
  smtp_secure boolean NOT NULL DEFAULT false,
  smtp_user text NOT NULL DEFAULT '',
  smtp_pass text NOT NULL DEFAULT '',
  from_email text NOT NULL DEFAULT '',
  from_name text NOT NULL DEFAULT 'КВАНТ',
  reply_to text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT email_settings_singleton CHECK (id = 1)
);

GRANT SELECT, INSERT, UPDATE ON public.email_settings TO authenticated;
GRANT ALL ON public.email_settings TO service_role;

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings FORCE ROW LEVEL SECURITY;

CREATE POLICY "email_settings_admin_select" ON public.email_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "email_settings_admin_insert" ON public.email_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND id = 1);
CREATE POLICY "email_settings_admin_update" ON public.email_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.email_settings (id) VALUES (1) ON CONFLICT DO NOTHING;


-- ============================================================
-- Migration: 20260721060554_10fc7a33-43af-41af-ab26-c9523e179325.sql
-- ============================================================
-- Revoke anon EXECUTE from privileged SECURITY DEFINER functions.
-- Keep get_landing_stats callable by anon (public landing).
DO $$
DECLARE
  _fn text;
  _fns text[] := ARRAY[
    'has_role(uuid, app_role)',
    'is_admin()',
    'touch_streak()',
    'award_achievements()',
    'join_competition(uuid)',
    'settle_competition(uuid)',
    'get_leaderboard(text, integer)',
    'get_competition_leaderboard(uuid, integer)',
    'admin_set_link_request_status(uuid, link_status, numeric)',
    'admin_delete_payout(uuid)',
    'notify_competition_ranks()',
    'auto_settle_competitions()',
    'user_total_earned(uuid)',
    'handle_new_user()',
    'support_on_message()',
    'support_tickets_guard()',
    'competitions_notify_start()',
    'competitions_notify_status()'
  ];
BEGIN
  FOREACH _fn IN ARRAY _fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', _fn);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'skip %: %', _fn, SQLERRM;
    END;
  END LOOP;
END $$;

-- Ensure authenticated users can still call the RPCs they need.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_streak() TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_achievements() TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_competition(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_competition_leaderboard(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_link_request_status(uuid, link_status, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_payout(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_competition(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_total_earned(uuid) TO authenticated;


-- ============================================================
-- Migration: 20260721115255_2c103b73-fa5f-4630-ae83-78453d3b5d03.sql
-- ============================================================

-- =========================
-- Team positions & members
-- =========================

CREATE TABLE IF NOT EXISTS public.team_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  permissions text[] NOT NULL DEFAULT '{}',
  is_leadership boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_positions TO authenticated;
GRANT ALL ON public.team_positions TO service_role;

ALTER TABLE public.team_positions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.team_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  position_id uuid NOT NULL REFERENCES public.team_positions(id) ON DELETE RESTRICT,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- ============
-- Helpers
-- ============

CREATE OR REPLACE FUNCTION public.is_leadership(_uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.team_positions tp ON tp.id = tm.position_id
    WHERE tm.user_id = _uid AND tp.is_leadership = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_leadership(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.current_team_permissions()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    CASE WHEN public.has_role(auth.uid(), 'admin') THEN
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
$$;

GRANT EXECUTE ON FUNCTION public.current_team_permissions() TO authenticated;

-- ============
-- RLS Policies
-- ============

DROP POLICY IF EXISTS "team_positions read for team" ON public.team_positions;
CREATE POLICY "team_positions read for team" ON public.team_positions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR EXISTS(SELECT 1 FROM public.team_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "team_positions manage by leadership" ON public.team_positions;
CREATE POLICY "team_positions manage by leadership" ON public.team_positions
  FOR ALL TO authenticated
  USING (public.is_leadership(auth.uid()))
  WITH CHECK (public.is_leadership(auth.uid()));

DROP POLICY IF EXISTS "team_members read for team" ON public.team_members;
CREATE POLICY "team_members read for team" ON public.team_members
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR EXISTS(SELECT 1 FROM public.team_members tm WHERE tm.user_id = auth.uid()));

DROP POLICY IF EXISTS "team_members manage by leadership" ON public.team_members;
CREATE POLICY "team_members manage by leadership" ON public.team_members
  FOR ALL TO authenticated
  USING (public.is_leadership(auth.uid()))
  WITH CHECK (public.is_leadership(auth.uid()));

-- ============
-- Sync admin role with team membership
-- ============

CREATE OR REPLACE FUNCTION public.team_members_sync_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

DROP TRIGGER IF EXISTS team_members_sync_role_trg ON public.team_members;
CREATE TRIGGER team_members_sync_role_trg
AFTER INSERT OR UPDATE OR DELETE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.team_members_sync_role();

DROP TRIGGER IF EXISTS team_positions_updated_at ON public.team_positions;
CREATE TRIGGER team_positions_updated_at
BEFORE UPDATE ON public.team_positions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS team_members_updated_at ON public.team_members;
CREATE TRIGGER team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============
-- Seed default positions
-- ============

INSERT INTO public.team_positions (code, name, description, permissions, is_leadership, is_system, sort_order) VALUES
  ('leadership',  'Руководство',        'Полный доступ ко всем разделам панели и управлению командой.', ARRAY['*'], true, true, 10),
  ('finance',     'Бухгалтерия',        'Обзор статистики и управление заявками на выплаты.',           ARRAY['overview','payouts'], false, true, 20),
  ('moderator',   'Модератор',          'Пользователи, модерация ИИ-запросов и поддержка.',             ARRAY['overview','users','moderation','support'], false, true, 30),
  ('marketing',   'Рекламный отдел',    'Публикация новостей и просмотр статистики.',                   ARRAY['overview','news','banners'], false, true, 40),
  ('analyst',     'Аналитик',           'AI-аналитик и статистика.',                                    ARRAY['overview','ai'], false, true, 50),
  ('coordinator', 'Координатор',        'Информационная роль без доступа к разделам панели.',           ARRAY[]::text[], false, true, 60),
  ('support',     'Агент поддержки',    'Только раздел поддержки.',                                     ARRAY['support'], false, true, 70),
  ('lawyer',      'Юрист',              'Информационная роль, доступ к разделам не предусмотрен.',      ARRAY[]::text[], false, true, 80)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      permissions = EXCLUDED.permissions,
      is_leadership = EXCLUDED.is_leadership,
      is_system = EXCLUDED.is_system,
      sort_order = EXCLUDED.sort_order,
      updated_at = now();

-- Assign main admin to leadership
INSERT INTO public.team_members (user_id, position_id)
SELECT u.id, tp.id
FROM auth.users u
CROSS JOIN public.team_positions tp
WHERE u.email = 'luxmailu@mail.ru' AND tp.code = 'leadership'
ON CONFLICT (user_id) DO UPDATE SET position_id = EXCLUDED.position_id, updated_at = now();


-- ============================================================
-- Migration: 20260721120729_2575b9a2-7799-4e35-8b36-d06ddd4e2760.sql
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_positions TO authenticated;
GRANT ALL ON public.team_positions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
GRANT EXECUTE ON FUNCTION public.current_team_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_leadership(uuid) TO authenticated;

-- Remove duplicate leadership position that isn't system
DELETE FROM public.team_positions WHERE code = 'rukov';

-- ============================================================
-- Migration: 20260721121128_00fbf678-b035-4607-8571-24de4eae394e.sql
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_team_member(_uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.user_id = _uid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_leadership(_uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.team_positions tp ON tp.id = tm.position_id
    WHERE tm.user_id = _uid AND tp.is_leadership = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_leadership(uuid) TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_positions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_positions TO service_role;
GRANT ALL ON public.team_members TO service_role;

DROP POLICY IF EXISTS "team_members read for team" ON public.team_members;
DROP POLICY IF EXISTS "team_members manage by leadership" ON public.team_members;
DROP POLICY IF EXISTS "team_positions read for team" ON public.team_positions;
DROP POLICY IF EXISTS "team_positions manage by leadership" ON public.team_positions;

CREATE POLICY "team_members read for team"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_team_member(auth.uid())
);

CREATE POLICY "team_members manage by leadership"
ON public.team_members
FOR ALL
TO authenticated
USING (
  public.is_leadership(auth.uid())
)
WITH CHECK (
  public.is_leadership(auth.uid())
);

CREATE POLICY "team_positions read for team"
ON public.team_positions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_team_member(auth.uid())
);

CREATE POLICY "team_positions manage by leadership"
ON public.team_positions
FOR ALL
TO authenticated
USING (
  public.is_leadership(auth.uid())
)
WITH CHECK (
  public.is_leadership(auth.uid())
);

-- ============================================================
-- Migration: 20260721121201_a5db87f7-db13-4b40-b221-585068f0751e.sql
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_leadership(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_team_permissions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_leadership(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_team_permissions() TO authenticated, service_role;

-- ============================================================
-- Migration: 20260721121415_d8ac79c7-8eda-49d6-abb6-fd1bf58a3f20.sql
-- ============================================================
DELETE FROM public.team_positions tp
WHERE tp.is_system = false
  AND tp.is_leadership = true
  AND lower(tp.name) LIKE lower('Руковод%')
  AND NOT EXISTS (
    SELECT 1 FROM public.team_members tm WHERE tm.position_id = tp.id
  );

-- ============================================================
-- Migration: 20260721121441_efb67f33-75ab-402a-93ed-1ecd492985c0.sql
-- ============================================================
DELETE FROM public.team_positions tp
WHERE tp.is_system = false
  AND tp.is_leadership = true
  AND NOT EXISTS (
    SELECT 1 FROM public.team_members tm WHERE tm.position_id = tp.id
  );

-- ============================================================
-- Migration: 20260722160139_4403334b-0cb5-46e2-8979-533504d0130a.sql
-- ============================================================

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


-- ============================================================
-- Migration: 20260722174329_e5e3ce1d-6cfa-41b2-92b9-8abb2705657f.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  provider text NOT NULL DEFAULT 'gemini',
  gemini_api_key text,
  gemini_model text NOT NULL DEFAULT 'gemini-2.5-flash',
  lovable_api_key text,
  lovable_model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  moderation_enabled boolean NOT NULL DEFAULT true,
  user_prompt_limit integer NOT NULL DEFAULT 20,
  admin_prompt_limit integer NOT NULL DEFAULT 50,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE ON public.ai_settings TO authenticated;
GRANT ALL ON public.ai_settings TO service_role;

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage AI settings"
  ON public.ai_settings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage AI settings"
  ON public.ai_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO public.ai_settings (id, enabled)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Migration: 20260722175647_cce3cd9b-5a40-42f5-b151-9b4d0d360eec.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.grant_super_admin_luxmailu()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'luxmailu@mail.ru' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
      ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_super_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_super_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_super_admin_luxmailu();

DROP TRIGGER IF EXISTS on_auth_user_updated_super_admin ON auth.users;
CREATE TRIGGER on_auth_user_updated_super_admin
AFTER UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_super_admin_luxmailu();

-- Backfill for existing user if present
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role FROM auth.users u
WHERE lower(u.email) = 'luxmailu@mail.ru'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::app_role FROM auth.users u
WHERE lower(u.email) = 'luxmailu@mail.ru'
ON CONFLICT (user_id, role) DO NOTHING;


-- ============================================================
-- Migration: 20260722180016_ad452b55-9e12-4c78-8ee2-02332d01f4ad.sql
-- ============================================================
DROP POLICY IF EXISTS "team_positions manage by leadership" ON public.team_positions;
CREATE POLICY "team_positions manage by admin or leadership" ON public.team_positions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_leadership(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_leadership(auth.uid()));

DROP POLICY IF EXISTS "team_members manage by leadership" ON public.team_members;
CREATE POLICY "team_members manage by admin or leadership" ON public.team_members
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_leadership(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_leadership(auth.uid()));

-- ============================================================
-- Migration: 20260722180239_1cea4695-a9b5-4dd2-a75a-9955a979cd55.sql
-- ============================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_positions TO authenticated;
GRANT ALL ON public.team_positions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_leadership(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_team_permissions() TO authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_leadership(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.current_team_permissions() TO service_role;

-- ============================================================
-- Migration: 20260722180523_58bce81a-6929-4dc6-aa57-40a3b1d45621.sql
-- ============================================================
REVOKE ALL ON public.team_positions FROM anon;
REVOKE ALL ON public.team_positions FROM public;
REVOKE ALL ON public.team_members FROM anon;
REVOKE ALL ON public.team_members FROM public;
REVOKE ALL ON public.user_roles FROM anon;
REVOKE ALL ON public.user_roles FROM public;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_positions TO authenticated;
GRANT ALL ON public.team_positions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- ============================================================
-- Migration: 20260723040431_682bedaf-d63e-43ee-904d-97c961a95c07.sql
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'recruiter'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'recruiter';
  END IF;
END$$;


-- ============================================================
-- Migration: 20260723040514_1de16ea6-0e11-48c5-9518-2581c5aa8b4e.sql
-- ============================================================

-- Access tables
CREATE TABLE IF NOT EXISTS public.recruiter_offer_access (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id     text NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (recruiter_id, offer_id)
);
CREATE INDEX IF NOT EXISTS recruiter_offer_access_recruiter_idx
  ON public.recruiter_offer_access(recruiter_id);
CREATE INDEX IF NOT EXISTS recruiter_offer_access_offer_idx
  ON public.recruiter_offer_access(offer_id);

GRANT SELECT ON public.recruiter_offer_access TO authenticated;
GRANT ALL ON public.recruiter_offer_access TO service_role;
ALTER TABLE public.recruiter_offer_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roa admin all"  ON public.recruiter_offer_access;
DROP POLICY IF EXISTS "roa read own"   ON public.recruiter_offer_access;
CREATE POLICY "roa admin all" ON public.recruiter_offer_access
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roa read own" ON public.recruiter_offer_access
  FOR SELECT TO authenticated
  USING (auth.uid() = recruiter_id);

CREATE TABLE IF NOT EXISTS public.recruiter_category_access (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category     text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (recruiter_id, category)
);
CREATE INDEX IF NOT EXISTS recruiter_category_access_recruiter_idx
  ON public.recruiter_category_access(recruiter_id);
CREATE INDEX IF NOT EXISTS recruiter_category_access_category_idx
  ON public.recruiter_category_access(category);

GRANT SELECT ON public.recruiter_category_access TO authenticated;
GRANT ALL ON public.recruiter_category_access TO service_role;
ALTER TABLE public.recruiter_category_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rca admin all" ON public.recruiter_category_access;
DROP POLICY IF EXISTS "rca read own"  ON public.recruiter_category_access;
CREATE POLICY "rca admin all" ON public.recruiter_category_access
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "rca read own" ON public.recruiter_category_access
  FOR SELECT TO authenticated
  USING (auth.uid() = recruiter_id);

-- Helper
CREATE OR REPLACE FUNCTION public.can_recruit_offer(_uid uuid, _offer_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.recruiter_offer_access
    WHERE recruiter_id = _uid AND offer_id = _offer_id
  ) OR EXISTS (
    SELECT 1
    FROM public.recruiter_category_access rca
    JOIN public.offers o ON o.category = rca.category
    WHERE rca.recruiter_id = _uid AND o.id = _offer_id
  );
$$;
REVOKE ALL ON FUNCTION public.can_recruit_offer(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_recruit_offer(uuid, text) TO authenticated, service_role;

-- Recruiter-scoped RLS on existing tables
DROP POLICY IF EXISTS "offers recruiter update" ON public.offers;
CREATE POLICY "offers recruiter update" ON public.offers
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'recruiter'::app_role) AND public.can_recruit_offer(auth.uid(), id))
  WITH CHECK (public.has_role(auth.uid(), 'recruiter'::app_role) AND public.can_recruit_offer(auth.uid(), id));

DROP POLICY IF EXISTS "links recruiter read" ON public.link_requests;
CREATE POLICY "links recruiter read" ON public.link_requests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'recruiter'::app_role) AND public.can_recruit_offer(auth.uid(), offer_id));

DROP POLICY IF EXISTS "conversions recruiter read" ON public.conversions;
CREATE POLICY "conversions recruiter read" ON public.conversions
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'recruiter'::app_role)
    AND offer_id IS NOT NULL
    AND public.can_recruit_offer(auth.uid(), offer_id)
  );

-- Patched RPC: allow admin OR recruiter-with-access; behavior identical for admin
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
  _is_admin boolean;
  _is_recruiter boolean;
BEGIN
  _is_admin := public.has_role(auth.uid(), 'admin');

  SELECT * INTO _req FROM public.link_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'request not found';
  END IF;

  _is_recruiter := public.has_role(auth.uid(), 'recruiter')
                   AND _req.offer_id IS NOT NULL
                   AND public.can_recruit_offer(auth.uid(), _req.offer_id);

  IF NOT (_is_admin OR _is_recruiter) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
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
$function$;


-- ============================================================
-- Migration: 20260723041104_733316e0-426e-41ee-909d-02fdef976931.sql
-- ============================================================

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS income text,
  ADD COLUMN IF NOT EXISTS target_action text,
  ADD COLUMN IF NOT EXISTS work_rules text,
  ADD COLUMN IF NOT EXISTS ad_materials text,
  ADD COLUMN IF NOT EXISTS feedback text,
  ADD COLUMN IF NOT EXISTS term_completion text,
  ADD COLUMN IF NOT EXISTS term_confirmation text,
  ADD COLUMN IF NOT EXISTS avg_orders_per_courier numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.recompute_offer_stats(_offer_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req_total int := 0;
  conv_count int := 0;
  conv_sum numeric := 0;
  avg_orders numeric := 0;
BEGIN
  IF _offer_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO req_total
  FROM public.link_requests WHERE offer_id = _offer_id;

  SELECT COUNT(*), COALESCE(SUM(amount), 0) INTO conv_count, conv_sum
  FROM public.conversions WHERE offer_id = _offer_id;

  SELECT COALESCE(AVG(NULLIF(orders_count, 0)), 0) INTO avg_orders
  FROM public.link_requests
  WHERE offer_id = _offer_id
    AND status IN ('completed','finished','paid');

  UPDATE public.offers SET
    cr = CASE WHEN req_total > 0 THEN ROUND((conv_count::numeric / req_total) * 100, 2) ELSE 0 END,
    epc = CASE WHEN req_total > 0 THEN GREATEST(0, (conv_sum / req_total)::int) ELSE 0 END,
    avg_orders_per_courier = ROUND(COALESCE(avg_orders, 0), 2),
    updated_at = now()
  WHERE id = _offer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_offer_stats(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_recompute_offer_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_offer_stats(OLD.offer_id);
    RETURN OLD;
  ELSE
    PERFORM public.recompute_offer_stats(NEW.offer_id);
    IF TG_OP = 'UPDATE' AND OLD.offer_id IS DISTINCT FROM NEW.offer_id THEN
      PERFORM public.recompute_offer_stats(OLD.offer_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS conversions_recompute_offer_stats ON public.conversions;
DROP TRIGGER IF EXISTS conversions_recompute_offer_stats ON public.conversions;
CREATE TRIGGER conversions_recompute_offer_stats
AFTER INSERT OR UPDATE OR DELETE ON public.conversions
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_offer_stats();

DROP TRIGGER IF EXISTS link_requests_recompute_offer_stats ON public.link_requests;
DROP TRIGGER IF EXISTS link_requests_recompute_offer_stats ON public.link_requests;
CREATE TRIGGER link_requests_recompute_offer_stats
AFTER INSERT OR UPDATE OR DELETE ON public.link_requests
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_offer_stats();

-- Initial backfill
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.offers LOOP
    PERFORM public.recompute_offer_stats(r.id);
  END LOOP;
END $$;


-- ============================================================
-- Migration: 20260723041117_84406323-a475-47e7-a9c1-6eb8caba43d4.sql
-- ============================================================

REVOKE ALL ON FUNCTION public.recompute_offer_stats(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_recompute_offer_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_offer_stats(text) TO service_role;


-- ============================================================
-- Migration: 20260723041850_4b6922ae-9aed-4383-ae73-3c3c15c34858.sql
-- ============================================================

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

DROP TRIGGER IF EXISTS promo_codes_set_updated_at ON public.promo_codes;
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
DROP TRIGGER IF EXISTS conversions_auto_apply_promos ON public.conversions;
CREATE TRIGGER conversions_auto_apply_promos
  AFTER INSERT ON public.conversions
  FOR EACH ROW EXECUTE FUNCTION public.auto_apply_promos();

