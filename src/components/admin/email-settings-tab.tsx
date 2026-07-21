import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Mail, Save, Send, Loader2, Info } from "lucide-react";
import {
import { translateError } from "@/lib/errors-ru";
  getEmailSettings,
  saveEmailSettings,
  sendTestAppEmail,
  type EmailSettingsInput,
} from "@/lib/app-email.functions";

const EMPTY: EmailSettingsInput = {
  enabled: false,
  smtp_host: "",
  smtp_port: 587,
  smtp_secure: false,
  smtp_user: "",
  smtp_pass: "",
  from_email: "",
  from_name: "КВАНТ",
  reply_to: "",
};

const PRESETS: Record<string, Partial<EmailSettingsInput>> = {
  "Yandex 360": { smtp_host: "smtp.yandex.ru", smtp_port: 465, smtp_secure: true },
  "Mail.ru": { smtp_host: "smtp.mail.ru", smtp_port: 465, smtp_secure: true },
  "Gmail": { smtp_host: "smtp.gmail.com", smtp_port: 465, smtp_secure: true },
  "reg.ru": { smtp_host: "smtp.reg.ru", smtp_port: 465, smtp_secure: true },
  "SendGrid": { smtp_host: "smtp.sendgrid.net", smtp_port: 587, smtp_secure: false, smtp_user: "apikey" },
};

export function AdminEmailSettingsTab() {
  const [s, setS] = useState<EmailSettingsInput>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [testTo, setTestTo] = useState("");
  const load = useServerFn(getEmailSettings);
  const save = useServerFn(saveEmailSettings);
  const sendTest = useServerFn(sendTestAppEmail);

  useEffect(() => {
    (async () => {
      try {
        const row = await load();
        if (row) setS({ ...EMPTY, ...row });
      } catch (e: unknown) {
        toast.error(translateError(e, "Ошибка загрузки"));
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const upd = <K extends keyof EmailSettingsInput>(k: K, v: EmailSettingsInput[K]) => setS((p) => ({ ...p, [k]: v }));

  const onSave = async () => {
    setSaving(true);
    try {
      await save({ data: s });
      toast.success("Настройки сохранены");
    } catch (e: unknown) {
      toast.error(translateError(e, "Не удалось сохранить"));
    } finally {
      setSaving(false);
    }
  };

  const onTest = async () => {
    if (!testTo) return toast.error("Укажите email для теста");
    setSending(true);
    try {
      await save({ data: s });
      await sendTest({ data: { to: testTo } });
      toast.success("Тестовое письмо отправлено");
    } catch (e: unknown) {
      toast.error(translateError(e, "Ошибка отправки"));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Загрузка…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Mail className="size-4 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wider">SMTP для писем приложения</h2>
        </div>
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <div>
            Эти настройки используются для писем от самого приложения (уведомления, ответы поддержки и т.п.).
            Письма подтверждения регистрации, восстановления пароля и magic-link отправляет Supabase Auth —
            настройте свой SMTP в панели Supabase: <b>Project Settings → Auth → SMTP Settings</b>.
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Готовые пресеты:</span>
          {Object.entries(PRESETS).map(([name, preset]) => (
            <button
              key={name}
              type="button"
              onClick={() => setS((p) => ({ ...p, ...preset }))}
              className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] hover:bg-accent"
            >
              {name}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="SMTP host" value={s.smtp_host} onChange={(v) => upd("smtp_host", v)} placeholder="smtp.yandex.ru" />
          <Field label="Порт" type="number" value={String(s.smtp_port)} onChange={(v) => upd("smtp_port", parseInt(v || "0", 10) || 0)} placeholder="587" />
          <Field label="Логин (SMTP user)" value={s.smtp_user} onChange={(v) => upd("smtp_user", v)} placeholder="noreply@kvantm.tech" />
          <Field label="Пароль / API-ключ" type="password" value={s.smtp_pass} onChange={(v) => upd("smtp_pass", v)} placeholder="••••••••" />
          <Field label="From email (отправитель)" value={s.from_email} onChange={(v) => upd("from_email", v)} placeholder="noreply@kvantm.tech" />
          <Field label="From name (имя)" value={s.from_name} onChange={(v) => upd("from_name", v)} placeholder="КВАНТ" />
          <Field label="Reply-To (необязательно)" value={s.reply_to} onChange={(v) => upd("reply_to", v)} placeholder="support@kvantm.tech" />
          <div className="flex items-end gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={s.smtp_secure} onChange={(e) => upd("smtp_secure", e.target.checked)} />
              SSL/TLS (порт 465)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={s.enabled} onChange={(e) => upd("enabled", e.target.checked)} />
              Включить отправку
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={onSave} disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Сохранить
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider">Тестовое письмо</h3>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="you@example.com"
            className="min-w-[220px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button onClick={onTest} disabled={sending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold hover:bg-accent disabled:opacity-50">
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Отправить тест
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Перед отправкой настройки будут сохранены автоматически.</p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        autoComplete="off"
      />
    </label>
  );
}
