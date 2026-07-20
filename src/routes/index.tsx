import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import {
  Loader2, Mail, Lock, User, Rocket, ShieldCheck, TrendingUp, Zap, Trophy,
  X, ArrowRight, Wallet, BarChart3, Headphones, Star, Check, Menu, Sparkles,
  Clock, Users, Target, Gift, MessageCircle, CreditCard, Globe, Award,
} from "lucide-react";
import { getLandingStats, type LandingStats } from "@/lib/landing-stats.functions";
import { randomAvatarUrl } from "@/lib/avatars";

function formatRub(n: number): string {
  if (n >= 1_000_000_000) return `₽${(n / 1_000_000_000).toFixed(n >= 10_000_000_000 ? 0 : 1)} млрд`;
  if (n >= 1_000_000) return `₽${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)} млн`;
  if (n >= 1_000) return `₽${(n / 1_000).toFixed(0)} тыс`;
  return `₽${Math.round(n)}`;
}
function formatCount(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n);
}



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "КВАНТ — партнёрская платформа с быстрыми выплатами" },
      { name: "description", content: "Топовые офферы, прозрачная статистика в реальном времени и выплаты от 1 часа. Присоединяйтесь к партнёрской платформе КВАНТ." },
      { property: "og:title", content: "КВАНТ — партнёрская платформа" },
      { property: "og:description", content: "Офферы, статистика, выплаты — всё в одном кабинете." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const emailSchema = z.string().trim().email("Некорректный email").max(255);
const passwordSchema = z.string().min(6, "Минимум 6 символов").max(72, "Максимум 72 символа");
const nameSchema = z.string().trim().min(2, "Минимум 2 символа").max(60);

type Mode = "login" | "register";

function LandingPage() {
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<Mode>("login");
  const [menuOpen, setMenuOpen] = useState(false);

  const [stats, setStats] = useState<LandingStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) navigate({ to: "/dashboard" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/dashboard" });
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    getLandingStats().then((s) => { if (!cancelled) setStats(s); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const openAuth = (m: Mode) => { setInitialMode(m); setAuthOpen(true); setMenuOpen(false); };

  const tickerItems = useMemo(() => {
    const items = stats?.ticker ?? [];
    if (items.length === 0) return [];
    return items.concat(items).map((t, i) => ({ ...t, key: i }));
  }, [stats]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <a href="#top" className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground font-black">К</div>
            <span className="text-sm font-black tracking-wider">КВАНТ</span>
          </a>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#offers" className="text-sm text-muted-foreground hover:text-foreground">Офферы</a>
            <a href="#levels" className="text-sm text-muted-foreground hover:text-foreground">Уровни</a>
            <a href="#how" className="text-sm text-muted-foreground hover:text-foreground">Как это работает</a>
            <a href="/news" className="text-sm text-muted-foreground hover:text-foreground">Новости</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground">FAQ</a>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <button onClick={() => openAuth("login")} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-secondary">
              Войти
            </button>
            <button onClick={() => openAuth("register")} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-bold text-primary-foreground hover:bg-primary/90">
              Начать <ArrowRight className="size-3.5" />
            </button>
          </div>
          <button className="md:hidden" onClick={() => setMenuOpen(v => !v)} aria-label="Меню">
            <Menu className="size-5" />
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-border bg-background md:hidden">
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
              <a href="#offers" onClick={() => setMenuOpen(false)} className="rounded-md px-2 py-2 text-sm hover:bg-secondary">Офферы</a>
              <a href="#levels" onClick={() => setMenuOpen(false)} className="rounded-md px-2 py-2 text-sm hover:bg-secondary">Уровни</a>
              <a href="#how" onClick={() => setMenuOpen(false)} className="rounded-md px-2 py-2 text-sm hover:bg-secondary">Как это работает</a>
              <a href="/news" onClick={() => setMenuOpen(false)} className="rounded-md px-2 py-2 text-sm hover:bg-secondary">Новости</a>
              <a href="#faq" onClick={() => setMenuOpen(false)} className="rounded-md px-2 py-2 text-sm hover:bg-secondary">FAQ</a>
              <div className="mt-2 flex gap-2">
                <button onClick={() => openAuth("login")} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold">Войти</button>
                <button onClick={() => openAuth("register")} className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">Начать</button>
              </div>
            </div>

          </div>
        )}
      </header>

      {/* HERO */}
      <section id="top" className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-140px] size-[620px] -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
          <div className="absolute left-[5%] top-40 size-[280px] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute right-[5%] top-60 size-[320px] rounded-full bg-primary/15 blur-3xl" />
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-12 md:pb-20 md:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
              <span className="relative flex size-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              {stats ? `${formatCount(stats.partners)} партнёров в сети` : "Партнёрская сеть КВАНТ"}
            </div>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-[64px]">
              Зарабатывайте на рекомендациях с{" "}
              <span className="bg-gradient-to-br from-primary via-primary to-primary/50 bg-clip-text text-transparent">КВАНТ</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              {stats && stats.offersCount > 0 ? `${stats.offersCount} проверенных офферов` : "Проверенные офферы"}, живая статистика в реальном времени и выплаты <span className="font-bold text-foreground">от 1 часа</span>.{stats && stats.totalPaid > 0 ? <> Партнёры вывели <span className="font-bold text-foreground">{formatRub(stats.totalPaid)}</span> — присоединяйтесь.</> : " Присоединяйтесь."}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button onClick={() => openAuth("register")} className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/40 sm:w-auto">
                Создать аккаунт <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </button>
              <button onClick={() => openAuth("login")} className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-bold hover:bg-secondary sm:w-auto">
                У меня уже есть аккаунт
              </button>
            </div>
            <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              {["Без вложений", "Без модерации на входе", "Поддержка 24/7"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-primary" />{t}</li>
              ))}
            </ul>
          </div>

          {/* Live ticker */}
          <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur">
            <div className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5">
              <span className="relative flex size-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Живая лента действий</span>
              <span className="ml-auto text-[11px] text-muted-foreground">обновление в реальном времени</span>
            </div>
            <div className="relative overflow-hidden">
              {tickerItems.length > 0 ? (
                <div className="flex animate-[marquee_50s_linear_infinite] gap-8 whitespace-nowrap py-3 px-4 text-sm">
                  {tickerItems.map((t) => {
                    const dot =
                      t.kind === "conversion" ? "bg-emerald-500"
                      : t.kind === "payout" ? "bg-primary"
                      : t.kind === "signup" ? "bg-sky-500"
                      : t.kind === "offer" ? "bg-amber-500"
                      : "bg-muted-foreground";
                    const badge =
                      t.kind === "conversion" ? "bg-emerald-500/15 text-emerald-500"
                      : "bg-primary/15 text-primary";
                    return (
                      <span key={t.key} className="inline-flex items-center gap-2 text-muted-foreground">
                        <span className={`size-1.5 rounded-full ${dot}`} />
                        <span className="font-bold text-foreground">{t.who}</span>
                        <span>{t.text}</span>
                        {typeof t.amount === "number" && t.amount > 0 && (
                          <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${badge}`}>
                            +{formatRub(t.amount)}
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-4 text-center text-xs text-muted-foreground">
                  Первые действия появятся здесь, как только партнёры начнут работу.
                </div>
              )}
            </div>
          </div>

          {/* Big stats */}
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { v: stats ? formatCount(stats.partners) : "—", l: "партнёров в сети", Icon: Users },
              { v: stats ? formatRub(stats.totalPaid) : "—", l: "выплачено партнёрам", Icon: Wallet },
              { v: stats ? formatCount(stats.completedConversions) : "—", l: "подтверждённых конверсий", Icon: TrendingUp },
              { v: stats ? formatCount(stats.offersCount) : "—", l: "активных офферов", Icon: Rocket },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur">
                <s.Icon className="size-4 text-primary" />
                <div className="mt-3 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-2xl font-black text-transparent md:text-3xl">{s.v}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground md:text-[11px]">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OFFERS */}
      <section id="offers" className="border-t border-border/60 bg-secondary/20 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <div className="text-[11px] font-bold uppercase tracking-widest text-primary">Каталог</div>
              <h2 className="mt-2 text-3xl font-black md:text-4xl">Топовые офферы недели</h2>
              <p className="mt-3 text-muted-foreground">{stats ? `${stats.offersCount} рекламодателей` : "Рекламодатели"}: финтех, EdTech, travel, SaaS. Эксклюзивные ставки — недоступны напрямую.</p>
            </div>
            <button onClick={() => openAuth("register")} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-bold hover:bg-secondary">
              Смотреть все <ArrowRight className="size-4" />
            </button>
          </div>
          {stats && stats.offers.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
              Пока нет активных офферов. Загляните чуть позже.
            </div>
          ) : (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(stats?.offers ?? []).map((o) => (
                <div key={o.id} className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                  {o.is_new && (
                    <span className="absolute -top-2 right-4 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                      <Zap className="size-3" /> New
                    </span>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{o.category ?? "Оффер"}</span>
                    <Star className="size-4 text-primary" />
                  </div>
                  <h3 className="mt-3 text-base font-bold">{o.name}</h3>
                  <div className="mt-4 grid flex-1 grid-cols-3 gap-3 border-t border-border pt-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Выплата</div>
                      <div className="mt-0.5 text-sm font-bold text-primary">{o.payout}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">CR</div>
                      <div className="mt-0.5 text-sm font-bold">{o.cr > 0 ? `${o.cr}%` : "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">EPC</div>
                      <div className="mt-0.5 text-sm font-bold">{o.epc > 0 ? `₽${o.epc}` : "—"}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <div className="text-[11px] font-bold uppercase tracking-widest text-primary">Инструменты</div>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Всё в одном кабинете</h2>
            <p className="mt-3 text-muted-foreground">Без лишнего. Только то, что реально помогает партнёру зарабатывать.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { Icon: Rocket, title: "40+ офферов", desc: "Финансы, EdTech, travel, финтех, SaaS — с эксклюзивными условиями." },
              { Icon: BarChart3, title: "Живая статистика", desc: "EPC, CR, holds и когорты — всё обновляется в реальном времени." },
              { Icon: Wallet, title: "Быстрые выплаты", desc: "От 72 часов на старте до 1 часа на «Платине». Минималка ₽1 000." },
              { Icon: TrendingUp, title: "Уровни и бонусы", desc: "+5%…+15% к ставкам, укороченные холды, приоритет модерации." },
              { Icon: Headphones, title: "Личный менеджер", desc: "С уровня «Золото» — 24/7. Знает ваши источники и KPI." },
              { Icon: ShieldCheck, title: "Честные правила", desc: "Публичная антифрод-политика, никаких блокировок задним числом." },
              { Icon: Target, title: "S2S постбэки", desc: "Полноценная интеграция с вашим трекером — Keitaro, Binom, RedTrack." },
              { Icon: Globe, title: "Любые источники", desc: "Контекст, таргет, SEO, Telegram, YouTube, push, in-app, офлайн." },
              { Icon: Gift, title: "Конкурсы и призы", desc: "Ежемесячно: MacBook, iPhone, поездки в Дубай для топ-партнёров." },
            ].map((f) => (
              <div key={f.title} className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm">
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.Icon className="size-5" />
                </div>
                <h3 className="mt-4 text-base font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LEVELS */}
      <section id="levels" className="border-t border-border/60 bg-secondary/20 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <div className="text-[11px] font-bold uppercase tracking-widest text-primary">Прогресс</div>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Растёте — растут и бонусы</h2>
            <p className="mt-3 text-muted-foreground">4 уровня партнёра. Все привилегии применяются автоматически.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "Старт", color: "from-slate-500 to-slate-400", from: "₽0", perks: ["Базовые ставки", "Выплаты от 72 ч", "Общий чат"], Icon: Sparkles },
              { name: "Серебро", color: "from-zinc-400 to-zinc-300", from: "₽50 000", perks: ["+5% к ставкам", "Выплаты от 24 ч", "Приоритет модерации"], Icon: Award },
              { name: "Золото", color: "from-amber-400 to-yellow-300", from: "₽250 000", perks: ["+10% к ставкам", "Выплаты от 6 ч", "Личный менеджер 24/7"], Icon: Trophy, popular: true },
              { name: "Платина", color: "from-primary to-primary/60", from: "₽1 000 000", perks: ["+15% к ставкам", "Выплаты от 1 ч", "Эксклюзивные офферы", "Закрытый Telegram-чат"], Icon: Zap },
            ].map((l) => (
              <div key={l.name} className={`relative rounded-2xl border p-5 ${l.popular ? "border-primary bg-card shadow-lg shadow-primary/10" : "border-border bg-card"}`}>
                {l.popular && (
                  <span className="absolute -top-2.5 left-5 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                    Популярно
                  </span>
                )}
                <div className={`inline-flex items-center gap-2 rounded-lg bg-gradient-to-br ${l.color} bg-clip-text px-0 text-transparent`}>
                  <l.Icon className="size-5 text-primary" />
                  <span className="text-lg font-black">{l.name}</span>
                </div>
                <div className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">от оборота</div>
                <div className="text-xl font-black">{l.from}</div>
                <ul className="mt-4 space-y-2 border-t border-border pt-4">
                  {l.perks.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <div className="text-[11px] font-bold uppercase tracking-widest text-primary">За 3 шага</div>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Как это работает</h2>
            <p className="mt-3 text-muted-foreground">От регистрации до первой выплаты — обычно 4 дня.</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", Icon: User, t: "Зарегистрируйтесь", d: "Email и пара кликов — без долгих анкет и модерации на входе.", time: "~1 минута" },
              { n: "02", Icon: Target, t: "Выберите оффер", d: "Копируете партнёрскую ссылку и запускаете трафик из любого источника.", time: "~10 минут" },
              { n: "03", Icon: CreditCard, t: "Получайте выплаты", d: "Живая статистика, вывод на карту, USDT, СБП или банковский перевод.", time: "от 1 часа" },
            ].map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center justify-between">
                  <div className="text-4xl font-black text-primary/30">{s.n}</div>
                  <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <s.Icon className="size-5" />
                  </div>
                </div>
                <h3 className="mt-3 text-lg font-bold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                  <Clock className="size-3" /> {s.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-t border-border/60 bg-secondary/20 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <div className="text-[11px] font-bold uppercase tracking-widest text-primary">Отзывы</div>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Что говорят партнёры</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { name: "Артём К.", role: "Арбитражник, ~₽800k/мес", text: "Раньше лил на 3 сетки параллельно. С КВАНТом одной хватает — офферы жирнее, холды короче, менеджер быстрее." },
              { name: "Мария О.", role: "Команда, 8 человек", text: "Субаккаунты + API постбэков закрыли все наши боли. Управление командой стало занимать 20 минут в день, а не два часа." },
              { name: "Дмитрий В.", role: "Новичок, 3 месяца", text: "Начал с нуля, менеджер новичка провёл за руку по первым связкам. На 4-й день вышел в плюс, сейчас стабильно ₽120k." },
            ].map((t) => (
              <div key={t.name} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex gap-0.5 text-primary">
                  {[0,1,2,3,4].map(i => <Star key={i} className="size-4 fill-primary" />)}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-foreground/90">«{t.text}»</p>
                <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                  <div className="grid size-10 place-items-center rounded-full bg-primary/10 font-black text-primary">{t.name[0]}</div>
                  <div>
                    <div className="text-sm font-bold">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NUMBERS STRIP */}
      <section className="border-t border-border/60 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
            {[
              { v: stats ? `₽${formatCount(stats.avgEpc)}` : "—", l: "средний EPC по топ-офферам" },
              { v: stats ? formatCount(stats.offersCount) : "—", l: "активных офферов" },
              { v: stats ? formatCount(stats.completedConversions) : "—", l: "подтверждённых конверсий" },
              { v: stats ? formatRub(stats.totalPaid) : "—", l: "выплачено партнёрам" },
            ].map((s) => (
              <div key={s.l}>
                <div className="bg-gradient-to-br from-primary to-primary/50 bg-clip-text text-3xl font-black text-transparent md:text-4xl">{s.v}</div>
                <div className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-border/60 bg-secondary/20 py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4">
          <div className="text-center">
            <div className="text-[11px] font-bold uppercase tracking-widest text-primary">FAQ</div>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Частые вопросы</h2>
          </div>
          <div className="mt-10 space-y-3">
            {[
              { q: "Нужен ли опыт в арбитраже?", a: "Нет. База знаний, гайды по офферам, менеджер новичка на первые 30 дней и живой чат поддержки — вы не останетесь один." },
              { q: "Как быстро приходят выплаты?", a: "От 72 часов на старте, от 1 часа на «Платине». В прошлом месяце средний срок по всей сети составил 8 ч 12 мин." },
              { q: "Есть ли минимальная сумма вывода?", a: "1 000 ₽. Способы: карта РФ, USDT (TRC-20/ERC-20), СБП, банковский перевод для ИП и юрлиц, WMZ, Payoneer." },
              { q: "Можно ли лить с бурж-трафика?", a: "Да, но условия зависят от оффера — часть работает только по РФ/СНГ, часть открыта на бурж. Уточняйте в карточке оффера." },
              { q: "Что с антифродом?", a: "Публичный регламент, никаких блокировок задним числом. Все спорные ситуации разбираются с логами и скриншотами в открытом тикете." },
              { q: "Есть ли API и постбэки?", a: "Да. Полноценный REST API, S2S-постбэки с макросами, интеграции с Keitaro, Binom, RedTrack и любым кастомным трекером." },
            ].map((f) => (
              <details key={f.q} className="group rounded-xl border border-border bg-card p-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-bold">
                  {f.q}
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 text-center md:p-14">
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-60">
              <div className="absolute -right-24 -top-24 size-72 rounded-full bg-primary/25 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 size-72 rounded-full bg-primary/15 blur-3xl" />
            </div>
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
              <MessageCircle className="size-3" /> Регистрация меньше минуты
            </div>
            <h2 className="mt-4 text-3xl font-black md:text-4xl">Готовы начать зарабатывать?</h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">Первый оффер можно запустить сразу. Первая выплата — уже сегодня.</p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button onClick={() => openAuth("register")} className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90 hover:shadow-primary/40 sm:w-auto">
                Создать аккаунт <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </button>
              <button onClick={() => openAuth("login")} className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-background px-6 py-3.5 text-sm font-bold hover:bg-secondary sm:w-auto">
                Войти в кабинет
              </button>
            </div>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              {["Без вложений", "Без модерации на входе", "Поддержка 24/7", "Выплаты от 1 часа"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-primary" />{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>



      {/* FOOTER */}
      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground text-xs font-black">К</div>
            <span className="text-xs font-bold tracking-wider">КВАНТ © {new Date().getFullYear()}</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
            <a href="/news" className="text-muted-foreground hover:text-foreground">Новости</a>
            <a href="/terms" className="text-muted-foreground hover:text-foreground">Оферта</a>
            <a href="/privacy" className="text-muted-foreground hover:text-foreground">Конфиденциальность</a>
            <a href="/cookies" className="text-muted-foreground hover:text-foreground">Cookies</a>
            <a href="/legal" className="text-muted-foreground hover:text-foreground">Все документы</a>
          </nav>
          <p className="text-xs text-muted-foreground">Партнёрская платформа для профессионалов трафика.</p>
        </div>
      </footer>


      {authOpen && <AuthDialog initialMode={initialMode} onClose={() => setAuthOpen(false)} />}
    </div>
  );
}

function AuthDialog({ initialMode, onClose }: { initialMode: Mode; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setInfo(null);
    try {
      const em = emailSchema.parse(email);
      const pw = passwordSchema.parse(password);
      if (mode === "register") nameSchema.parse(displayName);
      setLoading(true);
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({ email: em, password: pw });
        if (err) throw err;
      } else {
        const avatar = randomAvatarUrl(em);
        const { data: signUpData, error: err } = await supabase.auth.signUp({
          email: em, password: pw,
          options: { emailRedirectTo: window.location.origin, data: { display_name: displayName.trim(), avatar_url: avatar } },
        });
        if (err) throw err;
        // Best-effort: ensure the profile row has the avatar (in case the trigger doesn't pick it up).
        if (signUpData.user) {
          try { await supabase.from("profiles").update({ avatar_url: avatar }).eq("id", signUpData.user.id); } catch { /* ignore */ }
        }
        setInfo("Регистрация прошла успешно. Если email-подтверждение включено — проверьте почту.");
      }
    } catch (e: unknown) {
      const msg = e instanceof z.ZodError ? e.errors[0]?.message : e instanceof Error ? e.message : "Ошибка";
      setError(msg ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <button onClick={onClose} aria-label="Закрыть" className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground">
          <X className="size-4" />
        </button>
        <div className="grid grid-cols-2 border-b border-border">
          {(["login", "register"] as Mode[]).map((m) => (
            <button key={m}
              onClick={() => { setMode(m); setError(null); setInfo(null); }}
              className={`px-4 py-3 text-sm font-bold uppercase tracking-wider transition ${
                mode === m ? "bg-background text-foreground" : "bg-secondary/40 text-muted-foreground hover:text-foreground"
              }`}>
              {m === "login" ? "Вход" : "Регистрация"}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-3 p-5">
          <div className="pb-1">
            <h3 className="text-lg font-black">{mode === "login" ? "С возвращением!" : "Создайте аккаунт"}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {mode === "login" ? "Войдите, чтобы продолжить работу." : "Регистрация занимает меньше минуты."}
            </p>
          </div>

          {mode === "register" && (
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Имя</span>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-primary/40">
                <User className="size-4 text-muted-foreground" />
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required autoComplete="name" placeholder="Как к вам обращаться" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
              </div>
            </label>
          )}

          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Email</span>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-primary/40">
              <Mail className="size-4 text-muted-foreground" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
            </div>
          </label>

          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Пароль</span>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-primary/40">
              <Lock className="size-4 text-muted-foreground" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={mode === "login" ? "Ваш пароль" : "Минимум 6 символов"} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
            </div>
          </label>

          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{error}</p>}
          {info && <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-[12px] text-primary">{info}</p>}

          <button type="submit" disabled={loading} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60">
            {loading && <Loader2 className="size-4 animate-spin" />}
            {mode === "login" ? "Войти" : "Создать аккаунт"}
          </button>

          {mode === "register" && (
            <p className="pt-1 text-center text-[11px] leading-relaxed text-muted-foreground">
              Создавая аккаунт, вы соглашаетесь с{" "}
              <a href="/terms" target="_blank" rel="noreferrer" className="font-bold text-primary hover:underline">офертой</a>
              {" "}и{" "}
              <a href="/privacy" target="_blank" rel="noreferrer" className="font-bold text-primary hover:underline">политикой конфиденциальности</a>.
            </p>
          )}


          <p className="pt-1 text-center text-[11px] text-muted-foreground">
            {mode === "login" ? (
              <>Нет аккаунта? <button type="button" onClick={() => setMode("register")} className="font-bold text-primary hover:underline">Зарегистрироваться</button></>
            ) : (
              <>Уже есть аккаунт? <button type="button" onClick={() => setMode("login")} className="font-bold text-primary hover:underline">Войти</button></>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
