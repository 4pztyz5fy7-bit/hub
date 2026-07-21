// Переводит сообщения ошибок Supabase / нативных Error в понятный русский текст.

const MAP: Array<[RegExp, string]> = [
  // Auth
  [/invalid login credentials/i, "Неверный email или пароль"],
  [/email not confirmed/i, "Email не подтверждён. Проверьте почту"],
  [/email link is invalid or has expired/i, "Ссылка недействительна или устарела"],
  [/user already registered|already registered|user with this email/i, "Пользователь с таким email уже зарегистрирован"],
  [/password should be at least/i, "Пароль слишком короткий (минимум 6 символов)"],
  [/password is too weak|weak password/i, "Слишком слабый пароль"],
  [/new password should be different/i, "Новый пароль должен отличаться от старого"],
  [/invalid email/i, "Некорректный email"],
  [/rate limit|too many requests|over_email_send_rate_limit/i, "Слишком много запросов. Подождите минуту и попробуйте снова"],
  [/signups? (are )?disabled|signup is disabled/i, "Регистрация временно отключена"],
  [/user not found/i, "Пользователь не найден"],
  [/unauthorized|not authenticated|jwt/i, "Требуется вход в аккаунт"],
  [/forbidden|permission denied|not allowed/i, "Недостаточно прав для выполнения действия"],
  [/token has expired|session.*expired/i, "Сессия истекла. Войдите снова"],

  // Network / generic
  [/failed to fetch|network ?error|networkerror/i, "Нет соединения с сервером. Проверьте интернет"],
  [/timeout|timed out/i, "Превышено время ожидания. Попробуйте ещё раз"],
  [/aborted/i, "Запрос отменён"],
  [/not found/i, "Не найдено"],
  [/duplicate key|already exists|unique constraint/i, "Такая запись уже существует"],
  [/violates.*row-level security|row-level security/i, "Действие запрещено правилами доступа"],
  [/violates.*foreign key/i, "Нельзя выполнить: есть связанные данные"],
  [/violates.*not-null|null value in column/i, "Заполните все обязательные поля"],
  [/value too long/i, "Значение слишком длинное"],
  [/invalid input syntax/i, "Некорректный формат данных"],

  // Server function 4xx/5xx
  [/^400\b|bad request/i, "Некорректный запрос"],
  [/^401\b/i, "Требуется вход в аккаунт"],
  [/^403\b/i, "Недостаточно прав"],
  [/^404\b/i, "Не найдено"],
  [/^409\b|conflict/i, "Конфликт данных"],
  [/^429\b/i, "Слишком много запросов. Подождите и попробуйте снова"],
  [/^5\d\d\b|internal server error|server error/i, "Ошибка сервера. Попробуйте позже"],
];

export function translateError(input: unknown, fallback = "Что-то пошло не так. Попробуйте ещё раз"): string {
  const raw =
    input == null
      ? ""
      : typeof input === "string"
        ? input
        : input instanceof Error
          ? input.message
          : typeof (input as any)?.message === "string"
            ? (input as any).message
            : "";
  if (!raw) return fallback;
  for (const [re, ru] of MAP) if (re.test(raw)) return ru;
  // Если текст выглядит как английская фраза — возвращаем fallback,
  // иначе показываем исходный (уже локализованный) текст.
  return /[а-яё]/i.test(raw) ? raw : fallback;
}
