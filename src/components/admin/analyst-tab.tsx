import { translateError } from "@/lib/errors-ru";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Users,
  Package,
  DollarSign,
  Wallet,
  TrendingUp,
  Activity,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { getAdminSnapshot, type AdminSnapshot } from "@/lib/ai-assistant.functions";
import { AiComingSoonBanner } from "@/components/ai-coming-soon-banner";

export function AdminAnalystTab() {
  const snapFn = useServerFn(getAdminSnapshot);

  const [snap, setSnap] = useState<AdminSnapshot | null>(null);
  const [snapLoading, setSnapLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setSnapLoading(true);
    try {
      setSnap(await snapFn({}));
    } catch (e) {
      console.error("[analyst] snapshot error", e);
      setError(translateError(e, "Не удалось загрузить сводку"));
    }
    setSnapLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-4">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <div className="text-sm font-bold">AI-аналитик платформы</div>
            <div className="text-[11px] text-muted-foreground">
              Инсайты и рекомендации на реальных данных
            </div>
          </div>
          <button
            onClick={() => void load()}
            className="ml-auto text-muted-foreground hover:text-foreground"
            aria-label="Обновить"
          >
            <RefreshCw className={`size-4 ${snapLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <AiComingSoonBanner
        title="Мы работаем над созданием лучшего помощника"
        subtitle="AI-аналитик временно недоступен. Скоро он вернётся с инсайтами по платформе, аномалиями и прогнозами выручки."
        icon="construction"
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Партнёры" value={snap?.users} icon={Users} loading={snapLoading} />
        <Stat
          label="Офферы (акт/всего)"
          value={snap ? `${snap.offersActive}/${snap.offersTotal}` : undefined}
          icon={Package}
          loading={snapLoading}
        />
        <Stat
          label="Выручка всего"
          value={snap ? `${snap.revenueTotal.toLocaleString("ru")} ₽` : undefined}
          icon={DollarSign}
          loading={snapLoading}
        />
        <Stat
          label="За 7 дней"
          value={snap ? `${snap.revenue7d.toLocaleString("ru")} ₽` : undefined}
          icon={TrendingUp}
          loading={snapLoading}
        />
        <Stat
          label="За 30 дней"
          value={snap ? `${snap.revenue30d.toLocaleString("ru")} ₽` : undefined}
          icon={Activity}
          loading={snapLoading}
        />
        <Stat
          label="Выплат в очереди"
          value={
            snap
              ? `${snap.pendingPayouts} · ${snap.pendingPayoutsAmount.toLocaleString("ru")} ₽`
              : undefined
          }
          icon={Wallet}
          loading={snapLoading}
        />
        <Stat
          label="Активные заявки"
          value={snap?.activeRequests}
          icon={Activity}
          loading={snapLoading}
        />
        <Stat label="Админов" value={snap?.admins} icon={Users} loading={snapLoading} />
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <TopList title="Топ партнёров" items={snap?.topPartners ?? []} loading={snapLoading} />
        <TopList
          title="Топ офферов"
          items={(snap?.topOffers ?? []).map((o) => ({
            name: `${o.name} · ${o.count} шт.`,
            amount: o.amount,
          }))}
          loading={snapLoading}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string | number | undefined;
  icon: typeof Sparkles;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="mt-1 text-sm font-bold">{loading ? "…" : (value ?? "—")}</div>
    </div>
  );
}

function TopList({
  title,
  items,
  loading,
}: {
  title: string;
  items: Array<{ name: string; amount: number }>;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {loading ? (
        <div className="py-6 text-center text-xs text-muted-foreground">Загрузка…</div>
      ) : items.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">Нет данных</div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
            >
              <span className="truncate pr-2">
                {i + 1}. {it.name}
              </span>
              <span className="font-bold text-primary">{it.amount.toLocaleString("ru")} ₽</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
