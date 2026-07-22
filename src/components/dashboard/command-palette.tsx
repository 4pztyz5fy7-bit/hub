import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutGrid, Package, BarChart3, Wallet, Sparkles, Trophy,
  Headphones, Inbox, UserCircle, Shield, Bell, Search, ArrowUpRight,
  Command, CornerDownLeft, type LucideIcon,
} from "lucide-react";

export type PaletteTab =
  | "info" | "offers" | "requests" | "stats" | "payouts"
  | "ai" | "rewards" | "support" | "profile";

type OfferLite = { id: string; name: string; tag: string; category?: string };

type Action = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  Icon: LucideIcon;
  keywords?: string;
  run: () => void;
};

export function CommandPalette({
  open,
  onClose,
  onNavigate,
  onOpenNotifs,
  onOpenLevels,
  onOpenBank,
  onOpenPayout,
  isAdmin,
  onOpenAdmin,
  offers,
  onOpenOffer,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (t: PaletteTab) => void;
  onOpenNotifs: () => void;
  onOpenLevels: () => void;
  onOpenBank: () => void;
  onOpenPayout: () => void;
  isAdmin: boolean;
  onOpenAdmin: () => void;
  offers: OfferLite[];
  onOpenOffer: (offerId: string) => void;
}) {
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setCursor(0);
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const wrap = (fn: () => void) => () => { fn(); onClose(); };

  const nav = (t: PaletteTab): Action["run"] => wrap(() => onNavigate(t));

  const actions: Action[] = useMemo(() => {
    const base: Action[] = [
      { id: "n-info", label: "Обзор", hint: "Главная панель", group: "Навигация", Icon: LayoutGrid, run: nav("info") },
      { id: "n-offers", label: "Офферы", hint: "Каталог продуктов", group: "Навигация", Icon: Package, run: nav("offers") },
      { id: "n-requests", label: "Мои заявки", hint: "Отслеживание", group: "Навигация", Icon: Inbox, run: nav("requests") },
      { id: "n-stats", label: "Аналитика", hint: "Графики и метрики", group: "Навигация", Icon: BarChart3, run: nav("stats") },
      { id: "n-payouts", label: "Выплаты", hint: "История и вывод", group: "Навигация", Icon: Wallet, run: nav("payouts") },
      { id: "n-ai", label: "AI-наставник", hint: "Помощник Gemini", group: "Навигация", Icon: Sparkles, run: nav("ai") },
      { id: "n-rewards", label: "Награды", hint: "Достижения и уровни", group: "Навигация", Icon: Trophy, run: nav("rewards") },
      { id: "n-support", label: "Поддержка", hint: "Тикеты", group: "Навигация", Icon: Headphones, run: nav("support") },
      { id: "n-profile", label: "Профиль", hint: "Настройки", group: "Навигация", Icon: UserCircle, run: nav("profile") },

      { id: "a-notif", label: "Открыть уведомления", group: "Действия", Icon: Bell, run: wrap(onOpenNotifs) },
      { id: "a-levels", label: "Открыть уровни", group: "Действия", Icon: Trophy, run: wrap(onOpenLevels) },
      { id: "a-bank", label: "Реквизиты для вывода", group: "Действия", Icon: Wallet, run: wrap(onOpenBank) },
      { id: "a-payout", label: "Запросить выплату", group: "Действия", Icon: ArrowUpRight, run: wrap(onOpenPayout) },
    ];
    if (isAdmin) {
      base.push({
        id: "a-admin", label: "Админ-панель", group: "Действия", Icon: Shield, run: wrap(onOpenAdmin),
      });
    }
    for (const o of offers.slice(0, 60)) {
      base.push({
        id: `o-${o.id}`,
        label: o.name,
        hint: `${o.tag}${o.category ? " · " + o.category : ""}`,
        group: "Офферы",
        Icon: Package,
        keywords: `${o.tag} ${o.category ?? ""}`,
        run: wrap(() => onOpenOffer(o.id)),
      });
    }
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offers, isAdmin]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return actions;
    return actions.filter((a) =>
      (a.label + " " + (a.hint ?? "") + " " + (a.keywords ?? "")).toLowerCase().includes(s),
    );
  }, [q, actions]);

  const grouped = useMemo(() => {
    const map = new Map<string, Action[]>();
    for (const a of filtered) {
      if (!map.has(a.group)) map.set(a.group, []);
      map.get(a.group)!.push(a);
    }
    return Array.from(map.entries());
  }, [filtered]);

  useEffect(() => { setCursor(0); }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(filtered.length - 1, c + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(0, c - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        filtered[cursor]?.run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, cursor, onClose]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${cursor}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (!open) return null;

  let runningIdx = -1;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-background/60 p-4 pt-[10vh] backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-in-up w-full max-w-xl overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl shadow-primary/10 ring-1 ring-primary/5"
      >
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск действий, страниц, офферов…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden items-center gap-1 rounded-md border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[55vh] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="grid place-items-center gap-2 px-4 py-10 text-center">
              <Search className="size-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Ничего не найдено по «{q}»</p>
            </div>
          )}
          {grouped.map(([group, items]) => (
            <div key={group} className="mb-2 last:mb-0">
              <div className="px-2 pb-1 pt-2 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {group}
              </div>
              <div className="space-y-0.5">
                {items.map((a) => {
                  runningIdx += 1;
                  const idx = runningIdx;
                  const active = idx === cursor;
                  return (
                    <button
                      key={a.id}
                      data-idx={idx}
                      onMouseEnter={() => setCursor(idx)}
                      onClick={a.run}
                      className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                        active
                          ? "bg-primary/10 text-foreground"
                          : "text-foreground/90 hover:bg-accent"
                      }`}
                    >
                      <div className={`grid size-8 shrink-0 place-items-center rounded-md ${
                        active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground/80"
                      }`}>
                        <a.Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{a.label}</p>
                        {a.hint && (
                          <p className="truncate text-[11px] text-muted-foreground">{a.hint}</p>
                        )}
                      </div>
                      {active && (
                        <CornerDownLeft className="size-3.5 shrink-0 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border/60 bg-secondary/40 px-3 py-2 font-mono text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1">↑</kbd>
              <kbd className="rounded border border-border bg-background px-1">↓</kbd>
              навигация
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1">↵</kbd> открыть
            </span>
          </div>
          <span className="inline-flex items-center gap-1">
            <Command className="size-3" /> KVANT · Command
          </span>
        </div>
      </div>
    </div>
  );
}
