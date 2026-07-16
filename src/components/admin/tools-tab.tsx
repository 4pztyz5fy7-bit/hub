import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Wrench, Download, Upload, RefreshCw, Users, Package, Wallet, ClipboardList,
  Activity, Bell, Copy, Check, Trash2, Ban, ShieldCheck, TrendingUp, Star,
  Filter, Search, StickyNote, Send, Coins, Percent, Globe, Zap, Sparkles,
  ChevronDown, ChevronUp, KeyRound, PlayCircle, DollarSign, Clock, AlertTriangle,
  FileText, Landmark, Target, Gift, EyeOff,
} from "lucide-react";

const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); } catch {} };
const download = (n: string, c: string, t = "text/plain") => {
  const b = new Blob([c], { type: t }); const u = URL.createObjectURL(b);
  const a = document.createElement("a"); a.href = u; a.download = n; a.click();
  setTimeout(() => URL.revokeObjectURL(u), 500);
};
const toCsv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return "";
  const k = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [k.join(","), ...rows.map((r) => k.map((x) => esc(r[x])).join(","))].join("\n");
};
const LS = (k: string, fb = "") => { try { return localStorage.getItem(k) ?? fb; } catch { return fb; } };
const setLS = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };
const num = (v: string) => Number(v.replace(",", ".")) || 0;

export function AdminToolsTab() {
  const [group, setGroup] = useState("bulk");
  const groups = [
    { id: "bulk", label: "Массовые", Icon: Zap },
    { id: "exports", label: "Экспорт", Icon: Download },
    { id: "moderation", label: "Модерация", Icon: ShieldCheck },
    { id: "analytics", label: "Аналитика", Icon: TrendingUp },
    { id: "quality", label: "Качество", Icon: AlertTriangle },
    { id: "system", label: "Система", Icon: Wrench },
  ];
  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2"><Wrench className="size-4 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wider">Инструменты администратора</h2></div>
        <p className="mt-1 text-[11px] text-muted-foreground">50+ операций: массовые действия, экспорт, аналитика, чистка данных и настройки платформы.</p>
      </header>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {groups.map((g) => (
          <button key={g.id} onClick={() => setGroup(g.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${group === g.id ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:text-foreground"}`}>
            <g.Icon className="size-3.5" /> {g.label}
          </button>
        ))}
      </div>
      {group === "bulk" && <BulkTools />}
      {group === "exports" && <ExportsTools />}
      {group === "moderation" && <ModerationTools />}
      {group === "analytics" && <AnalyticsTools />}
      {group === "quality" && <QualityTools />}
      {group === "system" && <SystemTools />}
    </div>
  );
}

/* Shared */
function Card({ title, Icon, children, defaultOpen = false }: { title: string; Icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; defaultOpen?: boolean }) {
  const [o, setO] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card">
      <button onClick={() => setO((v) => !v)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
        <Icon className="size-3.5 text-primary" /><span className="flex-1 text-[12px] font-bold">{title}</span>
        {o ? <ChevronUp className="size-3.5 text-muted-foreground" /> : <ChevronDown className="size-3.5 text-muted-foreground" />}
      </button>
      {o && <div className="border-t border-border p-3">{children}</div>}
    </div>
  );
}
function Input(p: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...p} className={`w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-[12px] outline-none focus:ring-2 focus:ring-primary/40 ${p.className ?? ""}`} />; }
function Textarea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...p} className={`w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-[12px] ${p.className ?? ""}`} />; }
function Btn({ children, onClick, tone = "default" }: { children: React.ReactNode; onClick?: () => void; tone?: "default" | "primary" | "danger" | "success" }) {
  const c = tone === "primary" ? "bg-primary text-primary-foreground" : tone === "danger" ? "border border-destructive/40 text-destructive" : tone === "success" ? "border border-emerald-500/40 text-emerald-500" : "border border-border";
  return <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-bold ${c}`}>{children}</button>;
}
function Result({ value }: { value: string }) {
  return <div className="rounded-md border border-border bg-secondary/40 px-2 py-1.5 font-mono text-[11px]"><pre className="whitespace-pre-wrap break-all">{value || "—"}</pre></div>;
}
function useToast() {
  const [t, setT] = useState<string | null>(null);
  useEffect(() => { if (t) { const x = setTimeout(() => setT(null), 2400); return () => clearTimeout(x); } }, [t]);
  return { t, show: setT };
}

/* ============ 1. BULK (10) ============ */
function BulkTools() {
  const { t, show } = useToast();
  return (
    <div className="space-y-2">
      {t && <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-[11px] text-primary">{t}</div>}
      <Card title="1. Активировать все офферы по тегу" Icon={Package} defaultOpen><BulkOffersActive value={true} label="Активировать" tone="success" show={show} /></Card>
      <Card title="2. Выключить все офферы по тегу" Icon={Package}><BulkOffersActive value={false} label="Выключить" tone="danger" show={show} /></Card>
      <Card title="3. Изменить выплату всем офферам категории" Icon={DollarSign}><BulkPayout show={show} /></Card>
      <Card title="4. Поставить NEW всем офферам категории" Icon={Star}><BulkIsNew value={true} label="Поставить NEW" show={show} /></Card>
      <Card title="5. Снять NEW со всех офферов" Icon={Star}><BulkIsNew value={false} label="Снять NEW" show={show} /></Card>
      <Card title="6. Массово перевести 'in_progress' → 'completed'" Icon={ClipboardList}><BulkReq status="completed" from="in_progress" label="Перевести все в completed" tone="success" show={show} /></Card>
      <Card title="7. Массово перевести 'completed' → 'finished'" Icon={ClipboardList}><BulkReq status="finished" from="completed" label="Завершить все completed" tone="success" show={show} /></Card>
      <Card title="8. Перевести все pending выплаты в processing" Icon={Wallet}><BulkPayoutStatus from="pending" to="processing" show={show} /></Card>
      <Card title="9. Пометить processing→paid" Icon={Wallet}><BulkPayoutStatus from="processing" to="paid" tone="success" show={show} /></Card>
      <Card title="10. Клонировать оффер N раз" Icon={Copy}><CloneOffer show={show} /></Card>
    </div>
  );
}
function BulkOffersActive({ value, label, tone, show }: { value: boolean; label: string; tone: "success" | "danger"; show: (s: string) => void }) {
  const [tag, setTag] = useState("");
  const run = async () => {
    if (!tag || !confirm(`${label} все офферы с тегом "${tag}"?`)) return;
    const { data, error } = await supabase.from("offers").update({ active: value }).eq("tag", tag).select("id");
    if (error) { show(`Ошибка: ${error.message}`); return; }
    show(`${label}: ${data?.length ?? 0}`);
  };
  return <div className="space-y-2"><Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="тег (напр. Финансы)" /><Btn tone={tone} onClick={run}>{label}</Btn></div>;
}
function BulkPayout({ show }: { show: (s: string) => void }) {
  const [tag, setTag] = useState(""); const [p, setP] = useState("");
  const run = async () => {
    if (!tag || !p || !confirm(`Установить payout="${p}" всем офферам тега "${tag}"?`)) return;
    const { data, error } = await supabase.from("offers").update({ payout: p }).eq("tag", tag).select("id");
    if (error) { show(`Ошибка: ${error.message}`); return; }
    show(`Обновлено: ${data?.length ?? 0}`);
  };
  return <div className="grid grid-cols-2 gap-2"><Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="тег" /><Input value={p} onChange={(e) => setP(e.target.value)} placeholder="выплата" /><Btn tone="primary" onClick={run}>Применить</Btn></div>;
}
function BulkIsNew({ value, label, show }: { value: boolean; label: string; show: (s: string) => void }) {
  const [tag, setTag] = useState("");
  const run = async () => {
    const q = supabase.from("offers").update({ is_new: value });
    const { data, error } = tag ? await q.eq("tag", tag).select("id") : await q.neq("id", "").select("id");
    if (error) { show(`Ошибка: ${error.message}`); return; }
    show(`${label}: ${data?.length ?? 0}`);
  };
  return <div className="flex gap-2"><Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="тег (пусто = все)" /><Btn tone="primary" onClick={run}>{label}</Btn></div>;
}
function BulkReq({ status, from, label, tone, show }: { status: "approved"|"rejected"|"completed"|"finished"|"paid"; from: "new"|"review"|"in_progress"|"completed"|"finished"; label: string; tone: "success"|"danger"; show: (s: string) => void }) {
  const run = async () => {
    if (!confirm(`${label}?`)) return;
    const { data, error } = await supabase.from("link_requests").update({ status }).eq("status", from).select("id");
    if (error) { show(`Ошибка: ${error.message}`); return; }
    show(`Обновлено: ${data?.length ?? 0}`);
  };
  return <Btn tone={tone} onClick={run}>{label}</Btn>;
}
function BulkPayoutStatus({ from, to, tone = "primary", show }: { from: "pending"|"processing"; to: "processing"|"paid"; tone?: "primary"|"success"; show: (s: string) => void }) {
  const run = async () => {
    if (!confirm(`Перевести все ${from} → ${to}?`)) return;
    const { data, error } = await supabase.from("payout_requests").update({ status: to }).eq("status", from).select("id");
    if (error) { show(`Ошибка: ${error.message}`); return; }
    show(`Обновлено: ${data?.length ?? 0}`);
  };
  return <Btn tone={tone === "success" ? "success" : "primary"} onClick={run}>{from} → {to}</Btn>;
}
function CloneOffer({ show }: { show: (s: string) => void }) {
  const [id, setId] = useState(""); const [n, setN] = useState("3");
  const run = async () => {
    if (!id) { show("Укажите offer id"); return; }
    const { data: src, error: e0 } = await supabase.from("offers").select("*").eq("id", id).maybeSingle();
    if (e0) { show(`Ошибка: ${e0.message}`); return; }
    if (!src) { show("Оффер не найден"); return; }
    const count = Math.max(1, Math.min(20, num(n)));
    const stamp = Date.now().toString(36);
    const rand = () => Math.random().toString(36).slice(2, 5);
    const rows = Array.from({ length: count }).map((_, i) => {
      const { id: _o, created_at: _c, updated_at: _u, ...rest } = src as Record<string, unknown>;
      return { ...rest, id: `${id}-cl-${stamp}-${rand()}${i}`, name: `${src.name} (копия ${i + 1})`, is_new: true };
    });
    const { error } = await supabase.from("offers").insert(rows as never);
    show(error ? `Ошибка: ${error.message}` : `Создано: ${rows.length}`);
  };
  return <div className="grid grid-cols-2 gap-2"><Input value={id} onChange={(e) => setId(e.target.value)} placeholder="offer id" /><Input value={n} onChange={(e) => setN(e.target.value)} placeholder="N копий" /><Btn tone="primary" onClick={run}>Клонировать</Btn></div>;
}

/* ============ 2. EXPORTS (8) ============ */
function ExportsTools() {
  return (
    <div className="space-y-2">
      <Card title="11. Экспорт офферов CSV" Icon={Download} defaultOpen><ExportBtn table="offers" /></Card>
      <Card title="12. Экспорт офферов JSON" Icon={Download}><ExportBtn table="offers" format="json" /></Card>
      <Card title="13. Экспорт профилей CSV" Icon={Users}><ExportBtn table="profiles" /></Card>
      <Card title="14. Экспорт выплат CSV" Icon={Wallet}><ExportBtn table="payout_requests" /></Card>
      <Card title="15. Экспорт заявок CSV" Icon={ClipboardList}><ExportBtn table="link_requests" /></Card>
      <Card title="16. Экспорт конверсий CSV" Icon={Activity}><ExportBtn table="conversions" /></Card>
      <Card title="17. Экспорт уведомлений CSV" Icon={Bell}><ExportBtn table="notifications" /></Card>
      <Card title="18. Импорт офферов JSON" Icon={Upload}><ImportOffers /></Card>
    </div>
  );
}
function ExportBtn({ table, format = "csv" }: { table: "offers"|"profiles"|"payout_requests"|"link_requests"|"conversions"|"notifications"; format?: "csv"|"json" }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    const { data } = await supabase.from(table).select("*");
    if (format === "json") download(`${table}.json`, JSON.stringify(data ?? [], null, 2), "application/json");
    else download(`${table}.csv`, toCsv((data ?? []) as Record<string, unknown>[]), "text/csv");
    setBusy(false);
  };
  return <Btn tone="primary" onClick={run}>{busy ? <RefreshCw className="size-3 animate-spin" /> : <Download className="size-3" />} Скачать</Btn>;
}
function ImportOffers() {
  const [log, setLog] = useState("");
  const onFile = async (f: File) => {
    try {
      const arr = JSON.parse(await f.text());
      if (!Array.isArray(arr)) throw new Error("Ожидается массив");
      const { data, error } = await supabase.from("offers").upsert(arr).select("id");
      setLog(error ? error.message : `OK: ${data?.length ?? 0}`);
    } catch (e) { setLog((e as Error).message); }
  };
  return <div className="space-y-2"><input type="file" accept="application/json" onChange={(e) => e.target.files && onFile(e.target.files[0])} className="text-[11px]" /><Result value={log} /></div>;
}

/* ============ 3. MODERATION (10) ============ */
function ModerationTools() {
  const { t, show } = useToast();
  return (
    <div className="space-y-2">
      {t && <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-[11px] text-primary">{t}</div>}
      <Card title="19. Завершить заявки 'completed' старше N дней" Icon={ClipboardList} defaultOpen><ApproveOld show={show} /></Card>
      <Card title="20. Завершить заявки пользователя" Icon={Ban}><RejectByUser show={show} /></Card>
      <Card title="21. Заморозить пользователя (снять admin)" Icon={ShieldCheck}><RevokeAdmin show={show} /></Card>
      <Card title="22. Назначить admin по email" Icon={ShieldCheck}><GrantAdmin show={show} /></Card>
      <Card title="23. Broadcast всем пользователям" Icon={Send}><Broadcast target="all" show={show} /></Card>
      <Card title="24. Broadcast только админам" Icon={Send}><Broadcast target="admins" show={show} /></Card>
      <Card title="25. Broadcast пользователям с pending-выплатой" Icon={Send}><BroadcastPending show={show} /></Card>
      <Card title="26. Отправить тестовое уведомление себе" Icon={Bell}><TestNotif show={show} /></Card>
      <Card title="27. Создать тестовую конверсию" Icon={Activity}><TestConversion show={show} /></Card>
      <Card title="28. Заметка о пользователе (локально)" Icon={StickyNote}><UserNote /></Card>
    </div>
  );
}
function ApproveOld({ show }: { show: (s: string) => void }) {
  const [d, setD] = useState("3");
  const run = async () => {
    const iso = new Date(Date.now() - num(d) * 86400000).toISOString();
    const { data } = await supabase.from("link_requests").update({ status: "approved" }).eq("status", "new").lt("created_at", iso).select("id");
    show(`Одобрено: ${data?.length ?? 0}`);
  };
  return <div className="flex gap-2"><Input value={d} onChange={(e) => setD(e.target.value)} placeholder="дней" /><Btn tone="success" onClick={run}>Одобрить</Btn></div>;
}
function RejectByUser({ show }: { show: (s: string) => void }) {
  const [u, setU] = useState("");
  const run = async () => {
    const { data } = await supabase.from("link_requests").update({ status: "rejected" }).eq("user_id", u).in("status", ["new","review"]).select("id");
    show(`Отклонено: ${data?.length ?? 0}`);
  };
  return <div className="flex gap-2"><Input value={u} onChange={(e) => setU(e.target.value)} placeholder="user_id" /><Btn tone="danger" onClick={run}>Отклонить</Btn></div>;
}
function RevokeAdmin({ show }: { show: (s: string) => void }) {
  const [u, setU] = useState("");
  const run = async () => {
    if (!confirm("Снять роль admin?")) return;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", u).eq("role", "admin");
    show(error ? error.message : "Готово");
  };
  return <div className="flex gap-2"><Input value={u} onChange={(e) => setU(e.target.value)} placeholder="user_id" /><Btn tone="danger" onClick={run}>Снять admin</Btn></div>;
}
function GrantAdmin({ show }: { show: (s: string) => void }) {
  const [email, setEmail] = useState("");
  const run = async () => {
    const { data: p } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
    if (!p) { show("Не найден"); return; }
    const { error } = await supabase.from("user_roles").insert({ user_id: p.id, role: "admin" });
    show(error ? error.message : "admin назначен");
  };
  return <div className="flex gap-2"><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" /><Btn tone="primary" onClick={run}>Назначить</Btn></div>;
}
function Broadcast({ target, show }: { target: "all"|"admins"; show: (s: string) => void }) {
  const [title, setTitle] = useState(""); const [body, setBody] = useState("");
  const run = async () => {
    if (!title || !body) return;
    let ids: string[] = [];
    if (target === "admins") {
      const { data } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      ids = (data ?? []).map((r) => r.user_id);
    } else {
      const { data } = await supabase.from("profiles").select("id");
      ids = (data ?? []).map((r) => r.id);
    }
    const rows = ids.map((user_id) => ({ user_id, kind: "system", title, body }));
    if (!rows.length) { show("Нет получателей"); return; }
    const { error } = await supabase.from("notifications").insert(rows as never);
    show(error ? error.message : `Отправлено: ${rows.length}`);
  };
  return <div className="space-y-2"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Заголовок" /><Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Сообщение" /><Btn tone="primary" onClick={run}>Отправить ({target})</Btn></div>;
}
function BroadcastPending({ show }: { show: (s: string) => void }) {
  const [title, setTitle] = useState("Ваша выплата в обработке"); const [body, setBody] = useState("Мы работаем над вашим запросом.");
  const run = async () => {
    const { data } = await supabase.from("payout_requests").select("user_id").eq("status", "pending");
    const ids = Array.from(new Set((data ?? []).map((r) => r.user_id)));
    if (!ids.length) { show("Нет получателей"); return; }
    const rows = ids.map((user_id) => ({ user_id, kind: "payout", title, body }));
    const { error } = await supabase.from("notifications").insert(rows as never);
    show(error ? error.message : `Отправлено: ${rows.length}`);
  };
  return <div className="space-y-2"><Input value={title} onChange={(e) => setTitle(e.target.value)} /><Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} /><Btn tone="primary" onClick={run}>Отправить</Btn></div>;
}
function TestNotif({ show }: { show: (s: string) => void }) {
  const run = async () => {
    const { data: u } = await supabase.auth.getUser(); if (!u.user) return;
    const { error } = await supabase.from("notifications").insert({ user_id: u.user.id, kind: "system", title: "Тест", body: `Проверка в ${new Date().toLocaleTimeString()}` });
    show(error ? error.message : "Отправлено");
  };
  return <Btn tone="primary" onClick={run}>Отправить</Btn>;
}
function TestConversion({ show }: { show: (s: string) => void }) {
  const [uid, setUid] = useState(""); const [name, setName] = useState("Тест-оффер"); const [amt, setAmt] = useState("2500");
  const run = async () => {
    const { error } = await supabase.from("conversions").insert({ user_id: uid, offer_name: name, amount: num(amt), status: "pending" });
    show(error ? error.message : "Создано");
  };
  return <div className="grid grid-cols-3 gap-2"><Input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="user_id" /><Input value={name} onChange={(e) => setName(e.target.value)} /><Input value={amt} onChange={(e) => setAmt(e.target.value)} /><Btn tone="primary" onClick={run}>Создать</Btn></div>;
}
function UserNote() {
  const [uid, setUid] = useState(""); const [n, setN] = useState("");
  useEffect(() => { if (uid) setN(LS(`unote-${uid}`)); }, [uid]);
  useEffect(() => { if (uid) setLS(`unote-${uid}`, n); }, [uid, n]);
  return <div className="space-y-2"><Input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="user_id" /><Textarea rows={3} value={n} onChange={(e) => setN(e.target.value)} placeholder="заметка (локально)" /></div>;
}

/* ============ 4. ANALYTICS (10) ============ */
function AnalyticsTools() {
  return (
    <div className="space-y-2">
      <Card title="29. Топ-10 партнёров по доходу" Icon={TrendingUp} defaultOpen><TopEarners /></Card>
      <Card title="30. Топ-10 офферов по конверсиям" Icon={Star}><TopOffersConv /></Card>
      <Card title="31. Общий счётчик по таблицам" Icon={Activity}><CountAll /></Card>
      <Card title="32. Сумма выплат за период" Icon={DollarSign}><SumPayouts /></Card>
      <Card title="33. Средняя выплата по методу" Icon={Wallet}><AvgByMethod /></Card>
      <Card title="34. Активность по дням (последние 14)" Icon={Clock}><Last14 /></Card>
      <Card title="35. Заявки по статусам" Icon={Filter}><ReqByStatus /></Card>
      <Card title="36. География (по geo офферов)" Icon={Globe}><GeoMix /></Card>
      <Card title="37. Средний EPC/CR каталога" Icon={Percent}><AvgEpcCr /></Card>
      <Card title="38. Общая выручка (одобренные конверсии)" Icon={Coins}><TotalRevenue /></Card>
    </div>
  );
}
function useTable<T>(fn: () => Promise<T | null>, dep: unknown[] = []) {
  const [d, setD] = useState<T | null>(null);
  useEffect(() => { void (async () => setD(await fn()))(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dep);
  return d;
}
function TopEarners() {
  const d = useTable(async () => {
    const { data } = await supabase.from("conversions").select("user_id, amount").eq("status", "approved");
    const m = new Map<string, number>();
    (data ?? []).forEach((r) => m.set(r.user_id, (m.get(r.user_id) ?? 0) + Number(r.amount)));
    return Array.from(m.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10);
  });
  return <div className="space-y-1">{(d ?? []).map(([u, v]) => <div key={u} className="flex justify-between text-[11px]"><span className="font-mono truncate">{u.slice(0,8)}</span><span className="font-bold">{v.toFixed(0)} ₽</span></div>)}</div>;
}
function TopOffersConv() {
  const d = useTable(async () => {
    const { data } = await supabase.from("conversions").select("offer_name");
    const m = new Map<string, number>();
    (data ?? []).forEach((r) => m.set(r.offer_name, (m.get(r.offer_name) ?? 0) + 1));
    return Array.from(m.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10);
  });
  return <div className="space-y-1">{(d ?? []).map(([n, v]) => <div key={n} className="flex justify-between text-[11px]"><span className="truncate">{n}</span><b>{v}</b></div>)}</div>;
}
function CountAll() {
  const d = useTable(async () => {
    const tables = ["profiles","user_roles","offers","link_requests","payout_requests","conversions","notifications"] as const;
    const out: Record<string, number> = {};
    await Promise.all(tables.map(async (t) => { const { count } = await supabase.from(t).select("*", { count: "exact", head: true }); out[t] = count ?? 0; }));
    return out;
  });
  return <div className="grid grid-cols-2 gap-1 text-[11px]">{d && Object.entries(d).map(([k, v]) => <div key={k} className="flex justify-between rounded bg-secondary/40 px-2 py-1"><span>{k}</span><b>{v}</b></div>)}</div>;
}
function SumPayouts() {
  const [days, setDays] = useState("30"); const [total, setTotal] = useState<number | null>(null);
  const run = async () => {
    const iso = new Date(Date.now() - num(days) * 86400000).toISOString();
    const { data } = await supabase.from("payout_requests").select("amount, status").gte("created_at", iso);
    setTotal((data ?? []).reduce((s, r) => s + Number(r.amount), 0));
  };
  return <div className="flex gap-2 items-center"><Input value={days} onChange={(e) => setDays(e.target.value)} placeholder="дней" /><Btn onClick={run} tone="primary">Посчитать</Btn>{total !== null && <span className="font-bold">{total.toFixed(0)} ₽</span>}</div>;
}
function AvgByMethod() {
  const d = useTable(async () => {
    const { data } = await supabase.from("payout_requests").select("method, amount");
    const m = new Map<string, number[]>();
    (data ?? []).forEach((r) => { const a = m.get(r.method) ?? []; a.push(Number(r.amount)); m.set(r.method, a); });
    return Array.from(m.entries()).map(([k, arr]) => [k, arr.reduce((s,v)=>s+v,0)/arr.length] as [string, number]);
  });
  return <div className="space-y-1">{(d ?? []).map(([k, v]) => <div key={k} className="flex justify-between text-[11px]"><span>{k}</span><b>{v.toFixed(0)} ₽</b></div>)}</div>;
}
function Last14() {
  const d = useTable(async () => {
    const iso = new Date(Date.now() - 14 * 86400000).toISOString();
    const { data } = await supabase.from("conversions").select("created_at").gte("created_at", iso);
    const m = new Map<string, number>();
    (data ?? []).forEach((r) => { const k = r.created_at.slice(0,10); m.set(k, (m.get(k) ?? 0) + 1); });
    return Array.from(m.entries()).sort();
  });
  return <div className="space-y-1">{(d ?? []).map(([k, v]) => <div key={k} className="flex items-center gap-2 text-[11px]"><span className="w-16 font-mono">{k}</span><div className="flex-1 h-1.5 rounded bg-secondary"><div className="h-full rounded bg-primary" style={{ width: `${Math.min(100, v * 5)}%` }} /></div><b className="w-6 text-right">{v}</b></div>)}</div>;
}
function ReqByStatus() {
  const d = useTable(async () => {
    const { data } = await supabase.from("link_requests").select("status");
    const m = new Map<string, number>();
    (data ?? []).forEach((r) => m.set(r.status, (m.get(r.status) ?? 0) + 1));
    return Array.from(m.entries());
  });
  return <div className="flex flex-wrap gap-2">{(d ?? []).map(([k, v]) => <span key={k} className="rounded bg-secondary px-2 py-1 text-[11px]">{k}: <b>{v}</b></span>)}</div>;
}
function GeoMix() {
  const d = useTable(async () => {
    const { data } = await supabase.from("offers").select("geo");
    const m = new Map<string, number>();
    (data ?? []).forEach((r) => (r.geo ?? "?").split(/[,\s]+/).forEach((g: string) => g && m.set(g, (m.get(g) ?? 0) + 1)));
    return Array.from(m.entries()).sort((a,b)=>b[1]-a[1]);
  });
  return <div className="flex flex-wrap gap-1">{(d ?? []).map(([k, v]) => <span key={k} className="rounded bg-secondary px-2 py-0.5 text-[10px]">{k} · <b>{v}</b></span>)}</div>;
}
function AvgEpcCr() {
  const d = useTable(async () => {
    const { data } = await supabase.from("offers").select("epc, cr");
    const n = Math.max(1, (data ?? []).length);
    const epc = (data ?? []).reduce((s, r) => s + Number(r.epc), 0) / n;
    const cr = (data ?? []).reduce((s, r) => s + Number(r.cr), 0) / n;
    return { epc, cr };
  });
  return <div className="flex gap-3 text-[12px]"><span>EPC: <b>{d?.epc.toFixed(1) ?? "—"}</b></span><span>CR: <b>{d?.cr.toFixed(2) ?? "—"}%</b></span></div>;
}
function TotalRevenue() {
  const d = useTable(async () => {
    const { data } = await supabase.from("conversions").select("amount").eq("status", "approved");
    return (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  });
  return <div className="text-[13px]">Всего: <b>{(d ?? 0).toFixed(0)} ₽</b></div>;
}

/* ============ 5. QUALITY (7) ============ */
function QualityTools() {
  return (
    <div className="space-y-2">
      <Card title="39. Офферы без landing" Icon={AlertTriangle} defaultOpen><OffersNoLanding /></Card>
      <Card title="40. Неактивные офферы" Icon={EyeOff}><OffersInactive /></Card>
      <Card title="41. Заявки без ссылки" Icon={ClipboardList}><ReqNoLink /></Card>
      <Card title="42. Пользователи без банка" Icon={Landmark}><NoBank /></Card>
      <Card title="43. Пользователи без Telegram" Icon={Send}><NoTg /></Card>
      <Card title="44. Дубликаты заявок (user+offer)" Icon={Copy}><DupReq /></Card>
      <Card title="45. Валидация URL landing" Icon={ShieldCheck}><ValidateUrls /></Card>
    </div>
  );
}
function ListView({ rows, render }: { rows: unknown[] | null; render: (r: unknown, i: number) => React.ReactNode }) {
  if (rows === null) return <p className="text-[11px] text-muted-foreground">Загрузка…</p>;
  if (!rows.length) return <p className="text-[11px] text-emerald-500">Ничего не найдено ✓</p>;
  return <div className="max-h-64 space-y-1 overflow-y-auto">{rows.map(render)}</div>;
}
function OffersNoLanding() {
  const d = useTable(async () => (await supabase.from("offers").select("id,name,landing").or("landing.is.null,landing.eq.")).data ?? []);
  return <ListView rows={d} render={(r) => <div key={(r as {id:string}).id} className="rounded bg-secondary/40 px-2 py-1 text-[11px]"><b>{(r as {name:string}).name}</b> · {(r as {id:string}).id}</div>} />;
}
function OffersInactive() {
  const d = useTable(async () => (await supabase.from("offers").select("id,name,active").eq("active", false)).data ?? []);
  return <ListView rows={d} render={(r) => <div key={(r as {id:string}).id} className="rounded bg-secondary/40 px-2 py-1 text-[11px]"><b>{(r as {name:string}).name}</b></div>} />;
}
function ReqNoLink() {
  const d = useTable(async () => (await supabase.from("link_requests").select("id,offer_name,link").is("link", null).limit(50)).data ?? []);
  return <ListView rows={d} render={(r) => <div key={(r as {id:string}).id} className="rounded bg-secondary/40 px-2 py-1 text-[11px]">{(r as {offer_name:string}).offer_name}</div>} />;
}
function NoBank() {
  const d = useTable(async () => (await supabase.from("profiles").select("id,email,bank").is("bank", null).limit(100)).data ?? []);
  return <ListView rows={d} render={(r) => <div key={(r as {id:string}).id} className="rounded bg-secondary/40 px-2 py-1 text-[11px]">{(r as {email:string}).email}</div>} />;
}
function NoTg() {
  const d = useTable(async () => (await supabase.from("profiles").select("id,email,telegram").is("telegram", null).limit(100)).data ?? []);
  return <ListView rows={d} render={(r) => <div key={(r as {id:string}).id} className="rounded bg-secondary/40 px-2 py-1 text-[11px]">{(r as {email:string}).email}</div>} />;
}
function DupReq() {
  const d = useTable(async () => {
    const { data } = await supabase.from("link_requests").select("user_id, offer_id");
    const m = new Map<string, number>();
    (data ?? []).forEach((r) => { const k = `${r.user_id}::${r.offer_id}`; m.set(k, (m.get(k) ?? 0) + 1); });
    return Array.from(m.entries()).filter(([,v]) => v > 1);
  });
  return <ListView rows={d} render={(r, i) => <div key={i} className="rounded bg-secondary/40 px-2 py-1 text-[11px] font-mono">{(r as [string, number])[0]} · ×{(r as [string, number])[1]}</div>} />;
}
function ValidateUrls() {
  const [rows, setRows] = useState<Array<{ id: string; name: string; ok: boolean }> | null>(null);
  const run = async () => {
    const { data } = await supabase.from("offers").select("id,name,landing");
    const re = /^https?:\/\/[^\s]+$/i;
    setRows((data ?? []).map((r) => ({ id: r.id, name: r.name, ok: !!r.landing && re.test(r.landing) })));
  };
  return <div className="space-y-2"><Btn tone="primary" onClick={run}>Проверить</Btn>
    {rows && <div className="max-h-64 space-y-1 overflow-y-auto">{rows.map((r) => <div key={r.id} className={`flex items-center gap-2 rounded px-2 py-1 text-[11px] ${r.ok ? "bg-emerald-500/10" : "bg-destructive/10"}`}><span className="flex-1 truncate">{r.name}</span>{r.ok ? <Check className="size-3 text-emerald-500" /> : <Ban className="size-3 text-destructive" />}</div>)}</div>}
  </div>;
}

/* ============ 6. SYSTEM (7) ============ */
function SystemTools() {
  return (
    <div className="space-y-2">
      <Card title="46. Настройки платформы" Icon={Wrench} defaultOpen><PlatformSettings /></Card>
      <Card title="47. Курсы валют (ручной ввод)" Icon={Coins}><FxRates /></Card>
      <Card title="48. Тех.работы (баннер)" Icon={AlertTriangle}><Maintenance /></Card>
      <Card title="49. Реф.программа (процент)" Icon={Gift}><RefPct /></Card>
      <Card title="50. Быстрый SQL-подсказчик" Icon={Search}><SqlHints /></Card>
      <Card title="51. RLS-справка (кто что видит)" Icon={ShieldCheck}><RlsHelp /></Card>
      <Card title="52. Сброс локальных настроек админа" Icon={Trash2}><ResetAdminLocal /></Card>
    </div>
  );
}
function PlatformSettings() {
  const [comm, setComm] = useState(LS("s-commission", "5"));
  const [hold, setHold] = useState(LS("s-hold", "14"));
  const [minP, setMinP] = useState(LS("s-minpayout", "1000"));
  const save = () => { setLS("s-commission", comm); setLS("s-hold", hold); setLS("s-minpayout", minP); alert("Сохранено"); };
  return <div className="space-y-2">
    <div className="grid grid-cols-3 gap-2">
      <label className="text-[10px]">Комиссия %<Input value={comm} onChange={(e) => setComm(e.target.value)} /></label>
      <label className="text-[10px]">Hold дн.<Input value={hold} onChange={(e) => setHold(e.target.value)} /></label>
      <label className="text-[10px]">Мин.выплата<Input value={minP} onChange={(e) => setMinP(e.target.value)} /></label>
    </div><Btn tone="primary" onClick={save}>Сохранить</Btn>
  </div>;
}
function FxRates() {
  const [usd, setUsd] = useState(LS("fx-usd", "95")); const [eur, setEur] = useState(LS("fx-eur", "102"));
  return <div className="space-y-2"><div className="grid grid-cols-2 gap-2">
    <label className="text-[10px]">USD<Input value={usd} onChange={(e) => { setUsd(e.target.value); setLS("fx-usd", e.target.value); }} /></label>
    <label className="text-[10px]">EUR<Input value={eur} onChange={(e) => { setEur(e.target.value); setLS("fx-eur", e.target.value); }} /></label>
  </div></div>;
}
function Maintenance() {
  const [on, setOn] = useState(LS("maintenance", "0") === "1");
  const [msg, setMsg] = useState(LS("maintenance-msg", "Идут тех.работы"));
  const toggle = (v: boolean) => { setOn(v); setLS("maintenance", v ? "1" : "0"); };
  const saveMsg = () => setLS("maintenance-msg", msg);
  return <div className="space-y-2">
    <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={on} onChange={(e) => toggle(e.target.checked)} />Показывать баннер</label>
    <Input value={msg} onChange={(e) => setMsg(e.target.value)} /><Btn tone="primary" onClick={saveMsg}>Сохранить</Btn>
  </div>;
}
function RefPct() {
  const [p, setP] = useState(LS("ref-pct", "5"));
  return <div className="flex gap-2 items-center"><Input value={p} onChange={(e) => setP(e.target.value)} /><Btn tone="primary" onClick={() => setLS("ref-pct", p)}>Сохранить</Btn></div>;
}
function SqlHints() {
  const list = [
    "SELECT count(*) FROM public.profiles;",
    "SELECT status, count(*) FROM public.link_requests GROUP BY status;",
    "SELECT user_id, sum(amount) FROM public.conversions WHERE status='approved' GROUP BY user_id ORDER BY 2 DESC LIMIT 10;",
  ];
  return <div className="space-y-1">{list.map((s) => <div key={s} className="flex items-center gap-2 rounded bg-secondary/40 px-2 py-1"><code className="flex-1 font-mono text-[10px]">{s}</code><button onClick={() => copy(s)} className="grid size-6 place-items-center rounded hover:bg-accent"><Copy className="size-3" /></button></div>)}</div>;
}
function RlsHelp() {
  return <ul className="space-y-1 text-[11px] text-muted-foreground">
    <li>• Партнёр видит только СВОИ конверсии, заявки, выплаты и уведомления.</li>
    <li>• Офферы: активные — всем; полный список и правка — только admin.</li>
    <li>• user_roles: чтение только через is_admin() / has_role() (SECURITY DEFINER).</li>
    <li>• Профиль редактирует владелец; admin читает все профили.</li>
  </ul>;
}
function ResetAdminLocal() {
  const run = () => { if (!confirm("Сбросить локальные настройки админа?")) return; ["s-commission","s-hold","s-minpayout","fx-usd","fx-eur","maintenance","maintenance-msg","ref-pct"].forEach((k) => { try { localStorage.removeItem(k); } catch {} }); alert("Готово"); };
  return <Btn tone="danger" onClick={run}><Trash2 className="size-3" /> Сбросить</Btn>;
}
