import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import {
  Loader2, Mail, Lock, User, Rocket, ShieldCheck, TrendingUp,
  X, ArrowRight, Wallet, BarChart3, Headphones, Star, Check, Menu,
} from "lucide-react";

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

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) navigate({ to: "/_authenticated/dashboard" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/_authenticated/dashboard" });
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [navigate]);

  const openAuth = (m: Mode) => { setInitialMode(m); setAuthOpen(true); setMenuOpen(false); };

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
            <a href="#top" className="text-sm text-muted-foreground hover:text-foreground">О платформе</a>
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
              <a href="#features" onClick={() => setMenuOpen(false)} className="rounded-md px-2 py-2 text-sm hover:bg-secondary">Возможности</a>
              <a href="#offers" onClick={() => setMenuOpen(false)} className="rounded-md px-2 py-2 text-sm hover:bg-secondary">Офферы</a>
              <a href="#how" onClick={() => setMenuOpen(false)} className="rounded-md px-2 py-2 text-sm hover:bg-secondary">Как это работает</a>
              <a href="#faq" onClick={() => setMenuOpen(false)} className="rounded-md px-2 py-2 text-sm hover:bg-secondary">FAQ</a>
              <div className="mt-2 flex gap-2">
                <button onClick={() => openAuth("login")} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold">Войти</button>
                <button onClick={() => openAuth("register")} className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">Начать</button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* LIVING LONGREAD */}
      <main id="top" className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[-160px] -z-10 h-[600px]">
          <div className="absolute left-1/2 top-0 size-[560px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute left-[10%] top-40 size-[280px] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute right-[5%] top-72 size-[320px] rounded-full bg-primary/15 blur-3xl" />
        </div>

        <article className="mx-auto max-w-3xl px-5 pb-24 pt-14 md:pt-20 text-[17px] leading-[1.85] text-foreground/90">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" /> Живая партнёрская платформа №1 в СНГ
          </div>

          <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-[64px]">
            Зарабатывайте на рекомендациях с <span className="bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">КВАНТ</span> — платформой, где каждая ссылка превращается в поток дохода.
          </h1>

          <p className="mt-8">
            Пока вы читаете этот абзац, где-то в системе уже прошло <span className="font-bold text-primary">17 новых конверсий</span>, партнёр из Казани получил выплату за 47 минут, а новичок из Минска запустил свой первый оффер и <em className="not-italic font-semibold text-foreground">заработал ₽2 340 за первый день</em>. КВАНТ — это не «ещё одна CPA-сеть», а живой организм из <span className="font-bold">12 000+ активных партнёров</span>, <span className="font-bold">40+ проверенных офферов</span> и команды, которая знает каждого своего вебмастера в лицо. За последний год мы <span className="font-bold text-primary">выплатили ₽1.2 миллиарда</span> — и планируем удвоить эту цифру.
          </p>

          <p className="mt-6">
            Всё начинается с одного клика:{" "}
            <button onClick={() => openAuth("register")} className="mx-0.5 inline-flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 align-baseline text-[15px] font-bold text-primary-foreground hover:bg-primary/90">
              создайте аккаунт <ArrowRight className="size-3.5" />
            </button>{" "}
            (это займёт меньше минуты, честно), подтвердите email, зайдите в кабинет — и вы уже внутри. Никаких многодневных модераций, унизительных анкет и «мы вам перезвоним». Мы не любим бюрократию так же, как и вы.
          </p>

          <p className="mt-6">
            Внутри вас встречают <span className="font-bold">офферы</span>: «Тинькофф Инвестиции» с выплатой <span className="font-bold text-primary">до ₽3 200</span> за лид и CR&nbsp;8.4%, «Альфа-Банк Дебет» — <span className="font-bold text-primary">₽2 500</span> при 6.9%, «Skillbox PRO» с ревшарой <span className="font-bold text-primary">до 40%</span>, «Aviasales Business», «Ostrovok B2B», «GeekBrains», и ещё десятки — от финтеха и EdTech до travel и SaaS. Каждый оффер приходит с эксклюзивными условиями, которые нельзя получить напрямую у рекламодателя.
          </p>

          <div className="my-10 rounded-2xl border-l-4 border-primary bg-secondary/30 px-6 py-5 text-[15px] italic text-muted-foreground">
            «Раньше я лил на 3 сетки параллельно, чтобы выжать нормальный EPC. С КВАНТом одной хватает — офферы жирнее, холды короче, менеджер отвечает быстрее, чем я успеваю задать второй вопрос.»
            <div className="mt-3 not-italic text-[12px] font-bold uppercase tracking-wider text-foreground">— Артём, арбитражник, ~₽800k/мес</div>
          </div>

          <p>
            Выбрали оффер? Копируете партнёрскую ссылку — и запускаете трафик откуда угодно: контекст, таргет, SEO, Telegram-каналы, YouTube, e-mail, push, in-app, даже офлайн через QR-коды. Мы не диктуем источники, мы <em className="not-italic font-semibold text-foreground">даём инструменты</em>: <span className="font-bold">живую статистику</span> с EPC, CR, холдами и когортами, которая обновляется в реальном времени (не «раз в сутки в лучшем случае»), <span className="font-bold">субаккаунты</span> для команд, <span className="font-bold">API</span> для интеграций, <span className="font-bold">постбэки S2S</span>, автоматическую <span className="font-bold">капу</span> и антифрод, который защищает вас, а не наоборот.
          </p>

          <div className="my-12 grid grid-cols-3 gap-2 rounded-3xl border border-border bg-card/50 p-6 text-center backdrop-blur">
            {[
              { v: "12 000+", l: "активных партнёров" },
              { v: "₽1.2 млрд", l: "выплачено за год" },
              { v: "1 час", l: "минимальная выплата" },
            ].map((s) => (
              <div key={s.l}>
                <div className="bg-gradient-to-br from-primary to-primary/50 bg-clip-text text-2xl font-black text-transparent sm:text-3xl">{s.v}</div>
                <div className="mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground sm:text-[11px]">{s.l}</div>
              </div>
            ))}
          </div>

          <p>
            А теперь про то, ради чего всё это — <span className="font-bold text-primary">выплаты</span>. Мы держим слово: <span className="font-bold">от 72 часов на старте</span>, <span className="font-bold">от 24 часов на «Серебре»</span>, <span className="font-bold">от 6 часов на «Золоте»</span> и <span className="font-bold text-primary">от 1 часа на «Платине»</span>. Минималка — <span className="font-bold">₽1 000</span>. Способы: карта РФ, USDT (TRC-20/ERC-20), СБП, банковский перевод для ИП и юрлиц, WMZ, Payoneer. Никаких «выплата задерживается, потому что у нас пятница».
          </p>

          <p className="mt-6">
            Уровни партнёра — это не декоративные бейджи «для мотивации», а <em className="not-italic font-semibold text-foreground">реальные привилегии</em>, которые применяются автоматически: повышенные ставки (+5% на «Серебре», +10% на «Золоте», +15% на «Платине»), укороченные холды, приоритет в модерации креативов, эксклюзивные офферы, которые не видны публично, и — начиная с «Золота» — <span className="font-bold">личный менеджер 24/7</span>, который знает ваши источники, ваш стиль и ваш KPI. На «Платине» подключается ещё и медиабаинг-консалтинг, разбор кейсов с командой, кастомные посадочные страницы и приглашения на закрытые ивенты.
          </p>

          <p className="mt-6">
            «А если я новичок?» — самый частый вопрос. Ответ: <span className="font-bold text-primary">это не проблема</span>. У нас есть база знаний с гайдами по каждому офферу, разбор связок, чат поддержки, куда можно писать хоть в три ночи, и «менеджер новичка» на первые 30 дней. Мы <em className="not-italic font-semibold text-foreground">хотим, чтобы вы зарабатывали</em> — потому что мы зарабатываем только тогда, когда зарабатываете вы. Простая экономика, никакой магии.
          </p>

          <p className="mt-6">
            «А правила честные?» — да, и мы этим особенно гордимся. Прозрачная антифрод-политика с публичным регламентом, никаких блокировок задним числом, никаких «мы решили пересмотреть условия по вашему трафику за прошлый месяц». Спор? Идёт в открытый тикет с логами, скриншотами и разбором конверсий. Ошиблись мы — извинимся и компенсируем. Ошиблись вы — объясним, где и почему.
          </p>

          <div className="my-10 rounded-2xl border border-border bg-secondary/30 p-6">
            <div className="text-[11px] font-bold uppercase tracking-widest text-primary">Что говорят цифры</div>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              Средний EPC по топ-5 офферам сети — <span className="font-bold text-foreground">₽184</span>. Средний срок выхода нового партнёра в плюс — <span className="font-bold text-foreground">4 дня</span>. Retention партнёров через год — <span className="font-bold text-foreground">78%</span>. Средняя оценка поддержки — <span className="font-bold text-foreground">4.9 / 5</span> (13 400 оценок). Пропущенных выплат за 2025 год — <span className="font-bold text-foreground">0</span>.
            </p>
          </div>

          <p>
            Можно ещё долго рассказывать: про кастомные лендинги, про сплит-тестирование креативов внутри платформы, про то, как мы за 40 минут подняли новый оффер под запрос конкретного вебмастера, про закрытый Telegram-чат для «Платины», где обсуждают связки на миллион, про ежемесячные конкурсы с призами вроде MacBook Pro и поездок в Дубай, про то, что <span className="font-bold">поддержка отвечает в среднем за 2 минуты 14 секунд</span> — но лучше один раз попробовать.
          </p>

          <p className="mt-8 text-xl font-bold leading-snug text-foreground">
            Регистрация занимает меньше минуты. Первый оффер можно запустить сразу. Первая выплата — уже сегодня.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => openAuth("register")} className="group inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 hover:shadow-primary/40">
              Создать аккаунт <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </button>
            <button onClick={() => openAuth("login")} className="inline-flex flex-1 items-center justify-center rounded-xl border border-border bg-card px-5 py-3.5 text-sm font-bold hover:bg-secondary">
              У меня уже есть аккаунт
            </button>
          </div>

          <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {["Без вложений", "Без модерации на входе", "Поддержка 24/7", "Выплаты от 1 часа"].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-primary" />{t}</li>
            ))}
          </ul>

          <div id="faq" className="mt-16 border-t border-border pt-10">
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Ещё несколько вопросов, которые вы точно зададите</div>
            <div className="mt-5 space-y-2">
              {[
                { q: "Нужен ли опыт в арбитраже?", a: "Нет. База знаний, гайды по офферам, менеджер новичка на первые 30 дней и живой чат поддержки — вы не останетесь один." },
                { q: "Как быстро приходят выплаты?", a: "От 72 часов на старте, от 1 часа на «Платине». В прошлом месяце средний срок по всей сети составил 8 часов 12 минут." },
                { q: "Есть ли минимальная сумма вывода?", a: "1 000 ₽. Способы: карта РФ, USDT (TRC-20/ERC-20), СБП, банковский перевод для ИП и юрлиц, WMZ, Payoneer." },
                { q: "Можно ли лить с бурж-трафика?", a: "Да, но условия зависят от оффера — часть работает только по РФ/СНГ, часть открыта на бурж. Уточняйте в карточке оффера или у менеджера." },
                { q: "Что с антифродом?", a: "Публичный регламент, никаких блокировок задним числом, все спорные ситуации разбираются с логами и скриншотами в открытом тикете." },
              ].map((f) => (
                <details key={f.q} className="group rounded-xl border border-border bg-card/60 p-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-bold">
                    {f.q}
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </article>
      </main>


      {/* FOOTER */}
      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground text-xs font-black">К</div>
            <span className="text-xs font-bold tracking-wider">КВАНТ © {new Date().getFullYear()}</span>
          </div>
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
        const { error: err } = await supabase.auth.signUp({
          email: em, password: pw,
          options: { emailRedirectTo: window.location.origin, data: { display_name: displayName.trim() } },
        });
        if (err) throw err;
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
