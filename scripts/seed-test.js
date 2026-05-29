// Тестовый скрипт: создаёт 89 фейковых пользователей в Firestore
// Запуск: node scripts/seed-test.js <путь-к-serviceAccountKey.json>
//
// Как получить serviceAccountKey.json:
// 1. Firebase Console → Project settings → Service accounts
// 2. "Generate new private key" → скачать JSON
// 3. Передать путь к файлу как аргумент

import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const SERVICE_ACCOUNT_PATH = process.argv[2];
if (!SERVICE_ACCOUNT_PATH) {
  console.error('Укажите путь к serviceAccountKey.json');
  console.error('  node scripts/seed-test.js ./serviceAccountKey.json');
  process.exit(1);
}

const absPath = resolve(SERVICE_ACCOUNT_PATH);
if (!existsSync(absPath)) {
  console.error(`Файл не найден: ${absPath}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(absPath, 'utf-8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const FIRST_NAMES = [
  'Александр', 'Максим', 'Артём', 'Иван', 'Дмитрий', 'Кирилл', 'Никита', 'Даниил',
  'Егор', 'Андрей', 'Владислав', 'Роман', 'Тимофей', 'Сергей', 'Николай', 'Владимир',
  'Анна', 'Мария', 'Екатерина', 'Ольга', 'Елена', 'Наталья', 'Дарья', 'Анастасия',
  'Ирина', 'Татьяна', 'Светлана', 'Юлия', 'Алиса', 'Полина', 'Виктория', 'Ксения',
  'Алексей', 'Павел', 'Денис', 'Глеб', 'Матвей', 'Лев', 'Ярослав', 'Михаил',
  'София', 'Валерия', 'Арина', 'Варвара', 'Елизавета', 'Алёна', 'Маргарита', 'Вероника',
  'Пётр', 'Георгий', 'Семён', 'Фёдор', 'Тимур', 'Арсений', 'Марк', 'Мирослав',
  'Василиса', 'Милана', 'Евгения', 'Ульяна', 'Любовь', 'Надежда', 'Александра', 'Таисия'
];

const LAST_NAMES = [
  'Иванов', 'Петров', 'Сидоров', 'Смирнов', 'Кузнецов', 'Попов', 'Васильев', 'Зайцев',
  'Соколов', 'Михайлов', 'Фёдоров', 'Морозов', 'Волков', 'Алексеев', 'Лебедев', 'Семёнов',
  'Егоров', 'Павлов', 'Козлов', 'Степанов', 'Николаев', 'Орлов', 'Андреев', 'Макаров',
  'Иванова', 'Петрова', 'Смирнова', 'Кузнецова', 'Попова', 'Васильева', 'Зайцева',
  'Соколова', 'Михайлова', 'Фёдорова', 'Морозова', 'Волкова', 'Алексеева', 'Лебедева'
];

const REGIONS = [
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань', 'Нижний Новгород',
  'Челябинск', 'Самара', 'Омск', 'Ростов-на-Дону', 'Уфа', 'Красноярск', 'Воронеж',
  'Пермь', 'Волгоград', 'Краснодар', 'Тюмень', 'Иркутск', 'Владивосток', 'Хабаровск',
  'Ярославль', 'Тверь', 'Тула', 'Калуга', 'Смоленск'
];

const BIOS = [
  'Люблю путешествовать и открывать новые места. Мечтаю побывать на всех континентах.',
  'Увлекаюсь фотографией, особенно люблю снимать закаты и городские пейзажи.',
  'Занимаюсь волонтёрством и помогаю приютам для животных. Моя цель — сделать мир добрее.',
  'Обожаю читать классическую литературу и коллекционирую редкие издания.',
  'Профессиональный музыкант, играю на фортепиано и гитаре. Сочиняю собственные мелодии.',
  'Спорт — моя жизнь. Бегаю марафоны, занимаюсь кроссфитом и йогой.',
  'Программист по профессии, художник в душе. Пишу маслом и занимаюсь digital-артом.',
  'Обожаю готовить и экспериментировать с рецептами. Мечтаю открыть свою кондитерскую.',
  'Преподаю английский язык и обожаю знакомиться с людьми из разных культур.',
  'Заядлый путешественник, объездил 30 стран. Могу рассказать много интересных историй.',
  'Коллекционирую виниловые пластинки и обожаю атмосферу старых кофеен.',
  'Студент медицинского университета. Верю, что доброта лечит не хуже лекарств.',
  'Танцую сальсу и бачату. Танец — это способ выразить эмоции без слов.',
  'Пишу стихи и короткие рассказы. Участвовал в нескольких литературных конкурсах.',
  'Люблю активный отдых: походы, скалолазание, сплавы по рекам. Природа — моё вдохновение.'
];

function random(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function pickBio(firstName) {
  const base = random(BIOS);
  const personal = Math.random() > 0.5
    ? ` Меня зовут ${firstName}.`
    : '';
  return `${firstName}${personal} ${base}`;
}

async function seed() {
  console.log('Создание 89 тестовых пользователей...\n');

  const batchSize = 30; // Firestore batch limit
  let users = [];

  for (let i = 0; i < 89; i++) {
    const firstName = random(FIRST_NAMES);
    const lastName = random(LAST_NAMES);
    const fullName = `${firstName} ${lastName}`;
    const email = `test.user${i + 1}.${Date.now()}@example.com`;
    const region = random(REGIONS);
    const bio = pickBio(firstName);
    const profilePhoto = Math.random() > 0.3
      ? `https://i.pravatar.cc/200?u=${i}`
      : '';

    users.push({
      uid: `test-uid-${i + 1}-${Date.now()}`,
      email,
      fullName,
      region,
      bio,
      profilePhoto,
      profileCompleted: true,
      role: 'user',
      createdAt: new Date().toISOString()
    });
  }

  // Удаляем дубликаты uid (если перезапускают скрипт)
  const seen = new Set();
  users = users.filter(u => {
    if (seen.has(u.uid)) return false;
    seen.add(u.uid);
    return true;
  });
  users = users.slice(0, 89);

  console.log(`Сгенерировано ${users.length} пользователей\n`);

  // Пишем батчами
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = db.batch();
    const chunk = users.slice(i, i + batchSize);

    for (const user of chunk) {
      const ref = db.collection('users').doc(user.uid);
      batch.set(ref, user);
    }

    await batch.commit();
    console.log(`  ✓ Записано ${Math.min(i + batchSize, users.length)} / ${users.length}`);
  }

  console.log('\n✓ Все 89 пользователей созданы!');
  console.log('\nТеперь зайдите в админ-панель https://ilyasigma111.github.io/tayniy-drug/#/admin');
  console.log('и нажмите "Распределить".\n');

  const snapshot = await db.collection('users')
    .where('profileCompleted', '==', true)
    .where('assignedTo', '==', null)
    .get();
  console.log(`Готово к распределению: ${snapshot.size} пользователей`);

  await admin.app().delete();
}

seed().catch(err => {
  console.error('Ошибка:', err);
  process.exit(1);
});
