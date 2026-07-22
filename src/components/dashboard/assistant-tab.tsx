import { translateError } from "@/lib/errors-ru";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Wallet, Calendar, TrendingUp, Target, Sparkles } from "lucide-react";
import { getUserSnapshot, type UserSnapshot } from "@/lib/ai-assistant.functions";
import { AiComingSoonBanner } from "@/components/ai-coming-soon-banner";

export function AssistantTab() {
  const snapFn = useServerFn(getUserSnapshot);

  const [snap, setSnap] = useState<UserSnapshot | null>(null);
  const [snapLoading, setSnapLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    void loadSnap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      <AiComingSoonBanner
        title="Мы работаем над созданием лучшего помощника"
        subtitle="AI-наставник временно недоступен. Скоро он вернётся с персональными рекомендациями, разбором статистики и моментальными ответами на вопросы."
        icon="bot"
      />

      {/* Snapshot */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="Баланс" value={snap ? `${snap.balance.toLocaleString("ru")} ₽` : "—"} icon={Wallet} loading={snapLoading} />
        <StatCard label="За 7 дней" value={snap ? `${snap.last7Days.toLocaleString("ru")} ₽` : "—"} icon={Calendar} loading={snapLoading} />
        <StatCard label="Конверсий" value={snap ? String(snap.conversionsCount) : "—"} icon={TrendingUp} loading={snapLoading} />
        <StatCard label="Активных заявок" value={snap ? String(snap.activeRequests) : "—"} icon={Target} loading={snapLoading} />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive">
          {error}
        </div>
      )}
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
