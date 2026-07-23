import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ---------------- helpers ---------------- */

async function assertAdmin(context: { supabase: any; userId: string }) {
  const rpc = await context.supabase.rpc("is_admin");
  if (!rpc.error && rpc.data === true) return;
  const own = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (own.error || !own.data) {
    throw new Error("Только администратор может выполнять это действие");
  }
}

async function assertRecruiterOrAdmin(context: { supabase: any; userId: string }) {
  const rpcA = await context.supabase.rpc("is_admin");
  if (!rpcA.error && rpcA.data === true) return { admin: true as const };
  const rpcR = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "recruiter",
  });
  if (!rpcR.error && rpcR.data === true) return { admin: false as const };
  throw new Error("Доступ только для рекрутёров и администраторов");
}

async function recruiterOfferIds(context: { supabase: any; userId: string }): Promise<string[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [direct, cats] = await Promise.all([
    supabaseAdmin
      .from("recruiter_offer_access")
      .select("offer_id")
      .eq("recruiter_id", context.userId),
    supabaseAdmin
      .from("recruiter_category_access")
      .select("category")
      .eq("recruiter_id", context.userId),
  ]);
  const set = new Set<string>();
  for (const r of direct.data ?? []) if (r.offer_id) set.add(r.offer_id as string);
  const categories = (cats.data ?? []).map((c) => c.category as string).filter(Boolean);
  if (categories.length > 0) {
    const { data } = await supabaseAdmin.from("offers").select("id").in("category", categories);
    for (const o of data ?? []) if (o.id) set.add(o.id as string);
  }
  return Array.from(set);
}

/* ---------------- recruiter panel ---------------- */

export const getRecruiterScope = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const who = await assertRecruiterOrAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ids = who.admin ? null : await recruiterOfferIds(context);

    const offersQ = supabaseAdmin
      .from("offers")
      .select("*")
      .order("created_at", { ascending: false });
    const offers = who.admin ? await offersQ : await offersQ.in("id", ids ?? []);
    if (offers.error) throw new Error(offers.error.message);

    const [direct, cats] = await Promise.all([
      supabaseAdmin
        .from("recruiter_offer_access")
        .select("offer_id")
        .eq("recruiter_id", context.userId),
      supabaseAdmin
        .from("recruiter_category_access")
        .select("category")
        .eq("recruiter_id", context.userId),
    ]);

    return {
      isAdmin: who.admin,
      offers: offers.data ?? [],
      directOfferIds: (direct.data ?? []).map((r) => r.offer_id as string),
      categories: (cats.data ?? []).map((r) => r.category as string),
    };
  });

const updateOfferSchema = z.object({
  id: z.string().min(1),
  patch: z.object({
    name: z.string().max(500).optional(),
    tag: z.string().max(200).nullable().optional(),
    category: z.string().max(200).nullable().optional(),
    advertiser: z.string().max(500).nullable().optional(),
    geo: z.string().max(500).nullable().optional(),
    payout: z.string().max(500).optional(),
    goal: z.string().max(10000).nullable().optional(),
    description: z.string().max(10000).nullable().optional(),
    requirements: z.string().max(10000).nullable().optional(),
    allowed: z.array(z.string().max(200)).max(200).optional(),
    denied: z.array(z.string().max(200)).max(200).optional(),
    active: z.boolean().optional(),
    landing: z.string().max(4000).nullable().optional(),
    income: z.string().max(10000).nullable().optional(),
    target_action: z.string().max(10000).nullable().optional(),
    work_rules: z.string().max(20000).nullable().optional(),
    ad_materials: z.string().max(20000).nullable().optional(),
    feedback: z.string().max(10000).nullable().optional(),
    term_completion: z.string().max(2000).nullable().optional(),
    term_confirmation: z.string().max(2000).nullable().optional(),
  }),
});

export const updateRecruiterOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateOfferSchema.parse(input))
  .handler(async ({ data, context }) => {
    const who = await assertRecruiterOrAdmin(context);
    if (!who.admin) {
      const { data: ok, error } = await context.supabase.rpc("can_recruit_offer", {
        _uid: context.userId,
        _offer_id: data.id,
      });
      if (error) throw new Error(error.message);
      if (ok !== true) throw new Error("Нет доступа к этому офферу");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { ...data.patch, updated_at: new Date().toISOString() };
    const { error } = await supabaseAdmin.from("offers").update(patch as any).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getRecruiterRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const who = await assertRecruiterOrAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ids = who.admin ? null : await recruiterOfferIds(context);
    let q = supabaseAdmin
      .from("link_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (!who.admin) q = q.in("offer_id", ids ?? []);
    const { data, error } = await q;
    if (error) throw new Error(error.message);

    const uids = Array.from(
      new Set((data ?? []).map((r) => r.user_id).filter((v): v is string => !!v)),
    );
    let profiles: any[] = [];
    if (uids.length) {
      const p = await supabaseAdmin
        .from("profiles")
        .select("id,display_name,email,telegram")
        .in("id", uids);
      profiles = p.data ?? [];
    }
    return { requests: data ?? [], profiles };
  });

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["in_progress", "completed", "finished", "paid", "new", "review", "rejected"]),
  payout_override: z.number().nonnegative().nullable().optional(),
});

export const setRecruiterRequestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => statusSchema.parse(input))
  .handler(async ({ data, context }) => {
    const who = await assertRecruiterOrAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch the request row
    const { data: req, error: reqErr } = await supabaseAdmin
      .from("link_requests")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (reqErr) throw new Error(reqErr.message);
    if (!req) throw new Error("Заявка не найдена");

    // Recruiters may only act on offers they can recruit for
    if (!who.admin) {
      if (!req.offer_id) throw new Error("Нет доступа к этой заявке");
      const { data: allowed, error: aErr } = await context.supabase.rpc("can_recruit_offer", {
        _uid: context.userId,
        _offer_id: req.offer_id,
      });
      if (aErr) throw new Error(aErr.message);
      if (allowed !== true) throw new Error("Нет доступа к этому офферу");
    }

    // Apply payout override if provided
    if (data.payout_override != null) {
      const { error } = await supabaseAdmin
        .from("link_requests")
        .update({ payout_override: data.payout_override, updated_at: new Date().toISOString() })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      (req as any).payout_override = data.payout_override;
    }

    // Credit-on-paid path replicates admin_set_link_request_status
    let convId: string | null = null;
    let base = 0;
    let bonusPct = 0;
    let bonusAmt = 0;
    let credited = 0;

    if (data.status === "paid" && !req.credited_at) {
      let offer: any = null;
      if (req.offer_id) {
        const { data: o } = await supabaseAdmin
          .from("offers")
          .select("*")
          .eq("id", req.offer_id)
          .maybeSingle();
        offer = o;
      }
      const override = Number(req.payout_override ?? 0);
      if (override > 0) {
        base = override;
      } else if (offer) {
        if (offer.payout_kind === "exact" && offer.payout_min != null) {
          base = Number(offer.payout_min);
        } else {
          const parsed = Number(String(offer.payout ?? "").replace(/[^0-9.]/g, ""));
          base = Number.isFinite(parsed) && parsed > 0
            ? parsed
            : Number(offer.payout_max ?? offer.payout_min ?? 0);
        }
      }

      if (base > 0 && req.user_id) {
        const { data: earnedRows } = await supabaseAdmin
          .from("conversions")
          .select("amount")
          .eq("user_id", req.user_id)
          .eq("status", "ok");
        const earned = (earnedRows ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
        const { data: pct } = await supabaseAdmin.rpc("level_bonus_pct", { _earned: earned });
        bonusPct = Number(pct ?? 0);
        bonusAmt = Math.round(base * bonusPct) / 100;
        credited = base + bonusAmt;

        const ins = await supabaseAdmin
          .from("conversions")
          .insert({
            user_id: req.user_id,
            offer_id: req.offer_id,
            offer_name: req.offer_name,
            amount: credited,
            status: "ok",
            base_amount: base,
            bonus_pct: bonusPct,
            bonus_amount: bonusAmt,
          })
          .select("id")
          .single();
        if (ins.error) throw new Error(ins.error.message);
        convId = ins.data.id as string;

        await supabaseAdmin.from("notifications").insert({
          user_id: req.user_id,
          kind: "payout",
          title: "Начисление за оффер",
          body:
            `${req.offer_name}: начислено ${credited} ₽` +
            (bonusPct > 0
              ? ` (база ${base} ₽ + бонус уровня ${bonusPct}% = ${bonusAmt} ₽)`
              : ""),
          amount: String(credited),
          status: "paid",
        });
      }

      const { error: uErr } = await supabaseAdmin
        .from("link_requests")
        .update({
          status: data.status,
          credited_at: new Date().toISOString(),
          credit_conversion_id: convId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      if (uErr) throw new Error(uErr.message);
    } else {
      const { error: uErr } = await supabaseAdmin
        .from("link_requests")
        .update({ status: data.status, updated_at: new Date().toISOString() })
        .eq("id", data.id);
      if (uErr) throw new Error(uErr.message);
    }

    return {
      ok: true as const,
      base_amount: base,
      bonus_pct: bonusPct,
      bonus_amount: bonusAmt,
      credited_amount: credited,
      conversion_id: convId,
    };
  });


export const getRecruiterStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const who = await assertRecruiterOrAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ids = who.admin ? null : await recruiterOfferIds(context);

    let convQ = supabaseAdmin
      .from("conversions")
      .select("offer_id, offer_name, amount, status, created_at")
      .eq("status", "ok")
      .limit(5000);
    if (!who.admin) convQ = convQ.in("offer_id", ids ?? []);
    const conv = await convQ;
    if (conv.error) throw new Error(conv.error.message);

    let reqQ = supabaseAdmin
      .from("link_requests")
      .select("offer_id, offer_name, status, created_at")
      .limit(5000);
    if (!who.admin) reqQ = reqQ.in("offer_id", ids ?? []);
    const reqs = await reqQ;
    if (reqs.error) throw new Error(reqs.error.message);

    return { conversions: conv.data ?? [], requests: reqs.data ?? [] };
  });

/* ---------------- admin: manage recruiters ---------------- */

export const adminGetRecruitersData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [roles, offers, offerAcc, catAcc] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role").eq("role", "recruiter"),
      supabaseAdmin.from("offers").select("id,name,category").order("name"),
      supabaseAdmin.from("recruiter_offer_access").select("*"),
      supabaseAdmin.from("recruiter_category_access").select("*"),
    ]);
    if (roles.error) throw new Error(roles.error.message);
    if (offers.error) throw new Error(offers.error.message);

    const ids = (roles.data ?? []).map((r) => r.user_id as string);
    let profiles: any[] = [];
    if (ids.length) {
      const p = await supabaseAdmin
        .from("profiles")
        .select("id,email,display_name,telegram,avatar_url,created_at")
        .in("id", ids);
      profiles = p.data ?? [];
    }
    const categories = Array.from(
      new Set(
        (offers.data ?? []).map((o) => (o.category as string) || "").filter((c) => c.length > 0),
      ),
    ).sort();

    return {
      recruiters: profiles,
      offers: offers.data ?? [],
      categories,
      offerAccess: offerAcc.data ?? [],
      categoryAccess: catAcc.data ?? [],
    };
  });

const setRoleSchema = z.object({ user_id: z.string().uuid(), enable: z.boolean() });

export const adminSetRecruiterRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => setRoleSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.enable) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.user_id, role: "recruiter" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", "recruiter");
      if (error) throw new Error(error.message);
      // Also clear scopes
      await supabaseAdmin
        .from("recruiter_offer_access")
        .delete()
        .eq("recruiter_id", data.user_id);
      await supabaseAdmin
        .from("recruiter_category_access")
        .delete()
        .eq("recruiter_id", data.user_id);
    }
    return { ok: true as const };
  });

const grantOfferSchema = z.object({ user_id: z.string().uuid(), offer_id: z.string().min(1) });
export const adminGrantRecruiterOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => grantOfferSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("recruiter_offer_access").upsert(
      {
        recruiter_id: data.user_id,
        offer_id: data.offer_id,
        created_by: context.userId,
      },
      { onConflict: "recruiter_id,offer_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const revokeSchema = z.object({ id: z.string().uuid() });
export const adminRevokeRecruiterOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => revokeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("recruiter_offer_access")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const grantCatSchema = z.object({
  user_id: z.string().uuid(),
  category: z.string().trim().min(1).max(120),
});
export const adminGrantRecruiterCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => grantCatSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("recruiter_category_access").upsert(
      {
        recruiter_id: data.user_id,
        category: data.category,
        created_by: context.userId,
      },
      { onConflict: "recruiter_id,category" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminRevokeRecruiterCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => revokeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("recruiter_category_access")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const searchSchema = z.object({ q: z.string().trim().max(200).optional() });
export const adminSearchUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => searchSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const q = (data.q ?? "").toLowerCase();
    let query = supabaseAdmin
      .from("profiles")
      .select("id,email,display_name,telegram,avatar_url")
      .order("created_at", { ascending: false })
      .limit(30);
    if (q) {
      query = query.or(`email.ilike.%${q}%,display_name.ilike.%${q}%,telegram.ilike.%${q}%`);
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
