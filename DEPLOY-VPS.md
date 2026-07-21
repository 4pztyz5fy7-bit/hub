# КВАНТ — перенос сайта на Timeweb Cloud VPS (домен reg.ru)

Инструкция для человека, который **никогда не работал с серверами**. Читайте по порядку — сверху вниз, ничего не пропуская. **Копируйте команды по одной**, вставляйте в чёрное окно (терминал), нажимайте **Enter**, дождитесь окончания — потом следующая.

**Что получите в итоге:** сайт `https://kvantm.tech` работает круглосуточно, ваш, без Lovable.

**Схема:** VPS покупаем в **Timeweb Cloud**, домен `kvantm.tech` (он у вас в **reg.ru**) — только настраиваем DNS, чтобы указал на Timeweb.

**Порядок действий:**
1. Купить VPS в Timeweb Cloud
2. Подключиться к серверу с компьютера
3. Настроить сервер (по одной команде)
4. Настроить домен `kvantm.tech` в reg.ru (DNS → IP Timeweb)
5. Подготовить вашу базу данных Supabase
6. Скачать код проекта из Lovable через GitHub
7. Залить код на сервер и запустить
8. Включить HTTPS (замочек в браузере)
9. Настроить админку и почту
10. Готово, дальше только обновления

Общее время: **2–3 часа**, если делать без спешки.

---

## Шаг 1. Купить VPS в Timeweb Cloud

### Что это

**VPS** — это ваш маленький компьютер в интернете. Работает 24/7. Именно на нём будет жить сайт.

### Как купить

1. Зайти на **timeweb.cloud** → зарегистрироваться / войти.
2. В панели: **Облачные серверы** → **Создать сервер** (кнопка сверху справа).
3. Выбрать параметры:
   - **Локация:** Москва или Санкт-Петербург (ближе к вашим пользователям).
   - **Источник:** **Готовый образ** → **Ubuntu** → версия **22.04 LTS**.
   - **Конфигурация:** для старта берите **Custom / Стандартные** тариф с параметрами **2 vCPU / 4 ГБ RAM / 60 ГБ NVMe** (~500–700 ₽/мес).
     При росте до ~1500 онлайн — апгрейд до **4 vCPU / 8 ГБ RAM / 100 ГБ NVMe** прямо в панели без переустановки.
   - **Сеть:** оставить публичный IPv4 (включён по умолчанию).
   - **Резервные копии:** включить (обычно +10–20% к цене — рекомендую).
   - **ОС-доступ:** способ авторизации → **Пароль** (проще для новичка). Придумать и **записать** сложный пароль root.
4. Нажать **Заказать** → оплатить.

### Что получите

Через 1–3 минуты в панели Timeweb сервер появится со статусом **Активен**. Откройте его карточку — вам нужны:
- **IPv4-адрес** — набор цифр через точки, например `194.87.123.45`.
- **Пользователь:** `root`.
- **Пароль:** тот, что вы задали при создании (или сгенерированный в письме).

**Запишите IP и пароль** — они понадобятся дальше.

---

## Шаг 2. Подключиться к серверу с вашего компьютера

Работать с сервером будем через программу-терминал. Это чёрное окно, куда пишутся команды.

### Быстрый способ (в самой Timeweb)

В карточке сервера есть кнопка **Веб-консоль** (или **VNC**) — открывает терминал прямо в браузере. Удобно для аварийного доступа, но копирование команд через буфер не всегда работает. Для повседневной работы лучше SSH-клиент ниже.

### Windows

1. Скачать **MobaXterm** (бесплатно): https://mobaxterm.mobatek.net/download.html → **Home Edition** → **Installer edition**.
2. Установить, запустить.
3. **Session** → **SSH**.
4. Заполнить:
   - `Remote host` → **IP-адрес** из Timeweb
   - `Specify username` → галочка → `root`
5. **OK** → в чёрном окне запросит пароль → вставить (правая кнопка → Paste, символы не показываются) → **Enter**.

### macOS / Linux

1. Открыть **Терминал**.
2. Написать (замените IP на свой):
   ```
   ssh root@194.87.123.45
   ```
3. Ответить `yes`, вставить пароль → **Enter**.

### Как понять, что подключились

Появится строка `root@xxxxx:~#`. Всё, вы «внутри» сервера. Все следующие команды пишутся сюда.

---

## Шаг 3. Настроить сервер (команды по одной)

### 3.1 Сменить пароль (если Timeweb сгенерировал свой)

```bash
passwd
```

Ввести новый пароль два раза (символы не видны). **Запишите его в надёжное место.**

### 3.2 Обновить список пакетов

```bash
apt update
```

### 3.3 Обновить установленные пакеты

```bash
apt upgrade -y
```

Идёт 1–3 минуты. Если попросит подтверждение — жмите **Enter**.

### 3.4 Установить Node.js (репозиторий)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
```

### 3.5 Установить основные программы

```bash
apt install -y nodejs git nginx certbot python3-certbot-nginx build-essential ufw fail2ban htop
```

Идёт 2–4 минуты. Установятся: Node.js, Git, Nginx (веб-сервер), certbot (для HTTPS), компилятор, файрвол, защита от брутфорса и монитор.

### 3.6 Установить Bun напрямую (без unzip, без bun.sh/install)

Если официальный скрипт `curl https://bun.sh/install | bash` падает с ошибкой распаковки — ставим Bun напрямую с GitHub Releases одной командой.

Скачать и распаковать бинарник (для обычного VPS x86_64):

```bash
curl -fsSL https://github.com/oven-sh/bun/releases/latest/download/bun-linux-x64.zip -o /tmp/bun.zip
```

```bash
apt install -y unzip && unzip -o /tmp/bun.zip -d /tmp/
```

Переместить в системную папку:

```bash
mkdir -p /root/.bun/bin && mv /tmp/bun-linux-x64/bun /root/.bun/bin/bun && chmod +x /root/.bun/bin/bun
```

Создать симлинк, чтобы `bun` был доступен из любого места:

```bash
ln -sf /root/.bun/bin/bun /usr/local/bin/bun
```

Проверить установку:

```bash
bun --version
```

Должно вывести версию, например `1.1.34`. Если пишет `command not found` — команда `ln -sf` выше не сработала, повторите её.

> Для сервера с ARM-процессором (Timeweb Cloud обычно x86_64, но если у вас aarch64 — проверьте командой `uname -m`) замените в первой команде `bun-linux-x64.zip` на `bun-linux-aarch64.zip`.



### 3.8 Добавить Bun в PATH (чтобы система нашла команду `bun`)

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

### 3.9 Сохранить PATH в настройках

```bash
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
```

### 3.10 Установить PM2 (чтобы сайт работал постоянно)

```bash
npm install -g pm2
```

### 3.11 Разрешить SSH в файрволе

```bash
ufw allow OpenSSH
```

### 3.12 Разрешить Nginx в файрволе

```bash
ufw allow 'Nginx Full'
```

### 3.13 Включить файрвол

```bash
ufw --force enable
```

> ⚠️ В панели Timeweb Cloud у сервера может быть **свой Firewall/Security Group**. Проверьте: карточка сервера → раздел **Файрвол / Сеть** → должны быть открыты порты **22 (SSH)**, **80 (HTTP)**, **443 (HTTPS)**. Если их нет — добавьте, иначе сайт не откроется снаружи.

### 3.14 Создать файл подкачки (swap)

```bash
fallocate -l 2G /swapfile
```

### 3.15 Закрыть доступ к swap для всех, кроме root

```bash
chmod 600 /swapfile
```

### 3.16 Пометить файл как swap

```bash
mkswap /swapfile
```

### 3.17 Включить swap

```bash
swapon /swapfile
```

### 3.18 Сделать swap постоянным

```bash
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 3.19 Установить московское время

```bash
timedatectl set-timezone Europe/Moscow
```

**Готово, сервер настроен.** Не закрывайте окно.

---

## Шаг 4. Настроить домен `kvantm.tech` в reg.ru

Домен у вас в **reg.ru**, а сервер — в **Timeweb**. Нам нужно, чтобы `kvantm.tech` указывал на IP Timeweb-сервера. Меняем только DNS-записи в reg.ru, сам домен никуда не переносим.

1. Открыть **reg.ru** → войти → **Мои домены** → нажать на `kvantm.tech`.
2. Открыть раздел **Управление DNS-серверами и зоной** (иногда «DNS-зона» или «Записи ресурсов»).
3. Убедитесь, что для домена включены **NS-серверы reg.ru** (ns1.reg.ru / ns2.reg.ru). Если стоят чужие NS — переключите на reg.ru, иначе ваши записи ниже не сработают.
4. Если увидите старые записи типа **A** для `@` или `www` — **удалить их**.
5. Нажать **Добавить запись**:
   ```
   Тип:      A
   Поддомен: @
   Значение: IP-адрес Timeweb-сервера (например 194.87.123.45)
   TTL:      600
   ```
   Сохранить.
6. Ещё раз **Добавить запись**:
   ```
   Тип:      A
   Поддомен: www
   Значение: тот же IP
   TTL:      600
   ```
   Сохранить.

Подождать **10–30 минут** (иногда до 2 часов) — интернет узнает о новом адресе.

> ⚠️ Не используйте функцию «Прикрепить сайт» / «Хостинг» в reg.ru — она перезапишет ваши A-записи. Нужен только раздел DNS.

### Проверить, что домен «переключился"

На своём компьютере в терминале (не на сервере!):

```
ping kvantm.tech
```

Если в ответах видите **IP Timeweb-сервера** — готово, идите дальше. Если старый IP или ошибка — ждите ещё.

---

## Шаг 5. Подготовить вашу Supabase (базу данных)

### 5.1 Взять ключи

1. **supabase.com** → войти → открыть проект `eazrhjenaxpzuxfyoeoy`.
2. Слева внизу шестерёнка → **Project Settings** → **API**.
3. Записать в блокнот:
   - **Project URL** → `https://eazrhjenaxpzuxfyoeoy.supabase.co`
   - **anon public** → `eyJhbGciOiJI...`
   - **service_role** → `eyJhbGciOiJI...` (**секретная**, никому не показывать)

### 5.2 Загрузить структуру базы (таблицы, правила)

1. В Lovable откройте папку `supabase/migrations/`.
2. В Supabase слева → значок молнии → **SQL Editor** → **New query**.
3. Открывайте **первый по дате** файл, копируйте всё содержимое, вставляйте в SQL Editor → **Run**.
4. `Success` → следующий. Ошибка `already exists` → **пропустить**.
5. Повторить по всем файлам **строго по порядку дат**.

Проверка: **Table Editor** → должны появиться `profiles`, `offers`, `link_requests`, `notifications`, `email_settings` и др.

### 5.3 Включить обновление данных в реальном времени

**Database** → **Replication** → `supabase_realtime` → включить галочки для:
`notifications`, `link_requests`, `payout_requests`, `support_tickets`, `support_messages`, `banners`, `news_posts`, `competitions`, `profiles`, `conversions`.

### 5.4 Настроить регистрацию

**Authentication** → **Providers** → **Email**:
- `Enable Email provider` — **ON**.
- `Confirm email` — **OFF** (для мгновенного входа) или **ON** (если хотите подтверждение почты).

**URL Configuration**:
- `Site URL` = `https://kvantm.tech`
- `Redirect URLs` → добавить:
  - `https://kvantm.tech/**`
  - `https://kvantm.tech/auth/callback`

Сохранить.

### 5.5 SMTP для писем Supabase (подтверждение email, сброс пароля)

**Project Settings** → **Auth** → **SMTP Settings** → **Enable Custom SMTP**:

```
Sender email:  noreply@kvantm.tech
Sender name:   КВАНТ
Host:          smtp.reg.ru        (или smtp.yandex.ru при Yandex 360)
Port:          465
Username:      noreply@kvantm.tech
Password:      пароль от почтового ящика
```

**Save** → **Send test email** → проверить, что пришло.

Если ящика `noreply@kvantm.tech` ещё нет — создать его в reg.ru → **Почта для домена**.

---

## Шаг 6. Скачать код проекта из Lovable

1. В Lovable в чате: **+** → **GitHub** → **Connect project**.
2. Авторизоваться в GitHub → **Create Repository**.
3. Имя, например `kvantom`. Готово.
4. Сделайте репо **приватным**: страница репо → **Settings** → **Change visibility** → **Private**.

### Создать «ключ» для скачивания на сервер

1. GitHub → аватарка → **Settings** → **Developer settings**.
2. **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**.
3. `Note`: `vps-kvantom`, `Expiration`: `90 days`, галочка **`repo`**.
4. **Generate token** → **скопировать** `ghp_...` в блокнот.

---

## Шаг 7. Залить код на сервер и запустить

Возвращаемся в терминал сервера.

### 7.1 Создать папку для сайта

```bash
mkdir -p /var/www
```

### 7.2 Перейти в папку

```bash
cd /var/www
```

### 7.3 Скачать код (замените ВАШЛОГИН и ВАШТОКЕН)

```bash
git clone https://ВАШЛОГИН:ВАШТОКЕН@github.com/ВАШЛОГИН/kvantom.git
```

### 7.4 Перейти в папку проекта

```bash
cd kvantom
```

### 7.5 Открыть файл настроек

```bash
nano .env
```

Вставить (правая кнопка мыши):

```
NODE_ENV=production
PORT=3000

SUPABASE_URL=https://eazrhjenaxpzuxfyoeoy.supabase.co
SUPABASE_PUBLISHABLE_KEY=вставить_anon_public_ключ
SUPABASE_SERVICE_ROLE_KEY=вставить_service_role_ключ
SUPABASE_PROJECT_ID=eazrhjenaxpzuxfyoeoy

VITE_SUPABASE_URL=https://eazrhjenaxpzuxfyoeoy.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=вставить_anon_public_ключ
VITE_SUPABASE_PROJECT_ID=eazrhjenaxpzuxfyoeoy
```

Сохранить: **Ctrl+O** → **Enter** → **Ctrl+X**.

### 7.6 Закрыть доступ к файлу настроек

```bash
chmod 600 .env
```

### 7.7 Установить зависимости проекта

```bash
bun install
```

Идёт 1–3 минуты.

### 7.8 Собрать проект

```bash
bun run build
```

Идёт 2–5 минут. Ожидаемо: `Built in ...ms` без красных ошибок.

### 7.9 Запустить сайт через PM2

```bash
pm2 start "bun run start" --name kvantom --cwd /var/www/kvantom
```

### 7.10 Сохранить список процессов

```bash
pm2 save
```

### 7.11 Настроить автозапуск

```bash
pm2 startup systemd
```

Последняя команда выведет ещё одну команду (`sudo env PATH=...`). **Скопируйте её и выполните** — автозапуск при перезагрузке.

### 7.12 Проверить статус

```bash
pm2 status
```

Должно быть `kvantom | online`.

---

## Шаг 8. Открыть сайт миру через Nginx + HTTPS

### 8.1 Nginx

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

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_buffering off;
    }

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;
}
```

**Ctrl+O** → **Enter** → **Ctrl+X**.

### 8.2 Активировать конфиг Nginx

```bash
ln -s /etc/nginx/sites-available/kvantm /etc/nginx/sites-enabled/
```

### 8.3 Удалить стандартный конфиг

```bash
rm -f /etc/nginx/sites-enabled/default
```

### 8.4 Проверить синтаксис

```bash
nginx -t
```

Должно быть `syntax is ok` и `test is successful`.

### 8.5 Перезапустить Nginx

```bash
systemctl reload nginx
```

Открыть `http://kvantm.tech` — сайт должен показаться (пока без замочка).

### 8.6 HTTPS (замочек)

```bash
certbot --nginx -d kvantm.tech -d www.kvantm.tech
```

Ответы:
- Email → ваш
- Согласие → **A**
- Делиться email с EFF → **N**
- Redirect → **2** (весь трафик через HTTPS)

Открыть `https://kvantm.tech` — замочек 🔒. Сертификат бесплатный, продлевается автоматически.

---

## Шаг 9. Первый вход и настройка почты в приложении

### 9.1 Стать администратором

1. Открыть `https://kvantm.tech` → зарегистрироваться (например `luxmailu@mail.ru`).
2. Supabase → **SQL Editor** → **New query**:
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   SELECT id, 'admin' FROM auth.users WHERE email = 'luxmailu@mail.ru'
   ON CONFLICT DO NOTHING;
   ```
3. Заменить email на свой → **Run**.
4. На сайте F5 → в шапке появится админка.

### 9.2 SMTP для писем приложения

Админ-панель → **Почта / SMTP** → пресет **reg.ru** (или **Yandex 360**) → дозаполнить:
```
Логин:       noreply@kvantm.tech
Пароль:      пароль от почтового ящика
From email:  noreply@kvantm.tech
From name:   КВАНТ
Reply-To:    support@kvantm.tech
Галочки:     SSL/TLS  ✔    Включить отправку  ✔
```
**Сохранить** → тестовое письмо на свой email.

---

## Шаг 10. Обновление сайта после правок в Lovable

Правки из Lovable уходят в GitHub автоматически. На сервере выполняйте команды по очереди.

### 10.1 Перейти в папку проекта

```bash
cd /var/www/kvantom
```

### 10.2 Скачать изменения

```bash
git pull
```

### 10.3 Установить новые зависимости

```bash
bun install
```

### 10.4 Пересобрать проект

```bash
bun run build
```

### 10.5 Перезапустить сайт

```bash
pm2 restart kvantom
```

30–60 секунд, готово.

### Алиас на будущее

Чтобы не вводить команды каждый раз, можно сделать одну команду `update`.

```bash
echo "alias update='cd /var/www/kvantom && git pull && bun install && bun run build && pm2 restart kvantom'" >> ~/.bashrc
```

Загрузить настройки:

```bash
source ~/.bashrc
```

Теперь достаточно набрать:

```bash
update
```

---

## Полезные команды на каждый день

| Что нужно | Команда |
|---|---|
| Статус сайта | `pm2 status` |
| Свежие ошибки | `pm2 logs kvantom` (выход — Ctrl+C) |
| Перезапуск | `pm2 restart kvantom` |
| Место на диске | `df -h` |
| Память | `free -h` |
| Общий монитор | `htop` (выход — q) |
| Снапшот сервера | Timeweb Cloud → карточка сервера → **Резервные копии / Снапшоты** |

---

## Что делать, если что-то сломалось

| Проблема | Что сделать |
|---|---|
| Сайт не открывается вообще | `pm2 status` → если `errored` → `pm2 logs kvantom` |
| Открывается только по IP, но не по домену | DNS ещё не обновился — подождать; проверить `ping kvantm.tech` |
| `502 Bad Gateway` | `pm2 restart kvantom`; если повторяется — `pm2 logs kvantom` |
| Порты 80/443 не пускают | Проверить **Firewall в панели Timeweb** — открыты ли 80 и 443 |
| Логин не работает / белый экран | Не те ключи Supabase в `.env` → правим → `bun run build && pm2 restart kvantom` |
| `Failed to fetch` | В Supabase → Auth → URL Configuration нет `https://kvantm.tech/**` |
| Google-вход: `Unsupported provider` | В Supabase → Auth → Providers → Google не заполнили Client ID/Secret |
| Письма не приходят | Supabase SMTP (для auth) или админка КВАНТа (для приложения) не настроены |
| После `git pull` конфликт | `git reset --hard origin/main && git pull` |
| Тормозит под нагрузкой | Timeweb → карточка сервера → **Изменить конфигурацию** → апгрейд CPU/RAM без переустановки |

---

## Итог

Что вы получили:
- Сайт `https://kvantm.tech` работает 24/7 на **Timeweb Cloud VPS**
- Домен продолжает жить в **reg.ru**, DNS указывает на Timeweb
- HTTPS с замочком, продлевается сам
- Автозапуск при перезагрузке
- Ваша Supabase, ваши данные, ваши письма
- Обновление одной командой `update`

**Оплата в месяц:** ~500–700 ₽ (Timeweb Cloud VPS 2/4/60) + 0 ₽ (Supabase Free) + 0 ₽ (домен уже оплачен) = **~500–700 ₽/мес**.
При росте нагрузки — апгрейд до 4/8/100 в панели Timeweb за пару минут без переустановки.
