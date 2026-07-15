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
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Clock,
  X,
  Mail,
  Phone,
  IdCard,
  Camera,
  Landmark,
  ChevronRight,
} from "lucide-react";

type KycStatus = "not_started" | "in_review" | "verified" | "rejected";

type KycStep = {
  id: string;
  label: string;
  hint: string;
  Icon: typeof Mail;
  done: boolean;
};

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

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
  const [kycStatus, setKycStatus] = useState<KycStatus>("in_review");
  const [kycOpen, setKycOpen] = useState(false);
  const [steps, setSteps] = useState<KycStep[]>([
    { id: "email", label: "Email подтверждён", hint: "m***@kvant.io", Icon: Mail, done: true },
    { id: "phone", label: "Телефон", hint: "+7 (9••) •••-42-18", Icon: Phone, done: true },
    { id: "passport", label: "Паспортные данные", hint: "Серия, номер, прописка", Icon: IdCard, done: true },
    { id: "selfie", label: "Селфи с документом", hint: "Проверка занимает до 15 минут", Icon: Camera, done: true },
    { id: "bank", label: "Реквизиты для выплат", hint: "Карта или расчётный счёт", Icon: Landmark, done: false },
  ]);
  const refLink = "kvant.io/p/user772/ref";

  const completedSteps = steps.filter((s) => s.done).length;
  const progressPct = Math.round((completedSteps / steps.length) * 100);
  const kycMeta = getKycMeta(kycStatus);
  const canWithdraw = kycStatus === "verified";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${refLink}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const completeStep = (id: string) => {
    setSteps((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, done: true } : s));
      const allDone = next.every((s) => s.done);
      if (allDone) {
        setKycStatus("in_review");
        setTimeout(() => setKycStatus("verified"), 1800);
      }
      return next;
    });
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
            className="relative flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
          >
            <Bell className="size-4" />
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
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

        {/* KYC status card */}
        <section className="animate-in-up" style={{ animationDelay: "280ms" }}>
          <button
            onClick={() => setKycOpen(true)}
            className="group flex w-full items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-foreground/20"
          >
            <div
              className={`grid size-10 shrink-0 place-items-center rounded-md ${kycMeta.iconBg}`}
            >
              <kycMeta.Icon className={`size-5 ${kycMeta.iconColor}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  KYC-верификация
                </p>
                <span
                  className={`rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${kycMeta.pillBg} ${kycMeta.pillText}`}
                >
                  {kycMeta.label}
                </span>
              </div>
              <p className="mt-1 text-xs font-bold leading-tight">{kycMeta.headline}</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full ${kycMeta.barColor} transition-all`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {completedSteps}/{steps.length}
                </span>
              </div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </button>
        </section>

        {/* Payouts CTA */}
        <section className="animate-in-up" style={{ animationDelay: "340ms" }}>
          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Доступно к выводу
              </p>
              <p className="mt-1 font-mono text-lg font-bold tabular-nums">128 400 ₽</p>
              {!canWithdraw && (
                <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <ShieldAlert className="size-3" />
                  Вывод доступен после верификации
                </p>
              )}
            </div>
            <button
              onClick={() => !canWithdraw && setKycOpen(true)}
              disabled={false}
              className={`rounded-md px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-transform active:scale-95 ${
                canWithdraw
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {canWithdraw ? "Вывести" : "Пройти KYC"}
            </button>
          </div>
        </section>
      </main>

      {/* KYC bottom sheet */}
      {kycOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
          onClick={() => setKycOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-in-up max-h-[90vh] w-full max-w-[420px] overflow-y-auto rounded-t-2xl border border-border bg-background p-5 sm:rounded-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Верификация партнёра
                </p>
                <h3 className="mt-1 text-lg font-bold tracking-tight">
                  KYC — Know Your Customer
                </h3>
              </div>
              <button
                aria-label="Закрыть"
                onClick={() => setKycOpen(false)}
                className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>

            <div
              className={`mb-5 flex items-center gap-3 rounded-lg border p-3 ${kycMeta.bannerBorder} ${kycMeta.bannerBg}`}
            >
              <kycMeta.Icon className={`size-5 shrink-0 ${kycMeta.iconColor}`} />
              <div className="min-w-0">
                <p className="text-xs font-bold">{kycMeta.headline}</p>
                <p className="text-[11px] text-muted-foreground">{kycMeta.description}</p>
              </div>
            </div>

            <ol className="space-y-2">
              {steps.map((s, idx) => (
                <li
                  key={s.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 ${
                    s.done ? "border-border bg-card" : "border-primary/30 bg-primary/5"
                  }`}
                >
                  <div
                    className={`grid size-9 shrink-0 place-items-center rounded-md ${
                      s.done ? "bg-[color:var(--success)]/10" : "bg-secondary"
                    }`}
                  >
                    {s.done ? (
                      <Check className="size-4 text-[color:var(--success)]" />
                    ) : (
                      <s.Icon className="size-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] font-bold text-muted-foreground">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <p className="text-xs font-bold">{s.label}</p>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{s.hint}</p>
                  </div>
                  {s.done ? (
                    <span className="font-mono text-[9px] font-bold uppercase text-[color:var(--success)]">
                      OK
                    </span>
                  ) : (
                    <button
                      onClick={() => completeStep(s.id)}
                      className="rounded-md bg-primary px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground active:scale-95"
                    >
                      Пройти
                    </button>
                  )}
                </li>
              ))}
            </ol>

            <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
              Данные передаются по защищённому каналу и используются только для проверки
              личности в соответствии с 115-ФЗ. Проверка обычно занимает до 24 часов.
            </p>
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

function getKycMeta(status: KycStatus) {
  switch (status) {
    case "verified":
      return {
        label: "Пройдена",
        headline: "Личность подтверждена",
        description: "Вывод средств доступен без ограничений.",
        Icon: ShieldCheck,
        iconColor: "text-[color:var(--success)]",
        iconBg: "bg-[color:var(--success)]/10",
        pillBg: "bg-[color:var(--success)]/10",
        pillText: "text-[color:var(--success)]",
        barColor: "bg-[color:var(--success)]",
        bannerBg: "bg-[color:var(--success)]/5",
        bannerBorder: "border-[color:var(--success)]/20",
      };
    case "in_review":
      return {
        label: "На проверке",
        headline: "Документы на проверке",
        description: "Обычно занимает до 24 часов. Мы уведомим по email.",
        Icon: Clock,
        iconColor: "text-[color:var(--warning)]",
        iconBg: "bg-[color:var(--warning)]/10",
        pillBg: "bg-[color:var(--warning)]/10",
        pillText: "text-[color:var(--warning)]",
        barColor: "bg-[color:var(--warning)]",
        bannerBg: "bg-[color:var(--warning)]/5",
        bannerBorder: "border-[color:var(--warning)]/20",
      };
    case "rejected":
      return {
        label: "Отклонено",
        headline: "Верификация не пройдена",
        description: "Пересдайте селфи с документом при хорошем освещении.",
        Icon: ShieldAlert,
        iconColor: "text-destructive",
        iconBg: "bg-destructive/10",
        pillBg: "bg-destructive/10",
        pillText: "text-destructive",
        barColor: "bg-destructive",
        bannerBg: "bg-destructive/5",
        bannerBorder: "border-destructive/20",
      };
    default:
      return {
        label: "Не начата",
        headline: "Пройдите верификацию для вывода средств",
        description: "Займёт около 3 минут: паспорт, селфи и реквизиты.",
        Icon: ShieldQuestion,
        iconColor: "text-muted-foreground",
        iconBg: "bg-secondary",
        pillBg: "bg-secondary",
        pillText: "text-muted-foreground",
        barColor: "bg-primary",
        bannerBg: "bg-secondary",
        bannerBorder: "border-border",
      };
  }
}

