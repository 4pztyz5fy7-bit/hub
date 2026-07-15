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
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">Возможности</a>
            <a href="#offers" className="text-sm text-muted-foreground hover:text-foreground">Офферы</a>
            <a href="#how" className="text-sm text-muted-foreground hover:text-foreground">Как это работает</a>
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

      {/* HERO */}
      <section id="top" className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-120px] size-[520px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 md:pb-24 md:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" /> Партнёрская платформа №1 в СНГ
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl md:text-6xl">
              Зарабатывайте на рекомендациях с <span className="text-primary">КВАНТ</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              40+ проверенных офферов, прозрачная статистика в реальном времени и выплаты от 1 часа. Всё, что нужно, чтобы монетизировать трафик.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button onClick={() => openAuth("register")} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 sm:w-auto">
                Создать аккаунт <ArrowRight className="size-4" />
              </button>
              <button onClick={() => openAuth("login")} className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-card px-5 py-3 text-sm font-bold hover:bg-secondary sm:w-auto">
                У меня уже есть аккаунт
              </button>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-border pt-8 text-center">
              {[
                { v: "12 000+", l: "активных партнёров" },
                { v: "₽1.2 млрд", l: "выплачено за год" },
                { v: "1 час", l: "минимальная выплата" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="text-lg font-black sm:text-2xl">{s.v}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground sm:text-xs">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="border-t border-border/60 bg-secondary/20 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-black md:text-4xl">Всё в одном кабинете</h2>
            <p className="mt-3 text-muted-foreground">Инструменты, которые действительно нужны партнёру. Без лишнего.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { Icon: Rocket, title: "40+ офферов", desc: "Финансы, EdTech, travel, финтех — с эксклюзивными условиями." },
              { Icon: BarChart3, title: "Живая статистика", desc: "EPC, CR, holds и когорты — всё обновляется в реальном времени." },
              { Icon: Wallet, title: "Быстрые выплаты", desc: "От 72 часов на старте до 1 часа на уровне «Платина»." },
              { Icon: TrendingUp, title: "Уровни и бонусы", desc: "Повышенные ставки, ускоренные холды и приоритет модерации." },
              { Icon: Headphones, title: "Личный менеджер", desc: "С уровня «Золото» — помощь по офферам и креативам 24/7." },
              { Icon: ShieldCheck, title: "Честные правила", desc: "Прозрачная антифрод-политика, без блокировок задним числом." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm">
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <f.Icon className="size-5" />
                </div>
                <h3 className="mt-4 text-base font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OFFERS PREVIEW */}
      <section id="offers" className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-black md:text-4xl">Топовые офферы недели</h2>
              <p className="mt-3 text-muted-foreground">Только проверенные рекламодатели. Полный каталог — в кабинете.</p>
            </div>
            <button onClick={() => openAuth("register")} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-bold hover:bg-secondary">
              Смотреть все <ArrowRight className="size-4" />
            </button>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Тинькофф Инвестиции", cat: "Финансы", pay: "до ₽3 200", cr: "8.4%" },
              { name: "Skillbox PRO", cat: "Образование", pay: "до 40%", cr: "5.1%" },
              { name: "Aviasales Business", cat: "Travel", pay: "до ₽1 800", cr: "3.7%" },
              { name: "Альфа-Банк Дебет", cat: "Финансы", pay: "до ₽2 500", cr: "6.9%" },
              { name: "GeekBrains", cat: "Образование", pay: "до 35%", cr: "4.8%" },
              { name: "Ostrovok B2B", cat: "Travel", pay: "до ₽2 100", cr: "3.2%" },
            ].map((o) => (
              <div key={o.name} className="group flex flex-col rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{o.cat}</span>
                  <Star className="size-4 text-primary" />
                </div>
                <h3 className="mt-3 text-base font-bold">{o.name}</h3>
                <div className="mt-4 grid flex-1 grid-cols-2 gap-3 border-t border-border pt-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Выплата</div>
                    <div className="mt-0.5 text-sm font-bold">{o.pay}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">CR</div>
                    <div className="mt-0.5 text-sm font-bold">{o.cr}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-t border-border/60 bg-secondary/20 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-black md:text-4xl">Как это работает</h2>
            <p className="mt-3 text-muted-foreground">Три шага до первой выплаты.</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", t: "Зарегистрируйтесь", d: "Email и пара кликов — без долгих анкет и модерации на входе." },
              { n: "02", t: "Выберите оффер", d: "Скопируйте партнёрскую ссылку и запускайте трафик из любого источника." },
              { n: "03", t: "Получайте выплаты", d: "Отслеживайте конверсии и выводите средства на карту или крипту." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-border bg-card p-6">
                <div className="text-4xl font-black text-primary/30">{s.n}</div>
                <h3 className="mt-3 text-lg font-bold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-center text-3xl font-black md:text-4xl">Частые вопросы</h2>
          <div className="mt-10 space-y-3">
            {[
              { q: "Нужен ли опыт в арбитраже?", a: "Нет. Мы помогаем новичкам — есть база знаний, гайды по офферам и поддержка в чате." },
              { q: "Как быстро приходят выплаты?", a: "От 72 часов на старте. С ростом уровня время сокращается до 1 часа." },
              { q: "Есть ли минимальная сумма вывода?", a: "Да, 1 000 ₽. Способы вывода: карта РФ, USDT, банковский перевод для юрлиц." },
              { q: "Можно ли лить с бурж-трафика?", a: "Да, но условия зависят от оффера — уточняйте у менеджера или в карточке оффера." },
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
              <div className="absolute -right-24 -top-24 size-72 rounded-full bg-primary/20 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 size-72 rounded-full bg-primary/10 blur-3xl" />
            </div>
            <h2 className="text-3xl font-black md:text-4xl">Готовы начать зарабатывать?</h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">Регистрация занимает меньше минуты. Первый оффер можно запустить сразу.</p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button onClick={() => openAuth("register")} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 sm:w-auto">
                Создать аккаунт <ArrowRight className="size-4" />
              </button>
              <button onClick={() => openAuth("login")} className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-background px-5 py-3 text-sm font-bold hover:bg-secondary sm:w-auto">
                Войти в кабинет
              </button>
            </div>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              {["Без вложений", "Без модерации на входе", "Поддержка 24/7"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-primary" />{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

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
