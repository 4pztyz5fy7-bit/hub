import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Newspaper, Loader2 } from "lucide-react";

type Post = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "Новости — КВАНТ" },
      { name: "description", content: "Актуальные новости и обновления партнёрской платформы КВАНТ." },
      { property: "og:title", content: "Новости КВАНТ" },
      { property: "og:description", content: "Новости и обновления проекта." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: NewsPage,
});

function NewsPage() {
  const [posts, setPosts] = useState<Post[] | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("news_posts")
        .select("id,title,content,created_at")
        .eq("published", true)
        .order("created_at", { ascending: false });
      setPosts((data ?? []) as Post[]);
    };
    void load();
    const ch = supabase
      .channel("rt:public:news")
      .on("postgres_changes", { event: "*", schema: "public", table: "news_posts" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> На главную
        </Link>
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <Newspaper className="size-4 text-primary" /> Новости
        </div>
        <div className="w-24" />
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight">Новости проекта</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Обновления, анонсы и важные объявления КВАНТ.
          </p>
        </div>

        {posts === null ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Пока нет новостей. Загляните позже.
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => (
              <article
                key={p.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <h2 className="mt-1 text-xl font-bold leading-tight">{p.title}</h2>
                {p.content && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                    {p.content}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
