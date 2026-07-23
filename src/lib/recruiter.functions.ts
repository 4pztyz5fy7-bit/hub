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
    name: z.string().trim().min(1).max(200).optional(),
    tag: z.string().trim().max(80).nullable().optional(),
    category: z.string().trim().max(120).nullable().optional(),
    advertiser: z.string().trim().max(200).nullable().optional(),
    geo: z.string().trim().max(200).nullable().optional(),
    payout: z.string().trim().max(120).optional(),
    epc: z.number().int().nonnegative().optional(),
    cr: z.number().nonnegative().optional(),
    hold: z.string().trim().max(120).nullable().optional(),
    goal: z.string().trim().max(500).nullable().optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    requirements: z.string().trim().max(4000).nullable().optional(),
    allowed: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
    denied: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
    active: z.boolean().optional(),
    landing: z.string().trim().max(2000).nullable().optional(),
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
    await assertRecruiterOrAdmin(context);
    const { data: res, error } = await context.supabase.rpc("admin_set_link_request_status", {
      _request_id: data.id,
      _new_status: data.status,
      _payout_override: data.payout_override ?? null,
    });
    if (error) throw new Error(error.message);
    return res;
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
