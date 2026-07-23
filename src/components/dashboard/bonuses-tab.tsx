import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Loader2, Sparkles, Target, Timer, CheckCircle2, Coins } from "lucide-react";

type Promo = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  bonus_amount: number;
  starts_at: string;
  ends_at: string;
  active: boolean;
  trigger_offer_id: string | null;
  trigger_conversions_count: number;
};

type Activation = {
  id: string;
  promo_id: string;
  amount: number;
  created_at: string;
};

type OfferLite = { id: string; name: string };

function daysLeft(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

export function BonusesTab({ userId }: { userId: string | null }) {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [acts, setActs] = useState<Activation[]>([]);
  const [offers, setOffers] = useState<OfferLite[]>([]);
  const [progressByOffer, setProgressByOffer] = useState<Map<string, number>>(new Map());
  const [totalOk, setTotalOk] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const now = new Date().toISOString();
    const [promosRes, actsRes, offersRes, convsRes] = await Promise.all([
      supabase
        .from("promo_codes")
        .select("id, code, title, description, bonus_amount, starts_at, ends_at, active, trigger_offer_id, trigger_conversions_count")
        .eq("active", true)
        .gte("ends_at", now)
        .order("ends_at", { ascending: true }),
      supabase
        .from("promo_activations")
        .select("id, promo_id, amount, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase.from("offers").select("id, name"),
      supabase
        .from("conversions")
        .select("offer_id, status, offer_name, created_at")
        .eq("user_id", userId)
        .eq("status", "ok"),
    ]);
    setPromos((promosRes.data ?? []) as Promo[]);
    setActs((actsRes.data ?? []) as Activation[]);
    setOffers((offersRes.data ?? []) as OfferLite[]);
    const m = new Map<string, number>();
    let total = 0;
    for (const c of (convsRes.data ?? []) as { offer_id: string | null; offer_name: string }[]) {
      if (c.offer_name?.startsWith("Промокод:") || c.offer_name?.startsWith("Приз:")) continue;
      total += 1;
      if (c.offer_id) m.set(c.offer_id, (m.get(c.offer_id) || 0) + 1);
    }
    setProgressByOffer(m);
    setTotalOk(total);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
    if (!userId) return;
    const ch = supabase
      .channel("rt:user:promos")
      .on("postgres_changes", { event: "*", schema: "public", table: "promo_codes" }, () => void load())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "promo_activations", filter: `user_id=eq.${userId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [load, userId]);

  const activatedIds = useMemo(() => new Set(acts.map((a) => a.promo_id)), [acts]);
  const totalEarned = useMemo(() => acts.reduce((s, a) => s + Number(a.amount || 0), 0), [acts]);
  const promoById = useMemo(() => new Map(promos.map((p) => [p.id, p])), [promos]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black tracking-tight">Бонусы и промокоды</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Бонусы начисляются автоматически, как только вы выполните условие промокода.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <p className="text-lg font-black text-emerald-500">{totalEarned.toLocaleString("ru-RU")} ₽</p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Получено бонусами
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <p className="text-lg font-black">{acts.length}</p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Активировано
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <p className="text-lg font-black text-primary">{promos.length}</p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Доступно сейчас
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Активные промокоды
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : promos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            Пока нет активных промокодов. Загляните позже — они появляются регулярно.
          </div>
        ) : (
          promos.map((p) => {
            const done = activatedIds.has(p.id);
            const offerName = p.trigger_offer_id
              ? offers.find((o) => o.id === p.trigger_offer_id)?.name || "оффер"
              : "любому офферу";
            const need = p.trigger_conversions_count;
            const have = p.trigger_offer_id
              ? progressByOffer.get(p.trigger_offer_id) || 0
              : totalOk;
            const pct = done ? 100 : Math.min(100, Math.round((have / Math.max(1, need)) * 100));
            const left = daysLeft(p.ends_at);
            return (
              <div
                key={p.id}
                className={`space-y-3 rounded-2xl border p-3.5 shadow-sm ${
                  done ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-primary">
                        {p.code}
                      </span>
                      <span className="text-sm font-bold">{p.title}</span>
                    </div>
                    {p.description && (
                      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                        {p.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-emerald-500">
                      +{Number(p.bonus_amount).toLocaleString("ru-RU")} ₽
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Timer className="size-3" /> {left} дн.
                    </p>
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Target className="size-3" />
                      {need} сделк{need === 1 ? "а" : "и"} по «{offerName}»
                    </span>
                    <span className={done ? "text-emerald-500" : ""}>
                      {done ? "Активировано" : `${Math.min(have, need)} / ${need}`}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full ${
                        done ? "bg-emerald-500" : "bg-primary"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {done && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-500">
                    <CheckCircle2 className="size-3.5" />
                    Бонус начислен на баланс
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          История начислений
        </h3>
        {acts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
            <Sparkles className="mx-auto mb-1.5 size-4 text-muted-foreground/60" />
            Пока нет активированных промокодов
          </div>
        ) : (
          <div className="space-y-1.5">
            {acts.map((a) => {
              const p = promoById.get(a.promo_id);
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">
                      {p?.title ?? "Промокод"}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {p?.code ?? ""} · {new Date(a.created_at).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-black text-emerald-500">
                    <Coins className="size-3.5" />+{Number(a.amount).toLocaleString("ru-RU")} ₽
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-secondary/20 p-4">
        <div className="flex items-start gap-3">
          <Gift className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider">Как это работает</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Промокоды не активируются вручную — просто выполняйте условия оффера, указанного
              в промо. Как только вы наберёте нужное количество сделок в период действия
              промокода, бонус автоматически зачислится на баланс, а мы пришлём уведомление.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
