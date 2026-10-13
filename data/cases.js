/* ============================================================================
 *  КЕЙСЫ
 *  ----------------------------------------------------------------------------
 *  «Лестница» кейсов: на каждом уровне открывается новый, более крупный кейс.
 *  Чем выше кейс — тем он дороже и тем выше его окупаемость (rtp), поэтому
 *  игроку выгодно стремиться к самому крупному доступному кейсу.
 *  Старые кейсы всё равно нужны — у каждого свои персонажи для коллекции.
 *
 *  ПОЛЯ КЕЙСА
 *    id            — уникальный id латиницей (его же используй в cases у персонажа
 *                    и как имя папки в characters/)
 *    name          — название
 *    description   — описание
 *    requiredLevel — с какого уровня открывается
 *    price         — цена (0 = бесплатно, 'auto' = рассчитать по среднему дропу)
 *    currency      — 'coins' (монеты) или 'gems' (кристаллы)
 *    rtp           — окупаемость: 0.9 = в среднем игрок получает 90% цены кейса.
 *                    По ней автоматически считаются цены персонажей этого кейса!
 *    color, emblem — цвет и значок нарисованной коробки (star|heart|moon|paw|flower|crown|gem|fire)
 *    image         — своя картинка кейса, например 'assets/cases/neko.png' (необязательно)
 *    rarityWeights — шансы редкостей (шанс редкости делится поровну между её персонажами)
 *    items         — кто лежит в кейсе. Можно не заполнять — достаточно указать
 *                    cases: ['id_кейса'] у персонажа или положить картинку в папку.
 *                    Варианты: 'rem' | { id: 'rem', weight: 0.5 } | 'rarity:epic' |
 *                    'series:Re:Zero' | 'case:neko' (все персонажи другого кейса) | '*'
 *    pity          — гарант: { count: 30, rarity: 'legendary' }
 *    cooldown      — для бесплатного кейса: раз в N минут
 *    collectionReward — награда за сбор всех персонажей кейса (иначе считается автоматически)
 *    badge, availableFrom, availableUntil, hidden — наклейка, даты ивента, скрыть кейс
 *
 *  Пока в кейсе нет твоих персонажей, он заполнен демо-персонажами (data/demo.js).
 *  Шансы, средний дроп и окупаемость видны в игре: «Конструктор → Проверка данных».
 * ========================================================================== */
window.GAME_DATA = window.GAME_DATA || {};

GAME_DATA.cases = [
  /* ───────────── ОСОБЫЕ ───────────── */
  {
    id: 'daily',
    name: 'Ежедневный подарок',
    description: 'Бесплатный кейс раз в час: персонажи первых трёх кейсов.',
    category: 'free',
    price: 0,
    cooldown: 60,
    color: '#34d399',
    emblem: 'heart',
    items: ['case:novice', 'case:academy', 'case:neko'],
    rarityWeights: { common: 62, uncommon: 28, rare: 8.5, epic: 1.5, legendary: 0, mythic: 0 },
  },
  {
    id: 'divine',
    name: 'Божественный кейс',
    description: 'Только эпические и выше из кейсов 4–9 уровня. Гарантированная легендарка каждые 15 открытий!',
    category: 'premium',
    badge: 'ГАРАНТ',
    price: 'auto',
    currency: 'gems',
    rtp: 0.95,
    color: '#fbbf24',
    emblem: 'gem',
    items: ['case:festival', 'case:idol', 'case:beach', 'case:magic', 'case:cyber', 'case:moon'],
    rarityWeights: { common: 0, uncommon: 0, rare: 0, epic: 80, legendary: 17, mythic: 3 },
    pity: { count: 15, rarity: 'legendary' },
  },

  /* ───────────── ЛЕСТНИЦА: новый кейс на каждом уровне ───────────── */
  { id: 'novice', requiredLevel: 1, name: 'Первый шаг', price: 50, rtp: 0.8, color: '#94a3b8', emblem: 'heart',
    description: 'Самый простой кейс — с него начинается любая коллекция.',
    items: [], rarityWeights: { common: 62, uncommon: 27, rare: 9, epic: 2, legendary: 0.3, mythic: 0.05 } },
  { id: 'academy', requiredLevel: 2, name: 'Академия Сакуры', price: 75, rtp: 0.81, color: '#ff6fb5', emblem: 'flower',
    description: 'Старосты, отличницы и клубы по интересам.',
    items: [], rarityWeights: { common: 58, uncommon: 28, rare: 11, epic: 3, legendary: 0.72, mythic: 0.11 } },
  { id: 'neko', requiredLevel: 3, name: 'Неко-кафе', price: 100, rtp: 0.82, color: '#f59e0b', emblem: 'paw',
    description: 'Кошкодевочки, лисички и одна очень подозрительная хозяйка.',
    items: [], rarityWeights: { common: 54, uncommon: 28, rare: 12, epic: 4.5, legendary: 1, mythic: 0.17 } },
  { id: 'festival', requiredLevel: 4, name: 'Летний фестиваль', price: 150, rtp: 0.83, color: '#fb7185', emblem: 'fire',
    description: 'Юкаты, фейерверки и золотые рыбки.',
    items: [], rarityWeights: { common: 49, uncommon: 29, rare: 14, epic: 6, legendary: 1.5, mythic: 0.24 } },
  { id: 'idol', requiredLevel: 5, name: 'Звёздные идолы', price: 200, rtp: 0.84, color: '#38bdf8', emblem: 'star',
    description: 'Сцена, софиты и миллионы фанатов.',
    items: [], rarityWeights: { common: 45, uncommon: 30, rare: 16, epic: 7, legendary: 2, mythic: 0.3 } },
  { id: 'beach', requiredLevel: 6, name: 'Пляжный день', price: 300, rtp: 0.85, color: '#2dd4bf', emblem: 'heart',
    description: 'Солнце, море и арбузы.',
    items: [], rarityWeights: { common: 41, uncommon: 30, rare: 18, epic: 8, legendary: 3, mythic: 0.44 } },
  { id: 'magic', requiredLevel: 7, name: 'Магическая академия', price: 450, rtp: 0.86, color: '#a78bfa', emblem: 'star',
    description: 'Ведьмочки, зелья и летающие мётлы.',
    items: [], rarityWeights: { common: 37, uncommon: 30, rare: 20, epic: 9.5, legendary: 3.5, mythic: 0.58 } },
  { id: 'cyber', requiredLevel: 8, name: 'Кибер-Токио', price: 650, rtp: 0.87, color: '#22d3ee', emblem: 'gem',
    description: 'Неон, андроиды и хакерши.',
    items: [], rarityWeights: { common: 33, uncommon: 30, rare: 21, epic: 11, legendary: 4.5, mythic: 0.72 } },
  { id: 'moon', requiredLevel: 9, name: 'Лунный клинок', price: 900, rtp: 0.88, color: '#818cf8', emblem: 'moon',
    description: 'Мечницы, рыцари и принцесса Луны.',
    items: [], rarityWeights: { common: 29, uncommon: 30, rare: 23, epic: 12, legendary: 5, mythic: 0.86 } },
  { id: 'winter', requiredLevel: 10, name: 'Зимняя сказка', price: 1300, rtp: 0.89, color: '#93c5fd', emblem: 'star',
    description: 'Снежные девы и ледяные дворцы.',
    items: [], rarityWeights: { common: 25, uncommon: 30, rare: 25, epic: 13, legendary: 6, mythic: 1 } },
  { id: 'heaven', requiredLevel: 11, name: 'Демоны и ангелы', price: 1900, rtp: 0.9, color: '#e879f9', emblem: 'crown',
    description: 'Рай, ад и всё, что между ними.',
    items: [], rarityWeights: { common: 22, uncommon: 28, rare: 26, epic: 15, legendary: 7, mythic: 1.5 } },
  { id: 'kitsune', requiredLevel: 12, name: 'Храм кицунэ', price: 2700, rtp: 0.91, color: '#fb923c', emblem: 'fire',
    description: 'Девятихвостые лисы и древние амулеты.',
    items: [], rarityWeights: { common: 18, uncommon: 27, rare: 28, epic: 17, legendary: 8, mythic: 2 } },
  { id: 'royal', requiredLevel: 13, name: 'Королевский бал', price: 4000, rtp: 0.92, color: '#fbbf24', emblem: 'crown',
    description: 'Принцессы, королевы и фрейлины.',
    items: [], rarityWeights: { common: 15, uncommon: 25, rare: 29, epic: 20, legendary: 9, mythic: 2 } },
  { id: 'hanami', requiredLevel: 14, name: 'Ханами', price: 5500, rtp: 0.93, color: '#f9a8d4', emblem: 'flower',
    description: 'Праздник цветения сакуры.',
    items: [], rarityWeights: { common: 11, uncommon: 24, rare: 31, epic: 22, legendary: 10, mythic: 2.5 } },
  { id: 'dragon', requiredLevel: 15, name: 'Драконья гора', price: 8000, rtp: 0.94, color: '#ef4444', emblem: 'fire',
    description: 'Драконьи жрицы и огненные фениксы.',
    items: [], rarityWeights: { common: 8, uncommon: 22, rare: 32, epic: 24, legendary: 11, mythic: 3 } },
  { id: 'stars', requiredLevel: 16, name: 'Звездопад', price: 12000, rtp: 0.95, color: '#6366f1', emblem: 'star',
    description: 'Гостьи из далёких созвездий.',
    items: [], rarityWeights: { common: 7, uncommon: 20, rare: 33, epic: 26, legendary: 12, mythic: 3.5 } },
  { id: 'temple', requiredLevel: 17, name: 'Небесный храм', price: 17000, rtp: 0.96, color: '#fde68a', emblem: 'gem',
    description: 'Жрицы и хранительницы небес.',
    items: [], rarityWeights: { common: 5.5, uncommon: 17, rare: 33, epic: 27, legendary: 13, mythic: 4 } },
  { id: 'pantheon', requiredLevel: 18, name: 'Пантеон', price: 24000, rtp: 0.97, color: '#f472b6', emblem: 'crown',
    description: 'Богини древних легенд.',
    items: [], rarityWeights: { common: 4.5, uncommon: 15, rare: 34, epic: 29, legendary: 15, mythic: 5 } },
  { id: 'goddess', requiredLevel: 19, name: 'Кейс богинь', price: 35000, rtp: 0.98, color: '#ff3d71', emblem: 'crown',
    description: 'Только для настоящих ценителей.',
    items: [], rarityWeights: { common: 3, uncommon: 12, rare: 34, epic: 30, legendary: 16, mythic: 5.5 } },
  { id: 'legend', requiredLevel: 20, name: 'Легенда аниме', price: 50000, rtp: 0.99, color: '#c084fc', emblem: 'gem',
    description: 'Вершина пути. Самые ценные героини игры.',
    items: [], rarityWeights: { common: 2, uncommon: 10, rare: 35, epic: 32, legendary: 17, mythic: 6 } },
];
