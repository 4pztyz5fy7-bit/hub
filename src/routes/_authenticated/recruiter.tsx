import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Briefcase,
  ClipboardList,
  BarChart3,
  Loader2,
  Package,
  Pencil,
  Save,
  X,
  Shield,
  TrendingUp,
  DollarSign,
  Activity,
  Filter,
  Search,
} from "lucide-react";
import {
  getRecruiterScope,
  updateRecruiterOffer,
  getRecruiterRequests,
  setRecruiterRequestStatus,
  getRecruiterStats,
} from "@/lib/recruiter.functions";
import { translateError } from "@/lib/errors-ru";

export const Route = createFileRoute("/_authenticated/recruiter")({
  head: () => ({ meta: [{ title: "Панель рекрутёра — КВАНТ" }] }),
  component: RecruiterPage,
});

type Tab = "offers" | "requests" | "stats";

type OfferRow = {
  id: string;
  name: string;
  tag: string | null;
  category: string | null;
  advertiser: string | null;
  geo: string | null;
  payout: string | null;
  epc: number | null;
  cr: number | null;
  avg_orders_per_courier: number | null;
  goal: string | null;
  description: string | null;
  requirements: string | null;
  allowed: string[] | null;
  denied: string[] | null;
  active: boolean | null;
  landing: string | null;
  income: string | null;
  target_action: string | null;
  work_rules: string | null;
  ad_materials: string | null;
  feedback: string | null;
  term_completion: string | null;
  term_confirmation: string | null;
};

type LinkRow = {
  id: string;
  code: string;
  user_id: string | null;
  offer_id: string | null;
  offer_name: string;
  status: string;
  orders_count: number | null;
  payout_override: number | null;
  created_at: string;
};

function RecruiterPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("offers");
  const [checking, setChecking] = useState(true);
  const [access, setAccess] = useState<null | boolean>(null);

  const check = useCallback(async () => {
    setChecking(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    const [admin, rec] = await Promise.all([
      supabase.rpc("is_admin"),
      supabase.rpc("has_role", { _user_id: u.user.id, _role: "recruiter" }),
    ]);
    const ok = (!admin.error && admin.data === true) || (!rec.error && rec.data === true);
    setAccess(ok);
    setChecking(false);
    if (!ok) navigate({ to: "/dashboard", replace: true });
  }, [navigate]);

  useEffect(() => {
    void check();
  }, [check]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }
  if (!access) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            aria-label="Назад"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </button>
          <Briefcase className="size-4 text-primary" />
          <span className="text-sm font-bold uppercase tracking-tight">Панель рекрутёра</span>
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase text-primary">
            recruiter
          </span>
        </div>
      </header>

      <nav className="sticky top-14 z-10 flex gap-1 overflow-x-auto border-b border-border bg-background/80 px-3 py-2 backdrop-blur-md">
        {(
          [
            { id: "offers", label: "Мои офферы", Icon: Package },
            { id: "requests", label: "Заявки", Icon: ClipboardList },
            { id: "stats", label: "Статистика", Icon: BarChart3 },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <t.Icon className="size-3.5" /> {t.label}
          </button>
        ))}
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-4">
        {tab === "offers" && <OffersTab />}
        {tab === "requests" && <RequestsTab />}
        {tab === "stats" && <StatsTab />}
      </main>
    </div>
  );
}

/* ---------------- Offers ---------------- */

function OffersTab() {
  const scopeFn = useServerFn(getRecruiterScope);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<OfferRow | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await scopeFn({});
      setOffers(s.offers as OfferRow[]);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [scopeFn]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return offers;
    return offers.filter((o) =>
      (o.name + " " + (o.tag ?? "") + " " + (o.category ?? "")).toLowerCase().includes(s),
    );
  }, [offers, q]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск офферов…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {loading ? (
        <div className="grid place-items-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          У вас пока нет доступных офферов. Попросите администратора выдать доступ.
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((o) => (
            <div
              key={o.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <Package className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate text-sm font-bold">{o.name}</div>
                  {o.active === false && (
                    <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[9px] font-bold uppercase text-destructive">
                      Выключен
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {(o.category ?? o.tag ?? "—") + " · " + (o.payout ?? "—") + " · GEO: " + (o.geo ?? "—")}
                </div>
              </div>
              <button
                onClick={() => setEditing(o)}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
              >
                <Pencil className="size-3.5" /> Редактировать
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <OfferEditor
          offer={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function OfferEditor({
  offer,
  onClose,
  onSaved,
}: {
  offer: OfferRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const updateFn = useServerFn(updateRecruiterOffer);
  const [form, setForm] = useState<OfferRow>({ ...offer });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = <K extends keyof OfferRow>(k: K, v: OfferRow[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      await updateFn({
        data: {
          id: offer.id,
          patch: {
            name: form.name,
            tag: form.tag ?? null,
            category: form.category ?? null,
            advertiser: form.advertiser ?? null,
            geo: form.geo ?? null,
            payout: form.payout ?? "",
            goal: form.goal ?? null,
            description: form.description ?? null,
            requirements: form.requirements ?? null,
            allowed: (form.allowed ?? []).filter((s) => s.trim().length > 0),
            denied: (form.denied ?? []).filter((s) => s.trim().length > 0),
            active: !!form.active,
            landing: form.landing ?? null,
            income: form.income ?? null,
            target_action: form.target_action ?? null,
            work_rules: form.work_rules ?? null,
            ad_materials: form.ad_materials ?? null,
            feedback: form.feedback ?? null,
            term_completion: form.term_completion ?? null,
            term_confirmation: form.term_confirmation ?? null,
          },
        },
      });
      onSaved();
    } catch (e) {
      setErr(translateError(e, "Не удалось сохранить"));
    }
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/70 p-3 pt-10 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="text-sm font-bold">Редактирование оффера</div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
          <Field label="Название">
            <input
              value={form.name ?? ""}
              onChange={(e) => set("name", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Категория">
              <input
                value={form.category ?? ""}
                onChange={(e) => set("category", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Тег">
              <input
                value={form.tag ?? ""}
                onChange={(e) => set("tag", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Рекламодатель">
              <input
                value={form.advertiser ?? ""}
                onChange={(e) => set("advertiser", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="GEO">
              <input
                value={form.geo ?? ""}
                onChange={(e) => set("geo", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Выплата (текст)">
              <input
                value={form.payout ?? ""}
                onChange={(e) => set("payout", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Холд">
              <input
                value={form.hold ?? ""}
                onChange={(e) => set("hold", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="EPC">
              <input
                type="number"
                value={form.epc ?? 0}
                onChange={(e) => set("epc", Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="CR, %">
              <input
                type="number"
                step="0.01"
                value={form.cr ?? 0}
                onChange={(e) => set("cr", Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
          </div>
          <Field label="Целевое действие">
            <input
              value={form.goal ?? ""}
              onChange={(e) => set("goal", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Партнёрская ссылка (landing)">
            <input
              value={form.landing ?? ""}
              onChange={(e) => set("landing", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Описание">
            <textarea
              rows={4}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Требования">
            <textarea
              rows={3}
              value={form.requirements ?? ""}
              onChange={(e) => set("requirements", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Разрешённый трафик (через запятую)">
            <textarea
              rows={2}
              value={(form.allowed ?? []).join(", ")}
              onChange={(e) =>
                set(
                  "allowed",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Запрещённый трафик (через запятую)">
            <textarea
              rows={2}
              value={(form.denied ?? []).join(", ")}
              onChange={(e) =>
                set(
                  "denied",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!form.active}
              onChange={(e) => set("active", e.target.checked)}
            />
            Оффер активен
          </label>
          {err && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
              {err}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold"
          >
            Отмена
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </label>
  );
}

/* ---------------- Requests ---------------- */

const STATUSES: { id: LinkRow["status"]; label: string }[] = [
  { id: "new", label: "Новая" },
  { id: "review", label: "На проверке" },
  { id: "in_progress", label: "В работе" },
  { id: "completed", label: "Выполнена" },
  { id: "finished", label: "Завершена" },
  { id: "paid", label: "Оплачена" },
  { id: "rejected", label: "Отклонена" },
];

function RequestsTab() {
  const listFn = useServerFn(getRecruiterRequests);
  const setStatusFn = useServerFn(setRecruiterRequestStatus);
  const [rows, setRows] = useState<LinkRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string | null; email: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | LinkRow["status"]>("all");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await listFn({});
      setRows(r.requests as LinkRow[]);
      const map: Record<string, { display_name: string | null; email: string | null }> = {};
      for (const p of r.profiles ?? []) {
        map[(p as any).id] = { display_name: (p as any).display_name, email: (p as any).email };
      }
      setProfiles(map);
    } catch (e) {
      setErr(translateError(e, "Не удалось загрузить заявки"));
    }
    setLoading(false);
  }, [listFn]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = rows.filter((r) => (filter === "all" ? true : r.status === filter));

  const change = async (id: string, status: LinkRow["status"]) => {
    try {
      await setStatusFn({ data: { id, status } });
      void load();
    } catch (e) {
      setErr(translateError(e, "Не удалось изменить статус"));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="size-3.5" /> Фильтр:
        </div>
        {(
          [
            { id: "all" as const, label: "Все" },
            ...STATUSES.map((s) => ({ id: s.id, label: s.label })),
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              filter === f.id
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {err && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
          {err}
        </div>
      )}

      {loading ? (
        <div className="grid place-items-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Заявок нет.
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((r) => {
            const p = r.user_id ? profiles[r.user_id] : undefined;
            const who = p?.display_name || p?.email || r.user_id?.slice(0, 8) || "—";
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground">{r.code}</span>
                  <span className="text-sm font-bold">{r.offer_name}</span>
                  <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase text-foreground/80">
                    {STATUSES.find((s) => s.id === r.status)?.label ?? r.status}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Партнёр: {who} · Заказов: {r.orders_count ?? 0} ·{" "}
                  {new Date(r.created_at).toLocaleString("ru")}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">
                    Статус
                  </label>
                  <select
                    value={r.status}
                    onChange={(e) => change(r.id, e.target.value as LinkRow["status"])}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                  >
                    {STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- Stats ---------------- */

function StatsTab() {
  const statsFn = useServerFn(getRecruiterStats);
  const [data, setData] = useState<{
    conversions: Array<{ offer_id: string | null; offer_name: string; amount: number; created_at: string }>;
    requests: Array<{ offer_id: string | null; offer_name: string; status: string; created_at: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await statsFn({});
        setData(r as any);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, [statsFn]);

  const agg = useMemo(() => {
    const m = new Map<
      string,
      { name: string; amount: number; count: number; requests: number }
    >();
    for (const c of data?.conversions ?? []) {
      const k = c.offer_id ?? c.offer_name;
      const cur = m.get(k) ?? { name: c.offer_name, amount: 0, count: 0, requests: 0 };
      cur.amount += Number(c.amount ?? 0);
      cur.count += 1;
      m.set(k, cur);
    }
    for (const r of data?.requests ?? []) {
      const k = r.offer_id ?? r.offer_name;
      const cur = m.get(k) ?? { name: r.offer_name, amount: 0, count: 0, requests: 0 };
      cur.requests += 1;
      m.set(k, cur);
    }
    return Array.from(m.values()).sort((a, b) => b.amount - a.amount);
  }, [data]);

  const totalAmount = agg.reduce((s, x) => s + x.amount, 0);
  const totalConv = agg.reduce((s, x) => s + x.count, 0);
  const totalReq = agg.reduce((s, x) => s + x.requests, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <Kpi label="Выручка" value={`${totalAmount.toLocaleString("ru")} ₽`} Icon={DollarSign} />
        <Kpi label="Конверсии" value={totalConv} Icon={TrendingUp} />
        <Kpi label="Заявки" value={totalReq} Icon={Activity} />
      </div>
      {loading ? (
        <div className="grid place-items-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : agg.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Пока нет данных по вашим офферам.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Оффер</th>
                <th className="px-3 py-2 text-right">Заявки</th>
                <th className="px-3 py-2 text-right">Конверсии</th>
                <th className="px-3 py-2 text-right">Выручка, ₽</th>
              </tr>
            </thead>
            <tbody>
              {agg.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-right">{r.requests}</td>
                  <td className="px-3 py-2 text-right">{r.count}</td>
                  <td className="px-3 py-2 text-right font-bold">{r.amount.toLocaleString("ru")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string | number;
  Icon: typeof Shield;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}
