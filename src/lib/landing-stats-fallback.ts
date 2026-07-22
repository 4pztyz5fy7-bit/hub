// Browser-side fallback for landing stats.
// Used when the server RPC `get_landing_stats` is unavailable or empty on a
// self-hosted DB where EXECUTE grants weren't applied. We rebuild the same
// shape by querying individual tables directly with the anon client — each
// table only needs a plain SELECT policy for `anon`/`authenticated`.

import { supabase } from "@/integrations/supabase/client";
import type { LandingStats, LandingTickerItem } from "@/lib/landing-stats.functions";

function maskName(input: string | null | undefined): string {
  const s = (input ?? "").trim();
  if (!s) return "Партнёр";
  const parts = s.split(/\s+/);
  const first = parts[0];
  const initial = parts[1]?.[0];
  const short = first.length > 12 ? first.slice(0, 12) : first;
  return initial ? `${short} ${initial}.` : short;
}

export async function fetchLandingStatsClient(): Promise<LandingStats> {
  const [
    profilesRes,
    offersActiveRes,
    offersTopRes,
    convOkRes,
    convRecentRes,
    signupsRes,
    offersRecentRes,
    payoutsPaidRes,
    reqsRecentRes,
    paidSumRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("offers").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("offers").select("id,name,category,payout,cr,epc,is_new").eq("active", true).order("epc", { ascending: false, nullsFirst: false }).limit(6),
    supabase.from("conversions").select("amount", { count: "exact" }).eq("status", "ok"),
    supabase.from("conversions").select("offer_name,amount,user_id,created_at").eq("status", "ok").order("created_at", { ascending: false }).limit(10),
    supabase.from("profiles").select("id,display_name,email,created_at").order("created_at", { ascending: false }).limit(8),
    supabase.from("offers").select("name,created_at").eq("active", true).order("created_at", { ascending: false }).limit(5),
    supabase.from("payout_requests").select("amount,user_id,created_at").eq("status", "paid").order("created_at", { ascending: false }).limit(8),
    supabase.from("link_requests").select("offer_name,user_id,status,orders_count,created_at").order("created_at", { ascending: false }).limit(12),
    supabase.from("payout_requests").select("amount").eq("status", "paid"),
  ]);

  const partners = profilesRes.count ?? 0;
  const offersCount = offersActiveRes.count ?? 0;
  const completedConversions = convOkRes.count ?? 0;

  const convSum = (convOkRes.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const paidSum = (paidSumRes.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const totalPaid = convSum + paidSum;

  // Names lookup for tickers
  const ids = new Set<string>();
  (convRecentRes.data ?? []).forEach((r) => r.user_id && ids.add(r.user_id));
  (payoutsPaidRes.data ?? []).forEach((r) => r.user_id && ids.add(r.user_id));
  (reqsRecentRes.data ?? []).forEach((r) => r.user_id && ids.add(r.user_id));

  let names: Record<string, { display_name: string | null; email: string | null }> = {};
  if (ids.size > 0) {
    const { data: nameRows } = await supabase
      .from("profiles")
      .select("id,display_name,email")
      .in("id", Array.from(ids));
    for (const p of nameRows ?? []) names[p.id] = { display_name: p.display_name, email: p.email };
  }
  const nameOf = (id: string | null | undefined) => {
    if (!id) return "Партнёр";
    const p = names[id];
    return maskName(p?.display_name || p?.email?.split("@")[0] || null);
  };

  const offers = (offersTopRes.data ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    category: o.category ?? null,
    payout: o.payout ?? "",
    cr: Number(o.cr ?? 0),
    epc: Number(o.epc ?? 0),
    is_new: !!o.is_new,
  }));

  const avgEpc = offers.length > 0
    ? Math.round(offers.reduce((s, o) => s + o.epc, 0) / offers.length)
    : 0;

  const raw: LandingTickerItem[] = [];
  for (const c of convRecentRes.data ?? []) raw.push({ kind: "conversion", who: nameOf(c.user_id), text: `закрыл сделку по «${c.offer_name}»`, amount: Number(c.amount ?? 0), at: c.created_at });
  for (const p of signupsRes.data ?? []) raw.push({ kind: "signup", who: maskName(p.display_name || p.email?.split("@")[0] || null), text: "присоединился к сети", at: p.created_at });
  for (const o of offersRecentRes.data ?? []) raw.push({ kind: "offer", who: "КВАНТ", text: `запустил новый оффер «${o.name}»`, at: o.created_at });
  for (const p of payoutsPaidRes.data ?? []) raw.push({ kind: "payout", who: nameOf(p.user_id), text: "получил выплату", amount: Number(p.amount ?? 0), at: p.created_at });
  for (const r of reqsRecentRes.data ?? []) {
    const label =
      r.status === "finished" || r.status === "paid"
        ? `завершил заявку «${r.offer_name}»`
        : r.status === "completed"
          ? `выполнил ${r.orders_count ?? 0} заказ(ов) по «${r.offer_name}»`
          : r.status === "in_progress"
            ? `взял в работу оффер «${r.offer_name}»`
            : null;
    if (label) raw.push({ kind: "request", who: nameOf(r.user_id), text: label, at: r.created_at });
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
}

export function isStatsEmpty(s: LandingStats | null | undefined): boolean {
  if (!s) return true;
  return (
    (s.partners ?? 0) === 0 &&
    (s.offersCount ?? 0) === 0 &&
    (s.completedConversions ?? 0) === 0 &&
    (s.totalPaid ?? 0) === 0 &&
    (s.offers?.length ?? 0) === 0 &&
    (s.ticker?.length ?? 0) === 0
  );
}
