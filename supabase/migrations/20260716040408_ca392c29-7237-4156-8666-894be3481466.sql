
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
CREATE POLICY "conversions read own" ON public.conversions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "conversions insert own" ON public.conversions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversions read admin" ON public.conversions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
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
CREATE POLICY "notif read own" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif insert own" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notif update own" ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
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
