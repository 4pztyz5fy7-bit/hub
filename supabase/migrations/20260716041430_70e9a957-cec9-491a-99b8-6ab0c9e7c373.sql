
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
