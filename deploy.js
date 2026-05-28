import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = path.join(__dirname, 'dist');

if (!fs.existsSync(BUILD_DIR)) {
  console.error('Папка сборки не найдена. Сначала выполните: npm run build');
  process.exit(1);
}

const nojekyllPath = path.join(BUILD_DIR, '.nojekyll');

if (!fs.existsSync(nojekyllPath)) {
  console.log('Создание .nojekyll...');
  fs.writeFileSync(nojekyllPath, '');
} else {
  console.log('.nojekyll уже существует');
}

const public404 = path.join(__dirname, 'public', '404.html');
const dist404 = path.join(BUILD_DIR, '404.html');

if (fs.existsSync(public404) && !fs.existsSync(dist404)) {
  console.log('Копирование 404.html в dist...');
  fs.copyFileSync(public404, dist404);
} else if (fs.existsSync(dist404)) {
  console.log('404.html уже существует в dist');
}

console.log('Подготовка завершена!');
