import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const SUPER_ADMIN_EMAIL = "luxmailu@mail.ru";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/" });
    const user = data.user;
    const emailConfirmed = Boolean(
      (user as { email_confirmed_at?: string | null }).email_confirmed_at ??
        (user as { confirmed_at?: string | null }).confirmed_at,
    );
    const isSuperAdmin = (user.email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL;
    if (!emailConfirmed && !isSuperAdmin) {
      throw redirect({ to: "/", search: { needs_confirm: "1" } as never });
    }
    return { user };
  },
  component: () => <Outlet />,
});
