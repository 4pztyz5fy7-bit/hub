import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

/* ================================ Types ================================ */

type Tab = "info" | "offers" | "stats" | "payouts";

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

type Offer = {
  id: string;
  tag: string;
  name: string;
  category: string;
  payout: string;
  epc: number;
  cr: number;
  isNew?: boolean;
};

type Conversion = {
  id: string;
  time: string;
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

type NotifKind = "accrual" | "payout" | "offer";
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

const offersData: Offer[] = [
  { id: "gpb", tag: "BANK", name: "Газпромбанк Gold", category: "Банки", payout: "4 500 ₽", epc: 120, cr: 4.1 },
  { id: "skl", tag: "EDU", name: "Skillbox: Дизайн интерьеров", category: "Образование", payout: "15%", epc: 85, cr: 3.2 },
  { id: "tin", tag: "FIN", name: "Т-Инвестиции: брокерский счёт", category: "Инвестиции", payout: "2 800 ₽", epc: 142, cr: 5.8, isNew: true },
  { id: "lvl", tag: "TRV", name: "Level.Travel: туры в Турцию", category: "Путешествия", payout: "2,5%", epc: 58, cr: 2.1 },
  { id: "sgl", tag: "INS", name: "Согласие: ОСАГО онлайн", category: "Страхование", payout: "850 ₽", epc: 72, cr: 3.4 },
  { id: "alf", tag: "BANK", name: "Альфа-Инвестиции", category: "Инвестиции", payout: "1 200 ₽", epc: 96, cr: 4.4, isNew: true },
  { id: "spr", tag: "EDU", name: "Skypro Web-разработка", category: "Образование", payout: "3 800 ₽", epc: 110, cr: 2.9 },
  { id: "avs", tag: "TRV", name: "Aviasales Search", category: "Путешествия", payout: "1,8%", epc: 24, cr: 1.6 },
];

const categoriesAll = ["Все", "Банки", "Образование", "Инвестиции", "Путешествия", "Страхование"];

const initialConversions: Conversion[] = [
  { id: "8824102", time: "14:20", offerId: "alf", offerName: "Альфа-Инвестиции", amount: 1200, status: "ok" },
  { id: "8824095", time: "12:45", offerId: "avs", offerName: "Aviasales Search", amount: 142, status: "pending" },
  { id: "8824041", time: "11:02", offerId: "gpb", offerName: "Газпромбанк Gold", amount: 4500, status: "ok" },
  { id: "8824010", time: "09:38", offerId: "skl", offerName: "Skillbox: Дизайн", amount: 3800, status: "ok" },
  { id: "8823912", time: "Вчера", offerId: "spr", offerName: "Skypro Web-Dev", amount: 3800, status: "ok" },
  { id: "8823887", time: "Вчера", offerId: "lvl", offerName: "Level.Travel", amount: 980, status: "rejected" },
];

const initialPayouts: Payout[] = [
  { id: "PO-8218", date: "12 июл", time: "09:41", amount: 50000, method: "СБП", destination: "+7 985 •• •• 42", status: "paid" },
  { id: "PO-8177", date: "04 июл", time: "18:12", amount: 12400, method: "Карта", destination: "•••• 4417", status: "paid" },
  { id: "PO-8154", date: "28 июн", time: "11:08", amount: 8600, method: "Расч. счёт", destination: "•••• 0000", status: "rejected", note: "Неверный БИК" },
  { id: "PO-8121", date: "20 июн", time: "16:22", amount: 35200, method: "СБП", destination: "+7 985 •• •• 42", status: "paid" },
];

const initialNotifs: Notification[] = [
  { id: "n1", kind: "accrual", title: "Начисление", body: "Газпромбанк Gold • ID 8824041", time: "14:20", amount: "+4 500 ₽", read: false },
  { id: "n2", kind: "offer", title: "Новый оффер", body: "Т-Инвестиции: брокерский счёт • EPC 142 ₽", time: "12:10", read: false },
  { id: "n3", kind: "payout", title: "Выплата зачислена", body: "50 000 ₽ • СБП", time: "Вчера", status: "paid", read: true },
];

const chartBars = [40, 62, 55, 85, 45, 95, 70];
const weekLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const statsPeriods = [
  { id: "7d" as const, label: "7 дней", mult: 1 },
  { id: "30d" as const, label: "30 дней", mult: 3.8 },
  { id: "90d" as const, label: "90 дней", mult: 11.2 },
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

function DashboardPage() {
  const [active, setActive] = useState<Tab>("info");

  // Shared state
  const [available, setAvailable] = useState(128400);
  const balance = 142850;
  const [bank, setBank] = useState<BankDetails | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>(initialPayouts);
  const [notifs, setNotifs] = useState<Notification[]>(initialNotifs);
  const [linkedOffers, setLinkedOffers] = useState<Set<string>>(new Set());
  const conversions = initialConversions;

  // Sheets
  const [bankOpen, setBankOpen] = useState(false);
  const [bankDraft, setBankDraft] = useState<BankDetails>(emptyBank);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<"all" | NotifKind>("all");
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [levelsOpen, setLevelsOpen] = useState(false);

  const unreadCount = notifs.filter((n) => !n.read).length;
  const levelInfo = useMemo(() => getLevel(balance), [balance]);

  /* --------------------------- Notif helpers -------------------------- */

  const pushNotif = (n: Omit<Notification, "id" | "time" | "read">) => {
    setNotifs((prev) => [
      { id: uid("n"), time: nowTime(), read: false, ...n },
      ...prev,
    ]);
  };
  const markAllRead = () => setNotifs((ns) => ns.map((n) => ({ ...n, read: true })));
  const toggleRead = (id: string) =>
    setNotifs((ns) => ns.map((n) => (n.id === id ? { ...n, read: true } : n)));

  /* ----------------------------- Bank --------------------------------- */

  const openBank = () => {
    setBankDraft(bank ?? emptyBank);
    setBankOpen(true);
  };
  const bankErrors = validateBank(bankDraft);
  const canSaveBank = Object.keys(bankErrors).length === 0;
  const saveBank = () => {
    if (!canSaveBank) return;
    setBank(bankDraft);
    setBankOpen(false);
  };

  /* --------------------------- Offer link ----------------------------- */

  const [copiedOffer, setCopiedOffer] = useState<string | null>(null);
  const copyOfferLink = async (offer: Offer) => {
    const link = `https://kvant.io/p/user772/${offer.id}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {}
    setCopiedOffer(offer.id);
    setTimeout(() => setCopiedOffer((c) => (c === offer.id ? null : c)), 1600);
    const wasLinked = linkedOffers.has(offer.id);
    setLinkedOffers((s) => new Set(s).add(offer.id));
    pushNotif({
      kind: "offer",
      title: wasLinked ? "Ссылка скопирована" : "Оффер подключён",
      body: `${offer.name} • ${link.replace("https://", "")}`,
    });
  };

  /* --------------------------- Payout flow ---------------------------- */

  const timeouts = useRef<number[]>([]);
  useEffect(() => () => timeouts.current.forEach((t) => clearTimeout(t)), []);

  const requestPayout = (amount: number) => {
    if (!bank || amount <= 0 || amount > available) return;
    const id = `PO-${Math.floor(9000 + Math.random() * 900)}`;
    const p: Payout = {
      id,
      date: todayShort(),
      time: nowTime(),
      amount,
      method: bankMethodLabel(bank),
      destination: bankDest(bank),
      status: "pending",
    };
    setPayouts((prev) => [p, ...prev]);
    setAvailable((v) => v - amount);
    setPayoutOpen(false);
    pushNotif({
      kind: "payout",
      title: "Заявка на вывод",
      body: `${fmt(amount)} ₽ • ${p.method} ${p.destination}`,
      status: "pending",
    });

    const t1 = window.setTimeout(() => {
      setPayouts((prev) => prev.map((x) => (x.id === id ? { ...x, status: "processing" } : x)));
      pushNotif({
        kind: "payout",
        title: "Заявка в обработке",
        body: `${id} • ${fmt(amount)} ₽`,
        status: "processing",
      });
    }, 3500);

    const t2 = window.setTimeout(() => {
      setPayouts((prev) => prev.map((x) => (x.id === id ? { ...x, status: "paid" } : x)));
      pushNotif({
        kind: "payout",
        title: "Выплата зачислена",
        body: `${fmt(amount)} ₽ • ${p.method} ${p.destination}`,
        status: "paid",
      });
    }, 8000);

    timeouts.current.push(t1, t2);
  };

  /* --------------------------- Simulate ping -------------------------- */
  // One-time incoming accrual after 12s + a new offer after 22s.
  useEffect(() => {
    const t1 = window.setTimeout(() => {
      pushNotif({
        kind: "accrual",
        title: "Начисление",
        body: "Т-Инвестиции • новая конверсия",
        amount: "+2 800 ₽",
      });
    }, 12000);
    const t2 = window.setTimeout(() => {
      pushNotif({
        kind: "offer",
        title: "Новый оффер",
        body: "Ozon Fresh: доставка продуктов • 350 ₽ за заказ",
      });
    }, 22000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <div className="flex flex-col items-end leading-none">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Уровень
            </span>
            <span className="text-xs font-semibold text-primary">ЗОЛОТО</span>
          </div>
          <div className="grid size-8 place-items-center rounded-full border border-border bg-secondary font-mono text-[10px] font-semibold">
            МК
          </div>
        </div>
      </header>

      <main key={active} className="mx-auto max-w-[420px] space-y-6 p-4 pb-28">
        {active === "info" && (
          <InfoTab
            balance={balance}
            available={available}
            bank={bank}
            conversions={conversions}
            offers={offersData}
            onOpenBank={openBank}
            onGoOffers={() => setActive("offers")}
            onGoConversions={() => setActive("stats")}
            onRequestPayout={() => (bank ? setPayoutOpen(true) : openBank())}
          />
        )}
        {active === "offers" && (
          <OffersTab
            offers={offersData}
            linked={linkedOffers}
            copiedOffer={copiedOffer}
            onCopyLink={copyOfferLink}
          />
        )}
        {active === "stats" && (
          <StatsTab conversions={conversions} offers={offersData} />
        )}
        {active === "payouts" && (
          <PayoutsTab
            payouts={payouts}
            available={available}
            bank={bank}
            onRequestPayout={() => (bank ? setPayoutOpen(true) : openBank())}
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

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-border bg-background/95 px-2 backdrop-blur-md">
        {(
          [
            { id: "info", label: "Инфо", Icon: LayoutGrid },
            { id: "offers", label: "Офферы", Icon: Package },
            { id: "stats", label: "Стата", Icon: BarChart3 },
            { id: "payouts", label: "Выплаты", Icon: Wallet },
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

const kpis = [
  { label: "Доход сегодня", value: "8 240 ₽", delta: "+12%", positive: true },
  { label: "Конверсии", value: "42", delta: "+6", positive: true },
  { label: "EPC", value: "84,2 ₽", delta: "+2,1%", positive: true },
  { label: "CR", value: "3,8%", delta: "−0,2%", positive: false },
];

function InfoTab({
  balance,
  available,
  bank,
  conversions,
  offers,
  onOpenBank,
  onGoOffers,
  onGoConversions,
  onRequestPayout,
}: {
  balance: number;
  available: number;
  bank: BankDetails | null;
  conversions: Conversion[];
  offers: Offer[];
  onOpenBank: () => void;
  onGoOffers: () => void;
  onGoConversions: () => void;
  onRequestPayout: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [activityTab, setActivityTab] = useState<"offers" | "conv">("offers");
  const refLink = "kvant.io/p/user772/ref";
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
              <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[10px] font-medium text-[color:var(--success)]">
                +12,4% • 7дн
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
              <p className="mt-0.5 font-mono text-sm font-bold tabular-nums">54 200 ₽</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-[color:var(--success)]/10 px-2 py-1 font-mono text-[10px] font-medium text-[color:var(--success)]">
              <TrendingUp className="size-3" /> +18%
            </span>
          </div>
          <div className="flex h-20 items-end gap-1.5">
            {chartBars.map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t-sm transition-colors ${
                  i === 5 ? "bg-primary" : "bg-secondary"
                }`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            {weekLabels.map((l, i) => (
              <span
                key={l}
                className={`flex-1 text-center font-mono text-[9px] uppercase ${
                  i === 5 ? "font-bold text-primary" : "text-muted-foreground"
                }`}
              >
                {l}
              </span>
            ))}
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

function KpiCell({ k }: { k: (typeof kpis)[number] }) {
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
}: {
  offers: Offer[];
  linked: Set<string>;
  copiedOffer: string | null;
  onCopyLink: (o: Offer) => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("Все");
  const [sort, setSort] = useState<"epc" | "cr" | "new">("epc");

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
          return (
            <div
              key={o.id}
              className="rounded-lg border border-border bg-card p-3 transition-colors hover:border-foreground/20"
            >
              <div className="flex items-start gap-3">
                <OfferTag tag={o.tag} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate text-xs font-bold leading-none">{o.name}</h4>
                    {o.isNew && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase text-primary">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">{o.category}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-xs font-bold">{o.payout}</p>
                  <p className="font-mono text-[9px] uppercase text-muted-foreground">за действие</p>
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between gap-2">
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="EPC" value={`${fmt(o.epc)} ₽`} />
                  <Stat label="CR" value={`${o.cr.toFixed(1)}%`} />
                </div>
                <button
                  onClick={() => onCopyLink(o)}
                  className={`flex items-center gap-1 rounded-md px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors active:scale-95 ${
                    isCopied
                      ? "bg-[color:var(--success)]/15 text-[color:var(--success)]"
                      : isLinked
                        ? "border border-border bg-card text-foreground hover:bg-accent"
                        : "bg-foreground text-background"
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="size-3" /> Скопировано
                    </>
                  ) : (
                    <>
                      <Link2 className="size-3" /> {isLinked ? "Ссылка" : "Получить"}
                    </>
                  )}
                </button>
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

/* ================================ Stats ================================ */

function StatsTab({ conversions, offers }: { conversions: Conversion[]; offers: Offer[] }) {
  const [period, setPeriod] = useState<(typeof statsPeriods)[number]["id"]>("7d");
  const mult = statsPeriods.find((p) => p.id === period)!.mult;

  const baseIncome = 54200;
  const baseClicks = 1284;
  const baseConversions = conversions.length;
  const baseEpc = 84.2;

  const income = Math.round(baseIncome * mult);
  const clicks = Math.round(baseClicks * mult);
  const convs = Math.round(baseConversions * mult);
  const epc = (baseEpc * (0.9 + Math.random() * 0.2)).toFixed(1);

  const bars = chartBars.map((h) => Math.round(h * (0.8 + Math.random() * 0.4)));
  const maxBar = Math.max(...bars);

  const byOffer = useMemo(() => {
    const m = new Map<string, { offer: Offer; conv: number; income: number }>();
    conversions.forEach((c) => {
      if (c.status === "rejected") return;
      const off = offers.find((o) => o.id === c.offerId) ?? {
        id: c.offerId,
        tag: "×",
        name: c.offerName,
        category: "—",
        payout: "",
        epc: 0,
        cr: 0,
      };
      const cur = m.get(c.offerId) ?? { offer: off, conv: 0, income: 0 };
      cur.conv += 1;
      cur.income += c.amount;
      m.set(c.offerId, cur);
    });
    return [...m.values()]
      .map((x) => ({ ...x, conv: Math.round(x.conv * mult), income: Math.round(x.income * mult) }))
      .sort((a, b) => b.income - a.income);
  }, [conversions, offers, mult]);

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
          <KpiRow label="Клики" value={fmt(clicks)} />
          <KpiRow label="EPC" value={`${epc} ₽`} />
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
                    h === maxBar ? "bg-primary" : "bg-secondary"
                  }`}
                  style={{ height: `${(h / maxBar) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            {weekLabels.map((l, i) => (
              <span
                key={l}
                className={`flex-1 text-center font-mono text-[9px] uppercase ${
                  bars[i] === maxBar ? "font-bold text-primary" : "text-muted-foreground"
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
  onClose,
  onSubmit,
}: {
  available: number;
  bank: BankDetails;
  onClose: () => void;
  onSubmit: (amount: number) => void;
}) {
  const [raw, setRaw] = useState<string>("");
  const amount = Number(raw.replace(/\D/g, "")) || 0;
  const err =
    amount <= 0
      ? "Введите сумму"
      : amount < 500
        ? "Минимум 500 ₽"
        : amount > available
          ? `Больше доступного (${fmt(available)} ₽)`
          : "";

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

          <div className="flex items-center justify-between rounded-md border border-border bg-secondary/40 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Комиссия
            </span>
            <span className="font-mono text-[11px] font-bold text-[color:var(--success)]">0 ₽</span>
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
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center">
      <div className="animate-in-up flex max-h-[92vh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-2xl border border-border bg-background sm:rounded-2xl">
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
                onClick={() => onToggleRead(n.id)}
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
      </div>
    </div>
  );
}
