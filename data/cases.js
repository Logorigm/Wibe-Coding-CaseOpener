/* ============================================================================
 *  КЕЙСЫ
 *  ----------------------------------------------------------------------------
 *  На каждом уровне открываются 3–4 новых кейса. Чем выше уровень — тем дороже
 *  кейсы и тем выше их окупаемость (rtp), поэтому выгодно переходить к новым.
 *  У каждого кейса свои персонажи — их собирают в «Коллекции».
 *
 *  ПОЛЯ КЕЙСА
 *    id            — уникальный id латиницей (его же используй в cases у персонажа
 *                    и в имени папки characters/)
 *    name          — название
 *    requiredLevel — с какого уровня открывается
 *    price         — цена в монетах (0 = бесплатно)
 *    rtp           — окупаемость: 0.9 = в среднем игрок получает 90% цены кейса.
 *                    По ней автоматически считаются цены персонажей кейса.
 *    risk          — подпись разброса: low | mid | high | elite (только для интерфейса)
 *    image         — картинка кейса
 *    color         — цвет подсветки
 *    rarityWeights — шансы редкостей (шанс редкости делится поровну между её персонажами)
 *    items         — кто лежит в кейсе (можно не заполнять — хватит cases: ['id'] у персонажа
 *                    или картинки в папке characters/). Варианты: 'rem' | { id: 'rem', weight: 0.5 } |
 *                    'rarity:epic' | 'series:Re:Zero' | 'case:neko' (персонажи другого кейса) | '*'
 *    cooldown      — для бесплатного кейса: раз в N минут
 *    hidden        — скрыть кейс
 *
 *  Пока в кейсе нет твоих персонажей, он заполнен демо-персонажами (data/demo.js).
 * ========================================================================== */
window.GAME_DATA = window.GAME_DATA || {};

GAME_DATA.cases = [
  /* ── Бесплатный подарок раз в час: персонажи кейсов первого уровня ── */
  { id: 'gift', name: 'Подарок', requiredLevel: 1, price: 0, cooldown: 60, color: '#ff8fc4',
    image: 'assets/cases/gift.webp',
    items: ['case:tan-suitcase', 'case:pink-capsule', 'case:crate-05'],
    rarityWeights: { common: 70, uncommon: 24, rare: 5.5, epic: 0.5, legendary: 0, mythic: 0 } },

  /* ── Уровень 1 ── */
  { id: 'tan-suitcase', name: 'Чемоданчик', requiredLevel: 1, price: 30, rtp: 0.8, risk: 'low', color: '#bf8b4c',
    image: 'assets/cases/tan-suitcase.webp', rarityWeights: { common: 58, uncommon: 32, rare: 10, epic: 1.8, legendary: 0.15, mythic: 0.012 } },
  { id: 'pink-capsule', name: 'Розовая капсула', requiredLevel: 1, price: 40, rtp: 0.8, risk: 'mid', color: '#bf719b',
    image: 'assets/cases/pink-capsule.webp', rarityWeights: { common: 64, uncommon: 25, rare: 8.5, epic: 2.2, legendary: 0.3, mythic: 0.04 } },
  { id: 'crate-05', name: 'Ящик WD-05', requiredLevel: 1, price: 55, rtp: 0.8, risk: 'high', color: '#bf6d34',
    image: 'assets/cases/crate-05.webp', rarityWeights: { common: 80, uncommon: 20, rare: 5.9, epic: 2.0, legendary: 0.48, mythic: 0.1 } },

  /* ── Уровень 2 ── */
  { id: 'ribbon-box', name: 'Коробка с лентой', requiredLevel: 2, price: 50, rtp: 0.81, risk: 'low', color: '#bfac7c',
    image: 'assets/cases/ribbon-box.webp', rarityWeights: { common: 54, uncommon: 33, rare: 12, epic: 2.1, legendary: 0.19, mythic: 0.016 } },
  { id: 'mint-case', name: 'Мятный кейс', requiredLevel: 2, price: 65, rtp: 0.81, risk: 'mid', color: '#30cbd1',
    image: 'assets/cases/mint-case.webp', rarityWeights: { common: 60, uncommon: 25, rare: 10, epic: 2.6, legendary: 0.38, mythic: 0.053 } },
  { id: 'festive-gift', name: 'Праздничный подарок', requiredLevel: 2, price: 90, rtp: 0.81, risk: 'high', color: '#d3564e',
    image: 'assets/cases/festive-gift.webp', rarityWeights: { common: 76, uncommon: 20, rare: 7.0, epic: 2.3, legendary: 0.61, mythic: 0.13 } },

  /* ── Уровень 3 ── */
  { id: 'lavender-suitcase', name: 'Лавандовый чемодан', requiredLevel: 3, price: 75, rtp: 0.82, risk: 'low', color: '#907cbf',
    image: 'assets/cases/lavender-suitcase.webp', rarityWeights: { common: 51, uncommon: 33, rare: 14, epic: 2.4, legendary: 0.24, mythic: 0.021 } },
  { id: 'frost-capsule', name: 'Капсула холода', requiredLevel: 3, price: 100, rtp: 0.82, risk: 'mid', color: '#6da0bf',
    image: 'assets/cases/frost-capsule.webp', rarityWeights: { common: 57, uncommon: 25, rare: 12, epic: 3.0, legendary: 0.48, mythic: 0.07 } },
  { id: 'hazard-case', name: 'Осторожно: хрупкое', requiredLevel: 3, price: 140, rtp: 0.82, risk: 'high', color: '#dba536',
    image: 'assets/cases/hazard-case.webp', rarityWeights: { common: 71, uncommon: 20, rare: 8.1, epic: 2.7, legendary: 0.77, mythic: 0.17 } },

  /* ── Уровень 4 ── */
  { id: 'star-shrine', name: 'Звёздный домик', requiredLevel: 4, price: 110, rtp: 0.83, risk: 'low', color: '#bf5d7b',
    image: 'assets/cases/star-shrine.webp', rarityWeights: { common: 48, uncommon: 33, rare: 16, epic: 2.8, legendary: 0.3, mythic: 0.028 } },
  { id: 'star-orb', name: 'Звёздный шар', requiredLevel: 4, price: 150, rtp: 0.83, risk: 'mid', color: '#a362cb',
    image: 'assets/cases/star-orb.webp', rarityWeights: { common: 53, uncommon: 25, rare: 13, epic: 3.5, legendary: 0.61, mythic: 0.092 } },
  { id: 'crate-13', name: 'Ящик WD-13', requiredLevel: 4, price: 200, rtp: 0.83, risk: 'high', color: '#bfb645',
    image: 'assets/cases/crate-13.webp', rarityWeights: { common: 67, uncommon: 20, rare: 9.2, epic: 3.2, legendary: 0.97, mythic: 0.23 } },

  /* ── Уровень 5 ── */
  { id: 'blue-suitcase', name: 'Синий чемодан', requiredLevel: 5, price: 170, rtp: 0.84, risk: 'low', color: '#3c4fbf',
    image: 'assets/cases/blue-suitcase.webp', rarityWeights: { common: 45, uncommon: 33, rare: 18, epic: 3.3, legendary: 0.38, mythic: 0.037 } },
  { id: 'sapphire-orb', name: 'Сапфировый шар', requiredLevel: 5, price: 220, rtp: 0.84, risk: 'mid', color: '#6277ce',
    image: 'assets/cases/sapphire-orb.webp', rarityWeights: { common: 50, uncommon: 25, rare: 15, epic: 4.1, legendary: 0.77, mythic: 0.12 } },
  { id: 'pirate-chest', name: 'Пиратский сундук', requiredLevel: 5, price: 300, rtp: 0.84, risk: 'high', color: '#bf6843',
    image: 'assets/cases/pirate-chest.webp', rarityWeights: { common: 62, uncommon: 20, rare: 10, epic: 3.7, legendary: 1.2, mythic: 0.31 } },
  { id: 'crystal-shrine', name: 'Кристальный домик', requiredLevel: 5, price: 390, rtp: 0.84, risk: 'elite', color: '#bf5761',
    image: 'assets/cases/crystal-shrine.webp', rarityWeights: { common: 20, uncommon: 20, rare: 18, epic: 6.6, legendary: 1.1, mythic: 0.17 } },

  /* ── Уровень 6 ── */
  { id: 'jade-briefcase', name: 'Нефритовый кейс', requiredLevel: 6, price: 260, rtp: 0.85, risk: 'low', color: '#36d397',
    image: 'assets/cases/jade-briefcase.webp', rarityWeights: { common: 42, uncommon: 33, rare: 19, epic: 3.9, legendary: 0.48, mythic: 0.049 } },
  { id: 'lab-cube', name: 'Лабораторный куб', requiredLevel: 6, price: 340, rtp: 0.85, risk: 'mid', color: '#8b61bf',
    image: 'assets/cases/lab-cube.webp', rarityWeights: { common: 46, uncommon: 25, rare: 16, epic: 4.8, legendary: 0.97, mythic: 0.16 } },
  { id: 'neon-case', name: 'Неоновый кейс', requiredLevel: 6, price: 460, rtp: 0.85, risk: 'high', color: '#d342c6',
    image: 'assets/cases/neon-case.webp', rarityWeights: { common: 58, uncommon: 20, rare: 11, epic: 4.4, legendary: 1.6, mythic: 0.4 } },

  /* ── Уровень 7 ── */
  { id: 'aqua-egg', name: 'Бирюзовое яйцо', requiredLevel: 7, price: 380, rtp: 0.86, risk: 'low', color: '#70abcb',
    image: 'assets/cases/aqua-egg.webp', rarityWeights: { common: 38, uncommon: 33, rare: 21, epic: 4.5, legendary: 0.61, mythic: 0.064 } },
  { id: 'silver-capsule', name: 'Серебряная капсула', requiredLevel: 7, price: 500, rtp: 0.86, risk: 'mid', color: '#7c82bf',
    image: 'assets/cases/silver-capsule.webp', rarityWeights: { common: 43, uncommon: 25, rare: 18, epic: 5.7, legendary: 1.2, mythic: 0.21 } },
  { id: 'crate-21', name: 'Ящик WD-21', requiredLevel: 7, price: 680, rtp: 0.86, risk: 'high', color: '#a0bf57',
    image: 'assets/cases/crate-21.webp', rarityWeights: { common: 53, uncommon: 20, rare: 12, epic: 5.1, legendary: 2.0, mythic: 0.53 } },
  { id: 'violet-cube', name: 'Фиалковый куб', requiredLevel: 7, price: 880, rtp: 0.86, risk: 'elite', color: '#8d68bf',
    image: 'assets/cases/violet-cube.webp', rarityWeights: { common: 17, uncommon: 20, rare: 21, epic: 9.1, legendary: 1.8, mythic: 0.3 } },

  /* ── Уровень 8 ── */
  { id: 'ember-briefcase', name: 'Огненный кейс', requiredLevel: 8, price: 560, rtp: 0.87, risk: 'low', color: '#d85b3f',
    image: 'assets/cases/ember-briefcase.webp', rarityWeights: { common: 35, uncommon: 33, rare: 23, epic: 5.3, legendary: 0.77, mythic: 0.085 } },
  { id: 'plasma-capsule', name: 'Плазменная капсула', requiredLevel: 8, price: 750, rtp: 0.87, risk: 'mid', color: '#639ebf',
    image: 'assets/cases/plasma-capsule.webp', rarityWeights: { common: 39, uncommon: 26, rare: 19, epic: 6.6, legendary: 1.5, mythic: 0.28 } },
  { id: 'amethyst-cube', name: 'Аметистовый куб', requiredLevel: 8, price: 1000, rtp: 0.87, risk: 'high', color: '#6069d7',
    image: 'assets/cases/amethyst-cube.webp', rarityWeights: { common: 49, uncommon: 20, rare: 13, epic: 6.0, legendary: 2.5, mythic: 0.71 } },

  /* ── Уровень 9 ── */
  { id: 'snow-gift', name: 'Снежный подарок', requiredLevel: 9, price: 820, rtp: 0.88, risk: 'low', color: '#6c87bf',
    image: 'assets/cases/snow-gift.webp', rarityWeights: { common: 32, uncommon: 33, rare: 25, epic: 6.2, legendary: 0.98, mythic: 0.11 } },
  { id: 'moon-orb', name: 'Лунный шар', requiredLevel: 9, price: 1100, rtp: 0.88, risk: 'mid', color: '#9f7acb',
    image: 'assets/cases/moon-orb.webp', rarityWeights: { common: 35, uncommon: 26, rare: 21, epic: 7.8, legendary: 2.0, mythic: 0.37 } },
  { id: 'honey-chest', name: 'Медовый сундук', requiredLevel: 9, price: 1500, rtp: 0.88, risk: 'high', color: '#bf8a42',
    image: 'assets/cases/honey-chest.webp', rarityWeights: { common: 44, uncommon: 20, rare: 15, epic: 7.0, legendary: 3.1, mythic: 0.94 } },
  { id: 'dusk-shrine', name: 'Сумеречный домик', requiredLevel: 9, price: 1900, rtp: 0.88, risk: 'elite', color: '#8a54bf',
    image: 'assets/cases/dusk-shrine.webp', rarityWeights: { common: 14, uncommon: 20, rare: 25, epic: 12, legendary: 2.9, mythic: 0.52 } },

  /* ── Уровень 10 ── */
  { id: 'toxic-case', name: 'Токсичный кейс', requiredLevel: 10, price: 1200, rtp: 0.89, risk: 'low', color: '#33d373',
    image: 'assets/cases/toxic-case.webp', rarityWeights: { common: 29, uncommon: 33, rare: 27, epic: 7.3, legendary: 1.2, mythic: 0.15 } },
  { id: 'scarlet-briefcase', name: 'Алый кейс', requiredLevel: 10, price: 1600, rtp: 0.89, risk: 'mid', color: '#bf3254',
    image: 'assets/cases/scarlet-briefcase.webp', rarityWeights: { common: 32, uncommon: 26, rare: 22, epic: 9.1, legendary: 2.5, mythic: 0.49 } },
  { id: 'noir-gift', name: 'Чёрный подарок', requiredLevel: 10, price: 2150, rtp: 0.89, risk: 'high', color: '#bf3966',
    image: 'assets/cases/noir-gift.webp', rarityWeights: { common: 40, uncommon: 21, rare: 16, epic: 8.2, legendary: 4.0, mythic: 1.2 } },
  { id: 'crate-35', name: 'Ящик WD-35', requiredLevel: 10, price: 2800, rtp: 0.89, risk: 'elite', color: '#bf737a',
    image: 'assets/cases/crate-35.webp', rarityWeights: { common: 13, uncommon: 21, rare: 27, epic: 15, legendary: 3.7, mythic: 0.69 } },

  /* ── Уровень 11 ── */
  { id: 'royal-gift', name: 'Королевский подарок', requiredLevel: 11, price: 1800, rtp: 0.9, risk: 'low', color: '#cc2b48',
    image: 'assets/cases/royal-gift.webp', rarityWeights: { common: 25, uncommon: 33, rare: 29, epic: 8.5, legendary: 1.6, mythic: 0.2 } },
  { id: 'sun-shrine', name: 'Солнечный домик', requiredLevel: 11, price: 2400, rtp: 0.9, risk: 'mid', color: '#bf854d',
    image: 'assets/cases/sun-shrine.webp', rarityWeights: { common: 28, uncommon: 26, rare: 24, epic: 11, legendary: 3.1, mythic: 0.65 } },
  { id: 'shadow-chest', name: 'Теневой сундук', requiredLevel: 11, price: 3250, rtp: 0.9, risk: 'high', color: '#bf8e6d',
    image: 'assets/cases/shadow-chest.webp', rarityWeights: { common: 35, uncommon: 21, rare: 17, epic: 9.6, legendary: 5.0, mythic: 1.6 } },

  /* ── Уровень 12 ── */
  { id: 'crown-orb', name: 'Коронный шар', requiredLevel: 12, price: 2600, rtp: 0.91, risk: 'low', color: '#b5bf7c',
    image: 'assets/cases/crown-orb.webp', rarityWeights: { common: 22, uncommon: 34, rare: 30, epic: 10.0, legendary: 2.0, mythic: 0.26 } },
  { id: 'golden-chest', name: 'Золотой сундук', requiredLevel: 12, price: 3500, rtp: 0.91, risk: 'mid', color: '#bfa033',
    image: 'assets/cases/golden-chest.webp', rarityWeights: { common: 25, uncommon: 26, rare: 25, epic: 12, legendary: 4.0, mythic: 0.86 } },
  { id: 'king-briefcase', name: 'Кейс короля', requiredLevel: 12, price: 4700, rtp: 0.91, risk: 'high', color: '#bf3f4b',
    image: 'assets/cases/king-briefcase.webp', rarityWeights: { common: 31, uncommon: 21, rare: 18, epic: 11, legendary: 6.3, mythic: 2.2 } },
  { id: 'rose-cube', name: 'Розовая корона', requiredLevel: 12, price: 6100, rtp: 0.91, risk: 'elite', color: '#dd469c',
    image: 'assets/cases/rose-cube.webp', rarityWeights: { common: 9.9, uncommon: 21, rare: 30, epic: 20, legendary: 5.9, mythic: 1.2 } },

  /* ── Уровень 13 ── */
  { id: 'platinum-case', name: 'Платиновый кейс', requiredLevel: 13, price: 3750, rtp: 0.92, risk: 'low', color: '#7c96bf',
    image: 'assets/cases/platinum-case.webp', rarityWeights: { common: 19, uncommon: 34, rare: 32, epic: 12, legendary: 2.5, mythic: 0.34 } },
  { id: 'platinum-gift', name: 'Платиновый подарок', requiredLevel: 13, price: 5000, rtp: 0.92, risk: 'mid', color: '#947cbf',
    image: 'assets/cases/platinum-gift.webp', rarityWeights: { common: 21, uncommon: 26, rare: 27, epic: 15, legendary: 5.0, mythic: 1.1 } },
  { id: 'platinum-orb', name: 'Платиновый шар', requiredLevel: 13, price: 6750, rtp: 0.92, risk: 'high', color: '#7c91bf',
    image: 'assets/cases/platinum-orb.webp', rarityWeights: { common: 26, uncommon: 21, rare: 19, epic: 13, legendary: 8.0, mythic: 2.9 } },
  { id: 'platinum-cube', name: 'Платиновый куб', requiredLevel: 13, price: 8750, rtp: 0.92, risk: 'elite', color: '#7786bf',
    image: 'assets/cases/platinum-cube.webp', rarityWeights: { common: 8.5, uncommon: 21, rare: 32, epic: 23, legendary: 7.5, mythic: 1.6 } },

  /* ── Уровень 14 ── */
  { id: 'obsidian-capsule', name: 'Обсидиановая капсула', requiredLevel: 14, price: 5600, rtp: 0.93, risk: 'low', color: '#7a56bf',
    image: 'assets/cases/obsidian-capsule.webp', rarityWeights: { common: 16, uncommon: 34, rare: 34, epic: 14, legendary: 3.2, mythic: 0.45 } },
  { id: 'obsidian-briefcase', name: 'Обсидиановый кейс', requiredLevel: 14, price: 7500, rtp: 0.93, risk: 'mid', color: '#8149bf',
    image: 'assets/cases/obsidian-briefcase.webp', rarityWeights: { common: 18, uncommon: 26, rare: 28, epic: 17, legendary: 6.3, mythic: 1.5 } },
  { id: 'obsidian-shrine', name: 'Обсидиановый домик', requiredLevel: 14, price: 10100, rtp: 0.93, risk: 'high', color: '#875abf',
    image: 'assets/cases/obsidian-shrine.webp', rarityWeights: { common: 22, uncommon: 21, rare: 20, epic: 15, legendary: 10, mythic: 3.8 } },
  { id: 'obsidian-chest', name: 'Обсидиановый сундук', requiredLevel: 14, price: 13100, rtp: 0.93, risk: 'elite', color: '#8353bf',
    image: 'assets/cases/obsidian-chest.webp', rarityWeights: { common: 7.0, uncommon: 21, rare: 34, epic: 27, legendary: 9.5, mythic: 2.1 } },

  /* ── Уровень 15 ── */
  { id: 'golden-capsule', name: 'Золотая капсула', requiredLevel: 15, price: 8250, rtp: 0.94, risk: 'low', color: '#bf8d32',
    image: 'assets/cases/golden-capsule.webp', rarityWeights: { common: 13, uncommon: 34, rare: 36, epic: 16, legendary: 4.0, mythic: 0.6 } },
  { id: 'golden-suitcase', name: 'Золотой чемодан', requiredLevel: 15, price: 11000, rtp: 0.94, risk: 'mid', color: '#bf7e25',
    image: 'assets/cases/golden-suitcase.webp', rarityWeights: { common: 14, uncommon: 26, rare: 30, epic: 20, legendary: 8.0, mythic: 2.0 } },
  { id: 'golden-orb', name: 'Золотой шар', requiredLevel: 15, price: 14900, rtp: 0.94, risk: 'high', color: '#d6b051',
    image: 'assets/cases/golden-orb.webp', rarityWeights: { common: 18, uncommon: 21, rare: 21, epic: 18, legendary: 13, mythic: 5.0 } },
  { id: 'golden-cube', name: 'Золотой куб', requiredLevel: 15, price: 19200, rtp: 0.94, risk: 'elite', color: '#bf8025',
    image: 'assets/cases/golden-cube.webp', rarityWeights: { common: 5.6, uncommon: 21, rare: 36, epic: 32, legendary: 12, mythic: 2.8 } },
];
