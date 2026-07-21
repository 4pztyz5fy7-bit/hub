
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
