# КВАНТ — деплой на свой хостинг (reg.ru) + своя Supabase + свой SMTP

Пошаговая инструкция «куда нажать». Всё, что в блоках `code` — копировать 1-в-1, заменяя только выделенные значения (`ВАШ_...`).

---

## 0. Что понадобится

- Домен `kvantm.tech` (уже есть, DNS reg.ru).
- Проект Supabase: `https://eazrhjenaxpzuxfyoeoy.supabase.co` (уже создан).
- Хостинг reg.ru **с поддержкой Node.js** (тариф «Host-VDS» или «Виртуальный сервер»/VPS). Обычный shared-хостинг с PHP **не подойдёт** — нужен Node ≥ 20 и открытые порты.
- Git-репозиторий (GitHub/GitLab) — рекомендуется, но можно и через SFTP.

---

## 1. Подготовка Supabase (ваш проект)

### 1.1 Применить миграции (схема БД)

1. Откройте свою Supabase → **SQL Editor** → **New query**.
2. В проекте Lovable откройте папку `supabase/migrations/` — там файлы вида `20250101_xxx.sql`.
3. **По одному, в порядке дат**, скопируйте содержимое каждого файла в SQL Editor и нажмите **Run**.
   - Если какой-то файл упадёт с ошибкой `already exists` — пропустите его.
4. Проверьте: **Table Editor** — должны появиться таблицы `profiles`, `user_roles`, `offers`, `link_requests`, `conversions`, `payout_requests`, `notifications`, `support_tickets`, `support_messages`, `banners`, `news_posts`, `competitions`, `email_settings` и др.

### 1.2 Включить Realtime

1. **Database** → **Replication** → **supabase_realtime**.
2. Включите тумблер напротив таблиц: `notifications`, `link_requests`, `payout_requests`, `support_tickets`, `support_messages`, `banners`, `news_posts`, `competitions`, `profiles`, `conversions`.

### 1.3 Настройки Auth (регистрация/логин)

1. **Authentication** → **Providers** → **Email**:
   - `Enable Email provider` = **ON**.
   - `Confirm email` = **ON** (если хотите подтверждение) или OFF (мгновенный вход).
2. **Authentication** → **URL Configuration**:
   - `Site URL` = `https://kvantm.tech`
   - `Redirect URLs`: добавьте `https://kvantm.tech/**` и `http://localhost:8080/**` (для локальной разработки).

### 1.4 Google OAuth (опционально)

1. Google Cloud Console → **APIs & Services** → **Credentials** → **Create OAuth client ID** → **Web application**.
2. `Authorized redirect URIs`: скопируйте из Supabase (**Authentication → Providers → Google** — там строка `https://eazrhjenaxpzuxfyoeoy.supabase.co/auth/v1/callback`).
3. Полученные `Client ID` и `Client Secret` вставьте в Supabase → **Authentication → Providers → Google** → **Enable** → **Save**.

### 1.5 SMTP для писем Auth (сброс пароля, подтверждение)

1. **Project Settings** → **Auth** → прокрутите до **SMTP Settings** → **Enable Custom SMTP**.
2. Заполните (пример для Yandex 360 / reg.ru mail):
   ```
   Sender email:  noreply@kvantm.tech
   Sender name:   КВАНТ
   Host:          smtp.yandex.ru        (или smtp.reg.ru)
   Port number:   465
   Username:      noreply@kvantm.tech
   Password:      <пароль почтового ящика>
   Minimum interval: 60
   ```
3. **Save** → нажмите **Send test email**.

### 1.6 Забрать ключи

**Project Settings** → **API**:
- `Project URL` → `https://eazrhjenaxpzuxfyoeoy.supabase.co`
- `anon public` → длинная строка `eyJ...` (это `SUPABASE_PUBLISHABLE_KEY`)
- `service_role` → **секретная** строка `eyJ...` (это `SUPABASE_SERVICE_ROLE_KEY`)

Сохраните эти три значения — пригодятся на шаге 3.

---

## 2. Экспорт проекта из Lovable

### Вариант A: через GitHub (рекомендуется)

1. В Lovable вверху справа → **GitHub** → **Connect to GitHub** → авторизуйте → **Create Repository**.
2. Готово: код теперь в вашем репозитории `github.com/<ваш-логин>/kvantom`.

### Вариант B: скачать ZIP

1. Lovable → верхнее меню (три точки/шестерёнка) → **Export project** → ZIP.
2. Распакуйте локально.

---

## 3. Настройка проекта локально (проверка перед деплоем)

На вашем ПК:

```bash
git clone https://github.com/<ваш-логин>/kvantom.git
cd kvantom
```

Создайте файл `.env` в корне (перезапишите тот, что был):

```env
SUPABASE_URL=https://eazrhjenaxpzuxfyoeoy.supabase.co
SUPABASE_PUBLISHABLE_KEY=<ваш anon public ключ>
SUPABASE_SERVICE_ROLE_KEY=<ваш service_role ключ>
SUPABASE_PROJECT_ID=eazrhjenaxpzuxfyoeoy

VITE_SUPABASE_URL=https://eazrhjenaxpzuxfyoeoy.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<ваш anon public ключ>
VITE_SUPABASE_PROJECT_ID=eazrhjenaxpzuxfyoeoy
```

Установите Bun (быстрее npm): https://bun.sh/  →  или используйте `npm`.

```bash
bun install          # или: npm install
bun run build        # или: npm run build
bun run start        # запустит на http://localhost:3000
```

Откройте `http://localhost:3000` — если работает, значит подключение к вашей Supabase живое. Зарегистрируйте тестового пользователя.

**Назначьте себя админом** (в Supabase → SQL Editor):
```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'ваш@email.ru'
ON CONFLICT DO NOTHING;
```

---

## 4. Заказ и настройка хостинга reg.ru

### 4.1 Заказ VPS

1. reg.ru → **Виртуальные серверы (VPS)** → тариф от **VPS-2** (2 CPU / 2 GB RAM / Ubuntu 22.04).
2. При заказе: **ОС = Ubuntu 22.04**, `Установить ISPmanager` — по желанию (без него дешевле и удобнее через SSH).
3. После оплаты в письме придут: IP-адрес сервера, root-пароль.

### 4.2 Привязка домена к серверу

1. reg.ru → **Мои домены** → `kvantm.tech` → **Управление DNS-серверами и зоной**.
2. Убедитесь, что NS = `ns1.hosting.reg.ru` / `ns2.hosting.reg.ru` (у вас уже так).
3. Раздел **Ресурсные записи** → **Добавить запись**:
   ```
   Тип: A
   Поддомен: @        (или оставить пустым)
   IP:    <IP вашего VPS>
   TTL:   600
   ```
4. Ещё одна запись:
   ```
   Тип: A
   Поддомен: www
   IP:    <IP вашего VPS>
   ```
5. Сохранить. Подождать 5–30 минут.

Проверка: `ping kvantm.tech` должен показать IP сервера.

### 4.3 Подключение к серверу

С вашего ПК:

```bash
ssh root@<IP сервера>
# ввести пароль из письма reg.ru
```

### 4.4 Установка окружения на сервере

Выполните на сервере построчно:

```bash
# 1. Обновление
apt update && apt upgrade -y

# 2. Node.js 20 + Git + nginx + certbot
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git nginx certbot python3-certbot-nginx ufw

# 3. Bun (опционально, быстрее)
curl -fsSL https://bun.sh/install | bash
source /root/.bashrc

# 4. PM2 (менеджер процессов Node)
npm install -g pm2

# 5. Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

### 4.5 Деплой кода

```bash
cd /var/www
git clone https://github.com/<ваш-логин>/kvantom.git
cd kvantom
```

Создайте `.env` (`nano .env`), вставьте те же переменные, что на шаге 3. Сохранить: `Ctrl+O`, `Enter`, `Ctrl+X`.

```bash
bun install               # или: npm install
bun run build             # или: npm run build

# запуск через PM2
pm2 start "bun run start" --name kvantom
# либо: pm2 start "npm run start" --name kvantom

pm2 save
pm2 startup                # выполнить строку, которую он выведет
```

Проверка: `curl http://localhost:3000` — должен вернуться HTML.

### 4.6 Nginx как reverse-proxy + HTTPS

```bash
nano /etc/nginx/sites-available/kvantm
```

Вставьте:

```nginx
server {
    listen 80;
    server_name kvantm.tech www.kvantm.tech;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Сохранить, активировать:

```bash
ln -s /etc/nginx/sites-available/kvantm /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default   # если есть
nginx -t
systemctl reload nginx
```

Выпустить бесплатный SSL-сертификат:

```bash
certbot --nginx -d kvantm.tech -d www.kvantm.tech
# на вопросы: e-mail — ваш, согласиться, выбрать redirect (2 — HTTPS-only)
```

Готово: сайт открывается по `https://kvantm.tech`.

---

## 5. Настройка SMTP для писем **приложения** (уведомления, поддержка)

1. Зайдите на `https://kvantm.tech` под админом (`luxmailu@mail.ru`).
2. **Админ-панель** → вкладка **Почта / SMTP**.
3. Нажмите пресет **reg.ru** (или Yandex/Mail.ru — в зависимости от вашей почты) и допишите:
   ```
   SMTP host:       smtp.reg.ru
   Порт:            465
   Логин:           noreply@kvantm.tech
   Пароль:          <пароль почтового ящика>
   From email:      noreply@kvantm.tech
   From name:       КВАНТ
   Reply-To:        support@kvantm.tech
   [x] SSL/TLS
   [x] Включить отправку
   ```
4. **Сохранить** → в поле «Тестовое письмо» укажите свой email → **Отправить тест**.

Если письмо не пришло:
- Проверьте, что почтовый ящик `noreply@kvantm.tech` реально существует (создать в reg.ru → «Почта для домена»).
- Порт 465 закрыт хостером? Попробуйте 587 без SSL.

---

## 6. Обновление кода в будущем

На сервере:

```bash
cd /var/www/kvantom
git pull
bun install
bun run build
pm2 restart kvantom
```

Всё, новая версия задеплоена.

---

## 7. Резервные копии

1. **Supabase** → **Database** → **Backups**: настройте ежедневные снапшоты (доступно на платных планах).
2. **Хостинг**: reg.ru → панель VPS → **Резервные копии** → включить.

---

## 8. Частые проблемы

| Симптом | Причина / решение |
|---|---|
| Сайт открывается, но не логинится | Не совпадает `SUPABASE_URL` в `.env` и в клиенте. Пересобрать: `bun run build && pm2 restart kvantom`. |
| «Failed to fetch» в консоли | В Supabase → **Authentication → URL Configuration** не добавили `https://kvantm.tech/**` в Redirect URLs. |
| Письма подтверждения не приходят | SMTP в **Supabase → Project Settings → Auth → SMTP** не настроен или тест не прошёл. |
| Уведомления в приложении не шлются | SMTP в админке КВАНТа не включён (галочка «Включить отправку»). |
| 502 Bad Gateway | Упал Node-процесс: `pm2 logs kvantom` — смотреть ошибку. Обычно нехватка памяти → увеличить swap. |
| Google-логин: `Unsupported provider` | В Supabase не заполнены Google Client ID/Secret (шаг 1.4). |

---

## 9. Что осталось на стороне Lovable после переезда

**Ничего.** Проект полностью автономен: код — у вас, БД — у вас, письма — у вас. Lovable Cloud можно отключить или оставить как «песочницу» для разработки.
