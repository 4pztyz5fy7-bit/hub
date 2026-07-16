import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  User as UserIcon,
  Mail,
  Phone,
  Send,
  MapPin,
  Globe,
  Image as ImageIcon,
  Save,
  Check,
  Loader2,
  Bell,
  Moon,
  Sun,
  Languages,
  Lock,
  KeyRound,
  Shield,
  LogOut,
  Copy,
  Calendar,
  Sparkles,
  Eye,
  EyeOff,
  BadgeCheck,
} from "lucide-react";

export type Prefs = {
  notify_email: boolean;
  notify_push: boolean;
  notify_marketing: boolean;
  notify_payouts: boolean;
  notify_offers: boolean;
  theme: "system" | "dark" | "light";
  language: "ru" | "en";
  compact: boolean;
  showBalance: boolean;
};

type ProfileData = {
  id: string;
  email: string | null;
  display_name: string | null;
  telegram: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  city: string | null;
  website: string | null;
  settings: Partial<Prefs> | null;
  created_at: string;
};

const DEFAULT_PREFS: Prefs = {
  notify_email: true,
  notify_push: true,
  notify_marketing: false,
  notify_payouts: true,
  notify_offers: true,
  theme: "dark",
  language: "ru",
  compact: false,
  showBalance: true,
};

export function ProfileTab({
  userId,
  isAdmin,
  onSignOut,
  prefs: prefsProp,
  onPrefsChange,
  onProfileChange,
}: {
  userId: string | null;
  isAdmin: boolean;
  onSignOut: () => void;
  prefs?: Prefs;
  onPrefsChange?: (p: Prefs) => void;
  onProfileChange?: (name: string, avatar: string | null) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [p, setP] = useState<ProfileData | null>(null);
  const [draft, setDraft] = useState<Partial<ProfileData>>({});
  const [prefs, setPrefsLocal] = useState<Prefs>(prefsProp ?? DEFAULT_PREFS);
  const setPrefs = (updater: Prefs | ((s: Prefs) => Prefs)) => {
    setPrefsLocal((s) => {
      const next = typeof updater === "function" ? (updater as (s: Prefs) => Prefs)(s) : updater;
      onPrefsChange?.(next);
      return next;
    });
  };
  // Keep local in sync if parent updates prefs externally
  useEffect(() => {
    if (prefsProp) setPrefsLocal(prefsProp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsProp]);

  const [pwOpen, setPwOpen] = useState(false);
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwShow, setPwShow] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!userId) return;
      const { data } = await supabase
        .from("profiles")
        .select("id,email,display_name,telegram,avatar_url,phone,bio,city,website,settings,created_at")
        .eq("id", userId)
        .maybeSingle();
      if (cancel) return;
      if (data) {
        setP(data as ProfileData);
        setDraft(data as ProfileData);
        setPrefsLocal({ ...DEFAULT_PREFS, ...((data as any).settings ?? {}) });
      }
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [userId]);

  const dirty = useMemo(() => {
    if (!p) return false;
    const keys: (keyof ProfileData)[] = ["display_name", "telegram", "avatar_url", "phone", "bio", "city", "website"];
    return keys.some((k) => (draft[k] ?? "") !== (p[k] ?? "")) ||
      JSON.stringify(prefs) !== JSON.stringify({ ...DEFAULT_PREFS, ...(p.settings ?? {}) });
  }, [p, draft, prefs]);

  const initials = useMemo(() => {
    const n = (draft.display_name || p?.display_name || p?.email || "?").trim();
    return n.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "?";
  }, [draft.display_name, p]);

  const save = async () => {
    if (!userId || !dirty) return;
    setSaving(true);
    setErr(null);
    const payload = {
      display_name: (draft.display_name ?? "").trim() || null,
      telegram: (draft.telegram ?? "").trim() || null,
      avatar_url: (draft.avatar_url ?? "").trim() || null,
      phone: (draft.phone ?? "").trim() || null,
      bio: (draft.bio ?? "").trim() || null,
      city: (draft.city ?? "").trim() || null,
      website: (draft.website ?? "").trim() || null,
      settings: prefs as any,
    };
    const { error } = await supabase.from("profiles").update(payload as any).eq("id", userId);
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setP((prev) => (prev ? { ...prev, ...(payload as any) } : prev));
    onProfileChange?.(payload.display_name ?? "", payload.avatar_url);
    onPrefsChange?.(prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const reset = () => {
    if (!p) return;
    setDraft(p);
    setPrefsLocal({ ...DEFAULT_PREFS, ...(p.settings ?? {}) });
  };

  const copy = async (v: string | null) => {
    if (!v) return;
    try { await navigator.clipboard.writeText(v); } catch { /* ignore */ }
  };

  const changePassword = async () => {
    setPwMsg(null);
    if (pwNew.length < 6) { setPwMsg("Минимум 6 символов"); return; }
    if (pwNew !== pwConfirm) { setPwMsg("Пароли не совпадают"); return; }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwNew });
    setPwSaving(false);
    if (error) { setPwMsg(error.message); return; }
    setPwMsg("Пароль обновлён");
    setPwNew(""); setPwConfirm("");
    setTimeout(() => { setPwOpen(false); setPwMsg(null); }, 1400);
  };

  const created = p?.created_at ? new Date(p.created_at).toLocaleDateString("ru-RU", {
    day: "2-digit", month: "long", year: "numeric",
  }) : "—";

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header card */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-4">
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-primary/10 to-transparent" />
        <div className="relative flex items-center gap-3">
          <div className="grid size-16 place-items-center rounded-2xl border border-border bg-secondary text-lg font-bold">
            {draft.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.avatar_url} alt="" className="size-full rounded-2xl object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
            ) : (
              <span className="font-mono">{initials}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-base font-bold">
                {draft.display_name || p?.display_name || "Без имени"}
              </p>
              {isAdmin && <BadgeCheck className="size-4 shrink-0 text-primary" />}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{p?.email ?? "—"}</p>
            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
              <Calendar className="size-3" />
              <span>С нами с {created}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Account info */}
      <Card title="Аккаунт" icon={Sparkles}>
        <InfoRow label="ID" value={userId ?? "—"} mono onCopy={() => copy(userId)} />
        <InfoRow label="E-mail" value={p?.email ?? "—"} onCopy={() => copy(p?.email ?? null)} />
        <InfoRow label="Роль" value={isAdmin ? "Администратор" : "Партнёр"} />
      </Card>

      {/* Personal info edit */}
      <Card title="Личные данные" icon={UserIcon}>
        <Field
          label="Имя"
          value={draft.display_name ?? ""}
          onChange={(v) => setDraft((d) => ({ ...d, display_name: v }))}
          placeholder="Как к вам обращаться"
          icon={UserIcon}
        />
        <Field
          label="Телефон"
          value={draft.phone ?? ""}
          onChange={(v) => setDraft((d) => ({ ...d, phone: v }))}
          placeholder="+7 900 000-00-00"
          icon={Phone}
          inputMode="tel"
        />
        <Field
          label="Telegram"
          value={draft.telegram ?? ""}
          onChange={(v) => setDraft((d) => ({ ...d, telegram: v.replace(/^@?/, "@") }))}
          placeholder="@username"
          icon={Send}
        />
        <Field
          label="Город"
          value={draft.city ?? ""}
          onChange={(v) => setDraft((d) => ({ ...d, city: v }))}
          placeholder="Москва"
          icon={MapPin}
        />
        <Field
          label="Сайт"
          value={draft.website ?? ""}
          onChange={(v) => setDraft((d) => ({ ...d, website: v }))}
          placeholder="https://example.com"
          icon={Globe}
          inputMode="url"
        />
        <Field
          label="Ссылка на аватар"
          value={draft.avatar_url ?? ""}
          onChange={(v) => setDraft((d) => ({ ...d, avatar_url: v }))}
          placeholder="https://…/avatar.png"
          icon={ImageIcon}
          inputMode="url"
        />
        <div className="space-y-1.5">
          <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            О себе
          </label>
          <textarea
            value={draft.bio ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
            placeholder="Пара слов о вашем опыте или трафике"
            rows={3}
            maxLength={280}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary/50"
          />
          <p className="text-right text-[10px] text-muted-foreground">{(draft.bio ?? "").length}/280</p>
        </div>
      </Card>

      {/* Notification preferences */}
      <Card title="Уведомления" icon={Bell}>
        <Toggle label="E-mail уведомления" desc="Заявки, выплаты, важные события" value={prefs.notify_email} onChange={(v) => setPrefs((s) => ({ ...s, notify_email: v }))} />
        <Toggle label="Push в приложении" desc="Показывать колокольчик и всплывашки" value={prefs.notify_push} onChange={(v) => setPrefs((s) => ({ ...s, notify_push: v }))} />
        <Toggle label="Выплаты" desc="Статусы вывода, начисления, откаты" value={prefs.notify_payouts} onChange={(v) => setPrefs((s) => ({ ...s, notify_payouts: v }))} />
        <Toggle label="Новые офферы" desc="Уведомлять о новых и приоритетных офферах" value={prefs.notify_offers} onChange={(v) => setPrefs((s) => ({ ...s, notify_offers: v }))} />
        <Toggle label="Маркетинг и советы" desc="Полезные подборки и рекомендации" value={prefs.notify_marketing} onChange={(v) => setPrefs((s) => ({ ...s, notify_marketing: v }))} />
      </Card>

      {/* Appearance */}
      <Card title="Оформление" icon={Moon}>
        <div className="space-y-1.5">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Тема</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: "system", label: "Система", Icon: Sparkles },
              { id: "dark", label: "Тёмная", Icon: Moon },
              { id: "light", label: "Светлая", Icon: Sun },
            ] as const).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setPrefs((s) => ({ ...s, theme: id }))}
                className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-[11px] font-medium transition-colors ${
                  prefs.theme === id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Язык</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: "ru", label: "Русский" },
              { id: "en", label: "English" },
            ] as const).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setPrefs((s) => ({ ...s, language: id }))}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-[11px] font-medium transition-colors ${
                  prefs.language === id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Languages className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
        <Toggle label="Компактный режим" desc="Меньше отступов в списках" value={prefs.compact} onChange={(v) => setPrefs((s) => ({ ...s, compact: v }))} />
        <Toggle label="Показывать баланс" desc="Скрыть суммы на главной" value={prefs.showBalance} onChange={(v) => setPrefs((s) => ({ ...s, showBalance: v }))} />
      </Card>

      {/* Security */}
      <Card title="Безопасность" icon={Shield}>
        <button
          onClick={() => setPwOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2.5 text-left transition-colors hover:bg-accent"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <KeyRound className="size-4 text-muted-foreground" />
            Изменить пароль
          </span>
          <Lock className="size-4 text-muted-foreground" />
        </button>
        {pwOpen && (
          <div className="space-y-2 rounded-lg border border-border bg-background/40 p-3">
            <div className="relative">
              <input
                type={pwShow ? "text" : "password"}
                placeholder="Новый пароль"
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 pr-10 text-sm outline-none focus:border-primary/50"
              />
              <button
                type="button"
                onClick={() => setPwShow((v) => !v)}
                className="absolute inset-y-0 right-2 grid place-items-center text-muted-foreground"
                aria-label="Показать/скрыть"
              >
                {pwShow ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <input
              type={pwShow ? "text" : "password"}
              placeholder="Повторите пароль"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
            {pwMsg && <p className="text-[11px] text-muted-foreground">{pwMsg}</p>}
            <button
              onClick={changePassword}
              disabled={pwSaving || !pwNew || !pwConfirm}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-50"
            >
              {pwSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Сохранить пароль
            </button>
          </div>
        )}
        <button
          onClick={onSignOut}
          className="flex w-full items-center justify-between rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-left text-destructive transition-colors hover:bg-destructive/10"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <LogOut className="size-4" />
            Выйти из аккаунта
          </span>
        </button>
      </Card>

      {/* Save bar */}
      {dirty && (
        <div className="sticky bottom-20 z-20 flex items-center gap-2 rounded-xl border border-border bg-background/95 p-2 shadow-lg backdrop-blur">
          <button
            onClick={reset}
            disabled={saving}
            className="flex-1 rounded-md border border-border px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            Отменить
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : saved ? <Check className="size-3.5" /> : <Save className="size-3.5" />}
            {saved ? "Сохранено" : "Сохранить"}
          </button>
        </div>
      )}
      {err && <p className="text-center text-[11px] text-destructive">{err}</p>}
    </div>
  );
}

/* -------------------- helpers -------------------- */

function Card({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <div className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-3.5" />
        </div>
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label, value, onChange, placeholder, icon: Icon, inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: any;
  inputMode?: "tel" | "url" | "email" | "text";
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground" />
        )}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          className={`w-full rounded-lg border border-border bg-background py-2 text-sm outline-none transition-colors focus:border-primary/50 ${
            Icon ? "pl-9 pr-3" : "px-3"
          }`}
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono, onCopy }: { label: string; value: string; mono?: boolean; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/40 px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`truncate text-[12.5px] ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
      {onCopy && (
        <button
          onClick={() => { onCopy(); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
          className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Скопировать"
        >
          {copied ? <Check className="size-3.5 text-[color:var(--success)]" /> : <Copy className="size-3.5" />}
        </button>
      )}
    </div>
  );
}

function Toggle({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-background/40 px-3 py-2.5 text-left transition-colors hover:bg-accent/40"
    >
      <div className="min-w-0">
        <p className="text-[13px] font-semibold">{label}</p>
        {desc && <p className="mt-0.5 text-[11px] text-muted-foreground">{desc}</p>}
      </div>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          value ? "bg-primary" : "bg-secondary"
        }`}
      >
        <span
          className={`inline-block size-4 transform rounded-full bg-background shadow transition-transform ${
            value ? "translate-x-[18px]" : "translate-x-[2px]"
          }`}
        />
      </span>
    </button>
  );
}
