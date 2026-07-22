import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

export type LandingOffer = {
  id: string;
  name: string;
  category: string | null;
  payout: string;
  cr: number;
  epc: number;
  is_new: boolean;
};

export type LandingTickerItem = {
  kind: "conversion" | "signup" | "offer" | "payout" | "request";
  who: string;
  text: string;
  amount?: number;
  at: string;
};

export type LandingStats = {
  partners: number;
  totalPaid: number;
  completedConversions: number;
  offersCount: number;
  avgEpc: number;
  offers: LandingOffer[];
  ticker: LandingTickerItem[];
};

function maskName(input: string | null | undefined): string {
  const s = (input ?? "").trim();
  if (!s) return "Партнёр";
  const parts = s.split(/\s+/);
  const first = parts[0];
  const initial = parts[1]?.[0];
  const short = first.length > 12 ? first.slice(0, 12) : first;
  return initial ? `${short} ${initial}.` : short;
}

type RpcResult = {
  partners: number;
  offersCount: number;
  totalPaid: number;
  completedConversions: number;
  topOffers: Array<{ id: string; name: string; category: string | null; payout: string; cr: number | null; epc: number | null; is_new: boolean | null }>;
  recentConv: Array<{ offer_name: string; amount: number; user_id: string | null; created_at: string }>;
  recentSignups: Array<{ id: string; display_name: string | null; email: string | null; created_at: string }>;
  recentOffers: Array<{ name: string; created_at: string }>;
  recentPayouts: Array<{ amount: number; user_id: string | null; created_at: string }>;
  recentReqs: Array<{ offer_name: string; user_id: string | null; status: string; orders_count: number | null; created_at: string }>;
  names: Record<string, { display_name: string | null; email: string | null }>;
};

export const getLandingStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<LandingStats> => {
    // Short edge cache: fast repeat visits + stale-while-revalidate for freshness.
    try {
      setResponseHeader("cache-control", "public, max-age=15, s-maxage=30, stale-while-revalidate=120");
    } catch { /* ignore in non-request contexts */ }

    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supa = createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { data, error } = await supa.rpc("get_landing_stats");
    if (error) {
      console.error("[landing-stats] rpc get_landing_stats failed:", error.message, error.code, error.details);
    }
    if (error || !data) {
      return {
        partners: 0, totalPaid: 0, completedConversions: 0,
        offersCount: 0, avgEpc: 0, offers: [], ticker: [],
      };
    }
    const r = data as unknown as RpcResult;

    const offers: LandingOffer[] = (r.topOffers ?? []).map((o) => ({
      id: o.id,
      name: o.name,
      category: o.category,
      payout: o.payout,
      cr: Number(o.cr ?? 0),
      epc: Number(o.epc ?? 0),
      is_new: !!o.is_new,
    }));

    const avgEpc = offers.length > 0
      ? Math.round(offers.reduce((s, o) => s + o.epc, 0) / offers.length)
      : 0;

    const nameOf = (id: string | null | undefined) => {
      if (!id) return "Партнёр";
      const p = r.names?.[id];
      return maskName(p?.display_name || p?.email?.split("@")[0] || null);
    };

    const raw: LandingTickerItem[] = [];
    for (const c of r.recentConv ?? []) raw.push({ kind: "conversion", who: nameOf(c.user_id), text: `закрыл сделку по «${c.offer_name}»`, amount: Number(c.amount ?? 0), at: c.created_at });
    for (const p of r.recentSignups ?? []) raw.push({ kind: "signup", who: maskName(p.display_name || p.email?.split("@")[0] || null), text: "присоединился к сети", at: p.created_at });
    for (const o of r.recentOffers ?? []) raw.push({ kind: "offer", who: "КВАНТ", text: `запустил новый оффер «${o.name}»`, at: o.created_at });
    for (const p of r.recentPayouts ?? []) raw.push({ kind: "payout", who: nameOf(p.user_id), text: "получил выплату", amount: Number(p.amount ?? 0), at: p.created_at });
    for (const req of r.recentReqs ?? []) {
      const label =
        req.status === "finished" || req.status === "paid"
          ? `завершил заявку «${req.offer_name}»`
          : req.status === "completed"
            ? `выполнил ${req.orders_count ?? 0} заказ(ов) по «${req.offer_name}»`
            : req.status === "in_progress"
              ? `взял в работу оффер «${req.offer_name}»`
              : null;
      if (label) raw.push({ kind: "request", who: nameOf(req.user_id), text: label, at: req.created_at });
    }

    const ticker = raw
      .filter((x) => !!x.at)
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, 20);

    return {
      partners: r.partners ?? 0,
      totalPaid: Number(r.totalPaid ?? 0),
      completedConversions: r.completedConversions ?? 0,
      offersCount: r.offersCount ?? 0,
      avgEpc,
      offers,
      ticker,
    };
  },
);
