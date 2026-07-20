import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AssistantTab } from "@/components/dashboard/assistant-tab";
import { ProfileTab } from "@/components/dashboard/profile-tab";
import { SupportTab } from "@/components/dashboard/support-tab";
import { LogOut } from "lucide-react";
import {
  LayoutGrid,
  Package,
  BarChart3,
  Wallet,
  Copy,
  Check,
  Bell,
  ArrowUpRight,
  TrendingUp,
  Landmark,
  Pencil,
  X,
  CheckCircle2,
  AlertCircle,
  Coins,
  Sparkles,
  Clock,
  Search,
  Filter,
  Link2,
  XCircle,
  Download,
  Plus,
  ChevronRight,
  Crown,
  Rocket,
  Shield,
  Trophy,
  Gem,
  Zap,
  Headphones,
  Lock,
  Percent,
  Gift,
  FileText,
  ShieldCheck,
  Ban,
  Globe,
  Timer,
  Target,
  Building2,
  ClipboardList,
  Inbox,
  UserCircle,
  ThumbsUp,
  ThumbsDown,
  Eye,
  EyeOff,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

/* ================================ Types ================================ */

type Tab = "info" | "offers" | "stats" | "payouts" | "ai" | "requests" | "profile" | "support";

export type UserPrefs = {
  notify_email: boolean;
  notify_push: boolean;
  notify_marketing: boolean;
  notify_payouts: boolean;
  notify_offers: boolean;
  theme: "system" | "dark" | "light";
  language: "ru" | "en";
  compact: boolean;
  showBalance: boolean;
};

export const DEFAULT_PREFS: UserPrefs = {
  notify_email: true,
  notify_push: true,
  notify_marketing: false,
  notify_payouts: true,
  notify_offers: true,
  theme: "dark",
  language: "ru",
  compact: false,
  showBalance: true,
};

type BankDetails = {
  method: "card" | "account" | "sbp";
  holder: string;
  inn: string;
  bank: string;
  bik: string;
  account: string;
  card: string;
  sbpPhone: string;
};

const emptyBank: BankDetails = {
  method: "card",
  holder: "",
  inn: "",
  bank: "",
  bik: "",
  account: "",
  card: "",
  sbpPhone: "",
};

type CityPayout = { city: string; amount: number };
type Offer = {
  id: string;
  tag: string;
  name: string;
  category: string;
  payout: string;
  epc: number;
  cr: number;
  isNew?: boolean;
  advertiser: string;
  geo: string[];
  hold: string;
  goal: string;
  description: string;
  requirements: string[];
  allowed: string[];
  denied: string[];
  landing: string;
  image?: string;
  cityPayouts: CityPayout[];
};


type LinkRequestStatus =
  | "in_progress"
  | "completed"
  | "finished"
  | "paid"
  // legacy values kept for backward compatibility with existing rows
  | "new"
  | "review"
  | "approved"
  | "rejected";
type LinkRequest = {
  id: string;
  offerId: string;
  offerName: string;
  offerTag: string;
  createdAt: string;
  source: string;
  sub: string;
  link: string;
  status: LinkRequestStatus;
  ordersCount: number;
  note?: string;
};

/** Map legacy statuses to the new pipeline so both old and fresh rows render. */
function normalizeStatus(raw: unknown): LinkRequestStatus {
  const v = String(raw ?? "").toLowerCase();
  switch (v) {
    case "in_progress":
    case "completed":
    case "finished":
    case "paid":
      return v as LinkRequestStatus;
    case "new":
    case "review":
      return "in_progress";
    case "approved":
      return "finished";
    case "rejected":
      return "in_progress";
    default:
      return "in_progress";
  }
}

type Conversion = {
  id: string;
  time: string;
  createdAt: string; // ISO
  offerId: string;
  offerName: string;
  amount: number;
  status: "ok" | "pending" | "rejected";
};

type PayoutStatus = "pending" | "processing" | "paid" | "rejected";

type Payout = {
  id: string;
  date: string;
  time: string;
  amount: number;
  method: string;
  destination: string;
  status: PayoutStatus;
  note?: string;
};

type NotifKind = "accrual" | "payout" | "offer" | "levelup";
type Notification = {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  time: string;
  amount?: string;
  status?: PayoutStatus | "ok" | "pending" | "rejected";
  read: boolean;
};

/* =============================== Helpers =============================== */

function maskCard(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 16);
  return d.replace(/(.{4})/g, "$1 ").trim();
}
function maskDigits(v: string, len: number) {
  return v.replace(/\D/g, "").slice(0, len);
}
function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (!d) return "";
  const p = d.startsWith("8") ? "7" + d.slice(1) : d;
  const [, a, b, c, e] = p.match(/^(\d{0,1})(\d{0,3})(\d{0,3})(\d{0,4})/) || [];
  return `+${a}${b ? " " + b : ""}${c ? " " + c : ""}${e ? "-" + e : ""}`.trim();
}
function last4(s: string) {
  return s.replace(/\D/g, "").slice(-4);
}
function fmt(n: number) {
  return n.toLocaleString("ru-RU").replace(/,/g, " ");
}
function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function todayShort() {
  const d = new Date();
  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}
function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function bankLabel(b: BankDetails) {
  if (b.method === "card") return `Карта •••• ${last4(b.card)}`;
  if (b.method === "sbp") return `СБП ${b.sbpPhone}`;
  return `Счёт •••• ${last4(b.account)}`;
}
function bankMethodLabel(b: BankDetails) {
  return b.method === "card" ? "Карта" : b.method === "sbp" ? "СБП" : "Расч. счёт";
}
function bankDest(b: BankDetails) {
  if (b.method === "card") return `•••• ${last4(b.card)}`;
  if (b.method === "sbp") return b.sbpPhone;
  return `•••• ${last4(b.account)}`;
}

/* ================================ Data ================================= */
// All offers, conversions, payouts and notifications are loaded from the DB
// inside DashboardPage. No static seed lists here.

const weekLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const statsPeriods = [
  { id: "7d" as const, label: "7 дней", days: 7 },
  { id: "30d" as const, label: "30 дней", days: 30 },
  { id: "90d" as const, label: "90 дней", days: 90 },
];

/* ============================= Levels =================================== */

type LevelPerk = {
  Icon: LucideIcon;
  title: string;
  desc: string;
};

type Level = {
  id: "start" | "silver" | "gold" | "platinum" | "diamond";
  name: string;
  tagline: string;
  minEarned: number; // ₽, накопленный доход за всё время
  bonusPct: number; // прибавка к ставкам
  payoutHours: number; // скорость выплаты
  minPayout: number; // минимальная сумма заявки, ₽
  feePct: number; // комиссия платформы, %
  Icon: LucideIcon;
  color: string; // tailwind text-color class
  bg: string; // tailwind bg-color class
  ring: string; // border/ring class
  perks: LevelPerk[];
};

const LEVELS: Level[] = [
  {
    id: "start",
    name: "Старт",
    tagline: "Базовый доступ к партнёрке",
    minEarned: 0,
    bonusPct: 0,
    payoutHours: 72,
    minPayout: 1000,
    feePct: 3,
    Icon: Rocket,
    color: "text-slate-500",
    bg: "bg-slate-500/10",
    ring: "border-slate-500/30",
    perks: [
      { Icon: Package, title: "Каталог из 40+ офферов", desc: "Все базовые направления" },
      { Icon: Clock, title: "Выплаты за 3 дня", desc: "Стандартная скорость обработки" },
      { Icon: Headphones, title: "Поддержка в чате", desc: "Ответ в течение суток" },
    ],
  },
  {
    id: "silver",
    name: "Серебро",
    tagline: "Первый апгрейд ставок",
    minEarned: 50000,
    bonusPct: 2,
    payoutHours: 48,
    minPayout: 700,
    feePct: 2,
    Icon: Shield,
    color: "text-zinc-500",
    bg: "bg-zinc-400/15",
    ring: "border-zinc-400/40",
    perks: [
      { Icon: Percent, title: "+2% к каждой конверсии", desc: "Автоматически поверх ставки оффера" },
      { Icon: Clock, title: "Выплаты за 48 часов", desc: "Ускоренная обработка заявок" },
      { Icon: Sparkles, title: "Ранний доступ к офферам", desc: "За сутки до общего запуска" },
    ],
  },
  {
    id: "gold",
    name: "Золото",
    tagline: "Приватные офферы и менеджер",
    minEarned: 150000,
    bonusPct: 5,
    payoutHours: 24,
    minPayout: 500,
    feePct: 1,
    Icon: Trophy,
    color: "text-primary",
    bg: "bg-primary/10",
    ring: "border-primary/40",
    perks: [
      { Icon: Percent, title: "+5% к ставкам всех офферов", desc: "Стабильный буст EPC" },
      { Icon: Clock, title: "Выплаты за 24 часа", desc: "Заявки в приоритетной очереди" },
      { Icon: Lock, title: "Приватные офферы", desc: "Скрытый каталог с повышенными ставками" },
      { Icon: Headphones, title: "Персональный менеджер", desc: "Прямой контакт в Telegram" },
    ],
  },
  {
    id: "platinum",
    name: "Платина",
    tagline: "Эксклюзивные условия",
    minEarned: 500000,
    bonusPct: 8,
    payoutHours: 12,
    minPayout: 300,
    feePct: 0.5,
    Icon: Crown,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    ring: "border-violet-500/40",
    perks: [
      { Icon: Percent, title: "+8% к ставкам", desc: "Максимальный буст на все категории" },
      { Icon: Zap, title: "Выплаты за 12 часов", desc: "VIP-очередь обработки" },
      { Icon: Gift, title: "Эксклюзивные офферы", desc: "Индивидуальные условия от рекламодателей" },
      { Icon: TrendingUp, title: "Аналитика Pro", desc: "Расширенные отчёты и когорты" },
    ],
  },
  {
    id: "diamond",
    name: "Бриллиант",
    tagline: "Всё лучшее без ограничений",
    minEarned: 1500000,
    bonusPct: 12,
    payoutHours: 1,
    minPayout: 100,
    feePct: 0,
    Icon: Gem,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    ring: "border-cyan-500/40",
    perks: [
      { Icon: Percent, title: "+12% к ставкам", desc: "Топовый бонус в системе" },
      { Icon: Zap, title: "Мгновенные выплаты", desc: "Зачисление в течение часа, 24/7" },
      { Icon: Coins, title: "Кэшбэк 1% с оборота", desc: "Ежемесячно на баланс" },
      { Icon: Trophy, title: "Закрытые соревнования", desc: "Призовой фонд для топ-партнёров" },
      { Icon: Crown, title: "Личный аккаунт-менеджер", desc: "Персональные условия по офферам" },
    ],
  },
];

function getLevelIndex(earned: number): number {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (earned >= LEVELS[i].minEarned) idx = i;
  }
  return idx;
}

function getLevel(earned: number) {
  const idx = getLevelIndex(earned);
  const current = LEVELS[idx];
  const next = LEVELS[idx + 1] ?? null;
  const prevMin = current.minEarned;
  const nextMin = next?.minEarned ?? current.minEarned;
  const range = Math.max(1, nextMin - prevMin);
  const progress = next ? Math.min(1, (earned - prevMin) / range) : 1;
  const remaining = next ? Math.max(0, nextMin - earned) : 0;
  return { idx, current, next, progress, remaining };
}

/* ============================ Level history ============================ */

type LevelHistoryEntry = {
  levelId: Level["id"];
  /** Human-readable date shown in the UI */
  date: string;
  /** ISO for sort */
  iso: string;
  /** Earned amount at unlock moment */
  earnedAt: number;
};

/** Seed reached levels with plausible unlock dates before the demo bumps balance. */
function seedLevelHistory(earned: number): LevelHistoryEntry[] {
  const reached = getLevelIndex(earned);
  const now = Date.now();
  const daysAgo = [128, 41]; // Start, Silver — только для достигнутых
  const out: LevelHistoryEntry[] = [];
  for (let i = 0; i <= reached; i++) {
    const lv = LEVELS[i];
    const d = new Date(now - (daysAgo[i] ?? 7 * (reached - i + 1)) * 86_400_000);
    out.push({
      levelId: lv.id,
      iso: d.toISOString(),
      date: d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" }),
      earnedAt: Math.max(lv.minEarned, i === 0 ? 0 : lv.minEarned),
    });
  }
  return out;
}

/** Applies the current level's `bonusPct` to an offer's numeric fields and payout string. */
function applyLevelBoost(offer: Offer, bonusPct: number) {
  if (!bonusPct) return { ...offer, boostedPayout: offer.payout, boostedEpc: offer.epc };
  const m = 1 + bonusPct / 100;
  const boostedEpc = Math.round(offer.epc * m);
  const s = offer.payout.trim();
  let boostedPayout = offer.payout;
  const rubMatch = s.match(/^([\d\s]+)\s*₽$/);
  const pctMatch = s.match(/^([\d.,]+)\s*%$/);
  if (rubMatch) {
    const n = Math.round(Number(rubMatch[1].replace(/\s/g, "")) * m);
    boostedPayout = `${fmt(n)} ₽`;
  } else if (pctMatch) {
    const n = Number(pctMatch[1].replace(",", ".")) * m;
    boostedPayout = `${n.toFixed(1).replace(".", ",")}%`;
  }
  return { ...offer, boostedPayout, boostedEpc };
}



/* ============================ Validators =============================== */

function validateBank(b: BankDetails): Partial<Record<keyof BankDetails, string>> {
  const e: Partial<Record<keyof BankDetails, string>> = {};
  if (b.holder.trim().length < 3) e.holder = "Укажите ФИО получателя";
  if (b.method === "card") {
    const d = b.card.replace(/\D/g, "");
    if (d.length !== 16) e.card = "Номер карты — 16 цифр";
  }
  if (b.method === "sbp") {
    const d = b.sbpPhone.replace(/\D/g, "");
    if (d.length !== 11) e.sbpPhone = "Введите телефон полностью";
  }
  if (b.method === "account") {
    if (b.bank.trim().length < 2) e.bank = "Укажите банк";
    if (b.bik.length !== 9) e.bik = "БИК — 9 цифр";
    if (b.inn.length !== 10 && b.inn.length !== 12) e.inn = "ИНН — 10 или 12 цифр";
    if (b.account.length !== 20) e.account = "Счёт — 20 цифр";
  }
  return e;
}

/* =========================== Notif metadata ============================ */

function notifMeta(n: Notification) {
  if (n.kind === "accrual") return { Icon: Coins, iconBg: "bg-[color:var(--success)]/10", iconColor: "text-[color:var(--success)]" };
  if (n.kind === "offer") return { Icon: Sparkles, iconBg: "bg-primary/10", iconColor: "text-primary" };
  if (n.kind === "levelup") return { Icon: Trophy, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" };
  if (n.status === "paid") return { Icon: CheckCircle2, iconBg: "bg-[color:var(--success)]/10", iconColor: "text-[color:var(--success)]" };
  if (n.status === "rejected") return { Icon: AlertCircle, iconBg: "bg-destructive/10", iconColor: "text-destructive" };
  return { Icon: Wallet, iconBg: "bg-[color:var(--warning)]/10", iconColor: "text-[color:var(--warning)]" };
}

function payoutStatusMeta(s: PayoutStatus) {
  switch (s) {
    case "paid": return { label: "Выплачено", Icon: CheckCircle2, color: "text-[color:var(--success)]", bg: "bg-[color:var(--success)]/10" };
    case "processing": return { label: "В обработке", Icon: Clock, color: "text-primary", bg: "bg-primary/10" };
    case "pending": return { label: "Ожидает", Icon: Clock, color: "text-[color:var(--warning)]", bg: "bg-[color:var(--warning)]/10" };
    case "rejected": return { label: "Отказ", Icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" };
  }
}

/* ============================== Root shell ============================= */

const MONTHS_RU = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"] as const;
const pad2 = (n: number) => String(n).padStart(2, "0");
const timeOf = (iso: string) => { const d = new Date(iso); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const dateShortOf = (iso: string) => { const d = new Date(iso); return `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`; };
const getInitials = (name: string) => {
  const n = (name || "").trim();
  if (!n) return "?";
  return n.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "?";
};

function DashboardPage() {
  const [active, setActive] = useState<Tab>("info");

  const [userId, setUserId] = useState<string | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [requests, setRequests] = useState<LinkRequest[]>([]);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [bank, setBank] = useState<BankDetails | null>(null);
  const [linkedOffers, setLinkedOffers] = useState<Set<string>>(new Set());
  const [dataReady, setDataReady] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULT_PREFS);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    const apply = (mode: "dark" | "light") => {
      root.classList.toggle("dark", mode === "dark");
      root.style.colorScheme = mode;
    };
    if (prefs.theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mq.matches ? "dark" : "light");
      const handler = (e: MediaQueryListEvent) => apply(e.matches ? "dark" : "light");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
    apply(prefs.theme);
  }, [prefs.theme]);

  // Apply language
  useEffect(() => {
    document.documentElement.lang = prefs.language;
  }, [prefs.language]);

  // Apply compact mode
  useEffect(() => {
    document.documentElement.dataset.compact = prefs.compact ? "1" : "0";
  }, [prefs.compact]);


  // Earnings derived from real conversions and payouts.
  // Balance decreases only when a payout is actually approved (status = "paid").
  // Pending/processing payouts are "reserved" and reduce `available`, but not `balance`.
  const gross = useMemo(
    () => conversions.filter((c) => c.status === "ok").reduce((s, c) => s + c.amount, 0),
    [conversions],
  );
  const paidOut = useMemo(
    () => payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0),
    [payouts],
  );
  const reserved = useMemo(
    () => payouts.filter((p) => p.status === "pending" || p.status === "processing").reduce((s, p) => s + p.amount, 0),
    [payouts],
  );
  const balance = Math.max(0, gross - paidOut);
  const spent = paidOut + reserved;
  const available = Math.max(0, gross - spent);


  const [levelToast, setLevelToast] = useState<Level | null>(null);
  const prevLevelIdxRef = useRef<number>(-1);
  const [levelHistory, setLevelHistory] = useState<LevelHistoryEntry[]>([]);

  // Sheets
  const [bankOpen, setBankOpen] = useState(false);
  const [bankDraft, setBankDraft] = useState<BankDetails>(emptyBank);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<"all" | NotifKind>("all");
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [offerDetail, setOfferDetail] = useState<Offer | null>(null);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  /* --------------------- Load everything from the DB ------------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || cancelled) return;
      const uid = u.user.id;
      setUserId(uid);

      const [role, offersRes, profileRes, payoutsRes, reqsRes, convRes, notifRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle(),
        supabase.from("offers").select("*").eq("active", true).order("created_at", { ascending: false }),
        supabase.from("profiles").select("bank,display_name,avatar_url,email,settings,blocked,blocked_reason").eq("id", uid).maybeSingle(),
        supabase.from("payout_requests").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("link_requests").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("conversions").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("notifications").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(50),
      ]);
      if (cancelled) return;

      const isAdminRow = Boolean(role.data);
      setIsAdmin(isAdminRow);

      // Block gate: sign out and route to /blocked (admins are never blocked out)
      if (!isAdminRow && (profileRes.data as any)?.blocked === true) {
        await supabase.auth.signOut();
        navigate({ to: "/blocked", replace: true });
        return;
      }

      setOffers((offersRes.data ?? []).map((r: any): Offer => ({
        id: r.id, tag: r.tag, name: r.name,
        category: r.category ?? r.tag ?? "Другое",
        payout: r.payout, epc: r.epc, cr: Number(r.cr ?? 0),
        isNew: Boolean(r.is_new),
        advertiser: r.advertiser ?? "",
        geo: r.geo ? String(r.geo).split(/[,;\s]+/).filter(Boolean) : [],
        hold: r.hold ?? "", goal: r.goal ?? "",
        description: r.description ?? "",
        requirements: r.requirements ? String(r.requirements).split(/\n+/).filter(Boolean) : [],
        allowed: Array.isArray(r.allowed) ? r.allowed : [],
        denied: Array.isArray(r.denied) ? r.denied : [],
        landing: r.landing ?? "",
        image: r.image_url ?? undefined,
        cityPayouts: Array.isArray(r.city_payouts)
          ? (r.city_payouts as any[])
              .map((c) => ({ city: String(c?.city ?? ""), amount: Number(c?.amount ?? 0) }))
              .filter((c) => c.city && c.amount > 0)
          : [],
      })));

      const pRow = profileRes.data as { bank?: BankDetails | null; display_name?: string | null; avatar_url?: string | null; email?: string | null; settings?: Partial<UserPrefs> | null } | null;
      if (pRow?.bank) setBank(pRow.bank);
      setUserName(pRow?.display_name || pRow?.email || u.user.email || "");
      setUserAvatar(pRow?.avatar_url ?? null);
      if (pRow?.settings) setPrefs((s) => ({ ...s, ...(pRow.settings as Partial<UserPrefs>) }));

      setPayouts((payoutsRes.data ?? []).map((r: any): Payout => ({
        id: String(r.id).slice(0, 8).toUpperCase(),
        date: dateShortOf(r.created_at),
        time: timeOf(r.created_at),
        amount: Number(r.amount),
        method: r.method,
        destination: r.destination ?? "",
        status: r.status,
        note: r.note ?? undefined,
      })));

      const rows = reqsRes.data ?? [];
      setRequests(rows.map((r: any): LinkRequest => ({
        id: String(r.id).slice(0, 8).toUpperCase(),
        offerId: r.offer_id ?? "",
        offerName: r.offer_name,
        offerTag: r.offer_tag ?? "",
        createdAt: `${new Date(r.created_at).toLocaleDateString("ru-RU")}, ${timeOf(r.created_at)}`,
        source: r.source ?? "",
        sub: r.sub ?? "",
        link: r.link ?? "",
        status: normalizeStatus(r.status),
        ordersCount: Number(r.orders_count ?? 0),
        note: r.note ?? undefined,
      })));
      setLinkedOffers(new Set(rows.map((r: any) => r.offer_id).filter(Boolean) as string[]));

      setConversions((convRes.data ?? []).map((r: any): Conversion => ({
        id: String(r.id).slice(0, 8),
        time: timeOf(r.created_at),
        createdAt: r.created_at,
        offerId: r.offer_id ?? "",
        offerName: r.offer_name,
        amount: Number(r.amount),
        status: r.status as Conversion["status"],
      })));

      setNotifs((notifRes.data ?? []).map((r: any): Notification => ({
        id: r.id, kind: r.kind as NotifKind, title: r.title, body: r.body,
        time: timeOf(r.created_at),
        amount: r.amount ?? undefined,
        status: (r.status ?? undefined) as Notification["status"],
        read: r.read,
      })));

      setDataReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  /* --------------- Realtime: live sync of user-scoped data ------------- */
  useEffect(() => {
    if (!userId) return;
    const flt = `user_id=eq.${userId}`;

    const refetchRequests = async () => {
      const { data } = await supabase.from("link_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      const rows = data ?? [];
      setRequests(rows.map((r: any): LinkRequest => ({
        id: String(r.id).slice(0, 8).toUpperCase(),
        offerId: r.offer_id ?? "", offerName: r.offer_name, offerTag: r.offer_tag ?? "",
        createdAt: `${new Date(r.created_at).toLocaleDateString("ru-RU")}, ${timeOf(r.created_at)}`,
        source: r.source ?? "", sub: r.sub ?? "", link: r.link ?? "",
        status: normalizeStatus(r.status), ordersCount: Number(r.orders_count ?? 0),
        note: r.note ?? undefined,
      })));
      setLinkedOffers(new Set(rows.map((r: any) => r.offer_id).filter(Boolean) as string[]));
    };
    const refetchPayouts = async () => {
      const { data } = await supabase.from("payout_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      setPayouts((data ?? []).map((r: any): Payout => ({
        id: String(r.id).slice(0, 8).toUpperCase(),
        date: dateShortOf(r.created_at), time: timeOf(r.created_at),
        amount: Number(r.amount), method: r.method, destination: r.destination ?? "",
        status: r.status, note: r.note ?? undefined,
      })));
    };
    const refetchConversions = async () => {
      const { data } = await supabase.from("conversions").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      setConversions((data ?? []).map((r: any): Conversion => ({
        id: String(r.id).slice(0, 8), time: timeOf(r.created_at), createdAt: r.created_at,
        offerId: r.offer_id ?? "", offerName: r.offer_name,
        amount: Number(r.amount), status: r.status as Conversion["status"],
      })));
    };
    const refetchNotifs = async () => {
      const { data } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
      setNotifs((data ?? []).map((r: any): Notification => ({
        id: r.id, kind: r.kind as NotifKind, title: r.title, body: r.body,
        time: timeOf(r.created_at), amount: r.amount ?? undefined,
        status: (r.status ?? undefined) as Notification["status"], read: r.read,
      })));
    };
    const refetchOffers = async () => {
      const { data } = await supabase.from("offers").select("*").eq("active", true).order("created_at", { ascending: false });
      setOffers((data ?? []).map((r: any): Offer => ({
        id: r.id, tag: r.tag, name: r.name,
        category: r.category ?? r.tag ?? "Другое",
        payout: r.payout, epc: r.epc, cr: Number(r.cr ?? 0),
        isNew: Boolean(r.is_new), advertiser: r.advertiser ?? "",
        geo: r.geo ? String(r.geo).split(/[,;\s]+/).filter(Boolean) : [],
        hold: r.hold ?? "", goal: r.goal ?? "",
        description: r.description ?? "",
        requirements: r.requirements ? String(r.requirements).split(/\n+/).filter(Boolean) : [],
        allowed: Array.isArray(r.allowed) ? r.allowed : [],
        denied: Array.isArray(r.denied) ? r.denied : [],
        landing: r.landing ?? "", image: r.image_url ?? undefined,
        cityPayouts: Array.isArray(r.city_payouts)
          ? (r.city_payouts as any[]).map((c) => ({ city: String(c?.city ?? ""), amount: Number(c?.amount ?? 0) })).filter((c) => c.city && c.amount > 0)
          : [],
      })));
    };
    const refetchProfile = async () => {
      const { data } = await supabase.from("profiles").select("bank,display_name,avatar_url,email,settings,blocked,blocked_reason").eq("id", userId).maybeSingle();
      const p = data as any;
      if (!p) return;
      if (p.blocked === true && !isAdmin) { await supabase.auth.signOut(); navigate({ to: "/blocked", replace: true }); return; }
      if (p.bank) setBank(p.bank);
      if (p.display_name || p.email) setUserName(p.display_name || p.email);
      setUserAvatar(p.avatar_url ?? null);
      if (p.settings) setPrefs((s) => ({ ...s, ...p.settings }));
    };

    const ch = supabase
      .channel(`user:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "link_requests", filter: flt }, () => void refetchRequests())
      .on("postgres_changes", { event: "*", schema: "public", table: "payout_requests", filter: flt }, () => void refetchPayouts())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversions", filter: flt }, () => void refetchConversions())
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: flt }, () => void refetchNotifs())
      .on("postgres_changes", { event: "*", schema: "public", table: "offers" }, () => void refetchOffers())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` }, () => void refetchProfile())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Seed level history once real balance is known
  useEffect(() => {
    if (!dataReady) return;
    prevLevelIdxRef.current = getLevelIndex(balance);
    setLevelHistory(seedLevelHistory(balance));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataReady]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const unreadCount = notifs.filter((n) => !n.read).length;
  const levelInfo = useMemo(() => getLevel(balance), [balance]);

  /* --------------------------- Notif helpers -------------------------- */
  const pushNotif = async (n: Omit<Notification, "id" | "time" | "read">) => {
    if (!userId) return;
    const { data } = await supabase.from("notifications").insert({
      user_id: userId,
      kind: n.kind, title: n.title, body: n.body,
      amount: n.amount ?? null, status: n.status ?? null,
    }).select().single();
    if (data) {
      setNotifs((prev) => [{
        id: data.id, kind: data.kind as NotifKind, title: data.title, body: data.body,
        time: timeOf(data.created_at),
        amount: data.amount ?? undefined,
        status: (data.status ?? undefined) as Notification["status"],
        read: data.read,
      }, ...prev]);
    }
  };
  const markAllRead = async () => {
    if (!userId) return;
    setNotifs((ns) => ns.map((n) => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
  };
  const toggleRead = async (id: string) => {
    const target = notifs.find((n) => n.id === id);
    if (!target) return;
    const nextRead = !target.read;
    setNotifs((ns) => ns.map((n) => (n.id === id ? { ...n, read: nextRead } : n)));
    await supabase.from("notifications").update({ read: nextRead }).eq("id", id);
  };

  /* --------------------------- Level-up watcher ----------------------- */
  useEffect(() => {
    if (!dataReady) return;
    const idx = getLevelIndex(balance);
    if (prevLevelIdxRef.current >= 0 && idx > prevLevelIdxRef.current) {
      const lvl = LEVELS[idx];
      prevLevelIdxRef.current = idx;
      setLevelToast(lvl);
      const d = new Date();
      setLevelHistory((prev) => [
        ...prev,
        {
          levelId: lvl.id,
          iso: d.toISOString(),
          date: d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" }),
          earnedAt: balance,
        },
      ]);
      pushNotif({
        kind: "levelup",
        title: `Новый уровень: ${lvl.name}`,
        body: `Вы разблокировали ${lvl.perks.length} преимуществ • накоплено ${fmt(balance)} ₽`,
      });
      const t = window.setTimeout(() => setLevelToast(null), 5200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance, dataReady]);

  /* ----------------------------- Bank --------------------------------- */
  const openBank = () => {
    setBankDraft(bank ?? emptyBank);
    setBankOpen(true);
  };
  const bankErrors = validateBank(bankDraft);
  const canSaveBank = Object.keys(bankErrors).length === 0;
  const saveBank = async () => {
    if (!canSaveBank || !userId) return;
    setBank(bankDraft);
    setBankOpen(false);
    await supabase.from("profiles").update({ bank: bankDraft as any }).eq("id", userId);
  };

  /* --------------------------- Offer request -------------------------- */
  const [copiedOffer, setCopiedOffer] = useState<string | null>(null);
  const [requestingOffer, setRequestingOffer] = useState<string | null>(null);
  const copyOfferLink = async (offer: Offer, source = "Прямая ссылка") => {
    if (!userId || requestingOffer) return;
    if (!offer.landing) {
      pushNotif({
        kind: "offer",
        title: "Ссылка недоступна",
        body: `${offer.name}: администратор ещё не задал партнёрскую ссылку.`,
      });
      return;
    }
    setRequestingOffer(offer.id);
    const sub = `sub-${Math.random().toString(36).slice(2, 6)}`;
    const trackingLink = offer.landing.replace(/\{sub\}/gi, sub).replace(/\{uid\}/gi, userId.slice(0, 8));
    try {
      await navigator.clipboard.writeText(trackingLink);
    } catch {
      /* clipboard may be blocked — заявка всё равно создаётся */
    }
    const { data, error } = await supabase.from("link_requests").insert({
      user_id: userId,
      offer_id: offer.id,
      offer_name: offer.name,
      offer_tag: offer.tag,
      source, sub, link: trackingLink,
      status: "in_progress",
    }).select().single();
    setRequestingOffer(null);
    if (error || !data) {
      pushNotif({
        kind: "offer",
        title: "Не удалось создать заявку",
        body: `${offer.name}: попробуйте ещё раз`,
      });
      return;
    }
    setCopiedOffer(offer.id);
    setTimeout(() => setCopiedOffer((c) => (c === offer.id ? null : c)), 1600);
    const req: LinkRequest = {
      id: String(data.id).slice(0, 8).toUpperCase(),
      offerId: data.offer_id ?? offer.id,
      offerName: data.offer_name,
      offerTag: data.offer_tag ?? offer.tag,
      createdAt: `Сегодня, ${timeOf(data.created_at)}`,
      source: data.source ?? source,
      sub: data.sub ?? sub,
      link: data.link ?? trackingLink,
      status: normalizeStatus(data.status),
      ordersCount: Number((data as any).orders_count ?? 0),
    };
    setRequests((prev) => [req, ...prev]);
    setLinkedOffers((s) => new Set(s).add(offer.id));
    pushNotif({
      kind: "offer",
      title: "Ссылка скопирована",
      body: `${offer.name} • ${req.id} — заявка создана, админ отслеживает выполнение.`,
    });
  };



  /* --------------------------- Payout flow ---------------------------- */
  const requestPayout = async (amount: number) => {
    if (!bank || !userId || amount <= 0 || amount > available) return;
    const lvl = levelInfo.current;
    if (amount < lvl.minPayout) return;
    const fee = Math.round((amount * lvl.feePct) / 100);
    const net = amount - fee;
    const method = bankMethodLabel(bank);
    const destination = bankDest(bank);
    const note = fee > 0
      ? `Комиссия ${lvl.feePct}% (${fmt(fee)} ₽) • к зачислению ${fmt(net)} ₽ • ${lvl.name}`
      : `Без комиссии • ${lvl.name}`;
    const { data } = await supabase.from("payout_requests").insert({
      user_id: userId, amount, method, destination, status: "pending", note,
    }).select().single();
    setPayoutOpen(false);
    if (data) {
      const p: Payout = {
        id: String(data.id).slice(0, 8).toUpperCase(),
        date: dateShortOf(data.created_at),
        time: timeOf(data.created_at),
        amount: Number(data.amount),
        method: data.method,
        destination: data.destination ?? "",
        status: data.status,
        note: data.note ?? undefined,
      };
      setPayouts((prev) => [p, ...prev]);
      pushNotif({
        kind: "payout",
        title: "Заявка на вывод",
        body: `${fmt(net)} ₽ к зачислению • ${method} ${destination} • ${lvl.name}`,
        status: "pending",
      });
    }
  };

  /* ============================== Render ============================== */

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex size-6 items-center justify-center rounded-sm bg-foreground">
            <div className="size-2.5 rotate-45 bg-background" />
          </div>
          <span className="text-sm font-bold uppercase tracking-tight">КВАНТ</span>
        </div>
        <div className="flex items-center gap-3">
          {prefs.notify_push && (
            <button
              aria-label="Уведомления"
              onClick={() => setNotifOpen(true)}
              className="relative flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid min-w-[16px] place-items-center rounded-full bg-primary px-1 font-mono text-[9px] font-bold leading-none text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setLevelsOpen(true)}
            aria-label="Открыть уровни"
            className={`flex items-center gap-1.5 rounded-full border ${levelInfo.current.ring} ${levelInfo.current.bg} px-2.5 py-1 transition-transform active:scale-95`}
          >
            <levelInfo.current.Icon className={`size-3.5 ${levelInfo.current.color}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${levelInfo.current.color}`}>
              {levelInfo.current.name}
            </span>
          </button>
          {isAdmin && (
            <Link
              to="/admin"
              aria-label="Админ-панель"
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Shield className="size-4" />
            </Link>
          )}
          <button
            onClick={() => setActive("profile")}
            aria-label="Профиль"
            className={`grid size-8 place-items-center overflow-hidden rounded-full border font-mono text-[10px] font-semibold transition-all active:scale-95 ${
              active === "profile" ? "border-primary ring-2 ring-primary/40" : "border-border bg-secondary hover:border-primary/60"
            }`}
          >
            {userAvatar ? (
              <img
                src={userAvatar}
                alt=""
                className="size-full object-cover"
                onError={(e) => ((e.currentTarget.style.display = "none"))}
              />
            ) : (
              <span>{getInitials(userName)}</span>
            )}
          </button>
        </div>
      </header>

      {/* Level-up floating toast */}
      {levelToast && (
        <div className="pointer-events-none fixed inset-x-0 top-14 z-40 flex justify-center px-4">
          <button
            onClick={() => {
              setLevelToast(null);
              setLevelsOpen(true);
            }}
            className={`pointer-events-auto animate-in-up mt-2 flex w-full max-w-[420px] items-center gap-3 rounded-xl border ${levelToast.ring} ${levelToast.bg} px-3 py-2.5 text-left shadow-lg backdrop-blur active:scale-[0.99]`}
          >
            <div className={`grid size-9 shrink-0 place-items-center rounded-lg bg-background/70 ${levelToast.color}`}>
              <levelToast.Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-[10px] font-bold uppercase tracking-widest ${levelToast.color}`}>
                Новый уровень
              </p>
              <p className="truncate text-sm font-bold">{levelToast.name}</p>
              <p className="mt-0.5 truncate text-[10.5px] text-foreground/80">
                Разблокировано {levelToast.perks.length} преимуществ
              </p>
            </div>
            <ChevronRight className={`size-4 shrink-0 ${levelToast.color}`} />
          </button>
        </div>
      )}


      <main key={active} className="mx-auto max-w-[420px] space-y-6 p-4 pb-28">
        {active === "info" && (
          <InfoTab
            balance={balance}
            available={available}
            bank={bank}
            conversions={conversions}
            requests={requests}
            offers={offers}
            onOpenBank={openBank}
            onGoOffers={() => setActive("offers")}
            onGoConversions={() => setActive("stats")}
            onRequestPayout={() => (bank ? setPayoutOpen(true) : openBank())}
            onOpenLevels={() => setLevelsOpen(true)}
            showBalance={prefs.showBalance}
            onToggleBalance={() => setPrefs((s) => ({ ...s, showBalance: !s.showBalance }))}
          />
        )}
        {active === "offers" && (
          <OffersTab
            offers={offers}
            linked={linkedOffers}
            copiedOffer={copiedOffer}
            onCopyLink={copyOfferLink}
            onOpenDetail={(o) => setOfferDetail(o)}
            level={levelInfo.current}
          />
        )}
        {active === "stats" && (
          <StatsTab conversions={conversions} offers={offers} requests={requests} />
        )}
        {active === "payouts" && (
          <PayoutsTab
            payouts={payouts}
            available={available}
            bank={bank}
            onRequestPayout={() => (bank ? setPayoutOpen(true) : openBank())}
          />
        )}
        {active === "ai" && <AssistantTab />}
        {active === "support" && <SupportTab />}
        {active === "requests" && <RequestsTab requests={requests} />}
        {active === "profile" && (
          <ProfileTab
            userId={userId}
            isAdmin={isAdmin}
            onSignOut={handleSignOut}
            prefs={prefs}
            onPrefsChange={setPrefs}
            onProfileChange={(name, avatar) => { setUserName(name); setUserAvatar(avatar); }}
          />

        )}
      </main>

      {/* Bank sheet */}
      {bankOpen && (
        <BankSheet
          draft={bankDraft}
          setDraft={setBankDraft}
          errors={bankErrors}
          canSave={canSaveBank}
          onSave={saveBank}
          onClose={() => setBankOpen(false)}
        />
      )}

      {/* Payout sheet */}
      {payoutOpen && bank && (
        <PayoutSheet
          available={available}
          bank={bank}
          level={levelInfo.current}
          onClose={() => setPayoutOpen(false)}
          onSubmit={requestPayout}
        />
      )}

      {/* Notifications sheet */}
      {notifOpen && (
        <NotificationsSheet
          notifs={notifs}
          filter={notifFilter}
          setFilter={setNotifFilter}
          unreadCount={unreadCount}
          onMarkAll={markAllRead}
          onToggleRead={toggleRead}
          onClose={() => setNotifOpen(false)}
        />
      )}

      {/* Levels sheet */}
      {levelsOpen && (
        <LevelsSheet
          earned={balance}
          history={levelHistory}
          onClose={() => setLevelsOpen(false)}
        />
      )}

      {/* Offer detail sheet */}
      {offerDetail && (
        <OfferDetailSheet
          offer={offerDetail}
          linked={linkedOffers.has(offerDetail.id)}
          copiedOffer={copiedOffer}
          onCopyLink={copyOfferLink}
          level={levelInfo.current}
          onClose={() => setOfferDetail(null)}
        />
      )}





      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-border bg-background/95 px-2 backdrop-blur-md">
        {(
          [
            { id: "info", label: "Инфо", Icon: LayoutGrid },
            { id: "offers", label: "Офферы", Icon: Package },
            { id: "requests", label: "Заявки", Icon: Inbox },
            { id: "stats", label: "Стата", Icon: BarChart3 },
            { id: "payouts", label: "Выплаты", Icon: Wallet },
            { id: "ai", label: "AI", Icon: Sparkles },
            { id: "support", label: "Помощь", Icon: Headphones },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`flex flex-col items-center gap-1 ${
              active === id ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className={`size-5 ${active === id ? "" : "opacity-60"}`} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ================================ Info ================================= */

type Kpi = { label: string; value: string; delta: string; positive: boolean };

/** Weekly income series (Mon..Sun of current ISO week). */
function weekIncomeSeries(conversions: Conversion[]): { series: number[]; total: number; prevTotal: number } {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // 0 = Mon
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
  const prevMonday = new Date(monday);
  prevMonday.setDate(prevMonday.getDate() - 7);
  const nextMonday = new Date(monday);
  nextMonday.setDate(nextMonday.getDate() + 7);

  const series = [0, 0, 0, 0, 0, 0, 0];
  let total = 0;
  let prevTotal = 0;
  for (const c of conversions) {
    if (c.status !== "ok") continue;
    const d = new Date(c.createdAt);
    if (isNaN(d.getTime())) continue;
    if (d >= monday && d < nextMonday) {
      const idx = (d.getDay() + 6) % 7;
      series[idx] += c.amount;
      total += c.amount;
    } else if (d >= prevMonday && d < monday) {
      prevTotal += c.amount;
    }
  }
  return { series, total, prevTotal };
}

function sumToday(conversions: Conversion[]): { income: number; count: number } {
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
  let income = 0, count = 0;
  for (const c of conversions) {
    if (c.status !== "ok") continue;
    const dt = new Date(c.createdAt);
    if (dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d) {
      income += c.amount;
      count += 1;
    }
  }
  return { income, count };
}


function InfoTab({
  balance,
  available,
  bank,
  conversions,
  offers,
  requests,
  onOpenBank,
  onGoOffers,
  onGoConversions,
  onRequestPayout,
  onOpenLevels,
  showBalance,
  onToggleBalance,
}: {
  balance: number;
  available: number;
  bank: BankDetails | null;
  conversions: Conversion[];
  offers: Offer[];
  requests: LinkRequest[];
  onOpenBank: () => void;
  onGoOffers: () => void;
  onGoConversions: () => void;
  onRequestPayout: () => void;
  onOpenLevels: () => void;
  showBalance: boolean;
  onToggleBalance: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [activityTab, setActivityTab] = useState<"offers" | "conv">("offers");
  const level = useMemo(() => getLevel(balance), [balance]);

  const week = useMemo(() => weekIncomeSeries(conversions), [conversions]);
  const today = useMemo(() => sumToday(conversions), [conversions]);
  const totalOrders = useMemo(
    () => requests.reduce((s, r) => s + (r.ordersCount || 0), 0),
    [requests],
  );
  const paidCount = useMemo(() => requests.filter((r) => r.status === "paid").length, [requests]);
  const weekDelta = week.prevTotal > 0
    ? Math.round(((week.total - week.prevTotal) / week.prevTotal) * 100)
    : week.total > 0 ? 100 : 0;
  const kpis: Kpi[] = [
    { label: "Доход сегодня", value: `${fmt(today.income)} ₽`, delta: today.count > 0 ? `+${today.count} конв.` : "0", positive: today.income > 0 },
    { label: "Конверсии", value: fmt(today.count), delta: `Σ ${fmt(conversions.filter((c) => c.status === "ok").length)}`, positive: today.count > 0 },
    { label: "Заказы", value: fmt(totalOrders), delta: `Σ заявок ${fmt(requests.length)}`, positive: totalOrders > 0 },
    { label: "Оплачено", value: fmt(paidCount), delta: paidCount > 0 ? "заявок" : "—", positive: paidCount > 0 },
  ];
  const refLink = "kvantom.pro/p/user772/ref";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${refLink}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const topOffers = offers.slice(0, 5);

  return (
    <>
      {/* ============ HERO: баланс + вывод ============ */}
      <section className="animate-in-up">
        <div className="relative overflow-hidden rounded-2xl bg-foreground p-5 text-background shadow-lg shadow-foreground/10">
          <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-primary/20 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-60">
                Общий баланс
              </span>
              <span className={`rounded-full bg-white/10 px-2 py-0.5 font-mono text-[10px] font-medium ${weekDelta >= 0 ? "text-[color:var(--success)]" : "text-destructive"}`}>
                {weekDelta >= 0 ? "+" : ""}{weekDelta}% • 7дн
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-[40px] font-bold leading-none tracking-tighter tabular-nums">
                {fmt(balance)}
              </span>
              <span className="text-xl font-medium opacity-70">₽</span>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-white/10 p-3 backdrop-blur">
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-widest opacity-70">
                  Доступно к выводу
                </p>
                <p className="mt-0.5 font-mono text-base font-bold tabular-nums">
                  {fmt(available)} ₽
                </p>
              </div>
              <button
                onClick={onRequestPayout}
                className="shrink-0 rounded-lg bg-primary px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground transition-transform active:scale-95"
              >
                {bank ? "Вывести" : "Реквизиты"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============ Уровень: прогресс ============ */}
      <section className="animate-in-up" style={{ animationDelay: "40ms" }}>
        <button
          onClick={onOpenLevels}
          className={`group flex w-full flex-col gap-3 rounded-xl border ${level.current.ring} ${level.current.bg} p-4 text-left transition-colors hover:brightness-105`}
        >
          <div className="flex items-center gap-3">
            <div className={`grid size-10 shrink-0 place-items-center rounded-lg bg-background ${level.current.color} border ${level.current.ring}`}>
              <level.current.Icon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Ваш уровень
              </p>
              <p className={`text-sm font-bold ${level.current.color}`}>
                {level.current.name}
                {level.current.bonusPct > 0 && (
                  <span className="ml-1.5 font-mono text-[10px] opacity-80">
                    +{level.current.bonusPct}% к ставкам
                  </span>
                )}
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>

          {level.next ? (
            <>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-background/60">
                <div
                  className={`h-full rounded-full bg-gradient-to-r from-current to-current ${level.current.color}`}
                  style={{ width: `${Math.round(level.progress * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-mono text-muted-foreground">
                  {fmt(balance)} / {fmt(level.next.minEarned)} ₽
                </span>
                <span className={`flex items-center gap-1 font-bold ${level.next.color}`}>
                  <level.next.Icon className="size-3" />
                  до «{level.next.name}» {fmt(level.remaining)} ₽
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 rounded-md bg-background/60 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Crown className={`size-3 ${level.current.color}`} />
              Максимальный уровень достигнут
            </div>
          )}
        </button>
      </section>

      {/* ============ KPI ============ */}

      <section className="animate-in-up" style={{ animationDelay: "60ms" }}>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Показатели дня
        </h3>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
          {kpis.map((k) => (
            <KpiCell key={k.label} k={k} />
          ))}
        </div>
      </section>

      {/* ============ Chart ============ */}
      <section className="animate-in-up" style={{ animationDelay: "120ms" }}>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Доход за неделю
              </p>
              <p className="mt-0.5 font-mono text-sm font-bold tabular-nums">{fmt(week.total)} ₽</p>
            </div>
            <span className={`flex items-center gap-1 rounded-full px-2 py-1 font-mono text-[10px] font-medium ${weekDelta >= 0 ? "bg-[color:var(--success)]/10 text-[color:var(--success)]" : "bg-destructive/10 text-destructive"}`}>
              <TrendingUp className="size-3" /> {weekDelta >= 0 ? "+" : ""}{weekDelta}%
            </span>
          </div>
          <div className="flex h-20 items-end gap-1.5">
            {(() => {
              const max = Math.max(...week.series, 1);
              const todayIdx = (new Date().getDay() + 6) % 7;
              return week.series.map((h, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t-sm transition-colors ${i === todayIdx ? "bg-primary" : "bg-secondary"}`}
                  style={{ height: `${Math.max(6, (h / max) * 100)}%` }}
                />
              ));
            })()}
          </div>
          <div className="mt-2 flex gap-1.5">
            {weekLabels.map((l, i) => {
              const todayIdx = (new Date().getDay() + 6) % 7;
              return (
                <span
                  key={l}
                  className={`flex-1 text-center font-mono text-[9px] uppercase ${i === todayIdx ? "font-bold text-primary" : "text-muted-foreground"}`}
                >
                  {l}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ Активность: табы ============ */}
      <section className="animate-in-up" style={{ animationDelay: "180ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Активность
          </h3>
          <button
            onClick={activityTab === "offers" ? onGoOffers : onGoConversions}
            className="text-[10px] font-bold text-primary"
          >
            ВСЕ →
          </button>
        </div>

        <div className="mb-2 inline-flex rounded-lg border border-border bg-card p-0.5">
          {(
            [
              { id: "offers", label: "Топ офферы" },
              { id: "conv", label: "Конверсии" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActivityTab(t.id)}
              className={`rounded-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                activityTab === t.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activityTab === "offers" ? (
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {topOffers.map((o) => (
              <button
                key={o.id}
                onClick={onGoOffers}
                className="group flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-secondary/40"
              >
                <OfferTag tag={o.tag} />
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-xs font-bold leading-none">{o.name}</h4>
                  <p className="mt-1 text-[10px] text-muted-foreground">{o.category}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-xs font-bold">{o.payout}</p>
                  <p className="font-mono text-[9px] uppercase text-muted-foreground">
                    EPC {fmt(o.epc)} ₽
                  </p>
                </div>
                <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
              </button>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {conversions.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-bold">
                    {c.time} • {c.offerName}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">ID: {c.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-xs font-medium tabular-nums ${
                      c.status === "rejected" ? "text-muted-foreground line-through" : ""
                    }`}
                  >
                    {fmt(c.amount)} ₽
                  </span>
                  <div
                    className={`size-1.5 rounded-full ${
                      c.status === "ok"
                        ? "bg-[color:var(--success)]"
                        : c.status === "pending"
                          ? "bg-[color:var(--warning)]"
                          : "bg-destructive"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ============ Инструменты: ссылка + реквизиты ============ */}
      <section className="animate-in-up space-y-2" style={{ animationDelay: "240ms" }}>
        <h3 className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Инструменты
        </h3>

        <div className="rounded-xl bg-primary p-4 text-primary-foreground shadow-sm shadow-primary/20">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
              Партнёрская ссылка
            </p>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
              5% рефералы
            </span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 select-all truncate rounded-md bg-white/10 px-3 py-2 font-mono text-xs">
              {refLink}
            </div>
            <button
              onClick={copy}
              className="flex items-center gap-1 rounded-md bg-white px-3 py-2 text-xs font-bold text-primary transition-transform active:scale-95"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "OK" : "КОПИ"}
            </button>
          </div>
        </div>

        <button
          onClick={onOpenBank}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-foreground/20"
        >
          <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-black/5 bg-secondary text-muted-foreground">
            <Landmark className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            {bank ? (
              <>
                <p className="truncate text-xs font-bold leading-none">{bankLabel(bank)}</p>
                <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                  {bank.holder || bankMethodLabel(bank)}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-bold leading-none">Реквизиты не заданы</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Карта, счёт или СБП для вывода средств
                </p>
              </>
            )}
          </div>
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase ${
              bank
                ? "bg-[color:var(--success)]/10 text-[color:var(--success)]"
                : "bg-[color:var(--warning)]/10 text-[color:var(--warning)]"
            }`}
          >
            {bank ? <CheckCircle2 className="size-2.5" /> : <AlertCircle className="size-2.5" />}
            {bank ? "OK" : "НЕТ"}
          </span>
        </button>
      </section>
    </>
  );
}

function KpiCell({ k }: { k: Kpi }) {
  return (
    <div className="bg-card p-3">
      <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">{k.label}</p>
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-sm font-medium">{k.value}</p>
        <span
          className={`font-mono text-[10px] ${
            k.positive ? "text-[color:var(--success)]" : "text-destructive"
          }`}
        >
          {k.delta}
        </span>
      </div>
    </div>
  );
}

function OfferTag({ tag }: { tag: string }) {
  return (
    <div className="grid size-10 shrink-0 place-items-center rounded border border-black/5 bg-secondary font-mono text-[9px] font-semibold text-muted-foreground">
      {tag}
    </div>
  );
}

/* =============================== Offers ================================ */

function OffersTab({
  offers,
  linked,
  copiedOffer,
  onCopyLink,
  onOpenDetail,
  level,
}: {
  offers: Offer[];
  linked: Set<string>;
  copiedOffer: string | null;
  onCopyLink: (o: Offer, source?: string) => void;
  onOpenDetail: (o: Offer) => void;
  level: Level;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("Все");
  const [sort, setSort] = useState<"epc" | "cr" | "new">("epc");
  const categoriesAll = useMemo<string[]>(
    () => ["Все", ...Array.from(new Set(offers.map((o) => o.category).filter(Boolean)))],
    [offers],
  );


  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = offers.filter((o) => {
      if (cat !== "Все" && o.category !== cat) return false;
      if (s && !o.name.toLowerCase().includes(s) && !o.category.toLowerCase().includes(s)) return false;
      return true;
    });
    if (sort === "epc") list = [...list].sort((a, b) => b.epc - a.epc);
    if (sort === "cr") list = [...list].sort((a, b) => b.cr - a.cr);
    if (sort === "new") list = [...list].sort((a, b) => Number(!!b.isNew) - Number(!!a.isNew));
    return list;
  }, [q, cat, sort, offers]);

  return (
    <>
      <section className="animate-in-up">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Каталог офферов
          </h2>
          <span className="font-mono text-[10px] text-muted-foreground">
            {filtered.length} из {offers.length}
          </span>
        </div>
        {level.bonusPct > 0 && (
          <div className={`mb-3 flex items-center gap-2 rounded-md border ${level.ring} ${level.bg} px-3 py-2`}>
            <level.Icon className={`size-3.5 shrink-0 ${level.color}`} />
            <p className={`text-[10.5px] font-bold ${level.color}`}>
              Бонус уровня «{level.name}»: +{level.bonusPct}% ко всем ставкам применяется автоматически
            </p>
          </div>
        )}
        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по названию или категории"
            className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
          {categoriesAll.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                cat === c
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Filter className="size-3" /> Сортировка:
          </span>
          {(
            [
              { id: "epc" as const, label: "EPC" },
              { id: "cr" as const, label: "CR" },
              { id: "new" as const, label: "Новые" },
            ]
          ).map((s) => (
            <button
              key={s.id}
              onClick={() => setSort(s.id)}
              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                sort === s.id ? "bg-primary/10 text-primary" : "text-muted-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      <section className="animate-in-up space-y-2" style={{ animationDelay: "80ms" }}>
        {filtered.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            Ничего не найдено
          </div>
        )}
        {filtered.map((o) => {
          const isLinked = linked.has(o.id);
          const isCopied = copiedOffer === o.id;
          const boosted = applyLevelBoost(o, level.bonusPct);
          const hasBoost = level.bonusPct > 0 && boosted.boostedPayout !== o.payout;
          return (
            <div
              key={o.id}
              className="rounded-lg border border-border bg-card p-3 transition-colors hover:border-foreground/20"
            >
              <button
                type="button"
                onClick={() => onOpenDetail(o)}
                className="flex w-full items-start gap-3 text-left"
              >
                {o.image ? (
                  <img src={o.image} alt="" className="size-10 shrink-0 rounded-md border border-border object-cover" />
                ) : (
                  <OfferTag tag={o.tag} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate text-xs font-bold leading-none">{o.name}</h4>
                    {o.isNew && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase text-primary">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {o.category} • {o.advertiser}
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-[10.5px] leading-snug text-muted-foreground/90">
                    {o.description}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-xs font-bold">{boosted.boostedPayout}</p>
                  {hasBoost ? (
                    <p className="font-mono text-[9px] uppercase text-muted-foreground">
                      <span className="line-through opacity-70">{o.payout}</span>{" "}
                      <span className={level.color}>+{level.bonusPct}%</span>
                    </p>
                  ) : (
                    <p className="font-mono text-[9px] uppercase text-muted-foreground">за действие</p>
                  )}
                </div>
              </button>
              <div className="mt-3 flex items-end justify-between gap-2">
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="EPC" value={`${fmt(boosted.boostedEpc)} ₽`} />
                  <Stat label="CR" value={`${o.cr.toFixed(1)}%`} />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onOpenDetail(o)}
                    className="flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground active:scale-95"
                  >
                    <FileText className="size-3" />
                  </button>
                  <button
                    onClick={() => onCopyLink(o)}
                    className={`flex items-center gap-1 rounded-md px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors active:scale-95 ${
                      isCopied
                        ? "bg-[color:var(--success)]/15 text-[color:var(--success)]"
                        : "bg-foreground text-background"
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="size-3" /> Скопировано
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" /> Ссылка
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-xs font-bold tabular-nums">{value}</p>
    </div>
  );
}

/* ============================ Stats ============================ */


/* ================================ Requests ================================ */

const REQ_STATUS_META: Record<LinkRequestStatus, { label: string; tone: string; step: number }> = {
  in_progress: { label: "В работе", tone: "bg-amber-500/15 text-amber-600 border-amber-500/30", step: 1 },
  new:         { label: "В работе", tone: "bg-amber-500/15 text-amber-600 border-amber-500/30", step: 1 },
  review:      { label: "В работе", tone: "bg-amber-500/15 text-amber-600 border-amber-500/30", step: 1 },
  rejected:    { label: "В работе", tone: "bg-amber-500/15 text-amber-600 border-amber-500/30", step: 1 },
  completed:   { label: "Выполнено", tone: "bg-sky-500/15 text-sky-600 border-sky-500/30", step: 2 },
  approved:    { label: "Выполнено", tone: "bg-sky-500/15 text-sky-600 border-sky-500/30", step: 2 },
  finished:    { label: "Завершено", tone: "bg-violet-500/15 text-violet-600 border-violet-500/30", step: 3 },
  paid:        { label: "Оплачено", tone: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", step: 4 },
};

function RequestsTab({ requests }: { requests: LinkRequest[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "paid">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return requests.filter((r) => {
      const s = normalizeStatus(r.status);
      if (filter === "active" && (s === "paid" || s === "finished")) return false;
      if (filter === "paid" && s !== "paid") return false;
      if (!term) return true;
      return (
        r.offerName.toLowerCase().includes(term) ||
        r.offerTag.toLowerCase().includes(term) ||
        (r.note ?? "").toLowerCase().includes(term)
      );
    });
  }, [requests, q, filter]);

  const stats = useMemo(() => {
    const total = requests.length;
    const active = requests.filter((r) => {
      const s = normalizeStatus(r.status);
      return s !== "paid" && s !== "finished";
    }).length;
    const orders = requests.reduce((s, r) => s + (r.ordersCount || 0), 0);
    const paid = requests.filter((r) => normalizeStatus(r.status) === "paid").length;
    return { total, active, orders, paid };
  }, [requests]);

  const copy = async (r: LinkRequest) => {
    if (!r.link) return;
    try {
      await navigator.clipboard.writeText(r.link);
      setCopiedId(r.id);
      setTimeout(() => setCopiedId((c) => (c === r.id ? null : c)), 1500);
    } catch {}
  };

  if (!requests.length) {
    return (
      <div className="rounded-3xl border border-border bg-secondary/30 p-8 text-center">
        <Inbox className="mx-auto mb-3 size-10 text-muted-foreground" />
        <h3 className="text-base font-bold">Заявок пока нет</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Скопируйте ссылку любого оффера, чтобы автоматически создать заявку.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black tracking-tight">Мои заявки</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Отслеживайте статус по каждому офферу</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Всего", value: stats.total, tone: "text-foreground" },
          { label: "Активных", value: stats.active, tone: "text-amber-600" },
          { label: "Заказов", value: stats.orders, tone: "text-sky-600" },
          { label: "Оплачено", value: stats.paid, tone: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-2.5 text-center">
            <p className={`text-lg font-black leading-none ${s.tone}`}>{s.value}</p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по офферу или тегу"
          className="w-full rounded-2xl border border-border bg-secondary/40 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { id: "all" as const, label: "Все" },
          { id: "active" as const, label: "Активные" },
          { id: "paid" as const, label: "Оплачено" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              filter === f.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((r) => {
          const s = normalizeStatus(r.status);
          const meta = REQ_STATUS_META[s];
          const linkAvailable = !!r.link && s !== "finished" && s !== "paid";
          return (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{r.offerName}</p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {r.offerTag} · {new Date(r.createdAt).toLocaleDateString("ru-RU")}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.tone}`}>
                  {meta.label}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 flex-1 rounded-full ${
                      step <= meta.step ? "bg-primary" : "bg-secondary"
                    }`}
                  />
                ))}
              </div>
              <div className="mt-1.5 grid grid-cols-4 gap-1 text-center text-[9px] font-bold uppercase tracking-tighter text-muted-foreground">
                <span className={meta.step >= 1 ? "text-primary" : ""}>В работе</span>
                <span className={meta.step >= 2 ? "text-primary" : ""}>Выполнено</span>
                <span className={meta.step >= 3 ? "text-primary" : ""}>Завершено</span>
                <span className={meta.step >= 4 ? "text-primary" : ""}>Оплачено</span>
              </div>

              {r.ordersCount > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <span className="text-xs font-bold">Выполнено заказов: {r.ordersCount}</span>
                </div>
              )}

              {r.source && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  <span className="font-bold uppercase tracking-wider text-[9px]">Источник:</span> {r.source}
                </p>
              )}
              {r.note && (
                <div className="mt-2 rounded-xl border border-border bg-secondary/30 px-3 py-2 text-[11px] leading-relaxed">
                  <span className="font-bold uppercase tracking-wider text-[9px] text-muted-foreground">Комментарий: </span>
                  {r.note}
                </div>
              )}

              {linkAvailable ? (
                <button
                  onClick={() => copy(r)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs font-bold uppercase tracking-wider transition hover:border-primary hover:bg-primary/10"
                >
                  {copiedId === r.id ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  {copiedId === r.id ? "Скопировано" : "Скопировать ссылку"}
                </button>
              ) : (s === "finished" || s === "paid") ? (
                <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground">
                  <Lock className="size-3.5" />
                  Заявка завершена — ссылка недоступна
                </div>
              ) : null}
            </div>
          );
        })}
        {!filtered.length && (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            По фильтрам ничего не найдено
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================ Stats ================================ */




function StatsTab({ conversions, offers, requests }: { conversions: Conversion[]; offers: Offer[]; requests: LinkRequest[] }) {
  const [period, setPeriod] = useState<(typeof statsPeriods)[number]["id"]>("7d");
  const days = statsPeriods.find((p) => p.id === period)!.days;

  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1));
    d.setHours(0, 0, 0, 0);
    return d;
  }, [days]);

  const scoped = useMemo(
    () => conversions.filter((c) => {
      const d = new Date(c.createdAt);
      return !isNaN(d.getTime()) && d >= cutoff;
    }),
    [conversions, cutoff],
  );

  const income = scoped.filter((c) => c.status === "ok").reduce((s, c) => s + c.amount, 0);
  const convs = scoped.filter((c) => c.status === "ok").length;
  const totalOrders = useMemo(() => requests.reduce((s, r) => s + (r.ordersCount || 0), 0), [requests]);
  const epc = convs > 0 ? (income / convs).toFixed(0) : "0";

  // Bars: bucket scoped income into up to 7 evenly-spaced buckets, оканчивая сегодняшним днём.
  const bucketCount = Math.min(7, days);
  const bars = useMemo(() => {
    const arr = new Array(bucketCount).fill(0) as number[];
    const bucketSize = Math.max(1, Math.ceil(days / bucketCount));
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    for (const c of scoped) {
      if (c.status !== "ok") continue;
      const d = new Date(c.createdAt);
      const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
      const idx = bucketCount - 1 - Math.floor(diffDays / bucketSize);
      if (idx >= 0 && idx < bucketCount) arr[idx] += c.amount;
    }
    return arr;
  }, [scoped, days, bucketCount]);
  const maxBar = Math.max(...bars, 1);
  const barLabels = useMemo(() => {
    const arr: string[] = [];
    const bucketSize = Math.max(1, Math.ceil(days / bucketCount));
    for (let i = bucketCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * bucketSize);
      arr.push(bucketSize === 1 ? weekLabels[(d.getDay() + 6) % 7] : `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return arr;
  }, [days, bucketCount]);

  const byOffer = useMemo(() => {
    const m = new Map<string, { offer: Offer; conv: number; income: number }>();
    scoped.forEach((c) => {
      if (c.status === "rejected") return;
      const off: Offer = offers.find((o) => o.id === c.offerId) ?? {
        id: c.offerId,
        tag: "×",
        name: c.offerName,
        category: "—",
        payout: "",
        epc: 0,
        cr: 0,
        advertiser: "—",
        geo: [],
        hold: "—",
        goal: "—",
        description: "",
        requirements: [],
        allowed: [],
        denied: [],
        landing: "",
        cityPayouts: [],
      };
      const cur = m.get(c.offerId) ?? { offer: off, conv: 0, income: 0 };
      cur.conv += 1;
      cur.income += c.amount;
      m.set(c.offerId, cur);
    });
    return [...m.values()].sort((a, b) => b.income - a.income);
  }, [scoped, offers]);

  return (
    <>
      <section className="animate-in-up">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Аналитика
          </h2>
          <div className="flex gap-1">
            {statsPeriods.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  period === p.id ? "bg-primary/10 text-primary" : "text-muted-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
          <KpiRow label="Доход" value={`${fmt(income)} ₽`} accent />
          <KpiRow label="Конверсии" value={fmt(convs)} />
          <KpiRow label="Заказы" value={fmt(totalOrders)} />
          <KpiRow label="Средний чек" value={`${fmt(Number(epc))} ₽`} />
        </div>
      </section>

      <section className="animate-in-up" style={{ animationDelay: "60ms" }}>
        <div className="flex h-52 w-full flex-col justify-between rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Динамика дохода
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px]">
              <TrendingUp className="size-3 text-[color:var(--success)]" />
              Σ {fmt(income)} ₽
            </span>
          </div>
          <div className="flex h-28 items-end gap-1.5">
            {bars.map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-sm ${
                    h === maxBar && h > 0 ? "bg-primary" : "bg-secondary"
                  }`}
                  style={{ height: `${Math.max(4, (h / maxBar) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            {barLabels.map((l, i) => (
              <span
                key={`${l}-${i}`}
                className={`flex-1 text-center font-mono text-[9px] uppercase ${
                  bars[i] === maxBar && bars[i] > 0 ? "font-bold text-primary" : "text-muted-foreground"
                }`}
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="animate-in-up" style={{ animationDelay: "120ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            По офферам
          </h3>
          <span className="font-mono text-[10px] text-muted-foreground">{byOffer.length} активных</span>
        </div>
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {byOffer.map((row) => (
            <div key={row.offer.id} className="flex items-center gap-3 p-3">
              <OfferTag tag={row.offer.tag} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold leading-none">{row.offer.name}</p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {row.conv} конв. • EPC {fmt(row.offer.epc)} ₽
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-xs font-bold tabular-nums">{fmt(row.income)} ₽</p>
                <p className="font-mono text-[9px] uppercase text-[color:var(--success)]">
                  CR {row.offer.cr.toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="animate-in-up" style={{ animationDelay: "180ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Журнал конверсий
          </h3>
        </div>
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {conversions.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold">{c.time} • {c.offerName}</p>
                <p className="font-mono text-[10px] text-muted-foreground">ID: {c.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-xs font-medium tabular-nums ${
                    c.status === "rejected" ? "text-muted-foreground line-through" : ""
                  }`}
                >
                  {fmt(c.amount)} ₽
                </span>
                <div
                  className={`size-1.5 rounded-full ${
                    c.status === "ok"
                      ? "bg-[color:var(--success)]"
                      : c.status === "pending"
                        ? "bg-[color:var(--warning)]"
                        : "bg-destructive"
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function KpiRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-card p-3">
      <p className="text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-sm font-bold tabular-nums ${accent ? "text-primary" : ""}`}>
        {value}
      </p>
    </div>
  );
}

/* =============================== Payouts =============================== */

function PayoutsTab({
  payouts,
  available,
  bank,
  onRequestPayout,
}: {
  payouts: Payout[];
  available: number;
  bank: BankDetails | null;
  onRequestPayout: () => void;
}) {
  const [filter, setFilter] = useState<"all" | PayoutStatus>("all");
  const [q, setQ] = useState("");

  const filtered = payouts.filter((p) => {
    const byStatus = filter === "all" ? true : p.status === filter;
    const s = q.trim().toLowerCase();
    const byQ =
      !s ||
      p.id.toLowerCase().includes(s) ||
      p.method.toLowerCase().includes(s) ||
      p.destination.toLowerCase().includes(s);
    return byStatus && byQ;
  });

  const totalPaid = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const inFlight = payouts
    .filter((p) => p.status === "processing" || p.status === "pending")
    .reduce((s, p) => s + p.amount, 0);

  const groups = filtered.reduce<Record<string, Payout[]>>((acc, p) => {
    (acc[p.date] ||= []).push(p);
    return acc;
  }, {});

  const chips: { id: "all" | PayoutStatus; label: string }[] = [
    { id: "all", label: "Все" },
    { id: "processing", label: "В работе" },
    { id: "paid", label: "Выплачено" },
    { id: "rejected", label: "Отказ" },
  ];

  return (
    <>
      <section className="animate-in-up">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Выплаты
          </h2>
          <button className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground">
            <Download className="size-3" /> ВЫПИСКА
          </button>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Доступно к выводу
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums">{fmt(available)} ₽</p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              {bank ? bankLabel(bank) : "Реквизиты не заданы"}
            </p>
          </div>
          <button
            onClick={onRequestPayout}
            className="flex items-center gap-1 rounded-md bg-foreground px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-background transition-transform active:scale-95"
          >
            <Plus className="size-3" /> Заявка
          </button>
        </div>
        <div className="mt-px grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
          <KpiRow label="Выплачено всего" value={`${fmt(totalPaid)} ₽`} />
          <KpiRow label="В обработке" value={`${fmt(inFlight)} ₽`} />
        </div>
      </section>

      <section className="animate-in-up" style={{ animationDelay: "60ms" }}>
        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по ID, методу, реквизитам"
            className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <div className="mt-3 flex gap-1 overflow-x-auto">
          {chips.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                filter === f.id
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <section className="animate-in-up space-y-5" style={{ animationDelay: "120ms" }}>
        {Object.keys(groups).length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            Заявок не найдено
          </div>
        )}
        {Object.entries(groups).map(([date, list]) => (
          <div key={date}>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                {date}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                Σ {fmt(list.reduce((s, p) => s + p.amount, 0))} ₽
              </span>
            </div>
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {list.map((p) => {
                const m = payoutStatusMeta(p.status);
                return (
                  <div key={p.id} className="p-3">
                    <div className="flex items-start gap-3">
                      <div className={`grid size-9 shrink-0 place-items-center rounded-lg ${m.bg}`}>
                        <m.Icon className={`size-4 ${m.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold">
                          {p.method} • {p.destination}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                          <span>{p.id}</span>
                          <span>•</span>
                          <span>{p.time}</span>
                        </p>
                        {p.note && (
                          <p className="mt-1 font-mono text-[10px] text-destructive">{p.note}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={`font-mono text-sm font-bold tabular-nums ${
                            p.status === "rejected" ? "text-muted-foreground line-through" : ""
                          }`}
                        >
                          {fmt(p.amount)} ₽
                        </p>
                        <span
                          className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase ${m.bg} ${m.color}`}
                        >
                          {m.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

/* ============================= Bank sheet ============================== */

function BankSheet({
  draft,
  setDraft,
  errors,
  canSave,
  onSave,
  onClose,
}: {
  draft: BankDetails;
  setDraft: (b: BankDetails) => void;
  errors: Partial<Record<keyof BankDetails, string>>;
  canSave: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center">
      <div className="animate-in-up flex max-h-[92vh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-2xl border border-border bg-background sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Настройка
            </p>
            <h3 className="text-sm font-bold">Реквизиты для выплат</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Способ вывода
            </p>
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border">
              {(
                [
                  { id: "card" as const, label: "Карта" },
                  { id: "sbp" as const, label: "СБП" },
                  { id: "account" as const, label: "Счёт" },
                ]
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setDraft({ ...draft, method: m.id })}
                  className={`px-2 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                    draft.method === m.id
                      ? "bg-foreground text-background"
                      : "bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <Field
            label="Владелец"
            placeholder="Иванов Иван Иванович"
            value={draft.holder}
            onChange={(v) => setDraft({ ...draft, holder: v })}
            error={errors.holder}
          />

          {draft.method === "card" && (
            <Field
              label="Номер карты"
              placeholder="0000 0000 0000 0000"
              value={draft.card}
              onChange={(v) => setDraft({ ...draft, card: maskCard(v) })}
              error={errors.card}
              mono
              inputMode="numeric"
            />
          )}

          {draft.method === "sbp" && (
            <Field
              label="Телефон СБП"
              placeholder="+7 000 000-00-00"
              value={draft.sbpPhone}
              onChange={(v) => setDraft({ ...draft, sbpPhone: maskPhone(v) })}
              error={errors.sbpPhone}
              mono
              inputMode="tel"
            />
          )}

          {draft.method === "account" && (
            <div className="space-y-4">
              <Field
                label="Банк"
                placeholder="Т-Банк"
                value={draft.bank}
                onChange={(v) => setDraft({ ...draft, bank: v })}
                error={errors.bank}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="БИК"
                  placeholder="044525225"
                  value={draft.bik}
                  onChange={(v) => setDraft({ ...draft, bik: maskDigits(v, 9) })}
                  error={errors.bik}
                  mono
                  inputMode="numeric"
                />
                <Field
                  label="ИНН"
                  placeholder="770000000000"
                  value={draft.inn}
                  onChange={(v) => setDraft({ ...draft, inn: maskDigits(v, 12) })}
                  error={errors.inn}
                  mono
                  inputMode="numeric"
                />
              </div>
              <Field
                label="Расчётный счёт"
                placeholder="40817810000000000000"
                value={draft.account}
                onChange={(v) => setDraft({ ...draft, account: maskDigits(v, 20) })}
                error={errors.account}
                mono
                inputMode="numeric"
              />
            </div>
          )}

          <p className="rounded-md border border-border bg-secondary/50 p-3 text-[10px] leading-relaxed text-muted-foreground">
            Реквизиты используются только для выплаты вознаграждений и хранятся в зашифрованном виде.
          </p>
        </div>

        <div className="flex gap-2 border-t border-border p-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-border bg-card px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            Отмена
          </button>
          <button
            onClick={onSave}
            disabled={!canSave}
            className="flex-[2] rounded-md bg-foreground px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-background transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  mono,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  mono?: boolean;
  inputMode?: "text" | "numeric" | "tel";
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className={`w-full rounded-md border bg-card px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground/40 ${
          error ? "border-destructive/60" : "border-border"
        } ${mono ? "font-mono tabular-nums" : ""}`}
      />
      {error && (
        <span className="mt-1 block text-[10px] font-medium text-destructive">{error}</span>
      )}
    </label>
  );
}

/* ============================ Payout sheet ============================= */

function PayoutSheet({
  available,
  bank,
  level,
  onClose,
  onSubmit,
}: {
  available: number;
  bank: BankDetails;
  level: Level;
  onClose: () => void;
  onSubmit: (amount: number) => void;
}) {
  const [raw, setRaw] = useState<string>("");
  const amount = Number(raw.replace(/\D/g, "")) || 0;
  const err =
    amount <= 0
      ? "Введите сумму"
      : amount < level.minPayout
        ? `Минимум ${fmt(level.minPayout)} ₽ на уровне ${level.name}`
        : amount > available
          ? `Больше доступного (${fmt(available)} ₽)`
          : "";

  const fee = Math.round((amount * level.feePct) / 100);
  const net = Math.max(0, amount - fee);
  const eta = level.payoutHours >= 24
    ? `${Math.round(level.payoutHours / 24)} дн`
    : `${level.payoutHours} ч`;

  const quick = [Math.floor(available * 0.25), Math.floor(available * 0.5), available];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center">
      <div className="animate-in-up flex w-full max-w-[440px] flex-col overflow-hidden rounded-t-2xl border border-border bg-background sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Заявка
            </p>
            <h3 className="text-sm font-bold">Вывод средств</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-4 p-4">
          {/* Level conditions banner */}
          <div className={`flex items-center gap-3 rounded-lg border ${level.ring} ${level.bg} px-3 py-2.5`}>
            <div className={`grid size-8 shrink-0 place-items-center rounded-md bg-background/60 ${level.color}`}>
              <level.Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-[10px] font-bold uppercase tracking-widest ${level.color}`}>
                Условия уровня «{level.name}»
              </p>
              <p className="mt-0.5 truncate text-[10.5px] font-medium">
                Мин. {fmt(level.minPayout)} ₽ • комиссия {level.feePct}% • ETA {eta}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Куда
            </p>
            <div className="mt-1 flex items-center gap-2">
              <Landmark className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-bold">{bankLabel(bank)}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{bank.holder || bankMethodLabel(bank)}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-1.5 flex items-baseline justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span>Сумма</span>
              <span className="font-mono text-muted-foreground">
                доступно {fmt(available)} ₽
              </span>
            </p>
            <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-3">
              <input
                autoFocus
                inputMode="numeric"
                value={raw}
                onChange={(e) => setRaw(e.target.value.replace(/\D/g, ""))}
                placeholder="0"
                className="w-full bg-transparent font-mono text-2xl font-bold tabular-nums outline-none placeholder:text-muted-foreground/40"
              />
              <span className="font-mono text-lg text-muted-foreground">₽</span>
            </div>
            {err && <p className="mt-1 text-[10px] font-medium text-destructive">{err}</p>}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {quick.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setRaw(String(q))}
                  className="rounded-md border border-border bg-card py-2 font-mono text-[11px] font-bold tabular-nums text-muted-foreground hover:text-foreground"
                >
                  {i === 0 ? "25%" : i === 1 ? "50%" : "MAX"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 rounded-md border border-border bg-secondary/40 px-3 py-2.5">
            <SummaryRow label="Сумма заявки" value={`${fmt(amount)} ₽`} />
            <SummaryRow
              label={`Комиссия ${level.feePct}%`}
              value={fee > 0 ? `−${fmt(fee)} ₽` : "0 ₽"}
              tone={fee > 0 ? "warn" : "success"}
            />
            <SummaryRow
              label="ETA зачисления"
              value={eta}
              tone="primary"
            />
            <div className="mt-2 border-t border-border pt-2">
              <SummaryRow label="К зачислению" value={`${fmt(net)} ₽`} strong />
            </div>
          </div>
        </div>
        <div className="flex gap-2 border-t border-border p-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-border bg-card px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            Отмена
          </button>
          <button
            onClick={() => onSubmit(amount)}
            disabled={!!err}
            className="flex-[2] rounded-md bg-foreground px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-background transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Отправить заявку
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: string;
  tone?: "success" | "warn" | "primary";
  strong?: boolean;
}) {
  const cls =
    tone === "success"
      ? "text-[color:var(--success)]"
      : tone === "warn"
        ? "text-[color:var(--warning)]"
        : tone === "primary"
          ? "text-primary"
          : "text-foreground";
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className={`font-mono tabular-nums ${strong ? "text-sm font-bold" : "text-[11px] font-bold"} ${cls}`}>
        {value}
      </span>
    </div>
  );
}

/* ========================= Notifications sheet ========================= */

function NotificationsSheet({
  notifs,
  filter,
  setFilter,
  unreadCount,
  onMarkAll,
  onToggleRead,
  onClose,
}: {
  notifs: Notification[];
  filter: "all" | NotifKind;
  setFilter: (f: "all" | NotifKind) => void;
  unreadCount: number;
  onMarkAll: () => void;
  onToggleRead: (id: string) => void;
  onClose: () => void;
}) {
  const filtered = filter === "all" ? notifs : notifs.filter((n) => n.kind === filter);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? notifs.find((n) => n.id === selectedId) ?? null : null;
  const openNotif = (n: Notification) => {
    setSelectedId(n.id);
    if (!n.read) onToggleRead(n.id);
  };
  const selectedMeta = selected ? notifMeta(selected) : null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center">
      <div className="animate-in-up relative flex max-h-[92vh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-2xl border border-border bg-background sm:rounded-2xl">

        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Центр уведомлений
            </p>
            <h3 className="text-sm font-bold">
              Уведомления{" "}
              {unreadCount > 0 && (
                <span className="ml-1 font-mono text-xs text-primary">• {unreadCount} новых</span>
              )}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
          <div className="flex gap-1 overflow-x-auto">
            {(
              [
                { id: "all" as const, label: "Все" },
                { id: "accrual" as const, label: "Начисления" },
                { id: "payout" as const, label: "Выплаты" },
                { id: "offer" as const, label: "Офферы" },
                { id: "levelup" as const, label: "Уровни" },
              ]
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  filter === t.id
                    ? "bg-foreground text-background"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={onMarkAll}
            disabled={unreadCount === 0}
            className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary disabled:text-muted-foreground/50"
          >
            Прочитано
          </button>
        </div>

        <div className="flex-1 divide-y divide-border overflow-y-auto">
          {filtered.length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">Пока пусто</div>
          )}
          {filtered.map((n) => {
            const meta = notifMeta(n);
            return (
              <button
                key={n.id}
                onClick={() => openNotif(n)}
                className={`flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-accent/50 ${
                  n.read ? "opacity-70" : ""
                }`}
              >
                <div className={`grid size-9 shrink-0 place-items-center rounded-lg ${meta.iconBg}`}>
                  <meta.Icon className={`size-4 ${meta.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs font-bold">{n.title}</p>
                    {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{n.body}</p>
                  <p className="mt-1 flex items-center gap-1 font-mono text-[9px] uppercase text-muted-foreground">
                    <Clock className="size-2.5" /> {n.time}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {n.amount && (
                    <p className="font-mono text-xs font-bold text-[color:var(--success)]">{n.amount}</p>
                  )}
                  {n.status && n.kind === "payout" && (
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase ${
                        n.status === "paid"
                          ? "bg-[color:var(--success)]/10 text-[color:var(--success)]"
                          : n.status === "processing" || n.status === "pending"
                            ? "bg-[color:var(--warning)]/10 text-[color:var(--warning)]"
                            : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {n.status === "paid"
                        ? "Готово"
                        : n.status === "processing"
                          ? "В работе"
                          : n.status === "pending"
                            ? "Ожидает"
                            : "Отказ"}
                    </span>
                  )}
                </div>
                <ChevronRight className="size-3 shrink-0 self-center text-muted-foreground" />
              </button>
            );
          })}
        </div>

        {selected && selectedMeta && (
          <div className="absolute inset-0 z-10 flex flex-col bg-background animate-in fade-in">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <button
                onClick={() => setSelectedId(null)}
                className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-accent"
                aria-label="Назад"
              >
                <ChevronRight className="size-4 rotate-180" />
              </button>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Уведомление
              </p>
              <button
                onClick={onClose}
                aria-label="Закрыть"
                className="ml-auto grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex items-start gap-3">
                <div className={`grid size-12 shrink-0 place-items-center rounded-xl ${selectedMeta.iconBg}`}>
                  <selectedMeta.Icon className={`size-5 ${selectedMeta.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-bold leading-snug break-words">{selected.title}</h4>
                  <p className="mt-1 flex items-center gap-1 font-mono text-[10px] uppercase text-muted-foreground">
                    <Clock className="size-3" /> {selected.time}
                  </p>
                </div>
              </div>

              {(selected.amount || (selected.status && selected.kind === "payout")) && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {selected.amount && (
                    <span className="rounded-full bg-[color:var(--success)]/10 px-3 py-1 font-mono text-xs font-bold text-[color:var(--success)]">
                      {selected.amount}
                    </span>
                  )}
                  {selected.status && selected.kind === "payout" && (
                    <span
                      className={`rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase ${
                        selected.status === "paid"
                          ? "bg-[color:var(--success)]/10 text-[color:var(--success)]"
                          : selected.status === "processing" || selected.status === "pending"
                            ? "bg-[color:var(--warning)]/10 text-[color:var(--warning)]"
                            : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {selected.status === "paid"
                        ? "Готово"
                        : selected.status === "processing"
                          ? "В работе"
                          : selected.status === "pending"
                            ? "Ожидает"
                            : "Отказ"}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-4">
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                  {selected.body || "Без описания"}
                </p>
              </div>
            </div>
            <div className="flex gap-2 border-t border-border p-3">
              <button
                onClick={() => onToggleRead(selected.id)}
                className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-accent"
              >
                {selected.read ? "Отметить непрочитанным" : "Отметить прочитанным"}
              </button>
              <button
                onClick={() => setSelectedId(null)}
                className="flex-1 rounded-lg bg-foreground px-3 py-2 text-xs font-bold uppercase tracking-wider text-background hover:opacity-90"
              >
                Закрыть
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================= LevelsSheet ============================== */

function LevelsSheet({
  earned,
  history,
  onClose,
}: {
  earned: number;
  history: LevelHistoryEntry[];
  onClose: () => void;
}) {
  const info = getLevel(earned);
  const [tab, setTab] = useState<"all" | "history">("all");
  const historySorted = useMemo(
    () => [...history].sort((a, b) => (a.iso < b.iso ? 1 : -1)),
    [history],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="button"
      aria-label="Закрыть"
    >
      <div
        className="animate-in-up flex max-h-[78vh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-2xl border border-border bg-background sm:max-h-[85vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Программа лояльности
            </p>
            <h3 className="text-sm font-bold">Уровни партнёра</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Current */}
        <div className={`border-b border-border ${info.current.bg} px-4 py-4`}>
          <div className="flex items-center gap-3">
            <div className={`grid size-12 place-items-center rounded-xl bg-background border ${info.current.ring} ${info.current.color}`}>
              <info.current.Icon className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Текущий уровень
              </p>
              <p className={`text-base font-bold ${info.current.color}`}>
                {info.current.name}
              </p>
              <p className="text-[11px] text-muted-foreground">{info.current.tagline}</p>
            </div>
          </div>

          {info.next ? (
            <>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-background/60">
                <div
                  className={`h-full rounded-full ${info.current.color}`}
                  style={{
                    width: `${Math.round(info.progress * 100)}%`,
                    backgroundColor: "currentColor",
                  }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px]">
                <span className="font-mono text-muted-foreground">
                  {fmt(earned)} ₽ заработано
                </span>
                <span className={`flex items-center gap-1 font-bold ${info.next.color}`}>
                  <info.next.Icon className="size-3" />
                  ещё {fmt(info.remaining)} ₽ до «{info.next.name}»
                </span>
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-lg border border-border bg-background/60 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Вы на вершине программы 🎉
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border bg-secondary/30 px-3 py-2">
          {(
            [
              { id: "all", label: "Все уровни", Icon: Trophy },
              { id: "history", label: `История${history.length ? ` · ${history.length}` : ""}`, Icon: Clock },
            ] as const
          ).map((t) => {
            const activeTab = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
                  activeTab
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.Icon className="size-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "all" && (
          <div className="space-y-3">
            {LEVELS.map((lv, i) => {
              const isCurrent = i === info.idx;
              const isReached = i <= info.idx;
              const isLocked = i > info.idx;
              return (
                <div
                  key={lv.id}
                  className={`overflow-hidden rounded-xl border ${
                    isCurrent ? `${lv.ring} shadow-sm` : "border-border"
                  } ${isLocked ? "opacity-60" : ""} bg-card`}
                >
                  {/* Header row */}
                  <div className={`flex items-center gap-3 border-b border-border ${isCurrent ? lv.bg : "bg-secondary/30"} px-4 py-3`}>
                    <div className={`grid size-10 shrink-0 place-items-center rounded-lg bg-background border ${lv.ring} ${lv.color}`}>
                      <lv.Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold ${lv.color}`}>{lv.name}</p>
                        {isCurrent && (
                          <span className="rounded-full bg-foreground px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-background">
                            текущий
                          </span>
                        )}
                        {isReached && !isCurrent && (
                          <CheckCircle2 className="size-3.5 text-[color:var(--success)]" />
                        )}
                        {isLocked && <Lock className="size-3 text-muted-foreground" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{lv.tagline}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-[10px] uppercase text-muted-foreground">
                        от
                      </p>
                      <p className="font-mono text-xs font-bold tabular-nums">
                        {fmt(lv.minEarned)} ₽
                      </p>
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-2 gap-px bg-border">
                    <div className="bg-card px-4 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        Бонус к ставкам
                      </p>
                      <p className={`font-mono text-xs font-bold ${lv.bonusPct > 0 ? lv.color : ""}`}>
                        {lv.bonusPct > 0 ? `+${lv.bonusPct}%` : "—"}
                      </p>
                    </div>
                    <div className="bg-card px-4 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        Скорость выплат
                      </p>
                      <p className="font-mono text-xs font-bold">
                        {lv.payoutHours >= 24
                          ? `${Math.round(lv.payoutHours / 24)} дн`
                          : `${lv.payoutHours} ч`}
                      </p>
                    </div>
                  </div>

                  {/* Perks */}
                  <ul className="divide-y divide-border">
                    {lv.perks.map((p, pi) => (
                      <li key={pi} className="flex items-start gap-3 px-4 py-2.5">
                        <div className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded ${lv.bg} ${lv.color}`}>
                          <p.Icon className="size-3" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold leading-tight">{p.title}</p>
                          <p className="text-[10px] leading-snug text-muted-foreground">
                            {p.desc}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          )}

          {tab === "all" && (
          <p className="mt-4 rounded-lg border border-border bg-secondary/40 p-3 text-center text-[10px] leading-relaxed text-muted-foreground">
            Уровень пересчитывается автоматически по общему заработку.
            Бонусы применяются к новым конверсиям, ускоренные выплаты — к новым заявкам.
          </p>
          )}

          {tab === "history" && (
            historySorted.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-6 text-center">
                <Trophy className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Пока нет событий
                </p>
                <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                  Как только вы достигнете нового уровня — этап появится здесь с датой и списком перков.
                </p>
              </div>
            ) : (
              <ol className="relative space-y-4 pl-6 before:absolute before:left-2 before:top-1 before:bottom-1 before:w-px before:bg-border">
                {historySorted.map((h, i) => {
                  const lv = LEVELS.find((l) => l.id === h.levelId)!;
                  const isLatest = i === 0;
                  return (
                    <li key={`${h.levelId}-${h.iso}`} className="relative">
                      <span
                        className={`absolute -left-[18px] top-1 grid size-4 place-items-center rounded-full border-2 border-background ${lv.bg} ${lv.color}`}
                      >
                        <span className="size-1.5 rounded-full bg-current" />
                      </span>
                      <div className={`overflow-hidden rounded-xl border ${isLatest ? lv.ring : "border-border"} bg-card`}>
                        <div className={`flex items-center gap-3 border-b border-border ${isLatest ? lv.bg : "bg-secondary/30"} px-3 py-2`}>
                          <div className={`grid size-9 shrink-0 place-items-center rounded-lg bg-background border ${lv.ring} ${lv.color}`}>
                            <lv.Icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`text-[13px] font-bold ${lv.color}`}>{lv.name}</p>
                              {isLatest && (
                                <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-background">
                                  сейчас
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">{h.date}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-px bg-border">
                          <div className="bg-card px-3 py-1.5">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                              Порог
                            </p>
                            <p className="font-mono text-[11px] font-bold tabular-nums">
                              {fmt(lv.minEarned)} ₽
                            </p>
                          </div>
                          <div className="bg-card px-3 py-1.5">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                              На момент разблокировки
                            </p>
                            <p className="font-mono text-[11px] font-bold tabular-nums">
                              {fmt(h.earnedAt)} ₽
                            </p>
                          </div>
                        </div>
                        <ul className="divide-y divide-border">
                          {lv.perks.map((p, pi) => (
                            <li key={pi} className="flex items-start gap-2.5 px-3 py-2">
                              <div className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded ${lv.bg} ${lv.color}`}>
                                <p.Icon className="size-3" />
                              </div>
                              <p className="text-[11px] leading-tight">
                                <span className="font-bold">{p.title}</span>
                                <span className="text-muted-foreground"> — {p.desc}</span>
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )
          )}
        </div>
      </div>
    </div>
  );
}

/* ========================= OfferDetailSheet ============================ */

function OfferDetailSheet({
  offer,
  linked,
  copiedOffer,
  onCopyLink,
  onClose,
  level,
}: {
  offer: Offer;
  linked: boolean;
  copiedOffer: string | null;
  onCopyLink: (o: Offer, source?: string) => void;
  onClose: () => void;
  level: Level;
}) {
  const [source, setSource] = useState("Прямая ссылка");
  const isCopied = copiedOffer === offer.id;
  const sources = ["Прямая ссылка", "Telegram", "YouTube", "Instagram", "SEO", "Email"];
  const boosted = applyLevelBoost(offer, level.bonusPct);
  const hasBoost = level.bonusPct > 0 && boosted.boostedPayout !== offer.payout;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center">
      <div className="animate-in-up flex max-h-[92vh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-2xl border border-border bg-background sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-start gap-3">
            <OfferTag tag={offer.tag} />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {offer.category}
              </p>
              <h3 className="mt-0.5 truncate text-sm font-bold leading-tight">{offer.name}</h3>
              <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                <Building2 className="size-3" /> {offer.advertiser}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {offer.image && (
            <img src={offer.image} alt={offer.name} className="h-40 w-full rounded-xl border border-border object-cover" />
          )}
          {/* Payout hero */}
          <div className="rounded-xl border border-border bg-gradient-to-br from-secondary/60 to-transparent p-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Выплата за конверсию
              </p>
              {hasBoost && (
                <span className={`flex items-center gap-1 rounded-full border ${level.ring} ${level.bg} px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${level.color}`}>
                  <level.Icon className="size-2.5" /> +{level.bonusPct}% • {level.name}
                </span>
              )}
            </div>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums">{boosted.boostedPayout}</p>
            {hasBoost && (
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                базово: <span className="line-through">{offer.payout}</span>
              </p>
            )}
            <div className="mt-3 grid grid-cols-3 gap-3">
              <Stat label="EPC" value={`${fmt(boosted.boostedEpc)} ₽`} />
              <Stat label="CR" value={`${offer.cr.toFixed(1)}%`} />
              <Stat label="Холд" value={offer.hold} />
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-2">
            <MetaCell Icon={Target} label="Цель" value={offer.goal} />
            <MetaCell Icon={Globe} label="Гео" value={offer.geo.join(" • ")} />
            <MetaCell Icon={Timer} label="Холд" value={offer.hold} />
            <MetaCell Icon={ShieldCheck} label="Статус" value={offer.landing ? "Ссылка готова" : "Скоро"} />
          </div>

          {/* City payouts */}
          {offer.cityPayouts.length > 0 && (
            <section>
              <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <Globe className="size-3" /> Выплата по городам
              </h4>
              <div className="grid grid-cols-2 gap-1.5">
                {offer.cityPayouts.map((c, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-2.5 py-1.5">
                    <span className="truncate text-[12px] font-medium">{c.city}</span>
                    <span className="font-mono text-[12px] font-bold tabular-nums">
                      {c.amount.toLocaleString("ru-RU")} ₽
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}



          {/* Description */}
          <section>
            <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Описание
            </h4>
            <p className="text-[12px] leading-relaxed text-foreground/90">{offer.description}</p>
          </section>

          {/* Requirements */}
          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <ShieldCheck className="size-3" /> Требования
            </h4>
            <ul className="space-y-1.5">
              {offer.requirements.map((r, i) => (
                <li key={i} className="flex gap-2 text-[11.5px] leading-snug text-foreground/90">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/50" />
                  {r}
                </li>
              ))}
            </ul>
          </section>

          {/* Allowed / Denied */}
          <section className="grid grid-cols-1 gap-2">
            <div className="rounded-lg border border-[color:var(--success)]/30 bg-[color:var(--success)]/5 p-3">
              <h5 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[color:var(--success)]">
                <CheckCircle2 className="size-3" /> Разрешённый трафик
              </h5>
              <div className="flex flex-wrap gap-1">
                {offer.allowed.map((a) => (
                  <span key={a} className="rounded bg-[color:var(--success)]/10 px-2 py-0.5 text-[10px] font-medium text-[color:var(--success)]">
                    {a}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <h5 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-destructive">
                <Ban className="size-3" /> Запрещённый трафик
              </h5>
              <div className="flex flex-wrap gap-1">
                {offer.denied.map((a) => (
                  <span key={a} className="rounded bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Source picker */}
          <section>
            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Источник трафика
            </h4>
            <div className="flex flex-wrap gap-1">
              {sources.map((s) => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    source === s
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Копирование ссылки автоматически регистрирует заказ — администратор обрабатывает его в системе.
            </p>
          </section>

        </div>

        {/* Footer CTA */}
        <div className="border-t border-border bg-background px-4 py-3">
          <button
            onClick={() => onCopyLink(offer, source)}
            className={`flex w-full items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors active:scale-95 ${
              isCopied
                ? "bg-[color:var(--success)]/15 text-[color:var(--success)]"
                : "bg-foreground text-background"
            }`}
          >
            {isCopied ? (
              <>
                <Check className="size-3.5" /> Ссылка скопирована
              </>
            ) : (
              <>
                <Copy className="size-3.5" /> {linked ? "Скопировать ссылку ещё раз" : "Скопировать ссылку"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaCell({ Icon, label, value }: { Icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-2.5">
      <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        <Icon className="size-3" /> {label}
      </p>
      <p className="mt-1 truncate text-[11px] font-bold">{value}</p>
    </div>
  );
}

