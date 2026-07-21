import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
import { translateError } from "@/lib/errors-ru";
  ArrowLeft,
  Trophy,
  Gem,
  Lock,
  Users,
  Calendar,
  Coins,
  Crown,
  Medal,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/competitions")({
  head: () => ({
    meta: [
      { title: "Соревнования · КВАНТ" },
      { name: "description", content: "Активные соревнования партнёрской программы КВАНТ." },
    ],
  }),
  component: CompetitionsPage,
});

/* =============== Types =============== */

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

type Participant = {
  user_id: string;
  joined_at: string;
  display_name: string;
  avatar_url: string | null;
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

const METRIC_UNIT: Record<Metric, string> = {
  earned: "₽",
  conversions: "конв.",
  requests: "заявок",
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

/* =============== Page =============== */

function CompetitionsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [earned, setEarned] = useState(0);
  const [items, setItems] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data } = await supabase
          .from("conversions")
          .select("amount")
          .eq("user_id", uid)
          .eq("status", "ok");
        setEarned(((data ?? []) as { amount: number }[]).reduce((s, r) => s + Number(r.amount || 0), 0));
      }
    })();
  }, []);

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
      .channel("competitions:page")
      .on("postgres_changes", { event: "*", schema: "public", table: "competitions" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  const active = items.filter((c) => new Date(c.ends_at).getTime() > Date.now());
  const openCompetition = active.find((c) => c.id === openId) ?? null;

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            to="/dashboard"
            className="grid size-9 place-items-center rounded-xl border border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              КВАНТ · Партнёрам
            </p>
            <h1 className="flex items-center gap-2 text-lg font-extrabold">
              <Trophy className="size-5 text-cyan-400" /> Соревнования
            </h1>
          </div>
          <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-[10px] font-bold text-cyan-300">
            {active.length} активных
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-4">
        {/* User progress */}
        <UserProgress earned={earned} />

        {loading && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-xs text-muted-foreground">
            Загружаем турниры…
          </div>
        )}

        {!loading && active.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-xs text-muted-foreground">
            Активных соревнований пока нет. Загляните позже.
          </div>
        )}

        {!loading && active.map((c) => (
          <CompetitionListItem
            key={c.id}
            c={c}
            userId={userId}
            earned={earned}
            onOpen={() => setOpenId(c.id)}
          />
        ))}
      </div>

      {openCompetition && userId && (
        <CompetitionDialog
          c={openCompetition}
          userId={userId}
          earned={earned}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

/* =============== User progress card =============== */

function UserProgress({ earned }: { earned: number }) {
  const tiers: Tier[] = ["start", "silver", "gold", "platinum", "diamond"];
  const currentTier = [...tiers].reverse().find((t) => earned >= TIER_MIN[t]) ?? "start";
  const nextTier = tiers[tiers.indexOf(currentTier) + 1] ?? null;
  const nextMin = nextTier ? TIER_MIN[nextTier] : TIER_MIN.diamond;
  const pct = Math.min(100, (earned / nextMin) * 100);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-xl bg-cyan-500/15 text-cyan-400">
          <Gem className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Ваш уровень
          </p>
          <p className="text-sm font-extrabold">
            {TIER_LABEL[currentTier]}
            {nextTier && (
              <span className="ml-1 text-[11px] font-bold text-muted-foreground">
                · до {TIER_LABEL[nextTier]}
              </span>
            )}
          </p>
        </div>
        <p className="font-mono text-sm font-extrabold tabular-nums text-cyan-300">
          {fmtRub(earned)}
        </p>
      </div>
      {nextTier && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-cyan-400" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-[10.5px] text-muted-foreground">
            До {TIER_LABEL[nextTier]}: <span className="font-bold text-foreground">{fmtRub(Math.max(0, nextMin - earned))}</span>
          </p>
        </div>
      )}
    </div>
  );
}

/* =============== List item =============== */

function CompetitionListItem({
  c,
  userId,
  earned,
  onOpen,
}: {
  c: Competition;
  userId: string | null;
  earned: number;
  onOpen: () => void;
}) {
  const [participants, setParticipants] = useState(0);
  const [joined, setJoined] = useState(false);
  const [myScore, setMyScore] = useState<{ rank: number; score: number } | null>(null);
  const eligible = earned >= TIER_MIN[c.min_level];

  const loadParticipation = async () => {
    const { count } = await supabase
      .from("competition_participants" as any)
      .select("*", { count: "exact", head: true })
      .eq("competition_id", c.id);
    setParticipants(count ?? 0);

    if (userId) {
      const { data } = await supabase
        .from("competition_participants" as any)
        .select("user_id")
        .eq("competition_id", c.id)
        .eq("user_id", userId)
        .maybeSingle();
      setJoined(!!data);
    }

    const { data: board } = await supabase.rpc("get_competition_leaderboard", {
      _competition_id: c.id,
      _limit: 100,
    });
    const rows = ((board ?? []) as LbRow[]);
    const me = rows.find((r) => r.is_me);
    setMyScore(me ? { rank: me.rank, score: Number(me.score) } : null);
  };

  useEffect(() => {
    void loadParticipation();
    const ch = supabase
      .channel(`comp-list:${c.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "competition_participants", filter: `competition_id=eq.${c.id}` }, () => void loadParticipation())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id, userId]);

  const firstPrize = c.prizes.find((p) => p.place === 1);

  return (
    <div className={`overflow-hidden rounded-2xl border ${joined ? "border-cyan-500/50" : "border-border"} bg-card`}>
      {c.banner_url && (
        <div className="h-24 w-full bg-cover bg-center" style={{ backgroundImage: `url(${c.banner_url})` }} />
      )}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-cyan-500/15 text-cyan-400">
            <Trophy className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{c.title}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              Рейтинг {METRIC_LABEL[c.metric]} · {TIER_LABEL[c.min_level]}+
            </p>
          </div>
          {joined && (
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
              <CheckCircle2 className="size-3" /> Участвую
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <MiniStat Icon={Coins} label="Приз" value={firstPrize ? fmtRub(firstPrize.amount) : fmtRub(c.prize_pool)} accent="text-cyan-400" />
          <MiniStat Icon={Calendar} label="Осталось" value={timeLeft(c.ends_at)} />
          <MiniStat Icon={Users} label="Участников" value={String(participants)} />
        </div>

        {myScore && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-2.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-cyan-300" />
              <p className="text-xs font-bold">Ваше место: #{myScore.rank}</p>
            </div>
            <p className="font-mono text-xs font-extrabold tabular-nums text-cyan-300">
              {c.metric === "earned" ? fmtRub(myScore.score) : `${fmtNum(myScore.score)} ${METRIC_UNIT[c.metric]}`}
            </p>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={onOpen}
            className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90"
          >
            {joined ? "Открыть турнир" : eligible ? "Участвовать" : "Подробнее"}
          </button>
          {!eligible && (
            <span className="inline-flex items-center gap-1 rounded-xl border border-border bg-secondary/60 px-2.5 py-2.5 text-[10px] font-bold text-muted-foreground">
              <Lock className="size-3" /> {TIER_LABEL[c.min_level]}+
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ Icon, label, value, accent }: { Icon: typeof Trophy; label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-2">
      <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        <Icon className="size-2.5" /> {label}
      </div>
      <p className={`mt-0.5 truncate font-mono text-[11px] font-bold tabular-nums ${accent ?? ""}`}>{value}</p>
    </div>
  );
}

/* =============== Dialog =============== */

function CompetitionDialog({
  c,
  userId,
  earned,
  onClose,
}: {
  c: Competition;
  userId: string;
  earned: number;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"about" | "participants" | "leaderboard">("about");
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(false);
  const [board, setBoard] = useState<LbRow[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const eligible = earned >= TIER_MIN[c.min_level];

  const loadAll = async () => {
    // Membership
    const { data: mine } = await supabase
      .from("competition_participants" as any)
      .select("user_id")
      .eq("competition_id", c.id)
      .eq("user_id", userId)
      .maybeSingle();
    setJoined(!!mine);

    // Leaderboard
    const { data: b } = await supabase.rpc("get_competition_leaderboard", {
      _competition_id: c.id,
      _limit: 100,
    });
    setBoard(((b ?? []) as LbRow[]));

    // Participants + profile join (manual)
    const { data: parts } = await supabase
      .from("competition_participants" as any)
      .select("user_id, joined_at")
      .eq("competition_id", c.id)
      .order("joined_at", { ascending: false });
    const rows = ((parts ?? []) as unknown) as { user_id: string; joined_at: string }[];
    if (rows.length) {
      const ids = rows.map((r) => r.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      setParticipants(rows.map((r) => {
        const p: any = map.get(r.user_id) ?? {};
        return {
          user_id: r.user_id,
          joined_at: r.joined_at,
          display_name: p.display_name || "Партнёр",
          avatar_url: p.avatar_url ?? null,
        };
      }));
    } else {
      setParticipants([]);
    }
  };

  useEffect(() => {
    void loadAll();
    const ch = supabase
      .channel(`comp-dlg:${c.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "competition_participants", filter: `competition_id=eq.${c.id}` }, () => void loadAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversions" }, () => void loadAll())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id, userId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleJoin = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("join_competition" as any, { _competition_id: c.id });
      if (error) throw error;
      const res = data as { ok: boolean; error?: string; required?: number; earned?: number } | null;
      if (!res?.ok) {
        if (res?.error === "level") {
          toast.error(`Недостаточный уровень. Нужен оборот ${fmtRub(res.required ?? 0)}.`);
        } else if (res?.error === "ended") {
          toast.error("Турнир уже завершён.");
        } else {
          toast.error("Не удалось вступить в турнир.");
        }
        return;
      }
      toast.success("Вы вступили в турнир!");
      setJoined(true);
      await loadAll();
    } catch (e: any) {
      toast.error(translateError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("competition_participants" as any)
        .delete()
        .eq("competition_id", c.id)
        .eq("user_id", userId);
      if (error) throw error;
      toast.success("Вы покинули турнир");
      setJoined(false);
      await loadAll();
    } catch (e: any) {
      toast.error(translateError(e));
    } finally {
      setBusy(false);
    }
  };

  const me = useMemo(() => board.find((r) => r.is_me) ?? null, [board]);
  const podium = [
    { place: 1, Icon: Crown, color: "text-yellow-400", bg: "bg-yellow-400/10" },
    { place: 2, Icon: Medal, color: "text-slate-300", bg: "bg-slate-300/10" },
    { place: 3, Icon: Medal, color: "text-amber-600", bg: "bg-amber-600/10" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative">
          {c.banner_url ? (
            <div className="h-28 w-full bg-cover bg-center" style={{ backgroundImage: `url(${c.banner_url})` }} />
          ) : (
            <div className="h-20 w-full bg-gradient-to-br from-cyan-500/30 via-cyan-500/10 to-transparent" />
          )}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 grid size-8 place-items-center rounded-full border border-border bg-background/80 text-foreground backdrop-blur hover:bg-background"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="border-b border-border p-4">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-cyan-500/15 text-cyan-400">
              <Trophy className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-extrabold leading-tight">{c.title}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                Рейтинг {METRIC_LABEL[c.metric]} · {TIER_LABEL[c.min_level]}+
              </p>
            </div>
            {joined && (
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                <CheckCircle2 className="size-3" /> Участвую
              </span>
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <MiniStat Icon={Coins} label="Призовой" value={fmtRub(c.prize_pool)} accent="text-cyan-400" />
            <MiniStat Icon={Calendar} label="Осталось" value={timeLeft(c.ends_at)} />
            <MiniStat Icon={Users} label="Участников" value={String(participants.length)} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border bg-secondary/30 p-1">
          {([
            { id: "about", label: "О турнире" },
            { id: "participants", label: `Участники · ${participants.length}` },
            { id: "leaderboard", label: "Рейтинг" },
          ] as const).map((tt) => (
            <button
              key={tt.id}
              onClick={() => setTab(tt.id)}
              className={`flex-1 rounded-lg px-2 py-2 text-[11px] font-bold uppercase tracking-wider transition ${
                tab === tt.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {tt.label}
            </button>
          ))}
        </div>

        {/* Body (scroll) */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "about" && (
            <div className="space-y-4">
              {c.description && (
                <p className="text-sm leading-relaxed text-foreground/90">{c.description}</p>
              )}
              {c.prizes.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Призовые места
                  </p>
                  <div className="space-y-1.5">
                    {c.prizes.map((p) => {
                      const pod = podium.find((x) => x.place === p.place);
                      return (
                        <div key={p.place} className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className={`grid size-8 place-items-center rounded-md ${pod ? pod.bg : "bg-background/40"} ${pod ? pod.color : "text-muted-foreground"}`}>
                              {pod ? <pod.Icon className="size-4" /> : <span className="font-mono text-[11px] font-bold">{p.place}</span>}
                            </div>
                            <p className="text-xs font-bold">{p.label || `${p.place} место`}</p>
                          </div>
                          <p className="font-mono text-sm font-extrabold tabular-nums text-cyan-300">{fmtRub(p.amount)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {c.rules && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Правила
                  </p>
                  <p className="whitespace-pre-wrap rounded-lg border border-border bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">
                    {c.rules}
                  </p>
                </div>
              )}
              <div className="rounded-xl border border-border bg-secondary/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Даты</p>
                <p className="mt-1 text-xs font-bold">
                  {new Date(c.starts_at).toLocaleString("ru-RU")} — {new Date(c.ends_at).toLocaleString("ru-RU")}
                </p>
              </div>
              {me && (
                <div className="flex items-center justify-between rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-cyan-300" />
                    <p className="text-xs font-bold">Ваше место: #{me.rank}</p>
                  </div>
                  <p className="font-mono text-sm font-extrabold tabular-nums text-cyan-300">
                    {c.metric === "earned" ? fmtRub(Number(me.score)) : `${fmtNum(Number(me.score))} ${METRIC_UNIT[c.metric]}`}
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === "participants" && (
            <div className="space-y-1.5">
              {participants.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                  Ещё нет участников. Станьте первым!
                </div>
              )}
              {participants.map((p) => (
                <div key={p.user_id} className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${p.user_id === userId ? "border-cyan-500/50 bg-cyan-500/10" : "border-border bg-secondary/30"}`}>
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-bold">
                      {(p.display_name || "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {p.display_name}{p.user_id === userId && <span className="ml-1 text-cyan-400">· вы</span>}
                    </p>
                    <p className="text-[10.5px] text-muted-foreground">
                      Вступил {new Date(p.joined_at).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "leaderboard" && (
            <div className="space-y-1.5">
              {board.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                  Пока никто не набрал очки
                </div>
              )}
              {board.map((r) => {
                const pod = podium.find((x) => x.place === r.rank);
                return (
                  <div
                    key={r.user_id}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${
                      r.is_me ? "border-cyan-500/50 bg-cyan-500/10" : "border-border bg-secondary/30"
                    }`}
                  >
                    <div className={`grid size-8 shrink-0 place-items-center rounded-md ${pod ? pod.bg : "bg-background/40"} ${pod ? pod.color : "text-muted-foreground"}`}>
                      {pod ? <pod.Icon className="size-4" /> : <span className="font-mono text-[11px] font-bold">{r.rank}</span>}
                    </div>
                    {r.avatar_url ? (
                      <img src={r.avatar_url} alt="" className="size-8 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-[10px] font-bold">
                        {(r.display_name || "?").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <p className="min-w-0 flex-1 truncate text-xs font-bold">
                      {r.display_name}{r.is_me && <span className="ml-1 text-cyan-400">· вы</span>}
                    </p>
                    <p className="font-mono text-xs font-extrabold tabular-nums">
                      {c.metric === "earned" ? fmtRub(Number(r.score)) : `${fmtNum(Number(r.score))} ${METRIC_UNIT[c.metric]}`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer / action */}
        <div className="border-t border-border bg-background/60 p-4">
          {joined ? (
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2.5 text-cyan-300">
                <CheckCircle2 className="size-4" />
                <p className="text-xs font-bold">Вы участвуете в турнире</p>
              </div>
              <button
                onClick={handleLeave}
                disabled={busy}
                className="rounded-xl border border-border bg-secondary/60 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Покинуть"}
              </button>
            </div>
          ) : eligible ? (
            <>
              <p className="mb-2 text-center text-[11px] text-muted-foreground">
                Подтвердите участие — очки будут учитываться с момента вступления.
              </p>
              <button
                onClick={handleJoin}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-extrabold uppercase tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Подтвердить участие
              </button>
            </>
          ) : (
            <div className="rounded-xl border border-border bg-secondary/40 p-3 text-center">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Lock className="size-3" /> Требуется уровень {TIER_LABEL[c.min_level]}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                До разблокировки осталось <span className="font-bold text-foreground">{fmtRub(Math.max(0, TIER_MIN[c.min_level] - earned))}</span> оборота
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
