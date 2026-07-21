import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X, Trophy, Check, Ban, Coins, Loader2 } from "lucide-react";
import { translateError } from "@/lib/errors-ru";

type Tier = "start" | "silver" | "gold" | "platinum" | "diamond";
type Metric = "earned" | "conversions" | "requests";
type Prize = { place: number; amount: number; label?: string };

type Competition = {
  id: string;
  title: string;
  description: string | null;
  prize_pool: number;
  prizes: Prize[];
  metric: Metric;
  min_level: Tier;
  starts_at: string;
  ends_at: string;
  active: boolean;
  banner_url: string | null;
  rules: string | null;
  created_at: string;
  settled_at: string | null;
  winners: Array<{ place: number; user_id: string; amount: number; score: number }>;
};

const TIER_LABEL: Record<Tier, string> = {
  start: "Старт", silver: "Серебро", gold: "Золото", platinum: "Платина", diamond: "Бриллиант",
};
const METRIC_LABEL: Record<Metric, string> = {
  earned: "Заработок", conversions: "Конверсии", requests: "Заявки",
};

const fmtRub = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export function AdminCompetitionsTab() {
  const [rows, setRows] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Competition | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("competitions").select("*").order("created_at", { ascending: false });
    setRows(((data ?? []) as any[]).map((r) => ({
      ...r,
      prizes: Array.isArray(r.prizes) ? (r.prizes as Prize[]) : [],
      prize_pool: Number(r.prize_pool ?? 0),
      winners: Array.isArray(r.winners) ? r.winners : [],
      settled_at: r.settled_at ?? null,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const remove = async (id: string) => {
    if (!confirm("Удалить соревнование?")) return;
    await supabase.from("competitions").delete().eq("id", id);
    void load();
  };
  const toggle = async (c: Competition) => {
    await supabase.from("competitions").update({ active: !c.active }).eq("id", c.id);
    void load();
  };
  const [settling, setSettling] = useState<string | null>(null);
  const settle = async (c: Competition) => {
    if (!confirm(`Выплатить призы победителям турнира «${c.title}»? Действие нельзя отменить.`)) return;
    setSettling(c.id);
    try {
      const { data, error } = await supabase.rpc("settle_competition" as any, { _id: c.id });
      if (error) throw error;
      const res = data as { ok: boolean; error?: string; count?: number; total?: number } | null;
      if (!res?.ok) {
        toast.error(res?.error === "already_settled" ? "Призы уже выплачены" : "Не удалось выплатить призы");
      } else {
        toast.success(`Выплачено призов: ${res.count ?? 0} на ${Math.round(res.total ?? 0).toLocaleString("ru-RU")} ₽`);
      }
      await load();
    } catch (e: any) {
      toast.error(translateError(e));
    } finally {
      setSettling(null);
    }
  };

  if (loading) return <div className="py-10 text-center text-sm text-muted-foreground">Загрузка…</div>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Соревнования</h2>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
        >
          <Plus className="size-3.5" /> Создать
        </button>
      </div>

      {rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
          Пока ничего нет
        </div>
      )}

      {rows.map((c) => {
        const ends = new Date(c.ends_at);
        const finished = ends.getTime() <= Date.now();
        return (
          <div key={c.id} className="rounded-xl border border-border bg-card p-3">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Trophy className="size-3.5 text-cyan-400" />
                  <p className="truncate text-sm font-bold">{c.title}</p>
                  <span className="rounded-full bg-cyan-500/15 px-1.5 py-0.5 text-[9px] font-black text-cyan-400">
                    {TIER_LABEL[c.min_level]}+
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  {METRIC_LABEL[c.metric]} · {new Date(c.starts_at).toLocaleDateString("ru-RU")} – {ends.toLocaleDateString("ru-RU")}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => toggle(c)} className="grid size-7 place-items-center rounded-md hover:bg-accent">
                  {c.active ? <Check className="size-3.5 text-emerald-500" /> : <Ban className="size-3.5 text-destructive" />}
                </button>
                <button onClick={() => setEditing(c)} className="grid size-7 place-items-center rounded-md hover:bg-accent"><Pencil className="size-3.5" /></button>
                <button onClick={() => remove(c.id)} className="grid size-7 place-items-center rounded-md text-destructive hover:bg-destructive/10"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span>Фонд: <span className="font-bold text-foreground">{fmtRub(c.prize_pool)}</span></span>
              <span>Призов: <span className="font-bold text-foreground">{c.prizes.length}</span></span>
              <span className={finished ? "text-destructive" : c.active ? "text-emerald-500" : "text-muted-foreground"}>
                {finished ? "завершено" : c.active ? "активно" : "выключено"}
              </span>
              {c.settled_at ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                  <Coins className="size-3" /> Призы выплачены · {c.winners.length}
                </span>
              ) : finished && c.prizes.length > 0 ? (
                <button
                  onClick={() => settle(c)}
                  disabled={settling === c.id}
                  className="inline-flex items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-60"
                >
                  {settling === c.id ? <Loader2 className="size-3 animate-spin" /> : <Coins className="size-3" />}
                  Выплатить призы
                </button>
              ) : null}
            </div>
            {c.settled_at && c.winners.length > 0 && (
              <div className="mt-2 space-y-1 border-t border-border pt-2 text-[11px]">
                {c.winners.slice().sort((a, b) => a.place - b.place).map((w) => (
                  <div key={w.place} className="flex items-center justify-between text-muted-foreground">
                    <span>#{w.place} · <span className="font-mono">{w.user_id.slice(0, 8)}</span></span>
                    <span className="font-mono font-bold text-emerald-500">{fmtRub(w.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {(editing || creating) && (
        <CompetitionEditor
          comp={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); void load(); }}
        />
      )}
    </div>
  );
}

function CompetitionEditor({ comp, onClose, onSaved }: { comp: Competition | null; onClose: () => void; onSaved: () => void }) {
  const defaultEnd = new Date(Date.now() + 7 * 86_400_000).toISOString();
  const [form, setForm] = useState({
    title: comp?.title ?? "",
    description: comp?.description ?? "",
    prize_pool: String(comp?.prize_pool ?? 100000),
    metric: (comp?.metric ?? "earned") as Metric,
    min_level: (comp?.min_level ?? "diamond") as Tier,
    starts_at: toLocalInput(comp?.starts_at ?? new Date().toISOString()),
    ends_at: toLocalInput(comp?.ends_at ?? defaultEnd),
    active: comp?.active ?? true,
    banner_url: comp?.banner_url ?? "",
    rules: comp?.rules ?? "",
  });
  const [prizes, setPrizes] = useState<Prize[]>(
    comp?.prizes && comp.prizes.length > 0
      ? comp.prizes
      : [
          { place: 1, amount: 50000, label: "1 место" },
          { place: 2, amount: 30000, label: "2 место" },
          { place: 3, amount: 20000, label: "3 место" },
        ]
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const updPrize = (i: number, patch: Partial<Prize>) =>
    setPrizes((p) => p.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addPrize = () => setPrizes((p) => [...p, { place: p.length + 1, amount: 10000, label: `${p.length + 1} место` }]);
  const rmPrize = (i: number) => setPrizes((p) => p.filter((_, idx) => idx !== i));

  const save = async () => {
    setErr(null);
    if (!form.title.trim()) { setErr("Введите название"); return; }
    if (new Date(form.ends_at).getTime() <= new Date(form.starts_at).getTime()) {
      setErr("Дата окончания должна быть позже даты старта"); return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      prize_pool: Number(form.prize_pool) || 0,
      prizes: prizes.filter((p) => p.amount > 0).map((p, i) => ({
        place: p.place || i + 1,
        amount: Number(p.amount) || 0,
        label: (p.label ?? "").trim() || `${p.place || i + 1} место`,
      })),
      metric: form.metric,
      min_level: form.min_level,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      active: form.active,
      banner_url: form.banner_url.trim() || null,
      rules: form.rules.trim() || null,
    };
    const { error } = comp
      ? await supabase.from("competitions").update(payload).eq("id", comp.id)
      : await supabase.from("competitions").insert(payload);
    setSaving(false);
    if (error) { setErr(translateError(error)); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card p-5 md:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">{comp ? "Редактировать турнир" : "Новый турнир"}</h2>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-full hover:bg-accent"><X className="size-4" /></button>
        </div>

        <div className="space-y-3">
          <Field label="Название">
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
          </Field>

          <Field label="Описание">
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Метрика">
              <select value={form.metric} onChange={(e) => setForm((f) => ({ ...f, metric: e.target.value as Metric }))}
                className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm">
                <option value="earned">Заработок</option>
                <option value="conversions">Конверсии</option>
                <option value="requests">Заявки</option>
              </select>
            </Field>
            <Field label="Мин. уровень">
              <select value={form.min_level} onChange={(e) => setForm((f) => ({ ...f, min_level: e.target.value as Tier }))}
                className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm">
                {(["start","silver","gold","platinum","diamond"] as Tier[]).map((t) =>
                  <option key={t} value={t}>{TIER_LABEL[t]}</option>
                )}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Старт">
              <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm" />
            </Field>
            <Field label="Финиш">
              <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm" />
            </Field>
          </div>

          <Field label="Общий призовой фонд, ₽">
            <input type="number" value={form.prize_pool} onChange={(e) => setForm((f) => ({ ...f, prize_pool: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </Field>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Призы по местам</span>
              <button onClick={addPrize} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px] font-bold hover:bg-accent">
                <Plus className="size-3" /> место
              </button>
            </div>
            <div className="space-y-1.5">
              {prizes.map((p, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input type="number" value={p.place} onChange={(e) => updPrize(i, { place: Number(e.target.value) })}
                    className="w-14 rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
                  <input value={p.label ?? ""} onChange={(e) => updPrize(i, { label: e.target.value })} placeholder="Название"
                    className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
                  <input type="number" value={p.amount} onChange={(e) => updPrize(i, { amount: Number(e.target.value) })} placeholder="₽"
                    className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
                  <button onClick={() => rmPrize(i)} className="grid size-7 place-items-center rounded-md text-destructive hover:bg-destructive/10">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Field label="Баннер (URL, опционально)">
            <input value={form.banner_url} onChange={(e) => setForm((f) => ({ ...f, banner_url: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </Field>

          <Field label="Правила (опционально)">
            <textarea value={form.rules} onChange={(e) => setForm((f) => ({ ...f, rules: e.target.value }))} rows={3}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </Field>

          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
            Активно (видно партнёрам)
          </label>

          {err && <p className="text-xs text-destructive">{err}</p>}

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 rounded-lg border border-border py-2 text-sm font-bold">Отмена</button>
            <button onClick={save} disabled={saving} className="flex-1 rounded-lg bg-primary py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">
              {saving ? "Сохраняем…" : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-0.5">{children}</div>
    </label>
  );
}
