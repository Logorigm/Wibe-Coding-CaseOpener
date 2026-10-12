/* ============================================================================
 *  КЕЙСЫ
 *  ----------------------------------------------------------------------------
 *  Как добавить кейс — добавь объект в массив ниже:
 *
 *  {
 *    id: 'my_case',                // уникальный id латиницей
 *    name: 'Мой кейс',             // название
 *    description: 'Описание',      // необязательно
 *    price: 300,                   // цена (0 = бесплатно)
 *    currency: 'coins',            // 'coins' (монеты) или 'gems' (кристаллы)
 *    color: '#ff6fb5',             // цвет кейса
 *    image: 'assets/cases/my.png', // картинка кейса (необязательно — иначе нарисуется коробка)
 *    emblem: 'heart',              // значок на нарисованной коробке: star | heart | moon | paw | flower | crown | gem | fire
 *    category: 'standard',         // free | standard | theme | event | premium (для фильтра)
 *    badge: 'NEW',                 // наклейка на кейсе (необязательно)
 *    featured: true,               // показывать на главной (необязательно)
 *    requiredLevel: 5,             // с какого уровня доступен (необязательно)
 *    cooldown: 60,                 // для бесплатных кейсов: раз в N минут (необязательно)
 *    availableUntil: '2026-12-31', // до какой даты доступен (необязательно)
 *
 *    // Кто лежит в кейсе. Можно писать:
 *    //   'hana'                      — id персонажа
 *    //   { id: 'hana', weight: 10 }  — персонаж со своим весом (шансом)
 *    //   'rarity:epic'               — все персонажи этой редкости
 *    //   'series:Пантеон'            — все персонажи этой серии
 *    //   '*'                         — вообще все персонажи
 *    items: ['hana', 'aoi', 'rarity:legendary'],
 *
 *    // Шансы редкостей (необязательно). По умолчанию берутся из config.js.
 *    // Шанс редкости делится поровну между её персонажами в кейсе.
 *    rarityWeights: { common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1 },
 *
 *    // Гарант (необязательно): через count открытий без нужной редкости — она выпадет точно
 *    pity: { count: 30, rarity: 'legendary' },
 *
 *    // Награда за сбор всех персонажей кейса (необязательно)
 *    collectionReward: { gems: 20 },
 *  }
 *
 *  Шансы и окупаемость (RTP) каждого кейса видно в «🛠 Конструктор → Проверка данных».
 * ========================================================================== */
window.GAME_DATA = window.GAME_DATA || {};

GAME_DATA.cases = [
  {
    id: 'daily',
    name: 'Ежедневный подарок',
    description: 'Бесплатный кейс — открывай каждый час!',
    category: 'free',
    price: 0,
    cooldown: 60,
    color: '#34d399',
    emblem: 'heart',
    items: ['hana', 'aoi', 'mei', 'yuna', 'rika', 'sora', 'kaori', 'momo',
            'nanami', 'chiyo', 'miu', 'akane', 'haruka', 'kohaku',
            'shiori', 'kuro', 'yuzuha', 'mikoto'],
    rarityWeights: { common: 62, uncommon: 28, rare: 9, epic: 1 },
    collectionReward: { coins: 500 },
  },
  {
    id: 'sakura',
    name: 'Кейс «Сакура»',
    description: 'Стартовый кейс: героини Академии Сакуры и немного магии.',
    category: 'standard',
    badge: 'HOT',
    featured: true,
    price: 100,
    currency: 'coins',
    color: '#ff6fb5',
    emblem: 'flower',
    items: ['hana', 'aoi', 'sora', 'rika', 'mei', 'yuna', 'kaori',
            'nanami', 'chiyo', 'akane', 'haruka',
            'shiori', 'ruri', 'yuzuha',
            'luna', 'mikoto',
            'shirayuki',
            'amaterasu'],
    rarityWeights: { common: 52.4, uncommon: 27, rare: 13, epic: 5, legendary: 2.2, mythic: 0.4 },
    collectionReward: { gems: 15 },
  },
  {
    id: 'neko',
    name: 'Неко-кафе «Мурр»',
    description: 'Кошкодевочки, лисички и одна очень подозрительная хозяйка.',
    category: 'theme',
    price: 150,
    currency: 'coins',
    color: '#f59e0b',
    emblem: 'paw',
    items: ['mei', 'momo', 'miu', 'kohaku', 'kuro', 'tama', 'inari'],
    rarityWeights: { common: 36, uncommon: 30, rare: 18, epic: 11.5, legendary: 4.5 },
    collectionReward: { gems: 15 },
  },
  {
    id: 'festival',
    name: 'Летний фестиваль',
    description: 'Юкаты, фейерверки и лунная принцесса инкогнито.',
    category: 'event',
    badge: 'ИВЕНТ',
    price: 200,
    currency: 'coins',
    color: '#fb7185',
    emblem: 'fire',
    items: ['yuna', 'momo', 'chiyo', 'kohaku', 'yuzuha', 'kaguya', 'akari'],
    rarityWeights: { common: 27, uncommon: 29, rare: 21, epic: 16, legendary: 7.5 },
    collectionReward: { gems: 20 },
  },
  {
    id: 'idol',
    name: 'Звёздные идолы',
    description: 'Сцена, софиты и миллионы фанатов.',
    category: 'theme',
    requiredLevel: 2,
    price: 350,
    currency: 'coins',
    color: '#38bdf8',
    emblem: 'star',
    items: ['rika', 'sora', 'haruka', 'ruri', 'mikoto', 'akari', 'seraphina'],
    rarityWeights: { common: 14, uncommon: 19, rare: 25, epic: 26, legendary: 16 },
    collectionReward: { gems: 20 },
  },
  {
    id: 'moon',
    name: 'Хроники Лунного Клинка',
    description: 'Рыцари, мечницы и принцесса Луны. Есть шанс на мифическую богиню.',
    category: 'theme',
    requiredLevel: 3,
    price: 600,
    currency: 'coins',
    color: '#818cf8',
    emblem: 'moon',
    items: ['kaori', 'aoi', 'akane', 'nanami', 'ayame', 'shiori', 'luna', 'kaguya', 'shirayuki', 'tsukuyomi'],
    rarityWeights: { common: 9, uncommon: 20, rare: 26, epic: 25, legendary: 15, mythic: 5 },
    collectionReward: { gems: 30 },
  },
  {
    id: 'heaven',
    name: 'Демоны и Ангелы',
    description: 'Без обычных персонажей. Только рай, ад и немного пантеона.',
    category: 'premium',
    requiredLevel: 5,
    price: 1500,
    currency: 'coins',
    color: '#e879f9',
    emblem: 'crown',
    items: ['tsubaki', 'lily', 'kuro', 'hikari', 'tama', 'seraphina', 'inari', 'amaterasu', 'tsukuyomi'],
    rarityWeights: { uncommon: 12, rare: 18, epic: 25, legendary: 27, mythic: 18 },
    collectionReward: { gems: 40 },
  },
  {
    id: 'divine',
    name: 'Божественный кейс',
    description: 'Только эпические и выше. Гарантированная легендарка каждые 15 открытий!',
    category: 'premium',
    badge: 'ГАРАНТ',
    price: 7,
    currency: 'gems',
    color: '#fbbf24',
    emblem: 'gem',
    items: ['rarity:epic', 'rarity:legendary', 'rarity:mythic'],
    rarityWeights: { epic: 80, legendary: 17, mythic: 3 },
    pity: { count: 15, rarity: 'legendary' },
    collectionReward: { gems: 50 },
  },
  {
    id: 'goddess',
    name: 'Кейс Богинь',
    description: 'Только легендарные и мифические героини. Для настоящих ценителей.',
    category: 'premium',
    requiredLevel: 8,
    price: 2000,
    currency: 'coins',
    color: '#ff3d71',
    emblem: 'crown',
    items: ['rarity:legendary', 'rarity:mythic'],
    rarityWeights: { legendary: 85, mythic: 15 },
    collectionReward: { gems: 100 },
  },
];
