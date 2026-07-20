import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Trophy,
  Flame,
  Zap,
  Crown,
  Gem,
  Coins,
  Target,
  Rocket,
  Sparkles,
  Lock,
  CheckCircle2,
  Medal,
  Users,
  Calendar,
  type LucideIcon,
} from "lucide-react";

/* =========================== Types =========================== */

type Achievement = {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  metric: "earned" | "conversions" | "requests" | "streak" | "leaderboard";
  threshold: number;
  sort_order: number;
};

type UserUnlock = { achievement_id: string; unlocked_at: string };

type LbRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total: number;
  conversions: number;
  is_me: boolean;
};

type Props = {
  userId: string;
  earned: number;
  conversionsCount: number;
  requestsCount: number;
  todayConversions: number;
  todayRequests: number;
};

/* =========================== Icons =========================== */

const ICONS: Record<string, LucideIcon> = {
  trophy: Trophy,
  rocket: Rocket,
  sparkles: Sparkles,
  target: Target,
  coins: Coins,
  gem: Gem,
  crown: Crown,
  zap: Zap,
  medal: Medal,
};

const TIER: Record<string, { color: string; ring: string; bg: string; label: string }> = {
  bronze:   { color: "text-amber-600",  ring: "ring-amber-600/40",  bg: "bg-amber-600/10",  label: "Бронза" },
  silver:   { color: "text-slate-300",  ring: "ring-slate-300/40",  bg: "bg-slate-300/10",  label: "Серебро" },
  gold:     { color: "text-yellow-400", ring: "ring-yellow-400/40", bg: "bg-yellow-400/10", label: "Золото" },
  platinum: { color: "text-cyan-300",   ring: "ring-cyan-300/40",   bg: "bg-cyan-300/10",   label: "Платина" },
};

/* =========================== Component =========================== */

export function RewardsTab({
  userId,
  earned,
  conversionsCount,
  requestsCount,
  todayConversions,
  todayRequests,
}: Props) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlocks, setUnlocks] = useState<UserUnlock[]>([]);
  const [streak, setStreak] = useState<{ days: number; best: number }>({ days: 0, best: 0 });
  const [lb, setLb] = useState<LbRow[]>([]);
  const [lbPeriod, setLbPeriod] = useState<"week" | "month">("week");
  const [tab, setTab] = useState<"quests" | "achievements" | "leaderboard">("quests");

  // Init: touch streak, load achievements, award new ones
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: touched } = await supabase.rpc("touch_streak");
        const row = Array.isArray(touched) ? touched[0] : null;
        if (row && !cancelled) {
          setStreak({ days: row.streak_days ?? 0, best: row.streak_best ?? 0 });
        }
      } catch {}
      try {
        await supabase.rpc("award_achievements");
      } catch {}
      const [{ data: ach }, { data: ua }, { data: prof }] = await Promise.all([
        supabase.from("achievements").select("*").order("sort_order"),
        supabase.from("user_achievements").select("achievement_id, unlocked_at").eq("user_id", userId),
        supabase.from("profiles").select("streak_days, streak_best").eq("id", userId).maybeSingle(),
      ]);
      if (cancelled) return;
      setAchievements((ach ?? []) as Achievement[]);
      setUnlocks((ua ?? []) as UserUnlock[]);
      if (prof) setStreak({ days: prof.streak_days ?? 0, best: prof.streak_best ?? 0 });
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Leaderboard
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("get_leaderboard", { _period: lbPeriod, _limit: 20 });
      if (!cancelled) setLb((data ?? []) as LbRow[]);
    })();
    return () => { cancelled = true; };
  }, [lbPeriod]);

  const unlockedIds = useMemo(() => new Set(unlocks.map(u => u.achievement_id)), [unlocks]);
  const unlockedCount = unlockedIds.size;
  const totalCount = achievements.length;

  // Daily quests (computed live)
  const quests = useMemo(() => [
    {
      id: "q_request",
      title: "Создать заявку сегодня",
      desc: "Скопируйте партнёрскую ссылку любого оффера",
      done: todayRequests >= 1,
      Icon: Rocket,
      color: "text-primary",
    },
    {
      id: "q_conversion",
      title: "Получить оплату",
      desc: "1 подтверждённая конверсия за сегодня",
      done: todayConversions >= 1,
      Icon: Coins,
      color: "text-[color:var(--success)]",
    },
    {
      id: "q_streak",
      title: "Держать серию",
      desc: "Заходить в кабинет 3 дня подряд",
      done: streak.days >= 3,
      progress: Math.min(1, streak.days / 3),
      Icon: Flame,
      color: "text-orange-500",
    },
  ], [todayRequests, todayConversions, streak.days]);

  const questsDone = quests.filter(q => q.done).length;

  return (
    <div className="space-y-4">
      {/* Header / streak */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 bg-gradient-to-br from-orange-500/15 via-transparent to-transparent px-4 py-4">
          <div className="grid size-14 place-items-center rounded-2xl border border-orange-500/40 bg-orange-500/10">
            <Flame className="size-7 text-orange-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Текущая серия
            </p>
            <p className="text-2xl font-extrabold leading-none">
              {streak.days} <span className="text-sm font-bold text-muted-foreground">дн.</span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Лучшая серия: <span className="font-bold text-foreground">{streak.best} дн.</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Достижения
            </p>
            <p className="font-mono text-lg font-extrabold tabular-nums">
              {unlockedCount}<span className="text-muted-foreground">/{totalCount}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-border bg-secondary/40 p-1">
        {([
          { id: "quests",       label: `Квесты · ${questsDone}/${quests.length}`, Icon: Calendar },
          { id: "achievements", label: "Ачивки", Icon: Trophy },
          { id: "leaderboard",  label: "Топ",    Icon: Medal },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-bold uppercase tracking-wider transition ${
              tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <t.Icon className="size-3.5" />
            <span className="truncate">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Quests */}
      {tab === "quests" && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Прогресс дня
                </p>
                <p className="text-sm font-bold">{questsDone} из {quests.length} выполнено</p>
              </div>
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="size-5" />
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(questsDone / quests.length) * 100}%` }}
              />
            </div>
          </div>

          {quests.map(q => (
            <div
              key={q.id}
              className={`flex items-start gap-3 rounded-2xl border p-4 ${
                q.done ? "border-[color:var(--success)]/40 bg-[color:var(--success)]/5" : "border-border bg-card"
              }`}
            >
              <div className={`grid size-11 shrink-0 place-items-center rounded-xl border ${
                q.done ? "border-[color:var(--success)]/40 bg-[color:var(--success)]/10 text-[color:var(--success)]"
                       : `border-border bg-secondary/60 ${q.color}`
              }`}>
                {q.done ? <CheckCircle2 className="size-5" /> : <q.Icon className="size-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{q.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{q.desc}</p>
                {"progress" in q && q.progress !== undefined && !q.done && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{ width: `${(q.progress ?? 0) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          <p className="text-center text-[10.5px] text-muted-foreground">
            Квесты обновляются каждый день в 00:00 UTC
          </p>
        </div>
      )}

      {/* Achievements */}
      {tab === "achievements" && (
        <div className="grid grid-cols-2 gap-3">
          {achievements.map(a => {
            const unlocked = unlockedIds.has(a.id);
            const tier = TIER[a.tier] ?? TIER.bronze;
            const Icon = ICONS[a.icon] ?? Trophy;
            const progress = progressFor(a, { earned, conversionsCount, requestsCount, streak: streak.days });
            return (
              <div
                key={a.id}
                className={`overflow-hidden rounded-2xl border bg-card ${
                  unlocked ? `${tier.ring} ring-1 border-transparent` : "border-border opacity-90"
                }`}
              >
                <div className={`flex items-center justify-center py-4 ${unlocked ? tier.bg : "bg-secondary/40"}`}>
                  <div className={`grid size-14 place-items-center rounded-2xl border bg-background ${tier.ring} ring-1 ${unlocked ? tier.color : "text-muted-foreground/60"}`}>
                    {unlocked ? <Icon className="size-7" /> : <Lock className="size-6" />}
                  </div>
                </div>
                <div className="space-y-1.5 p-3">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[13px] font-bold">{a.name}</p>
                  </div>
                  <p className="line-clamp-2 min-h-[28px] text-[10.5px] leading-tight text-muted-foreground">
                    {a.description}
                  </p>
                  <div className="flex items-center justify-between text-[9.5px] font-bold uppercase tracking-wider">
                    <span className={unlocked ? tier.color : "text-muted-foreground"}>{tier.label}</span>
                    {!unlocked && <span className="font-mono text-muted-foreground">{Math.round(progress * 100)}%</span>}
                  </div>
                  {!unlocked && (
                    <div className="h-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full ${tier.color}`}
                        style={{ width: `${progress * 100}%`, backgroundColor: "currentColor" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Leaderboard */}
      {tab === "leaderboard" && (
        <div className="space-y-3">
          <div className="flex items-center gap-1 rounded-xl border border-border bg-secondary/40 p-1">
            {(["week","month"] as const).map(p => (
              <button
                key={p}
                onClick={() => setLbPeriod(p)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
                  lbPeriod === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {p === "week" ? "Неделя" : "Месяц"}
              </button>
            ))}
          </div>

          {lb.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
              <Users className="mx-auto mb-2 size-5 opacity-60" />
              Пока нет данных за период
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {lb.map((row, i) => {
                const place = i + 1;
                const medal =
                  place === 1 ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/40" :
                  place === 2 ? "text-slate-300 bg-slate-300/10 border-slate-300/40" :
                  place === 3 ? "text-amber-600 bg-amber-600/10 border-amber-600/40" :
                                "text-muted-foreground bg-secondary/60 border-border";
                return (
                  <div
                    key={row.user_id}
                    className={`flex items-center gap-3 border-b border-border/60 px-3 py-2.5 last:border-0 ${
                      row.is_me ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className={`grid size-8 shrink-0 place-items-center rounded-lg border font-mono text-[11px] font-extrabold ${medal}`}>
                      {place}
                    </div>
                    {row.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.avatar_url} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-bold">
                        {(row.display_name || "?").slice(0,1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">
                        {row.display_name}
                        {row.is_me && (
                          <span className="ml-1.5 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
                            вы
                          </span>
                        )}
                      </p>
                      <p className="text-[10.5px] text-muted-foreground">
                        {row.conversions} конверсий
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-extrabold tabular-nums">
                        {Math.round(Number(row.total)).toLocaleString("ru-RU")} ₽
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function progressFor(
  a: Achievement,
  s: { earned: number; conversionsCount: number; requestsCount: number; streak: number },
): number {
  const cur =
    a.metric === "earned"      ? s.earned :
    a.metric === "conversions" ? s.conversionsCount :
    a.metric === "requests"    ? s.requestsCount :
    a.metric === "streak"      ? s.streak : 0;
  return Math.max(0, Math.min(1, cur / Math.max(1, a.threshold)));
}
