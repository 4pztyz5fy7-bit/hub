import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, Users, Package, Wallet, ClipboardList, Loader2, ArrowLeft,
  Check, X, Plus, Pencil, Trash2, LogOut,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Админ-панель — КВАНТ" }] }),
  component: AdminPage,
});

type TabId = "users" | "offers" | "payouts" | "requests";

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  telegram: string | null;
  created_at: string;
};
type RoleRow = { user_id: string; role: "admin" | "user" };
type Offer = {
  id: string;
  name: string;
  tag: string;
  advertiser: string | null;
  geo: string | null;
  payout: string;
  epc: number;
  hold: string | null;
  goal: string | null;
  description: string | null;
  requirements: string | null;
  active: boolean;
  created_at: string;
};
type PayoutRow = {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  destination: string | null;
  status: "pending" | "processing" | "paid" | "rejected";
  note: string | null;
  created_at: string;
};
type LinkRow = {
  id: string;
  user_id: string;
  offer_id: string | null;
  offer_name: string;
  offer_tag: string | null;
  source: string | null;
  sub: string | null;
  status: "new" | "review" | "approved" | "rejected";
  created_at: string;
};

function AdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [tab, setTab] = useState<TabId>("users");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { navigate({ to: "/" }); return; }
      const { data } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      setAllowed(Boolean(data));
      setChecking(false);
    })();
  }, [navigate]);

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/" }); };

  if (checking) return <CenterLoader label="Проверка доступа" />;
  if (!allowed) return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <Shield className="size-10 text-muted-foreground" />
      <h1 className="text-lg font-bold">Доступ запрещён</h1>
      <p className="text-sm text-muted-foreground">У вашей учётной записи нет роли администратора.</p>
      <Link to="/dashboard" className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">В кабинет</Link>
    </div>
  );

  const tabs: { id: TabId; label: string; Icon: typeof Users }[] = [
    { id: "users", label: "Пользователи", Icon: Users },
    { id: "offers", label: "Офферы", Icon: Package },
    { id: "payouts", label: "Выплаты", Icon: Wallet },
    { id: "requests", label: "Заявки", Icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Link to="/dashboard" className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
            <ArrowLeft className="size-4" />
          </Link>
          <Shield className="size-4 text-primary" />
          <span className="text-sm font-bold uppercase tracking-tight">Админ-панель</span>
        </div>
        <button onClick={signOut} aria-label="Выйти" className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
          <LogOut className="size-4" />
        </button>
      </header>

      <nav className="sticky top-14 z-10 flex gap-1 overflow-x-auto border-b border-border bg-background/80 px-3 py-2 backdrop-blur-md">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
              tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}>
            <t.Icon className="size-3.5" /> {t.label}
          </button>
        ))}
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-4">
        {tab === "users" && <UsersTab />}
        {tab === "offers" && <OffersTab />}
        {tab === "payouts" && <PayoutsTab />}
        {tab === "requests" && <RequestsTab />}
      </main>
    </div>
  );
}

function CenterLoader({ label }: { label: string }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="size-5 animate-spin" /><span className="text-sm">{label}…</span>
    </div>
  );
}

/* ================= USERS ================= */
function UsersTab() {
  const [rows, setRows] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: profiles }, { data: rr }] = await Promise.all([
      supabase.from("profiles").select("id,email,display_name,telegram,created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    setRows((profiles ?? []) as Profile[]);
    const map: Record<string, Set<string>> = {};
    for (const r of (rr ?? []) as RoleRow[]) {
      (map[r.user_id] ??= new Set()).add(r.role);
    }
    setRoles(map);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleAdmin = async (userId: string, makeAdmin: boolean) => {
    setBusy(userId);
    if (makeAdmin) {
      await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    } else {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    }
    setBusy(null);
    load();
  };

  if (loading) return <CenterLoader label="Загрузка пользователей" />;

  return (
    <div className="space-y-2">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Всего: <span className="font-bold text-foreground">{rows.length}</span></p>
      </div>
      {rows.map((p) => {
        const isAdmin = roles[p.id]?.has("admin") ?? false;
        return (
          <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{p.display_name || p.email || "Без имени"}</p>
              <p className="truncate text-[11px] text-muted-foreground">{p.email}</p>
            </div>
            {isAdmin && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">admin</span>}
            <button
              disabled={busy === p.id}
              onClick={() => toggleAdmin(p.id, !isAdmin)}
              className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition ${
                isAdmin ? "border-destructive/40 text-destructive hover:bg-destructive/10" : "border-primary/40 text-primary hover:bg-primary/10"
              }`}
            >
              {busy === p.id ? "…" : isAdmin ? "Снять admin" : "Сделать admin"}
            </button>
          </div>
        );
      })}
      {rows.length === 0 && <EmptyState text="Пока нет пользователей" />}
    </div>
  );
}

/* ================= OFFERS ================= */
function OffersTab() {
  const [rows, setRows] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("offers").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Offer[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    if (!confirm("Удалить оффер?")) return;
    await supabase.from("offers").delete().eq("id", id);
    load();
  };

  if (loading) return <CenterLoader label="Загрузка офферов" />;

  return (
    <div className="space-y-2">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Всего: <span className="font-bold text-foreground">{rows.length}</span></p>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
          <Plus className="size-3.5" /> Добавить
        </button>
      </div>

      {rows.map((o) => (
        <div key={o.id} className="rounded-xl border border-border bg-card p-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{o.name}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">{o.tag} · {o.advertiser || "—"} · {o.geo || "—"}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditing(o)} className="grid size-7 place-items-center rounded-md hover:bg-accent"><Pencil className="size-3.5" /></button>
              <button onClick={() => remove(o.id)} className="grid size-7 place-items-center rounded-md text-destructive hover:bg-destructive/10"><Trash2 className="size-3.5" /></button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <span>Выплата: <span className="font-bold text-foreground">{o.payout}</span></span>
            <span>EPC: <span className="font-bold text-foreground">{o.epc}</span></span>
            {o.hold && <span>Hold: <span className="font-bold text-foreground">{o.hold}</span></span>}
            <span className={o.active ? "text-primary" : "text-destructive"}>{o.active ? "активен" : "выключен"}</span>
          </div>
        </div>
      ))}
      {rows.length === 0 && <EmptyState text="Пока нет офферов" />}

      {(editing || creating) && (
        <OfferEditor
          offer={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); load(); }}
        />
      )}
    </div>
  );
}

function OfferEditor({ offer, onClose, onSaved }: { offer: Offer | null; onClose: () => void; onSaved: () => void; }) {
  const [form, setForm] = useState({
    id: offer?.id ?? "",
    name: offer?.name ?? "",
    tag: offer?.tag ?? "Финансы",
    advertiser: offer?.advertiser ?? "",
    geo: offer?.geo ?? "RU",
    payout: offer?.payout ?? "",
    epc: String(offer?.epc ?? 0),
    hold: offer?.hold ?? "",
    goal: offer?.goal ?? "",
    description: offer?.description ?? "",
    requirements: offer?.requirements ?? "",
    active: offer?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    const id = (form.id || form.name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!id || !form.name.trim() || !form.payout.trim()) { setErr("Заполните id/название/выплату"); return; }
    setSaving(true);
    const payload = {
      id, name: form.name.trim(), tag: form.tag.trim(),
      advertiser: form.advertiser.trim() || null, geo: form.geo.trim() || null,
      payout: form.payout.trim(), epc: Number(form.epc) || 0,
      hold: form.hold.trim() || null, goal: form.goal.trim() || null,
      description: form.description.trim() || null, requirements: form.requirements.trim() || null,
      active: form.active,
    };
    const { error } = offer
      ? await supabase.from("offers").update(payload).eq("id", offer.id)
      : await supabase.from("offers").insert(payload);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved();
  };

  const field = (key: keyof typeof form, label: string, placeholder = "") => (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input type="text" value={String(form[key] ?? "")} placeholder={placeholder}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card p-5 md:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">{offer ? "Редактировать оффер" : "Новый оффер"}</h2>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-full hover:bg-accent"><X className="size-4" /></button>
        </div>
        <div className="space-y-3">
          {!offer && field("id", "ID (латиница, опционально)", "auto из названия")}
          {field("name", "Название")}
          {field("tag", "Категория", "Финансы / Образование / Travel")}
          <div className="grid grid-cols-2 gap-3">
            {field("advertiser", "Рекламодатель")}
            {field("geo", "ГЕО")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("payout", "Выплата", "3500 ₽ / 12%")}
            {field("epc", "EPC")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("hold", "Hold", "14 дн.")}
            {field("goal", "Цель", "Одобренная заявка")}
          </div>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Описание</span>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3} className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Требования</span>
            <textarea value={form.requirements} onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))}
              rows={2} className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
            Активный оффер
          </label>
          {err && <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{err}</p>}
          <button disabled={saving} onClick={save} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60">
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= PAYOUTS ================= */
function PayoutsTab() {
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("payout_requests").select("*").order("created_at", { ascending: false });
    const list = (data ?? []) as PayoutRow[];
    setRows(list);
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    if (ids.length) {
      const { data: p } = await supabase.from("profiles").select("id,email,display_name,telegram,created_at").in("id", ids);
      const map: Record<string, Profile> = {};
      for (const r of (p ?? []) as Profile[]) map[r.id] = r;
      setProfiles(map);
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: PayoutRow["status"]) => {
    await supabase.from("payout_requests").update({ status }).eq("id", id);
    load();
  };

  if (loading) return <CenterLoader label="Загрузка выплат" />;

  const badges: Record<PayoutRow["status"], string> = {
    pending: "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
    processing: "bg-primary/15 text-primary",
    paid: "bg-emerald-500/15 text-emerald-500",
    rejected: "bg-destructive/15 text-destructive",
  };

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const u = profiles[r.user_id];
        return (
          <div key={r.id} className="rounded-xl border border-border bg-card p-3">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold">{Number(r.amount).toLocaleString("ru-RU")} ₽ · {r.method}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{u?.display_name || u?.email || r.user_id.slice(0, 8)}{r.destination ? ` · ${r.destination}` : ""}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString("ru-RU")}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${badges[r.status]}`}>{r.status}</span>
            </div>
            {r.status === "pending" || r.status === "processing" ? (
              <div className="flex gap-2">
                <button onClick={() => setStatus(r.id, "processing")} className="flex-1 rounded-lg border border-primary/40 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/10">В работу</button>
                <button onClick={() => setStatus(r.id, "paid")} className="flex-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-background hover:bg-emerald-600"><Check className="mr-1 inline size-3" />Выплатить</button>
                <button onClick={() => setStatus(r.id, "rejected")} className="rounded-lg border border-destructive/40 px-3 py-1.5 text-[11px] font-bold text-destructive hover:bg-destructive/10"><X className="size-3" /></button>
              </div>
            ) : null}
          </div>
        );
      })}
      {rows.length === 0 && <EmptyState text="Пока нет заявок на выплату" />}
    </div>
  );
}

/* ================= REQUESTS ================= */
function RequestsTab() {
  const [rows, setRows] = useState<LinkRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("link_requests").select("*").order("created_at", { ascending: false });
    const list = (data ?? []) as LinkRow[];
    setRows(list);
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    if (ids.length) {
      const { data: p } = await supabase.from("profiles").select("id,email,display_name,telegram,created_at").in("id", ids);
      const map: Record<string, Profile> = {};
      for (const r of (p ?? []) as Profile[]) map[r.id] = r;
      setProfiles(map);
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: LinkRow["status"]) => {
    await supabase.from("link_requests").update({ status }).eq("id", id);
    load();
  };

  if (loading) return <CenterLoader label="Загрузка заявок" />;

  const badges: Record<LinkRow["status"], string> = {
    new: "bg-primary/15 text-primary",
    review: "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
    approved: "bg-emerald-500/15 text-emerald-500",
    rejected: "bg-destructive/15 text-destructive",
  };

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const u = profiles[r.user_id];
        return (
          <div key={r.id} className="rounded-xl border border-border bg-card p-3">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{r.offer_name}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{u?.display_name || u?.email || r.user_id.slice(0, 8)} · {r.source || "—"}{r.sub ? ` / ${r.sub}` : ""}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString("ru-RU")}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${badges[r.status]}`}>{r.status}</span>
            </div>
            {r.status !== "approved" && r.status !== "rejected" && (
              <div className="flex gap-2">
                <button onClick={() => setStatus(r.id, "review")} className="flex-1 rounded-lg border border-primary/40 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/10">На проверку</button>
                <button onClick={() => setStatus(r.id, "approved")} className="flex-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-background hover:bg-emerald-600"><Check className="mr-1 inline size-3" />Одобрить</button>
                <button onClick={() => setStatus(r.id, "rejected")} className="rounded-lg border border-destructive/40 px-3 py-1.5 text-[11px] font-bold text-destructive hover:bg-destructive/10"><X className="size-3" /></button>
              </div>
            )}
          </div>
        );
      })}
      {rows.length === 0 && <EmptyState text="Пока нет заявок на ссылки" />}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
