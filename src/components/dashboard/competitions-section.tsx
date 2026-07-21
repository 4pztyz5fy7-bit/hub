import { translateError } from "@/lib/errors-ru";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Gem, Lock, Users, Calendar, Coins, Crown, Medal, Sparkles, TrendingUp, ArrowUpRight } from "lucide-react";

/* ============================ Types ============================ */

type Tier = "start" | "silver" | "gold" | "platinum" | "diamond";
type Metric = "earned" | "conversions" | "requests";

type Prize = { place: number; amount: number; label?: string };

type Competition = {
  id: string;
  title: string;
  description: string | null;
  prize_pool: number;
  prizes: Prize[];
  metric: Metric;
  min_level: Tier;
  starts_at: string;
  ends_at: string;
  active: boolean;
  banner_url: string | null;
  rules: string | null;
};

type LbRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  score: number;
  is_me: boolean;
  rank: number;
};

const TIER_MIN: Record<Tier, number> = {
  start: 0,
  silver: 50_000,
  gold: 150_000,
  platinum: 500_000,
  diamond: 1_500_000,
};

const TIER_LABEL: Record<Tier, string> = {
  start: "Старт",
  silver: "Серебро",
  gold: "Золото",
  platinum: "Платина",
  diamond: "Бриллиант",
};

const METRIC_LABEL: Record<Metric, string> = {
  earned: "по заработку",
  conversions: "по конверсиям",
  requests: "по заявкам",
};

const fmtRub = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;
const fmtNum = (n: number) => Math.round(n).toLocaleString("ru-RU");

function timeLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "завершено";
  const days = Math.floor(ms / 86_400_000);
  const hrs = Math.floor((ms % 86_400_000) / 3_600_000);
  if (days >= 1) return `${days} дн. ${hrs} ч.`;
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  return `${hrs} ч. ${mins} мин.`;
}

/* ============================ Component ============================ */

export function CompetitionsSection({ earned }: { earned: number }) {
  const eligible = earned >= TIER_MIN.diamond;
  const [items, setItems] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("competitions")
      .select("*")
      .eq("active", true)
      .order("ends_at", { ascending: true });
    setItems(((data ?? []) as any[]).map((r) => ({
      ...r,
      prizes: Array.isArray(r.prizes) ? (r.prizes as Prize[]) : [],
      prize_pool: Number(r.prize_pool ?? 0),
    })));
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("competitions:all")
      .on("postgres_changes", { event: "*", schema: "public", table: "competitions" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  const active = items.filter((c) => new Date(c.ends_at).getTime() > Date.now());

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          <Trophy className="size-3.5 text-cyan-400" />
          Соревнования
          <span className="rounded-full bg-cyan-500/15 px-1.5 py-0.5 text-[9px] font-black text-cyan-400">
            Diamond
          </span>
        </h3>
        <Link
          to="/competitions"
          className="inline-flex items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/20"
        >
          Открыть все · {active.length}
          <ArrowUpRight className="size-3" />
        </Link>
      </div>

      {!eligible && (
        <div className="overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent p-4">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-cyan-500/15 text-cyan-400">
              <Gem className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Закрытая лига «Бриллиант»</p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                Соревнования с крупным призовым фондом доступны партнёрам уровня «Бриллиант».
                Копите оборот и получайте призы в закрытых турнирах.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-cyan-400"
                    style={{ width: `${Math.min(100, (earned / TIER_MIN.diamond) * 100)}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] font-bold text-cyan-400">
                  {Math.min(100, Math.floor((earned / TIER_MIN.diamond) * 100))}%
                </span>
              </div>
              <p className="mt-2 text-[10.5px] text-muted-foreground">
                До разблокировки: <span className="font-bold text-foreground">{fmtRub(Math.max(0, TIER_MIN.diamond - earned))}</span>
              </p>
            </div>
            <Lock className="size-4 shrink-0 text-cyan-400/60" />
          </div>
        </div>
      )}

      {eligible && loading && (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          Загружаем турниры…
        </div>
      )}

      {eligible && !loading && active.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          Сейчас нет активных соревнований. Следите за анонсами.
        </div>
      )}

      {eligible && active.map((c) => (
        <CompetitionCard key={c.id} c={c} />
      ))}
    </div>
  );
}

/* ============================ Card ============================ */

function CompetitionCard({ c }: { c: Competition }) {
  const [board, setBoard] = useState<LbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const loadBoard = async () => {
    setLoading(true); setError(null);
    const { data, error } = await supabase.rpc("get_competition_leaderboard", {
      _competition_id: c.id,
      _limit: 50,
    });
    if (error) setError(translateError(error));
    setBoard(((data ?? []) as any[]) as LbRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void loadBoard();
    // Refetch when conversions/link_requests change (cheap: entire table filter isn't scoped, but rows are small in practice)
    const ch = supabase
      .channel(`comp:${c.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversions" }, () => void loadBoard())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "link_requests" }, () => void loadBoard())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id]);

  const me = useMemo(() => board.find((r) => r.is_me) ?? null, [board]);
  const top = useMemo(() => board.slice(0, expanded ? 50 : 5), [board, expanded]);

  const podium = [
    { place: 1, Icon: Crown, color: "text-yellow-400", bg: "bg-yellow-400/10" },
    { place: 2, Icon: Medal, color: "text-slate-300", bg: "bg-slate-300/10" },
    { place: 3, Icon: Medal, color: "text-amber-600", bg: "bg-amber-600/10" },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-cyan-500/30 bg-card">
      {c.banner_url && (
        <div className="h-24 w-full bg-cover bg-center" style={{ backgroundImage: `url(${c.banner_url})` }} />
      )}
      <div className="p-4">
        <div className="mb-3 flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-cyan-500/15 text-cyan-400">
            <Trophy className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{c.title}</p>
            <p className="mt-0.5 text-[10.5px] uppercase tracking-wider text-muted-foreground">
              Рейтинг {METRIC_LABEL[c.metric]} · {TIER_LABEL[c.min_level]}+
            </p>
            {c.description && (
              <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{c.description}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stat Icon={Coins} label="Призовой" value={fmtRub(c.prize_pool)} accent="text-cyan-400" />
          <Stat Icon={Calendar} label="Осталось" value={timeLeft(c.ends_at)} />
          <Stat Icon={Users} label="Участников" value={String(board.length)} />
        </div>

        {c.prizes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {c.prizes.slice(0, 5).map((p) => (
              <span key={p.place} className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                <Sparkles className="size-2.5" />
                {p.label || `${p.place} место`}: {fmtRub(p.amount)}
              </span>
            ))}
          </div>
        )}

        {c.rules && (
          <details className="mt-3 rounded-lg border border-border bg-secondary/40 p-2 text-[11px]">
            <summary className="cursor-pointer font-bold text-foreground">Правила</summary>
            <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{c.rules}</p>
          </details>
        )}

        {/* My position */}
        {me ? (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-background/40 text-cyan-300">
                <TrendingUp className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Ваша позиция</p>
                <p className="text-sm font-bold">#{me.rank} из {board.length}</p>
              </div>
            </div>
            <p className="font-mono text-sm font-bold tabular-nums text-cyan-300">
              {c.metric === "earned" ? fmtRub(me.score) : fmtNum(me.score)}
            </p>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-cyan-500/40 bg-cyan-500/5 p-3 text-center text-[11px] text-muted-foreground">
            Вы ещё не набрали очки в этом турнире. Начинайте раньше — обгонять сложнее.
          </div>
        )}

        {/* Leaderboard */}
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Топ участников</p>
          {loading && <p className="py-4 text-center text-xs text-muted-foreground">Считаем рейтинг…</p>}
          {error && <p className="py-4 text-center text-xs text-destructive">{error}</p>}
          {!loading && !error && board.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">Пока никто не набрал очки</p>
          )}
          <div className="space-y-1">
            {top.map((r) => {
              const p = podium.find((x) => x.place === r.rank);
              return (
                <div
                  key={r.user_id}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${
                    r.is_me ? "border-cyan-500/50 bg-cyan-500/10" : "border-border bg-secondary/30"
                  }`}
                >
                  <div className={`grid size-7 shrink-0 place-items-center rounded-md ${p ? p.bg : "bg-background/40"} ${p ? p.color : "text-muted-foreground"}`}>
                    {p ? <p.Icon className="size-3.5" /> : <span className="font-mono text-[10px] font-bold">{r.rank}</span>}
                  </div>
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt="" className="size-7 shrink-0 rounded-full border border-border object-cover" />
                  ) : (
                    <div className="size-7 shrink-0 rounded-full border border-border bg-secondary" />
                  )}
                  <p className="min-w-0 flex-1 truncate text-xs font-bold">
                    {r.display_name}{r.is_me && <span className="ml-1 text-cyan-400">· вы</span>}
                  </p>
                  <p className="font-mono text-xs font-bold tabular-nums">
                    {c.metric === "earned" ? fmtRub(r.score) : fmtNum(r.score)}
                  </p>
                </div>
              );
            })}
          </div>
          {board.length > 5 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 w-full rounded-lg border border-border py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              {expanded ? "Свернуть" : `Показать всех (${board.length})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ Icon, label, value, accent }: { Icon: typeof Trophy; label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-2">
      <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        <Icon className="size-2.5" /> {label}
      </div>
      <p className={`mt-0.5 truncate font-mono text-[11px] font-bold tabular-nums ${accent ?? ""}`}>{value}</p>
    </div>
  );
}
