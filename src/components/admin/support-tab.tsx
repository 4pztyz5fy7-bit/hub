import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Headphones, Loader2, Search, MessageSquare, AlertCircle } from "lucide-react";
import {
  type SupportTicket, statusLabel, statusTone, priorityLabel,
} from "@/components/support/types";
import { TicketView } from "@/components/dashboard/support-tab";

type Row = SupportTicket & {
  profile?: { email: string | null; display_name: string | null } | null;
};

export function AdminSupportTab({ meId, onCountChange }: {
  meId: string | null;
  onCountChange?: (n: number) => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "pending" | "closed">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: tickets } = await supabase
      .from("support_tickets")
      .select("*")
      .order("last_message_at", { ascending: false });
    const list = (tickets ?? []) as SupportTicket[];
    const ids = Array.from(new Set(list.map((t) => t.user_id)));
    let profiles: Record<string, { email: string | null; display_name: string | null }> = {};
    if (ids.length) {
      const { data: pr } = await supabase.from("profiles").select("id,email,display_name").in("id", ids);
      profiles = Object.fromEntries((pr ?? []).map((p: any) => [p.id, { email: p.email, display_name: p.display_name }]));
    }
    setRows(list.map((t) => ({ ...t, profile: profiles[t.user_id] ?? null })));
    setLoading(false);
    onCountChange?.(list.reduce((s, t) => s + (t.unread_admin ?? 0), 0));
  }

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("support:admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!s) return true;
      return (
        r.subject.toLowerCase().includes(s) ||
        (r.profile?.email ?? "").toLowerCase().includes(s) ||
        (r.profile?.display_name ?? "").toLowerCase().includes(s)
      );
    });
  }, [rows, q, filter]);

  if (openId) {
    return (
      <TicketView
        ticketId={openId}
        meId={meId}
        isAdmin={true}
        onBack={() => { setOpenId(null); void load(); }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Headphones className="size-5 text-primary" />
        <h2 className="text-sm font-black uppercase tracking-tight">Тех.поддержка</h2>
        <span className="ml-auto text-[10px] text-muted-foreground">{rows.length} обращений</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex flex-1 min-w-[200px] items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
          <Search className="size-3.5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по теме или пользователю"
            className="w-full bg-transparent text-xs outline-none" />
        </div>
        {(["all", "open", "pending", "closed"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
              filter === f ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"
            }`}>
            {f === "all" ? "Все" : statusLabel[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid place-items-center py-14 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <MessageSquare className="mx-auto mb-3 size-10 text-muted-foreground" />
          <p className="text-sm font-semibold">Обращений нет</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <button key={t.id} onClick={() => setOpenId(t.id)}
              className="flex w-full items-start justify-between gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/50">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${statusTone[t.status]}`}>
                    {statusLabel[t.status]}
                  </span>
                  {t.priority === "high" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[9px] font-bold uppercase text-destructive">
                      <AlertCircle className="size-3" /> {priorityLabel[t.priority]}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {t.profile?.display_name ?? t.profile?.email ?? t.user_id.slice(0, 8)}
                  </span>
                </div>
                <div className="mt-1.5 truncate text-sm font-bold">{t.subject}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(t.last_message_at).toLocaleString("ru-RU")}
                </div>
              </div>
              {t.unread_admin > 0 && (
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
                  {t.unread_admin}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
