import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Plus, Trash2, Save, Loader2, Calendar, Users, Target } from "lucide-react";

type Promo = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  bonus_amount: number;
  starts_at: string;
  ends_at: string;
  active: boolean;
  trigger_offer_id: string | null;
  trigger_conversions_count: number;
  max_activations: number | null;
  created_at: string;
  updated_at: string;
};

type Offer = { id: string; name: string };

type Activation = {
  id: string;
  promo_id: string;
  user_id: string;
  amount: number;
  created_at: string;
};

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string {
  return v ? new Date(v).toISOString() : new Date().toISOString();
}

const emptyDraft = () => {
  const now = new Date();
  const end = new Date(now.getTime() + 14 * 24 * 3600 * 1000);
  return {
    code: "",
    title: "",
    description: "",
    bonus_amount: 500,
    starts_at: toLocalInput(now.toISOString()),
    ends_at: toLocalInput(end.toISOString()),
    active: true,
    trigger_offer_id: "" as string,
    trigger_conversions_count: 1,
    max_activations: "" as string,
  };
};

export function AdminPromoCodesTab() {
  const [rows, setRows] = useState<Promo[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [activations, setActivations] = useState<Activation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft());

  const load = useCallback(async () => {
    setLoading(true);
    const [promos, off, acts] = await Promise.all([
      supabase.from("promo_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("offers").select("id, name").order("name"),
      supabase.from("promo_activations").select("id, promo_id, user_id, amount, created_at"),
    ]);
    setRows((promos.data ?? []) as Promo[]);
    setOffers((off.data ?? []) as Offer[]);
    setActivations((acts.data ?? []) as Activation[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("rt:admin:promos")
      .on("postgres_changes", { event: "*", schema: "public", table: "promo_codes" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "promo_activations" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [load]);

  const actsByPromo = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of activations) m.set(a.promo_id, (m.get(a.promo_id) || 0) + 1);
    return m;
  }, [activations]);

  const create = async () => {
    if (!draft.code.trim() || !draft.title.trim()) {
      alert("Введите код и название промокода");
      return;
    }
    if (draft.bonus_amount <= 0) {
      alert("Сумма бонуса должна быть больше нуля");
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("promo_codes").insert({
      code: draft.code.trim().toUpperCase(),
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      bonus_amount: Number(draft.bonus_amount),
      starts_at: fromLocalInput(draft.starts_at),
      ends_at: fromLocalInput(draft.ends_at),
      active: draft.active,
      trigger_offer_id: draft.trigger_offer_id || null,
      trigger_conversions_count: Math.max(1, Number(draft.trigger_conversions_count) || 1),
      max_activations: draft.max_activations ? Number(draft.max_activations) : null,
    });
    if (error) alert(error.message);
    else setDraft(emptyDraft());
    setCreating(false);
  };

  const save = async (p: Promo) => {
    setSavingId(p.id);
    const { error } = await supabase
      .from("promo_codes")
      .update({
        code: p.code.trim().toUpperCase(),
        title: p.title,
        description: p.description,
        bonus_amount: p.bonus_amount,
        starts_at: p.starts_at,
        ends_at: p.ends_at,
        active: p.active,
        trigger_offer_id: p.trigger_offer_id,
        trigger_conversions_count: p.trigger_conversions_count,
        max_activations: p.max_activations,
      })
      .eq("id", p.id);
    if (error) alert(error.message);
    setSavingId(null);
  };

  const remove = async (id: string) => {
    if (!confirm("Удалить промокод? Все активации сохранятся, но новых начислений не будет.")) return;
    await supabase.from("promo_codes").delete().eq("id", id);
  };

  const update = (id: string, patch: Partial<Promo>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Gift className="size-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider">Новый промокод</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono font-bold uppercase"
            placeholder="Код (например YAEDA5)"
            value={draft.code}
            onChange={(e) => setDraft({ ...draft, code: e.target.value })}
          />
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold"
            placeholder="Название"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <textarea
            className="min-h-[80px] md:col-span-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="Описание условий (например: совершите 1 сделку по Яндекс Еда и получите +500₽ на баланс)"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Начало</span>
            <input
              type="datetime-local"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={draft.starts_at}
              onChange={(e) => setDraft({ ...draft, starts_at: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Окончание</span>
            <input
              type="datetime-local"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={draft.ends_at}
              onChange={(e) => setDraft({ ...draft, ends_at: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Сумма бонуса, ₽
            </span>
            <input
              type="number"
              min={0}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={draft.bonus_amount}
              onChange={(e) => setDraft({ ...draft, bonus_amount: Number(e.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Оффер-триггер
            </span>
            <select
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={draft.trigger_offer_id}
              onChange={(e) => setDraft({ ...draft, trigger_offer_id: e.target.value })}
            >
              <option value="">Любой оффер</option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Нужно сделок по офферу
            </span>
            <input
              type="number"
              min={1}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={draft.trigger_conversions_count}
              onChange={(e) =>
                setDraft({ ...draft, trigger_conversions_count: Number(e.target.value) })
              }
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Лимит активаций (пусто = без лимита)
            </span>
            <input
              type="number"
              min={0}
              placeholder="без лимита"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={draft.max_activations}
              onChange={(e) => setDraft({ ...draft, max_activations: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
            />
            Активен (виден пользователям и начисляется)
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={create}
            disabled={creating}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-50"
          >
            {creating ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            Создать промокод
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Промокоды {rows.length ? `(${rows.length})` : ""}
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Промокодов пока нет
          </div>
        ) : (
          rows.map((p) => {
            const activationsCount = actsByPromo.get(p.id) || 0;
            const offerName =
              p.trigger_offer_id
                ? offers.find((o) => o.id === p.trigger_offer_id)?.name || "—"
                : "Любой оффер";
            const isLive = p.active && new Date(p.ends_at) > new Date();
            return (
              <div key={p.id} className="space-y-2 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 font-mono text-xs font-bold ${
                        isLive
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.code}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {isLive ? "Активен" : "Не активен"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3" /> {activationsCount}
                      {p.max_activations ? ` / ${p.max_activations}` : ""}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Target className="size-3" /> {p.trigger_conversions_count} сделки по «{offerName}»
                    </span>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono font-bold uppercase"
                    value={p.code}
                    onChange={(e) => update(p.id, { code: e.target.value })}
                  />
                  <input
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold"
                    value={p.title}
                    onChange={(e) => update(p.id, { title: e.target.value })}
                  />
                  <textarea
                    className="min-h-[70px] md:col-span-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    value={p.description ?? ""}
                    onChange={(e) => update(p.id, { description: e.target.value })}
                  />
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Начало
                    </span>
                    <input
                      type="datetime-local"
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={toLocalInput(p.starts_at)}
                      onChange={(e) => update(p.id, { starts_at: fromLocalInput(e.target.value) })}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Окончание
                    </span>
                    <input
                      type="datetime-local"
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={toLocalInput(p.ends_at)}
                      onChange={(e) => update(p.id, { ends_at: fromLocalInput(e.target.value) })}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Бонус, ₽
                    </span>
                    <input
                      type="number"
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={p.bonus_amount}
                      onChange={(e) => update(p.id, { bonus_amount: Number(e.target.value) })}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Оффер-триггер
                    </span>
                    <select
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={p.trigger_offer_id ?? ""}
                      onChange={(e) =>
                        update(p.id, { trigger_offer_id: e.target.value || null })
                      }
                    >
                      <option value="">Любой оффер</option>
                      {offers.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Нужно сделок
                    </span>
                    <input
                      type="number"
                      min={1}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={p.trigger_conversions_count}
                      onChange={(e) =>
                        update(p.id, { trigger_conversions_count: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Лимит активаций
                    </span>
                    <input
                      type="number"
                      min={0}
                      placeholder="без лимита"
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={p.max_activations ?? ""}
                      onChange={(e) =>
                        update(p.id, {
                          max_activations: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </label>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={p.active}
                      onChange={(e) => update(p.id, { active: e.target.checked })}
                    />
                    Активен
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <Calendar className="size-3" />
                      {new Date(p.starts_at).toLocaleDateString("ru-RU")} —{" "}
                      {new Date(p.ends_at).toLocaleDateString("ru-RU")}
                    </span>
                    <button
                      onClick={() => remove(p.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3" /> Удалить
                    </button>
                    <button
                      onClick={() => save(p)}
                      disabled={savingId === p.id}
                      className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-50"
                    >
                      {savingId === p.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Save className="size-3" />
                      )}
                      Сохранить
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
