import { Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, ShieldCheck, Cookie, ScrollText } from "lucide-react";
import type { ReactNode } from "react";

export const LEGAL_UPDATED = "20 июля 2026";

export const LEGAL_LINKS = [
  { to: "/legal", label: "Все документы", icon: ScrollText },
  { to: "/terms", label: "Оферта", icon: FileText },
  { to: "/privacy", label: "Политика конфиденциальности", icon: ShieldCheck },
  { to: "/cookies", label: "Cookies", icon: Cookie },
] as const;

export function LegalShell({
  eyebrow,
  title,
  updated = LEGAL_UPDATED,
  children,
}: {
  eyebrow: string;
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold">
            <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground text-xs font-black">К</span>
            <span className="tracking-wider">КВАНТ</span>
          </Link>
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-foreground">
            <ArrowLeft className="size-3.5" /> На главную
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-black sm:text-4xl">{title}</h1>
        <p className="mt-2 text-xs text-muted-foreground">Редакция от {updated}</p>

        <nav className="mt-6 flex flex-wrap gap-2">
          {LEGAL_LINKS.filter((l) => l.to !== "/legal").map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeProps={{ className: "bg-foreground text-background border-foreground" }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition hover:text-foreground"
            >
              <l.icon className="size-3.5" /> {l.label}
            </Link>
          ))}
        </nav>

        <article className="prose-legal mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          {children}
        </article>

        <footer className="mt-16 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
          КВАНТ © {new Date().getFullYear()}. Все права защищены.
        </footer>
      </main>
    </div>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-8 text-lg font-black text-foreground sm:text-xl">{children}</h2>;
}
export function H3({ children }: { children: ReactNode }) {
  return <h3 className="mt-4 text-sm font-bold uppercase tracking-wider text-foreground">{children}</h3>;
}
export function P({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-foreground/85">{children}</p>;
}
export function UL({ children }: { children: ReactNode }) {
  return <ul className="ml-5 list-disc space-y-1.5 text-sm leading-relaxed text-foreground/85 marker:text-primary">{children}</ul>;
}
