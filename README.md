# Microservice Main

Это проект на Next.js с интегрированным сервисом машинного обучения для обработки текста и проверки фраз автоответчика.

## Архитектура проекта

- **Frontend/Backend**: Next.js 15 с App Router
- **База данных**: PostgreSQL с Prisma ORM
- **Кэширование**: Redis
- **Аутентификация**: NextAuth.js
- **ML сервис**: FastAPI с SentenceTransformers
- **AI**: Google Gemini API

## Предварительные требования

Перед установкой убедитесь, что у вас установлены:

- **Node.js** (версия 18 или выше)
- **Python** (версия 3.8 или выше)
- **PostgreSQL** (версия 12 или выше)
- **Redis** (версия 6 или выше)
- **npm** или **pnpm** или **yarn**

## Установка

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd microservicemain
```

### 2. Установка Node.js зависимостей

```bash
npm install
# или
pnpm install
# или
yarn install
```

### 3. Установка Python зависимостей

```bash
pip install -r requirements.txt
```

### 4. Настройка базы данных

#### Создание базы данных PostgreSQL

```bash
# Подключитесь к PostgreSQL
psql -U postgres

# Создайте базу данных
CREATE DATABASE microservicemain;

# Создайте пользователя (опционально)
CREATE USER microservice_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE microservicemain TO microservice_user;
```

#### Настройка Prisma

```bash
# Генерация Prisma клиента
npx prisma generate

# Применение миграций
npx prisma migrate deploy

# Заполнение базы данных тестовыми данными (опционально)
npm run seed
```

### 5. Настройка Redis

Убедитесь, что Redis запущен:

```bash
# macOS (с Homebrew)
brew services start redis

# Linux
sudo systemctl start redis

# Или запустите вручную
redis-server
```

## Конфигурация

### Переменные окружения

Создайте файл `.env.local` в корне проекта:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# База данных
DATABASE_URL="postgresql://username:password@localhost:5432/microservicemain"

# Redis
REDIS_URL="redis://localhost:6379"

# Google Gemini API (получите на https://makersuite.google.com/app/apikey)
GEMINI_API_KEY=your-gemini-api-key
```

### Настройка для сетевого доступа

Если вы хотите получить доступ к приложению из сети:

```env
# Замените localhost на ваш IP адрес
NEXTAUTH_URL=http://192.168.x.x:3000
```

## Запуск проекта

### Режим разработки

#### 1. Запуск ML сервиса

```bash
# В первом терминале
python main_embeddings.py
```

Сервис будет доступен на `http://localhost:8001`

#### 2. Запуск Next.js приложения

```bash
# Во втором терминале
npm run dev
```

Приложение будет доступно на `http://localhost:3000`

### Производственный режим

#### 1. Сборка приложения

```bash
npm run build
```

#### 2. Запуск в продакшене

```bash
# Запуск ML сервиса
python main_embeddings.py &

# Запуск Next.js приложения
npm run start
```

## API Endpoints

### Webhook API

**POST** `/api/webhook`

```json
{
  "promptId": "string",
  "projectId": "string", 
  "text": "string",
  "check": boolean // опционально
}
```

- Если `check: true` - проверяет текст на автоответчик
- Если `check: false` или отсутствует - обычная обработка через Gemini

### ML Service API

**POST** `/check_phrase` - проверка на автоответчик

```json
{
  "text": "string"
}
```

**POST** `/similar_phrases` - поиск похожих фраз

```json
{
  "text": "string",
  "top_k": 5
}
```

## Структура проекта

```
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   ├── auth/           # Аутентификация
│   │   ├── dashboard/      # Панель управления
│   │   └── projects/       # Управление проектами
│   ├── components/         # React компоненты
│   ├── lib/               # Утилиты и конфигурация
│   └── types/             # TypeScript типы
├── prisma/                # Схема и миграции БД
├── main_embeddings.py     # ML сервис
├── requirements.txt       # Python зависимости
└── package.json          # Node.js зависимости
```

## Функциональность

### Основные возможности

- 🔐 **Аутентификация** - вход через учетные данные
- 📊 **Управление проектами** - создание и настройка проектов
- 🤖 **AI обработка** - интеграция с Google Gemini
- 🎯 **Проверка автоответчика** - ML определение автоматических сообщений
- ⚡ **Кэширование** - Redis для быстрого доступа
- 📝 **Webhook API** - для внешних интеграций

### ML возможности

- Семантический поиск похожих фраз
- Определение фраз автоответчика
- Векторизация текста с помощью SentenceTransformers
- Поддержка многоязычных моделей

## Разработка

### Полезные команды

```bash
# Просмотр базы данных
npx prisma studio

# Сброс базы данных
npx prisma migrate reset

# Линтинг
npm run lint

# Проверка типов
npx tsc --noEmit
```

### Тестирование API

```bash
# Тест webhook с проверкой автоответчика
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "promptId": "test",
    "projectId": "test",
    "text": "Здравствуйте это сбербанк",
    "check": true
  }'

# Тест ML сервиса
curl -X POST http://localhost:8001/check_phrase \
  -H "Content-Type: application/json" \
  -d '{"text": "Здравствуйте это банк"}'
```

## Устранение неполадок

### Частые проблемы

1. **Ошибка подключения к БД**
   - Проверьте правильность DATABASE_URL
   - Убедитесь, что PostgreSQL запущен

2. **Ошибка Redis**
   - Проверьте, что Redis запущен
   - Проверьте REDIS_URL в .env.local

3. **ML сервис не отвечает**
   - Убедитесь, что Python зависимости установлены
   - Проверьте, что порт 8001 свободен

4. **Ошибки Gemini API**
   - Проверьте правильность GEMINI_API_KEY
   - Убедитесь, что у вас есть доступ к API

### Логи

```bash
# Логи Next.js
npm run dev

# Логи ML сервиса
python main_embeddings.py

# Логи Redis
redis-cli monitor
```

## Деплой

### Vercel (рекомендуется для Next.js)

1. Подключите репозиторий к Vercel
2. Настройте переменные окружения
3. Разверните ML сервис отдельно (например, на Railway или Render)

### Docker (опционально)

Создайте `Dockerfile` для контейнеризации приложения.

## Лицензия

MIT License

## Поддержка

Для вопросов и поддержки создайте issue в репозитории.
