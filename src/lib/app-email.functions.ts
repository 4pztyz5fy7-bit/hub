import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const settingsSchema = z.object({
  enabled: z.boolean(),
  smtp_host: z.string().trim().max(255),
  smtp_port: z.number().int().min(1).max(65535),
  smtp_secure: z.boolean(),
  smtp_user: z.string().trim().max(255),
  smtp_pass: z.string().max(1024),
  from_email: z.string().trim().max(255),
  from_name: z.string().trim().max(120),
  reply_to: z.string().trim().max(255),
});

export type EmailSettingsInput = z.infer<typeof settingsSchema>;

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("forbidden");
}

export const getEmailSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("email_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  });

export const saveEmailSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: EmailSettingsInput) => settingsSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = { ...data, id: 1, updated_at: new Date().toISOString(), updated_by: context.userId };
    const { error } = await context.supabase.from("email_settings").upsert(payload);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

async function buildTransport(settings: EmailSettingsInput) {
  const nodemailer = await import("nodemailer");
  return nodemailer.createTransport({
    host: settings.smtp_host,
    port: settings.smtp_port,
    secure: settings.smtp_secure,
    auth: settings.smtp_user ? { user: settings.smtp_user, pass: settings.smtp_pass } : undefined,
  });
}

function fromHeader(s: Pick<EmailSettingsInput, "from_name" | "from_email">) {
  return s.from_name ? `${s.from_name} <${s.from_email}>` : s.from_email;
}

export const sendTestAppEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { to: string }) => z.object({ to: z.string().email() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: s, error } = await context.supabase.from("email_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw new Error(error.message);
    if (!s || !s.smtp_host || !s.from_email) throw new Error("SMTP не настроен");
    const parsed = settingsSchema.parse(s);
    const transport = await buildTransport(parsed);
    const info = await transport.sendMail({
      from: fromHeader(parsed),
      to: data.to,
      replyTo: parsed.reply_to || undefined,
      subject: "КВАНТ — тестовое письмо",
      text: "Это тестовое письмо от КВАНТ. Если вы его получили — SMTP настроен корректно.",
      html: `<div style="font-family:Arial,sans-serif;padding:20px">
        <h2 style="margin:0 0 12px">КВАНТ</h2>
        <p>Это тестовое письмо. SMTP настроен корректно.</p>
      </div>`,
    });
    return { ok: true as const, messageId: info.messageId };
  });

export const sendAppEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { to: string; subject: string; html?: string; text?: string }) =>
    z.object({
      to: z.string().email(),
      subject: z.string().min(1).max(255),
      html: z.string().max(200_000).optional(),
      text: z.string().max(200_000).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: s, error } = await context.supabase.from("email_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw new Error(error.message);
    if (!s?.enabled) throw new Error("Отправка писем отключена");
    if (!s.smtp_host || !s.from_email) throw new Error("SMTP не настроен");
    const parsed = settingsSchema.parse(s);
    const transport = await buildTransport(parsed);
    const info = await transport.sendMail({
      from: fromHeader(parsed),
      to: data.to,
      replyTo: parsed.reply_to || undefined,
      subject: data.subject,
      text: data.text,
      html: data.html,
    });
    return { ok: true as const, messageId: info.messageId };
  });
