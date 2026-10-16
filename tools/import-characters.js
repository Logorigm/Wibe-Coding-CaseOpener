#!/usr/bin/env node
/* ============================================================================
 *  Импорт персонажей из папок
 *  ----------------------------------------------------------------------------
 *  Раскладываешь картинки так:
 *
 *    characters/<кейс>/<редкость>/<Имя>.png
 *
 *  например:
 *    characters/02-pink-capsule/5-legendary/Рем.png
 *    characters/02-pink-capsule/1-common/Мэй Татибана.webp
 *
 *  и запускаешь:   node tools/import-characters.js
 *
 *  Скрипт создаёт файл data/characters.auto.js — игра подхватывает его сама.
 *  На GitHub это делает сборка автоматически при каждой отправке файлов.
 *
 *  Правила:
 *    - папка кейса = id кейса из data/cases.js (номер в начале, «02-», можно не писать);
 *    - папка редкости = id редкости (common, uncommon, rare, epic, legendary, mythic)
 *      или её название по-русски (обычная, необычная, редкая, эпическая, легендарная, мифическая);
 *    - имя персонажа = имя файла (подчёркивания превращаются в пробелы);
 *    - один и тот же файл-имя в разных кейсах = один персонаж в нескольких кейсах;
 *    - рядом можно положить <Имя>.txt со строками:
 *        серия: Re:Zero
 *        описание: Горничная особняка Розвааля
 *        цена: 5000            (необязательно — иначе считается сама)
 *      (или просто текст — он станет описанием)
 *
 *  Запуск без Node: отправь картинки на GitHub (Add file → Upload files) —
 *  сборка APK сама выполнит импорт и сохранит data/characters.auto.js.
 * ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'characters');
const OUT = path.join(ROOT, 'data', 'characters.auto.js');
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.svg']);

function loadGameData() {
  // data/*.js написаны для браузера: window — это глобальный объект
  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of ['config.js', 'cases.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'), sandbox, { filename: f });
  }
  return sandbox.GAME_DATA || {};
}

const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
const slug = (s) =>
  String(s || '')
    .toLowerCase()
    .split('')
    .map((c) => (TR[c] != null ? TR[c] : c))
    .join('')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
const stripPrefix = (s) => String(s).replace(/^\d+[-_. ]+/, '').trim();
const isDir = (p) => {
  try { return fs.statSync(p).isDirectory(); } catch (e) { return false; }
};
const jsStr = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ') + "'";

function readSidecar(file) {
  const base = file.replace(/\.[^.]+$/, '');
  for (const ext of ['.txt', '.md']) {
    const p = base + ext;
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8').replace(/^﻿/, '').trim();
    const out = {};
    const free = [];
    text.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([^:]{2,20}):\s*(.+)$/);
      const key = m && m[1].trim().toLowerCase();
      if (m && ['серия', 'тайтл', 'series'].includes(key)) out.series = m[2].trim();
      else if (m && ['описание', 'description'].includes(key)) out.description = m[2].trim();
      else if (m && ['цена', 'value', 'стоимость'].includes(key) && !isNaN(parseFloat(m[2]))) out.value = parseFloat(m[2]);
      else if (line.trim()) free.push(line.trim());
    });
    if (!out.description && free.length) out.description = free.join(' ');
    return out;
  }
  return {};
}

function main() {
  const G = loadGameData();
  const rarities = (G.config && G.config.rarities) || [];
  const caseIds = new Set((G.cases || []).map((c) => String(c.id)));
  const findRarity = (dir) => {
    const k = stripPrefix(dir).toLowerCase();
    return rarities.find((r) => r.id.toLowerCase() === k || String(r.name).toLowerCase() === k) || null;
  };
  const warnings = [];
  const chars = new Map(); // id -> character
  const nameToId = new Map();

  if (isDir(SRC)) {
    const caseDirs = fs.readdirSync(SRC).filter((d) => !d.startsWith('.') && isDir(path.join(SRC, d))).sort();
    for (const caseDir of caseDirs) {
      const caseId = stripPrefix(caseDir);
      if (!caseIds.has(caseId)) warnings.push(`Папка characters/${caseDir}: кейса «${caseId}» нет в data/cases.js`);
      const caseDirPath = path.join(SRC, caseDir);
      for (const entry of fs.readdirSync(caseDirPath).sort()) {
        const full = path.join(caseDirPath, entry);
        if (!isDir(full)) {
          if (IMAGE_EXT.has(path.extname(entry).toLowerCase())) warnings.push(`characters/${caseDir}/${entry}: картинка лежит без папки редкости — пропущена`);
          continue;
        }
        const rarity = findRarity(entry);
        if (!rarity) {
          warnings.push(`characters/${caseDir}/${entry}: непонятная редкость — используй ${rarities.map((r) => r.id).join(', ')}`);
          continue;
        }
        for (const file of fs.readdirSync(full).sort()) {
          const ext = path.extname(file).toLowerCase();
          if (!IMAGE_EXT.has(ext)) continue;
          const name = file.slice(0, -ext.length).replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
          if (!name) continue;
          let id = nameToId.get(name);
          if (id && chars.has(id)) {
            const c = chars.get(id);
            if (!c.cases.includes(caseId)) c.cases.push(caseId);
            if (c.rarity !== rarity.id) warnings.push(`«${name}» лежит в разных редкостях (${c.rarity} и ${rarity.id}) — взята ${c.rarity}`);
            continue;
          }
          let base = slug(name) || 'char';
          id = base;
          for (let n = 2; [...chars.values()].some((c) => c.id === id); n++) id = `${base}_${n}`;
          nameToId.set(name, id);
          const image = ['characters', caseDir, entry, file].map(encodeURIComponent).join('/');
          const extra = readSidecar(path.join(full, file));
          chars.set(id, Object.assign({ id, name, rarity: rarity.id, cases: [caseId], image }, extra));
        }
      }
    }
  }

  const list = [...chars.values()];
  const lines = list.map((c) => {
    const parts = [`id: ${jsStr(c.id)}`, `name: ${jsStr(c.name)}`, `rarity: ${jsStr(c.rarity)}`, `cases: [${c.cases.map(jsStr).join(', ')}]`, `image: ${jsStr(c.image)}`];
    if (c.series) parts.push(`series: ${jsStr(c.series)}`);
    if (c.description) parts.push(`description: ${jsStr(c.description)}`);
    if (c.value) parts.push(`value: ${Number(c.value)}`);
    return `  { ${parts.join(', ')} },`;
  });
  const out = [
    '// ⚠️ Этот файл создаётся автоматически командой  node tools/import-characters.js',
    '// из картинок в папке characters/. Не редактируй его вручную — изменения пропадут.',
    'window.GAME_DATA = window.GAME_DATA || {};',
    'GAME_DATA.autoCharacters = [',
    ...lines,
    '];',
    '',
  ].join('\n');
  const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (prev !== out) fs.writeFileSync(OUT, out);

  // отчёт
  const byCase = {};
  list.forEach((c) => c.cases.forEach((k) => {
    byCase[k] = byCase[k] || {};
    byCase[k][c.rarity] = (byCase[k][c.rarity] || 0) + 1;
  }));
  console.log(`Найдено персонажей: ${list.length}${prev === out ? ' (без изменений)' : ' → data/characters.auto.js обновлён'}`);
  Object.keys(byCase).forEach((k) => console.log(`  ${k}: ` + rarities.filter((r) => byCase[k][r.id]).map((r) => `${r.id} ${byCase[k][r.id]}`).join(', ')));
  warnings.forEach((w) => console.log('  ⚠ ' + w));
}

main();
