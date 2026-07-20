import { createServerFn } from "@tanstack/react-start";

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

export const getLandingStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<LandingStats> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [
      partnersRes, offersActiveRes, topOffersRes, paidRes, completedRes,
      recentConvRes, recentSignupsRes, recentOffersRes, recentPayoutsRes, recentReqRes,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("offers").select("id", { count: "exact", head: true }).eq("active", true),
      supabaseAdmin
        .from("offers")
        .select("id,name,category,payout,cr,epc,is_new")
        .eq("active", true)
        .order("epc", { ascending: false })
        .limit(6),
      supabaseAdmin.from("payout_requests").select("amount").eq("status", "paid"),
      supabaseAdmin.from("conversions").select("amount").eq("status", "ok"),
      supabaseAdmin
        .from("conversions")
        .select("offer_name,amount,user_id,created_at")
        .eq("status", "ok")
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("profiles")
        .select("id,display_name,email,created_at")
        .order("created_at", { ascending: false })
        .limit(8),
      supabaseAdmin
        .from("offers")
        .select("name,created_at")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(5),
      supabaseAdmin
        .from("payout_requests")
        .select("amount,user_id,created_at")
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .limit(8),
      supabaseAdmin
        .from("link_requests")
        .select("offer_name,user_id,status,orders_count,created_at")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    const partners = partnersRes.count ?? 0;
    const offersCount = offersActiveRes.count ?? 0;

    const totalPaid =
      (paidRes.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0) +
      (completedRes.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);

    const completedConversions = completedRes.data?.length ?? 0;

    const offers: LandingOffer[] = (topOffersRes.data ?? []).map((o) => ({
      id: o.id,
      name: o.name,
      category: o.category,
      payout: o.payout,
      cr: Number(o.cr ?? 0),
      epc: Number(o.epc ?? 0),
      is_new: !!o.is_new,
    }));

    const avgEpc =
      offers.length > 0
        ? Math.round(offers.reduce((s, o) => s + o.epc, 0) / offers.length)
        : 0;

    // Gather user names for masking
    const userIds = Array.from(
      new Set(
        [
          ...(recentConvRes.data ?? []).map((r) => r.user_id),
          ...(recentPayoutsRes.data ?? []).map((r) => r.user_id),
          ...(recentReqRes.data ?? []).map((r) => r.user_id),
        ].filter(Boolean) as string[],
      ),
    );
    const nameMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id,display_name,email")
        .in("id", userIds);
      for (const p of profs ?? []) {
        nameMap.set(p.id, maskName(p.display_name || p.email?.split("@")[0] || null));
      }
    }
    const nameOf = (id: string | null | undefined) =>
      (id && nameMap.get(id)) || "Партнёр";

    const raw: LandingTickerItem[] = [];

    for (const r of recentConvRes.data ?? []) {
      raw.push({
        kind: "conversion",
        who: nameOf(r.user_id),
        text: `закрыл сделку по «${r.offer_name}»`,
        amount: Number(r.amount ?? 0),
        at: r.created_at,
      });
    }
    for (const p of recentSignupsRes.data ?? []) {
      raw.push({
        kind: "signup",
        who: maskName(p.display_name || p.email?.split("@")[0] || null),
        text: "присоединился к сети",
        at: p.created_at,
      });
    }
    for (const o of recentOffersRes.data ?? []) {
      raw.push({
        kind: "offer",
        who: "КВАНТ",
        text: `запустил новый оффер «${o.name}»`,
        at: o.created_at,
      });
    }
    for (const p of recentPayoutsRes.data ?? []) {
      raw.push({
        kind: "payout",
        who: nameOf(p.user_id),
        text: "получил выплату",
        amount: Number(p.amount ?? 0),
        at: p.created_at,
      });
    }
    for (const r of recentReqRes.data ?? []) {
      const label =
        r.status === "finished" || r.status === "paid"
          ? `завершил заявку «${r.offer_name}»`
          : r.status === "completed"
            ? `выполнил ${r.orders_count ?? 0} заказ(ов) по «${r.offer_name}»`
            : r.status === "in_progress"
              ? `взял в работу оффер «${r.offer_name}»`
              : null;
      if (label) {
        raw.push({
          kind: "request",
          who: nameOf(r.user_id),
          text: label,
          at: r.created_at,
        });
      }
    }

    const ticker = raw
      .filter((x) => !!x.at)
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, 20);

    return {
      partners,
      totalPaid,
      completedConversions,
      offersCount,
      avgEpc,
      offers,
      ticker,
    };
  },
);
