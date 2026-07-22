import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type AiSettings = {
  enabled: boolean;
  provider: "gemini" | "lovable";
  gemini_api_key: string | null;
  gemini_model: string;
  lovable_api_key: string | null;
  lovable_model: string;
  moderation_enabled: boolean;
  user_prompt_limit: number;
  admin_prompt_limit: number;
};

const SettingsSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(["gemini", "lovable"]),
  gemini_api_key: z.string().max(255).nullable(),
  gemini_model: z.string().min(1).max(100),
  lovable_api_key: z.string().max(255).nullable(),
  lovable_model: z.string().min(1).max(100),
  moderation_enabled: z.boolean(),
  user_prompt_limit: z.number().int().min(1).max(1000),
  admin_prompt_limit: z.number().int().min(1).max(1000),
});

async function assertAdmin(supabase: any) {
  const rpc = await supabase.rpc("is_admin");
  if (rpc.error || rpc.data !== true) throw new Error("Только для администраторов");
}

export const getAiSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AiSettings> => {
    const { supabase, userId } = context;
    await assertAdmin(supabase);

    const { data, error } = await supabase
      .from("ai_settings")
      .select("enabled, provider, gemini_api_key, gemini_model, lovable_api_key, lovable_model, moderation_enabled, user_prompt_limit, admin_prompt_limit")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("[ai-settings] get error:", error.message);
      throw new Error("Не удалось загрузить настройки AI");
    }

    if (!data) {
      return {
        enabled: false,
        provider: "gemini",
        gemini_api_key: null,
        gemini_model: "gemini-2.5-flash",
        lovable_api_key: null,
        lovable_model: "google/gemini-2.5-flash",
        moderation_enabled: true,
        user_prompt_limit: 20,
        admin_prompt_limit: 50,
      };
    }

    return {
      enabled: data.enabled,
      provider: data.provider as "gemini" | "lovable",
      gemini_api_key: data.gemini_api_key,
      gemini_model: data.gemini_model,
      lovable_api_key: data.lovable_api_key,
      lovable_model: data.lovable_model,
      moderation_enabled: data.moderation_enabled,
      user_prompt_limit: data.user_prompt_limit,
      admin_prompt_limit: data.admin_prompt_limit,
    };
  });

export const updateAiSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SettingsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase);

    const { error } = await supabase
      .from("ai_settings")
      .upsert({
        id: 1,
        ...data,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      });

    if (error) {
      console.error("[ai-settings] update error:", error.message);
      throw new Error("Не удалось сохранить настройки AI");
    }

    return { ok: true };
  });

export const getAiSettingsPublic = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Pick<AiSettings, "enabled" | "provider" | "user_prompt_limit" | "admin_prompt_limit">> => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("ai_settings")
      .select("enabled, provider, user_prompt_limit, admin_prompt_limit")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) {
      return { enabled: false, provider: "gemini", user_prompt_limit: 20, admin_prompt_limit: 50 };
    }

    return {
      enabled: data.enabled,
      provider: data.provider as "gemini" | "lovable",
      user_prompt_limit: data.user_prompt_limit,
      admin_prompt_limit: data.admin_prompt_limit,
    };
  });
