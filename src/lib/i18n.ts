export type Lang = "ru" | "en";

const DICT: Record<string, { ru: string; en: string }> = {
  // bottom nav
  nav_info: { ru: "Инфо", en: "Info" },
  nav_offers: { ru: "Офферы", en: "Offers" },
  nav_requests: { ru: "Заявки", en: "Requests" },
  nav_stats: { ru: "Стата", en: "Stats" },
  nav_payouts: { ru: "Выплаты", en: "Payouts" },
  nav_ai: { ru: "AI", en: "AI" },
  nav_support: { ru: "Помощь", en: "Help" },
  // profile cards
  card_notifications: { ru: "Уведомления", en: "Notifications" },
  card_appearance: { ru: "Оформление", en: "Appearance" },
  card_security: { ru: "Безопасность", en: "Security" },
  // appearance
  theme_label: { ru: "Тема", en: "Theme" },
  theme_system: { ru: "Система", en: "System" },
  theme_dark: { ru: "Тёмная", en: "Dark" },
  theme_light: { ru: "Светлая", en: "Light" },
  language_label: { ru: "Язык", en: "Language" },
  lang_ru: { ru: "Русский", en: "Russian" },
  lang_en: { ru: "Английский", en: "English" },
  compact_label: { ru: "Компактный режим", en: "Compact mode" },
  compact_desc: { ru: "Меньше отступов в списках", en: "Tighter spacing in lists" },
  show_balance_label: { ru: "Показывать баланс", en: "Show balance" },
  show_balance_desc: { ru: "Скрыть суммы на главной", en: "Hide amounts on the home screen" },
  // notifications toggles
  notify_email_label: { ru: "E-mail уведомления", en: "Email notifications" },
  notify_email_desc: { ru: "Заявки, выплаты, важные события", en: "Requests, payouts, important events" },
  notify_push_label: { ru: "Push в приложении", en: "In-app push" },
  notify_push_desc: { ru: "Показывать колокольчик и всплывашки", en: "Bell icon and toasts" },
  notify_payouts_label: { ru: "Выплаты", en: "Payouts" },
  notify_payouts_desc: { ru: "Статусы вывода, начисления, откаты", en: "Withdrawal status and credits" },
  notify_offers_label: { ru: "Новые офферы", en: "New offers" },
  notify_offers_desc: { ru: "Уведомлять о новых и приоритетных офферах", en: "Alerts for new and priority offers" },
  notify_marketing_label: { ru: "Маркетинг и советы", en: "Marketing & tips" },
  notify_marketing_desc: { ru: "Полезные подборки и рекомендации", en: "Useful digests and recommendations" },
  // security
  change_password: { ru: "Изменить пароль", en: "Change password" },
};

export function t(lang: Lang | string | undefined, key: keyof typeof DICT | string): string {
  const entry = DICT[key as string];
  if (!entry) return String(key);
  const l: Lang = lang === "en" ? "en" : "ru";
  return entry[l];
}
