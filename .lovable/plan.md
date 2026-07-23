
## Что делаем

Отдельная панель `/recruiter` для роли «рекрутёр». Админ ничего не теряет — только получает возможность выдавать рекрутёру доступ к конкретным офферам или целым категориям. Рекрутёр видит только «свои» офферы, редактирует их карточки, отслеживает заявки, конверсии и статистику по ним.

## Модель данных (одна миграция)

Расширяем существующий enum `app_role` значением `recruiter` (роль хранится в `user_roles`, как и раньше — админ остаётся отдельной ролью).

Новые таблицы:

- `recruiter_offer_access(id, recruiter_id → auth.users, offer_id → offers, created_at, created_by)` — точечный доступ к оффeру.
- `recruiter_category_access(id, recruiter_id → auth.users, category text, created_at, created_by)` — доступ ко всей категории (все текущие и будущие офферы этой категории).

Обе с уникальными индексами по паре (recruiter_id, offer_id / category), с GRANT для authenticated/service_role и RLS: читает/пишет только `is_admin()`; сам рекрутёр может только SELECT своих строк.

Хелпер `public.can_recruit_offer(_uid uuid, _offer_id uuid) returns boolean` (SECURITY DEFINER, stable) — true если:
- есть строка в `recruiter_offer_access` для этого оффера, ИЛИ
- есть строка в `recruiter_category_access` с категорией этого оффера.

RLS-надстройки над существующими таблицами (не трогая админские политики, только добавляя новые `FOR ...`):

- `offers`: SELECT/UPDATE рекрутёру — если `has_role(auth.uid(),'recruiter') AND can_recruit_offer(auth.uid(), id)`. INSERT/DELETE остаются только за админом.
- `link_requests`, `conversions`: SELECT рекрутёру — если `can_recruit_offer(auth.uid(), offer_id)`. UPDATE `link_requests.status` разрешаем через существующий RPC `admin_set_link_request_status`, добавив в него ветку `has_role(...,'recruiter') AND can_recruit_offer(...)` вместо жёсткого admin-guard (сам RPC остаётся SECURITY DEFINER, начисления идут как раньше).

## Серверные функции

Новый файл `src/lib/recruiter.functions.ts` (по образцу `team-management.functions.ts`): все хендлеры под `requireSupabaseAuth`, внутри `assertRecruiterOrAdmin`, `supabaseAdmin` подгружается через `await import(...)` — как в других серверных модулях.

- `getRecruiterScope()` — список доступных офферов и категорий текущего рекрутёра.
- `listRecruiterOffers()` — офферы с агрегатами (заявки, конверсии, выплаты, CR, EPC).
- `updateRecruiterOffer(offerId, patch)` — редактирование карточки в пределах доступа (те же поля, что доступны в `OfferEditor`, кроме `active` для чужих категорий).
- `listRecruiterRequests(filters)` / `setRecruiterRequestStatus(id, status, payoutOverride?)` — тонкая обёртка над существующим RPC.
- `getRecruiterStats(range, groupBy: 'offer' | 'category')` — суммы, конверсии, топ-партнёры внутри доступных офферов.

Админские функции в том же файле:

- `listRecruiters()` / `grantRecruiterAccess({ userId, offerIds?, categories? })` / `revokeRecruiterAccess(...)` / `setRecruiterRole(userId, enabled)`.

## UI

Новый роут `src/routes/_authenticated/recruiter.tsx` — гейт: пускает только `admin` или `recruiter` (иначе `redirect` на `/dashboard`).

Экран `src/components/recruiter/recruiter-panel.tsx` со вкладками:

1. **Мои офферы** — таблица с фильтром по категории, инлайн-редактор карточки (переиспользуем `OfferEditor`, прокидываем `mode="recruiter"` чтобы скрыть недоступные поля).
2. **Заявки** — по образцу админской вкладки, но с фильтром `offer_id IN scope`, смена статусов через RPC.
3. **Статистика** — карточки KPI + разбивка по офферам и категориям, топ-партнёры (без PII, только маскированные имена как на лендинге).
4. **Профиль/скоуп** — список выданных категорий/офферов только для чтения.

В `admin.tsx` новая вкладка **«Рекрутёры»**:
- поиск пользователя, тумблер роли `recruiter`,
- мультиселект офферов и категорий,
- список текущих выданных доступов с удалением.

В `command-palette.tsx` добавляем пункт «Панель рекрутёра», видимый если у пользователя есть роль `recruiter` или `admin`. В хедере дашборда — кнопка перехода при наличии роли.

## Границы

- Админский UI, роуты и политики не меняются кроме добавления новой вкладки и расширения RPC `admin_set_link_request_status` доп. веткой авторизации.
- Рекрутёр не видит других рекрутёров, чужие офферы, глобальные настройки, выплаты, поддержку, соревнования.
- Все начисления/бонусы/уведомления идут через существующий RPC — ничего в логике денег не меняем.

## Порядок работ

1. Миграция (enum + 2 таблицы + GRANT/RLS + хелпер + патч RPC).
2. `src/lib/recruiter.functions.ts` + регистрация в клиентах.
3. Роут `_authenticated/recruiter.tsx` + компоненты панели.
4. Вкладка «Рекрутёры» в `admin.tsx`.
5. Ссылка в хедере/палетке + проверка на мобилке и десктопе.
