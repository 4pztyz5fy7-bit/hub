import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, ShieldCheck, Cookie, ArrowRight } from "lucide-react";
import { LegalShell, P } from "@/components/legal-shell";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Документация — КВАНТ" },
      { name: "description", content: "Оферта, политика конфиденциальности, политика cookies и другая правовая документация партнёрской платформы КВАНТ." },
      { property: "og:title", content: "Документация — КВАНТ" },
      { property: "og:description", content: "Правовые документы платформы КВАНТ." },
    ],
  }),
  component: LegalIndex,
});

const DOCS = [
  {
    to: "/terms" as const,
    icon: FileText,
    title: "Пользовательское соглашение (Оферта)",
    desc: "Условия использования платформы, права и обязанности сторон, правила выплат и работы с офферами.",
  },
  {
    to: "/privacy" as const,
    icon: ShieldCheck,
    title: "Политика конфиденциальности",
    desc: "Какие персональные данные мы собираем, как храним, для чего используем и как ими можно управлять.",
  },
  {
    to: "/cookies" as const,
    icon: Cookie,
    title: "Политика в отношении cookies",
    desc: "Какие cookies и локальные хранилища мы используем для работы кабинета и статистики.",
  },
];

function LegalIndex() {
  return (
    <LegalShell eyebrow="Документация" title="Правовые документы КВАНТ">
      <P>
        Ниже собраны все актуальные документы, регулирующие использование партнёрской платформы КВАНТ.
        Регистрируясь и работая в кабинете, вы соглашаетесь с их положениями.
      </P>
      <div className="grid gap-3 sm:grid-cols-1">
        {DOCS.map((d) => (
          <Link
            key={d.to}
            to={d.to}
            className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition hover:border-primary/60 hover:bg-secondary/60"
          >
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <d.icon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold group-hover:text-primary">{d.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{d.desc}</p>
            </div>
            <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </LegalShell>
  );
}
