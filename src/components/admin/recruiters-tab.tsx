import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminGetRecruitersData,
  adminSetRecruiterRole,
  adminGrantRecruiterOffer,
  adminRevokeRecruiterOffer,
  adminGrantRecruiterCategory,
  adminRevokeRecruiterCategory,
  adminSearchUsers,
} from "@/lib/recruiter.functions";
import { translateError } from "@/lib/errors-ru";
import {
  Loader2,
  Plus,
  Search,
  Trash2,
  UserCog,
  Package,
  FolderTree,
  UserPlus,
  X,
} from "lucide-react";

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  telegram: string | null;
  avatar_url: string | null;
};
type OfferLite = { id: string; name: string; category: string | null };
type Access = { id: string; recruiter_id: string; offer_id?: string; category?: string };

export function AdminRecruitersTab() {
  const loadFn = useServerFn(adminGetRecruitersData);
  const setRoleFn = useServerFn(adminSetRecruiterRole);
  const grantOfferFn = useServerFn(adminGrantRecruiterOffer);
  const revokeOfferFn = useServerFn(adminRevokeRecruiterOffer);
  const grantCatFn = useServerFn(adminGrantRecruiterCategory);
  const revokeCatFn = useServerFn(adminRevokeRecruiterCategory);
  const searchFn = useServerFn(adminSearchUsers);

  const [loading, setLoading] = useState(true);
  const [recruiters, setRecruiters] = useState<Profile[]>([]);
  const [offers, setOffers] = useState<OfferLite[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [offerAccess, setOfferAccess] = useState<Access[]>([]);
  const [catAccess, setCatAccess] = useState<Access[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await loadFn({});
      setRecruiters(r.recruiters as Profile[]);
      setOffers(r.offers as OfferLite[]);
      setCategories(r.categories as string[]);
      setOfferAccess(r.offerAccess as Access[]);
      setCatAccess(r.categoryAccess as Access[]);
    } catch (e) {
      setErr(translateError(e, "Не удалось загрузить данные"));
    }
    setLoading(false);
  }, [loadFn]);

  useEffect(() => {
    void load();
  }, [load]);

  const addRecruiter = async (user_id: string) => {
    try {
      await setRoleFn({ data: { user_id, enable: true } });
      setAddOpen(false);
      void load();
    } catch (e) {
      setErr(translateError(e, "Не удалось назначить"));
    }
  };
  const removeRecruiter = async (user_id: string) => {
    if (!confirm("Снять роль рекрутёра и очистить все его доступы?")) return;
    try {
      await setRoleFn({ data: { user_id, enable: false } });
      void load();
    } catch (e) {
      setErr(translateError(e, "Не удалось снять роль"));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold">Рекрутёры</div>
          <div className="text-[11px] text-muted-foreground">
            Управление доступом к офферам и категориям
          </div>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
        >
          <UserPlus className="size-3.5" /> Назначить
        </button>
      </div>

      {err && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
          {err}
        </div>
      )}

      {loading ? (
        <div className="grid place-items-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : recruiters.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Пока нет рекрутёров. Нажмите «Назначить», чтобы выдать роль пользователю.
        </div>
      ) : (
        <div className="space-y-3">
          {recruiters.map((r) => (
            <RecruiterCard
              key={r.id}
              profile={r}
              offers={offers}
              categories={categories}
              offerAccess={offerAccess.filter((a) => a.recruiter_id === r.id)}
              catAccess={catAccess.filter((a) => a.recruiter_id === r.id)}
              onGrantOffer={(offer_id) =>
                grantOfferFn({ data: { user_id: r.id, offer_id } }).then(load).catch((e) => setErr(translateError(e)))
              }
              onRevokeOffer={(id) =>
                revokeOfferFn({ data: { id } }).then(load).catch((e) => setErr(translateError(e)))
              }
              onGrantCategory={(category) =>
                grantCatFn({ data: { user_id: r.id, category } }).then(load).catch((e) => setErr(translateError(e)))
              }
              onRevokeCategory={(id) =>
                revokeCatFn({ data: { id } }).then(load).catch((e) => setErr(translateError(e)))
              }
              onRemove={() => removeRecruiter(r.id)}
            />
          ))}
        </div>
      )}

      {addOpen && (
        <AddRecruiterDialog
          onClose={() => setAddOpen(false)}
          onPick={addRecruiter}
          search={async (q) => (await searchFn({ data: { q } })) as Profile[]}
        />
      )}
    </div>
  );
}

function RecruiterCard({
  profile,
  offers,
  categories,
  offerAccess,
  catAccess,
  onGrantOffer,
  onRevokeOffer,
  onGrantCategory,
  onRevokeCategory,
  onRemove,
}: {
  profile: Profile;
  offers: OfferLite[];
  categories: string[];
  offerAccess: Access[];
  catAccess: Access[];
  onGrantOffer: (offer_id: string) => void;
  onRevokeOffer: (id: string) => void;
  onGrantCategory: (category: string) => void;
  onRevokeCategory: (id: string) => void;
  onRemove: () => void;
}) {
  const [offerPick, setOfferPick] = useState("");
  const [catPick, setCatPick] = useState("");

  const offersById = useMemo(() => {
    const m = new Map<string, OfferLite>();
    offers.forEach((o) => m.set(o.id, o));
    return m;
  }, [offers]);

  const givenOfferIds = new Set(offerAccess.map((a) => a.offer_id!).filter(Boolean));
  const givenCats = new Set(catAccess.map((a) => a.category!).filter(Boolean));

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-full bg-primary/15 text-primary">
          <UserCog className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">
            {profile.display_name || profile.email || profile.id.slice(0, 8)}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">{profile.email ?? "—"}</div>
        </div>
        <button
          onClick={onRemove}
          className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 px-2.5 py-1 text-[11px] font-bold text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-3.5" /> Снять роль
        </button>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-2.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground">
            <Package className="size-3" /> Офферы
          </div>
          <div className="flex flex-wrap gap-1">
            {offerAccess.length === 0 && (
              <span className="text-[11px] text-muted-foreground">Нет доступа к отдельным офферам</span>
            )}
            {offerAccess.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px]"
              >
                {offersById.get(a.offer_id!)?.name ?? a.offer_id}
                <button
                  onClick={() => onRevokeOffer(a.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <select
              value={offerPick}
              onChange={(e) => setOfferPick(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="">Выберите оффер…</option>
              {offers
                .filter((o) => !givenOfferIds.has(o.id))
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
            </select>
            <button
              disabled={!offerPick}
              onClick={() => {
                onGrantOffer(offerPick);
                setOfferPick("");
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
            >
              <Plus className="size-3" /> Добавить
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background p-2.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground">
            <FolderTree className="size-3" /> Категории (все офферы категории)
          </div>
          <div className="flex flex-wrap gap-1">
            {catAccess.length === 0 && (
              <span className="text-[11px] text-muted-foreground">Нет доступа по категориям</span>
            )}
            {catAccess.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px]"
              >
                {a.category}
                <button
                  onClick={() => onRevokeCategory(a.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <select
              value={catPick}
              onChange={(e) => setCatPick(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="">Выберите категорию…</option>
              {categories
                .filter((c) => !givenCats.has(c))
                .map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
            <button
              disabled={!catPick}
              onClick={() => {
                onGrantCategory(catPick);
                setCatPick("");
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
            >
              <Plus className="size-3" /> Добавить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddRecruiterDialog({
  onClose,
  onPick,
  search,
}: {
  onClose: () => void;
  onPick: (id: string) => void;
  search: (q: string) => Promise<Profile[]>;
}) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Profile[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await search(q);
        if (!cancelled) setRows(r);
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, search]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/70 p-3 pt-16 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="text-sm font-bold">Назначить рекрутёра</div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
            <Search className="size-4 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Email, имя, telegram…"
              className="flex-1 bg-transparent text-sm outline-none"
            />
            {busy && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
          </div>
          <div className="mt-2 max-h-72 overflow-y-auto">
            {rows.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Никого не найдено</div>
            ) : (
              <ul className="space-y-1">
                {rows.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => onPick(p.id)}
                      className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-left hover:bg-accent"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">
                          {p.display_name || p.email || p.id.slice(0, 8)}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {p.email ?? "—"}
                        </div>
                      </div>
                      <Plus className="size-3.5 text-primary" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
