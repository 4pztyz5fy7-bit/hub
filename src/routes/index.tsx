import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutGrid,
  Package,
  BarChart3,
  Wallet,
  Copy,
  Check,
  Bell,
  ArrowUpRight,
  TrendingUp,
  Landmark,
  Pencil,
  X,
  CheckCircle2,
  AlertCircle,
  Coins,
  Sparkles,
  Clock,
} from "lucide-react";


export const Route = createFileRoute("/")({
  component: DashboardPage,
});

type BankDetails = {
  method: "card" | "account" | "sbp";
  holder: string;
  inn: string;
  bank: string;
  bik: string;
  account: string;
  card: string;
  sbpPhone: string;
};

const emptyBank: BankDetails = {
  method: "card",
  holder: "",
  inn: "",
  bank: "",
  bik: "",
  account: "",
  card: "",
  sbpPhone: "",
};

function maskCard(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 16);
  return d.replace(/(.{4})/g, "$1 ").trim();
}
function maskDigits(v: string, len: number) {
  return v.replace(/\D/g, "").slice(0, len);
}
function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (!d) return "";
  const p = d.startsWith("8") ? "7" + d.slice(1) : d;
  const [, a, b, c, e] = p.match(/^(\d{0,1})(\d{0,3})(\d{0,3})(\d{0,4})/) || [];
  return `+${a}${b ? " " + b : ""}${c ? " " + c : ""}${e ? "-" + e : ""}`.trim();
}
function last4(s: string) {
  const d = s.replace(/\D/g, "");
  return d.slice(-4);
}

type NotifKind = "accrual" | "payout" | "offer";
type Notification = {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  time: string;
  amount?: string;
  status?: "ok" | "pending" | "rejected";
  read: boolean;
};

const initialNotifs: Notification[] = [
  {
    id: "n1",
    kind: "accrual",
    title: "Начисление",
    body: "Газпромбанк Gold • ID 8824041",
    time: "14:20",
    amount: "+4 500 ₽",
    read: false,
  },
  {
    id: "n2",
    kind: "payout",
    title: "Заявка на вывод",
    body: "50 000 ₽ отправлены в банк",
    time: "13:05",
    status: "pending",
    read: false,
  },
  {
    id: "n3",
    kind: "offer",
    title: "Новый оффер",
    body: "Т-Инвестиции: брокерский счёт • EPC 142 ₽",
    time: "12:10",
    read: false,
  },
  {
    id: "n4",
    kind: "payout",
    title: "Выплата зачислена",
    body: "24 800 ₽ • Т-Банк •••• 4417",
    time: "Вчера",
    status: "ok",
    read: true,
  },
  {
    id: "n5",
    kind: "offer",
    title: "Новый оффер",
    body: "Согласие: ОСАГО онлайн • 850 ₽ за заявку",
    time: "Вчера",
    read: true,
  },
  {
    id: "n6",
    kind: "payout",
    title: "Заявка отклонена",
    body: "Проверьте реквизиты и повторите",
    time: "2 дня",
    status: "rejected",
    read: true,
  },
];



const kpis = [
  { label: "Доход сегодня", value: "8 240 ₽", delta: "+12%", positive: true },
  { label: "Конверсии", value: "42", delta: "+6", positive: true },
  { label: "EPC", value: "84,2 ₽", delta: "+2,1%", positive: true },
  { label: "CR", value: "3,8%", delta: "−0,2%", positive: false },
];

const offers = [
  {
    tag: "BANK",
    name: "Газпромбанк Gold",
    category: "Кредитные карты",
    payout: "4 500 ₽",
    epc: "120 ₽",
  },
  {
    tag: "EDU",
    name: "Skillbox: Дизайн интерьеров",
    category: "Образование",
    payout: "15%",
    epc: "85 ₽",
  },
  {
    tag: "FIN",
    name: "Т-Инвестиции: брокерский счёт",
    category: "Инвестиции",
    payout: "2 800 ₽",
    epc: "142 ₽",
  },
  {
    tag: "TRV",
    name: "Level.Travel: туры в Турцию",
    category: "Путешествия",
    payout: "2,5%",
    epc: "58 ₽",
  },
  {
    tag: "INS",
    name: "Согласие: ОСАГО онлайн",
    category: "Страхование",
    payout: "850 ₽",
    epc: "72 ₽",
  },
];

const conversions = [
  { time: "14:20", name: "Альфа-Инвестиции", id: "8824102", amount: "1 200 ₽", status: "ok" },
  { time: "12:45", name: "Aviasales Search", id: "8824095", amount: "142 ₽", status: "pending" },
  { time: "11:02", name: "Газпромбанк Gold", id: "8824041", amount: "4 500 ₽", status: "ok" },
  { time: "09:38", name: "Skillbox: Дизайн", id: "8824010", amount: "3 800 ₽", status: "ok" },
  { time: "Вчера", name: "Skypro Web-Dev", id: "8823912", amount: "3 800 ₽", status: "ok" },
  { time: "Вчера", name: "Level.Travel", id: "8823887", amount: "980 ₽", status: "rejected" },
];

const chartBars = [40, 62, 55, 85, 45, 95, 70];
const weekLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function DashboardPage() {
  const [copied, setCopied] = useState(false);
  const [active, setActive] = useState<"info" | "offers" | "stats" | "payouts">("info");
  const [bank, setBank] = useState<BankDetails | null>(null);
  const [bankOpen, setBankOpen] = useState(false);
  const [draft, setDraft] = useState<BankDetails>(emptyBank);
  const [notifs, setNotifs] = useState<Notification[]>(initialNotifs);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<"all" | NotifKind>("all");
  const unreadCount = notifs.filter((n) => !n.read).length;
  const filteredNotifs =
    notifFilter === "all" ? notifs : notifs.filter((n) => n.kind === notifFilter);
  const markAllRead = () => setNotifs((ns) => ns.map((n) => ({ ...n, read: true })));
  const toggleRead = (id: string) =>
    setNotifs((ns) => ns.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const refLink = "kvant.io/p/user772/ref";

  const openBank = () => {
    setDraft(bank ?? emptyBank);
    setBankOpen(true);
  };

  const errors = validateBank(draft);
  const canSave = Object.keys(errors).length === 0;

  const saveBank = () => {
    if (!canSave) return;
    setBank(draft);
    setBankOpen(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${refLink}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };




  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex size-6 items-center justify-center rounded-sm bg-foreground">
            <div className="size-2.5 rotate-45 bg-background" />
          </div>
          <span className="text-sm font-bold uppercase tracking-tight">КВАНТ</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            aria-label="Уведомления"
            onClick={() => setNotifOpen(true)}
            className="relative flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-[16px] place-items-center rounded-full bg-primary px-1 font-mono text-[9px] font-bold leading-none text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </button>
          <div className="flex flex-col items-end leading-none">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Уровень
            </span>
            <span className="text-xs font-semibold text-primary">ЗОЛОТО</span>
          </div>
          <div className="grid size-8 place-items-center rounded-full border border-border bg-secondary font-mono text-[10px] font-semibold">
            МК
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[420px] space-y-6 p-4 pb-28">
        {/* Balance */}
        <section className="animate-in-up">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Общий баланс
            </h2>
            <span className="font-mono text-[11px] text-[color:var(--success)]">
              +12,4% • 7дн
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tighter tabular-nums">142 850</span>
            <span className="text-xl font-medium text-muted-foreground">₽</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
            {kpis.slice(0, 2).map((k) => (
              <div key={k.label} className="bg-card p-3">
                <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
                  {k.label}
                </p>
                <div className="flex items-baseline justify-between">
                  <p className="font-mono text-sm font-medium">{k.value}</p>
                  <span
                    className={`font-mono text-[10px] ${
                      k.positive ? "text-[color:var(--success)]" : "text-destructive"
                    }`}
                  >
                    {k.delta}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-px grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
            {kpis.slice(2).map((k) => (
              <div key={k.label} className="bg-card p-3">
                <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
                  {k.label}
                </p>
                <div className="flex items-baseline justify-between">
                  <p className="font-mono text-sm font-medium">{k.value}</p>
                  <span
                    className={`font-mono text-[10px] ${
                      k.positive ? "text-[color:var(--success)]" : "text-destructive"
                    }`}
                  >
                    {k.delta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Ref link */}
        <section className="animate-in-up" style={{ animationDelay: "60ms" }}>
          <div className="rounded-xl bg-primary p-4 text-primary-foreground shadow-lg shadow-primary/20">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium opacity-80">Ваша партнёрская ссылка</p>
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                5% от рефералов
              </span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 select-all truncate rounded bg-white/10 px-3 py-2 font-mono text-xs">
                {refLink}
              </div>
              <button
                onClick={copy}
                className="flex items-center gap-1 rounded bg-white px-3 py-2 text-xs font-bold text-primary transition-transform active:scale-95"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "OK" : "КОПИ"}
              </button>
            </div>
          </div>
        </section>

        {/* Chart */}
        <section className="animate-in-up" style={{ animationDelay: "120ms" }}>
          <div className="flex h-40 w-full flex-col justify-between rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Доход за неделю
              </span>
              <span className="flex items-center gap-1 font-mono text-[10px]">
                <TrendingUp className="size-3 text-[color:var(--success)]" />
                Σ 54 200 ₽
              </span>
            </div>
            <div className="flex h-20 items-end gap-1.5">
              {chartBars.map((h, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t-sm ${
                    i === 5 ? "bg-primary" : "bg-secondary"
                  }`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="flex gap-1.5">
              {weekLabels.map((l, i) => (
                <span
                  key={l}
                  className={`flex-1 text-center font-mono text-[9px] uppercase ${
                    i === 5 ? "font-bold text-primary" : "text-muted-foreground"
                  }`}
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Top offers */}
        <section className="animate-in-up" style={{ animationDelay: "180ms" }}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Топ предложения
            </h3>
            <button className="text-[10px] font-bold text-primary">КАТАЛОГ →</button>
          </div>
          <div className="space-y-2">
            {offers.map((o) => (
              <button
                key={o.name}
                className="group flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-foreground/20"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded border border-black/5 bg-secondary font-mono text-[9px] font-semibold text-muted-foreground">
                  {o.tag}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-xs font-bold leading-none">{o.name}</h4>
                  <p className="mt-1 text-[10px] text-muted-foreground">{o.category}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-xs font-bold">{o.payout}</p>
                  <p className="font-mono text-[9px] uppercase text-muted-foreground">
                    EPC {o.epc}
                  </p>
                </div>
                <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
              </button>
            ))}
          </div>
        </section>

        {/* Conversions */}
        <section className="animate-in-up" style={{ animationDelay: "240ms" }}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Последние конверсии
            </h3>
            <button className="text-[10px] font-bold text-primary">ВСЕ</button>
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {conversions.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-bold">
                    {c.time} • {c.name}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">ID: {c.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-xs font-medium tabular-nums ${
                      c.status === "rejected" ? "text-muted-foreground line-through" : ""
                    }`}
                  >
                    {c.amount}
                  </span>
                  <div
                    className={`size-1.5 rounded-full ${
                      c.status === "ok"
                        ? "bg-[color:var(--success)]"
                        : c.status === "pending"
                          ? "bg-[color:var(--warning)]"
                          : "bg-destructive"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bank details */}
        <section className="animate-in-up" style={{ animationDelay: "280ms" }}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Реквизиты для выплат
            </h3>
            <button
              onClick={openBank}
              className="flex items-center gap-1 text-[10px] font-bold text-primary"
            >
              {bank ? (
                <>
                  <Pencil className="size-3" /> ИЗМЕНИТЬ
                </>
              ) : (
                <>+ ДОБАВИТЬ</>
              )}
            </button>
          </div>
          <button
            onClick={openBank}
            className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-foreground/20"
          >
            <div className="grid size-10 shrink-0 place-items-center rounded border border-black/5 bg-secondary text-muted-foreground">
              <Landmark className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              {bank ? (
                <>
                  <p className="truncate text-xs font-bold leading-none">
                    {bank.method === "card"
                      ? `Карта •••• ${last4(bank.card)}`
                      : bank.method === "sbp"
                        ? `СБП ${bank.sbpPhone}`
                        : `Счёт •••• ${last4(bank.account)}`}
                  </p>
                  <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                    {bank.holder || (bank.method === "sbp" ? "Система быстрых платежей" : bank.bank)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold leading-none">Реквизиты не заданы</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Добавьте карту, счёт или СБП для вывода средств
                  </p>
                </>
              )}
            </div>
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase ${
                bank
                  ? "bg-[color:var(--success)]/10 text-[color:var(--success)]"
                  : "bg-[color:var(--warning)]/10 text-[color:var(--warning)]"
              }`}
            >
              {bank ? <CheckCircle2 className="size-2.5" /> : <AlertCircle className="size-2.5" />}
              {bank ? "OK" : "НЕТ"}
            </span>
          </button>
        </section>

        {/* Payouts CTA */}
        <section className="animate-in-up" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Доступно к выводу
              </p>
              <p className="mt-1 font-mono text-lg font-bold tabular-nums">128 400 ₽</p>
            </div>
            <button
              onClick={() => (bank ? undefined : openBank())}
              disabled={!bank}
              className="rounded-md bg-foreground px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-background transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {bank ? "Вывести" : "Нет реквизитов"}
            </button>
          </div>
        </section>
      </main>

      {/* Bank details sheet */}
      {bankOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center">
          <div className="animate-in-up flex max-h-[92vh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-2xl border border-border bg-background sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Настройка
                </p>
                <h3 className="text-sm font-bold">Реквизиты для выплат</h3>
              </div>
              <button
                onClick={() => setBankOpen(false)}
                aria-label="Закрыть"
                className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {/* Method */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Способ вывода
                </p>
                <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border">
                  {(
                    [
                      { id: "card", label: "Карта" },
                      { id: "sbp", label: "СБП" },
                      { id: "account", label: "Счёт" },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setDraft({ ...draft, method: m.id })}
                      className={`px-2 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                        draft.method === m.id
                          ? "bg-foreground text-background"
                          : "bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <Field
                label="Владелец"
                placeholder="Иванов Иван Иванович"
                value={draft.holder}
                onChange={(v) => setDraft({ ...draft, holder: v })}
                error={errors.holder}
              />

              {draft.method === "card" && (
                <Field
                  label="Номер карты"
                  placeholder="0000 0000 0000 0000"
                  value={draft.card}
                  onChange={(v) => setDraft({ ...draft, card: maskCard(v) })}
                  error={errors.card}
                  mono
                  inputMode="numeric"
                />
              )}

              {draft.method === "sbp" && (
                <Field
                  label="Телефон СБП"
                  placeholder="+7 000 000-00-00"
                  value={draft.sbpPhone}
                  onChange={(v) => setDraft({ ...draft, sbpPhone: maskPhone(v) })}
                  error={errors.sbpPhone}
                  mono
                  inputMode="tel"
                />
              )}

              {draft.method === "account" && (
                <div className="space-y-4">
                  <Field
                    label="Банк"
                    placeholder="Т-Банк"
                    value={draft.bank}
                    onChange={(v) => setDraft({ ...draft, bank: v })}
                    error={errors.bank}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="БИК"
                      placeholder="044525225"
                      value={draft.bik}
                      onChange={(v) => setDraft({ ...draft, bik: maskDigits(v, 9) })}
                      error={errors.bik}
                      mono
                      inputMode="numeric"
                    />
                    <Field
                      label="ИНН"
                      placeholder="770000000000"
                      value={draft.inn}
                      onChange={(v) => setDraft({ ...draft, inn: maskDigits(v, 12) })}
                      error={errors.inn}
                      mono
                      inputMode="numeric"
                    />
                  </div>
                  <Field
                    label="Расчётный счёт"
                    placeholder="40817810000000000000"
                    value={draft.account}
                    onChange={(v) => setDraft({ ...draft, account: maskDigits(v, 20) })}
                    error={errors.account}
                    mono
                    inputMode="numeric"
                  />
                </div>
              )}

              <p className="rounded-md border border-border bg-secondary/50 p-3 text-[10px] leading-relaxed text-muted-foreground">
                Реквизиты используются только для выплаты вознаграждений и хранятся в
                зашифрованном виде.
              </p>
            </div>

            <div className="flex gap-2 border-t border-border p-3">
              <button
                onClick={() => setBankOpen(false)}
                className="flex-1 rounded-md border border-border bg-card px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
              >
                Отмена
              </button>
              <button
                onClick={saveBank}
                disabled={!canSave}
                className="flex-[2] rounded-md bg-foreground px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-background transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}





      {/* Notifications sheet */}
      {notifOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center">
          <div className="animate-in-up flex max-h-[92vh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-2xl border border-border bg-background sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Центр уведомлений
                </p>
                <h3 className="text-sm font-bold">
                  Уведомления{" "}
                  {unreadCount > 0 && (
                    <span className="ml-1 font-mono text-xs text-primary">
                      • {unreadCount} новых
                    </span>
                  )}
                </h3>
              </div>
              <button
                onClick={() => setNotifOpen(false)}
                aria-label="Закрыть"
                className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
              <div className="flex gap-1 overflow-x-auto">
                {(
                  [
                    { id: "all", label: "Все" },
                    { id: "accrual", label: "Начисления" },
                    { id: "payout", label: "Выплаты" },
                    { id: "offer", label: "Офферы" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setNotifFilter(t.id)}
                    className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      notifFilter === t.id
                        ? "bg-foreground text-background"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <button
                onClick={markAllRead}
                disabled={unreadCount === 0}
                className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary disabled:text-muted-foreground/50"
              >
                Прочитано
              </button>
            </div>

            <div className="flex-1 divide-y divide-border overflow-y-auto">
              {filteredNotifs.length === 0 && (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Пока пусто
                </div>
              )}
              {filteredNotifs.map((n) => {
                const meta = notifMeta(n);
                return (
                  <button
                    key={n.id}
                    onClick={() => toggleRead(n.id)}
                    className={`flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-accent/50 ${
                      n.read ? "opacity-70" : ""
                    }`}
                  >
                    <div
                      className={`grid size-9 shrink-0 place-items-center rounded-lg ${meta.iconBg}`}
                    >
                      <meta.Icon className={`size-4 ${meta.iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-bold">{n.title}</p>
                        {!n.read && (
                          <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {n.body}
                      </p>
                      <p className="mt-1 flex items-center gap-1 font-mono text-[9px] uppercase text-muted-foreground">
                        <Clock className="size-2.5" /> {n.time}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {n.amount && (
                        <p className="font-mono text-xs font-bold text-[color:var(--success)]">
                          {n.amount}
                        </p>
                      )}
                      {n.status && (
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase ${
                            n.status === "ok"
                              ? "bg-[color:var(--success)]/10 text-[color:var(--success)]"
                              : n.status === "pending"
                                ? "bg-[color:var(--warning)]/10 text-[color:var(--warning)]"
                                : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {n.status === "ok"
                            ? "Готово"
                            : n.status === "pending"
                              ? "В работе"
                              : "Отказ"}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-border bg-background/95 px-2 backdrop-blur-md">
        {(
          [
            { id: "info", label: "Инфо", Icon: LayoutGrid },
            { id: "offers", label: "Офферы", Icon: Package },
            { id: "stats", label: "Стата", Icon: BarChart3 },
            { id: "payouts", label: "Выплаты", Icon: Wallet },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`flex flex-col items-center gap-1 ${
              active === id ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className={`size-5 ${active === id ? "" : "opacity-60"}`} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function validateBank(b: BankDetails): Partial<Record<keyof BankDetails, string>> {
  const e: Partial<Record<keyof BankDetails, string>> = {};
  if (b.holder.trim().length < 3) e.holder = "Укажите ФИО получателя";
  if (b.method === "card") {
    const d = b.card.replace(/\D/g, "");
    if (d.length !== 16) e.card = "Номер карты — 16 цифр";
  }
  if (b.method === "sbp") {
    const d = b.sbpPhone.replace(/\D/g, "");
    if (d.length !== 11) e.sbpPhone = "Введите телефон полностью";
  }
  if (b.method === "account") {
    if (b.bank.trim().length < 2) e.bank = "Укажите банк";
    if (b.bik.length !== 9) e.bik = "БИК — 9 цифр";
    if (b.inn.length !== 10 && b.inn.length !== 12) e.inn = "ИНН — 10 или 12 цифр";
    if (b.account.length !== 20) e.account = "Счёт — 20 цифр";
  }
  return e;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  mono,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  mono?: boolean;
  inputMode?: "text" | "numeric" | "tel";
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className={`w-full rounded-md border bg-card px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground/40 ${
          error ? "border-destructive/60" : "border-border"
        } ${mono ? "font-mono tabular-nums" : ""}`}
      />
      {error && (
        <span className="mt-1 block text-[10px] font-medium text-destructive">{error}</span>
      )}
    </label>
  );
}


function notifMeta(n: Notification) {
  if (n.kind === "accrual") {
    return {
      Icon: Coins,
      iconBg: "bg-[color:var(--success)]/10",
      iconColor: "text-[color:var(--success)]",
    };
  }
  if (n.kind === "offer") {
    return {
      Icon: Sparkles,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    };
  }
  // payout
  if (n.status === "ok") {
    return {
      Icon: CheckCircle2,
      iconBg: "bg-[color:var(--success)]/10",
      iconColor: "text-[color:var(--success)]",
    };
  }
  if (n.status === "rejected") {
    return {
      Icon: AlertCircle,
      iconBg: "bg-destructive/10",
      iconColor: "text-destructive",
    };
  }
  return {
    Icon: Wallet,
    iconBg: "bg-[color:var(--warning)]/10",
    iconColor: "text-[color:var(--warning)]",
  };
}
