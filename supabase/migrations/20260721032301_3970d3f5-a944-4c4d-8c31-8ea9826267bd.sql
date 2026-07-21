
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
