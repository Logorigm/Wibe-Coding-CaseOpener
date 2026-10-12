/* Реестр контента: редкости, персонажи, кейсы + проверка данных */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const G = (window.GAME_DATA = window.GAME_DATA || {});
  G.characters = G.characters || [];
  G.cases = G.cases || [];
  G.achievements = G.achievements || [];
  G.promocodes = G.promocodes || [];
  const CFG = G.config;

  const D = {
    rarities: [],
    chars: [],
    cases: [],
    warnings: [],
    _r: {},
    _c: {},
    _k: {},
  };
  App.data = D;

  D.getRarity = (id) => D._r[id] || null;
  D.getChar = (id) => D._c[id] || null;
  D.getCase = (id) => D._k[id] || null;
  D.maxTier = () => D.rarities.length - 1;

  function warn(level, msg) {
    D.warnings.push({ level, msg });
  }

  function buildRarities() {
    const list = Array.isArray(CFG.rarities) && CFG.rarities.length ? CFG.rarities : [{ id: 'common', name: 'Обычная', color: '#aaa', weight: 1, value: 10 }];
    D.rarities = list.map((r, i) => Object.assign({ weight: 1, value: 10, dust: 1, craft: 10, color: '#999' }, r, { index: i }));
    D._r = {};
    D.rarities.forEach((r) => (D._r[r.id] = r));
  }

  function buildChars() {
    D.chars = [];
    D._c = {};
    G.characters.forEach((raw, idx) => {
      if (!raw || typeof raw !== 'object') return;
      if (!raw.id) {
        warn('error', `Персонаж №${idx + 1} без id — пропущен (${U.esc(raw.name || '')})`);
        return;
      }
      const id = String(raw.id);
      if (D._c[id]) {
        warn('error', `Повторяющийся id персонажа «${id}» — второй пропущен`);
        return;
      }
      let r = D._r[raw.rarity];
      if (!r) {
        warn('error', `У персонажа «${id}» неизвестная редкость «${raw.rarity}» — поставлена «${D.rarities[0].id}»`);
        r = D.rarities[0];
      }
      if (!raw.name) warn('warn', `У персонажа «${id}» нет имени`);
      const c = Object.assign({}, raw, {
        id,
        name: raw.name || id,
        rarity: r.id,
        r,
        value: raw.value != null && !isNaN(raw.value) ? Number(raw.value) : r.value,
        inCases: [],
      });
      D.chars.push(c);
      D._c[id] = c;
    });
  }

  // Разворачивает записи items: 'id' | {id, weight} | 'rarity:x' | 'series:x' | '*'
  function expandItems(cs, list, into) {
    (list || []).forEach((it) => {
      if (it == null) return;
      if (typeof it === 'string') {
        if (it === '*') {
          D.chars.forEach((c) => into.has(c.id) || into.set(c.id, null));
          return;
        }
        if (it.startsWith('rarity:')) {
          const rid = it.slice(7);
          if (!D._r[rid]) warn('error', `Кейс «${cs.id}»: неизвестная редкость в «${it}»`);
          D.chars.filter((c) => c.rarity === rid).forEach((c) => into.has(c.id) || into.set(c.id, null));
          return;
        }
        if (it.startsWith('series:')) {
          const s = it.slice(7).toLowerCase();
          const found = D.chars.filter((c) => String(c.series || '').toLowerCase() === s);
          if (!found.length) warn('warn', `Кейс «${cs.id}»: нет персонажей серии «${it.slice(7)}»`);
          found.forEach((c) => into.has(c.id) || into.set(c.id, null));
          return;
        }
        if (!D._c[it]) {
          warn('error', `Кейс «${cs.id}»: персонаж «${it}» не найден в characters.js`);
          return;
        }
        into.set(it, into.get(it) != null ? into.get(it) : null);
        return;
      }
      if (typeof it === 'object' && it.id) {
        if (!D._c[it.id]) {
          warn('error', `Кейс «${cs.id}»: персонаж «${it.id}» не найден в characters.js`);
          return;
        }
        into.set(it.id, it.weight != null ? Number(it.weight) : null);
      }
    });
  }

  function computePool(cs, entries) {
    const rw = {};
    D.rarities.forEach((r) => (rw[r.id] = r.weight));
    // rarityWeights кейса перекрывают стандартные веса из config.js
    if (cs.rarityWeights) Object.assign(rw, cs.rarityWeights);
    const count = {};
    entries.forEach(([cid, w]) => {
      if (w == null) {
        const r = D._c[cid].rarity;
        count[r] = (count[r] || 0) + 1;
      }
    });
    const pool = [];
    entries.forEach(([cid, w]) => {
      const ch = D._c[cid];
      const weight = w != null ? w : (Number(rw[ch.rarity]) || 0) / count[ch.rarity];
      if (weight > 0) pool.push({ cid, w: weight });
      else warn('warn', `Кейс «${cs.id}»: у «${ch.name}» нулевой шанс — он никогда не выпадет`);
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
    cs.price = Math.max(0, Number(cs.price) || 0);
    cs.requiredLevel = Math.max(1, Number(cs.requiredLevel) || 1);
    if (cs.currency !== 'gems') cs.currency = 'coins';
    const entries = new Map();
    expandItems(cs, raw.items, entries);
    D.chars.forEach((c) => {
      if (Array.isArray(c.cases) && c.cases.includes(id) && !entries.has(c.id)) entries.set(c.id, null);
    });
    cs.pool = computePool(cs, Array.from(entries.entries()));
    if (!cs.pool.length) warn('error', `Кейс «${id}» пустой — добавь персонажей в items`);
    if (cs.pity) {
      if (!D._r[cs.pity.rarity]) {
        warn('error', `Кейс «${id}»: в pity неизвестная редкость «${cs.pity.rarity}»`);
        cs.pity = null;
      } else if (!cs.pool.some((e) => D._c[e.cid].r.index >= D._r[cs.pity.rarity].index)) {
        warn('warn', `Кейс «${id}»: гарант на «${cs.pity.rarity}», но таких персонажей в кейсе нет`);
        cs.pity = null;
      } else cs.pity = { count: Math.max(1, Number(cs.pity.count) || 1), rarity: cs.pity.rarity };
    }
    return cs;
  }

  function buildCases() {
    D.cases = [];
    D._k = {};
    G.cases.forEach((raw, idx) => {
      if (!raw || typeof raw !== 'object') return;
      if (!raw.id) {
        warn('error', `Кейс №${idx + 1} без id — пропущен`);
        return;
      }
      if (D._k[String(raw.id)]) {
        warn('error', `Повторяющийся id кейса «${raw.id}» — второй пропущен`);
        return;
      }
      const cs = makeCase(raw);
      cs.pool.forEach((e) => D._c[e.cid].inCases.push(cs.id));
      D.cases.push(cs);
      D._k[cs.id] = cs;
    });
  }

  // Предпросмотр кейса для Конструктора: { cs, warnings }
  D.previewCase = (raw) => {
    const saved = D.warnings;
    D.warnings = [];
    let cs = null;
    try {
      cs = makeCase(Object.assign({ id: 'preview' }, raw));
    } catch (e) {
      warn('error', 'Ошибка: ' + e.message);
    }
    const w = D.warnings;
    D.warnings = saved;
    return { cs, warnings: w };
  };

  function checkRewardRefs(where, r) {
    if (!r) return;
    if (r.tickets) Object.keys(r.tickets).forEach((k) => D._k[k] || warn('warn', `${where}: билеты на несуществующий кейс «${k}»`));
    if (r.characters) r.characters.forEach((c) => {
      const id = typeof c === 'string' ? c : c && c.id;
      if (!D._c[id]) warn('warn', `${where}: несуществующий персонаж «${id}»`);
    });
  }

  function crossCheck() {
    D.chars.forEach((c) => {
      (c.cases || []).forEach((id) => D._k[id] || warn('warn', `Персонаж «${c.id}» ссылается на несуществующий кейс «${id}»`));
      if (!c.inCases.length) warn('info', `Персонаж «${c.name}» (${c.id}) не входит ни в один кейс — его можно получить только крафтом, контрактом или апгрейдом`);
    });
    (CFG.dailyRewards || []).forEach((r, i) => checkRewardRefs(`Ежедневная награда, день ${i + 1}`, r));
    for (let l = 2; l <= Math.min(100, CFG.levels.max); l++) {
      try { checkRewardRefs(`Награда за ${l} уровень`, CFG.levels.reward(l)); } catch (e) { warn('error', 'Ошибка в config.levels.reward: ' + e.message); break; }
    }
    ((CFG.shop && CFG.shop.tickets) || []).forEach((t) => D._k[t.caseId] || warn('warn', `Магазин: билеты на несуществующий кейс «${t.caseId}»`));
    (G.promocodes || []).forEach((p) => checkRewardRefs(`Промокод ${p.code}`, p.reward));
    (G.achievements || []).forEach((a) => checkRewardRefs(`Достижение ${a.id}`, a.reward));
    const wheel = CFG.games && CFG.games.wheel;
    if (wheel && wheel.daily) wheel.daily.forEach((p) => checkRewardRefs('Бесплатное колесо', p.reward));
    if (!D.chars.length) warn('error', 'Нет ни одного персонажа! Добавь их в data/characters.js');
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
    crossCheck();
    injectRarityCss();
    App.bus.emit('data');
  };

  /* ---------- цены и ценность ---------- */
  D.value = (cid, shiny) => {
    const c = D._c[cid];
    if (!c) return 0;
    return Math.round(c.value * (shiny ? CFG.shiny.valueMult : 1));
  };
  D.dust = (cid, shiny) => {
    const c = D._c[cid];
    if (!c) return 0;
    const base = c.dust != null ? c.dust : c.r.dust;
    return Math.round(base * (shiny ? CFG.shiny.dustMult : 1));
  };
  D.craftCost = (cid) => {
    const c = D._c[cid];
    if (!c) return Infinity;
    return c.craft != null ? c.craft : c.r.craft;
  };
  D.priceInCoins = (cs) => (cs.currency === 'gems' ? cs.price * (CFG.gemValue || 100) : cs.price);
  D.shinyChance = (cs) => (cs && cs.shinyChance != null ? cs.shinyChance : CFG.shiny.chance);
  D.caseEV = (cs) => {
    const sh = D.shinyChance(cs);
    const k = 1 + sh * (CFG.shiny.valueMult - 1);
    return cs.pool.reduce((s, e) => s + e.chance * D._c[e.cid].value * k, 0);
  };
  D.caseRTP = (cs) => {
    const p = D.priceInCoins(cs);
    return p > 0 ? D.caseEV(cs) / p : null;
  };
  D.byRarity = (rid) => D.chars.filter((c) => c.rarity === rid);
  D.seriesList = () => Array.from(new Set(D.chars.map((c) => c.series).filter(Boolean)));

  /* ---------- добавление во время игры (Конструктор) ---------- */
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
