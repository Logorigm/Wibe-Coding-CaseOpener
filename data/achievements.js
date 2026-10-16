/* ============================================================================
 *  ДОСТИЖЕНИЯ
 *  ----------------------------------------------------------------------------
 *  rarity — редкость достижения: common | uncommon | rare | epic | legendary | mythic
 *  stat   — какую статистику считаем, goal — сколько нужно
 *  reward — награда (монеты выдаются сразу, как только достижение получено).
 *           Если не указать — берётся стандартная награда для этой редкости (rewards ниже).
 *  hidden: true — описание скрыто, пока достижение не получено.
 *  feature — достижение раздела, который открывается с уровнем (до этого его не видно).
 *
 *  Доступные stat:
 *    casesOpened, level, uniqueCharacters, collectionPercent, casesCompleted,
 *    rarity_common / rarity_uncommon / rarity_rare / rarity_epic / rarity_legendary / rarity_mythic,
 *    maxCoins, itemsSold, bestDropValue, upgradesDone, upgradesWon, crashBest,
 *    jackpotsWon, rouletteStars, coinflipStreakMax, gamesPlayed, gamesWon, biggestWin,
 *    loseStreakMax, case_<id> (сколько раз открыт кейс)
 * ========================================================================== */
window.GAME_DATA = window.GAME_DATA || {};

// Стандартная награда (монеты) по редкости достижения
GAME_DATA.achievementRewards = { common: 150, uncommon: 400, rare: 1200, epic: 4000, legendary: 12000, mythic: 50000 };

GAME_DATA.achievements = [
  // Кейсы
  { id: 'open_1',    rarity: 'common',    name: 'Первый шаг',       desc: 'Открой свой первый кейс',  stat: 'casesOpened', goal: 1 },
  { id: 'open_25',   rarity: 'common',    name: 'Распаковщик',      desc: 'Открой 25 кейсов',          stat: 'casesOpened', goal: 25 },
  { id: 'open_100',  rarity: 'uncommon',  name: 'Сотня',            desc: 'Открой 100 кейсов',         stat: 'casesOpened', goal: 100 },
  { id: 'open_500',  rarity: 'rare',      name: 'Конвейер',         desc: 'Открой 500 кейсов',         stat: 'casesOpened', goal: 500 },
  { id: 'open_2000', rarity: 'epic',      name: 'Склад коробок',    desc: 'Открой 2 000 кейсов',       stat: 'casesOpened', goal: 2000 },
  { id: 'open_10k',  rarity: 'legendary', name: 'Бесконечная лента', desc: 'Открой 10 000 кейсов',     stat: 'casesOpened', goal: 10000 },

  // Редкие персонажи
  { id: 'rare_1',      rarity: 'common',    name: 'Редкая находка',   desc: 'Получи редкого персонажа',          stat: 'rarity_rare',      goal: 1 },
  { id: 'epic_1',      rarity: 'uncommon',  name: 'Эпично',           desc: 'Получи эпического персонажа',       stat: 'rarity_epic',      goal: 1 },
  { id: 'legendary_1', rarity: 'rare',      name: 'Легенда рядом',    desc: 'Получи легендарного персонажа',     stat: 'rarity_legendary', goal: 1 },
  { id: 'legendary_10',rarity: 'epic',      name: 'Легендарный улов', desc: 'Получи 10 легендарных персонажей',  stat: 'rarity_legendary', goal: 10 },
  { id: 'mythic_1',    rarity: 'epic',      name: 'Миф стал явью',    desc: 'Получи мифического персонажа',      stat: 'rarity_mythic',    goal: 1 },
  { id: 'mythic_10',   rarity: 'mythic',    name: 'Повелитель мифов', desc: 'Получи 10 мифических персонажей',   stat: 'rarity_mythic',    goal: 10 },

  // Коллекция
  { id: 'unique_10',   rarity: 'common',    name: 'Начало коллекции', desc: 'Собери 10 разных персонажей',  stat: 'uniqueCharacters', goal: 10,  feature: 'collection' },
  { id: 'unique_50',   rarity: 'uncommon',  name: 'Полка с фигурками', desc: 'Собери 50 разных персонажей', stat: 'uniqueCharacters', goal: 50,  feature: 'collection' },
  { id: 'unique_150',  rarity: 'rare',      name: 'Музей',            desc: 'Собери 150 разных персонажей', stat: 'uniqueCharacters', goal: 150, feature: 'collection' },
  { id: 'complete_1',  rarity: 'uncommon',  name: 'Полный набор',     desc: 'Собери всех персонажей одного кейса', stat: 'casesCompleted', goal: 1,  feature: 'collection' },
  { id: 'complete_10', rarity: 'epic',      name: 'Коллекционер',     desc: 'Собери полностью 10 кейсов',  stat: 'casesCompleted', goal: 10,  feature: 'collection' },
  { id: 'collection',  rarity: 'mythic',    name: 'Всё и сразу',      desc: 'Собери всех персонажей игры', stat: 'collectionPercent', goal: 100, feature: 'collection' },

  // Уровни
  { id: 'level_5',   rarity: 'uncommon',  name: 'Растём',         desc: 'Достигни 5 уровня',  stat: 'level', goal: 5 },
  { id: 'level_10',  rarity: 'rare',      name: 'Опытный',        desc: 'Достигни 10 уровня', stat: 'level', goal: 10 },
  { id: 'level_15',  rarity: 'epic',      name: 'Все кейсы',      desc: 'Достигни 15 уровня — откроются все кейсы', stat: 'level', goal: 15 },
  { id: 'level_30',  rarity: 'legendary', name: 'Ветеран',        desc: 'Достигни 30 уровня', stat: 'level', goal: 30 },

  // Монеты
  { id: 'rich_10k',  rarity: 'common',    name: 'Копилка',        desc: 'Накопи 10 000 монет',      stat: 'maxCoins', goal: 10000 },
  { id: 'rich_100k', rarity: 'rare',      name: 'Богач',          desc: 'Накопи 100 000 монет',     stat: 'maxCoins', goal: 100000 },
  { id: 'rich_1m',   rarity: 'epic',      name: 'Миллионер',      desc: 'Накопи 1 000 000 монет',   stat: 'maxCoins', goal: 1000000 },
  { id: 'rich_10m',  rarity: 'legendary', name: 'Золотой дракон', desc: 'Накопи 10 000 000 монет',  stat: 'maxCoins', goal: 10000000 },
  { id: 'sell_100',  rarity: 'uncommon',  name: 'Торговец',       desc: 'Продай 100 персонажей',    stat: 'itemsSold', goal: 100 },
  { id: 'drop_10k',  rarity: 'rare',      name: 'Дорогая находка', desc: 'Выбей персонажа дороже 10 000 монет', stat: 'bestDropValue', goal: 10000 },

  // Мини-игры
  { id: 'upgrade_1',   rarity: 'common',    name: 'Апгрейднутый', desc: 'Сделай успешный апгрейд',           stat: 'upgradesWon',       goal: 1,  feature: 'upgrade' },
  { id: 'upgrade_25',  rarity: 'rare',      name: 'Инвестор',     desc: 'Сделай 25 успешных апгрейдов',      stat: 'upgradesWon',       goal: 25, feature: 'upgrade' },
  { id: 'crash_10',    rarity: 'rare',      name: 'До луны',      desc: 'Забери ×10 или больше в «Краше»',   stat: 'crashBest',         goal: 10, feature: 'crash' },
  { id: 'coinflip_5',  rarity: 'epic',      name: 'Пять из пяти', desc: 'Выиграй 5 раз подряд в Коинфлипе',  stat: 'coinflipStreakMax', goal: 5,  feature: 'coinflip' },
  { id: 'roulette_star', rarity: 'rare',    name: 'Звездопад',    desc: 'Выиграй на «Звезде» в Рулетке',     stat: 'rouletteStars',     goal: 1,  feature: 'roulette' },
  { id: 'jackpot_1',   rarity: 'legendary', name: 'ДЖЕКПОТ',      desc: 'Сорви джекпот: три короны',         stat: 'jackpotsWon',       goal: 1,  feature: 'jackpot' },
  { id: 'games_100',   rarity: 'uncommon',  name: 'Игроман',      desc: 'Сыграй 100 раз в мини-игры',        stat: 'gamesPlayed',       goal: 100, feature: 'crash' },
  { id: 'bigwin',      rarity: 'epic',      name: 'Куш',          desc: 'Выиграй 50 000 монет за одну игру', stat: 'biggestWin',        goal: 50000, feature: 'crash' },
  { id: 'unlucky',     rarity: 'rare',      name: 'Чёрная кошка', desc: 'Проиграй 10 раз подряд в мини-играх', stat: 'loseStreakMax',   goal: 10, feature: 'crash', hidden: true },
];
