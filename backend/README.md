# Reyohoho Backend API

Backend API для проекта reyohoho-vue. Предоставляет эндпоинты для получения плееров фильмов и сериалов.

## Установка

```bash
cd backend
npm install
```

## Настройка

Скопируйте `.env.example` в `.env` и настройте переменные окружения:

```bash
cp .env.example .env
```

## Запуск

### Режим разработки (с автоперезагрузкой)

```bash
npm run dev
```

### Продакшн режим

```bash
npm start
```

Сервер запустится на порту 8000 (или на порту, указанном в переменной окружения `PORT`).

## API Endpoints

### Health Check

```
GET /health
```

Проверка работоспособности сервера.

**Ответ:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Получение плееров для фильма/сериала

```
POST /cache
Content-Type: application/x-www-form-urlencoded
```

**Параметры:**
- `kinopoisk` (string, required) - ID фильма/сериала (может быть в формате `sskinopoisk/123456` или просто `123456`)
- `type` (string, optional) - Тип контента: `movie` или `series` (по умолчанию `movie`)

**Пример запроса:**
```bash
curl -X POST http://localhost:8000/cache \
  -d "kinopoisk=1394131" \
  -d "type=series" \
  -H "Content-Type: application/x-www-form-urlencoded"
```

**Ответ:**
```json
{
  "FLICKSBR": {
    "iframe": "https://theatre.stloadi.live/?token_movie=...&token=...",
    "translate": "Flcksbr",
    "warning": false
  }
}
```

### Получение плееров для аниме (Shikimori)

```
POST /cache_shiki
Content-Type: application/x-www-form-urlencoded
```

**Параметры:**
- `shikimori` (string, required) - ID аниме с Shikimori
- `type` (string, optional) - Тип контента (по умолчанию `anime`)

## Структура проекта

```
backend/
├── server.js          # Основной файл сервера
├── package.json       # Зависимости и скрипты
├── .env.example       # Пример переменных окружения
├── .gitignore         # Игнорируемые файлы
└── README.md         # Документация
```

## Технологии

- **Express** - веб-фреймворк для Node.js
- **Axios** - HTTP клиент для запросов
- **Cheerio** - парсинг HTML (jQuery для сервера)
- **CORS** - поддержка кросс-доменных запросов

## Разработка

### Добавление новых плееров

Для добавления нового плеера создайте функцию аналогичную `getFlcksbrPlayer()` и вызовите её в эндпоинте `/cache`:

```javascript
async function getAlohaPlayer(kpId, contentType) {
  // Ваша логика получения плеера Aloha
}

// В эндпоинте /cache:
const aloha = await getAlohaPlayer(kpId, contentType);
if (aloha) {
  players.ALOHA = aloha;
}
```

## Логирование

Сервер выводит логи в консоль:
- Запросы к внешним API
- Найденные iframe
- Ошибки

## Обработка ошибок

Все ошибки логируются в консоль и возвращаются клиенту в формате:
```json
{
  "error": "Error message",
  "message": "Detailed error message"
}
```

## Лицензия

ISC
