import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const positionPayloadSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable(),
  permissions: z.array(z.string().trim().min(1).max(80)).max(50),
  is_leadership: z.boolean(),
});

const idSchema = z.object({ id: z.string().uuid() });
const memberSchema = z.object({ user_id: z.string().uuid(), position_id: z.string().uuid() });
const memberDeleteSchema = z.object({ user_id: z.string().uuid() });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const rpc = await context.supabase.rpc("is_admin");
  if (!rpc.error && rpc.data === true) return;

  const ownRole = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();

  if (ownRole.error || !ownRole.data) {
    throw new Error("Только главный администратор может управлять командой");
  }
}

export const getTeamManagementData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: positions, error: posError }, { data: members, error: memError }] =
      await Promise.all([
        supabaseAdmin.from("team_positions").select("*").order("sort_order"),
        supabaseAdmin.from("team_members").select("*").order("assigned_at", { ascending: false }),
      ]);

    if (posError) throw new Error(posError.message);
    if (memError) throw new Error(memError.message);

    const ids = Array.from(
      new Set(
        [
          ...(members ?? []).map((m) => m.user_id),
          ...(members ?? []).map((m) => m.assigned_by),
        ].filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    );

    let profiles: any[] = [];
    if (ids.length > 0) {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id,email,display_name,telegram,created_at")
        .in("id", ids);
      if (error) throw new Error(error.message);
      profiles = data ?? [];
    }

    return { positions: positions ?? [], members: members ?? [], profiles };
  });

export const saveTeamPosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => positionPayloadSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload = {
      code: data.code,
      name: data.name,
      description: data.description,
      permissions: data.permissions,
      is_leadership: data.is_leadership,
      updated_at: new Date().toISOString(),
    };

    const query = data.id
      ? supabaseAdmin.from("team_positions").update(payload).eq("id", data.id)
      : supabaseAdmin.from("team_positions").insert(payload);

    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteTeamPosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: position, error: readError } = await supabaseAdmin
      .from("team_positions")
      .select("is_system")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (position?.is_system) throw new Error("Системную должность нельзя удалить");

    const { error } = await supabaseAdmin.from("team_positions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const assignTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => memberSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("team_members").upsert(
      {
        user_id: data.user_id,
        position_id: data.position_id,
        assigned_by: context.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => memberDeleteSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("team_members").delete().eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });