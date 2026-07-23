import { Bot, Construction, Sparkles } from "lucide-react";

type AiComingSoonBannerProps = {
  title?: string;
  subtitle?: string;
  icon?: "bot" | "sparkles" | "construction";
};

export function AiComingSoonBanner({
  title = "Помощник временно недоступен",
  subtitle = "Раздел на техническом обслуживании. Скоро вернётся.",
  icon = "bot",
}: AiComingSoonBannerProps) {
  const Icon = icon === "bot" ? Bot : icon === "construction" ? Construction : Sparkles;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/60 p-4">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-border/60 bg-secondary/40 text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground/90">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
