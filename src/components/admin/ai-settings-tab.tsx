import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Save, Loader2, AlertCircle, Check, Bot } from "lucide-react";
import { translateError } from "@/lib/errors-ru";
import { getAiSettings, updateAiSettings, type AiSettings } from "@/lib/ai-settings.functions";

export function AiSettingsTab() {
  const loadFn = useServerFn(getAiSettings);
  const saveFn = useServerFn(updateAiSettings);

  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setSettings(await loadFn({}));
    } catch (e) {
      setError(translateError(e, "Не удалось загрузить настройки"));
    }
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const update = <K extends keyof AiSettings>(key: K, value: AiSettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  };

  const save = async () => {
    if (!settings || saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveFn({ data: settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(translateError(e, "Не удалось сохранить"));
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        <p className="mt-2 text-xs text-muted-foreground">Загрузка настроек…</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
        <AlertCircle className="mx-auto size-5 text-destructive" />
        <p className="mt-2">Не удалось загрузить настройки AI.</p>
        <button onClick={() => void load()} className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">Повторить</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-4">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
            <Bot className="size-5" />
          </div>
          <div>
            <div className="text-sm font-bold">Настройки генеративного AI</div>
            <div className="text-[11px] text-muted-foreground">Включите AI и выберите провайдера, модель и ключи</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-[11px] text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold">AI-ассистент включён</div>
            <div className="text-[11px] text-muted-foreground">Пользователи и админы смогут использовать чат с AI</div>
          </div>
          <button
            onClick={() => update("enabled", !settings.enabled)}
            className={`relative h-6 w-11 rounded-full transition ${settings.enabled ? "bg-primary" : "bg-muted"}`}
            aria-label="Переключить AI"
          >
            <span className={`absolute top-0.5 size-5 rounded-full bg-background shadow transition ${settings.enabled ? "left-5" : "left-0.5"}`} />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Провайдер">
            <select
              value={settings.provider}
              onChange={(e) => update("provider", e.target.value as "gemini" | "lovable")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
            >
              <option value="gemini">Google Gemini (прямой API)</option>
              <option value="lovable">Lovable AI Gateway</option>
            </select>
          </Field>

          <Field label="Модель">
            <input
              value={settings.provider === "gemini" ? settings.gemini_model : settings.lovable_model}
              onChange={(e) => update(settings.provider === "gemini" ? "gemini_model" : "lovable_model", e.target.value)}
              placeholder={settings.provider === "gemini" ? "gemini-2.5-flash" : "google/gemini-2.5-flash"}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
            />
          </Field>

          <Field label="API-ключ">
            <input
              type="password"
              value={settings.provider === "gemini" ? (settings.gemini_api_key ?? "") : (settings.lovable_api_key ?? "")}
              onChange={(e) => update(settings.provider === "gemini" ? "gemini_api_key" : "lovable_api_key", e.target.value || null)}
              placeholder={settings.provider === "gemini" ? "AIza..." : "lovable_..."}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
            />
            <p className="text-[10px] text-muted-foreground">
              {settings.provider === "gemini"
                ? "Ключ из Google AI Studio. На VPS рекомендуется прямой Gemini, т.к. не требует LOVABLE_API_KEY."
                : "Lovable API Key для доступа к моделям через Lovable AI Gateway."}
            </p>
          </Field>

          <Field label="Модерация запросов">
            <div className="flex items-center gap-2">
              <input
                id="moderation"
                type="checkbox"
                checked={settings.moderation_enabled}
                onChange={(e) => update("moderation_enabled", e.target.checked)}
                className="size-4 rounded border-border"
              />
              <label htmlFor="moderation" className="text-xs">Проверять запросы на противозаконное / оффтопик</label>
            </div>
          </Field>

          <Field label="Лимит сообщений пользователя">
            <input
              type="number"
              min={1}
              max={1000}
              value={settings.user_prompt_limit}
              onChange={(e) => update("user_prompt_limit", Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
            />
          </Field>

          <Field label="Лимит сообщений администратора">
            <input
              type="number"
              min={1}
              max={1000}
              value={settings.admin_prompt_limit}
              onChange={(e) => update("admin_prompt_limit", Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
            />
          </Field>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Сохранить
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600">
              <Check className="size-3.5" /> Сохранено
            </span>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 size-4 text-primary" />
          <div>
            <div className="text-sm font-bold">Как задать ключ на VPS</div>
            <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
              Отредактируй <code className="rounded bg-muted px-1 py-0.5">/var/www/hub/.env</code> (или папку, где лежит проект):
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-2 text-[10px] leading-relaxed">
{settings.provider === "gemini"
  ? `GEMINI_API_KEY=AIza...
GEMINI_MODEL=${settings.gemini_model}`
  : `LOVABLE_API_KEY=lovable_...
LOVABLE_MODEL=${settings.lovable_model}`}
            </pre>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Затем перезапусти процесс: <code className="rounded bg-muted px-1 py-0.5">pm2 restart hub --update-env</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
