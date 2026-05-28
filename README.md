# Письмо от тайного друга

Веб-приложение для анонимного обмена письмами-мотиваторами между участниками.

## Функционал

- Регистрация и авторизация через Firebase Auth
- Создание и редактирование анкет
- Случайное распределение участников (тайный друг)
- Отправка анонимных писем с вложениями (фото/видео)
- Получение и просмотр писем
- Административная панель для управления
- Email-уведомления

## Стек технологий

- **Frontend:** React + Vite
- **Backend:** Firebase (Auth, Firestore, Storage, Functions)
- **Деплой:** GitHub Pages / Firebase Hosting
- **Email:** SendGrid (через Firebase Functions)

## Настройка проекта

### 1. Создание проекта Firebase

1. Перейдите в [Firebase Console](https://console.firebase.google.com/)
2. Создайте новый проект
3. Включите:
   - Authentication (Email/Password)
   - Firestore Database
   - Storage
   - Functions (для уведомлений)

### 2. Настройка конфигурации

Замените данные в `src/config/firebase.js` на ваши из Firebase Console:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Установка зависимостей

```bash
npm install
```

### 4. Запуск в режиме разработки

```bash
npm run dev
```

### 5. Деплой на GitHub Pages

```bash
# Установите gh-pages глобально (если нужно)
npm install --save-dev gh-pages

# Создайте репозиторий на GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/secret-friend-letter.git
git push -u origin main

# Деплой
npm run deploy
```

### 6. Настройка Firebase Functions (опционально)

```bash
cd functions
npm install
cd ..

# Установите переменные окружения
firebase functions:config:set sendgrid.api_key="YOUR_SENDGRID_KEY" app.url="https://your-domain.com" email.from="noreply@your-domain.com"

# Деплой функций
npm run deploy:functions
```

## Структура проекта

```
secret-friend-letter/
├── src/
│   ├── config/          # Firebase конфигурация
│   ├── context/         # React контексты (Auth)
│   ├── pages/           # Страницы приложения
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   ├── ResetPassword.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Profile.jsx
│   │   ├── Letters.jsx
│   │   ├── WriteLetter.jsx
│   │   └── AdminPanel.jsx
│   ├── components/      # Переиспользуемые компоненты
│   ├── hooks/           # Кастомные хуки
│   ├── styles/          # CSS стили
│   └── utils/           # Утилиты
├── functions/           # Firebase Cloud Functions
├── public/              # Статические файлы
├── firebase.json        # Конфигурация Firebase
├── firestore.rules      # Правила Firestore
├── storage.rules        # Правила Storage
└── package.json
```

## Алгоритм распределения

1. Собираются все пользователи с заполненными анкетами
2. Массив перемешивается случайным образом
3. Каждый участник назначается следующему в цикле (последний → первый)
4. Гарантируется, что никто не назначен себе
5. Распределение фиксируется и не может быть изменено

## Ограничения бесплатного Firebase

- **Firestore:** 50,000 чтений/день, 20,000 записей/день
- **Storage:** 5 ГБ хранения
- **Functions:** 125,000 вызовов/месяц
- **Hosting:** 10 ГБ/месяц трафика

Для небольшого проекта этого достаточно.

## Лицензия

MIT
