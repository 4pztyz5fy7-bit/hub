import { Bot, Construction, Sparkles, Wrench } from "lucide-react";

type AiComingSoonBannerProps = {
  title?: string;
  subtitle?: string;
  icon?: "bot" | "sparkles" | "construction";
};

export function AiComingSoonBanner({
  title = "Мы работаем над созданием лучшего помощника",
  subtitle = "AI-ассистент временно недоступен. Скоро он вернётся с новыми возможностями.",
  icon = "bot",
}: AiComingSoonBannerProps) {
  const Icon = icon === "bot" ? Bot : icon === "construction" ? Construction : Sparkles;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 text-center">
      <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-primary/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 size-24 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Icon className="size-8" />
        </div>
        <h3 className="mt-4 text-base font-bold">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-[10px] font-medium text-muted-foreground">
          <Wrench className="size-3" /> В разработке
        </div>
      </div>
    </div>
  );
}
