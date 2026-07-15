import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  Wallet,
  Landmark,
  Search,
  Download,
} from "lucide-react";

export const Route = createFileRoute("/payouts")({
  head: () => ({
    meta: [
      { title: "История выводов — КВАНТ" },
      {
        name: "description",
        content:
          "История выводов средств партнёра: даты, суммы и текущий статус заявок в КВАНТ.",
      },
      { property: "og:title", content: "История выводов — КВАНТ" },
      {
        property: "og:description",
        content: "Все заявки на вывод средств, статусы и реквизиты в одном месте.",
      },
    ],
  }),
  component: PayoutsPage,
});

type PayoutStatus = "paid" | "processing" | "pending" | "rejected";

type Payout = {
  id: string;
  date: string;
  time: string;
  amount: number;
  method: string;
  destination: string;
  status: PayoutStatus;
  note?: string;
};

const payouts: Payout[] = [
  {
    id: "PO-8241",
    date: "18 июл",
    time: "14:02",
    amount: 24800,
    method: "Карта",
    destination: "•••• 4417",
    status: "processing",
  },
  {
    id: "PO-8218",
    date: "12 июл",
    time: "09:41",
    amount: 50000,
    method: "СБП",
    destination: "+7 985 •• •• 42",
    status: "paid",
  },
  {
    id: "PO-8177",
    date: "04 июл",
    time: "18:12",
    amount: 12400,
    method: "Карта",
    destination: "•••• 4417",
    status: "paid",
  },
  {
    id: "PO-8154",
    date: "28 июн",
    time: "11:08",
    amount: 8600,
    method: "Расч. счёт",
    destination: "•••• 0000",
    status: "rejected",
    note: "Неверный БИК",
  },
  {
    id: "PO-8121",
    date: "20 июн",
    time: "16:22",
    amount: 35200,
    method: "СБП",
    destination: "+7 985 •• •• 42",
    status: "paid",
  },
  {
    id: "PO-8098",
    date: "12 июн",
    time: "10:00",
    amount: 4200,
    method: "Карта",
    destination: "•••• 4417",
    status: "pending",
  },
  {
    id: "PO-8071",
    date: "03 июн",
    time: "12:44",
    amount: 61500,
    method: "СБП",
    destination: "+7 985 •• •• 42",
    status: "paid",
  },
];

const filters = [
  { id: "all", label: "Все" },
  { id: "processing", label: "В работе" },
  { id: "paid", label: "Выплачено" },
  { id: "rejected", label: "Отказ" },
] as const;

type Filter = (typeof filters)[number]["id"];

function fmt(n: number) {
  return n.toLocaleString("ru-RU").replace(/,/g, " ");
}

function statusMeta(s: PayoutStatus) {
  switch (s) {
    case "paid":
      return {
        label: "Выплачено",
        Icon: CheckCircle2,
        color: "text-[color:var(--success)]",
        bg: "bg-[color:var(--success)]/10",
      };
    case "processing":
      return {
        label: "В обработке",
        Icon: Clock,
        color: "text-primary",
        bg: "bg-primary/10",
      };
    case "pending":
      return {
        label: "Ожидает",
        Icon: Clock,
        color: "text-[color:var(--warning)]",
        bg: "bg-[color:var(--warning)]/10",
      };
    case "rejected":
      return {
        label: "Отказ",
        Icon: XCircle,
        color: "text-destructive",
        bg: "bg-destructive/10",
      };
  }
}

function PayoutsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const filtered = payouts.filter((p) => {
    const byStatus = filter === "all" ? true : p.status === filter;
    const s = q.trim().toLowerCase();
    const byQ =
      !s ||
      p.id.toLowerCase().includes(s) ||
      p.method.toLowerCase().includes(s) ||
      p.destination.toLowerCase().includes(s);
    return byStatus && byQ;
  });

  const total = payouts
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const inFlight = payouts
    .filter((p) => p.status === "processing" || p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  const groups = filtered.reduce<Record<string, Payout[]>>((acc, p) => {
    (acc[p.date] ||= []).push(p);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            aria-label="Назад"
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex flex-col leading-none">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Раздел
            </span>
            <span className="text-sm font-bold uppercase tracking-tight">
              История выводов
            </span>
          </div>
        </div>
        <button
          aria-label="Скачать выписку"
          className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Download className="size-4" />
        </button>
      </header>

      <main className="mx-auto max-w-[420px] space-y-6 p-4 pb-24">
        {/* Summary */}
        <section className="animate-in-up grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
          <div className="bg-card p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Выплачено всего
            </p>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums">
              {fmt(total)} ₽
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              {payouts.filter((p) => p.status === "paid").length} заявок
            </p>
          </div>
          <div className="bg-card p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              В обработке
            </p>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums">
              {fmt(inFlight)} ₽
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              {
                payouts.filter((p) => p.status === "processing" || p.status === "pending")
                  .length
              }{" "}
              активных
            </p>
          </div>
        </section>

        {/* Search */}
        <section className="animate-in-up" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по ID, методу, реквизитам"
              className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
            />
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  filter === f.id
                    ? "bg-foreground text-background"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section
          className="animate-in-up space-y-5"
          style={{ animationDelay: "120ms" }}
        >
          {Object.keys(groups).length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
              По вашему запросу ничего не найдено
            </div>
          )}

          {Object.entries(groups).map(([date, list]) => (
            <div key={date}>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  {date}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  Σ {fmt(list.reduce((s, p) => s + p.amount, 0))} ₽
                </span>
              </div>
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {list.map((p) => {
                  const m = statusMeta(p.status);
                  return (
                    <div key={p.id} className="p-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`grid size-9 shrink-0 place-items-center rounded-lg ${m.bg}`}
                        >
                          <m.Icon className={`size-4 ${m.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-xs font-bold">
                              {p.method} • {p.destination}
                            </p>
                          </div>
                          <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                            <span>{p.id}</span>
                            <span>•</span>
                            <span>{p.time}</span>
                          </p>
                          {p.note && (
                            <p className="mt-1 font-mono text-[10px] text-destructive">
                              {p.note}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p
                            className={`font-mono text-sm font-bold tabular-nums ${
                              p.status === "rejected"
                                ? "text-muted-foreground line-through"
                                : ""
                            }`}
                          >
                            {fmt(p.amount)} ₽
                          </p>
                          <span
                            className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase ${m.bg} ${m.color}`}
                          >
                            {m.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        <section
          className="animate-in-up flex items-center gap-3 rounded-lg border border-border bg-card p-4"
          style={{ animationDelay: "180ms" }}
        >
          <div className="grid size-9 place-items-center rounded-lg bg-secondary text-muted-foreground">
            <Landmark className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold leading-none">Нужна новая выплата?</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Оформите заявку на выводе средств из личного кабинета
            </p>
          </div>
          <Link
            to="/"
            className="flex items-center gap-1 rounded-md bg-foreground px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-background transition-transform active:scale-95"
          >
            <Wallet className="size-3" /> Вывести
          </Link>
        </section>
      </main>
    </div>
  );
}
