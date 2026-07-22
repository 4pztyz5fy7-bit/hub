import { translateError } from "@/lib/errors-ru";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import {
  Loader2, Mail, Lock, User, Rocket, ShieldCheck, TrendingUp, Zap, Trophy,
  X, ArrowRight, Wallet, BarChart3, Headphones, Star, Check, Menu, Sparkles,
  Clock, Target, Gift, MessageCircle, CreditCard, Globe, Award,
  Compass, Layers, Radar, Cpu, Network, Infinity as InfinityIcon, Diamond, Feather, Waypoints,
} from "lucide-react";
import { randomAvatarUrl } from "@/lib/avatars";
import { AmbientBackdrop } from "@/components/ambient-backdrop";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "КВАНТ — партнёрская платформа нового поколения" },
      { name: "description", content: "Экосистема для профессионалов трафика: проверенные офферы, честные правила, менеджеры 24/7 и выплаты от одного часа." },
      { property: "og:title", content: "КВАНТ — партнёрская платформа" },
      { property: "og:description", content: "Экосистема, инструменты и сообщество для профессионалов трафика." },
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

  const openAuth = (m: Mode) => { setInitialMode(m); setAuthOpen(true); setMenuOpen(false); };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <AmbientBackdrop variant="landing" />

      {/* NAV */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <a href="#top" className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground font-black">К</div>
            <span className="text-sm font-black tracking-wider">КВАНТ</span>
          </a>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#ecosystem" className="text-sm text-muted-foreground hover:text-foreground">Экосистема</a>
            <a href="#manifesto" className="text-sm text-muted-foreground hover:text-foreground">Манифест</a>
            <a href="#levels" className="text-sm text-muted-foreground hover:text-foreground">Уровни</a>
            <a href="#how" className="text-sm text-muted-foreground hover:text-foreground">Как это работает</a>
            <a href="#audience" className="text-sm text-muted-foreground hover:text-foreground">Кому подойдёт</a>
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
              <a href="#ecosystem" onClick={() => setMenuOpen(false)} className="rounded-md px-2 py-2 text-sm hover:bg-secondary">Экосистема</a>
              <a href="#manifesto" onClick={() => setMenuOpen(false)} className="rounded-md px-2 py-2 text-sm hover:bg-secondary">Манифест</a>
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
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 md:pb-24 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
              <Sparkles className="size-3" />
              Партнёрская экосистема нового поколения
            </div>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-[64px]">
              Мы строим{" "}
              <span className="bg-gradient-to-br from-primary via-primary to-primary/40 bg-clip-text text-transparent">пространство</span>,<br className="hidden md:block" />
              где трафик становится делом жизни
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              КВАНТ — это не про «ещё одну сетку». Это экосистема из проверенных офферов, честных правил, менеджеров с реальным опытом и сообщества, которое двигает индустрию вперёд.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button onClick={() => openAuth("register")} className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/40 sm:w-auto">
                Стать частью КВАНТ <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </button>
              <button onClick={() => openAuth("login")} className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-card/70 px-6 py-3.5 text-sm font-bold backdrop-blur hover:bg-secondary sm:w-auto">
                Войти в кабинет
              </button>
            </div>
            <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              {["Без вложений", "Без модерации на входе", "Поддержка 24/7"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-primary" />{t}</li>
              ))}
            </ul>
          </div>

          {/* Ecosystem chips */}
          <div className="relative mx-auto mt-14 max-w-4xl">
            <svg aria-hidden viewBox="0 0 800 260" className="pointer-events-none absolute inset-0 h-full w-full opacity-30">
              <defs>
                <linearGradient id="ln" x1="0" x2="1">
                  <stop offset="0" stopColor="currentColor" stopOpacity="0" />
                  <stop offset="0.5" stopColor="currentColor" stopOpacity="1" />
                  <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              <g className="text-primary" stroke="url(#ln)" strokeWidth="1" fill="none">
                <path d="M60 130 C 220 30, 320 30, 400 130" className="ambient-dash" />
                <path d="M740 130 C 580 230, 480 230, 400 130" className="ambient-dash" />
                <path d="M60 130 C 220 230, 320 230, 400 130" className="ambient-dash" />
                <path d="M740 130 C 580 30, 480 30, 400 130" className="ambient-dash" />
              </g>
            </svg>
            <div className="relative grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { Icon: Rocket, t: "Офферы" },
                { Icon: Radar, t: "Аналитика" },
                { Icon: Wallet, t: "Выплаты" },
                { Icon: Headphones, t: "Поддержка" },
              ].map((c, i) => (
                <div key={c.t} className="group relative flex items-center gap-2 rounded-2xl border border-border bg-card/70 p-3 backdrop-blur-md transition hover:border-primary/40" style={{ animation: `kvant-slide-up .6s ease ${i * 0.08}s both` }}>
                  <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <c.Icon className="size-4" />
                  </div>
                  <span className="text-sm font-bold">{c.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ECOSYSTEM */}
      <section id="ecosystem" className="relative border-t border-border/60 bg-secondary/20 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <div className="text-[11px] font-bold uppercase tracking-widest text-primary">Экосистема</div>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Вертикали, с которыми мы работаем</h2>
            <p className="mt-3 text-muted-foreground">Мы не гонимся за количеством. Каждое направление курирует профильный менеджер, который знает продукт изнутри и умеет собирать связки.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { Icon: CreditCard, title: "Финтех", desc: "Карты, кредиты, брокеры, необанки. Продукты для массового рынка и премиум-сегмента.", tags: ["РФ", "СНГ", "EU"] },
              { Icon: Layers, title: "EdTech", desc: "Онлайн-школы, курсы, языковые платформы, детское образование.", tags: ["РФ", "СНГ"] },
              { Icon: Compass, title: "Travel & Lifestyle", desc: "Отели, авиабилеты, страхование путешественников, аренда авто.", tags: ["World"] },
              { Icon: Cpu, title: "SaaS & IT", desc: "B2B-инструменты, VPN, облачные хранилища, антивирусы.", tags: ["РФ", "EU", "US"] },
              { Icon: Gift, title: "Гэмблинг & Беттинг", desc: "Топовые бренды с прозрачными холдами и постоянными эксклюзивами.", tags: ["РФ", "СНГ", "LATAM"] },
              { Icon: Feather, title: "Wellness", desc: "Нутра, добавки, косметика, программы здоровья. Только сертифицированные бренды.", tags: ["РФ", "СНГ"] },
            ].map((v) => (
              <div key={v.title} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/40">
                <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-primary/10 opacity-0 blur-2xl transition group-hover:opacity-100" />
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <v.Icon className="size-5" />
                </div>
                <h3 className="mt-4 text-base font-bold">{v.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{v.desc}</p>
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-3">
                  {v.tags.map((t) => (
                    <span key={t} className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MANIFESTO */}
      <section id="manifesto" className="relative overflow-hidden py-16 md:py-24">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 size-[500px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl ambient-blob-a" />
        </div>
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center">
            <div className="text-[11px] font-bold uppercase tracking-widest text-primary">Манифест</div>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Во что мы верим</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">Шесть принципов, которые определяют каждое наше решение — от того, какие офферы мы берём в каталог, до того, как разбираем спорные ситуации.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {[
              { Icon: ShieldCheck, t: "Честность важнее выручки", d: "Мы никогда не отменяем выплаты задним числом. Все правила игры — на столе с первого дня." },
              { Icon: Network, t: "Партнёр — не «трафик»", d: "Каждый партнёр — это человек с целями и семьёй. Менеджеры это помнят и работают так, как хотели бы, чтобы работали с ними." },
              { Icon: Diamond, t: "Продукт важнее упаковки", d: "Мы берём в каталог только те бренды, которыми пользуемся сами или доверяем безоговорочно." },
              { Icon: InfinityIcon, t: "Долгосрочные отношения", d: "Проще сделать одного партнёра счастливым на 5 лет, чем каждый месяц находить новых — и это дешевле для всех." },
              { Icon: Waypoints, t: "Прозрачность процессов", d: "Любое решение можно объяснить: формула ставки, причина холда, критерии антифрода — всё документируется." },
              { Icon: Sparkles, t: "Комьюнити > конкуренция", d: "Мы собираем не «сетку», а сообщество. Митапы, закрытые чаты, обмен связками, менторство новичков." },
            ].map((p, i) => (
              <div key={p.t} className="relative rounded-2xl border border-border bg-card/70 p-6 backdrop-blur" style={{ animation: `kvant-slide-up .6s ease ${i * 0.05}s both` }}>
                <div className="absolute left-6 top-6 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <p.Icon className="size-5" />
                </div>
                <div className="pl-14">
                  <h3 className="text-base font-bold">{p.t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="border-t border-border/60 bg-secondary/20 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <div className="text-[11px] font-bold uppercase tracking-widest text-primary">Инструменты</div>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Всё в одном кабинете</h2>
            <p className="mt-3 text-muted-foreground">Без лишнего. Только то, что реально помогает партнёру зарабатывать.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { Icon: Rocket, title: "Курируемый каталог", desc: "Финансы, EdTech, travel, финтех, SaaS — с эксклюзивными условиями и живыми менеджерами." },
              { Icon: BarChart3, title: "Живая аналитика", desc: "EPC, CR, holds и когорты — в удобном интерфейсе, без выгрузок в Excel." },
              { Icon: Wallet, title: "Быстрые выплаты", desc: "От 72 часов на старте до 1 часа на «Платине». Минималка ₽1 000." },
              { Icon: TrendingUp, title: "Уровни и бонусы", desc: "+5%…+15% к ставкам, укороченные холды, приоритет модерации." },
              { Icon: Headphones, title: "Личный менеджер", desc: "С уровня «Золото» — 24/7. Знает ваши источники и KPI." },
              { Icon: ShieldCheck, title: "Честные правила", desc: "Публичная антифрод-политика, никаких блокировок задним числом." },
              { Icon: Target, title: "S2S постбэки", desc: "Полноценная интеграция с вашим трекером — Keitaro, Binom, RedTrack." },
              { Icon: Globe, title: "Любые источники", desc: "Контекст, таргет, SEO, Telegram, YouTube, push, in-app, офлайн." },
              { Icon: Gift, title: "Конкурсы и призы", desc: "Ежемесячно: техника, поездки и денежные призы для топ-партнёров." },
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
      <section id="levels" className="border-t border-border/60 py-16 md:py-24">
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
      <section id="how" className="border-t border-border/60 bg-secondary/20 py-16 md:py-24">
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

      {/* ROADMAP */}
      <section className="relative border-t border-border/60 py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4">
          <div className="max-w-2xl">
            <div className="text-[11px] font-bold uppercase tracking-widest text-primary">Дорожная карта</div>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Куда мы движемся</h2>
            <p className="mt-3 text-muted-foreground">Мы не обещаем «раскрыть данные позже». Вот вехи, над которыми работаем открыто.</p>
          </div>
          <div className="relative mt-12">
            <div aria-hidden className="absolute left-4 top-0 h-full w-px bg-gradient-to-b from-primary/60 via-primary/30 to-transparent md:left-1/2" />
            <div className="space-y-8">
              {[
                { q: "Сейчас", t: "Живая аналитика v2", d: "Новый интерфейс дашборда, когорты, кастомные метрики и экспорт в BI-инструменты." },
                { q: "Следующий этап", t: "Мобильное приложение", d: "iOS и Android с push-уведомлениями по конверсиям, холдам и выплатам." },
                { q: "В работе", t: "Открытое API v3", d: "Публичный REST + webhooks, песочница и SDK для JavaScript и Python." },
                { q: "На горизонте", t: "Академия КВАНТ", d: "Бесплатная образовательная платформа для новичков: связки, антифрод, налоги, юр. вопросы." },
              ].map((r, i) => (
                <div key={r.t} className={`relative flex flex-col gap-3 md:flex-row md:items-center ${i % 2 ? "md:flex-row-reverse" : ""}`}>
                  <div className="hidden flex-1 md:block" />
                  <div className="absolute left-4 top-4 grid size-3 -translate-x-1/2 place-items-center rounded-full bg-primary shadow-[0_0_16px] shadow-primary md:left-1/2" />
                  <div className="ml-10 flex-1 rounded-2xl border border-border bg-card p-5 md:ml-0 md:mx-6">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-primary">{r.q}</div>
                    <div className="mt-1.5 text-base font-bold">{r.t}</div>
                    <p className="mt-1.5 text-sm text-muted-foreground">{r.d}</p>
                  </div>
                </div>
              ))}
            </div>
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
              { name: "Артём К.", role: "Арбитражник", text: "Раньше лил на 3 сетки параллельно. С КВАНТом одной хватает — офферы жирнее, холды короче, менеджер быстрее." },
              { name: "Мария О.", role: "Команда, 8 человек", text: "Субаккаунты и API постбэков закрыли все наши боли. Управление командой стало занимать 20 минут в день, а не два часа." },
              { name: "Дмитрий В.", role: "Новичок, 3 месяца", text: "Начал с нуля, менеджер новичка провёл за руку по первым связкам. На 4-й день вышел в плюс." },
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

      {/* COMPARISON */}
      <section className="border-t border-border/60 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <div className="text-[11px] font-bold uppercase tracking-widest text-primary">Сравнение</div>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">КВАНТ против «типичной сетки»</h2>
            <p className="mt-3 text-muted-foreground">Мы не изобретали велосипед. Мы просто убрали из работы всё, что бесит партнёров годами.</p>
          </div>
          <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="grid grid-cols-3 border-b border-border bg-secondary/40 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <div className="p-4">Критерий</div>
              <div className="border-l border-border p-4 text-muted-foreground/70">Типичная сетка</div>
              <div className="border-l border-border bg-primary/5 p-4 text-primary">КВАНТ</div>
            </div>
            {[
              { c: "Первая выплата", a: "1–2 недели, минималка ₽5 000", b: "От 72 часов, минималка ₽1 000" },
              { c: "Модерация на входе", a: "Анкета, созвон, ожидание 1–3 дня", b: "Мгновенный доступ к каталогу" },
              { c: "Правила игры", a: "Меняются задним числом", b: "Публичный регламент, версия в оферте" },
              { c: "Личный менеджер", a: "Только на VIP-условиях", b: "С уровня «Золото» — 24/7" },
              { c: "Постбэки и API", a: "Ограниченные, платные", b: "Полный REST + S2S, бесплатно" },
              { c: "Антифрод-споры", a: "«Блок без объяснений»", b: "Разбор с логами в открытом тикете" },
              { c: "Комьюнити", a: "Общий чат на 5000 человек", b: "Профильные комнаты, митапы, менторы" },
            ].map((row, i) => (
              <div key={row.c} className={`grid grid-cols-3 text-sm ${i % 2 ? "bg-secondary/20" : ""}`}>
                <div className="p-4 font-bold">{row.c}</div>
                <div className="flex items-start gap-2 border-l border-border p-4 text-muted-foreground">
                  <X className="mt-0.5 size-4 shrink-0 text-destructive/70" />
                  <span>{row.a}</span>
                </div>
                <div className="flex items-start gap-2 border-l border-border bg-primary/5 p-4">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="font-medium">{row.b}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="border-t border-border/60 bg-secondary/20 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <div className="text-[11px] font-bold uppercase tracking-widest text-primary">Профили партнёров</div>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Для кого построен КВАНТ</h2>
            <p className="mt-3 text-muted-foreground">Мы работаем с очень разными людьми. Вот четыре типичных сценария — возможно, узнаете себя.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {[
              {
                Icon: Rocket, tag: "Соло-арбитражник",
                title: "Один человек — один ноутбук",
                desc: "Быстрый доступ к офферам, короткий холд и вывод на карту в один клик. Никаких «созвонов с менеджером по средам».",
                perks: ["Мгновенный доступ", "Выплаты от 72ч", "S2S без бюрократии"],
              },
              {
                Icon: Layers, tag: "Команда 3–15 человек",
                title: "Стабильный поток без хаоса",
                desc: "Субаккаунты, роли, единый кабинет для тимлида и аналитика, общий бюджет и разделение выплат.",
                perks: ["Роли и права", "Единый постбэк", "Отчёты по саб-ID"],
              },
              {
                Icon: Award, tag: "Крупная команда / медиабаер",
                title: "Эксклюзивы и приоритет",
                desc: "Персональный менеджер, лимиты по кэпам, свои условия под объём, ранний доступ к новым офферам.",
                perks: ["Эксклюзивные ставки", "Кастомные лимиты", "Ранний доступ"],
              },
              {
                Icon: Compass, tag: "Инфлюенсер / блогер",
                title: "Монетизация без биржи",
                desc: "Ссылки под конкретную аудиторию, промокоды, простая аналитика по постам и сторис — без Excel.",
                perks: ["Промокоды", "Клики по постам", "Отчёты для рекламодателя"],
              },
            ].map((u) => (
              <div key={u.title} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:border-primary/40">
                <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-primary/10 opacity-0 blur-2xl transition group-hover:opacity-100" />
                <div className="flex items-start justify-between gap-3">
                  <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    <u.Icon className="size-5" />
                  </div>
                  <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{u.tag}</span>
                </div>
                <h3 className="mt-4 text-lg font-black">{u.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{u.desc}</p>
                <ul className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-4">
                  {u.perks.map((p) => (
                    <li key={p} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[11px] font-bold text-foreground/80">
                      <Check className="size-3 text-primary" />{p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section className="border-t border-border/60 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-primary">Интеграции</div>
              <h2 className="mt-2 text-3xl font-black md:text-4xl">Работает с вашим стеком</h2>
              <p className="mt-3 text-muted-foreground">S2S-постбэки, макросы, вебхуки. Подключается за 10 минут к любому трекеру и BI-инструменту.</p>
              <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {["Keitaro","Binom","RedTrack","Voluum","BeMob","AdsBridge","Telegram","Google Sheets","Webhooks"].map((n) => (
                  <div key={n} className="rounded-lg border border-border bg-card px-2 py-3 hover:border-primary/40">{n}</div>
                ))}
              </div>
            </div>
            <div className="relative rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span className="size-2 rounded-full bg-destructive/60" />
                <span className="size-2 rounded-full bg-warning" />
                <span className="size-2 rounded-full bg-success" />
                <span className="ml-2">S2S postback URL</span>
              </div>
              <pre className="overflow-x-auto rounded-xl bg-foreground/5 p-4 text-[12px] leading-relaxed">
{`GET https://kvantm.tech/postback
  ?click_id={click_id}
  &status={status}      # ok | pending | rejected
  &payout={payout}
  &offer_id={offer_id}
  &sub1={sub1}&sub2={sub2}`}
              </pre>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="rounded-lg bg-secondary p-2"><div className="font-black text-primary">REST</div><div className="text-muted-foreground">v3 API</div></div>
                <div className="rounded-lg bg-secondary p-2"><div className="font-black text-primary">SDK</div><div className="text-muted-foreground">JS / Py</div></div>
                <div className="rounded-lg bg-secondary p-2"><div className="font-black text-primary">Webhooks</div><div className="text-muted-foreground">HMAC-SHA256</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ДЛЯ КОГО */}
      <section id="audience" className="border-t border-border/60 bg-secondary/20 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-[11px] font-bold uppercase tracking-widest text-primary">Кому подойдёт</div>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Работа в КВАНТ — для каждого</h2>
            <p className="mt-3 text-muted-foreground">
              Не важно, есть ли у вас опыт или свободный график — платформа подстраивается под ваш ритм жизни.
              Начните зарабатывать из дома, между парами или после основной работы.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Feather,
                title: "Мамам в декрете",
                desc: "Совмещайте заботу о ребёнке и стабильный доход. Гибкий график, работа со смартфона, никаких офисов и дедлайнов.",
                tag: "от 2 часов в день",
              },
              {
                icon: Award,
                title: "Студентам",
                desc: "Первый серьёзный доход без опыта. Наставник на 30 дней, готовые связки и обучение — работайте между парами.",
                tag: "удалённо",
              },
              {
                icon: Rocket,
                title: "Фрилансерам",
                desc: "Дополнительный источник дохода к основной деятельности. API, постбэки, интеграции с любым трекером.",
                tag: "гибко",
              },
              {
                icon: Target,
                title: "Специалистам по трафику",
                desc: "Эксклюзивные офферы, повышенные ставки, персональный менеджер и приоритетные выплаты от 1 часа.",
                tag: "PRO-условия",
              },
              {
                icon: Globe,
                title: "Пенсионерам и людям 50+",
                desc: "Освойте новую цифровую профессию в своём темпе. Понятная база знаний и живая поддержка на русском 24/7.",
                tag: "без возрастных лимитов",
              },
              {
                icon: Clock,
                title: "Работающим по найму",
                desc: "Подработка вечером и в выходные без ущерба основной работе. Стабильный пассивный доход после первых кампаний.",
                tag: "подработка",
              },
            ].map((a) => (
              <article
                key={a.title}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <a.icon className="size-5" />
                  </div>
                  <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {a.tag}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-black">{a.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{a.desc}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            {["Без вложений", "Без опыта", "Из любой точки мира", "Обучение бесплатно"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-primary" />{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* СКОЛКОВО */}
      <section id="skolkovo" className="border-t border-border/60 py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4">
          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-8 md:p-12">
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-60">
              <div className="absolute -right-24 -top-24 size-72 rounded-full bg-primary/25 blur-3xl ambient-blob-a" />
              <div className="absolute -bottom-24 -left-24 size-72 rounded-full bg-primary/15 blur-3xl ambient-blob-b" />
            </div>

            <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-center">
              <div className="flex items-center gap-4">
                <div className="relative grid size-20 place-items-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
                  <Diamond className="size-9 text-primary" />
                  <span className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                    <Check className="size-4" />
                  </span>
                </div>
              </div>

              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
                  <ShieldCheck className="size-3" /> Официальное заявление
                </div>
                <h2 className="mt-3 text-2xl font-black leading-tight md:text-3xl">
                  КВАНТ — резидент Фонда «Сколково»
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                  Мы получили статус резидента инновационного центра «Сколково» — крупнейшей технологической площадки России.
                  Это подтверждает уровень нашей IT-разработки, прозрачность бизнес-модели и открывает доступ к грантам,
                  налоговым льготам и совместным исследованиям с ведущими компаниями рынка.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Юридическая надёжность", desc: "Прозрачные договоры и защита партнёров" },
                    { label: "Технологический уровень", desc: "Подтверждён экспертизой Сколково" },
                    { label: "Инвестиции в развитие", desc: "Гранты и льготы направляем в продукт" },
                  ].map((b) => (
                    <div key={b.label} className="rounded-xl border border-border bg-background/60 p-3">
                      <div className="text-xs font-black uppercase tracking-wider text-primary">{b.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{b.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}

      <section id="faq" className="border-t border-border/60 py-16 md:py-24">

        <div className="mx-auto max-w-3xl px-4">
          <div className="text-center">
            <div className="text-[11px] font-bold uppercase tracking-widest text-primary">FAQ</div>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Частые вопросы</h2>
          </div>
          <div className="mt-10 space-y-3">
            {[
              { q: "Нужен ли опыт в арбитраже?", a: "Нет. База знаний, гайды по офферам, менеджер новичка на первые 30 дней и живой чат поддержки — вы не останетесь один." },
              { q: "Как быстро приходят выплаты?", a: "От 72 часов на старте, от 1 часа на «Платине». Все сроки закреплены в оферте." },
              { q: "Есть ли минимальная сумма вывода?", a: "1 000 ₽. Способы: карта РФ, USDT (TRC-20/ERC-20), СБП, банковский перевод для ИП и юрлиц." },
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
              <div className="absolute -right-24 -top-24 size-72 rounded-full bg-primary/25 blur-3xl ambient-blob-a" />
              <div className="absolute -bottom-24 -left-24 size-72 rounded-full bg-primary/15 blur-3xl ambient-blob-b" />
            </div>
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
              <MessageCircle className="size-3" /> Регистрация меньше минуты
            </div>
            <h2 className="mt-4 text-3xl font-black md:text-4xl">Готовы стать частью КВАНТ?</h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">Первый оффер можно запустить сразу после регистрации.</p>
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
        if (signUpData.user) {
          try { await supabase.from("profiles").update({ avatar_url: avatar }).eq("id", signUpData.user.id); } catch { /* ignore */ }
        }
        setInfo("Регистрация прошла успешно. Проверьте почту — мы отправили ссылку для подтверждения email.");
      }
    } catch (e: unknown) {
      const msg = e instanceof z.ZodError ? e.errors[0]?.message : e instanceof Error ? e.message : "Ошибка";
      setError(translateError(e, msg ?? "Ошибка"));
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
