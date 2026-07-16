import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, Users, Package, Wallet, ClipboardList, Loader2, ArrowLeft,
  Check, X, Plus, Pencil, Trash2, LogOut, LayoutDashboard, Bell,
  BarChart3, Search, Download, Copy, RefreshCw, Send, Filter, MoreHorizontal,
  TrendingUp, DollarSign, UserCheck, Activity, ChevronRight, Eye, Ban, Wrench,
} from "lucide-react";
import { AdminToolsTab } from "@/components/admin/tools-tab";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Админ-панель — КВАНТ" }] }),
  component: AdminPage,
});

/* =========================== TYPES =========================== */
type TabId = "overview" | "users" | "offers" | "payouts" | "requests" | "conversions" | "broadcast" | "tools";

type Profile = {
  id: string; email: string | null; display_name: string | null;
  telegram: string | null; created_at: string;
};
type RoleRow = { user_id: string; role: "admin" | "user" };
type Offer = {
  id: string; name: string; tag: string; category: string | null;
  advertiser: string | null; geo: string | null; payout: string;
  epc: number; cr: number; hold: string | null; goal: string | null;
  landing: string | null; description: string | null; requirements: string | null;
  allowed: string[]; denied: string[]; active: boolean; is_new: boolean;
  image_url: string | null;
  created_at: string;
};
type PayoutRow = {
  id: string; user_id: string; amount: number; method: string;
  destination: string | null; status: "pending" | "processing" | "paid" | "rejected";
  note: string | null; created_at: string;
};
type LinkRow = {
  id: string; user_id: string; offer_id: string | null; offer_name: string;
  offer_tag: string | null; source: string | null; sub: string | null;
  status: "new" | "review" | "approved" | "rejected"; created_at: string;
};
type Conversion = {
  id: string; user_id: string; offer_id: string | null; offer_name: string;
  amount: number; status: string; created_at: string;
};

/* =========================== ROOT =========================== */
function AdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("overview");

  // ADMIN GUARD: надёжная проверка сессии и роли.
  // - Ждём валидную сессию с access_token (учитываем гонку с onAuthStateChange).
  // - Сначала пробуем is_admin() RPC — она SECURITY DEFINER и не зависит от видимости строк.
  // - При временных сбоях (сеть, 5xx, отсутствие токена) — ретраи с backoff, БЕЗ редиректа.
  // - Редирект на /dashboard только при подтверждённом «не админ».
  const runCheck = useCallback(async () => {
    setChecking(true);
    setAccessError(null);

    // 1) Дождаться сессии (до ~4 сек), затем при необходимости обновить токен.
    let session = (await supabase.auth.getSession()).data.session;
    for (let i = 0; !session && i < 8; i++) {
      await new Promise((r) => setTimeout(r, 500));
      session = (await supabase.auth.getSession()).data.session;
    }
    if (!session) {
      try { await supabase.auth.refreshSession(); } catch {}
      session = (await supabase.auth.getSession()).data.session;
    }
    if (!session?.access_token) {
      navigate({ to: "/auth", replace: true });
      return;
    }

    // 2) Валидируем пользователя на сервере авторизации.
    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u.user) {
      setAccessError("Не удалось проверить сессию. Попробуйте ещё раз.");
      setChecking(false);
      return;
    }

    // 3) Проверка роли с ретраями. Сначала RPC is_admin(), затем fallback на user_roles.
    const attempt = async (): Promise<"admin" | "not_admin" | "transient"> => {
      const rpc = await supabase.rpc("is_admin");
      if (!rpc.error) return rpc.data === true ? "admin" : "not_admin";
      const q = await supabase
        .from("user_roles").select("role")
        .eq("user_id", u.user!.id).eq("role", "admin").maybeSingle();
      if (q.error) return "transient";
      return q.data ? "admin" : "not_admin";
    };

    let verdict: "admin" | "not_admin" | "transient" = "transient";
    for (let i = 0; i < 4; i++) {
      verdict = await attempt();
      if (verdict !== "transient") break;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }

    if (verdict === "admin") { setChecking(false); return; }
    if (verdict === "not_admin") { navigate({ to: "/dashboard", replace: true }); return; }
    setAccessError("Сервис ролей временно недоступен. Мы не выполнили редирект — повторите проверку.");
    setChecking(false);
  }, [navigate]);

  useEffect(() => { void runCheck(); }, [runCheck]);

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/" }); };

  if (checking) return <CenterLoader label="Проверка доступа" />;
  if (accessError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm rounded-2xl border border-border bg-card p-5 text-center">
          <Shield className="mx-auto size-6 text-primary" />
          <h1 className="mt-2 text-sm font-bold">Проверка доступа не завершена</h1>
          <p className="mt-1 text-xs text-muted-foreground">{accessError}</p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => void runCheck()} className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Повторить</button>
            <button onClick={() => navigate({ to: "/dashboard" })} className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-bold">В кабинет</button>
          </div>
        </div>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; Icon: typeof Users }[] = [
    { id: "overview", label: "Обзор", Icon: LayoutDashboard },
    { id: "users", label: "Пользователи", Icon: Users },
    { id: "offers", label: "Офферы", Icon: Package },
    { id: "payouts", label: "Выплаты", Icon: Wallet },
    { id: "requests", label: "Заявки", Icon: ClipboardList },
    { id: "conversions", label: "Конверсии", Icon: Activity },
    { id: "broadcast", label: "Рассылка", Icon: Bell },
    { id: "tools", label: "Инструменты", Icon: Wrench },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <button onClick={() => navigate({ to: "/dashboard" })} aria-label="Назад" className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
            <ArrowLeft className="size-4" />
          </button>
          <Shield className="size-4 text-primary" />
          <span className="text-sm font-bold uppercase tracking-tight">Админ-панель</span>
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase text-primary">only admin</span>
        </div>
        <button onClick={signOut} aria-label="Выйти" className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
          <LogOut className="size-4" />
        </button>
      </header>

      <nav className="sticky top-14 z-10 flex gap-1 overflow-x-auto border-b border-border bg-background/80 px-3 py-2 backdrop-blur-md">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
              tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}>
            <t.Icon className="size-3.5" /> {t.label}
          </button>
        ))}
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-4">
        {tab === "overview" && <OverviewTab />}
        {tab === "users" && <UsersTab />}
        {tab === "offers" && <OffersTab />}
        {tab === "payouts" && <PayoutsTab />}
        {tab === "requests" && <RequestsTab />}
        {tab === "conversions" && <ConversionsTab />}
        {tab === "broadcast" && <BroadcastTab />}
        {tab === "tools" && <AdminToolsTab />}
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

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{text}</div>;
}

/* Utils */
const copy = (v: string) => navigator.clipboard?.writeText(v).catch(() => {});
const fmt = (n: number) => Number(n || 0).toLocaleString("ru-RU");
const dt = (s: string) => new Date(s).toLocaleString("ru-RU");

function exportCSV(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = `${name}.csv`; a.click(); URL.revokeObjectURL(url);
}

/* =========================== OVERVIEW =========================== */
function OverviewTab() {
  const [s, setS] = useState<{
    users: number; admins: number; offers: number; offersActive: number;
    payoutsPending: number; payoutsPendingSum: number; payoutsPaidSum: number;
    reqNew: number; convToday: number; convTotal: number; revenueTotal: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const dayAgo = new Date(Date.now() - 86400000).toISOString();
    const [uc, rc, oc, oac, pp, ppSum, ppaid, rn, ct, cAll] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin"),
      supabase.from("offers").select("*", { count: "exact", head: true }),
      supabase.from("offers").select("*", { count: "exact", head: true }).eq("active", true),
      supabase.from("payout_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("payout_requests").select("amount").in("status", ["pending", "processing"]),
      supabase.from("payout_requests").select("amount").eq("status", "paid"),
      supabase.from("link_requests").select("*", { count: "exact", head: true }).in("status", ["new", "review"]),
      supabase.from("conversions").select("*", { count: "exact", head: true }).gte("created_at", dayAgo),
      supabase.from("conversions").select("amount,status"),
    ]);
    setS({
      users: uc.count ?? 0, admins: rc.count ?? 0,
      offers: oc.count ?? 0, offersActive: oac.count ?? 0,
      payoutsPending: pp.count ?? 0,
      payoutsPendingSum: (ppSum.data ?? []).reduce((a, r: any) => a + Number(r.amount || 0), 0),
      payoutsPaidSum: (ppaid.data ?? []).reduce((a, r: any) => a + Number(r.amount || 0), 0),
      reqNew: rn.count ?? 0,
      convToday: ct.count ?? 0,
      convTotal: (cAll.data ?? []).length,
      revenueTotal: (cAll.data ?? []).filter((c: any) => c.status === "approved").reduce((a, c: any) => a + Number(c.amount || 0), 0),
    });
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading || !s) return <CenterLoader label="Загрузка метрик" />;

  const cards = [
    { label: "Пользователей", value: fmt(s.users), Icon: Users, color: "text-primary" },
    { label: "Админов", value: fmt(s.admins), Icon: Shield, color: "text-primary" },
    { label: "Всего офферов", value: fmt(s.offers), Icon: Package, color: "text-foreground" },
    { label: "Активных", value: fmt(s.offersActive), Icon: TrendingUp, color: "text-emerald-500" },
    { label: "Заявок на выплату", value: fmt(s.payoutsPending), Icon: Wallet, color: "text-[color:var(--warning)]" },
    { label: "К выплате, ₽", value: fmt(s.payoutsPendingSum), Icon: DollarSign, color: "text-[color:var(--warning)]" },
    { label: "Выплачено всего, ₽", value: fmt(s.payoutsPaidSum), Icon: Check, color: "text-emerald-500" },
    { label: "Заявок на ссылки", value: fmt(s.reqNew), Icon: ClipboardList, color: "text-primary" },
    { label: "Конверсий за 24ч", value: fmt(s.convToday), Icon: Activity, color: "text-primary" },
    { label: "Конверсий всего", value: fmt(s.convTotal), Icon: BarChart3, color: "text-foreground" },
    { label: "Доход, ₽", value: fmt(s.revenueTotal), Icon: DollarSign, color: "text-emerald-500" },
  ];

  return (
    <div className="space-y-3">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Ключевые метрики</h2>
        <button onClick={load} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-bold hover:bg-accent">
          <RefreshCw className="size-3" /> Обновить
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-3">
            <c.Icon className={`mb-2 size-4 ${c.color}`} />
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{c.label}</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================== USERS =========================== */
function UsersTab() {
  const [rows, setRows] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [sort, setSort] = useState<"new" | "old" | "name">("new");
  const [detail, setDetail] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: profiles }, { data: rr }] = await Promise.all([
      supabase.from("profiles").select("id,email,display_name,telegram,created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    setRows((profiles ?? []) as Profile[]);
    const map: Record<string, Set<string>> = {};
    for (const r of (rr ?? []) as RoleRow[]) (map[r.user_id] ??= new Set()).add(r.role);
    setRoles(map);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = rows.filter((p) => {
      if (query && !(p.email?.toLowerCase().includes(query) || p.display_name?.toLowerCase().includes(query) || p.id.includes(query))) return false;
      const isAdmin = roles[p.id]?.has("admin") ?? false;
      if (roleFilter === "admin" && !isAdmin) return false;
      if (roleFilter === "user" && isAdmin) return false;
      return true;
    });
    if (sort === "new") list = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (sort === "old") list = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
    if (sort === "name") list = [...list].sort((a, b) => (a.display_name || a.email || "").localeCompare(b.display_name || b.email || ""));
    return list;
  }, [rows, roles, q, roleFilter, sort]);

  const toggleAdmin = async (userId: string, makeAdmin: boolean) => {
    setBusy(userId);
    if (makeAdmin) await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    else await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    setBusy(null); load();
  };

  if (loading) return <CenterLoader label="Загрузка пользователей" />;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск: email, имя, id"
            className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs">
          <option value="all">Все роли</option><option value="admin">Только админы</option><option value="user">Только пользователи</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as any)}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs">
          <option value="new">Сначала новые</option><option value="old">Сначала старые</option><option value="name">По имени</option>
        </select>
        <button onClick={() => exportCSV("users", filtered.map((p) => ({ ...p, is_admin: roles[p.id]?.has("admin") ? 1 : 0 })))}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[11px] font-bold hover:bg-accent">
          <Download className="size-3" /> CSV
        </button>
        <button onClick={load} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[11px] font-bold hover:bg-accent">
          <RefreshCw className="size-3" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">Найдено: <span className="font-bold text-foreground">{filtered.length}</span> / {rows.length}</p>

      {filtered.map((p) => {
        const isAdmin = roles[p.id]?.has("admin") ?? false;
        return (
          <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
            <button onClick={() => setDetail(p)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-bold">{p.display_name || p.email || "Без имени"}</p>
              <p className="truncate text-[11px] text-muted-foreground">{p.email} · {p.telegram || "без tg"} · {dt(p.created_at)}</p>
            </button>
            {isAdmin && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">admin</span>}
            <button onClick={() => copy(p.email || "")} title="Копировать email" className="grid size-7 place-items-center rounded-md hover:bg-accent"><Copy className="size-3.5" /></button>
            <button disabled={busy === p.id} onClick={() => toggleAdmin(p.id, !isAdmin)}
              className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition ${isAdmin ? "border-destructive/40 text-destructive hover:bg-destructive/10" : "border-primary/40 text-primary hover:bg-primary/10"}`}>
              {busy === p.id ? "…" : isAdmin ? "Снять" : "Admin"}
            </button>
          </div>
        );
      })}
      {filtered.length === 0 && <EmptyState text="Никого не нашли" />}

      {detail && <UserDetailSheet profile={detail} isAdmin={roles[detail.id]?.has("admin") ?? false} onClose={() => setDetail(null)} onChanged={load} />}
    </div>
  );
}

function UserDetailSheet({ profile, isAdmin, onClose, onChanged }: { profile: Profile; isAdmin: boolean; onClose: () => void; onChanged: () => void }) {
  const [name, setName] = useState(profile.display_name ?? "");
  const [tg, setTg] = useState(profile.telegram ?? "");
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<{ payouts: number; reqs: number; convs: number; earned: number } | null>(null);

  useEffect(() => {
    (async () => {
      const [p, r, c] = await Promise.all([
        supabase.from("payout_requests").select("amount,status").eq("user_id", profile.id),
        supabase.from("link_requests").select("id").eq("user_id", profile.id),
        supabase.from("conversions").select("amount,status").eq("user_id", profile.id),
      ]);
      setStats({
        payouts: (p.data ?? []).length, reqs: (r.data ?? []).length, convs: (c.data ?? []).length,
        earned: (c.data ?? []).filter((x: any) => x.status === "approved").reduce((a, x: any) => a + Number(x.amount || 0), 0),
      });
    })();
  }, [profile.id]);

  const save = async () => {
    setSaving(true);
    await supabase.from("profiles").update({ display_name: name || null, telegram: tg || null }).eq("id", profile.id);
    setSaving(false); onChanged(); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card p-5 md:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Пользователь</h2>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-full hover:bg-accent"><X className="size-4" /></button>
        </div>
        <div className="mb-3 rounded-lg border border-border bg-background p-3 text-[11px]">
          <p className="font-mono text-muted-foreground">{profile.id}</p>
          <p className="mt-1">{profile.email} · создан {dt(profile.created_at)}</p>
          {isAdmin && <p className="mt-1 font-bold text-primary">Роль: admin</p>}
        </div>
        {stats && (
          <div className="mb-3 grid grid-cols-4 gap-2 text-center">
            <StatMini label="Заявки" v={stats.reqs} />
            <StatMini label="Выплаты" v={stats.payouts} />
            <StatMini label="Конв." v={stats.convs} />
            <StatMini label="₽" v={stats.earned} />
          </div>
        )}
        <div className="space-y-3">
          <label className="block"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Отображаемое имя</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
          <label className="block"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Telegram</span>
            <input value={tg} onChange={(e) => setTg(e.target.value)} className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
          <button disabled={saving} onClick={save} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60">
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
function StatMini({ label, v }: { label: string; v: number }) {
  return <div className="rounded-lg border border-border bg-background p-2"><p className="text-lg font-bold tabular-nums">{fmt(v)}</p><p className="text-[9px] uppercase text-muted-foreground">{label}</p></div>;
}

/* =========================== OFFERS =========================== */
function OffersTab() {
  const [rows, setRows] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const [tagF, setTagF] = useState("all");
  const [activeF, setActiveF] = useState<"all" | "yes" | "no">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("offers").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Offer[]);
    setLoading(false); setSelected(new Set());
  }, []);
  useEffect(() => { load(); }, [load]);

  const tags = useMemo(() => Array.from(new Set(rows.map((r) => r.tag).filter(Boolean))), [rows]);
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((o) => {
      if (query && !(o.name.toLowerCase().includes(query) || o.id.toLowerCase().includes(query) || (o.advertiser ?? "").toLowerCase().includes(query))) return false;
      if (tagF !== "all" && o.tag !== tagF) return false;
      if (activeF === "yes" && !o.active) return false;
      if (activeF === "no" && o.active) return false;
      return true;
    });
  }, [rows, q, tagF, activeF]);

  const remove = async (id: string) => {
    if (!confirm("Удалить оффер?")) return;
    await supabase.from("offers").delete().eq("id", id); load();
  };
  const toggle = async (o: Offer) => { await supabase.from("offers").update({ active: !o.active }).eq("id", o.id); load(); };
  const duplicate = async (o: Offer) => {
    const newId = `${o.id}-copy-${Date.now().toString(36).slice(-4)}`;
    const { id: _omit, created_at: _omit2, ...payload } = o;
    await supabase.from("offers").insert({ ...payload, id: newId, name: `${o.name} (копия)` });
    load();
  };
  const toggleSel = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const bulkActivate = async (v: boolean) => {
    if (!selected.size) return;
    await supabase.from("offers").update({ active: v }).in("id", Array.from(selected)); load();
  };
  const bulkDelete = async () => {
    if (!selected.size || !confirm(`Удалить ${selected.size} офферов?`)) return;
    await supabase.from("offers").delete().in("id", Array.from(selected)); load();
  };

  if (loading) return <CenterLoader label="Загрузка офферов" />;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск: имя, id, рекламодатель"
            className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <select value={tagF} onChange={(e) => setTagF(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs">
          <option value="all">Все категории</option>
          {tags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={activeF} onChange={(e) => setActiveF(e.target.value as any)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs">
          <option value="all">Любые</option><option value="yes">Активные</option><option value="no">Выключенные</option>
        </select>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
          <Plus className="size-3.5" /> Добавить
        </button>
        <button onClick={() => exportCSV("offers", filtered as any)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[11px] font-bold hover:bg-accent">
          <Download className="size-3" /> CSV
        </button>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2 text-xs">
          <span className="font-bold">Выбрано: {selected.size}</span>
          <button onClick={() => bulkActivate(true)} className="rounded-md border border-emerald-500/40 px-2 py-1 font-bold text-emerald-500">Включить</button>
          <button onClick={() => bulkActivate(false)} className="rounded-md border border-border px-2 py-1 font-bold">Выключить</button>
          <button onClick={bulkDelete} className="rounded-md border border-destructive/40 px-2 py-1 font-bold text-destructive">Удалить</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-muted-foreground">Снять выделение</button>
        </div>
      )}

      {filtered.map((o) => (
        <div key={o.id} className="rounded-xl border border-border bg-card p-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleSel(o.id)} className="mt-1" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{o.name}</p>
                <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">{o.tag} · {o.advertiser || "—"} · {o.geo || "—"}</p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{o.id}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => copy(o.id)} title="Копировать id" className="grid size-7 place-items-center rounded-md hover:bg-accent"><Copy className="size-3.5" /></button>
              <button onClick={() => duplicate(o)} title="Дублировать" className="grid size-7 place-items-center rounded-md hover:bg-accent"><Plus className="size-3.5" /></button>
              <button onClick={() => toggle(o)} title="Активность" className="grid size-7 place-items-center rounded-md hover:bg-accent">{o.active ? <Check className="size-3.5 text-emerald-500" /> : <Ban className="size-3.5 text-destructive" />}</button>
              <button onClick={() => setEditing(o)} className="grid size-7 place-items-center rounded-md hover:bg-accent"><Pencil className="size-3.5" /></button>
              <button onClick={() => remove(o.id)} className="grid size-7 place-items-center rounded-md text-destructive hover:bg-destructive/10"><Trash2 className="size-3.5" /></button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <span>Выплата: <span className="font-bold text-foreground">{o.payout}</span></span>
            <span>EPC: <span className="font-bold text-foreground">{o.epc}</span></span>
            {o.hold && <span>Hold: <span className="font-bold text-foreground">{o.hold}</span></span>}
            <span className={o.active ? "text-emerald-500" : "text-destructive"}>{o.active ? "активен" : "выключен"}</span>
          </div>
        </div>
      ))}
      {filtered.length === 0 && <EmptyState text="Ничего не нашли" />}

      {(editing || creating) && (
        <OfferEditor offer={editing} onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); load(); }} />
      )}
    </div>
  );
}

function OfferEditor({ offer, onClose, onSaved }: { offer: Offer | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    id: offer?.id ?? "",
    name: offer?.name ?? "",
    tag: offer?.tag ?? "Финансы",
    category: offer?.category ?? "",
    advertiser: offer?.advertiser ?? "",
    geo: offer?.geo ?? "RU",
    payout: offer?.payout ?? "",
    epc: String(offer?.epc ?? 0),
    cr: String(offer?.cr ?? 0),
    hold: offer?.hold ?? "",
    goal: offer?.goal ?? "",
    landing: offer?.landing ?? "",
    description: offer?.description ?? "",
    requirements: offer?.requirements ?? "",
    allowed: (offer?.allowed ?? []).join(", "),
    denied: (offer?.denied ?? []).join(", "),
    active: offer?.active ?? true,
    is_new: offer?.is_new ?? false,
    image_url: offer?.image_url ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const splitList = (v: string) =>
    v.split(",").map((s) => s.trim()).filter(Boolean);

  const save = async () => {
    setErr(null);
    const id = (form.id || form.name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!id || !form.name.trim() || !form.payout.trim()) { setErr("Заполните id/название/выплату"); return; }
    setSaving(true);
    const payload = {
      id,
      name: form.name.trim(),
      tag: form.tag.trim(),
      category: form.category.trim() || null,
      advertiser: form.advertiser.trim() || null,
      geo: form.geo.trim() || null,
      payout: form.payout.trim(),
      epc: Number(form.epc) || 0,
      cr: Number(form.cr) || 0,
      hold: form.hold.trim() || null,
      goal: form.goal.trim() || null,
      landing: form.landing.trim() || null,
      description: form.description.trim() || null,
      requirements: form.requirements.trim() || null,
      allowed: splitList(form.allowed),
      denied: splitList(form.denied),
      active: form.active,
      is_new: form.is_new,
      image_url: form.image_url ? form.image_url : null,
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card p-5 md:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">{offer ? "Редактировать оффер" : "Новый оффер"}</h2>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-full hover:bg-accent"><X className="size-4" /></button>
        </div>
        <div className="space-y-3">
          {!offer && field("id", "ID (латиница, опционально)", "auto из названия")}
          {field("name", "Название")}
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Изображение оффера</span>
            <div className="mt-1 flex items-start gap-3">
              <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-background">
                {form.image_url ? (
                  <img src={form.image_url} alt="preview" className="size-full object-cover" />
                ) : (
                  <span className="text-[9px] uppercase text-muted-foreground">нет</span>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 3 * 1024 * 1024) { setErr("Файл больше 3 МБ"); return; }
                    const dataUrl = await new Promise<string>((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(String(reader.result));
                      reader.onerror = () => reject(reader.error);
                      reader.readAsDataURL(file);
                    });
                    // downscale to max 512px webp/jpeg to keep row small
                    const img = new Image();
                    img.onload = () => {
                      const max = 512;
                      const scale = Math.min(1, max / Math.max(img.width, img.height));
                      const w = Math.round(img.width * scale);
                      const h = Math.round(img.height * scale);
                      const canvas = document.createElement("canvas");
                      canvas.width = w; canvas.height = h;
                      const ctx = canvas.getContext("2d");
                      if (!ctx) { setForm((f) => ({ ...f, image_url: dataUrl })); return; }
                      ctx.drawImage(img, 0, 0, w, h);
                      const out = canvas.toDataURL("image/webp", 0.85);
                      setForm((f) => ({ ...f, image_url: out }));
                    };
                    img.onerror = () => setForm((f) => ({ ...f, image_url: dataUrl }));
                    img.src = dataUrl;
                  }}
                  className="block w-full text-[11px] file:mr-2 file:rounded-md file:border-0 file:bg-accent file:px-2 file:py-1 file:text-[11px] file:font-bold"
                />
                {form.image_url && (
                  <button type="button" onClick={() => setForm((f) => ({ ...f, image_url: "" }))}
                    className="text-[11px] font-bold text-destructive hover:underline">
                    Удалить изображение
                  </button>
                )}
                <p className="text-[10px] text-muted-foreground">До 3 МБ. Хранится внутри проекта (в БД, как data URL).</p>
              </div>
            </div>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {field("tag", "Тег", "Финансы / Edu / Travel")}
            {field("category", "Категория", "Кредиты, курсы…")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("advertiser", "Рекламодатель")}
            {field("geo", "ГЕО", "RU, KZ, BY")}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {field("payout", "Выплата", "3500 ₽")}
            {field("epc", "EPC")}
            {field("cr", "CR, %")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("hold", "Hold", "14 дн.")}
            {field("goal", "Цель", "Одобренная заявка")}
          </div>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Партнёрская ссылка (её копирует пользователь)</span>
            <input type="url" value={form.landing} placeholder="https://track.example.com/?sub={sub}"
              onChange={(e) => setForm((f) => ({ ...f, landing: e.target.value }))}
              className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
          </label>
          <label className="block"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Описание</span>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3}
              className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
          <label className="block"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Требования</span>
            <textarea value={form.requirements} onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))} rows={2}
              className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Разрешённый трафик (через запятую)</span>
            <textarea value={form.allowed} onChange={(e) => setForm((f) => ({ ...f, allowed: e.target.value }))} rows={2}
              placeholder="SEO, Telegram, Email"
              className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Запрещённый трафик (через запятую)</span>
            <textarea value={form.denied} onChange={(e) => setForm((f) => ({ ...f, denied: e.target.value }))} rows={2}
              placeholder="Мотив, Brand bidding, Adult"
              className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
              Активный
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_new} onChange={(e) => setForm((f) => ({ ...f, is_new: e.target.checked }))} />
              Метка NEW
            </label>
          </div>
          {err && <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{err}</p>}
          <button disabled={saving} onClick={save} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60">
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================== PAYOUTS =========================== */
function PayoutsTab() {
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [statusF, setStatusF] = useState<"all" | PayoutRow["status"]>("all");
  const [q, setQ] = useState("");
  const [noteEdit, setNoteEdit] = useState<PayoutRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("payout_requests").select("*").order("created_at", { ascending: false });
    const list = (data ?? []) as PayoutRow[]; setRows(list);
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

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusF !== "all" && r.status !== statusF) return false;
      if (query) {
        const u = profiles[r.user_id];
        if (!(u?.email?.toLowerCase().includes(query) || u?.display_name?.toLowerCase().includes(query) || r.destination?.toLowerCase().includes(query))) return false;
      }
      return true;
    });
  }, [rows, statusF, q, profiles]);

  const totals = useMemo(() => {
    const t = { pending: 0, processing: 0, paid: 0, rejected: 0 } as Record<PayoutRow["status"], number>;
    for (const r of rows) t[r.status] += Number(r.amount || 0);
    return t;
  }, [rows]);

  const setStatus = async (id: string, status: PayoutRow["status"]) => {
    await supabase.from("payout_requests").update({ status }).eq("id", id); load();
  };
  const del = async (id: string) => { if (!confirm("Удалить заявку?")) return; await supabase.from("payout_requests").delete().eq("id", id); load(); };

  if (loading) return <CenterLoader label="Загрузка выплат" />;

  const badges: Record<PayoutRow["status"], string> = {
    pending: "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
    processing: "bg-primary/15 text-primary",
    paid: "bg-emerald-500/15 text-emerald-500",
    rejected: "bg-destructive/15 text-destructive",
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SumCard label="Ожидают" v={totals.pending} tone="warning" />
        <SumCard label="В работе" v={totals.processing} tone="primary" />
        <SumCard label="Выплачено" v={totals.paid} tone="success" />
        <SumCard label="Отклонены" v={totals.rejected} tone="danger" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск: email/имя/реквизиты"
            className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-sm" />
        </div>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value as any)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs">
          <option value="all">Все статусы</option>
          <option value="pending">Ожидают</option><option value="processing">В работе</option>
          <option value="paid">Выплачены</option><option value="rejected">Отклонены</option>
        </select>
        <button onClick={() => exportCSV("payouts", filtered as any)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[11px] font-bold hover:bg-accent">
          <Download className="size-3" /> CSV
        </button>
      </div>

      {filtered.map((r) => {
        const u = profiles[r.user_id];
        return (
          <div key={r.id} className="rounded-xl border border-border bg-card p-3">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold">{fmt(Number(r.amount))} ₽ · {r.method}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{u?.display_name || u?.email || r.user_id.slice(0, 8)}{r.destination ? ` · ${r.destination}` : ""}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{dt(r.created_at)}</p>
                {r.note && <p className="mt-1 rounded bg-background px-2 py-1 text-[11px] italic text-muted-foreground">«{r.note}»</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${badges[r.status]}`}>{r.status}</span>
                <div className="flex gap-1">
                  <button onClick={() => copy(r.destination || "")} title="Копировать реквизиты" className="grid size-6 place-items-center rounded-md hover:bg-accent"><Copy className="size-3" /></button>
                  <button onClick={() => setNoteEdit(r)} title="Комментарий" className="grid size-6 place-items-center rounded-md hover:bg-accent"><Pencil className="size-3" /></button>
                  <button onClick={() => del(r.id)} title="Удалить" className="grid size-6 place-items-center rounded-md text-destructive hover:bg-destructive/10"><Trash2 className="size-3" /></button>
                </div>
              </div>
            </div>
            {(r.status === "pending" || r.status === "processing") && (
              <div className="flex gap-2">
                <button onClick={() => setStatus(r.id, "processing")} className="flex-1 rounded-lg border border-primary/40 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/10">В работу</button>
                <button onClick={() => setStatus(r.id, "paid")} className="flex-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-background hover:bg-emerald-600"><Check className="mr-1 inline size-3" />Выплатить</button>
                <button onClick={() => setStatus(r.id, "rejected")} className="rounded-lg border border-destructive/40 px-3 py-1.5 text-[11px] font-bold text-destructive hover:bg-destructive/10"><X className="size-3" /></button>
              </div>
            )}
          </div>
        );
      })}
      {filtered.length === 0 && <EmptyState text="Пусто" />}

      {noteEdit && <NoteEditor row={noteEdit} onClose={() => setNoteEdit(null)} onSaved={() => { setNoteEdit(null); load(); }} />}
    </div>
  );
}

function SumCard({ label, v, tone }: { label: string; v: number; tone: "warning" | "primary" | "success" | "danger" }) {
  const cls = { warning: "text-[color:var(--warning)]", primary: "text-primary", success: "text-emerald-500", danger: "text-destructive" }[tone];
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-base font-bold tabular-nums ${cls}`}>{fmt(v)} ₽</p>
    </div>
  );
}

function NoteEditor({ row, onClose, onSaved }: { row: PayoutRow; onClose: () => void; onSaved: () => void }) {
  const [note, setNote] = useState(row.note ?? "");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    await supabase.from("payout_requests").update({ note: note || null }).eq("id", row.id);
    setSaving(false); onSaved();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-card p-5 md:rounded-2xl">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-bold">Комментарий к выплате</h2>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-full hover:bg-accent"><X className="size-4" /></button></div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <button disabled={saving} onClick={save} className="mt-3 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60">
          {saving ? "…" : "Сохранить"}
        </button>
      </div>
    </div>
  );
}

/* =========================== REQUESTS =========================== */
function RequestsTab() {
  const [rows, setRows] = useState<LinkRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [statusF, setStatusF] = useState<"all" | LinkRow["status"]>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("link_requests").select("*").order("created_at", { ascending: false });
    const list = (data ?? []) as LinkRow[]; setRows(list); setSelected(new Set());
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

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusF !== "all" && r.status !== statusF) return false;
      if (query && !(r.offer_name.toLowerCase().includes(query) || r.source?.toLowerCase().includes(query) || r.sub?.toLowerCase().includes(query))) return false;
      return true;
    });
  }, [rows, statusF, q]);

  const setStatus = async (id: string, status: LinkRow["status"]) => { await supabase.from("link_requests").update({ status }).eq("id", id); load(); };
  const del = async (id: string) => { if (!confirm("Удалить заявку?")) return; await supabase.from("link_requests").delete().eq("id", id); load(); };
  const bulk = async (status: LinkRow["status"]) => { if (!selected.size) return; await supabase.from("link_requests").update({ status }).in("id", Array.from(selected)); load(); };
  const bulkDel = async () => { if (!selected.size || !confirm(`Удалить ${selected.size} заявок?`)) return; await supabase.from("link_requests").delete().in("id", Array.from(selected)); load(); };
  const toggleSel = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (loading) return <CenterLoader label="Загрузка заявок" />;

  const badges: Record<LinkRow["status"], string> = {
    new: "bg-primary/15 text-primary",
    review: "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
    approved: "bg-emerald-500/15 text-emerald-500",
    rejected: "bg-destructive/15 text-destructive",
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск: оффер, source, sub"
            className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-sm" />
        </div>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value as any)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs">
          <option value="all">Все</option><option value="new">Новые</option><option value="review">На проверке</option>
          <option value="approved">Одобрены</option><option value="rejected">Отклонены</option>
        </select>
        <button onClick={() => exportCSV("requests", filtered as any)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[11px] font-bold hover:bg-accent">
          <Download className="size-3" /> CSV
        </button>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2 text-xs">
          <span className="font-bold">Выбрано: {selected.size}</span>
          <button onClick={() => bulk("approved")} className="rounded-md border border-emerald-500/40 px-2 py-1 font-bold text-emerald-500">Одобрить</button>
          <button onClick={() => bulk("review")} className="rounded-md border border-border px-2 py-1 font-bold">На проверку</button>
          <button onClick={() => bulk("rejected")} className="rounded-md border border-destructive/40 px-2 py-1 font-bold text-destructive">Отклонить</button>
          <button onClick={bulkDel} className="rounded-md border border-destructive/40 px-2 py-1 font-bold text-destructive">Удалить</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-muted-foreground">Сброс</button>
        </div>
      )}

      {filtered.map((r) => {
        const u = profiles[r.user_id];
        return (
          <div key={r.id} className="rounded-xl border border-border bg-card p-3">
            <div className="mb-2 flex items-start gap-2">
              <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSel(r.id)} className="mt-1" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{r.offer_name}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{u?.display_name || u?.email || r.user_id.slice(0, 8)} · {r.source || "—"}{r.sub ? ` / ${r.sub}` : ""}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{dt(r.created_at)}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${badges[r.status]}`}>{r.status}</span>
                <button onClick={() => del(r.id)} title="Удалить" className="grid size-6 place-items-center rounded-md text-destructive hover:bg-destructive/10"><Trash2 className="size-3" /></button>
              </div>
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
      {filtered.length === 0 && <EmptyState text="Пусто" />}
    </div>
  );
}

/* =========================== CONVERSIONS =========================== */
function ConversionsTab() {
  const [rows, setRows] = useState<Conversion[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState<"all" | "approved" | "pending" | "rejected">("all");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("conversions").select("*").order("created_at", { ascending: false }).limit(500);
    const list = (data ?? []) as Conversion[]; setRows(list);
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

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusF !== "all" && r.status !== statusF) return false;
      if (query && !(r.offer_name.toLowerCase().includes(query) || (profiles[r.user_id]?.email ?? "").toLowerCase().includes(query))) return false;
      return true;
    });
  }, [rows, q, statusF, profiles]);

  const setStatus = async (id: string, status: string) => { await supabase.from("conversions").update({ status }).eq("id", id); load(); };
  const del = async (id: string) => { if (!confirm("Удалить конверсию?")) return; await supabase.from("conversions").delete().eq("id", id); load(); };

  const total = filtered.reduce((a, r) => a + Number(r.amount || 0), 0);
  const approved = filtered.filter((r) => r.status === "approved").reduce((a, r) => a + Number(r.amount || 0), 0);

  if (loading) return <CenterLoader label="Загрузка конверсий" />;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <SumCard label="Всего" v={total} tone="primary" />
        <SumCard label="Апрув" v={approved} tone="success" />
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Записей</p>
          <p className="mt-0.5 text-base font-bold tabular-nums">{fmt(filtered.length)}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск: оффер / email"
            className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-sm" />
        </div>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value as any)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs">
          <option value="all">Все</option><option value="approved">Апрув</option><option value="pending">Ожидание</option><option value="rejected">Отмена</option>
        </select>
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
          <Plus className="size-3.5" /> Добавить
        </button>
        <button onClick={() => exportCSV("conversions", filtered as any)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[11px] font-bold hover:bg-accent">
          <Download className="size-3" /> CSV
        </button>
      </div>

      {filtered.map((r) => {
        const u = profiles[r.user_id];
        const cls = r.status === "approved" ? "text-emerald-500" : r.status === "rejected" ? "text-destructive" : "text-[color:var(--warning)]";
        return (
          <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{r.offer_name} · <span className="tabular-nums">{fmt(Number(r.amount))} ₽</span></p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{u?.email || r.user_id.slice(0, 8)} · {dt(r.created_at)}</p>
            </div>
            <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)}
              className={`rounded-md border border-border bg-background px-2 py-1 text-[11px] font-bold ${cls}`}>
              <option value="pending">pending</option><option value="approved">approved</option><option value="rejected">rejected</option>
            </select>
            <button onClick={() => del(r.id)} className="grid size-7 place-items-center rounded-md text-destructive hover:bg-destructive/10"><Trash2 className="size-3.5" /></button>
          </div>
        );
      })}
      {filtered.length === 0 && <EmptyState text="Нет конверсий" />}

      {adding && <AddConversion onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </div>
  );
}

function AddConversion({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [userId, setUserId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [offerName, setOfferName] = useState("");
  const [amount, setAmount] = useState("0");
  const [status, setStatus] = useState("approved");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    if (!userId.trim() || !offerName.trim()) { setErr("Заполните user_id и название оффера"); return; }
    setSaving(true);
    const { error } = await supabase.from("conversions").insert({
      user_id: userId.trim(), offer_id: offerId.trim() || null, offer_name: offerName.trim(),
      amount: Number(amount) || 0, status,
    });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-card p-5 md:rounded-2xl">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-bold">Добавить конверсию</h2>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-full hover:bg-accent"><X className="size-4" /></button></div>
        <div className="space-y-3">
          <label className="block"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">user_id (UUID)</span>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">offer_id</span>
              <input value={offerId} onChange={(e) => setOfferId(e.target.value)} className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
            <label className="block"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Сумма ₽</span>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
          </div>
          <label className="block"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Название оффера</span>
            <input value={offerName} onChange={(e) => setOfferName(e.target.value)} className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
          <label className="block"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Статус</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="pending">pending</option><option value="approved">approved</option><option value="rejected">rejected</option>
            </select></label>
          {err && <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{err}</p>}
          <button disabled={saving} onClick={save} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60">
            {saving ? "…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================== BROADCAST =========================== */
function BroadcastTab() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"info" | "success" | "warning">("info");
  const [target, setTarget] = useState<"all" | "one">("all");
  const [userId, setUserId] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [recent, setRecent] = useState<{ id: string; title: string; body: string; kind: string; user_id: string; read: boolean; created_at: string }[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from("notifications").select("id,title,body,kind,user_id,read,created_at").order("created_at", { ascending: false }).limit(50);
    setRecent((data ?? []) as any);
  }, []);
  useEffect(() => { load(); }, [load]);

  const send = async () => {
    setMsg(null);
    if (!title.trim() || !body.trim()) { setMsg("Заполните заголовок и текст"); return; }
    setSending(true);
    let targets: string[] = [];
    if (target === "one") {
      if (!userId.trim()) { setMsg("Укажите user_id"); setSending(false); return; }
      targets = [userId.trim()];
    } else {
      const { data } = await supabase.from("profiles").select("id");
      targets = (data ?? []).map((p: any) => p.id);
    }
    const payload = targets.map((id) => ({ user_id: id, title: title.trim(), body: body.trim(), kind }));
    const { error } = await supabase.from("notifications").insert(payload);
    setSending(false);
    if (error) { setMsg(`Ошибка: ${error.message}`); return; }
    setMsg(`Отправлено: ${targets.length} получателям`);
    setTitle(""); setBody(""); load();
  };

  const del = async (id: string) => { await supabase.from("notifications").delete().eq("id", id); load(); };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider">Новое уведомление</h3>
        <div className="flex gap-2 text-xs">
          <button onClick={() => setTarget("all")} className={`rounded-full px-3 py-1 font-bold ${target === "all" ? "bg-primary text-primary-foreground" : "border border-border"}`}>Всем</button>
          <button onClick={() => setTarget("one")} className={`rounded-full px-3 py-1 font-bold ${target === "one" ? "bg-primary text-primary-foreground" : "border border-border"}`}>Одному</button>
        </div>
        {target === "one" && (
          <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="user_id (UUID)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono" />
        )}
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Заголовок"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Текст" rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <div className="flex items-center gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value as any)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs">
            <option value="info">info</option><option value="success">success</option><option value="warning">warning</option>
          </select>
          <button disabled={sending} onClick={send} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">
            <Send className="size-3.5" /> {sending ? "Отправка…" : "Отправить"}
          </button>
        </div>
        {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">Последние уведомления</h3>
        <div className="space-y-2">
          {recent.map((n) => (
            <div key={n.id} className="flex items-start justify-between gap-2 rounded-xl border border-border bg-card p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{n.title} <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-[9px] uppercase text-muted-foreground">{n.kind}</span></p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{n.body}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{n.user_id.slice(0, 8)} · {dt(n.created_at)} · {n.read ? "прочитано" : "новое"}</p>
              </div>
              <button onClick={() => del(n.id)} className="grid size-7 place-items-center rounded-md text-destructive hover:bg-destructive/10"><Trash2 className="size-3.5" /></button>
            </div>
          ))}
          {recent.length === 0 && <EmptyState text="Ещё нет уведомлений" />}
        </div>
      </div>
    </div>
  );
}
