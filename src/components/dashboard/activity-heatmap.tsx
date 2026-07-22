import { useMemo } from "react";
import { Activity } from "lucide-react";

type C = { amount: number; status: string; createdAt: string };

/**
 * GitHub-style activity heatmap: last 12 weeks × 7 days of successful
 * conversions. Reads what's already in the dashboard — no extra fetch.
 */
export function ActivityHeatmap({ conversions }: { conversions: C[] }) {
  const WEEKS = 12;

  const { grid, total, best, weekdayHits, streak } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    // Align to Monday of the earliest week
    const dayOff = (today.getDay() + 6) % 7;
    start.setDate(today.getDate() - dayOff - (WEEKS - 1) * 7);

    const cells: { count: number; amount: number; date: Date }[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      const col: { count: number; amount: number; date: Date }[] = [];
      for (let d = 0; d < 7; d++) {
        const dt = new Date(start);
        dt.setDate(start.getDate() + w * 7 + d);
        col.push({ count: 0, amount: 0, date: dt });
      }
      cells.push(col);
    }

    const isWithin = (d: Date) => d >= start && d <= today;
    for (const c of conversions) {
      if (c.status !== "ok") continue;
      const d = new Date(c.createdAt);
      if (isNaN(d.getTime())) continue;
      d.setHours(0, 0, 0, 0);
      if (!isWithin(d)) continue;
      const diff = Math.floor((d.getTime() - start.getTime()) / 86400000);
      const w = Math.floor(diff / 7);
      const dd = diff % 7;
      if (cells[w]?.[dd]) {
        cells[w][dd].count += 1;
        cells[w][dd].amount += c.amount;
      }
    }

    let total = 0;
    let best = 0;
    const weekdayHits = [0, 0, 0, 0, 0, 0, 0];
    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < 7; d++) {
        const cell = cells[w][d];
        total += cell.count;
        best = Math.max(best, cell.count);
        weekdayHits[d] += cell.count;
      }
    }

    // Compute streak (consecutive days with ≥1 conversion, ending today or yesterday)
    let streak = 0;
    for (let i = WEEKS * 7 - 1; i >= 0; i--) {
      const w = Math.floor(i / 7);
      const d = i % 7;
      const cell = cells[w][d];
      if (cell.date > today) continue;
      if (cell.count > 0) streak += 1;
      else break;
    }

    return { grid: cells, total, best, weekdayHits, streak };
  }, [conversions]);

  const bestWeekday = weekdayHits.indexOf(Math.max(...weekdayHits));
  const dayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  const level = (n: number) => {
    if (n <= 0 || best === 0) return 0;
    const r = n / best;
    if (r > 0.75) return 4;
    if (r > 0.5) return 3;
    if (r > 0.25) return 2;
    return 1;
  };

  const cellClass = (lv: number) =>
    [
      "bg-secondary",
      "bg-primary/20",
      "bg-primary/40",
      "bg-primary/70",
      "bg-primary",
    ][lv];

  return (
    <section className="animate-in-up rounded-xl border border-border bg-card p-4" style={{ animationDelay: "150ms" }}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <Activity className="size-3" /> Активность · 12 недель
          </p>
          <p className="mt-0.5 font-mono text-sm font-bold tabular-nums">
            {total} <span className="text-muted-foreground">конверсий</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Стрик</p>
          <p className="mt-0.5 font-mono text-sm font-bold text-primary tabular-nums">
            🔥 {streak} <span className="text-muted-foreground">дн.</span>
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex flex-col justify-between py-0.5 font-mono text-[9px] uppercase text-muted-foreground">
          {dayLabels.map((d, i) => (
            <span key={d} className={i === bestWeekday ? "font-bold text-primary" : ""}>
              {i % 2 === 0 ? d : ""}
            </span>
          ))}
        </div>
        <div className="flex flex-1 gap-1">
          {grid.map((col, wi) => (
            <div key={wi} className="flex flex-1 flex-col gap-1">
              {col.map((cell, di) => {
                const lv = level(cell.count);
                return (
                  <div
                    key={di}
                    title={`${cell.date.toLocaleDateString("ru-RU")} · ${cell.count} конв.`}
                    className={`h-3 flex-1 rounded-sm ${cellClass(lv)} transition-colors`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px]">
        <span className="font-mono uppercase text-muted-foreground">
          Лучший день: {dayLabels[bestWeekday]}
        </span>
        <div className="flex items-center gap-1 font-mono text-muted-foreground">
          меньше
          {[0, 1, 2, 3, 4].map((lv) => (
            <span key={lv} className={`size-2.5 rounded-sm ${cellClass(lv)}`} />
          ))}
          больше
        </div>
      </div>
    </section>
  );
}
