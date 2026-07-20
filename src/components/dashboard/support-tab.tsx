import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Headphones, Send, Plus, ArrowLeft, Loader2, MessageSquare,
  CheckCircle2, Clock, AlertCircle,
} from "lucide-react";
import {
  type SupportTicket, type SupportMessage, type SupportPriority,
  statusLabel, statusTone, priorityLabel,
} from "@/components/support/types";

export function SupportTab() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      setMeId(u.user?.id ?? null);
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .order("last_message_at", { ascending: false });
    setTickets((data ?? []) as SupportTicket[]);
    setLoading(false);
  }

  if (openId) {
    return (
      <TicketView
        ticketId={openId}
        meId={meId}
        onBack={() => { setOpenId(null); void load(); }}
        isAdmin={false}
      />
    );
  }

  return (
    <div className="space-y-3 pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Headphones className="size-5 text-primary" />
          <div>
            <h2 className="text-sm font-black uppercase tracking-tight">Тех.поддержка</h2>
            <p className="text-[10px] text-muted-foreground">Задайте вопрос — ответим в течение суток</p>
          </div>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground"
        >
          <Plus className="size-3.5" /> Новое
        </button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-14 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <MessageSquare className="mx-auto mb-3 size-10 text-muted-foreground" />
          <p className="text-sm font-semibold">Обращений пока нет</p>
          <p className="mt-1 text-xs text-muted-foreground">Создайте первое обращение — мы поможем</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => setOpenId(t.id)}
              className="flex w-full items-start justify-between gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusTone[t.status]}`}>
                    {statusLabel[t.status]}
                  </span>
                  {t.priority === "high" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[9px] font-bold uppercase text-destructive">
                      <AlertCircle className="size-3" /> Срочно
                    </span>
                  )}
                </div>
                <div className="mt-1.5 truncate text-sm font-bold">{t.subject}</div>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Clock className="size-3" />
                  {new Date(t.last_message_at).toLocaleString("ru-RU")}
                </div>
              </div>
              {t.unread_user > 0 && (
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
                  {t.unread_user}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {creating && meId && (
        <NewTicketModal
          meId={meId}
          onClose={() => setCreating(false)}
          onCreated={(id) => { setCreating(false); setOpenId(id); void load(); }}
        />
      )}
    </div>
  );
}

/* ------------------------------ New ticket ------------------------------ */

function NewTicketModal({
  meId, onClose, onCreated,
}: { meId: string; onClose: () => void; onCreated: (id: string) => void }) {
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<SupportPriority>("normal");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!subject.trim() || !text.trim()) { setErr("Заполните тему и сообщение"); return; }
    setBusy(true); setErr(null);
    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({ user_id: meId, subject: subject.trim(), priority, status: "open" })
      .select("id")
      .single();
    if (error || !ticket) { setBusy(false); setErr(error?.message ?? "Ошибка"); return; }
    const { error: e2 } = await supabase
      .from("support_messages")
      .insert({ ticket_id: ticket.id, author_id: meId, from_admin: false, text: text.trim() });
    setBusy(false);
    if (e2) { setErr(e2.message); return; }
    onCreated(ticket.id);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/60 p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-border bg-background p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-tight">Новое обращение</h3>
          <button onClick={onClose} className="text-muted-foreground">×</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-muted-foreground">Тема</label>
            <input
              value={subject} onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Кратко опишите вопрос"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-muted-foreground">Приоритет</label>
            <div className="flex gap-1.5">
              {(["low", "normal", "high"] as const).map((p) => (
                <button key={p} onClick={() => setPriority(p)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-bold uppercase transition ${
                    priority === p ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"
                  }`}>
                  {priorityLabel[p]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-muted-foreground">Сообщение</label>
            <textarea
              value={text} onChange={(e) => setText(e.target.value)}
              rows={5}
              className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Подробно опишите ситуацию, приложите номера заявок и т.п."
            />
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
          <button
            onClick={submit} disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Отправить
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Ticket view ----------------------------- */

export function TicketView({
  ticketId, meId, onBack, isAdmin,
}: { ticketId: string; meId: string | null; onBack: () => void; isAdmin: boolean }) {
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function load() {
    const [{ data: t }, { data: m }] = await Promise.all([
      supabase.from("support_tickets").select("*").eq("id", ticketId).maybeSingle(),
      supabase.from("support_messages").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true }),
    ]);
    setTicket((t as SupportTicket | null) ?? null);
    setMessages((m ?? []) as SupportMessage[]);
    setLoading(false);
    // reset unread for the current viewer
    const patch = isAdmin ? { unread_admin: 0 } : { unread_user: 0 };
    await supabase.from("support_tickets").update(patch).eq("id", ticketId);
  }

  useEffect(() => {
    void load();
    const ch = supabase
      .channel(`support:${ticketId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${ticketId}` },
        (p) => setMessages((prev) => prev.some((x) => x.id === (p.new as SupportMessage).id) ? prev : [...prev, p.new as SupportMessage]))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "support_tickets", filter: `id=eq.${ticketId}` },
        (p) => setTicket((prev) => (prev ? { ...prev, ...(p.new as SupportTicket) } : prev)))
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    if (!text.trim() || !meId || !ticket || busy) return;
    setBusy(true); setErr(null);
    const body = text.trim();
    const { data, error } = await supabase.from("support_messages").insert({
      ticket_id: ticket.id, author_id: meId, from_admin: isAdmin, text: body,
    }).select("*").maybeSingle();
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setText("");
    if (data) {
      setMessages((prev) => prev.some((x) => x.id === data.id) ? prev : [...prev, data as SupportMessage]);
    } else {
      // RLS may hide RETURNING row for some paths — refetch full list as fallback
      const { data: m } = await supabase
        .from("support_messages").select("*")
        .eq("ticket_id", ticket.id).order("created_at", { ascending: true });
      if (m) setMessages(m as SupportMessage[]);
    }
  }

  async function setStatus(status: "open" | "closed") {
    if (!ticket) return;
    setErr(null);
    const { error } = await supabase.from("support_tickets").update({ status }).eq("id", ticket.id);
    if (error) { setErr(error.message); return; }
    setTicket({ ...ticket, status });
  }

  if (loading || !ticket) {
    return <div className="grid place-items-center py-14 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>;
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col pb-2">
      <div className="mb-2 flex items-center gap-2">
        <button onClick={onBack} className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-accent">
          <ArrowLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-black">{ticket.subject}</div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className={`rounded-full px-2 py-0.5 font-bold uppercase ${statusTone[ticket.status]}`}>
              {statusLabel[ticket.status]}
            </span>
            <span className="text-muted-foreground">Приоритет: {priorityLabel[ticket.priority]}</span>
          </div>
        </div>
        {ticket.status !== "closed" ? (
          <button onClick={() => void setStatus("closed")}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground">
            <CheckCircle2 className="size-3" /> Закрыть
          </button>
        ) : (
          <button onClick={() => void setStatus("open")}
            className="rounded-full border border-border px-2.5 py-1 text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground">
            Открыть
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-xl border border-border bg-card/40 p-3 space-y-2">
        {messages.map((m) => {
          const mine = m.author_id === meId;
          const showAsAdmin = m.from_admin;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                mine ? "bg-primary text-primary-foreground" : showAsAdmin ? "bg-sky-500/15 text-foreground" : "bg-muted text-foreground"
              }`}>
                <div className="mb-0.5 text-[9px] font-bold uppercase tracking-wider opacity-70">
                  {showAsAdmin ? "Поддержка" : "Пользователь"} · {new Date(m.created_at).toLocaleString("ru-RU")}
                </div>
                <div className="whitespace-pre-wrap break-words">{m.text}</div>
              </div>
            </div>
          );
        })}
      </div>

      {ticket.status !== "closed" ? (
        <div className="mt-2 space-y-1.5">
          {err && <p className="text-[11px] text-destructive">{err}</p>}
          <div className="flex items-end gap-2">
            <textarea
              value={text} onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder="Введите сообщение… (Ctrl+Enter — отправить)"
              className="flex-1 resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void send(); }}
            />
            <button onClick={() => void send()} disabled={busy || !text.trim()}
              className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 rounded-xl border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">
          Тикет закрыт. Нажмите «Открыть» чтобы продолжить переписку.
        </div>
      )}
    </div>
  );
}
