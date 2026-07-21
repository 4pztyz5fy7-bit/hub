# Развёртывание КВАНТ на VPS с Nginx

Полная пошаговая инструкция для Ubuntu 22.04 / Debian 12.
Приложение — TanStack Start (Node.js сервер), Nginx — обратный прокси + SSL.

---

## 1. Подготовка сервера

```bash
# Подключитесь к серверу по SSH
ssh root@ВАШ_IP

# Обновите систему
apt update && apt upgrade -y

# Установите базовые пакеты
apt install -y curl git unzip build-essential nginx ufw
```

## 2. Установка Node.js 20 и Bun

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Bun (менеджер пакетов, используется в проекте)
curl -fsSL https://bun.sh/install | bash
source /root/.bashrc

# PM2 — менеджер процессов, чтобы Node не падал
npm install -g pm2
```

Проверка: `node -v`, `bun -v`, `pm2 -v`, `nginx -v`.

## 3. Загрузка проекта

```bash
mkdir -p /var/www && cd /var/www

# Вариант A: клонировать из Git (замените URL)
git clone https://github.com/ВАШ_РЕПО/kvant.git kvant

# Вариант B: загрузить архив через scp с локального компьютера
# scp kvant.zip root@ВАШ_IP:/var/www/
# cd /var/www && unzip kvant.zip -d kvant

cd /var/www/kvant
```

## 4. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```bash
nano /var/www/kvant/.env
```

Вставьте (замените значения на свои из Supabase):

```
VITE_SUPABASE_URL=https://ВАШ_ПРОЕКТ.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_XXXX
VITE_SUPABASE_PROJECT_ID=ВАШ_ПРОЕКТ
NODE_ENV=production
PORT=3000
```

Сохранить: `Ctrl+O`, `Enter`, `Ctrl+X`.

## 5. Сборка проекта

```bash
cd /var/www/kvant
bun install
bun run build
```

После сборки появится папка `.output/server/index.mjs` — это и есть Node-сервер.

Проверка запуска вручную:
```bash
bun run start
# Откроется на http://127.0.0.1:3000 — нажмите Ctrl+C для остановки
```

## 6. Запуск через PM2

```bash
cd /var/www/kvant

pm2 start "bun run start" --name kvant --cwd /var/www/kvant
pm2 save
pm2 startup systemd -u root --hp /root
# Скопируйте и выполните команду, которую выведет pm2 startup
```

Полезное:
- `pm2 status` — статус
- `pm2 logs kvant` — логи
- `pm2 restart kvant` — перезапуск
- `pm2 stop kvant` — остановить

## 7. Настройка Nginx как обратный прокси

Создайте конфиг сайта:

```bash
nano /etc/nginx/sites-available/kvantm.tech
```

Вставьте:

```nginx
# HTTP → HTTPS редирект (после установки SSL)
server {
    listen 80;
    listen [::]:80;
    server_name kvantm.tech www.kvantm.tech;

    # Для валидации SSL сертификата Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS основной сервер
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name kvantm.tech www.kvantm.tech;

    # SSL сертификаты (появятся после certbot, см. шаг 8)
    ssl_certificate /etc/letsencrypt/live/kvantm.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kvantm.tech/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Заголовки безопасности
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Размер загружаемых файлов (аватары и т.п.)
    client_max_body_size 20M;

    # Сжатие
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    # Прокси на Node.js сервер
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # WebSocket поддержка (для Supabase Realtime)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Стандартные заголовки прокси
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;

        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Отключаем буферизацию для realtime
        proxy_buffering off;
        proxy_cache off;
    }

    # Кэширование статических ассетов
    location /_build/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /assets/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Активируйте конфиг:

```bash
ln -s /etc/nginx/sites-available/kvantm.tech /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default   # если есть дефолтный

# Создайте папку для валидации SSL
mkdir -p /var/www/certbot

# ВРЕМЕННО закомментируйте HTTPS-блок и SSL-строки, чтобы первый раз запустить без сертификата:
nano /etc/nginx/sites-available/kvantm.tech
# Закомментируйте (#) весь второй server-блок с listen 443 и location "return 301"
# оставьте только первый блок с listen 80 без редиректа

nginx -t     # проверка синтаксиса
systemctl restart nginx
```

## 8. Настройка домена и SSL

### 8.1. Домен

В личном кабинете регистратора (reg.ru, timeweb и т.п.) создайте A-записи:

| Тип | Имя  | Значение          |
|-----|------|-------------------|
| A   | @    | ВАШ_IP_СЕРВЕРА    |
| A   | www  | ВАШ_IP_СЕРВЕРА    |

Подождите 5–30 минут пока DNS обновится. Проверить: `dig kvantm.tech`.

### 8.2. SSL сертификат Let's Encrypt

```bash
apt install -y certbot python3-certbot-nginx

certbot --nginx -d kvantm.tech -d www.kvantm.tech --email ВАШ_EMAIL --agree-tos --no-eff-email

# Certbot сам раскомментирует HTTPS-блок и пропишет пути к сертификатам
# Автопродление уже настроено через systemd таймер, проверить:
systemctl status certbot.timer
```

Раскомментируйте обратно весь HTTPS-блок и редирект в конфиге, если certbot этого не сделал, затем:

```bash
nginx -t && systemctl reload nginx
```

## 9. Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

## 10. Проверка

Откройте https://kvantm.tech — должен работать сайт с зелёным замком.

Логи в случае проблем:
```bash
pm2 logs kvant --lines 100          # логи приложения
tail -f /var/log/nginx/error.log    # ошибки nginx
tail -f /var/log/nginx/access.log   # запросы
```

## 11. Обновление проекта

```bash
cd /var/www/kvant
git pull                # или загрузить новый архив
bun install
bun run build
pm2 restart kvant
```

---

## Частые проблемы

**502 Bad Gateway** — Node не запущен. Проверьте `pm2 status`, `pm2 logs kvant`.

**WebSocket не работает (Supabase Realtime)** — убедитесь, что в nginx-конфиге есть `proxy_set_header Upgrade` и `Connection "upgrade"`.

**Ошибка "Cannot find .output/server/index.mjs"** — не выполнена сборка. Запустите `bun run build` и убедитесь, что в `vite.config.ts` включён пресет `node-server`.

**Слишком большие загрузки блокируются** — увеличьте `client_max_body_size` в nginx.

**Порт 3000 занят** — измените `PORT` в `.env` и `proxy_pass` в nginx на другое значение.
