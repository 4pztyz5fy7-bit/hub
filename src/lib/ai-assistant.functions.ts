import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(4000),
});

const AskSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(20),
});

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

async function callLovableAI(system: string, messages: z.infer<typeof MessageSchema>[]) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI недоступен: не задан LOVABLE_API_KEY");

  const res = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: system }, ...messages],
      temperature: 0.4,
    }),
  });

  if (res.status === 429) throw new Error("Слишком много запросов. Попробуйте через минуту.");
  if (res.status === 402) throw new Error("Кредиты AI Gateway исчерпаны. Пополните в Lovable Cloud.");
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() ?? "Ответ пуст.";
}

/* =============================== USER =============================== */
export type UserSnapshot = {
  totalEarned: number;
  paidOut: number;
  balance: number;
  conversionsCount: number;
  requestsCount: number;
  activeRequests: number;
  topOffers: Array<{ name: string; amount: number; count: number }>;
  last7Days: number;
  last30Days: number;
};

export const getUserSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserSnapshot> => {
    const { supabase, userId } = context;
    const now = Date.now();
    const d7 = new Date(now - 7 * 86400000).toISOString();
    const d30 = new Date(now - 30 * 86400000).toISOString();

    const [convRes, payRes, reqRes] = await Promise.all([
      supabase.from("conversions").select("amount,status,offer_name,created_at").eq("user_id", userId),
      supabase.from("payout_requests").select("amount,status").eq("user_id", userId),
      supabase.from("link_requests").select("id,status,offer_name").eq("user_id", userId),
    ]);

    const conv = convRes.data ?? [];
    const okConv = conv.filter((c) => c.status === "approved" || c.status === "ok");
    const totalEarned = okConv.reduce((s, r) => s + Number(r.amount ?? 0), 0);
    const paidOut = (payRes.data ?? [])
      .filter((r) => r.status === "paid")
      .reduce((s, r) => s + Number(r.amount ?? 0), 0);

    const last7Days = okConv
      .filter((c) => c.created_at && c.created_at >= d7)
      .reduce((s, r) => s + Number(r.amount ?? 0), 0);
    const last30Days = okConv
      .filter((c) => c.created_at && c.created_at >= d30)
      .reduce((s, r) => s + Number(r.amount ?? 0), 0);

    const byOffer = new Map<string, { amount: number; count: number }>();
    for (const c of okConv) {
      const cur = byOffer.get(c.offer_name) ?? { amount: 0, count: 0 };
      cur.amount += Number(c.amount ?? 0);
      cur.count += 1;
      byOffer.set(c.offer_name, cur);
    }
    const topOffers = Array.from(byOffer.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const requests = reqRes.data ?? [];
    return {
      totalEarned,
      paidOut,
      balance: totalEarned - paidOut,
      conversionsCount: okConv.length,
      requestsCount: requests.length,
      activeRequests: requests.filter((r) => r.status === "in_progress" || r.status === "completed").length,
      topOffers,
      last7Days,
      last30Days,
    };
  });

async function moderateQuery(text: string): Promise<{ flagged: boolean; category: "illegal" | "offtopic" | "ok"; reason: string }> {
  const sys =
    `Ты — модератор чата AI-наставника CPA-сети КВАНТ. Классифицируй ПОСЛЕДНИЙ вопрос пользователя. ` +
    `Верни СТРОГО JSON без пояснений в формате: {"category":"illegal|offtopic|ok","reason":"кратко на русском"}.\n` +
    `- "illegal" — если запрос про противозаконное (наркотики, оружие, взлом, мошенничество, обход законов, экстремизм, вред людям, кража данных и т.п.).\n` +
    `- "offtopic" — если запрос НЕ относится к арбитражу трафика, CPA, партнёрским сетям, офферам, лидам, рекламе, аналитике, доходу партнёра или платформе КВАНТ.\n` +
    `- "ok" — если это нормальный рабочий вопрос по теме.`;
  try {
    const raw = await callLovableAI(sys, [{ role: "user", content: text.slice(0, 2000) }]);
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return { flagged: false, category: "ok", reason: "" };
    const parsed = JSON.parse(m[0]) as { category?: string; reason?: string };
    const cat = parsed.category === "illegal" || parsed.category === "offtopic" ? parsed.category : "ok";
    return { flagged: cat !== "ok", category: cat as any, reason: parsed.reason ?? "" };
  } catch {
    return { flagged: false, category: "ok", reason: "" };
  }
}

async function reportToAdmins(userId: string, userLabel: string, question: string, category: string, reason: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: admins } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
  const rows = (admins ?? []).map((a) => ({
    user_id: a.user_id,
    kind: "moderation",
    title: category === "illegal" ? "⚠️ Подозрительный запрос к AI" : "Нецелевой запрос к AI",
    body: `Пользователь: ${userLabel} (${userId})\nКатегория: ${category}\nПричина: ${reason}\n\nВопрос: ${question.slice(0, 800)}`,
    amount: userId, // encode offender uuid for moderation actions
    status: category,
    read: false,
  }));
  if (rows.length) await supabaseAdmin.from("notifications").insert(rows);
}

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => AskSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const lastUser = [...data.messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      const mod = await moderateQuery(lastUser.content);
      if (mod.flagged) {
        const { data: prof } = await supabase.from("profiles").select("display_name,email").eq("id", userId).maybeSingle();
        const label = prof?.display_name || prof?.email || "Партнёр";
        await reportToAdmins(userId, label, lastUser.content, mod.category, mod.reason).catch(() => {});
        const answer =
          mod.category === "illegal"
            ? "Не могу помочь с этим запросом — он противоречит правилам платформы. Инцидент передан администрации."
            : "Я отвечаю только на вопросы по арбитражу, офферам, аналитике и работе на платформе КВАНТ. Запрос передан администратору.";
        return { answer, flagged: true, category: mod.category };
      }
    }

    const [snapRes, offersRes] = await Promise.all([
      supabase.from("conversions").select("amount,status,offer_name,created_at").eq("user_id", userId).limit(200),
      supabase.from("offers").select("name,category,payout,epc,cr,geo").eq("active", true).order("epc", { ascending: false }).limit(15),
    ]);

    const okConv = (snapRes.data ?? []).filter((c) => c.status === "approved" || c.status === "ok");
    const totalEarned = okConv.reduce((s, r) => s + Number(r.amount ?? 0), 0);
    const offersBrief = (offersRes.data ?? [])
      .map((o) => `• ${o.name} [${o.category ?? "—"}, ${o.geo ?? "—"}] — ${o.payout}, EPC ${o.epc}, CR ${o.cr}%`)
      .join("\n");

    const system =
      `Ты — персональный AI-наставник партнёра CPA-сети КВАНТ. ` +
      `Отвечай кратко, по делу, на русском. Давай конкретные шаги, а не общие фразы. ` +
      `Отвечай ТОЛЬКО на вопросы по арбитражу, CPA, офферам, аналитике и платформе КВАНТ. ` +
      `Опирайся ТОЛЬКО на данные ниже, ничего не выдумывай.\n\n` +
      `ВАЖНО: в КВАНТ офферы не нужно активировать и не нужно подавать заявку на их получение. ` +
      `Партнёр просто открывает карточку оффера, нажимает «Скопировать ссылку», и сразу получает уникальную ссылку, которую можно отправить клиенту или влить в трафик. ` +
      `Никогда не советуй пользователю «активировать оффер», «подать заявку на оффер» или ждать одобрения. ` +
      `Если пользователь спрашивает, как начать работать с оффером — отвечай: открой карточку оффера, скопируй ссылку и отправь её клиенту.\n\n` +
      `СТАТИСТИКА ПАРТНЁРА:\n` +
      `- Всего заработано: ${totalEarned} ₽\n` +
      `- Конверсий: ${okConv.length}\n\n` +
      `АКТУАЛЬНЫЕ ОФФЕРЫ (топ по EPC):\n${offersBrief || "нет активных офферов"}`;

    const answer = await callLovableAI(system, data.messages);
    return { answer, flagged: false };
  });

/* =============================== ADMIN ============================== */
export type AdminSnapshot = {
  users: number;
  admins: number;
  offersActive: number;
  offersTotal: number;
  revenueTotal: number;
  revenue7d: number;
  revenue30d: number;
  pendingPayouts: number;
  pendingPayoutsAmount: number;
  activeRequests: number;
  topPartners: Array<{ name: string; amount: number }>;
  topOffers: Array<{ name: string; amount: number; count: number }>;
};

async function assertAdmin(supabase: any) {
  const rpc = await supabase.rpc("is_admin");
  if (rpc.error || rpc.data !== true) throw new Error("Только для администраторов");
}

export const getAdminSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminSnapshot> => {
    const { supabase } = context;
    await assertAdmin(supabase);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = Date.now();
    const d7 = new Date(now - 7 * 86400000).toISOString();
    const d30 = new Date(now - 30 * 86400000).toISOString();

    const [profilesRes, rolesRes, offersRes, convRes, payRes, reqRes, profNamesRes] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("user_roles").select("user_id,role").eq("role", "admin"),
        supabaseAdmin.from("offers").select("id,active"),
        supabaseAdmin.from("conversions").select("amount,status,offer_name,user_id,created_at"),
        supabaseAdmin.from("payout_requests").select("amount,status"),
        supabaseAdmin.from("link_requests").select("id,status"),
        supabaseAdmin.from("profiles").select("id,display_name,email"),
      ]);

    const conv = convRes.data ?? [];
    const okConv = conv.filter((c) => c.status === "approved" || c.status === "ok");
    const revenueTotal = okConv.reduce((s, r) => s + Number(r.amount ?? 0), 0);
    const revenue7d = okConv.filter((c) => c.created_at && c.created_at >= d7).reduce((s, r) => s + Number(r.amount ?? 0), 0);
    const revenue30d = okConv.filter((c) => c.created_at && c.created_at >= d30).reduce((s, r) => s + Number(r.amount ?? 0), 0);

    const pending = (payRes.data ?? []).filter((r) => r.status === "pending" || r.status === "processing");
    const pendingPayoutsAmount = pending.reduce((s, r) => s + Number(r.amount ?? 0), 0);

    const nameMap = new Map<string, string>();
    for (const p of profNamesRes.data ?? []) {
      nameMap.set(p.id, p.display_name || p.email?.split("@")[0] || "Партнёр");
    }
    const byUser = new Map<string, number>();
    for (const c of okConv) byUser.set(c.user_id, (byUser.get(c.user_id) ?? 0) + Number(c.amount ?? 0));
    const topPartners = Array.from(byUser.entries())
      .map(([id, amount]) => ({ name: nameMap.get(id) ?? "Партнёр", amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const byOffer = new Map<string, { amount: number; count: number }>();
    for (const c of okConv) {
      const cur = byOffer.get(c.offer_name) ?? { amount: 0, count: 0 };
      cur.amount += Number(c.amount ?? 0);
      cur.count += 1;
      byOffer.set(c.offer_name, cur);
    }
    const topOffers = Array.from(byOffer.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const offers = offersRes.data ?? [];
    return {
      users: profilesRes.count ?? 0,
      admins: rolesRes.data?.length ?? 0,
      offersActive: offers.filter((o) => o.active).length,
      offersTotal: offers.length,
      revenueTotal,
      revenue7d,
      revenue30d,
      pendingPayouts: pending.length,
      pendingPayoutsAmount,
      activeRequests: (reqRes.data ?? []).filter((r) => r.status === "in_progress" || r.status === "completed").length,
      topPartners,
      topOffers,
    };
  });

export const askAdminAnalyst = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => AskSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await assertAdmin(supabase);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [convRes, payRes, offersRes, profRes] = await Promise.all([
      supabaseAdmin.from("conversions").select("amount,status,offer_name,user_id,created_at").order("created_at", { ascending: false }).limit(300),
      supabaseAdmin.from("payout_requests").select("amount,status,created_at").order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("offers").select("name,category,payout,epc,cr,active"),
      supabaseAdmin.from("profiles").select("id,display_name,email,created_at").order("created_at", { ascending: false }).limit(50),
    ]);

    const okConv = (convRes.data ?? []).filter((c) => c.status === "approved" || c.status === "ok");
    const revenue = okConv.reduce((s, r) => s + Number(r.amount ?? 0), 0);
    const pendingPay = (payRes.data ?? []).filter((p) => p.status === "pending" || p.status === "processing");
    const activeOffers = (offersRes.data ?? []).filter((o) => o.active);

    const brief =
      `Партнёров: ${profRes.data?.length ?? 0}. Конверсий: ${okConv.length}. ` +
      `Выручка: ${revenue} ₽. Активных офферов: ${activeOffers.length}. ` +
      `Выплат в очереди: ${pendingPay.length} на ${pendingPay.reduce((s, r) => s + Number(r.amount ?? 0), 0)} ₽.`;

    const topOffersLine = activeOffers
      .slice(0, 10)
      .map((o) => `${o.name}: EPC ${o.epc}, CR ${o.cr}%, ${o.payout}`)
      .join("; ");

    const system =
      `Ты — AI-аналитик CPA-сети КВАНТ. Отвечай на русском, кратко, конкретными цифрами и рекомендациями. ` +
      `Только на основе данных ниже:\n\nСВОДКА: ${brief}\n\nОФФЕРЫ: ${topOffersLine}`;

    const answer = await callLovableAI(system, data.messages);
    return { answer };
  });
