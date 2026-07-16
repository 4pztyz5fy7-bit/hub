import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Wrench, Copy, Check, QrCode, Link2, Calculator, Percent, Coins, Landmark, Target,
  Timer, ListChecks, StickyNote, Palette, Moon, Sun, Download, Upload, Star,
  EyeOff, Eye, MessageSquare, Mail, Youtube, Instagram, Send, Hash, KeyRound,
  Sparkles, Type, Languages, ArrowLeftRight, ShieldCheck, Search, Trash2, Bell,
  Calendar, Gift, Share2, Zap, FileText, Filter, RefreshCw, Award, PlayCircle,
  StopCircle, TrendingUp, Users, Globe, Clock, Lock, ClipboardCheck, Bookmark,
  ChevronDown, ChevronUp,
} from "lucide-react";

type ToolProps = {
  userId: string | null;
  refLink: string;
  offers: Array<{ id: string; name: string; landing?: string | null }>;
};

const LS = (k: string, fb = "") => {
  try { return localStorage.getItem(k) ?? fb; } catch { return fb; }
};
const setLS = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };
const jsonLS = <T,>(k: string, fb: T): T => {
  try { const s = localStorage.getItem(k); return s ? (JSON.parse(s) as T) : fb; } catch { return fb; }
};
const setJsonLS = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); } catch {} };
const download = (name: string, content: string, type = "text/plain") => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
};
const toCsv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
};

export function ToolsTab({ userId, refLink, offers }: ToolProps) {
  const [group, setGroup] = useState<string>("marketing");
  const groups = [
    { id: "marketing", label: "Маркетинг", Icon: Sparkles },
    { id: "calc", label: "Калькуляторы", Icon: Calculator },
    { id: "content", label: "Контент", Icon: MessageSquare },
    { id: "productivity", label: "Продуктивность", Icon: Timer },
    { id: "data", label: "Данные", Icon: Download },
    { id: "profile", label: "Профиль", Icon: Palette },
  ];

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Wrench className="size-4 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wider">Инструменты партнёра</h2>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">50+ утилит: генераторы ссылок, калькуляторы, шаблоны, экспорт и настройки.</p>
      </header>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {groups.map((g) => (
          <button key={g.id} onClick={() => setGroup(g.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${group === g.id ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:text-foreground"}`}>
            <g.Icon className="size-3.5" /> {g.label}
          </button>
        ))}
      </div>

      {group === "marketing" && <MarketingTools userId={userId} refLink={refLink} offers={offers} />}
      {group === "calc" && <CalcTools />}
      {group === "content" && <ContentTools />}
      {group === "productivity" && <ProductivityTools />}
      {group === "data" && <DataTools userId={userId} />}
      {group === "profile" && <ProfileTools refLink={refLink} />}
    </div>
  );
}

/* ============ Shared ============ */
function Card({ title, Icon, children, defaultOpen = false }: { title: string; Icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
        <Icon className="size-3.5 text-primary" />
        <span className="flex-1 text-[12px] font-bold">{title}</span>
        {open ? <ChevronUp className="size-3.5 text-muted-foreground" /> : <ChevronDown className="size-3.5 text-muted-foreground" />}
      </button>
      {open && <div className="border-t border-border p-3">{children}</div>}
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) { return <div className="space-y-2">{children}</div>; }
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-[12px] outline-none focus:ring-2 focus:ring-primary/40 ${props.className ?? ""}`} />;
}
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-[12px] outline-none focus:ring-2 focus:ring-primary/40 ${props.className ?? ""}`} />;
}
function Btn({ children, onClick, tone = "default" }: { children: React.ReactNode; onClick?: () => void; tone?: "default" | "primary" | "danger" }) {
  const cls = tone === "primary" ? "bg-primary text-primary-foreground" : tone === "danger" ? "border border-destructive/40 text-destructive" : "border border-border";
  return <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-bold ${cls}`}>{children}</button>;
}
function Result({ value }: { value: string }) {
  const [c, setC] = useState(false);
  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-secondary/40 px-2 py-1.5">
      <p className="flex-1 truncate font-mono text-[11px]">{value || "—"}</p>
      {value && (
        <button onClick={async () => { await copy(value); setC(true); setTimeout(() => setC(false), 1200); }}
          className="grid size-6 place-items-center rounded-md hover:bg-accent">
          {c ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
        </button>
      )}
    </div>
  );
}

/* ============ 1. MARKETING (10) ============ */
function MarketingTools({ userId, refLink, offers }: ToolProps) {
  return (
    <div className="space-y-2">
      <Card title="1. Генератор subID" Icon={Hash} defaultOpen>
        <SubIdGen />
      </Card>
      <Card title="2. UTM-конструктор" Icon={Link2}><UtmBuilder /></Card>
      <Card title="3. QR-код на ссылку" Icon={QrCode}><QrTool defaultUrl={refLink} /></Card>
      <Card title="4. Короткая ссылка (локальная)" Icon={Zap}><ShortLinks /></Card>
      <Card title="5. Партнёрский лендинг оффера" Icon={Target}><OfferPicker offers={offers} /></Card>
      <Card title="6. Мульти-копирование ссылок офферов" Icon={Copy}><BulkOfferCopy offers={offers} /></Card>
      <Card title="7. Реферальная ссылка + шаринг" Icon={Share2}><ShareRef refLink={refLink} /></Card>
      <Card title="8. Проверка стоп-слов" Icon={ShieldCheck}><StopWords /></Card>
      <Card title="9. Хэштег-микс" Icon={Hash}><HashMix /></Card>
      <Card title="10. Генератор промо-кода" Icon={Gift}><PromoGen userId={userId} /></Card>
    </div>
  );
}
function SubIdGen() {
  const [prefix, setPrefix] = useState("sub");
  const [count, setCount] = useState(5);
  const [out, setOut] = useState<string[]>([]);
  const gen = () => setOut(Array.from({ length: Math.max(1, Math.min(50, count)) }, () => `${prefix}-${Math.random().toString(36).slice(2, 8)}`));
  return (
    <Row>
      <div className="grid grid-cols-2 gap-2"><Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="prefix" /><Input type="number" value={count} onChange={(e) => setCount(+e.target.value)} /></div>
      <Btn onClick={gen} tone="primary"><Sparkles className="size-3" /> Сгенерировать</Btn>
      {out.length > 0 && <div className="space-y-1">{out.map((s, i) => <Result key={i} value={s} />)}</div>}
    </Row>
  );
}
function UtmBuilder() {
  const [base, setBase] = useState("");
  const [s, setS] = useState({ source: "telegram", medium: "cpc", campaign: "", term: "", content: "" });
  const url = useMemo(() => {
    if (!base) return "";
    const p = new URLSearchParams();
    Object.entries(s).forEach(([k, v]) => v && p.set(`utm_${k}`, v));
    return `${base}${base.includes("?") ? "&" : "?"}${p.toString()}`;
  }, [base, s]);
  return (
    <Row>
      <Input placeholder="https://…" value={base} onChange={(e) => setBase(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        {(["source", "medium", "campaign", "term", "content"] as const).map((k) => (
          <Input key={k} placeholder={k} value={s[k]} onChange={(e) => setS((v) => ({ ...v, [k]: e.target.value }))} />
        ))}
      </div>
      <Result value={url} />
    </Row>
  );
}
function QrTool({ defaultUrl }: { defaultUrl: string }) {
  const [u, setU] = useState(defaultUrl);
  const src = u ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(u)}` : "";
  return (
    <Row>
      <Input value={u} onChange={(e) => setU(e.target.value)} placeholder="URL" />
      {src && <img alt="qr" src={src} className="mx-auto rounded-md border border-border" width={220} height={220} />}
    </Row>
  );
}
function ShortLinks() {
  const [list, setList] = useState<Array<{ alias: string; url: string }>>(() => jsonLS("shortlinks", []));
  const [alias, setAlias] = useState("");
  const [url, setUrl] = useState("");
  const add = () => {
    if (!alias || !url) return;
    const next = [{ alias, url }, ...list.filter((l) => l.alias !== alias)].slice(0, 30);
    setList(next); setJsonLS("shortlinks", next); setAlias(""); setUrl("");
  };
  const del = (a: string) => { const n = list.filter((l) => l.alias !== a); setList(n); setJsonLS("shortlinks", n); };
  return (
    <Row>
      <div className="grid grid-cols-2 gap-2"><Input placeholder="alias" value={alias} onChange={(e) => setAlias(e.target.value)} /><Input placeholder="url" value={url} onChange={(e) => setUrl(e.target.value)} /></div>
      <Btn onClick={add} tone="primary">Сохранить</Btn>
      {list.map((l) => (
        <div key={l.alias} className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 px-2 py-1.5">
          <span className="font-mono text-[11px] font-bold">/{l.alias}</span>
          <span className="flex-1 truncate text-[11px] text-muted-foreground">{l.url}</span>
          <button onClick={() => copy(l.url)} className="grid size-6 place-items-center rounded hover:bg-accent"><Copy className="size-3" /></button>
          <button onClick={() => del(l.alias)} className="grid size-6 place-items-center rounded text-destructive hover:bg-destructive/10"><Trash2 className="size-3" /></button>
        </div>
      ))}
    </Row>
  );
}
function OfferPicker({ offers }: { offers: ToolProps["offers"] }) {
  const [id, setId] = useState(offers[0]?.id ?? "");
  const o = offers.find((x) => x.id === id);
  return (
    <Row>
      <select value={id} onChange={(e) => setId(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[12px]">
        {offers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <Result value={o?.landing ?? ""} />
    </Row>
  );
}
function BulkOfferCopy({ offers }: { offers: ToolProps["offers"] }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const doCopy = () => copy(offers.filter((o) => sel.has(o.id)).map((o) => `${o.name}: ${o.landing ?? ""}`).join("\n"));
  return (
    <Row>
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {offers.map((o) => (
          <label key={o.id} className="flex items-center gap-2 text-[11px]">
            <input type="checkbox" checked={sel.has(o.id)} onChange={() => toggle(o.id)} />
            <span className="truncate">{o.name}</span>
          </label>
        ))}
      </div>
      <Btn onClick={doCopy} tone="primary">Скопировать выбранные</Btn>
    </Row>
  );
}
function ShareRef({ refLink }: { refLink: string }) {
  const share = async () => {
    if (navigator.share) try { await navigator.share({ url: refLink, title: "КВАНТ" }); return; } catch {}
    copy(refLink);
  };
  return <Row><Result value={refLink} /><Btn onClick={share} tone="primary"><Share2 className="size-3" /> Поделиться</Btn></Row>;
}
function StopWords() {
  const stop = ["гарантия", "100%", "бесплатно навсегда", "заработай миллион", "без вложений", "мошенник", "казино", "букмекер"];
  const [t, setT] = useState("");
  const found = stop.filter((w) => t.toLowerCase().includes(w));
  return <Row><Textarea rows={3} value={t} onChange={(e) => setT(e.target.value)} placeholder="Ваш текст…" />
    <p className="text-[11px]">Найдено: <span className="font-bold">{found.length}</span></p>
    <div className="flex flex-wrap gap-1">{found.map((f) => <span key={f} className="rounded bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive">{f}</span>)}</div>
  </Row>;
}
function HashMix() {
  const [seed, setSeed] = useState("финансы кредит займ");
  const list = seed.split(/\s+/).filter(Boolean).map((w) => `#${w.replace(/[^a-zа-я0-9]/gi, "")}`);
  return <Row><Input value={seed} onChange={(e) => setSeed(e.target.value)} /><Result value={list.join(" ")} /></Row>;
}
function PromoGen({ userId }: { userId: string | null }) {
  const [len, setLen] = useState(8);
  const [code, setCode] = useState("");
  const gen = () => {
    const c = `${(userId ?? "kv").slice(0, 3).toUpperCase()}-${Math.random().toString(36).toUpperCase().slice(2, 2 + len)}`;
    setCode(c);
  };
  return <Row><Input type="number" value={len} min={4} max={16} onChange={(e) => setLen(+e.target.value)} /><Btn onClick={gen} tone="primary">Сгенерировать</Btn><Result value={code} /></Row>;
}

/* ============ 2. CALCULATORS (10) ============ */
function CalcTools() {
  return (
    <div className="space-y-2">
      <Card title="11. Калькулятор дохода (клики × EPC)" Icon={Coins} defaultOpen><IncomeCalc /></Card>
      <Card title="12. Калькулятор CR" Icon={Percent}><CrCalc /></Card>
      <Card title="13. Калькулятор ROI" Icon={TrendingUp}><RoiCalc /></Card>
      <Card title="14. Прогноз месяца" Icon={Target}><MonthProj /></Card>
      <Card title="15. Налог самозанятого (4/6%)" Icon={Landmark}><TaxCalc rate={0.06} label="6% (юр.)" /></Card>
      <Card title="16. Налог 13% НДФЛ" Icon={Landmark}><TaxCalc rate={0.13} label="13%" /></Card>
      <Card title="17. Комиссия банка" Icon={Landmark}><FeeCalc /></Card>
      <Card title="18. Конвертер валют" Icon={ArrowLeftRight}><FxCalc /></Card>
      <Card title="19. Разбивка суммы (n частей)" Icon={Filter}><SplitCalc /></Card>
      <Card title="20. Проценты (X% от Y)" Icon={Percent}><PctCalc /></Card>
    </div>
  );
}
const num = (v: string) => Number(v.replace(",", ".")) || 0;
function IncomeCalc() {
  const [c, setC] = useState("1000"); const [e, setE] = useState("84");
  return <Row><Input value={c} onChange={(x) => setC(x.target.value)} placeholder="клики" /><Input value={e} onChange={(x) => setE(x.target.value)} placeholder="EPC" /><Result value={`${(num(c) * num(e)).toFixed(0)} ₽`} /></Row>;
}
function CrCalc() {
  const [c, setC] = useState("1000"); const [conv, setConv] = useState("38");
  return <Row><Input value={c} onChange={(x) => setC(x.target.value)} placeholder="клики" /><Input value={conv} onChange={(x) => setConv(x.target.value)} placeholder="конверсии" /><Result value={`${((num(conv) / (num(c) || 1)) * 100).toFixed(2)}%`} /></Row>;
}
function RoiCalc() {
  const [rev, setRev] = useState("10000"); const [cost, setCost] = useState("3000");
  return <Row><Input value={rev} onChange={(x) => setRev(x.target.value)} placeholder="доход" /><Input value={cost} onChange={(x) => setCost(x.target.value)} placeholder="расход" /><Result value={`${(((num(rev) - num(cost)) / (num(cost) || 1)) * 100).toFixed(1)}%`} /></Row>;
}
function MonthProj() {
  const [d, setD] = useState("1200");
  return <Row><Input value={d} onChange={(x) => setD(x.target.value)} placeholder="доход в день, ₽" /><Result value={`${(num(d) * 30).toFixed(0)} ₽ / мес`} /></Row>;
}
function TaxCalc({ rate, label }: { rate: number; label: string }) {
  const [v, setV] = useState("100000");
  return <Row><Input value={v} onChange={(x) => setV(x.target.value)} /><Result value={`${label}: ${(num(v) * rate).toFixed(0)} ₽ · чистыми ${(num(v) * (1 - rate)).toFixed(0)} ₽`} /></Row>;
}
function FeeCalc() {
  const [v, setV] = useState("50000"); const [f, setF] = useState("1.5");
  return <Row><Input value={v} onChange={(x) => setV(x.target.value)} placeholder="сумма" /><Input value={f} onChange={(x) => setF(x.target.value)} placeholder="комиссия %" /><Result value={`${(num(v) * (num(f) / 100)).toFixed(0)} ₽`} /></Row>;
}
function FxCalc() {
  const [v, setV] = useState("1000"); const [r, setR] = useState("95");
  return <Row><Input value={v} onChange={(x) => setV(x.target.value)} placeholder="RUB" /><Input value={r} onChange={(x) => setR(x.target.value)} placeholder="курс USD" /><Result value={`${(num(v) / (num(r) || 1)).toFixed(2)} $`} /></Row>;
}
function SplitCalc() {
  const [v, setV] = useState("10000"); const [n, setN] = useState("5");
  return <Row><Input value={v} onChange={(x) => setV(x.target.value)} /><Input value={n} onChange={(x) => setN(x.target.value)} /><Result value={`по ${(num(v) / (num(n) || 1)).toFixed(2)} ₽`} /></Row>;
}
function PctCalc() {
  const [p, setP] = useState("15"); const [v, setV] = useState("1200");
  return <Row><Input value={p} onChange={(x) => setP(x.target.value)} placeholder="%" /><Input value={v} onChange={(x) => setV(x.target.value)} placeholder="от" /><Result value={`${((num(p) / 100) * num(v)).toFixed(2)}`} /></Row>;
}

/* ============ 3. CONTENT (10) ============ */
function ContentTools() {
  const templates = {
    tg: `🔥 Топ-оффер {name}\nВыплата {payout}\nЗабирай ссылку: {link}`,
    email: `Тема: Выгодное предложение — {name}\n\nПривет, {имя}!\nРекомендую: {name}. Условия — {payout}.\nПодробнее: {link}`,
    youtube: `📌 {name} — рабочая связка на {geo}\nЗабирай тут: {link}\n#партнёрка #{tag}`,
    reels: `Хук: «Как я поднял X на {name}» — далее ссылка в шапке {link}`,
  };
  return (
    <div className="space-y-2">
      <Card title="21. Шаблон Telegram" Icon={Send} defaultOpen><TplPreview text={templates.tg} /></Card>
      <Card title="22. Шаблон Email" Icon={Mail}><TplPreview text={templates.email} /></Card>
      <Card title="23. Шаблон YouTube" Icon={Youtube}><TplPreview text={templates.youtube} /></Card>
      <Card title="24. Шаблон Reels/TikTok" Icon={Instagram}><TplPreview text={templates.reels} /></Card>
      <Card title="25. CTA-эмодзи" Icon={Sparkles}><EmojiPack /></Card>
      <Card title="26. Счётчик символов/слов" Icon={Type}><Counter /></Card>
      <Card title="27. Транслит RU→EN" Icon={Languages}><Translit /></Card>
      <Card title="28. Base64" Icon={KeyRound}><B64 /></Card>
      <Card title="29. URL-энкодер" Icon={Link2}><UrlEnc /></Card>
      <Card title="30. Заметки" Icon={StickyNote}><Notes /></Card>
    </div>
  );
}
function TplPreview({ text }: { text: string }) {
  const [t, setT] = useState(text);
  return <Row><Textarea rows={5} value={t} onChange={(e) => setT(e.target.value)} /><Btn onClick={() => copy(t)} tone="primary"><Copy className="size-3" /> Копировать</Btn></Row>;
}
function EmojiPack() {
  const list = ["🚀","🔥","💰","💸","✅","👉","🎯","📈","🎁","⭐","💡","⚡","💎","🏆","📌","🧨","💯","🤑","🛒","📥"];
  return <div className="flex flex-wrap gap-1">{list.map((e) => <button key={e} onClick={() => copy(e)} className="rounded-md border border-border px-2 py-1 text-lg hover:bg-accent">{e}</button>)}</div>;
}
function Counter() {
  const [t, setT] = useState("");
  return <Row><Textarea rows={3} value={t} onChange={(e) => setT(e.target.value)} /><p className="text-[11px]">Символов: <b>{t.length}</b> · Слов: <b>{t.trim().split(/\s+/).filter(Boolean).length}</b></p></Row>;
}
function Translit() {
  const map: Record<string, string> = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" };
  const [t, setT] = useState("");
  const out = t.toLowerCase().split("").map((c) => map[c] ?? c).join("");
  return <Row><Input value={t} onChange={(e) => setT(e.target.value)} /><Result value={out} /></Row>;
}
function B64() {
  const [t, setT] = useState(""); const [mode, setMode] = useState<"enc"|"dec">("enc");
  let out = ""; try { out = mode === "enc" ? btoa(unescape(encodeURIComponent(t))) : decodeURIComponent(escape(atob(t))); } catch { out = "…"; }
  return <Row><div className="flex gap-1"><Btn onClick={() => setMode("enc")}>Encode</Btn><Btn onClick={() => setMode("dec")}>Decode</Btn></div><Textarea rows={2} value={t} onChange={(e) => setT(e.target.value)} /><Result value={out} /></Row>;
}
function UrlEnc() {
  const [t, setT] = useState(""); const [mode, setMode] = useState<"enc"|"dec">("enc");
  let out = ""; try { out = mode === "enc" ? encodeURIComponent(t) : decodeURIComponent(t); } catch { out = "…"; }
  return <Row><div className="flex gap-1"><Btn onClick={() => setMode("enc")}>Encode</Btn><Btn onClick={() => setMode("dec")}>Decode</Btn></div><Textarea rows={2} value={t} onChange={(e) => setT(e.target.value)} /><Result value={out} /></Row>;
}
function Notes() {
  const [n, setN] = useState(LS("notes"));
  useEffect(() => { setLS("notes", n); }, [n]);
  return <Row><Textarea rows={6} value={n} onChange={(e) => setN(e.target.value)} placeholder="Заметки сохраняются локально…" /></Row>;
}

/* ============ 4. PRODUCTIVITY (10) ============ */
function ProductivityTools() {
  return (
    <div className="space-y-2">
      <Card title="31. Дневная цель" Icon={Target} defaultOpen><Goal id="d" label="день" /></Card>
      <Card title="32. Недельная цель" Icon={Target}><Goal id="w" label="неделю" /></Card>
      <Card title="33. Месячная цель" Icon={Target}><Goal id="m" label="месяц" /></Card>
      <Card title="34. Помодоро таймер" Icon={Timer}><Pomodoro /></Card>
      <Card title="35. Тайм-трекер" Icon={Clock}><TimeTracker /></Card>
      <Card title="36. Чек-лист запуска связки" Icon={ListChecks}><Checklist /></Card>
      <Card title="37. Идеи креативов" Icon={Sparkles}><IdeasList /></Card>
      <Card title="38. Планировщик выплаты (.ics)" Icon={Calendar}><IcsPlanner /></Card>
      <Card title="39. Напоминание в браузере" Icon={Bell}><NotifyMe /></Card>
      <Card title="40. Клавиатурные шорткаты" Icon={KeyRound}><Shortcuts /></Card>
    </div>
  );
}
function Goal({ id, label }: { id: string; label: string }) {
  const [g, setG] = useState(LS(`goal-${id}`, "10000"));
  const [p, setP] = useState(LS(`progress-${id}`, "0"));
  useEffect(() => { setLS(`goal-${id}`, g); setLS(`progress-${id}`, p); }, [id, g, p]);
  const pct = Math.min(100, (num(p) / (num(g) || 1)) * 100);
  return <Row>
    <div className="grid grid-cols-2 gap-2"><Input value={g} onChange={(e) => setG(e.target.value)} placeholder={`цель на ${label}`} /><Input value={p} onChange={(e) => setP(e.target.value)} placeholder="прогресс" /></div>
    <div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
    <p className="text-[11px] font-bold">{pct.toFixed(0)}%</p>
  </Row>;
}
function Pomodoro() {
  const [sec, setSec] = useState(25 * 60); const [run, setRun] = useState(false);
  useEffect(() => { if (!run) return; const t = setInterval(() => setSec((s) => Math.max(0, s - 1)), 1000); return () => clearInterval(t); }, [run]);
  const m = Math.floor(sec / 60), s = sec % 60;
  return <Row>
    <p className="text-center font-mono text-2xl font-bold">{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</p>
    <div className="flex gap-1 justify-center">
      <Btn onClick={() => setRun((r) => !r)} tone="primary">{run ? <StopCircle className="size-3" /> : <PlayCircle className="size-3" />} {run ? "Стоп" : "Старт"}</Btn>
      <Btn onClick={() => { setSec(25 * 60); setRun(false); }}><RefreshCw className="size-3" /> Сброс</Btn>
    </div>
  </Row>;
}
function TimeTracker() {
  const [start, setStart] = useState<number | null>(() => { const s = LS("tt"); return s ? +s : null; });
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((v) => v + 1), 1000); return () => clearInterval(t); }, []);
  const dur = start ? Math.floor((Date.now() - start) / 1000) : 0;
  const h = Math.floor(dur / 3600), m = Math.floor((dur % 3600) / 60), s = dur % 60;
  return <Row>
    <p className="text-center font-mono text-xl font-bold">{String(h).padStart(2,"0")}:{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}</p>
    <div className="flex gap-1 justify-center">
      {!start ? <Btn tone="primary" onClick={() => { const t = Date.now(); setStart(t); setLS("tt", String(t)); }}>Старт</Btn> :
        <Btn tone="danger" onClick={() => { setStart(null); setLS("tt", ""); }}>Стоп</Btn>}
    </div>
  </Row>;
}
function Checklist() {
  const items = ["Выбран оффер","Согласован источник","Готов креатив","Настроен UTM","Тест на 100 кликах","Замер CR","Масштаб"];
  const [d, setD] = useState<Record<string, boolean>>(() => jsonLS("chklist", {}));
  const toggle = (k: string) => { const n = { ...d, [k]: !d[k] }; setD(n); setJsonLS("chklist", n); };
  return <div className="space-y-1">{items.map((i) => (
    <label key={i} className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={!!d[i]} onChange={() => toggle(i)} />{i}</label>
  ))}</div>;
}
function IdeasList() {
  const ideas = ["Отзыв с цифрами","Скринкаст 30 сек","До/После","Мем + оффер","Кейс за 3 дня","Топ-3 ошибки","Личный опыт","AMA-пост"];
  return <div className="flex flex-wrap gap-1">{ideas.map((i) => <span key={i} className="rounded bg-secondary px-2 py-1 text-[11px]">{i}</span>)}</div>;
}
function IcsPlanner() {
  const [date, setDate] = useState(""); const [title, setTitle] = useState("Заявка на выплату");
  const gen = () => {
    if (!date) return;
    const dt = date.replace(/[-:]/g, "").split(".")[0] + "Z";
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${dt}\nSUMMARY:${title}\nEND:VEVENT\nEND:VCALENDAR`;
    download("payout.ics", ics, "text/calendar");
  };
  return <Row><Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} /><Input value={title} onChange={(e) => setTitle(e.target.value)} /><Btn onClick={gen} tone="primary"><Download className="size-3" /> Скачать .ics</Btn></Row>;
}
function NotifyMe() {
  const [m, setM] = useState("5");
  const start = async () => {
    if (Notification.permission !== "granted") await Notification.requestPermission();
    setTimeout(() => new Notification("КВАНТ", { body: "Напоминание" }), num(m) * 60000);
  };
  return <Row><Input value={m} onChange={(e) => setM(e.target.value)} placeholder="через мин." /><Btn tone="primary" onClick={start}>Напомнить</Btn></Row>;
}
function Shortcuts() {
  const list = [["G I","Инфо"],["G O","Офферы"],["G S","Стата"],["G P","Выплаты"],["/","Поиск"],["N","Уведомления"]];
  return <div className="space-y-1">{list.map(([k, v]) => <div key={k} className="flex justify-between text-[11px]"><kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono">{k}</kbd><span className="text-muted-foreground">{v}</span></div>)}</div>;
}

/* ============ 5. DATA (10) ============ */
function DataTools({ userId }: { userId: string | null }) {
  return (
    <div className="space-y-2">
      <Card title="41. Экспорт моих конверсий CSV" Icon={Download} defaultOpen><ExportTable table="conversions" userId={userId} /></Card>
      <Card title="42. Экспорт моих выплат CSV" Icon={Download}><ExportTable table="payout_requests" userId={userId} /></Card>
      <Card title="43. Экспорт моих заявок CSV" Icon={Download}><ExportTable table="link_requests" userId={userId} /></Card>
      <Card title="44. Экспорт уведомлений CSV" Icon={Download}><ExportTable table="notifications" userId={userId} /></Card>
      <Card title="45. Экспорт заметок TXT" Icon={FileText}><Btn onClick={() => download("notes.txt", LS("notes"))} tone="primary"><Download className="size-3" /> Скачать</Btn></Card>
      <Card title="46. Экспорт настроек JSON" Icon={FileText}><ExportSettings /></Card>
      <Card title="47. Импорт настроек JSON" Icon={Upload}><ImportSettings /></Card>
      <Card title="48. Очистить кэш инструментов" Icon={Trash2}><ClearCache /></Card>
      <Card title="49. Резервная копия избранного" Icon={Bookmark}><BackupBookmarks /></Card>
      <Card title="50. Профиль в буфер" Icon={ClipboardCheck}><ProfileToClipboard userId={userId} /></Card>
    </div>
  );
}
function ExportTable({ table, userId }: { table: "conversions" | "payout_requests" | "link_requests" | "notifications"; userId: string | null }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!userId) return;
    setBusy(true);
    const { data } = await supabase.from(table).select("*").eq("user_id", userId);
    download(`${table}.csv`, toCsv((data ?? []) as Record<string, unknown>[]), "text/csv");
    setBusy(false);
  };
  return <Btn tone="primary" onClick={run}>{busy ? <RefreshCw className="size-3 animate-spin" /> : <Download className="size-3" />} Скачать CSV</Btn>;
}
function ExportSettings() {
  const run = () => {
    const keys = ["notes","chklist","shortlinks","goal-d","goal-w","goal-m","progress-d","progress-w","progress-m","bookmarks","hidden-offers","theme","density"];
    const obj: Record<string, string | null> = {};
    keys.forEach((k) => { try { obj[k] = localStorage.getItem(k); } catch {} });
    download("kvant-settings.json", JSON.stringify(obj, null, 2), "application/json");
  };
  return <Btn onClick={run} tone="primary"><Download className="size-3" /> JSON</Btn>;
}
function ImportSettings() {
  const onFile = async (f: File) => {
    const txt = await f.text();
    try { const obj = JSON.parse(txt) as Record<string, string | null>; Object.entries(obj).forEach(([k, v]) => v !== null && setLS(k, v)); alert("Импортировано"); } catch { alert("Ошибка"); }
  };
  return <input type="file" accept="application/json" onChange={(e) => e.target.files && onFile(e.target.files[0])} className="text-[11px]" />;
}
function ClearCache() {
  const run = () => { if (!confirm("Очистить локальные настройки инструментов?")) return; ["notes","chklist","shortlinks","goal-d","goal-w","goal-m","progress-d","progress-w","progress-m","bookmarks","hidden-offers","tt"].forEach((k) => { try { localStorage.removeItem(k); } catch {} }); alert("Готово"); };
  return <Btn tone="danger" onClick={run}><Trash2 className="size-3" /> Очистить</Btn>;
}
function BackupBookmarks() {
  const bm = LS("bookmarks", "[]");
  return <Row><Result value={bm} /><Btn onClick={() => download("bookmarks.json", bm, "application/json")}><Download className="size-3" /></Btn></Row>;
}
function ProfileToClipboard({ userId }: { userId: string | null }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!userId) return; setBusy(true);
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    await copy(JSON.stringify(data, null, 2)); setBusy(false); alert("Скопировано");
  };
  return <Btn tone="primary" onClick={run}>{busy ? "…" : "Копировать профиль"}</Btn>;
}

/* ============ 6. PROFILE (12) ============ */
function ProfileTools({ refLink }: { refLink: string }) {
  return (
    <div className="space-y-2">
      <Card title="51. Тёмная/светлая тема" Icon={Moon} defaultOpen><Theme /></Card>
      <Card title="52. Плотность интерфейса" Icon={Filter}><Density /></Card>
      <Card title="53. Избранные офферы" Icon={Star}><Bookmarks /></Card>
      <Card title="54. Скрыть офферы" Icon={EyeOff}><HiddenOffers /></Card>
      <Card title="55. Профильные пресеты (bio)" Icon={StickyNote}><BioPreset /></Card>
      <Card title="56. Приватность (маска e-mail)" Icon={Lock}><PrivacyMask /></Card>
      <Card title="57. Экспорт «карточка партнёра»" Icon={FileText}><PartnerCard refLink={refLink} /></Card>
      <Card title="58. Позвать друга" Icon={Users}><ShareRef refLink={refLink} /></Card>
      <Card title="59. Валюта отображения" Icon={Coins}><Currency /></Card>
      <Card title="60. Часовой пояс" Icon={Globe}><Tz /></Card>
      <Card title="61. Уведомления браузера ВКЛ/ВЫКЛ" Icon={Bell}><NotifPerm /></Card>
      <Card title="62. Достижения (счётчики)" Icon={Award}><Achievements /></Card>
    </div>
  );
}
function Theme() {
  const [t, setT] = useState(LS("theme", "dark"));
  const apply = (v: string) => { setT(v); setLS("theme", v); document.documentElement.classList.toggle("dark", v === "dark"); };
  return <div className="flex gap-1"><Btn onClick={() => apply("light")}><Sun className="size-3" /> Light</Btn><Btn onClick={() => apply("dark")}><Moon className="size-3" /> Dark</Btn><span className="text-[11px] text-muted-foreground self-center">текущая: {t}</span></div>;
}
function Density() {
  const [d, setD] = useState(LS("density", "normal"));
  const apply = (v: string) => { setD(v); setLS("density", v); };
  return <div className="flex gap-1">{["compact","normal","cozy"].map((v) => <Btn key={v} onClick={() => apply(v)} tone={d === v ? "primary" : "default"}>{v}</Btn>)}</div>;
}
function Bookmarks() {
  const [bm, setBm] = useState<string[]>(() => jsonLS("bookmarks", []));
  const [id, setId] = useState("");
  return <Row><div className="flex gap-1"><Input value={id} onChange={(e) => setId(e.target.value)} placeholder="offer id" /><Btn tone="primary" onClick={() => { if (!id) return; const n = Array.from(new Set([id, ...bm])); setBm(n); setJsonLS("bookmarks", n); setId(""); }}>+</Btn></div>
    <div className="flex flex-wrap gap-1">{bm.map((x) => <span key={x} className="flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-[11px]">{x}<button onClick={() => { const n = bm.filter((v) => v !== x); setBm(n); setJsonLS("bookmarks", n); }}>×</button></span>)}</div></Row>;
}
function HiddenOffers() {
  const [hd, setHd] = useState<string[]>(() => jsonLS("hidden-offers", []));
  const [id, setId] = useState("");
  return <Row><div className="flex gap-1"><Input value={id} onChange={(e) => setId(e.target.value)} placeholder="offer id" /><Btn tone="primary" onClick={() => { if (!id) return; const n = Array.from(new Set([id, ...hd])); setHd(n); setJsonLS("hidden-offers", n); setId(""); }}>Скрыть</Btn></div>
    <div className="flex flex-wrap gap-1">{hd.map((x) => <span key={x} className="flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-[11px]">{x}<button onClick={() => { const n = hd.filter((v) => v !== x); setHd(n); setJsonLS("hidden-offers", n); }}>×</button></span>)}</div></Row>;
}
function BioPreset() {
  const [b, setB] = useState(LS("bio", ""));
  useEffect(() => { setLS("bio", b); }, [b]);
  return <Textarea rows={3} value={b} onChange={(e) => setB(e.target.value)} placeholder="Био для соцсетей…" />;
}
function PrivacyMask() {
  const [e, setE] = useState(""); const masked = e.replace(/(.).+(@)/, "$1***$2");
  return <Row><Input value={e} onChange={(x) => setE(x.target.value)} placeholder="you@mail.ru" /><Result value={masked} /></Row>;
}
function PartnerCard({ refLink }: { refLink: string }) {
  return <Btn tone="primary" onClick={() => download("partner-card.txt", `КВАНТ • Партнёрская карточка\nRef: ${refLink}\nДата: ${new Date().toLocaleString()}`)}><Download className="size-3" /> Скачать</Btn>;
}
function Currency() {
  const [c, setC] = useState(LS("cur", "RUB"));
  return <div className="flex gap-1">{["RUB","USD","EUR","KZT","BYN"].map((v) => <Btn key={v} onClick={() => { setC(v); setLS("cur", v); }} tone={c === v ? "primary" : "default"}>{v}</Btn>)}</div>;
}
function Tz() {
  const [t, setT] = useState(LS("tz", Intl.DateTimeFormat().resolvedOptions().timeZone));
  return <Row><Input value={t} onChange={(e) => setT(e.target.value)} /><Btn tone="primary" onClick={() => setLS("tz", t)}>Сохранить</Btn></Row>;
}
function NotifPerm() {
  const [p, setP] = useState(typeof Notification !== "undefined" ? Notification.permission : "default");
  return <Row><p className="text-[11px]">Статус: <b>{p}</b></p><Btn tone="primary" onClick={async () => { const r = await Notification.requestPermission(); setP(r); }}>Запросить</Btn></Row>;
}
function Achievements() {
  const list = [
    { t: "Первая ссылка", d: "Скопируй ссылку впервые" },
    { t: "10 конверсий", d: "Наберите 10 успешных" },
    { t: "5 000 ₽", d: "Первая выплата" },
    { t: "Silver", d: "Достигните уровня Silver" },
    { t: "Gold", d: "Достигните уровня Gold" },
  ];
  return <div className="space-y-1">{list.map((a) => <div key={a.t} className="flex items-center gap-2 rounded-md border border-border p-2 text-[11px]"><Award className="size-3.5 text-primary" /><span className="font-bold">{a.t}</span><span className="ml-auto text-muted-foreground">{a.d}</span></div>)}</div>;
}
