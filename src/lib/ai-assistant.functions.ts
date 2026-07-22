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

function readProviderKey(value: string | undefined) {
  const key = (value ?? "").trim().replace(/^['\"]|['\"]$/g, "");
  if (!key || key === "undefined" || key === "null" || key.includes("your_api_key")) return undefined;
  return key;
}

type ResolvedAiSettings = {
  enabled: boolean;
  provider: "gemini" | "lovable";
  gemini_api_key: string | undefined;
  gemini_model: string;
  lovable_api_key: string | undefined;
  lovable_model: string;
  moderation_enabled: boolean;
  user_prompt_limit: number;
  admin_prompt_limit: number;
};

async function getResolvedAiSettings(supabaseAdmin: any): Promise<ResolvedAiSettings> {
  const { data, error } = await supabaseAdmin
    .from("ai_settings")
    .select("enabled, provider, gemini_api_key, gemini_model, lovable_api_key, lovable_model, moderation_enabled, user_prompt_limit, admin_prompt_limit")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("[AI] failed to load ai_settings:", error.message);
  }

  const enabled = data?.enabled ?? false;
  const provider = (data?.provider as "gemini" | "lovable") ?? "gemini";

  return {
    enabled,
    provider,
    gemini_api_key: readProviderKey(data?.gemini_api_key ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY),
    gemini_model: data?.gemini_model ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    lovable_api_key: readProviderKey(data?.lovable_api_key ?? process.env.LOVABLE_API_KEY),
    lovable_model: data?.lovable_model ?? process.env.LOVABLE_MODEL ?? "google/gemini-2.5-flash",
    moderation_enabled: data?.moderation_enabled ?? true,
    user_prompt_limit: data?.user_prompt_limit ?? 20,
    admin_prompt_limit: data?.admin_prompt_limit ?? 50,
  };
}

function toGeminiContents(system: string, messages: z.infer<typeof MessageSchema>[]) {
  const systemText = [system, ...messages.filter((m) => m.role === "system").map((m) => m.content)].join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  return {
    systemInstruction: { parts: [{ text: systemText }] },
    contents: contents.length ? contents : [{ role: "user", parts: [{ text: "Продолжи." }] }],
    generationConfig: { temperature: 0.4 },
  };
}

async function callLovableAI(system: string, messages: z.infer<typeof MessageSchema>[], settings?: ResolvedAiSettings) {
  const resolved = settings ?? {
    enabled: true,
    provider: "gemini" as const,
    gemini_api_key: readProviderKey(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    gemini_model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    lovable_api_key: readProviderKey(process.env.LOVABLE_API_KEY),
    lovable_model: process.env.LOVABLE_MODEL ?? "google/gemini-2.5-flash",
    moderation_enabled: true,
    user_prompt_limit: 20,
    admin_prompt_limit: 50,
  };

  if (!resolved.enabled) {
    throw new Error("AI-ассистент временно отключён администратором.");
  }

  const useGemini = resolved.provider === "gemini";
  const apiKey = useGemini ? resolved.gemini_api_key : resolved.lovable_api_key;

  if (!apiKey) {
    console.error("[AI] API-ключ не задан для провайдера", resolved.provider);
    throw new Error("AI недоступен: сервер не настроен. Обратитесь к администратору.");
  }

  const provider = useGemini ? "Gemini" : "Lovable AI";
  const model = useGemini ? resolved.gemini_model : resolved.lovable_model;
  const url = useGemini
    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
    : LOVABLE_AI_URL;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!useGemini) {
    headers["Lovable-API-Key"] = apiKey;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        ...(useGemini
          ? toGeminiContents(system, messages)
          : { messages: [{ role: "system", content: system }, ...messages] }),
        temperature: 0.4,
      }),
    });
  } catch (e) {
    console.error("[AI] Сетевая ошибка при обращении к модели:", e);
    throw new Error("AI временно недоступен: сетевая ошибка.");
  }

  if (res.status === 429) throw new Error("Слишком много запросов. Попробуйте через минуту.");
  if (res.status === 402) throw new Error("Кредиты AI исчерпаны. Обратитесь к администратору.");
  if (res.status === 401 || res.status === 403) {
    console.error(`[AI] ${provider} отклонил ключ:`, res.status, await res.text().catch(() => ""));
    throw new Error(`AI недоступен: неверный ключ ${provider}. Обратитесь к администратору.`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[AI] Ошибка ${provider}:`, res.status, body.slice(0, 500));
    throw new Error(`AI error ${res.status}`);
  }

  if (useGemini) {
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() || "Ответ пуст.";
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
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

async function moderateQuery(text: string, settings: ResolvedAiSettings): Promise<{ flagged: boolean; category: "illegal" | "offtopic" | "ok"; reason: string }> {
  if (!settings.enabled) return { flagged: false, category: "ok", reason: "" };

  const sys =
    `Ты — лёгкий модератор чата AI-наставника CPA-сети КВАНТ. Классифицируй ПОСЛЕДНИЙ вопрос пользователя. ` +
    `Верни СТРОГО JSON без пояснений в формате: {"category":"illegal|offtopic|ok","reason":"кратко на русском"}.\n` +
    `- "illegal" — только если запрос про противозаконное (наркотики, оружие, взлом, мошенничество, обход законов, экстремизм, вред людям, кража данных, шантаж, терроризм и т.п.).\n` +
    `- "offtopic" — если запрос явно НЕ связан с арбитражем трафика, CPA, маркетингом, рекламой, трафиком, лидами, клиентами, заработком онлайн, офферами, аналитикой, креативами, источниками трафика, воронкой продаж, платформой КВАНТ или бизнесом в целом.\n` +
    `- "ok" — всё остальное: в том числе "как привлечь человека/клиента", "где взять трафик", "как настроить рекламу", "какой оффер лучше", "как поднять CR", "как масштабироваться", "какие креативы использовать", вопросы по выплатам, конверсиям, статистике и работе в КВАНТ.`;
  try {
    const raw = await callLovableAI(sys, [{ role: "user", content: text.slice(0, 2000) }], settings);
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return { flagged: false, category: "ok", reason: "" };
    const parsed = JSON.parse(m[0]) as { category?: string; reason?: string };
    const cat = parsed.category === "illegal" || parsed.category === "offtopic" ? parsed.category : "ok";
    // Сообщаем админам только о явно противозаконных запросах; оффтопик просто отклоняем.
    return { flagged: cat === "illegal", category: cat as any, reason: parsed.reason ?? "" };
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
    actor_id: userId,
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const settings = await getResolvedAiSettings(supabaseAdmin);

    if (!settings.enabled) {
      return { answer: "AI-ассистент временно отключён администратором.", flagged: false };
    }

    const userMsgCount = data.messages.filter((m) => m.role === "user").length;
    if (userMsgCount > settings.user_prompt_limit) {
      return { answer: `Достигнут лимит сообщений (${settings.user_prompt_limit}). Попробуй позже.`, flagged: false };
    }

    const lastUser = [...data.messages].reverse().find((m) => m.role === "user");
    if (lastUser && settings.moderation_enabled) {
      const mod = await moderateQuery(lastUser.content, settings);
      if (mod.category === "illegal") {
        const { data: prof } = await supabase.from("profiles").select("display_name,email").eq("id", userId).maybeSingle();
        const label = prof?.display_name || prof?.email || "Партнёр";
        await reportToAdmins(userId, label, lastUser.content, mod.category, mod.reason).catch(() => {});
        return {
          answer: "Не могу помочь с этим запросом — он противоречит правилам платформы. Инцидент передан администрации.",
          flagged: true,
          category: mod.category,
        };
      }
      if (mod.category === "offtopic") {
        return {
          answer: "Я специализируюсь на арбитраже трафика, CPA, маркетинге и работе с платформой КВАНТ. Задай вопрос по этой теме — с удовольствием помогу.",
          flagged: false,
          category: mod.category,
        };
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
      `Ты — AI-наставник партнёров CPA-сети КВАНТ. ` +
      `Общайся по-человечески, живо и дружелюбно, на русском, но без панибратства и без личной привязанности к собеседнику: ты одинаково ровно и нейтрально относишься ко всем пользователям, никого не выделяешь, не хвалишь без повода и не заигрываешь. ` +
      `Не используй Markdown-разметку: никаких звёздочек (**), подчёркиваний, решёток и обратных кавычек для оформления. Пиши обычным текстом, для списков — тире или цифры с точкой, для акцентов — просто слова, а не символы. ` +
      `Отвечай развёрнуто настолько, насколько нужно для пользы: если вопрос простой — коротко, если сложный — по шагам, с конкретикой, цифрами и примерами. Проактивно предлагай следующий шаг, гипотезу, что проверить или на что обратить внимание, но без воды и общих фраз. ` +
      `Темы: арбитраж трафика, CPA, партнёрский маркетинг, платформа КВАНТ — выбор оффера, источники трафика, креативы, таргетинг, воронка, аналитика, масштабирование, рост CR и EPC, работа с клиентами, выплаты, статистика. ` +
      `Опирайся только на данные ниже, ничего не выдумывай; если данных не хватает — прямо скажи об этом и уточни, что нужно.\n\n` +
      `ВАЖНО про офферы в КВАНТ: активировать оффер и подавать заявку не нужно. Партнёр открывает карточку оффера, жмёт «Скопировать ссылку» и сразу получает уникальную ссылку для клиента или трафика. Никогда не советуй «активировать оффер», «подать заявку» или ждать одобрения. На вопрос «как начать работать с оффером» отвечай: открой карточку, скопируй ссылку, отправь клиенту.\n\n` +
      `СТАТИСТИКА ПАРТНЁРА:\n` +
      `- Всего заработано: ${totalEarned} ₽\n` +
      `- Конверсий: ${okConv.length}\n\n` +
      `АКТУАЛЬНЫЕ ОФФЕРЫ (топ по EPC):\n${offersBrief || "нет активных офферов"}`;

    const answer = await callLovableAI(system, data.messages, settings);
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
      `Ты — AI-аналитик CPA-сети КВАНТ. Общайся живо и по-деловому, на русском, ровно и нейтрально ко всем — без личных симпатий и без панибратства. ` +
      `Пиши обычным текстом без Markdown: без звёздочек, решёток, подчёркиваний и обратных кавычек. Для списков используй тире или нумерацию. ` +
      `Отвечай ровно настолько подробно, насколько нужно: короткие вопросы — коротко, разбор ситуации — по шагам, с цифрами, выводами и следующим действием. Проактивно указывай на риски, аномалии и точки роста. ` +
      `Только на основе данных ниже; если данных не хватает — прямо скажи об этом.\n\nСВОДКА: ${brief}\n\nОФФЕРЫ: ${topOffersLine}`;

    const answer = await callLovableAI(system, data.messages);
    return { answer };
  });
