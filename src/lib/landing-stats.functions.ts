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
  who: string;
  offer: string;
  amount: number;
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

    const [partnersRes, offersActiveRes, topOffersRes, paidRes, completedRes, recentRes] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("offers").select("id", { count: "exact", head: true }).eq("active", true),
        supabaseAdmin
          .from("offers")
          .select("id,name,category,payout,cr,epc,is_new")
          .eq("active", true)
          .order("epc", { ascending: false })
          .limit(6),
        supabaseAdmin.from("payout_requests").select("amount").eq("status", "paid"),
        supabaseAdmin.from("conversions").select("amount").eq("status", "approved"),
        supabaseAdmin
          .from("conversions")
          .select("offer_name,amount,user_id,created_at")
          .eq("status", "approved")
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

    // Fetch masked names for ticker
    const userIds = Array.from(new Set((recentRes.data ?? []).map((r) => r.user_id)));
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

    const ticker: LandingTickerItem[] = (recentRes.data ?? []).map((r) => ({
      who: nameMap.get(r.user_id) ?? "Партнёр",
      offer: r.offer_name,
      amount: Number(r.amount ?? 0),
    }));

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
