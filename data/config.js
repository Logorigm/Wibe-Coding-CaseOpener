/* ============================================================================
 *  ГЛАВНЫЙ КОНФИГ ИГРЫ
 *  ----------------------------------------------------------------------------
 *  Здесь настраивается всё, кроме персонажей и кейсов:
 *  валюты, редкости, уровни, ежедневные награды, мини-игры, магазин и т.д.
 *
 *  Персонажи  → data/characters.js
 *  Кейсы      → data/cases.js
 *  Достижения → data/achievements.js
 *  Задания    → data/quests.js
 *  Промокоды  → data/promocodes.js
 * ========================================================================== */
window.GAME_DATA = window.GAME_DATA || {};

GAME_DATA.config = {
  title: 'WaifuDrop',
  subtitle: 'аниме кейс-симулятор',

  // Ключ сохранения в браузере. Если поменять — у всех начнётся новый прогресс.
  saveKey: 'waifudrop-save-v1',

  // Стартовый баланс нового игрока
  start: { coins: 1500, gems: 25, dust: 0 },

  // Сколько монет «стоит» 1 кристалл (нужно для расчёта опыта и окупаемости кейсов за кристаллы)
  gemValue: 100,

  /* --------------------------------------------------------------------------
   *  РЕДКОСТИ
   *  id     — используется в characters.js (rarity: 'epic')
   *  name   — название в интерфейсе
   *  color  — цвет рамки/свечения
   *  weight — базовый шанс выпадения редкости из кейса (относительный, ~в процентах)
   *  value  — базовая цена продажи персонажа (если у персонажа не указана своя value)
   *  dust   — сколько звёздной пыли даёт распыление
   *  craft  — сколько пыли стоит создать персонажа
   *  Порядок важен: от самой частой к самой редкой.
   * ------------------------------------------------------------------------ */
  rarities: [
    { id: 'common',    name: 'Обычная',     color: '#a3aec2', weight: 55,  value: 10,   dust: 1,   craft: 8 },
    { id: 'uncommon',  name: 'Необычная',   color: '#4ade80', weight: 25,  value: 30,   dust: 3,   craft: 24 },
    { id: 'rare',      name: 'Редкая',      color: '#3b9bff', weight: 12,  value: 100,  dust: 10,  craft: 80 },
    { id: 'epic',      name: 'Эпическая',   color: '#b45cff', weight: 5.5, value: 350,  dust: 35,  craft: 280 },
    { id: 'legendary', name: 'Легендарная', color: '#ffb020', weight: 2,   value: 1200, dust: 120, craft: 960 },
    { id: 'mythic',    name: 'Мифическая',  color: '#ff3d71', weight: 0.5, value: 5000, dust: 500, craft: 4000, rainbow: true },
  ],

  // «Шайни» — редкая сияющая версия любого персонажа (голографический эффект)
  shiny: {
    chance: 0.015,   // 1.5% шанс, что выпавший персонаж будет шайни
    valueMult: 3,    // шайни стоит в 3 раза дороже
    dustMult: 3,     // и даёт в 3 раза больше пыли
  },

  /* --------------------------------------------------------------------------
   *  УРОВНИ
   * ------------------------------------------------------------------------ */
  levels: {
    max: 100,
    xpBase: 80,      // опыт до следующего уровня = xpBase * (уровень ^ xpPower)
    xpPower: 1.45,
    xpPerCoin: 0.25, // опыт за каждую монету, потраченную на кейсы
    xpPerBet: 0.04,  // опыт за каждую монету, поставленную в мини-играх

    // Награда за новый уровень. Это обычная функция — меняй как хочешь.
    reward(level) {
      const r = { coins: 150 + level * 50 };
      if (level % 5 === 0) r.gems = 5 + level;
      if (level % 10 === 0) r.tickets = { divine: 1 };
      return r;
    },

    // Титулы игрока по уровню
    titles: [
      { level: 1,   name: 'Новичок' },
      { level: 3,   name: 'Любитель аниме' },
      { level: 6,   name: 'Отаку' },
      { level: 10,  name: 'Коллекционер' },
      { level: 15,  name: 'Сенпай' },
      { level: 20,  name: 'Охотник за вайфу' },
      { level: 30,  name: 'Сенсей' },
      { level: 40,  name: 'Мастер гачи' },
      { level: 50,  name: 'Легенда' },
      { level: 75,  name: 'Аниме-божество' },
      { level: 100, name: 'Император вайфу' },
    ],
  },

  // Ежедневная награда за вход (7 дней по кругу). Пропустил день — серия сбрасывается.
  dailyRewards: [
    { coins: 150 },
    { coins: 300 },
    { gems: 5 },
    { coins: 500, tickets: { sakura: 1 } },
    { gems: 10 },
    { coins: 1000 },
    { gems: 25, tickets: { divine: 1 } },
  ],

  // С какого уровня открываются разделы
  unlocks: { battles: 2, upgrade: 2, contracts: 3 },

  // Апгрейд: шанс = (ставка / цель) * (1 - houseEdge), но не больше maxChance
  upgrade: { houseEdge: 0.05, maxChance: 0.9, maxItems: 8 },

  // Контракт: N персонажей одной редкости → 1 персонаж следующей редкости
  contracts: {
    inputCount: 5,
    newCharBias: 0.6,    // шанс, что выпадет персонаж, которого у тебя ещё нет (если такие есть)
    shinyPerInput: 0.12, // каждый шайни во входе даёт +12% шанса на шайни результат
  },

  battles: { maxRounds: 10 },

  // Помощь при банкротстве (если не на что открыть даже самый дешёвый кейс)
  bankrupt: { coins: 300, cooldownMinutes: 30 },

  /* --------------------------------------------------------------------------
   *  МИНИ-ИГРЫ
   * ------------------------------------------------------------------------ */
  games: {
    minBet: 10,
    maxBet: 50000,

    crash:    { houseEdge: 0.04, speed: 0.11, maxMultiplier: 1000 },
    mines:    { houseEdge: 0.03 },
    coinflip: { payout: 1.94 },
    dice:     { houseEdge: 0.03 },

    wheel: {
      modes: [
        { id: 'low',    name: 'Низкий риск',  segments: [1.5, 1.2, 0, 1.2, 1.5, 0, 1.2, 1.5, 0, 1.5] },
        { id: 'medium', name: 'Средний риск', segments: [0, 1.5, 0, 2, 0, 1.5, 0, 3, 0, 1.5, 0, 2, 0, 0, 1.5, 0, 4, 0, 2, 0] },
        { id: 'high',   name: 'Высокий риск', segments: [20, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      // Бесплатное колесо (раз в день). weight — относительный шанс.
      daily: [
        { reward: { coins: 100 },                weight: 25 },
        { reward: { coins: 250 },                weight: 20 },
        { reward: { gems: 3 },                   weight: 15 },
        { reward: { coins: 500 },                weight: 12 },
        { reward: { tickets: { sakura: 2 } },    weight: 10 },
        { reward: { gems: 10 },                  weight: 8 },
        { reward: { coins: 1500 },               weight: 6 },
        { reward: { gems: 30 },                  weight: 3 },
        { reward: { tickets: { divine: 1 } },    weight: 1 },
      ],
    },

    // Слоты: 3 барабана, выигрыш по центральной линии.
    // x3 — множитель за три одинаковых, x2 — за два одинаковых слева.
    slots: {
      symbols: [
        { id: 'onigiri', icon: '🍙', weight: 24, x3: 8,   x2: 1.5 },
        { id: 'dango',   icon: '🍡', weight: 21, x3: 12,  x2: 2 },
        { id: 'sakura',  icon: '🌸', weight: 18, x3: 18,  x2: 2.5 },
        { id: 'neko',    icon: '🐱', weight: 15, x3: 30,  x2: 3.5 },
        { id: 'ribbon',  icon: '🎀', weight: 11, x3: 50,  x2: 5 },
        { id: 'gem',     icon: '💎', weight: 7,  x3: 100, x2: 8 },
        { id: 'crown',   icon: '👑', weight: 4,  x3: 500, x2: 15 },
      ],
    },

    // Мемори — бесплатная игра на память. Награда только за первые N побед в день.
    memory: {
      dailyRewarded: 10,
      modes: [
        { id: 'easy',   name: 'Лёгкий',  cols: 4, rows: 3, reward: 60 },
        { id: 'normal', name: 'Средний', cols: 4, rows: 4, reward: 120 },
        { id: 'hard',   name: 'Сложный', cols: 6, rows: 4, reward: 240 },
      ],
    },
  },

  /* --------------------------------------------------------------------------
   *  МАГАЗИН
   * ------------------------------------------------------------------------ */
  shop: {
    // Покупка кристаллов за монеты
    gemPacks: [
      { gems: 10,  price: 1200 },
      { gems: 55,  price: 6000 },
      { gems: 120, price: 12000 },
    ],
    // Продажа кристаллов: 1 кристалл = N монет
    gemSellRate: 60,

    boosts: [
      { id: 'xp2',  icon: '⚡', name: 'Двойной опыт', desc: 'Весь опыт за действия ×2 в течение 30 минут', price: { gems: 15 }, type: 'xp', mult: 2, minutes: 30 },
      { id: 'luck', icon: '🍀', name: 'Удача сенпая', desc: 'Шанс эпических и выше ×1.5 на следующие 10 открытий кейсов', price: { gems: 20 }, type: 'luck', mult: 1.5, charges: 10 },
    ],

    // Билеты = бесплатные открытия конкретного кейса
    tickets: [
      { caseId: 'sakura', amount: 3, price: { gems: 3 } },
      { caseId: 'neko',   amount: 3, price: { gems: 5 } },
      { caseId: 'divine', amount: 3, price: { gems: 20 } },
    ],
  },

  // Рамки аватара. price — купить в магазине, level — открывается на уровне, achievement — за достижение
  frames: [
    { id: 'none',    name: 'Без рамки' },
    { id: 'sakura',  name: 'Сакура',    price: { gems: 30 } },
    { id: 'ice',     name: 'Лёд',       price: { gems: 30 } },
    { id: 'gold',    name: 'Золото',    level: 10 },
    { id: 'neon',    name: 'Неон',      price: { gems: 80 } },
    { id: 'galaxy',  name: 'Галактика', price: { gems: 150 } },
    { id: 'rainbow', name: 'Радуга',    level: 25 },
    { id: 'fire',    name: 'Пламя',     achievement: 'mythic_1' },
  ],

  // Имена ботов (лента дропов, батлы)
  bots: [
    'Kawaii_Killer', 'СенпайЗаметьМеня', 'NekoLover', 'OtakuKing', 'ТянМечты', 'xX_Waifu_Xx',
    'Бака-сан', 'MoonPrincess', 'ДедИнсайд', 'Shiro', 'Акацуки228', 'GachaAddict', 'Tsundere_Bot',
    'Пельмень', 'LuckyCat', 'Хикикомори', 'DokiDoki', 'Сёнэн_Джамп', 'Rem_Forever', 'Ня_Ня',
    'Ramen_Master', 'КотЛапкин', 'StarDust', 'ИсекайМен', 'Onii-chan', 'Сакуровый_Лис',
  ],
};
