import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

export function EmailVerifiedBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("verified") === "1") {
      setShow(true);
      url.searchParams.delete("verified");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + url.hash);
      const t = setTimeout(() => setShow(false), 8000);
      return () => clearTimeout(t);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="animate-in-up mb-4 flex items-center gap-3 rounded-2xl border border-[color:var(--success)]/40 bg-[color:var(--success)]/10 p-4 text-sm text-foreground shadow-sm">
      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[color:var(--success)]/20 text-[color:var(--success)]">
        <CheckCircle2 className="size-5" />
      </div>
      <div className="flex-1">
        <p className="font-bold">Email подтверждён</p>
        <p className="text-xs text-muted-foreground">
          Спасибо! Ваша почта успешно подтверждена — все возможности личного кабинета доступны.
        </p>
      </div>
      <button
        onClick={() => setShow(false)}
        aria-label="Закрыть"
        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
