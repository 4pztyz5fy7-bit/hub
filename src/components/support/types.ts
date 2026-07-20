export type SupportStatus = "open" | "pending" | "closed";
export type SupportPriority = "low" | "normal" | "high";

export type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  status: SupportStatus;
  priority: SupportPriority;
  last_message_at: string;
  unread_user: number;
  unread_admin: number;
  created_at: string;
  updated_at: string;
};

export type SupportMessage = {
  id: string;
  ticket_id: string;
  author_id: string;
  from_admin: boolean;
  text: string;
  created_at: string;
};

export const statusLabel: Record<SupportStatus, string> = {
  open: "Открыт",
  pending: "Ответ поддержки",
  closed: "Закрыт",
};

export const statusTone: Record<SupportStatus, string> = {
  open: "bg-amber-500/15 text-amber-500",
  pending: "bg-sky-500/15 text-sky-500",
  closed: "bg-muted text-muted-foreground",
};

export const priorityLabel: Record<SupportPriority, string> = {
  low: "Низкий",
  normal: "Обычный",
  high: "Высокий",
};
