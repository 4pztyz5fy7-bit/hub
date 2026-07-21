import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Ban, LogOut, Mail } from "lucide-react";

export const Route = createFileRoute("/blocked")({
  head: () => ({ meta: [{ title: "Аккаунт заблокирован — КВАНТ" }] }),
  component: BlockedPage,
});

function BlockedPage() {
  const navigate = useNavigate();
  const [info, setInfo] = useState<{ email: string | null; reason: string | null; at: string | null }>({
    email: null, reason: null, at: null,
  });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("email,blocked,blocked_reason,blocked_at")
        .eq("id", u.user.id)
        .maybeSingle();
      // If not blocked anymore — send back to dashboard
      if (data && data.blocked === false) {
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      setInfo({
        email: data?.email ?? u.user.email ?? null,
        reason: (data as any)?.blocked_reason ?? null,
        at: (data as any)?.blocked_at ?? null,
      });
      // Force sign out to invalidate session on this device
      await supabase.auth.signOut();
    })();
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-destructive/40 bg-card p-6 text-center shadow-2xl">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-destructive/15 text-destructive">
          <Ban className="size-7" />
        </div>
        <h1 className="mt-4 text-lg font-black uppercase tracking-tight">Аккаунт заблокирован</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Доступ к платформе КВАНТ ограничен администрацией.
        </p>

        {info.email && (
          <p className="mt-3 text-[11px] font-mono text-muted-foreground">{info.email}</p>
        )}

        <div className="mt-4 rounded-xl border border-border bg-background/60 p-3 text-left">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Причина</p>
          <p className="mt-1 text-sm">{info.reason || "Нарушение правил платформы."}</p>
          {info.at && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              Блокировка от {new Date(info.at).toLocaleString("ru-RU")}
            </p>
          )}
        </div>

        <div className="mt-4 space-y-2 text-left text-[11px] text-muted-foreground">
          <p>• Все активные заявки и выплаты приостановлены.</p>
          <p>• Повторная регистрация под другим email запрещена.</p>
          <p>• Если считаете блокировку ошибочной — напишите в поддержку.</p>
        </div>

        <a
          href="mailto:support@kvantm.tech?subject=Разблокировка%20аккаунта"
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-accent"
        >
          <Mail className="size-3.5" /> Написать в поддержку
        </a>

        <button
          onClick={signOut}
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-destructive px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-destructive-foreground"
        >
          <LogOut className="size-3.5" /> Выйти
        </button>
      </div>
    </div>
  );
}
