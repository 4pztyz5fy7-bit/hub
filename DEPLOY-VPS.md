# КВАНТ — как перенести сайт на свой сервер (простая инструкция)

Инструкция для человека, который **никогда не работал с серверами**. Читайте по порядку — сверху вниз, ничего не пропуская. Каждый шаг = одно действие. Копируйте команды блоками в чёрное окно (терминал) — они выполнятся сами.

**Что получите в итоге:** сайт `https://kvantm.tech` работает круглосуточно, ваш, без Lovable.

**Порядок действий:**
1. Купить сервер (VPS) в reg.ru
2. Подключиться к нему с компьютера
3. Настроить сервер (одна пачка команд)
4. Настроить домен `kvantm.tech`
5. Подготовить вашу базу данных Supabase
6. Скачать код проекта из Lovable
7. Залить код на сервер и запустить
8. Включить HTTPS (замочек в браузере)
9. Настроить админку и почту
10. Готово, дальше только обновления

Общее время: **2–3 часа**, если делать без спешки.

---

## Шаг 1. Купить сервер (VPS)

### Что это

**VPS** — это ваш маленький компьютер в интернете. Работает 24/7. Именно на нём будет жить сайт.

### Как купить

1. Зайти на **reg.ru**.
2. Меню сверху → **Хостинг и серверы** → **VPS / Виртуальные серверы**.
3. Выбрать тариф **VPS-2** (2 ядра, 2 ГБ памяти, ~450 ₽/мес). Меньше — будет тормозить.
4. При заказе:
   - Операционная система → **Ubuntu 22.04**
   - Панель управления → **Без панели** (нам она не нужна)
   - Резервные копии → включить (рекомендую)
5. Оплатить.

### Что придёт

Через 5–10 минут на почту придёт письмо от reg.ru. В нём:
- **IP-адрес** — набор цифр через точки, например `194.87.123.45`
- **Пароль от root** — длинная строка букв и цифр

**Запишите оба значения** — они понадобятся дальше. Не потеряйте.

---

## Шаг 2. Подключиться к серверу с вашего компьютера

Работать с сервером мы будем через программу-терминал. Это чёрное окно, куда пишутся команды.

### Если у вас Windows

1. Скачать **MobaXterm** (бесплатно): https://mobaxterm.mobatek.net/download.html → **Home Edition** → **Installer edition**.
2. Установить, запустить.
3. Слева сверху нажать **Session** → выбрать **SSH**.
4. Заполнить:
   - `Remote host` → **IP-адрес** из письма reg.ru
   - `Specify username` → поставить галочку → написать `root`
5. Нажать **OK**.
6. Появится чёрное окно. Спросит пароль → вставить пароль от root из письма (**Ctrl+V не работает, кликните правой кнопкой мыши, выберите Paste**). Символы при вводе не показываются — это нормально. Нажать **Enter**.

### Если у вас macOS или Linux

1. Открыть **Терминал** (стандартное приложение).
2. Написать:
   ```
   ssh root@194.87.123.45
   ```
   (замените `194.87.123.45` на ваш IP).
3. Ответить `yes` на вопрос.
4. Вставить пароль → **Enter**.

### Как понять, что подключились

В окне появится строка вида `root@ubuntu-xxx:~#`. Всё, вы «внутри» сервера. Все следующие команды пишутся в это окно.

---

## Шаг 3. Настроить сервер (просто скопируйте команды)

### 3.1 Сменить пароль (обязательно)

Пароль из письма reg.ru — временный. Сделайте свой.

```bash
passwd
```

Ввести новый пароль два раза (символы не видны). **Запишите его в надёжное место.**

### 3.2 Обновить систему

```bash
apt update && apt upgrade -y
```

Идёт 1–3 минуты. Если попросит подтверждение — жмите **Enter**.

### 3.3 Поставить всё нужное одной командой

Скопируйте весь блок целиком и вставьте в терминал:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git nginx certbot python3-certbot-nginx build-essential ufw fail2ban htop
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
npm install -g pm2
```

Идёт 3–5 минут. Установились: Node.js, Git, Nginx (веб-сервер), certbot (для HTTPS), Bun (быстрый сборщик), PM2 (чтобы сайт не падал).

### 3.4 Включить защиту (файрвол)

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

Теперь только нужные порты открыты, остальное закрыто от чужих.

### 3.5 Добавить страховку памяти

Чтобы сервер не падал при сборке:

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 3.6 Часовой пояс

```bash
timedatectl set-timezone Europe/Moscow
```

**Готово, сервер настроен.** Не закрывайте окно — оно ещё пригодится.

---

## Шаг 4. Настроить домен `kvantm.tech`

Нужно, чтобы `kvantm.tech` показывал на ваш сервер.

1. Открыть **reg.ru** в браузере, зайти в личный кабинет.
2. **Мои домены** → нажать на `kvantm.tech`.
3. Выбрать **Управление DNS-серверами и зоной** (иногда называется «DNS-зона»).
4. Если увидите старые записи типа **A** для `@` или `www` — удалить их.
5. Нажать **Добавить запись**:
   ```
   Тип:      A
   Поддомен: @
   Значение: IP-адрес вашего сервера (например 194.87.123.45)
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

Подождать **10–30 минут** (иногда до 2 часов), пока интернет узнает о новом адресе.

### Проверить, что домен «переключился»

На своём компьютере в терминале (не на сервере, а у себя!):

```
ping kvantm.tech
```

Если в ответах видите **свой IP** — всё готово, идите дальше. Если старый IP или ошибка — ждите ещё.

---

## Шаг 5. Подготовить вашу Supabase (базу данных)

### 5.1 Взять ключи

1. Открыть **supabase.com** → войти → открыть свой проект `eazrhjenaxpzuxfyoeoy`.
2. Слева внизу шестерёнка → **Project Settings** → **API**.
3. Записать в блокнот три значения:
   - **Project URL** → `https://eazrhjenaxpzuxfyoeoy.supabase.co`
   - **anon public** → длинная строка `eyJhbGciOiJI...`
   - **service_role** → тоже `eyJhbGciOiJI...` (это **секретная**, никому не показывать)

### 5.2 Загрузить структуру базы (таблицы, правила)

1. В Lovable откройте папку `supabase/migrations/` — там файлы `.sql` с датами в имени.
2. В Supabase слева → значок молнии → **SQL Editor** → **New query**.
3. Открыть **первый по дате** файл в Lovable, скопировать всё содержимое.
4. Вставить в SQL Editor Supabase → нажать зелёную кнопку **Run** внизу.
5. Если ответ **Success** — идёте к следующему файлу. Если ошибка `already exists` — **пропустите** этот файл, идите дальше.
6. Повторить для **всех файлов по порядку дат**.

Проверить: слева меню → **Table Editor** → должны появиться таблицы `profiles`, `offers`, `link_requests`, `notifications`, `email_settings` и другие.

### 5.3 Включить обновление данных в реальном времени

1. Слева → **Database** → **Replication**.
2. Найти `supabase_realtime`, нажать на него.
3. Включить галочки для таблиц:
   `notifications`, `link_requests`, `payout_requests`, `support_tickets`, `support_messages`, `banners`, `news_posts`, `competitions`, `profiles`, `conversions`.

### 5.4 Настроить регистрацию

1. Слева → **Authentication** → **Providers** → **Email**.
2. `Enable Email provider` — **ON**.
3. `Confirm email` — на выбор: **ON** = требовать подтверждение почты, **OFF** = мгновенный вход.

Теперь **URL Configuration** (в том же разделе Auth):
- `Site URL` = `https://kvantm.tech`
- `Redirect URLs` → добавить:
  - `https://kvantm.tech/**`
  - `https://kvantm.tech/auth/callback`

Сохранить.

### 5.5 Настроить отправку писем от Supabase

Это для писем «подтвердите email», «сбросить пароль».

1. **Project Settings** → **Auth** → прокрутить до **SMTP Settings**.
2. Включить **Enable Custom SMTP**.
3. Заполнить (для reg.ru mail или Yandex 360):
   ```
   Sender email:  noreply@kvantm.tech
   Sender name:   КВАНТ
   Host:          smtp.reg.ru        (или smtp.yandex.ru)
   Port:          465
   Username:      noreply@kvantm.tech
   Password:      пароль от почтового ящика
   ```
4. **Save** → нажать **Send test email** → написать свой email → проверить, что пришло.

Если ящика `noreply@kvantm.tech` ещё нет — создать его: reg.ru → **Почта для домена**.

---

## Шаг 6. Скачать код проекта из Lovable

1. В Lovable слева снизу в чате: значок **плюс (+)** → **GitHub** → **Connect project**.
2. Авторизоваться в GitHub → выбрать свой аккаунт → **Create Repository**.
3. Имя, например `kvantom`. Готово — код теперь у вас в GitHub.
4. Сделайте репозиторий **приватным**: на странице репо → **Settings** → внизу **Change visibility** → **Private**.

### Создать «ключ» для скачивания на сервер

Так как репо приватный, серверу нужен пропуск:

1. GitHub → нажать на свою аватарку справа сверху → **Settings**.
2. Слева внизу → **Developer settings**.
3. **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**.
4. Заполнить:
   - `Note`: `vps-kvantom`
   - `Expiration`: `90 days`
   - Галочка на пункте **`repo`** (все подпункты)
5. **Generate token** → **скопировать** появившийся `ghp_...` в блокнот. Второй раз его не покажут.

---

## Шаг 7. Залить код на сервер и запустить

Возвращаемся в чёрное окно, где мы работаем с сервером.

### 7.1 Скачать код

```bash
mkdir -p /var/www
cd /var/www
git clone https://ВАШЛОГИН:ВАШТОКЕН@github.com/ВАШЛОГИН/kvantom.git
cd kvantom
```

Замените:
- `ВАШЛОГИН` → ваш логин GitHub
- `ВАШТОКЕН` → тот `ghp_...` из шага 6

### 7.2 Прописать настройки (файл `.env`)

```bash
nano .env
```

Откроется простой редактор. Вставьте (правой кнопкой мыши в MobaXterm):

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

Замените плейсхолдеры на реальные ключи из шага 5.1.

Сохранить: **Ctrl+O** → **Enter** → **Ctrl+X**.

Защитить файл, чтобы никто чужой не прочитал:
```bash
chmod 600 .env
```

### 7.3 Собрать проект

```bash
bun install
bun run build
```

Идёт 2–5 минут. В конце должна быть строка `Built in ...ms` без красных ошибок.

### 7.4 Запустить сайт навсегда

```bash
pm2 start "bun run start" --name kvantom --cwd /var/www/kvantom
pm2 save
pm2 startup systemd
```

Последняя команда выведет ещё одну команду (начинается с `sudo env PATH=...`). **Скопируйте её и выполните** — это включит автозапуск сайта при перезагрузке сервера.

Проверить, что работает:
```bash
pm2 status
```

Должна быть строка `kvantom | online`. Если `errored` — смотреть `pm2 logs kvantom`.

---

## Шаг 8. Открыть сайт миру через Nginx + HTTPS

Пока сайт крутится на сервере, но снаружи не виден. Настроим «витрину».

### 8.1 Настроить Nginx

```bash
nano /etc/nginx/sites-available/kvantm
```

Вставить целиком:

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

Сохранить: **Ctrl+O** → **Enter** → **Ctrl+X**.

Активировать:
```bash
ln -s /etc/nginx/sites-available/kvantm /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

Строка `nginx -t` должна ответить `syntax is ok` и `test is successful`.

Открыть в браузере `http://kvantm.tech` — сайт должен показаться (пока без замочка).

### 8.2 Включить HTTPS (замочек)

```bash
certbot --nginx -d kvantm.tech -d www.kvantm.tech
```

Ответы на вопросы:
- Email → ваш email (сюда будут приходить уведомления о продлении)
- Согласие → **A**
- Делиться email с EFF → **N**
- Redirect → **2** (весь трафик через HTTPS)

Готово. Открыть `https://kvantm.tech` — должен появиться замочек 🔒.

Сертификат бесплатный и продлевается автоматически.

---

## Шаг 9. Первый вход и настройка почты в приложении

### 9.1 Стать администратором

1. Открыть `https://kvantm.tech` → зарегистрироваться обычным способом (например `luxmailu@mail.ru`).
2. Supabase → **SQL Editor** → **New query** → вставить:
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   SELECT id, 'admin' FROM auth.users WHERE email = 'luxmailu@mail.ru'
   ON CONFLICT DO NOTHING;
   ```
3. Заменить `luxmailu@mail.ru` на свой email → **Run**.
4. На сайте обновить страницу (F5) → в шапке появится значок админки.

### 9.2 Настроить SMTP для писем приложения

Это письма от самого сайта: уведомления, поддержка.

1. Зайти в **админ-панель** → вкладка **Почта / SMTP**.
2. Нажать кнопку-пресет **reg.ru** (или **Yandex 360**).
3. Дозаполнить:
   ```
   Логин:       noreply@kvantm.tech
   Пароль:      пароль от почтового ящика
   From email:  noreply@kvantm.tech
   From name:   КВАНТ
   Reply-To:    support@kvantm.tech
   Галочки:     SSL/TLS  ✔    Включить отправку  ✔
   ```
4. **Сохранить**.
5. В блоке «Тестовое письмо» вписать свой email → **Отправить тест** → проверить почту.

---

## Шаг 10. Всё готово. Что делать, когда обновляете код?

Когда в Lovable вы сделали изменения — они автоматически попадут в GitHub. Осталось обновить сервер.

Одна команда, которая делает всё:

```bash
cd /var/www/kvantom && git pull && bun install && bun run build && pm2 restart kvantom
```

Займёт 30–60 секунд. Всё, новая версия на проде.

Чтобы не набирать эту простыню каждый раз, один раз сделайте:
```bash
echo "alias update='cd /var/www/kvantom && git pull && bun install && bun run build && pm2 restart kvantom'" >> ~/.bashrc
source ~/.bashrc
```

Теперь для обновления сайта — просто одно слово:
```bash
update
```

---

## Полезные команды на каждый день

| Что нужно | Команда |
|---|---|
| Посмотреть, работает ли сайт | `pm2 status` |
| Посмотреть свежие ошибки | `pm2 logs kvantom` (выход — Ctrl+C) |
| Перезапустить сайт | `pm2 restart kvantom` |
| Занятое место на диске | `df -h` |
| Сколько памяти занято | `free -h` |
| Общий монитор нагрузки | `htop` (выход — q) |

---

## Что делать, если что-то сломалось

| Проблема | Что сделать |
|---|---|
| Сайт не открывается вообще | `pm2 status` → если `errored` → `pm2 logs kvantom` → прочитать красную ошибку |
| Показывает `502 Bad Gateway` | Node упал: `pm2 restart kvantom`. Если снова — читать `pm2 logs kvantom` |
| Логин не работает, белый экран | В `.env` не те ключи Supabase. Проверить → `bun run build && pm2 restart kvantom` |
| Ошибка `Failed to fetch` в браузере | В Supabase → Authentication → URL Configuration не добавили `https://kvantm.tech/**` |
| Google-вход выдаёт `Unsupported provider` | В Supabase → Auth → Providers → Google не заполнили Client ID и Secret |
| Письма подтверждения не приходят | Supabase → Project Settings → Auth → SMTP не настроен |
| Уведомления сайта не приходят | В админке КВАНТа → Почта/SMTP не поставлена галочка «Включить отправку» |
| После `git pull` конфликт | `git reset --hard origin/main && git pull` (это сотрёт правки на сервере, которых и не должно быть) |
| Сервер перегружен, всё тормозит | `htop` → посмотреть, что жрёт память. Обычно помогает `pm2 restart kvantom` |

---

## Итог

Что вы получили:
- Сайт `https://kvantm.tech` работает 24/7
- HTTPS с замочком, продлевается сам
- Автозапуск при перезагрузке сервера
- Ваша Supabase, ваши данные, ваши письма
- Обновление в одну команду

**Оплата в месяц:** ~450 ₽ (VPS reg.ru) + 0 ₽ (Supabase Free) + 0 ₽ (домен уже оплачен) = **~450 ₽/мес**.
