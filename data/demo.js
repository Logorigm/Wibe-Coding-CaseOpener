/* ============================================================================
 *  ДЕМО-ПЕРСОНАЖИ
 *  ----------------------------------------------------------------------------
 *  Пока в кейсе нет ни одного твоего персонажа, игра заполняет его демо-персонажами:
 *  сначала берутся персонажи отсюда (поле case — в какой кейс), а недостающие
 *  дорисовываются автоматически (имя и портрет генерируются).
 *
 *  Как только ты добавишь в кейс хотя бы одного своего персонажа
 *  (в data/characters.js или картинкой в папку characters/), демо из этого кейса исчезнут.
 *
 *  Выключить демо совсем: enabled: false
 * ========================================================================== */
window.GAME_DATA = window.GAME_DATA || {};

GAME_DATA.demo = {
  enabled: true,

  // Сколько демо-персонажей каждой редкости создавать в пустом кейсе
  perRarity: { common: 3, uncommon: 2, rare: 2, epic: 2, legendary: 1, mythic: 1 },

  characters: [
    /* ───────────────────────── ОБЫЧНЫЕ ───────────────────────── */
    {
      id: 'hana', case: 'academy', name: 'Хана Кобаяси', rarity: 'common', series: 'Академия Сакуры',
      description: 'Тихая староста класса. Всегда носит с собой бэнто на двоих — вдруг кто-то забудет обед.',
      look: { hair: '#6b4632', eyes: '#8b5cf6', style: 'bob', clothes: 'sailor', mouth: 'smile', acc: 'clip', accent: '#ef4444' },
    },
    {
      id: 'aoi', case: 'academy', name: 'Аои Мидзуно', rarity: 'common', series: 'Академия Сакуры',
      description: 'Капитан команды по плаванию. Пахнет хлоркой и победой.',
      look: { hair: '#1e3a8a', eyes: '#06b6d4', style: 'ponytail', clothes: 'sailor', mouth: 'smug', acc: 'none', accent: '#3b82f6' },
    },
    {
      id: 'mei', case: 'neko', name: 'Мэй Татибана', rarity: 'common', series: 'Неко-кафе «Мурр»',
      description: 'Новенькая официантка. Путает заказы, но мурлычет так, что ей всё прощают.',
      look: { hair: '#fb923c', eyes: '#22c55e', style: 'bob', clothes: 'dress', acc: 'catears', mouth: 'cat', outfit: '#1e293b' },
    },
    {
      id: 'yuna', case: 'festival', name: 'Юна Сато', rarity: 'common', series: 'Летний фестиваль',
      description: 'Обожает ловить золотых рыбок, но ещё ни одну не поймала.',
      look: { hair: '#2b2333', eyes: '#ef4444', style: 'buns', clothes: 'kimono', mouth: 'open', acc: 'none', outfit: '#be185d' },
    },
    {
      id: 'rika', case: 'idol', name: 'Рика Огава', rarity: 'common', series: 'Звёздные идолы',
      description: 'Стажёрка идол-агентства. Репетирует улыбку перед зеркалом по три часа в день.',
      look: { hair: '#fde68a', eyes: '#3b82f6', style: 'twintails', clothes: 'dress', expr: 'wink', mouth: 'smile', acc: 'none', outfit: '#db2777', accent: '#ec4899' },
    },
    {
      id: 'sora', case: 'academy', name: 'Сора Ханада', rarity: 'common', series: 'Академия Сакуры',
      description: 'Геймерша с последней парты. Спит на уроках, но в рейтинге — топ-100 сервера.',
      look: { hair: '#93c5fd', eyes: '#2563eb', style: 'bob', clothes: 'hoodie', acc: 'headphones', mouth: 'o', outfit: '#334155', accent: '#22d3ee' },
    },
    {
      id: 'kaori', case: 'moon', name: 'Каори Нагаи', rarity: 'common', series: 'Хроники Лунного Клинка',
      description: 'Оруженосец ордена Луны. Мечтает однажды получить собственный клинок.',
      look: { hair: '#dc2626', eyes: '#f59e0b', style: 'ponytail', clothes: 'blazer', acc: 'none', mouth: 'smile', outfit: '#1e293b', accent: '#f59e0b' },
    },
    {
      id: 'momo', case: 'neko', name: 'Момо Сакаи', rarity: 'common', series: 'Неко-кафе «Мурр»',
      description: 'Отвечает за десерты. Пробует каждый — исключительно для контроля качества.',
      look: { hair: '#f9a8d4', eyes: '#ec4899', style: 'twintails', clothes: 'dress', acc: 'catears', mouth: 'open', expr: 'happy', outfit: '#7c2d12', accent: '#f472b6' },
    },

    /* ───────────────────────── НЕОБЫЧНЫЕ ───────────────────────── */
    {
      id: 'nanami', case: 'academy', name: 'Нанами Ёсида', rarity: 'uncommon', series: 'Академия Сакуры',
      description: 'Отличница в очках. Знает ответ на любой вопрос, кроме «как завести друзей».',
      look: { hair: '#a78bfa', eyes: '#7c3aed', style: 'long', clothes: 'sailor', acc: 'glasses', mouth: 'smile', accent: '#a855f7' },
    },
    {
      id: 'chiyo', case: 'festival', name: 'Тиё Морита', rarity: 'uncommon', series: 'Летний фестиваль',
      description: 'Танцует бон-одори лучше всех в городе и никогда не устаёт.',
      look: { hair: '#fbcfe8', eyes: '#db2777', style: 'buns', clothes: 'kimono', acc: 'flower', expr: 'happy', mouth: 'open', outfit: '#0369a1' },
    },
    {
      id: 'miu', case: 'neko', name: 'Мию Араки', rarity: 'uncommon', series: 'Неко-кафе «Мурр»',
      description: 'Кицунэ-бариста. Её латте-арт иногда начинает двигаться.',
      look: { hair: '#f8fafc', eyes: '#f59e0b', style: 'long', clothes: 'dress', acc: 'foxears', mouth: 'smug', outfit: '#15803d' },
    },
    {
      id: 'akane', case: 'moon', name: 'Аканэ Ито', rarity: 'uncommon', series: 'Хроники Лунного Клинка',
      description: 'Лучница с идеальной меткостью. Промахивается только мимо собственных чувств.',
      look: { hair: '#be123c', eyes: '#fbbf24', style: 'ponytail', clothes: 'blazer', acc: 'bow', mouth: 'smile', outfit: '#0f172a', accent: '#fbbf24' },
    },
    {
      id: 'haruka', case: 'idol', name: 'Харука Сэна', rarity: 'uncommon', series: 'Звёздные идолы',
      description: 'Главный вокал юнит-группы «Mint Drops». Поёт даже во сне.',
      look: { hair: '#5eead4', eyes: '#0d9488', style: 'twintails', clothes: 'dress', acc: 'bow', mouth: 'open', outfit: '#0f766e', accent: '#f472b6' },
    },
    {
      id: 'tsubaki', case: 'heaven', name: 'Цубаки Курои', rarity: 'uncommon', series: 'Демоны и Ангелы',
      description: 'Младшая демоница. Пытается быть злой, но постоянно помогает бабушкам переходить дорогу.',
      look: { hair: '#1f1b2e', eyes: '#ef4444', style: 'bob', clothes: 'blazer', acc: 'horns', mouth: 'smug', outfit: '#450a0a', accent: '#ef4444' },
    },
    {
      id: 'kohaku', case: 'festival', name: 'Кохаку Амано', rarity: 'uncommon', series: 'Летний фестиваль',
      description: 'Лисичка из храма Инари. Продаёт амулеты удачи (сомнительного качества).',
      look: { hair: '#d97706', eyes: '#fde047', style: 'long', clothes: 'kimono', acc: 'foxears', mouth: 'cat', outfit: '#b91c1c' },
    },

    /* ───────────────────────── РЕДКИЕ ───────────────────────── */
    {
      id: 'shiori', case: 'academy', name: 'Сиори Камия', rarity: 'rare', series: 'Академия Сакуры',
      description: 'Президент литературного клуба. Пишет романы, где героиня подозрительно похожа на неё.',
      look: { hair: '#e2e8f0', eyes: '#8b5cf6', style: 'hime', clothes: 'blazer', acc: 'glasses', mouth: 'smile', outfit: '#312e81', accent: '#a78bfa' },
    },
    {
      id: 'ruri', case: 'idol', name: 'Рури Асахи', rarity: 'rare', series: 'Звёздные идолы',
      description: 'Восходящая звезда сцены. Её сингл «Синий метеор» неделю держится в чартах.',
      look: { hair: '#3b82f6', eyes: '#06b6d4', style: 'twintails', clothes: 'dress', acc: 'bow', expr: 'wink', mouth: 'open', outfit: '#1d4ed8', accent: '#f8fafc' },
    },
    {
      id: 'kuro', case: 'neko', name: 'Куро', rarity: 'rare', series: 'Неко-кафе «Мурр»',
      description: 'Таинственная чёрная кошка. Приходит в кафе каждую ночь ровно в 3:33.',
      look: { hair: '#18151f', eyes: '#facc15', style: 'long', clothes: 'hoodie', acc: 'catears', mouth: 'cat', outfit: '#111827', accent: '#facc15' },
    },
    {
      id: 'yuzuha', case: 'festival', name: 'Юдзуха Мори', rarity: 'rare', series: 'Летний фестиваль',
      description: 'Мастер фейерверков. Каждый её залп складывается в чьё-то имя.',
      look: { hair: '#f97316', eyes: '#16a34a', style: 'ponytail', clothes: 'kimono', acc: 'flower', expr: 'happy', mouth: 'open', outfit: '#1e3a8a' },
    },
    {
      id: 'ayame', case: 'moon', name: 'Аямэ Кирисима', rarity: 'rare', series: 'Хроники Лунного Клинка',
      description: 'Мечница-отшельница. Разрезает падающий лепесток на восемь частей.',
      look: { hair: '#6d28d9', eyes: '#c084fc', style: 'ponytail', clothes: 'kimono', acc: 'none', mouth: 'smile', outfit: '#1f2937' },
    },
    {
      id: 'lily', case: 'heaven', name: 'Лили Мурасаки', rarity: 'rare', series: 'Демоны и Ангелы',
      description: 'Демоница-первокурсница. Третий год подряд проваливает экзамен по коварству.',
      look: { hair: '#f472b6', eyes: '#a21caf', style: 'long', clothes: 'dress', acc: 'horns', expr: 'wink', mouth: 'smug', outfit: '#3b0764' },
    },

    /* ───────────────────────── ЭПИЧЕСКИЕ ───────────────────────── */
    {
      id: 'luna', case: 'moon', name: 'Луна Цукисиро', rarity: 'epic', series: 'Хроники Лунного Клинка',
      description: 'Принцесса Лунного королевства и хранительница последнего клинка.',
      look: { hair: '#e0e7ff', eyes: '#3b82f6', style: 'hime', clothes: 'dress', acc: 'tiara', mouth: 'smile', outfit: '#1e1b4b', accent: '#60a5fa' },
    },
    {
      id: 'hikari', case: 'heaven', name: 'Хикари Тэнсё', rarity: 'epic', series: 'Демоны и Ангелы',
      description: 'Ангел-хранитель на испытательном сроке. Охраняет… ну, кого-нибудь.',
      look: { hair: '#fde047', eyes: '#38bdf8', style: 'long', clothes: 'dress', acc: 'halo', expr: 'happy', mouth: 'open', outfit: '#f8fafc' },
    },
    {
      id: 'tama', case: 'neko', name: 'Тама Нэкомата', rarity: 'epic', series: 'Неко-кафе «Мурр»',
      description: 'Двухвостая кошка-ёкай и тайная владелица кафе.',
      look: { hair: '#fafafa', eyes: '#dc2626', style: 'twintails', clothes: 'kimono', acc: 'catears', mouth: 'cat', outfit: '#7f1d1d', accent: '#dc2626' },
    },
    {
      id: 'mikoto', case: 'idol', name: 'Микото Рэйсэн', rarity: 'epic', series: 'Звёздные идолы',
      description: 'Центр топовой группы «Starlight». Её улыбка продаёт стадионы.',
      look: { hair: '#ff6fb5', eyes: '#f43f5e', style: 'twintails', clothes: 'dress', acc: 'bow', expr: 'wink', mouth: 'open', outfit: '#831843', accent: '#fde047' },
    },
    {
      id: 'kaguya', case: 'festival', name: 'Кагуя-химэ', rarity: 'epic', series: 'Летний фестиваль',
      description: 'Лунная принцесса из старой сказки. Пришла на фестиваль инкогнито.',
      look: { hair: '#111827', eyes: '#a855f7', style: 'hime', clothes: 'kimono', acc: 'flower', mouth: 'smile', outfit: '#581c87' },
    },

    /* ───────────────────────── ЛЕГЕНДАРНЫЕ ───────────────────────── */
    {
      id: 'shirayuki', case: 'winter', name: 'Сираюки', rarity: 'legendary', series: 'Духи Сезонов',
      description: 'Юки-онна, дух первого снега. Там, где она проходит, распускаются ледяные цветы.',
      look: { hair: '#dbeafe', eyes: '#67e8f9', style: 'hime', clothes: 'kimono', acc: 'tiara', mouth: 'smile', outfit: '#0c4a6e', accent: '#67e8f9', skin: '#fff5f0' },
    },
    {
      id: 'akari', case: 'dragon', name: 'Акари Хоносиро', rarity: 'legendary', series: 'Духи Сезонов',
      description: 'Феникс в человеческом облике. Перерождается каждое лето — и каждый раз ещё ярче.',
      look: { hair: '#f97316', eyes: '#facc15', style: 'long', clothes: 'dress', acc: 'halo', mouth: 'open', outfit: '#7c2d12', accent: '#facc15' },
    },
    {
      id: 'seraphina', case: 'heaven', name: 'Серафима', rarity: 'legendary', series: 'Демоны и Ангелы',
      description: 'Архангел шестого неба. Её суд справедлив, а кексы — божественны.',
      look: { hair: '#fcd34d', eyes: '#f59e0b', style: 'long', clothes: 'dress', acc: ['halo', 'tiara'], mouth: 'smile', outfit: '#f8fafc', accent: '#38bdf8' },
    },
    {
      id: 'inari', case: 'kitsune', name: 'Инари Кицунэ', rarity: 'legendary', series: 'Духи Сезонов',
      description: 'Девятихвостая лиса, хозяйка тысячи храмов. Исполняет желания — по своему разумению.',
      look: { hair: '#fbbf24', eyes: '#dc2626', style: 'long', clothes: 'kimono', acc: 'foxears', mouth: 'smug', outfit: '#991b1b' },
    },

    /* ───────────────────────── МИФИЧЕСКИЕ ───────────────────────── */
    {
      id: 'amaterasu', case: 'pantheon', name: 'Аматэрасу', rarity: 'mythic', series: 'Пантеон',
      description: 'Богиня солнца. Когда она улыбается — наступает рассвет.',
      look: { hair: '#fff7ed', eyes: '#f59e0b', style: 'hime', clothes: 'kimono', acc: ['halo', 'tiara'], expr: 'happy', mouth: 'smile', outfit: '#b45309', accent: '#ef4444' },
    },
    {
      id: 'tsukuyomi', case: 'pantheon', name: 'Цукуёми', rarity: 'mythic', series: 'Пантеон',
      description: 'Богиня луны и снов. Каждую ночь приходит к тем, кто о ней мечтает.',
      look: { hair: '#4c1d95', eyes: '#c4b5fd', style: 'long', clothes: 'kimono', acc: 'tiara', mouth: 'smile', outfit: '#1e1b4b', accent: '#c4b5fd' },
    },
  ],
};
