
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
