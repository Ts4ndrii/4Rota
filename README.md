# 4Rota — Система управління автосервісом (СТО)

[![Live Demo](https://img.shields.io/badge/🚀_Демо-4Rota-46a2f1?style=flat-square)](https://fourrota.onrender.com)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Node.js](https://img.shields.io/badge/node-18%2B-brightgreen?style=flat-square&logo=node.js)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-6%2B-4ea94b?style=flat-square&logo=mongodb)](https://www.mongodb.com/atlas)
[![Docker](https://img.shields.io/badge/Docker-✔-2496ed?style=flat-square&logo=docker)](https://www.docker.com/)

Сучасна веб-система для управління автосервісом з підтримкою ролей користувачів, управління нарядами-замовленнями, послугами та запчастинами.

## 📋 Вміст

- [Вимоги](#-вимоги)
- [Швидкий старт](#-швидкий-старт)
- [Архітектура](#-архітектура)
- [Порти](#-порти)
- [Розробка](#-розробка)
- [Деплойментм](#-деплоймент)
- [API Документація](#-api-документація)
- [Тестові облікові записи](#-тестові-облікові-записи)
- [Troubleshooting](#-troubleshooting)

---

## 📦 Вимоги

### Для запуску через Docker (рекомендується):
- **Docker** v20.10+
- **Docker Compose** v2.0+

### Для локальної розробки:
- **Node.js** v20+
- **npm** v9+
- **MongoDB** v7.0+ (локальна БД або MongoDB Atlas)

---

## 🚀 Швидкий старт

### Запуск через Docker

```bash
# 1. Клонуємо репозиторій
git clone https://github.com/your-username/4rota.git
cd 4rota

# 2. Запускаємо весь стек
docker-compose up -d

# 3. Перевіряємо статус контейнерів
docker-compose ps

# 4. Переглядаємо логи
docker-compose logs -f
```

**Готово! Додаток запущено:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- MongoDB: mongodb://localhost:27017

### Зупинення:
```bash
docker-compose down
```

### Повна очистка (включно з даними):
```bash
docker-compose down -v
```

---

## 🏗️ Архітектура

```
4Rota
├── frontend/                    # React + Vite SPA
│   ├── src/
│   │   ├── components/          # Компоненти UI
│   │   ├── pages/               # Сторінки (Admin, Mechanic, Client)
│   │   ├── context/             # Auth context
│   │   ├── api.js               # API клієнт (axios)
│   │   └── main.jsx             # Entry point
│   ├── Dockerfile               # Multi-stage build + Nginx serve
│   ├── nginx.conf               # Nginx конфіг для SPA routing
│   └── vite.config.js           # Vite конфіг
│
├── backend/                     # Node.js + Express REST API
│   ├── server.js                # Основний сервер
│   ├── migration-runner.js      # Система міграцій БД
│   ├── migrations/              # Файли міграцій
│   │   └── 001-init.js          # Ініціальна конфіг
│   ├── Dockerfile               # Multi-stage build
│   ├── .env.example             # Приклад конфіку
│   └── package.json             # Залежності
│
├── docker-compose.yml           # Оркестрація контейнерів
└── README.md                    # Цей файл
```

### Стек технологій:

| Компонент | Технологія |
|-----------|-----------|
| Frontend | React 18 + Vite + React Router + Tailwind CSS |
| Backend | Node.js + Express 5 |
| БД | MongoDB 7.0 |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Паралізація | Mongoose 9.6 |
| Контейнеризація | Docker + Docker Compose |

---

## 🌐 Порти

| Сервіс | Порт | Опис |
|--------|------|------|
| **Frontend** | 3000 | Веб-інтерфейс (Nginx) |
| **Backend** | 5000 | REST API (Node.js) |
| **MongoDB** | 27017 | База даних |

**Примітка:** Все налаштовано для локального доступу. Для production змініть `docker-compose.yml`.

---

## 💻 Розробка

### Локальне налаштування:

```bash
# 1. Встановлюємо залежності backend
cd backend
npm install

# 2. Встановлюємо залежності frontend
cd ../frontend
npm install

# 3. Налаштовуємо .env файли
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 4. Запускаємо MongoDB локально (або MongoDB Atlas)
# Оновлюємо MONGO_URI в backend/.env

# 5. Запускаємо backend в режимі розробки
cd backend
npm run dev

# 6. У новому терміналі запускаємо frontend
cd frontend
npm run dev
```

**Результат:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000/api
- Frontend автоматично проксирує API запити на backend

---

## 🐳 Деплоймент

### Зміна конфігу для Production:

#### 1. **Оновіть `docker-compose.yml`:**

```yaml
backend:
  environment:
    NODE_ENV: production
    JWT_SECRET: very-secure-secret-key-here
    MONGO_URI: mongodb://your-mongo-cloud-uri
```

#### 2. **Оновіть `.env` файли:**

```bash
# frontend/.env.production
VITE_API_URL=https://your-api-domain.com/api
```

#### 3. **Запустіть контейнери:**

```bash
docker-compose -f docker-compose.yml up -d
```

#### 4. **Налаштуйте зворотний проксі (Nginx, Traefik):**

```nginx
# Для frontend (port 3000 → 80/443)
# Для backend API (port 5000 → /api)
```

---

## 📡 API Документація

### Аутентифікація

#### Реєстрація
```bash
POST /api/auth/register
Content-Type: application/json

{
  "fullName": "Іван Петренко",
  "email": "user@sto.ua",
  "password": "SecurePassword123",
  "role": "client"  # admin, mechanic, client
}

Response: { token, user }
```

#### Вхід
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@sto.ua",
  "password": "admin"
}

Response: { token, user }
```

#### Отримати поточного юзера
```bash
GET /api/auth/me
Authorization: Bearer {token}

Response: { user }
```

### Наряди-замовлення

#### Отримати всі наряди
```bash
GET /api/appointments
Authorization: Bearer {token}
```

#### Створити новий наряд (лише адмін)
```bash
POST /api/appointments
Authorization: Bearer {token}
Content-Type: application/json

{
  "client": "user_id",
  "mechanic": "mechanic_id",
  "date": "2024-05-13T10:00:00Z",
  "notes": "Клієнт скаржиться...",
  "repairItems": [
    {
      "inventoryId": "inventory_id",
      "quantity": 1
    }
  ]
}
```

#### Змінити статус наряду
```bash
PATCH /api/appointments/{id}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "in_progress"  # pending, in_progress, done
}
```

### Послуги та запчастини

#### Отримати список
```bash
GET /api/inventory
Authorization: Bearer {token}
```

#### Додати нову послугу (лише адмін)
```bash
POST /api/inventory
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Діагностика двигуна",
  "type": "service",  # service, part
  "price": 1000
}
```

### Користувачі

#### Отримати користувачів (лише адмін)
```bash
GET /api/users?role=mechanic
Authorization: Bearer {token}
```

#### Оновити користувача (лише адмін)
```bash
PUT /api/users/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "fullName": "Нове ім'я",
  "role": "mechanic"
}
```

---

## 👥 Тестові облікові записи

При першому запуску використовуйте адміна:

| Роль | Email | Пароль | Описання |
|------|-------|--------|---------|
| **Admin** | admin@sto.ua | admin | Адміністратор системи |

**Перші кроки:**
1. Залогіньтесь як адмін
2. Додайте механіків та клієнтів через Admin Dashboard
3. Почніть керувати нарядами

---

## 🗄️ Міграції БД

### Як працюють міграції

Міграції автоматично запускаються при старті backend:

```
Backend start
  ↓
MongoDB connect
  ↓
migration-runner перевіряє яких міграцій не було
  ↓
Запускає нові міграції (001-init.js)
  ↓
Записує в БД які міграції виконані
  ↓
Сервер запускається
```

### Перша міграція (001-init.js):
- ✅ Створює індекси для оптимізації
- ✅ Додає адміністратора (якщо нема)
- ✅ Додає базові послуги (8 послуг/запчастин)

### Ініціалізація БД через API (опціонально):

```bash
POST http://localhost:5000/api/seed
```

**Примітка:** `/api/seed` не перепише дані, якщо адмін вже існує.

---

## 🔐 Безпека

### Рекомендації для Production:

1. **JWT_SECRET:**
   ```bash
   # Генеруєте довгий випадковий ключ
   openssl rand -base64 32
   ```

2. **HTTPS/SSL:**
   - Налаштуйте SSL сертифікат на вашому сервері
   - Перенаправляйте HTTP на HTTPS

3. **CORS:**
   - Оновіть `backend/server.js` для production домену
   ```javascript
   app.use(cors({ origin: 'https://your-domain.com' }));
   ```

4. **Паролі:**
   - Поміняйте default пароль адміна
   - Використовуйте складні паролі

---

## 🐛 Troubleshooting

### Проблема: `docker: command not found`
```bash
# Встановіть Docker
# Windows/Mac: https://www.docker.com/products/docker-desktop
# Linux: sudo apt install docker.io docker-compose
```

### Проблема: Порт вже в використанні
```bash
# Змініть портів в docker-compose.yml
ports:
  - "3001:80"     # замість 3000
  - "5001:5000"   # замість 5000
```

### Проблема: MongoDB не підключується
```bash
# Перевірте логи
docker-compose logs mongodb

# Перевірте з'єднання
docker-compose exec backend mongosh mongodb://mongodb:27017
```

### Проблема: Frontend не завантажується
```bash
# Очистіть кеш та перебудуйте
docker-compose down -v
docker-compose up -d --build
```

### Прочитати логи:
```bash
# Всі контейнери
docker-compose logs -f

# Конкретний контейнер
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

---

## 📊 Health Check

Всі контейнери мають health checks:

```bash
# Перевірити статус
docker-compose ps

# Повина бути статус "healthy" для кожного сервісу
```

---

## 📝 Ліцензія

GPL-3.0 License — див. [LICENSE](LICENSE)

> Цей проєкт створено виключно в навчальних цілях.\
> © 2026 Ціпкайло А.І., Національний університет «Львівська політехніка».
---

**Версія:** 1.0.0  
**Оновлено:** Травень 2024
