# КВАНТ — деплой на VPS (максимально подробно)

Гайд для человека, который **никогда не работал с Linux-сервером**. Копируйте команды блоками — они выполняются друг за другом. Всё, что в `< >` — заменить на своё значение (без угловых скобок).

**Итог**: сайт `https://kvantm.tech` работает 24/7, HTTPS, автозапуск при перезагрузке, автообновление сертификата.

---

## 0. Что купить и подготовить

| Что | Где | Стоимость |
|---|---|---|
| VPS Ubuntu 22.04, 2 CPU / 2 ГБ RAM / 20 ГБ SSD | reg.ru → «Виртуальные серверы» → **VPS-2** и выше | ~450 ₽/мес |
| Домен `kvantm.tech` | Уже есть | — |
| Supabase проект | Уже есть (`eazrhjenaxpzuxfyoeoy`) | Free |
| Почтовый ящик `noreply@kvantm.tech` | reg.ru → «Почта для домена» | Бесплатно с доменом |
| SSH-клиент | Windows: **MobaXterm** или **Windows Terminal**. macOS/Linux: терминал | Бесплатно |

При заказе VPS **не берите** ISPmanager (лишние 200 ₽/мес, будем работать через SSH напрямую). ОС: **Ubuntu 22.04 LTS**.

После оплаты reg.ru пришлёт письмо с:
- **IP-адрес** сервера (например `194.87.xxx.xxx`)
- **root-пароль**

---

## 1. Первое подключение к серверу

### 1.1 Windows

Скачать **MobaXterm Home Edition** → https://mobaxterm.mobatek.net/download.html
1. Открыть → **Session** → **SSH**.
2. `Remote host` = IP сервера, `Specify username` = `root`.
3. **OK** → ввести пароль (при вводе символы не отображаются — это норма) → **Enter**.

### 1.2 macOS / Linux

```bash
ssh root@<IP-сервера>
# yes на вопрос про fingerprint
# пароль из письма
```

Если видите `root@ubuntu-2gb-xxx:~#` — вы внутри сервера. Дальше все команды выполняются здесь.

---

## 2. Базовая настройка сервера

### 2.1 Обновление системы

```bash
apt update && apt upgrade -y
```

(если попросит выбрать что-то про конфиг-файлы — жмите Enter, оставляя значения по умолчанию).

### 2.2 Смена пароля root (обязательно)

```bash
passwd
# ввести новый пароль дважды (символы не видны)
```

### 2.3 Часовой пояс

```bash
timedatectl set-timezone Europe/Moscow
```

### 2.4 Swap-файл (страховка от нехватки памяти)

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

Проверить: `free -h` — в строке `Swap` должно быть `2.0Gi`.

### 2.5 Firewall

```bash
apt install -y ufw
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

Должно быть: `Status: active`, разрешены порты 22, 80, 443.

---

## 3. Установка стека (Node.js, Git, Nginx, PM2, Bun)

Выполнить одним блоком:

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git nginx certbot python3-certbot-nginx build-essential

# Проверка
node -v      # должно быть v20.x
npm -v
nginx -v
git --version

# Bun (быстрее npm)
curl -fsSL https://bun.sh/install | bash
source /root/.bashrc
bun -v       # должно быть 1.x

# PM2 (менеджер Node-процессов)
npm install -g pm2
pm2 -v
```

Если `bun -v` не сработал:
```bash
export PATH="$HOME/.bun/bin:$PATH"
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
```

---

## 4. Настройка DNS домена

В **личном кабинете reg.ru**:

1. **Мои домены** → `kvantm.tech` → **Управление DNS-серверами и зоной**.
2. Убедитесь, что DNS = `ns1.hosting.reg.ru` / `ns2.hosting.reg.ru`.
3. **Ресурсные записи** → удалите старые A-записи для `@` и `www` (если есть).
4. **Добавить запись**:
   ```
   Тип:       A
   Поддомен:  @
   IP:        <IP-VPS>
   TTL:       600
   ```
5. Ещё одна:
   ```
   Тип:       A
   Поддомен:  www
   IP:        <IP-VPS>
   TTL:       600
   ```
6. Сохранить. Ждать 5–30 минут.

Проверка с локального ПК:
```bash
ping kvantm.tech
# должен показать <IP-VPS>
```

Пока DNS не резолвится — дальше по SSL не идти.

---

## 5. Подготовка вашей Supabase

### 5.1 Ключи

**Supabase Dashboard** → ваш проект → **Project Settings** → **API**:

- `Project URL` → скопировать (уже знаем: `https://eazrhjenaxpzuxfyoeoy.supabase.co`)
- `anon public` → длинная строка, начинается с `eyJ...`
- `service_role` → **секретная**, тоже `eyJ...`

Сохраните все три в блокнот.

### 5.2 Применение миграций

**Способ А (простой, через SQL Editor):**

1. В Lovable откройте папку `supabase/migrations/` в редакторе кода.
2. Supabase → **SQL Editor** → **New query**.
3. По одному, **в порядке возрастания даты в имени файла**, копируйте содержимое каждого `.sql` и жмите **Run**.
4. Ошибка `already exists` — пропустить и идти дальше.

**Способ Б (через Supabase CLI на VPS):**

```bash
# на VPS
curl -sSf https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh
# перелогиниться в SSH или:
source ~/.bashrc

supabase login   # откроет ссылку → авторизоваться в браузере
cd /var/www/kvantom  # (после шага 7)
supabase link --project-ref eazrhjenaxpzuxfyoeoy
supabase db push
```

### 5.3 Realtime

**Database** → **Replication** → **supabase_realtime** → включить тумблеры на:
`notifications`, `link_requests`, `payout_requests`, `support_tickets`, `support_messages`, `banners`, `news_posts`, `competitions`, `profiles`, `conversions`.

### 5.4 Auth

**Authentication → Providers → Email**:
- `Enable Email provider` — **ON**.
- `Confirm email` — на выбор (ON = требовать подтверждение, OFF = мгновенный вход).

**Authentication → URL Configuration**:
- `Site URL` = `https://kvantm.tech`
- `Redirect URLs`: добавить строки:
  - `https://kvantm.tech/**`
  - `https://kvantm.tech/auth/callback`
  - `http://localhost:8080/**` (для локальной разработки)

### 5.5 Google OAuth (если нужен)

1. **Google Cloud Console** → https://console.cloud.google.com/ → создать проект → **APIs & Services** → **OAuth consent screen** → заполнить.
2. **Credentials** → **Create Credentials** → **OAuth client ID** → **Web application**.
3. `Authorized redirect URIs` = `https://eazrhjenaxpzuxfyoeoy.supabase.co/auth/v1/callback`
4. Скопируйте **Client ID** и **Client Secret**.
5. Supabase → **Authentication → Providers → Google** → включить → вставить ID и Secret → **Save**.

### 5.6 SMTP для Auth-писем (сброс пароля, подтверждение регистрации)

**Project Settings → Auth → SMTP Settings → Enable Custom SMTP**:

```
Sender email:  noreply@kvantm.tech
Sender name:   КВАНТ
Host:          smtp.yandex.ru        (или smtp.reg.ru)
Port:          465
Username:      noreply@kvantm.tech
Password:      <пароль ящика>
Minimum interval: 60
```

**Save** → **Send test email** → проверьте, что письмо пришло.

---

## 6. Экспорт проекта из Lovable в GitHub

1. В Lovable вверху слева в чате: **Плюс (+) → GitHub → Connect project**.
2. Авторизуйте Lovable в GitHub → выберите свой аккаунт → **Create Repository**.
3. Название репозитория, например `kvantom`. Готово: код теперь в `github.com/<ваш-логин>/kvantom`.

Сделайте репозиторий приватным (в GitHub → Settings → Change visibility → Private).

---

## 7. Деплой кода на VPS

Возвращаемся в SSH-сессию на сервере.

### 7.1 Клонирование

Приватный репозиторий требует токен GitHub:

1. GitHub → **Settings** (аватарка справа сверху) → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**.
2. `Note`: `vps-kvantom`, `Expiration`: 90 days, галочка **repo**. Сгенерировать → **скопировать токен** (`ghp_...`).

```bash
mkdir -p /var/www
cd /var/www
git clone https://<ваш-логин>:<токен>@github.com/<ваш-логин>/kvantom.git
cd kvantom
```

### 7.2 Файл `.env`

```bash
nano .env
```

Вставить (заменив ключи):

```env
NODE_ENV=production
PORT=3000

SUPABASE_URL=https://eazrhjenaxpzuxfyoeoy.supabase.co
SUPABASE_PUBLISHABLE_KEY=<ваш anon public>
SUPABASE_SERVICE_ROLE_KEY=<ваш service_role>
SUPABASE_PROJECT_ID=eazrhjenaxpzuxfyoeoy

VITE_SUPABASE_URL=https://eazrhjenaxpzuxfyoeoy.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<ваш anon public>
VITE_SUPABASE_PROJECT_ID=eazrhjenaxpzuxfyoeoy
```

Сохранить: **Ctrl+O** → **Enter** → **Ctrl+X**.

Защитить файл:
```bash
chmod 600 .env
```

### 7.3 Установка зависимостей и сборка

```bash
bun install
bun run build
```

Сборка идёт 1–3 минуты. В конце должно быть `Built in ...ms` без красных ошибок.

### 7.4 Первый запуск (проверка)

```bash
bun run start
```

В другом SSH-окне (или локально):
```bash
curl http://<IP-VPS>:3000
```

Должен вернуться HTML. Останавливаем: в окне с `bun run start` нажать **Ctrl+C**.

### 7.5 Запуск через PM2 (навсегда)

```bash
pm2 start "bun run start" --name kvantom --cwd /var/www/kvantom
pm2 save
pm2 startup systemd
# он выведет команду вида: sudo env PATH=... /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root
# скопировать и выполнить эту команду
```

Проверка:
```bash
pm2 status         # kvantom: online
pm2 logs kvantom   # смотреть логи, Ctrl+C для выхода
```

При перезагрузке сервера (`reboot`) PM2 сам поднимет процесс.

---

## 8. Nginx как reverse-proxy

### 8.1 Конфиг

```bash
nano /etc/nginx/sites-available/kvantm
```

Вставить:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name kvantm.tech www.kvantm.tech;

    client_max_body_size 20M;

    # Realtime WebSockets для Supabase не идут через nginx, но пусть будет
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host  $host;

        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_cache_bypass                 $http_upgrade;

        proxy_buffering off;
    }

    # gzip
    gzip on;
    gzip_types text/plain text/css text/javascript application/javascript application/json application/xml image/svg+xml;
    gzip_min_length 1024;
}
```

Сохранить, активировать:

```bash
ln -s /etc/nginx/sites-available/kvantm /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t                # должно быть "syntax is ok" + "test is successful"
systemctl reload nginx
```

Проверка: откройте в браузере `http://kvantm.tech` — должен открыться сайт.

### 8.2 HTTPS (бесплатный сертификат Let's Encrypt)

```bash
certbot --nginx -d kvantm.tech -d www.kvantm.tech
```

Ответы:
- `Enter email` — ваш email (для уведомлений о продлении).
- `Agree to terms` — **A**.
- `Share email` — **N**.
- `Redirect HTTP to HTTPS` — **2** (обязательно перенаправлять).

Готово: `https://kvantm.tech` работает с зелёным замком.

Автопродление уже настроено. Проверить:
```bash
certbot renew --dry-run
```

---

## 9. Первый вход и настройки в приложении

### 9.1 Создать первого администратора

Зарегистрируйтесь на `https://kvantm.tech` обычным способом (например `luxmailu@mail.ru`).

Затем в Supabase → **SQL Editor**:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'luxmailu@mail.ru'
ON CONFLICT DO NOTHING;
```

Обновите страницу — иконка админки появится в шапке.

### 9.2 SMTP для писем приложения

Админ-панель → **Почта / SMTP**:

```
Пресет:          reg.ru (или Yandex)
SMTP host:       smtp.reg.ru
Порт:            465
Логин:           noreply@kvantm.tech
Пароль:          <пароль ящика>
From email:      noreply@kvantm.tech
From name:       КВАНТ
Reply-To:        support@kvantm.tech
SSL/TLS:         ✔
Включить:        ✔
```

**Сохранить** → тестовое письмо на свой email → **Отправить тест**.

---

## 10. Обновление проекта (когда что-то меняется в Lovable)

Скрипт-однострочник:

```bash
cd /var/www/kvantom && git pull && bun install && bun run build && pm2 restart kvantom && pm2 logs kvantom --lines 30
```

Через 10–30 секунд обновлённая версия работает на проде.

Для удобства сохраните алиас:
```bash
echo "alias deploy-kvantom='cd /var/www/kvantom && git pull && bun install && bun run build && pm2 restart kvantom'" >> ~/.bashrc
source ~/.bashrc
```

Теперь просто: `deploy-kvantom`.

---

## 11. Мониторинг и логи

```bash
pm2 status                    # состояние процессов
pm2 logs kvantom              # логи Node (Ctrl+C — выход)
pm2 logs kvantom --err        # только ошибки
pm2 monit                     # интерактивный монитор CPU/RAM

tail -f /var/log/nginx/access.log   # логи запросов
tail -f /var/log/nginx/error.log    # ошибки nginx

htop                          # общая нагрузка (apt install htop)
df -h                         # место на диске
free -h                       # оперативка
```

---

## 12. Резервные копии

### 12.1 База (Supabase)

**Supabase → Database → Backups** — на Free плане ежедневные бэкапы 7 дней. Для срочного:

**Database → Backups → Download backup** или через CLI:
```bash
supabase db dump -f backup-$(date +%F).sql
```

### 12.2 Файлы VPS

reg.ru → панель VPS → **Резервные копии** → включить ежедневные.

Или вручную (на VPS):
```bash
tar -czf /root/kvantom-backup-$(date +%F).tar.gz /var/www/kvantom /etc/nginx/sites-available
```

Периодически скачивайте `/root/kvantom-backup-*.tar.gz` на локальный ПК через WinSCP/FileZilla.

---

## 13. Безопасность (обязательный минимум)

### 13.1 Отключить вход root-паролем (после того, как настроите SSH-ключ)

Пока пропустите, если не работали с SSH-ключами. Можно вернуться позже.

### 13.2 Автообновления безопасности

```bash
apt install -y unattended-upgrades
dpkg-reconfigure --priority=low unattended-upgrades
# на вопрос — Yes
```

### 13.3 Защита от брутфорса SSH

```bash
apt install -y fail2ban
systemctl enable --now fail2ban
fail2ban-client status sshd
```

---

## 14. Частые проблемы

| Симптом | Решение |
|---|---|
| `502 Bad Gateway` | `pm2 logs kvantom` — читать ошибку. Часто: не хватает памяти при `bun run build` → добавить swap (шаг 2.4) или собирать локально и заливать `dist/`. |
| `504 Gateway Timeout` | Node-процесс висит: `pm2 restart kvantom`. |
| Сайт открывается, но при логине белый экран | `.env` собран со старыми `VITE_*`. Пересобрать: `bun run build && pm2 restart kvantom`. |
| Google-вход: `Unsupported provider` | В Supabase не заполнены Google ID/Secret (шаг 5.5). |
| `Failed to fetch` в консоли браузера | В Supabase → Auth → URL Configuration не добавили `https://kvantm.tech/**`. |
| Письма не приходят | 1) Supabase SMTP не настроен (шаг 5.6). 2) reg.ru mail: проверить логин/пароль ящика. 3) Порт 465 закрыт — попробовать 587. |
| Realtime не работает (нет живых обновлений) | Не включили таблицы в Supabase Replication (шаг 5.3). |
| После `git pull` конфликт | `git reset --hard origin/main && git pull`. **Внимание**: убьёт локальные правки на VPS (их и не должно быть). |
| PM2 не поднялся после reboot | `pm2 startup systemd` — выполнить выведенную команду ещё раз, потом `pm2 save`. |

---

## 15. Дополнительно: домен через Cloudflare (рекомендуется)

Бесплатно, ускоряет сайт и защищает от DDoS.

1. Регистрация на https://cloudflare.com/ (бесплатный план).
2. **Add site** → `kvantm.tech` → **Free**.
3. Cloudflare покажет 2 NS-сервера (например `xxx.ns.cloudflare.com`).
4. В reg.ru → **Мои домены** → `kvantm.tech` → **DNS-серверы** → заменить на 2 сервера от Cloudflare.
5. В Cloudflare DNS: добавить A-запись `@` → `<IP-VPS>` (Proxied ✔).
6. **SSL/TLS** → режим **Full (strict)**.

Через 5–60 минут домен работает через Cloudflare CDN.

---

## Готово

Итого получите:
- `https://kvantm.tech` работает 24/7
- Своя Supabase (все данные — ваши)
- Auth-письма через ваш SMTP
- App-письма (уведомления/поддержка) через SMTP в админке
- Автозапуск при перезагрузке
- HTTPS с автопродлением
- Автообновление безопасности
- Fail2ban против брутфорса

**Стоимость ежемесячно**: ~450 ₽ (VPS) + 0 ₽ (Supabase Free) + 0 ₽ (домен уже оплачен) + 0 ₽ (Cloudflare Free) ≈ **450 ₽/мес**.
