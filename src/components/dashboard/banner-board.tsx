import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, ExternalLink, X } from "lucide-react";

type Banner = {
  id: string;
  title: string;
  text: string;
  button_label: string;
  button_url: string;
};

const DISMISS_KEY = "kv:banners:dismissed";

function getDismissed(): string[] {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function BannerBoard() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    setDismissed(getDismissed());
    const load = async () => {
      const { data } = await supabase
        .from("banners")
        .select("id,title,text,button_label,button_url")
        .eq("active", true)
        .order("created_at", { ascending: false });
      setBanners((data ?? []) as Banner[]);
    };
    void load();
    const ch = supabase
      .channel("rt:banners")
      .on("postgres_changes", { event: "*", schema: "public", table: "banners" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, []);

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const visible = banners.filter((b) => !dismissed.includes(b.id));
  if (visible.length === 0) return null;

  return (
    <section className="space-y-2">
      {visible.map((b) => (
        <div
          key={b.id}
          className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/12 via-primary/5 to-transparent p-4"
        >
          <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-primary/20 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/20 text-primary">
              <Megaphone className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              {b.title && (
                <div className="text-sm font-bold leading-tight">{b.title}</div>
              )}
              {b.text && (
                <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                  {b.text}
                </p>
              )}
              {b.button_url && (
                <a
                  href={b.button_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
                >
                  {b.button_label || "Подробнее"}
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
            <button
              onClick={() => dismiss(b.id)}
              aria-label="Скрыть"
              className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
