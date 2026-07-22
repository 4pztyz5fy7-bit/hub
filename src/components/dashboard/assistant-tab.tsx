import { translateError } from "@/lib/errors-ru";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles, Send, Loader2, Wallet, TrendingUp, Target, Lightbulb,
  Calendar, Award, BarChart3, RefreshCw, Users,
} from "lucide-react";
import { askAssistant, getUserSnapshot, type UserSnapshot } from "@/lib/ai-assistant.functions";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK: { label: string; icon: typeof Sparkles; prompt: string }[] = [
  { label: "Разбор недели", icon: Calendar, prompt: "Проанализируй мою активность за последние 7 дней и подскажи 3 конкретных шага для роста." },
  { label: "Как привлечь клиента?", icon: Users, prompt: "Расскажи, как привлечь первого клиента/лида на мои офферы: источники, креативы и первые шаги." },
  { label: "Как поднять CR?", icon: TrendingUp, prompt: "На моих данных: как поднять конверсию? Дай 5 практичных советов под мои офферы." },
  { label: "Какой оффер выбрать?", icon: Target, prompt: "Из доступных офферов подбери 3 лучших под мой профиль трафика и объясни, почему именно они. Напомни, что ссылку можно сразу скопировать и отправить клиенту." },
  { label: "План на месяц", icon: Award, prompt: "Составь план на 30 дней с реалистичной целью по доходу, исходя из моей статистики." },
  { label: "Ошибки", icon: Lightbulb, prompt: "Найди слабые места в моей текущей работе и как их исправить." },
  { label: "Прогноз", icon: BarChart3, prompt: "Сделай прогноз моего дохода на ближайшие 30 дней и обоснуй." },
];

export function AssistantTab() {
  const askFn = useServerFn(askAssistant);
  const snapFn = useServerFn(getUserSnapshot);

  const [snap, setSnap] = useState<UserSnapshot | null>(null);
  const [snapLoading, setSnapLoading] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const loadSnap = async () => {
    setSnapLoading(true);
    try {
      setSnap(await snapFn({}));
    } catch (e) {
      console.error("[assistant] snapshot error", e);
      setError(translateError(e, "Не удалось загрузить статистику"));
    }
    setSnapLoading(false);
  };

  useEffect(() => { void loadSnap(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

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
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-4">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <div className="text-sm font-bold">AI-наставник КВАНТ</div>
            <div className="text-[11px] text-muted-foreground">Персональные советы на основе твоей статистики</div>
          </div>
        </div>
      </div>

      {/* Snapshot */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="Баланс" value={snap ? `${snap.balance.toLocaleString("ru")} ₽` : "—"} icon={Wallet} loading={snapLoading} />
        <StatCard label="За 7 дней" value={snap ? `${snap.last7Days.toLocaleString("ru")} ₽` : "—"} icon={Calendar} loading={snapLoading} />
        <StatCard label="Конверсий" value={snap ? String(snap.conversionsCount) : "—"} icon={TrendingUp} loading={snapLoading} />
        <StatCard label="Активных заявок" value={snap ? String(snap.activeRequests) : "—"} icon={Target} loading={snapLoading} />
      </div>

      {/* Quick prompts */}
      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Быстрые запросы</div>
          <button onClick={loadSnap} className="text-muted-foreground hover:text-foreground" aria-label="Обновить">
            <RefreshCw className={`size-3.5 ${snapLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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

      {/* Chat */}
      <div className="rounded-2xl border border-border bg-card">
        <div ref={scrollRef} className="max-h-[420px] space-y-3 overflow-y-auto p-3">
          {messages.length === 0 && !sending && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Задай вопрос или выбери быстрый запрос выше.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-foreground"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> AI думает…
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive">
              {error}
            </div>
          )}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); void send(input); }}
          className="flex items-center gap-2 border-t border-border p-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Спроси у AI-наставника…"
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

function StatCard({
  label, value, icon: Icon, loading,
}: { label: string; value: string; icon: typeof Sparkles; loading?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="mt-1 text-sm font-bold">{loading ? "…" : value}</div>
    </div>
  );
}
