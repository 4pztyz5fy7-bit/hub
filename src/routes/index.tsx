import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { Loader2, Mail, Lock, User, Rocket, ShieldCheck, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "КВАНТ — вход в кабинет партнёра" },
      { name: "description", content: "Войдите или зарегистрируйтесь в партнёрской платформе КВАНТ: топовые офферы, прозрачная стата и быстрые выплаты." },
      { property: "og:title", content: "КВАНТ — партнёрская платформа" },
      { property: "og:description", content: "Кабинет партнёра: офферы, статистика, выплаты." },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Некорректный email").max(255);
const passwordSchema = z.string().min(6, "Минимум 6 символов").max(72, "Максимум 72 символа");
const nameSchema = z.string().trim().min(2, "Минимум 2 символа").max(60);

type Mode = "login" | "register";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Auto-redirect if session already present
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) navigate({ to: "/_authenticated/dashboard" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/_authenticated/dashboard" });
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
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
          email: em,
          password: pw,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName.trim() },
          },
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
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col-reverse gap-8 px-4 py-8 md:flex-row md:items-center md:gap-12 md:py-16">
        {/* Left / marketing */}
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" /> Партнёрская платформа
          </div>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
            <span className="text-primary">КВАНТ</span> — зарабатывайте на рекомендациях
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base">
            Топовые финансовые, образовательные и travel-офферы. Прозрачная статистика в реальном времени и выплаты в течение часа для топ-партнёров.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              { Icon: Rocket, title: "40+ офферов", desc: "Банки, EdTech, travel, финтех" },
              { Icon: TrendingUp, title: "Прозрачная стата", desc: "EPC, CR, holds в реальном времени" },
              { Icon: ShieldCheck, title: "Быстрые выплаты", desc: "От 72 ч до 1 ч по уровню" },
              { Icon: User, title: "Личный менеджер", desc: "С уровня «Золото»" },
            ].map((f) => (
              <li key={f.title} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <f.Icon className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-bold">{f.title}</p>
                  <p className="text-[11px] text-muted-foreground">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right / auth card */}
        <div className="w-full md:w-[400px]">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="grid grid-cols-2 border-b border-border">
              {(["login", "register"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(null); setInfo(null); }}
                  className={`px-4 py-3 text-sm font-bold uppercase tracking-wider transition ${
                    mode === m ? "bg-background text-foreground" : "bg-secondary/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "login" ? "Вход" : "Регистрация"}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-3 p-5">
              {mode === "register" && (
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Имя</span>
                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-primary/40">
                    <User className="size-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      autoComplete="name"
                      placeholder="Как к вам обращаться"
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                    />
                  </div>
                </label>
              )}

              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Email</span>
                <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-primary/40">
                  <Mail className="size-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete={mode === "login" ? "email" : "email"}
                    placeholder="you@example.com"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Пароль</span>
                <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-primary/40">
                  <Lock className="size-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    placeholder={mode === "login" ? "Ваш пароль" : "Минимум 6 символов"}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                  />
                </div>
              </label>

              {error && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                  {error}
                </p>
              )}
              {info && (
                <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-[12px] text-primary">
                  {info}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
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
          <p className="mt-3 text-center text-[10px] leading-relaxed text-muted-foreground">
            Регистрируясь, вы соглашаетесь с правилами платформы и обработкой данных.
          </p>
        </div>
      </div>
    </div>
  );
}
