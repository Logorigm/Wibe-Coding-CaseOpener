/* ============================================================================
 *  ДОСТИЖЕНИЯ
 *  ----------------------------------------------------------------------------
 *  stat — какую статистику считаем, goal — сколько нужно, reward — награда.
 *  hidden: true — достижение скрыто, пока не получено.
 *
 *  Доступные stat:
 *    casesOpened, itemsObtained, shinyObtained, rareOrBetter,
 *    rarity_common / rarity_uncommon / rarity_rare / rarity_epic / rarity_legendary / rarity_mythic,
 *    uniqueCharacters, collectionPercent, level, maxCoins,
 *    itemsSold, itemsDusted, crafted, contractsDone, upgradesDone, upgradesWon,
 *    battlesPlayed, battlesWon, gamesPlayed, gamesWon, biggestWin, loseStreakMax,
 *    crashBest, minesBest, game_<id>_played / game_<id>_won (например game_memory_won),
 *    dailyStreakMax, questsDone, promoUsed, spentOnCases, case_<id> (открытия кейса)
 * ========================================================================== */
window.GAME_DATA = window.GAME_DATA || {};

GAME_DATA.achievements = [
  // Кейсы
  { id: 'open_1',    icon: '🎁', name: 'Первый шаг',         desc: 'Открой свой первый кейс',         stat: 'casesOpened', goal: 1,    reward: { coins: 100 } },
  { id: 'open_10',   icon: '🎁', name: 'Распаковщик',        desc: 'Открой 10 кейсов',                 stat: 'casesOpened', goal: 10,   reward: { coins: 300 } },
  { id: 'open_50',   icon: '📦', name: 'Коробочник',         desc: 'Открой 50 кейсов',                 stat: 'casesOpened', goal: 50,   reward: { coins: 800, gems: 5 } },
  { id: 'open_100',  icon: '📦', name: 'Сотня!',             desc: 'Открой 100 кейсов',                stat: 'casesOpened', goal: 100,  reward: { gems: 15 } },
  { id: 'open_500',  icon: '🏭', name: 'Конвейер',           desc: 'Открой 500 кейсов',                stat: 'casesOpened', goal: 500,  reward: { gems: 40 } },
  { id: 'open_1000', icon: '🌌', name: 'Тысяча коробок',     desc: 'Открой 1000 кейсов',               stat: 'casesOpened', goal: 1000, reward: { gems: 100 } },

  // Редкости
  { id: 'rare_1',      icon: '💙', name: 'Редкая находка',    desc: 'Получи редкого персонажа',          stat: 'rarity_rare',      goal: 1,  reward: { coins: 150 } },
  { id: 'epic_1',      icon: '💜', name: 'Эпично!',           desc: 'Получи эпического персонажа',       stat: 'rarity_epic',      goal: 1,  reward: { coins: 400 } },
  { id: 'legendary_1', icon: '🧡', name: 'Легенда среди нас', desc: 'Получи легендарного персонажа',     stat: 'rarity_legendary', goal: 1,  reward: { gems: 10 } },
  { id: 'legendary_10',icon: '👑', name: 'Легендарный улов',  desc: 'Получи 10 легендарных персонажей',  stat: 'rarity_legendary', goal: 10, reward: { gems: 40 } },
  { id: 'mythic_1',    icon: '❤️‍🔥', name: 'Миф стал явью',  desc: 'Получи мифического персонажа',      stat: 'rarity_mythic',    goal: 1,  reward: { gems: 50 } },
  { id: 'shiny_1',     icon: '✨', name: 'Сияние',            desc: 'Получи шайни-персонажа',            stat: 'shinyObtained',    goal: 1,  reward: { gems: 10 } },
  { id: 'shiny_10',    icon: '🌟', name: 'Охотник за блеском',desc: 'Получи 10 шайни-персонажей',        stat: 'shinyObtained',    goal: 10, reward: { gems: 40 } },

  // Коллекция
  { id: 'unique_10',  icon: '📖', name: 'Начинающий коллекционер', desc: 'Собери 10 разных персонажей', stat: 'uniqueCharacters',  goal: 10,  reward: { coins: 500 } },
  { id: 'unique_25',  icon: '📚', name: 'Библиотека вайфу',        desc: 'Собери 25 разных персонажей', stat: 'uniqueCharacters',  goal: 25,  reward: { gems: 15 } },
  { id: 'collection', icon: '🏆', name: 'Полная коллекция',        desc: 'Собери всех персонажей',      stat: 'collectionPercent', goal: 100, reward: { gems: 200 } },
  { id: 'craft_1',    icon: '🔮', name: 'Алхимик',                 desc: 'Создай персонажа из звёздной пыли', stat: 'crafted',     goal: 1,   reward: { coins: 500 } },
  { id: 'dust_50',    icon: '🌠', name: 'Пылесос',                 desc: 'Распыли 50 персонажей',       stat: 'itemsDusted',       goal: 50,  reward: { dust: 100 } },

  // Уровни
  { id: 'level_5',  icon: '⭐', name: 'Растём!',       desc: 'Достигни 5 уровня',  stat: 'level', goal: 5,  reward: { coins: 500 } },
  { id: 'level_10', icon: '🌟', name: 'Опытный',       desc: 'Достигни 10 уровня', stat: 'level', goal: 10, reward: { gems: 15 } },
  { id: 'level_25', icon: '💫', name: 'Ветеран',       desc: 'Достигни 25 уровня', stat: 'level', goal: 25, reward: { gems: 50 } },
  { id: 'level_50', icon: '☄️', name: 'Живая легенда', desc: 'Достигни 50 уровня', stat: 'level', goal: 50, reward: { gems: 150 } },

  // Мини-игры
  { id: 'games_10',   icon: '🎮', name: 'Игроман',     desc: 'Сыграй 10 раз в мини-игры',             stat: 'gamesPlayed', goal: 10,    reward: { coins: 300 } },
  { id: 'games_100',  icon: '🕹️', name: 'Задрот',      desc: 'Сыграй 100 раз в мини-игры',            stat: 'gamesPlayed', goal: 100,   reward: { gems: 15 } },
  { id: 'wins_50',    icon: '🏅', name: 'Везунчик',    desc: 'Выиграй 50 раз в мини-играх',            stat: 'gamesWon',    goal: 50,    reward: { gems: 15 } },
  { id: 'crash_10',   icon: '🚀', name: 'До луны!',    desc: 'Забери ×10 или больше в «Ракете»',       stat: 'crashBest',   goal: 10,    reward: { gems: 20 } },
  { id: 'mines_15',   icon: '💣', name: 'Сапёр',       desc: 'Открой 15 безопасных клеток за раунд в «Минах»', stat: 'minesBest', goal: 15, reward: { gems: 20 } },
  { id: 'bigwin',     icon: '💰', name: 'Куш!',        desc: 'Выиграй 10 000 монет за одну игру',      stat: 'biggestWin',  goal: 10000, reward: { gems: 25 } },
  { id: 'memory_10',  icon: '🧠', name: 'Мозг',        desc: 'Пройди «Мемори» 10 раз',                 stat: 'game_memory_won', goal: 10, reward: { coins: 700 } },

  // Батлы, апгрейды, контракты
  { id: 'battle_1',   icon: '⚔️', name: 'Боевое крещение', desc: 'Победи в батле кейсов',       stat: 'battlesWon',    goal: 1,  reward: { coins: 500 } },
  { id: 'battle_10',  icon: '🗡️', name: 'Гладиатор',       desc: 'Победи в 10 батлах',           stat: 'battlesWon',    goal: 10, reward: { gems: 25 } },
  { id: 'upgrade_1',  icon: '🆙', name: 'Апгрейднутый',    desc: 'Сделай успешный апгрейд',      stat: 'upgradesWon',   goal: 1,  reward: { coins: 300 } },
  { id: 'upgrade_10', icon: '📈', name: 'Инвестор',        desc: 'Сделай 10 успешных апгрейдов', stat: 'upgradesWon',   goal: 10, reward: { gems: 20 } },
  { id: 'contract_1', icon: '📜', name: 'Подпись',         desc: 'Заключи контракт',             stat: 'contractsDone', goal: 1,  reward: { coins: 300 } },
  { id: 'contract_10',icon: '🖋️', name: 'Нотариус',        desc: 'Заключи 10 контрактов',        stat: 'contractsDone', goal: 10, reward: { gems: 15 } },

  // Разное
  { id: 'sell_100',  icon: '🪙', name: 'Торговец',        desc: 'Продай 100 персонажей',        stat: 'itemsSold',      goal: 100,    reward: { coins: 1000 } },
  { id: 'daily_7',   icon: '📅', name: 'Верность',        desc: 'Заходи 7 дней подряд',          stat: 'dailyStreakMax', goal: 7,      reward: { gems: 30 } },
  { id: 'quests_10', icon: '📝', name: 'Исполнительный',  desc: 'Выполни 10 ежедневных заданий', stat: 'questsDone',     goal: 10,     reward: { gems: 10 } },
  { id: 'rich_10k',  icon: '💎', name: 'Богач',           desc: 'Накопи 10 000 монет',           stat: 'maxCoins',       goal: 10000,  reward: { gems: 10 } },
  { id: 'rich_100k', icon: '🏦', name: 'Почти миллионер', desc: 'Накопи 100 000 монет',          stat: 'maxCoins',       goal: 100000, reward: { gems: 50 } },
  { id: 'promo_1',   icon: '🎟️', name: 'Секретный код',   desc: 'Активируй промокод',            stat: 'promoUsed',      goal: 1,      reward: { coins: 200 } },
  { id: 'unlucky',   icon: '😿', name: 'Чёрная кошка',    desc: 'Проиграй 10 раз подряд в мини-играх', stat: 'loseStreakMax', goal: 10, reward: { coins: 777 }, hidden: true },
];
