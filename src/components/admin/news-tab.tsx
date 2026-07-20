import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Newspaper, Plus, Trash2, Save, Loader2, ExternalLink } from "lucide-react";

type Post = {
  id: string;
  title: string;
  content: string;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export function AdminNewsTab() {
  const [rows, setRows] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", content: "", published: true });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("news_posts")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Post[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("rt:admin:news")
      .on("postgres_changes", { event: "*", schema: "public", table: "news_posts" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [load]);

  const create = async () => {
    if (!draft.title.trim()) return;
    setCreating(true);
    await supabase.from("news_posts").insert(draft);
    setDraft({ title: "", content: "", published: true });
    setCreating(false);
  };

  const save = async (p: Post) => {
    setSavingId(p.id);
    await supabase
      .from("news_posts")
      .update({ title: p.title, content: p.content, published: p.published })
      .eq("id", p.id);
    setSavingId(null);
  };

  const remove = async (id: string) => {
    if (!confirm("Удалить пост?")) return;
    await supabase.from("news_posts").delete().eq("id", id);
  };

  const update = (id: string, patch: Partial<Post>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Newspaper className="size-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider">Новый пост</h3>
        </div>
        <div className="grid gap-2">
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold"
            placeholder="Заголовок"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <textarea
            className="min-h-[140px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="Текст поста"
            value={draft.content}
            onChange={(e) => setDraft({ ...draft, content: e.target.value })}
          />
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
              />
              Опубликовать сразу
            </label>
            <div className="flex items-center gap-2">
              <a
                href="/news"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="size-3" /> Открыть /news
              </a>
              <button
                onClick={create}
                disabled={creating}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-50"
              >
                {creating ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                Опубликовать
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Все посты {rows.length ? `(${rows.length})` : ""}
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Пока нет постов
          </div>
        ) : (
          rows.map((p) => (
            <div key={p.id} className="space-y-2 rounded-xl border border-border bg-card p-4">
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold"
                value={p.title}
                onChange={(e) => update(p.id, { title: e.target.value })}
              />
              <textarea
                className="min-h-[120px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={p.content}
                onChange={(e) => update(p.id, { content: e.target.value })}
              />
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={p.published}
                    onChange={(e) => update(p.id, { published: e.target.checked })}
                  />
                  Опубликован
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {new Date(p.created_at).toLocaleString("ru-RU")}
                  </span>
                  <button
                    onClick={() => remove(p.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3" /> Удалить
                  </button>
                  <button
                    onClick={() => save(p)}
                    disabled={savingId === p.id}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-50"
                  >
                    {savingId === p.id ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                    Сохранить
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
