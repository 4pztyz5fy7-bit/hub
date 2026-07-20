import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, Plus, Trash2, Save, Loader2, ExternalLink } from "lucide-react";

type Banner = {
  id: string;
  title: string;
  text: string;
  button_label: string;
  button_url: string;
  active: boolean;
  created_at: string;
};

const empty = (): Omit<Banner, "id" | "created_at"> => ({
  title: "",
  text: "",
  button_label: "Подробнее",
  button_url: "",
  active: true,
});

export function AdminBannersTab() {
  const [rows, setRows] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(empty());
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("banners")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Banner[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("rt:admin:banners")
      .on("postgres_changes", { event: "*", schema: "public", table: "banners" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [load]);

  const create = async () => {
    if (!draft.title.trim() && !draft.text.trim()) return;
    setCreating(true);
    await supabase.from("banners").insert(draft);
    setDraft(empty());
    setCreating(false);
  };

  const save = async (b: Banner) => {
    setSavingId(b.id);
    await supabase
      .from("banners")
      .update({
        title: b.title,
        text: b.text,
        button_label: b.button_label,
        button_url: b.button_url,
        active: b.active,
      })
      .eq("id", b.id);
    setSavingId(null);
  };

  const remove = async (id: string) => {
    if (!confirm("Удалить баннер?")) return;
    await supabase.from("banners").delete().eq("id", id);
  };

  const update = (id: string, patch: Partial<Banner>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Megaphone className="size-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider">Новый баннер</h3>
        </div>
        <div className="grid gap-2">
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="Заголовок"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <textarea
            className="min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="Текст баннера"
            value={draft.text}
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Надпись кнопки"
              value={draft.button_label}
              onChange={(e) => setDraft({ ...draft, button_label: e.target.value })}
            />
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Ссылка (https://…)"
              value={draft.button_url}
              onChange={(e) => setDraft({ ...draft, button_url: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
              />
              Активен (показывать пользователям)
            </label>
            <button
              onClick={create}
              disabled={creating}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-50"
            >
              {creating ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Создать
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Все баннеры {rows.length ? `(${rows.length})` : ""}
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Пока нет баннеров
          </div>
        ) : (
          rows.map((b) => (
            <div key={b.id} className="space-y-2 rounded-xl border border-border bg-card p-4">
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold"
                value={b.title}
                onChange={(e) => update(b.id, { title: e.target.value })}
                placeholder="Заголовок"
              />
              <textarea
                className="min-h-[70px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={b.text}
                onChange={(e) => update(b.id, { text: e.target.value })}
                placeholder="Текст"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={b.button_label}
                  onChange={(e) => update(b.id, { button_label: e.target.value })}
                  placeholder="Надпись кнопки"
                />
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={b.button_url}
                  onChange={(e) => update(b.id, { button_url: e.target.value })}
                  placeholder="Ссылка"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={b.active}
                    onChange={(e) => update(b.id, { active: e.target.checked })}
                  />
                  Активен
                </label>
                <div className="flex items-center gap-1">
                  {b.button_url && (
                    <a
                      href={b.button_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="size-3" /> Открыть
                    </a>
                  )}
                  <button
                    onClick={() => remove(b.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3" /> Удалить
                  </button>
                  <button
                    onClick={() => save(b)}
                    disabled={savingId === b.id}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-50"
                  >
                    {savingId === b.id ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
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
