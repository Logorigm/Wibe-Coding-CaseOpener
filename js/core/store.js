/* Сохранение прогресса и настроек (localStorage) */
(function () {
  'use strict';
  const App = window.App;
  const CFG = (window.GAME_DATA && window.GAME_DATA.config) || {};
  const SAVE_KEY = CFG.saveKey || 'waifudrop-save';
  const SETTINGS_KEY = SAVE_KEY + ':settings';
  const VERSION = 1;

  const DEFAULT_SETTINGS = {
    sound: true,
    volume: 0.5,
    animSpeed: 'normal', // normal | fast | instant
    particles: true,
    petals: true,
    reduceMotion: false,
    accent: 'sakura',
    liveFeed: true,
    confirmSell: 1000, // спрашивать подтверждение при продаже персонажей дороже N (0 — никогда)
    devMode: false,
  };

  function defaultState() {
    const now = Date.now();
    const start = CFG.start || {};
    return {
      version: VERSION,
      createdAt: now,
      lastSeen: now,
      profile: { name: 'Игрок', avatar: null, bio: '', frame: 'none', title: null, showcase: [] },
      coins: start.coins || 0,
      gems: start.gems || 0,
      dust: start.dust || 0,
      xp: 0,
      level: 1,
      inventory: [],
      serial: 0,
      collection: {},
      stats: {},
      achievements: {},
      quests: null,
      daily: { last: null, streak: 0 },
      wheel: { lastFree: null },
      cooldowns: {},
      tickets: {},
      pity: {},
      boosts: {},
      owned: { frames: ['none'] },
      promo: [],
      history: [],
      limits: {},
      lastBets: {},
      collectionClaims: {},
      welcomed: false,
    };
  }

  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

  function migrate(s) {
    const d = defaultState();
    if (!isObj(s)) return d;
    for (const k of Object.keys(d)) {
      if (s[k] === undefined || (s[k] === null && d[k] !== null)) s[k] = d[k];
      else if (isObj(d[k]) && isObj(s[k])) s[k] = Object.assign({}, d[k], s[k]);
    }
    if (!Array.isArray(s.inventory)) s.inventory = [];
    if (!Array.isArray(s.history)) s.history = [];
    if (!Array.isArray(s.promo)) s.promo = [];
    if (!Array.isArray(s.profile.showcase)) s.profile.showcase = [];
    if (!Array.isArray(s.owned.frames)) s.owned.frames = ['none'];
    ['coins', 'gems', 'dust', 'xp', 'level'].forEach((k) => {
      s[k] = Number(s[k]) || 0;
    });
    if (s.level < 1) s.level = 1;
    s.version = VERSION;
    return s;
  }

  let storageOk = true;
  function read(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      storageOk = false;
      return null;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      storageOk = false;
      return false;
    }
  }

  function loadState() {
    const raw = read(SAVE_KEY);
    if (raw) {
      try {
        return migrate(JSON.parse(raw));
      } catch (e) {
        console.error('Сохранение повреждено, начинаем заново', e);
        write(SAVE_KEY + ':broken-' + Date.now(), raw);
      }
    }
    return defaultState();
  }
  function loadSettings() {
    const raw = read(SETTINGS_KEY);
    let s = {};
    if (raw) {
      try { s = JSON.parse(raw) || {}; } catch (e) { s = {}; }
    }
    return Object.assign({}, DEFAULT_SETTINGS, s);
  }

  App.isNewPlayer = !read(SAVE_KEY);
  App.state = loadState();
  App.settings = loadSettings();

  let timer = null;
  App.store = {
    get available() {
      return storageOk;
    },
    save() {
      clearTimeout(timer);
      timer = null;
      App.state.lastSeen = Date.now();
      const ok = write(SAVE_KEY, JSON.stringify(App.state));
      if (!ok && App.ui && !App.store._warned) {
        App.store._warned = true;
        App.ui.toast('Не удалось сохранить прогресс — браузер запрещает localStorage', 'bad');
      }
    },
    dirty() {
      if (!timer) timer = setTimeout(() => App.store.save(), 500);
    },
    setSetting(key, value) {
      App.settings[key] = value;
      write(SETTINGS_KEY, JSON.stringify(App.settings));
      App.bus.emit('settings', { key, value });
    },
    resetSettings() {
      App.settings = Object.assign({}, DEFAULT_SETTINGS);
      write(SETTINGS_KEY, JSON.stringify(App.settings));
      App.bus.emit('settings', {});
    },
    exportSave() {
      App.store.save();
      return JSON.stringify({ game: CFG.title || 'WaifuDrop', exportedAt: new Date().toISOString(), state: App.state }, null, 1);
    },
    importSave(text) {
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Файл не похож на сохранение (ошибка JSON)');
      }
      const st = data && data.state ? data.state : data;
      if (!isObj(st) || !('inventory' in st) || !('coins' in st)) throw new Error('В файле нет данных сохранения');
      clearTimeout(timer);
      timer = null;
      write(SAVE_KEY, JSON.stringify(migrate(st)));
      App.store._frozen = true;
      location.reload();
    },
    reset() {
      clearTimeout(timer);
      timer = null;
      try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
      App.store._frozen = true;
      location.reload();
    },
    defaultState,
  };

  const flush = () => {
    if (!App.store._frozen) App.store.save();
  };
  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flush();
  });
})();
