import { translateError } from "@/lib/errors-ru";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles, Send, Loader2, Users, Package, DollarSign, Wallet,
  TrendingUp, AlertTriangle, RefreshCw, Trophy, Activity, Power,
} from "lucide-react";
import { askAdminAnalyst, getAiStatus, getAdminSnapshot, type AdminSnapshot } from "@/lib/ai-assistant.functions";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK: { label: string; icon: typeof Sparkles; prompt: string }[] = [
  { label: "Ежедневная сводка", icon: Activity, prompt: "Сделай ежедневную сводку по платформе: ключевые цифры, что выросло, что упало, на что обратить внимание." },
  { label: "Аномалии", icon: AlertTriangle, prompt: "Найди аномалии в данных: подозрительные конверсии, всплески, партнёры с резким изменением поведения." },
  { label: "Топ-партнёры", icon: Trophy, prompt: "Составь рейтинг топ-5 партнёров с оценкой их вклада и рисков потери." },
  { label: "Убить/масштабировать", icon: TrendingUp, prompt: "Какие офферы стоит масштабировать, а какие отключить? Дай короткие обоснования." },
  { label: "Прогноз выручки", icon: DollarSign, prompt: "Сделай прогноз выручки на следующие 30 дней с обоснованием." },
  { label: "Идеи роста", icon: Sparkles, prompt: "Предложи 5 идей, что улучшить в сети прямо сейчас, чтобы поднять выручку." },
];

export function AdminAnalystTab() {
  const askFn = useServerFn(askAdminAnalyst);
  const snapFn = useServerFn(getAdminSnapshot);

  const [snap, setSnap] = useState<AdminSnapshot | null>(null);
  const [snapLoading, setSnapLoading] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    setSnapLoading(true);
    try { setSnap(await snapFn({})); } catch { /* ignore */ }
    setSnapLoading(false);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || sending) return;
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content: clean }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await askFn({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: res.answer }]);
    } catch (e) {
      setError(translateError(e, "Не удалось получить ответ"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-4">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <div className="text-sm font-bold">AI-аналитик платформы</div>
            <div className="text-[11px] text-muted-foreground">Инсайты и рекомендации на реальных данных</div>
          </div>
          <button onClick={load} className="ml-auto text-muted-foreground hover:text-foreground" aria-label="Обновить">
            <RefreshCw className={`size-4 ${snapLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Партнёры" value={snap?.users} icon={Users} loading={snapLoading} />
        <Stat label="Офферы (акт/всего)" value={snap ? `${snap.offersActive}/${snap.offersTotal}` : undefined} icon={Package} loading={snapLoading} />
        <Stat label="Выручка всего" value={snap ? `${snap.revenueTotal.toLocaleString("ru")} ₽` : undefined} icon={DollarSign} loading={snapLoading} />
        <Stat label="За 7 дней" value={snap ? `${snap.revenue7d.toLocaleString("ru")} ₽` : undefined} icon={TrendingUp} loading={snapLoading} />
        <Stat label="За 30 дней" value={snap ? `${snap.revenue30d.toLocaleString("ru")} ₽` : undefined} icon={Activity} loading={snapLoading} />
        <Stat label="Выплат в очереди" value={snap ? `${snap.pendingPayouts} · ${snap.pendingPayoutsAmount.toLocaleString("ru")} ₽` : undefined} icon={Wallet} loading={snapLoading} />
        <Stat label="Активные заявки" value={snap?.activeRequests} icon={Activity} loading={snapLoading} />
        <Stat label="Админов" value={snap?.admins} icon={Users} loading={snapLoading} />
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <TopList title="Топ партнёров" items={snap?.topPartners ?? []} loading={snapLoading} />
        <TopList
          title="Топ офферов"
          items={(snap?.topOffers ?? []).map((o) => ({ name: `${o.name} · ${o.count} шт.`, amount: o.amount }))}
          loading={snapLoading}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Быстрые инсайты</div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {QUICK.map((q) => (
            <button
              key={q.label}
              disabled={sending}
              onClick={() => void send(q.prompt)}
              className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-left text-xs hover:border-primary/40 hover:bg-accent disabled:opacity-50"
            >
              <q.icon className="size-3.5 shrink-0 text-primary" />
              <span className="line-clamp-2">{q.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div ref={scrollRef} className="max-h-[420px] space-y-3 overflow-y-auto p-3">
          {messages.length === 0 && !sending && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Задайте вопрос или выберите инсайт выше.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-background text-foreground"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> AI анализирует…
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive">
              {error}
            </div>
          )}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex items-center gap-2 border-t border-border p-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Спросите у AI-аналитика…"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
            aria-label="Отправить"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, loading }: { label: string; value: string | number | undefined; icon: typeof Sparkles; loading?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="mt-1 text-sm font-bold">{loading ? "…" : (value ?? "—")}</div>
    </div>
  );
}

function TopList({ title, items, loading }: { title: string; items: Array<{ name: string; amount: number }>; loading?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
      {loading ? (
        <div className="py-6 text-center text-xs text-muted-foreground">Загрузка…</div>
      ) : items.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">Нет данных</div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="flex items-center justify-between rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs">
              <span className="truncate pr-2">{i + 1}. {it.name}</span>
              <span className="font-bold text-primary">{it.amount.toLocaleString("ru")} ₽</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
