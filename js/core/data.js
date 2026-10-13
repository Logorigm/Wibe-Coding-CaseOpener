/* Реестр контента: редкости, персонажи, кейсы, демо-заполнение, автоцены и проверка данных.
 *
 * Как считается цена персонажа:
 *   у каждого кейса есть цена и окупаемость rtp (например 0.9 = в среднем возвращается 90% цены).
 *   Персонажи «своего» (домашнего) кейса получают цены так, чтобы средний дроп кейса
 *   был ровно rtp × цена. Внутри кейса цены соотносятся по множителю редкости valueMult
 *   (например, легендарная в 120 раз дороже обычной из того же кейса).
 *   Если у персонажа указана своя value — используется она. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const G = (window.GAME_DATA = window.GAME_DATA || {});
  G.characters = G.characters || [];
  G.autoCharacters = G.autoCharacters || [];
  G.cases = G.cases || [];
  G.achievements = G.achievements || [];
  G.promocodes = G.promocodes || [];
  const CFG = G.config;

  const ECO = () =>
    Object.assign(
      { baseValue: 10, defaultRtp: 0.9, freeCaseValue: 30, dustRate: 0.25, craftRate: 1, scaleBase: 100 },
      CFG.economy || {}
    );

  const D = { rarities: [], chars: [], cases: [], warnings: [], _r: {}, _c: {}, _k: {} };
  App.data = D;

  D.getRarity = (id) => D._r[id] || null;
  D.getChar = (id) => D._c[id] || null;
  D.getCase = (id) => D._k[id] || null;
  D.maxTier = () => D.rarities.length - 1;

  function warn(level, msg) {
    D.warnings.push({ level, msg });
  }

  /* ============================ Редкости ============================ */
  function buildRarities() {
    const list = Array.isArray(CFG.rarities) && CFG.rarities.length ? CFG.rarities : [{ id: 'common', name: 'Обычная', color: '#aaa', weight: 1 }];
    const base = Number(list[0].value) || 10;
    D.rarities = list.map((r, i) => {
      const valueMult = r.valueMult != null ? Number(r.valueMult) : r.value != null ? Number(r.value) / base : Math.pow(3.3, i);
      return Object.assign({ weight: 1, color: '#999' }, r, { index: i, valueMult: valueMult > 0 ? valueMult : 1 });
    });
    D._r = {};
    D.rarities.forEach((r) => (D._r[r.id] = r));
  }

  // Редкость по id или по русскому названию («легендарная»)
  D.findRarity = (s) => {
    const k = String(s || '').trim().toLowerCase().replace(/^\d+[-_. ]*/, '');
    return D.rarities.find((r) => r.id.toLowerCase() === k || String(r.name).toLowerCase() === k) || null;
  };

  /* ============================ Демо-персонажи ============================ */
  // Кейс считается «пустым», если в нём ничего не указано (items пуст) и ни один твой персонаж
  // не ссылается на него через cases. Пустые кейсы заполняются демо-персонажами из data/demo.js.
  function isEmptyCase(raw, userChars) {
    if (Array.isArray(raw.items) && raw.items.some((it) => it != null && it !== '')) return false;
    return !userChars.some((c) => c && Array.isArray(c.cases) && c.cases.includes(raw.id));
  }

  const DEMO_GIVEN = ['Ай', 'Акира', 'Аюми', 'Тихиро', 'Эмико', 'Фуюми', 'Хинако', 'Хотару', 'Идзуми', 'Дзюн', 'Канна', 'Кэй', 'Кирара', 'Котонэ', 'Маки', 'Мана', 'Мао', 'Мицуки', 'Мию', 'Наоми', 'Нацуми', 'Нодока', 'Рэна', 'Рин', 'Сая', 'Сакико', 'Сацуки', 'Сидзуку', 'Суми', 'Тиаки', 'Томоэ', 'Цугуми', 'Умэ', 'Ёко', 'Юи', 'Юкари', 'Юмэ', 'Ая', 'Хикару', 'Мидори', 'Нагиса', 'Касуми', 'Аяка', 'Икуми', 'Мисаки', 'Рикка', 'Сэйра', 'Фуука', 'Харуна', 'Ироха', 'Канаэ', 'Минори', 'Саки', 'Ханаэ', 'Юзу', 'Аканэ', 'Каэдэ', 'Нао', 'Сион', 'Тамаки'];
  const DEMO_FAMILY = ['Аояма', 'Фудзивара', 'Хасэгава', 'Икэда', 'Камияма', 'Кимура', 'Кондо', 'Мацумото', 'Мураками', 'Накамура', 'Нисимура', 'Огава', 'Окада', 'Сайто', 'Сакамото', 'Симидзу', 'Сузуки', 'Такахаси', 'Танака', 'Ватанабэ', 'Ямада', 'Ямамото', 'Ёсимура', 'Хосино', 'Цукино', 'Сираиси', 'Кураки', 'Минамото', 'Тэндо', 'Акацуки'];

  function demoCharacters(raw, used) {
    const demo = G.demo || {};
    const per = Object.assign({ common: 3, uncommon: 2, rare: 2, epic: 2, legendary: 1, mythic: 1 }, demo.perRarity || {});
    const rw = {};
    D.rarities.forEach((r) => (rw[r.id] = r.weight));
    if (raw.rarityWeights) Object.assign(rw, raw.rarityWeights);
    const out = [];
    const curated = (demo.characters || []).filter((c) => c && c.case === raw.id && D._r[c.rarity]);
    curated.forEach((c) => out.push(Object.assign({}, c, { cases: [raw.id], demo: true })));
    const rng = U.seeded('demo:' + raw.id);
    D.rarities.forEach((r) => {
      const w = Number(rw[r.id]) || 0;
      let need = w >= 1 ? per[r.id] || 1 : w >= 0.2 ? 1 : 0;
      need -= curated.filter((c) => c.rarity === r.id).length;
      for (let i = 0; i < need; i++) {
        let name = '';
        for (let t = 0; t < 20 && (!name || used.has(name)); t++) name = `${U.pick(DEMO_GIVEN, rng)} ${U.pick(DEMO_FAMILY, rng)}`;
        used.add(name);
        out.push({
          id: `demo_${raw.id}_${r.id}_${i + 1}`,
          name,
          rarity: r.id,
          series: raw.name || raw.id,
          description: `Демо-персонаж кейса «${raw.name || raw.id}». Добавь своих персонажей в этот кейс — и демо исчезнут.`,
          cases: [raw.id],
          demo: true,
        });
      }
    });
    return out;
  }

  /* ============================ Персонажи ============================ */
  function collectRawChars() {
    const list = [];
    const seen = new Set();
    const add = (raw, source, idx) => {
      if (!raw || typeof raw !== 'object') return;
      if (!raw.id) {
        warn('error', `Персонаж №${idx + 1} (${source}) без id — пропущен ${U.esc(raw.name || '')}`);
        return;
      }
      const id = String(raw.id);
      if (seen.has(id)) {
        if (source === 'folder') warn('info', `Персонаж «${id}» из папки characters/ уже описан в characters.js — используется описание из characters.js`);
        else warn('error', `Повторяющийся id персонажа «${id}» — второй пропущен`);
        return;
      }
      seen.add(id);
      list.push(Object.assign({}, raw, { id, _source: source }));
    };
    G.characters.forEach((c, i) => add(c, 'manual', i));
    G.autoCharacters.forEach((c, i) => add(c, 'folder', i));
    const demo = G.demo || {};
    D.demoCases = [];
    if (demo.enabled !== false && !(CFG.economy && CFG.economy.demoFill === false)) {
      const used = new Set(list.map((c) => c.name));
      G.cases.forEach((raw) => {
        if (!raw || !raw.id || !isEmptyCase(raw, list)) return;
        D.demoCases.push(String(raw.id));
        demoCharacters(raw, used).forEach((c, i) => add(c, 'demo', i));
      });
    }
    return list;
  }

  function buildChars() {
    D.chars = [];
    D._c = {};
    collectRawChars().forEach((raw) => {
      let r = D._r[raw.rarity] || D.findRarity(raw.rarity);
      if (!r) {
        warn('error', `У персонажа «${raw.id}» неизвестная редкость «${raw.rarity}» — поставлена «${D.rarities[0].id}»`);
        r = D.rarities[0];
      }
      if (!raw.name) warn('warn', `У персонажа «${raw.id}» нет имени`);
      const c = Object.assign({}, raw, {
        name: raw.name || raw.id,
        rarity: r.id,
        r,
        fixedValue: raw.value != null && !isNaN(raw.value) && Number(raw.value) > 0 ? Number(raw.value) : null,
        value: null,
        home: null,
        inCases: [],
      });
      D.chars.push(c);
      D._c[c.id] = c;
    });
  }

  /* ============================ Кейсы ============================ */
  // items: 'id' | {id, weight} | 'rarity:x' | 'series:x' | 'case:x' | '*'
  // direct = персонаж указан явно (может считаться «домашним» для кейса)
  function expandItems(cs, list, into) {
    const put = (cid, w, direct) => {
      const prev = into.get(cid);
      if (prev && prev.w != null && w == null) return;
      into.set(cid, { w, direct: direct || (prev ? prev.direct : false) });
    };
    (list || []).forEach((it) => {
      if (it == null || it === '') return;
      if (typeof it === 'string') {
        if (it === '*') return D.chars.forEach((c) => into.has(c.id) || put(c.id, null, false));
        if (it.startsWith('rarity:')) {
          const r = D.findRarity(it.slice(7));
          if (!r) return warn('error', `Кейс «${cs.id}»: неизвестная редкость в «${it}»`);
          return D.chars.filter((c) => c.rarity === r.id).forEach((c) => into.has(c.id) || put(c.id, null, false));
        }
        if (it.startsWith('series:')) {
          const s = it.slice(7).toLowerCase();
          const found = D.chars.filter((c) => String(c.series || '').toLowerCase() === s);
          if (!found.length) warn('warn', `Кейс «${cs.id}»: нет персонажей серии «${it.slice(7)}»`);
          return found.forEach((c) => into.has(c.id) || put(c.id, null, false));
        }
        if (it.startsWith('case:')) {
          const other = it.slice(5);
          const members = D.chars.filter((c) => c._members && c._members.has(other));
          if (!G.cases.some((k) => k && String(k.id) === other)) warn('error', `Кейс «${cs.id}»: в «${it}» указан несуществующий кейс`);
          return members.forEach((c) => into.has(c.id) || put(c.id, null, false));
        }
        if (!D._c[it]) return warn('error', `Кейс «${cs.id}»: персонаж «${it}» не найден`);
        return put(it, null, true);
      }
      if (typeof it === 'object' && it.id) {
        if (!D._c[it.id]) return warn('error', `Кейс «${cs.id}»: персонаж «${it.id}» не найден`);
        put(String(it.id), it.weight != null ? Number(it.weight) : null, true);
      }
    });
  }

  function computePool(cs, entries) {
    const rw = {};
    D.rarities.forEach((r) => (rw[r.id] = r.weight));
    if (cs.rarityWeights) Object.assign(rw, cs.rarityWeights);
    const count = {};
    entries.forEach(([cid, e]) => {
      if (e.w == null) {
        const r = D._c[cid].rarity;
        count[r] = (count[r] || 0) + 1;
      }
    });
    const pool = [];
    entries.forEach(([cid, e]) => {
      const ch = D._c[cid];
      const weight = e.w != null ? e.w : (Number(rw[ch.rarity]) || 0) / count[ch.rarity];
      if (weight > 0) pool.push({ cid, w: weight, direct: e.direct });
      else if (e.direct) warn('warn', `Кейс «${cs.id}»: у «${ch.name}» нулевой шанс — он никогда не выпадет (проверь rarityWeights)`);
    });
    const total = pool.reduce((s, e) => s + e.w, 0) || 1;
    pool.forEach((e) => (e.chance = e.w / total));
    pool.sort((a, b) => D._c[b.cid].r.index - D._c[a.cid].r.index || a.chance - b.chance || D._c[a.cid].name.localeCompare(D._c[b.cid].name));
    return pool;
  }

  // Собирает объект кейса из «сырых» данных (без регистрации в игре)
  function makeCase(raw) {
    const id = String(raw.id);
    const cs = Object.assign(
      { price: 0, currency: 'coins', category: 'standard', color: '#ff6fb5', requiredLevel: 1, emblem: 'star' },
      raw,
      { id, name: raw.name || id }
    );
    cs.autoPrice = raw.price === 'auto';
    cs.price = cs.autoPrice ? 0 : Math.max(0, Number(cs.price) || 0);
    cs.requiredLevel = Math.max(1, Number(cs.requiredLevel) || 1);
    cs.rtp = raw.rtp != null && Number(raw.rtp) > 0 ? Number(raw.rtp) : ECO().defaultRtp;
    if (cs.currency !== 'gems') cs.currency = 'coins';
    const entries = new Map();
    expandItems(cs, raw.items, entries);
    D.chars.forEach((c) => {
      if (Array.isArray(c.cases) && c.cases.includes(id)) {
        const prev = entries.get(c.id);
        entries.set(c.id, { w: prev ? prev.w : null, direct: true });
      }
    });
    cs.pool = computePool(cs, Array.from(entries.entries()));
    cs.demo = (D.demoCases || []).includes(id);
    if (!cs.pool.length) warn('error', `Кейс «${id}» пустой — добавь в него персонажей`);
    if (cs.pity) {
      const pr = D.findRarity(cs.pity.rarity);
      if (!pr) {
        warn('error', `Кейс «${id}»: в pity неизвестная редкость «${cs.pity.rarity}»`);
        cs.pity = null;
      } else if (!cs.pool.some((e) => D._c[e.cid].r.index >= pr.index)) {
        cs.pity = null;
      } else cs.pity = { count: Math.max(1, Number(cs.pity.count) || 1), rarity: pr.id };
    }
    return cs;
  }

  function buildCases() {
    D.cases = [];
    D._k = {};
    // членство в кейсах «напрямую» — для селектора case:
    D.chars.forEach((c) => (c._members = new Set(Array.isArray(c.cases) ? c.cases : [])));
    G.cases.forEach((raw) => {
      if (!raw || !Array.isArray(raw.items)) return;
      raw.items.forEach((it) => {
        const cid = typeof it === 'string' ? it : it && it.id;
        if (cid && D._c[cid]) D._c[cid]._members.add(String(raw.id));
      });
    });
    G.cases.forEach((raw, idx) => {
      if (!raw || typeof raw !== 'object') return;
      if (!raw.id) return warn('error', `Кейс №${idx + 1} без id — пропущен`);
      if (D._k[String(raw.id)]) return warn('error', `Повторяющийся id кейса «${raw.id}» — второй пропущен`);
      const cs = makeCase(raw);
      cs.pool.forEach((e) => D._c[e.cid].inCases.push(cs.id));
      D.cases.push(cs);
      D._k[cs.id] = cs;
    });
    // «домашний» кейс персонажа: первый из его cases, иначе первый кейс, где он указан явно
    D.chars.forEach((c) => {
      const own = (Array.isArray(c.cases) ? c.cases : []).find((k) => D._k[k] && D._k[k].pool.some((e) => e.cid === c.id));
      const direct = D.cases.find((cs) => cs.pool.some((e) => e.cid === c.id && e.direct));
      const any = D.cases.find((cs) => cs.pool.some((e) => e.cid === c.id));
      c.home = own || (direct && direct.id) || (any && any.id) || null;
    });
  }

  /* ============================ Автоцены ============================ */
  const shinyK = (cs) => 1 + D.shinyChance(cs) * (CFG.shiny.valueMult - 1);
  function niceRound(v) {
    if (v < 1000) return Math.max(1, Math.round(v));
    if (v < 10000) return Math.round(v / 10) * 10;
    if (v < 100000) return Math.round(v / 100) * 100;
    return Math.round(v / 1000) * 1000;
  }
  const fallbackValue = (c) => niceRound(ECO().baseValue * c.r.valueMult);
  // средний дроп кейса без учёта шайни, который нужен под цену и rtp
  function targetBaseEV(cs, priceCoins) {
    const p = priceCoins != null ? priceCoins : cs.price > 0 ? D.priceInCoins(cs) : ECO().freeCaseValue / cs.rtp;
    return (cs.rtp * p) / shinyK(cs);
  }
  // посчитать множитель k для «своих» персонажей кейса; valueOf(cid) — уже известные цены
  function solveK(cs, isOwn, valueOf, priceCoins) {
    let fixed = 0;
    let mass = 0;
    cs.pool.forEach((e) => {
      const c = D._c[e.cid];
      if (isOwn(c)) mass += e.chance * c.r.valueMult;
      else fixed += e.chance * (valueOf(c) || 0);
    });
    if (mass <= 0) return null;
    const k = (targetBaseEV(cs, priceCoins) - fixed) / mass;
    return k > 0 ? k : null;
  }

  function priceAll() {
    D.chars.forEach((c) => (c.value = c.fixedValue));
    const isOwnOf = (cs) => (c) => c.home === cs.id && c.fixedValue == null;
    const pending = D.cases.filter((cs) => cs.pool.length && !cs.autoPrice);
    let guard = 0;
    while (pending.length && guard++ < 500) {
      let progressed = false;
      for (let i = 0; i < pending.length; i++) {
        const cs = pending[i];
        const isOwn = isOwnOf(cs);
        const waiting = cs.pool.some((e) => {
          const c = D._c[e.cid];
          return !isOwn(c) && c.value == null;
        });
        if (waiting) continue;
        let k = solveK(cs, isOwn, (c) => c.value);
        if (k) {
          // цены округляются до целых — подбираем k так, чтобы средний дроп после округления
          // попал в цель как можно точнее
          let fixed = 0;
          const own = [];
          cs.pool.forEach((e) => {
            const c = D._c[e.cid];
            if (isOwn(c)) own.push([e.chance, c.r.valueMult]);
            else fixed += e.chance * (c.value || 0);
          });
          const need = targetBaseEV(cs) - fixed;
          const evAt = (kk) => own.reduce((sum, [ch, m]) => sum + ch * niceRound(kk * m), 0);
          let bestK = k;
          let bestErr = Math.abs(evAt(k) - need);
          for (let t = -120; t <= 120 && bestErr > 0; t++) {
            const kk = k * (1 + t / 400);
            const err = Math.abs(evAt(kk) - need);
            if (err < bestErr - 1e-9) {
              bestErr = err;
              bestK = kk;
            }
          }
          k = bestK;
        }
        cs.pool.forEach((e) => {
          const c = D._c[e.cid];
          if (isOwn(c)) c.value = k ? niceRound(k * c.r.valueMult) : fallbackValue(c);
        });
        if (k == null && cs.pool.some((e) => isOwn(D._c[e.cid]))) warn('warn', `Кейс «${cs.id}»: не удалось подобрать цены персонажей под окупаемость ${Math.round(cs.rtp * 100)}% — проверь цену кейса и свои value`);
        pending.splice(i, 1);
        i--;
        progressed = true;
      }
      if (!progressed) {
        // взаимные ссылки — оцениваем оставшихся по базовой цене редкости
        pending.forEach((cs) => cs.pool.forEach((e) => {
          const c = D._c[e.cid];
          if (c.value == null && c.home !== cs.id) c.value = fallbackValue(c);
        }));
      }
    }
    D.chars.forEach((c) => {
      if (c.value == null) c.value = fallbackValue(c);
    });
    // кейсы с price: 'auto' — цена из среднего дропа
    D.cases.filter((cs) => cs.autoPrice).forEach((cs) => {
      const ev = D.caseEV(cs);
      const coins = ev / cs.rtp;
      cs.price = cs.currency === 'gems' ? Math.max(1, Math.round(coins / (CFG.gemValue || 100))) : niceRound(coins);
    });
  }

  /* ============================ Проверки ============================ */
  function checkRewardRefs(where, r) {
    if (!r) return;
    if (r.tickets) Object.keys(r.tickets).forEach((k) => D._k[k] || warn('warn', `${where}: билеты на несуществующий кейс «${k}»`));
    if (r.characters)
      r.characters.forEach((c) => {
        const id = typeof c === 'string' ? c : c && c.id;
        if (!D._c[id]) warn('warn', `${where}: несуществующий персонаж «${id}»`);
      });
  }

  function crossCheck() {
    D.chars.forEach((c) => {
      (c.cases || []).forEach((id) => D._k[id] || warn('warn', `Персонаж «${c.id}» ссылается на несуществующий кейс «${id}»`));
      if (!c.inCases.length) warn('info', `Персонаж «${c.name}» (${c.id}) не входит ни в один кейс — его можно получить только крафтом или апгрейдом`);
    });
    (CFG.dailyRewards || []).forEach((r, i) => checkRewardRefs(`Ежедневная награда, день ${i + 1}`, r));
    for (let l = 2; l <= Math.min(100, CFG.levels.max); l++) {
      try {
        checkRewardRefs(`Награда за ${l} уровень`, CFG.levels.reward(l, D.levelInfo(l)));
      } catch (e) {
        warn('error', 'Ошибка в config.levels.reward: ' + e.message);
        break;
      }
    }
    ((CFG.shop && CFG.shop.tickets) || []).forEach((t) => D._k[t.caseId] || warn('warn', `Магазин: билеты на несуществующий кейс «${t.caseId}»`));
    (G.promocodes || []).forEach((p) => checkRewardRefs(`Промокод ${p.code}`, p.reward));
    (G.achievements || []).forEach((a) => checkRewardRefs(`Достижение ${a.id}`, a.reward));
    const wheel = CFG.games && CFG.games.wheel;
    if (wheel && wheel.daily) wheel.daily.forEach((p) => checkRewardRefs('Бесплатное колесо', p.reward));
    if (D.demoCases.length) warn('info', `Демо-персонажи заполняют кейсы: ${D.demoCases.join(', ')}. Добавь в них своих персонажей — демо исчезнут.`);
    if (!D.chars.length) warn('error', 'Нет ни одного персонажа! Добавь их в data/characters.js или в папку characters/');
    if (!D.cases.length) warn('error', 'Нет ни одного кейса! Добавь их в data/cases.js');
  }

  function injectRarityCss() {
    let css = '';
    D.rarities.forEach((r) => {
      const [R, Gg, B] = U.hexToRgb(r.color);
      css += `.r-${r.id}{--rc:${r.color};--rc-rgb:${R},${Gg},${B};--rc-dark:${U.shade(r.color, -0.6)};--rc-light:${U.shade(r.color, 0.4)}}\n`;
    });
    let el = document.getElementById('rarity-css');
    if (!el) {
      el = document.createElement('style');
      el.id = 'rarity-css';
      document.head.appendChild(el);
    }
    el.textContent = css;
  }

  D.rebuild = function () {
    D.warnings = [];
    buildRarities();
    buildChars();
    buildCases();
    priceAll();
    crossCheck();
    injectRarityCss();
    App.bus.emit('data');
  };

  /* ============================ Цены и ценность ============================ */
  D.value = (cid, shiny) => {
    const c = D._c[cid];
    if (!c) return 0;
    return Math.round(c.value * (shiny ? CFG.shiny.valueMult : 1));
  };
  D.dust = (cid, shiny) => {
    const c = D._c[cid];
    if (!c) return 0;
    if (c.dust != null) return Math.round(c.dust * (shiny ? CFG.shiny.dustMult : 1));
    return Math.max(1, Math.round(D.value(cid, shiny) * ECO().dustRate));
  };
  D.craftCost = (cid) => {
    const c = D._c[cid];
    if (!c) return Infinity;
    if (c.craft != null) return c.craft;
    return Math.max(1, Math.round(D.value(cid, false) * ECO().craftRate));
  };
  D.priceInCoins = (cs) => (cs.currency === 'gems' ? cs.price * (CFG.gemValue || 100) : cs.price);
  D.shinyChance = (cs) => (cs && cs.shinyChance != null ? cs.shinyChance : CFG.shiny.chance);
  D.caseEV = (cs) => cs.pool.reduce((s, e) => s + e.chance * (D._c[e.cid].value || 0), 0) * shinyK(cs);
  D.caseRTP = (cs) => {
    const p = D.priceInCoins(cs);
    return p > 0 ? D.caseEV(cs) / p : null;
  };
  D.homeCase = (cid) => {
    const c = D._c[cid];
    return c && c.home ? D._k[c.home] : null;
  };
  // Оценка цены персонажа редкости rid, если положить его в кейс caseId (для Конструктора)
  D.estimateValue = (caseId, rid) => {
    const r = D.findRarity(rid) || D.rarities[0];
    const cs = D._k[caseId];
    if (!cs) return niceRound(ECO().baseValue * r.valueMult);
    const own = cs.pool.map((e) => D._c[e.cid]).filter((c) => c.home === cs.id && c.fixedValue == null && c.value);
    if (own.length) {
      const ks = own.map((c) => c.value / c.r.valueMult).sort((a, b) => a - b);
      return niceRound(ks[Math.floor(ks.length / 2)] * r.valueMult);
    }
    const k = solveK(cs, (c) => c.fixedValue == null, (c) => c.value);
    return niceRound((k || ECO().baseValue) * r.valueMult);
  };
  D.byRarity = (rid) => D.chars.filter((c) => c.rarity === rid);
  D.seriesList = () => Array.from(new Set(D.chars.map((c) => c.series).filter(Boolean)));

  // Кейсы «лестницы»: за монеты, не бесплатные, по уровню и цене
  D.ladder = () =>
    D.cases
      .filter((cs) => !cs.hidden && cs.currency === 'coins' && cs.price > 0 && !cs.cooldown)
      .sort((a, b) => a.requiredLevel - b.requiredLevel || a.price - b.price);
  // Самый крупный кейс за монеты, доступный на уровне
  D.bestCaseFor = (level) => {
    const list = D.ladder().filter((cs) => cs.requiredLevel <= level);
    return list.reduce((best, cs) => (!best || cs.price > best.price ? cs : best), null);
  };
  D.levelInfo = (level) => {
    const best = D.bestCaseFor(level);
    return {
      bestCasePrice: best ? best.price : ECO().scaleBase,
      bestCase: best,
      newCases: D.cases.filter((cs) => !cs.hidden && cs.requiredLevel === level),
    };
  };

  /* ============================ Предпросмотр (Конструктор) ============================ */
  D.previewCase = (raw) => {
    const saved = D.warnings;
    D.warnings = [];
    let cs = null;
    try {
      cs = makeCase(Object.assign({ id: '__preview' }, raw));
      // «свои» = персонажи, у которых ещё нет другого домашнего кейса
      const isOwn = (c) => c.fixedValue == null && (!c.home || c.home === raw.id);
      const k = solveK(cs, isOwn, (c) => c.value);
      cs.previewValues = {};
      cs.pool.forEach((e) => {
        const c = D._c[e.cid];
        cs.previewValues[c.id] = isOwn(c) ? (k ? niceRound(k * c.r.valueMult) : fallbackValue(c)) : c.value;
      });
      const ev = cs.pool.reduce((s, e) => s + e.chance * cs.previewValues[e.cid], 0) * shinyK(cs);
      if (cs.autoPrice) {
        const coins = ev / cs.rtp;
        cs.price = cs.currency === 'gems' ? Math.max(1, Math.round(coins / (CFG.gemValue || 100))) : niceRound(coins);
      }
      cs.previewEV = ev;
    } catch (e) {
      warn('error', 'Ошибка: ' + e.message);
    }
    const w = D.warnings;
    D.warnings = saved;
    return { cs, warnings: w };
  };

  /* ============================ Добавление во время игры ============================ */
  D.upsertCharacter = (raw) => {
    const i = G.characters.findIndex((c) => c && c.id === raw.id);
    if (i >= 0) G.characters[i] = raw;
    else G.characters.push(raw);
    D.rebuild();
  };
  D.upsertCase = (raw) => {
    const i = G.cases.findIndex((c) => c && c.id === raw.id);
    if (i >= 0) G.cases[i] = raw;
    else G.cases.push(raw);
    D.rebuild();
  };
})();
