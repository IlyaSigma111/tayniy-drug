// Очистка: удаляет всех тестовых пользователей (uid с префиксом test-uid-)
// Запуск: node scripts/clean-test.js <путь-к-serviceAccountKey.json>

import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const SERVICE_ACCOUNT_PATH = process.argv[2];
if (!SERVICE_ACCOUNT_PATH) {
  console.error('Укажите путь к serviceAccountKey.json');
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

async function clean() {
  console.log('Удаление тестовых пользователей...\n');

  const snapshot = await db.collection('users')
    .where('uid', '>=', 'test-uid-')
    .where('uid', '<', 'test-uid-\uf8ff')
    .get();

  if (snapshot.empty) {
    console.log('Тестовые пользователи не найдены');
    await admin.app().delete();
    return;
  }

  console.log(`Найдено ${snapshot.size} тестовых пользователей`);

  let deleted = 0;
  const batchSize = 30;

  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + batchSize);

    for (const doc of chunk) {
      batch.delete(doc.ref);
    }

    await batch.commit();
    deleted += chunk.length;
    console.log(`  ✓ Удалено ${deleted} / ${docs.length}`);
  }

  // Также очищаем назначения от реальных пользователей, если тесты затронули
  console.log('\nСброс назначений у реальных пользователей...');
  const assigned = await db.collection('users')
    .where('assignedTo', '!=', null)
    .get();

  for (let i = 0; i < assigned.docs.length; i += batchSize) {
    const batch = db.batch();
    const chunk = assigned.docs.slice(i, i + batchSize);

    for (const doc of chunk) {
      if (doc.data().uid.startsWith('test-uid-')) continue;
      batch.update(doc.ref, {
        assignedTo: null,
        distributionLocked: false
      });
    }

    await batch.commit();
  }

  console.log('✓ Готово! Все тестовые данные удалены.');
  await admin.app().delete();
}

clean().catch(err => {
  console.error('Ошибка:', err);
  process.exit(1);
});
