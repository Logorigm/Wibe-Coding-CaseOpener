/* ============================================================================
 *  ЕЖЕДНЕВНЫЕ ЗАДАНИЯ
 *  ----------------------------------------------------------------------------
 *  Каждый день игроку выпадает perDay случайных заданий из pool.
 *  {n} в тексте заменяется на цель. stat — как в achievements.js.
 *  minLevel — задание появится только с этого уровня.
 *  game — задание мини-игры (не выпадает, если игра выключена в config.games.enabled).
 *  Монеты и опыт в наградах растут вместе с уровнем игрока.
 * ========================================================================== */
window.GAME_DATA = window.GAME_DATA || {};

GAME_DATA.quests = {
  perDay: 3,
  // Бонус за выполнение всех заданий дня
  bonus: { gems: 5, coins: 300 },

  pool: [
    { id: 'open',    text: 'Открой {n} кейсов',                      stat: 'casesOpened',
      goals: [{ n: 5, reward: { coins: 200, xp: 60 } }, { n: 15, reward: { coins: 500, xp: 150 } }] },
    { id: 'rare',    text: 'Получи {n} перс. редкости «Редкая» или выше', stat: 'rareOrBetter',
      goals: [{ n: 1, reward: { coins: 250, xp: 60 } }, { n: 4, reward: { coins: 600, xp: 150 } }] },
    { id: 'games',   text: 'Сыграй {n} раз в мини-игры',             stat: 'gamesPlayed',
      goals: [{ n: 5, reward: { coins: 200, xp: 50 } }, { n: 15, reward: { coins: 450, xp: 120 } }] },
    { id: 'wins',    text: 'Выиграй {n} раз в мини-играх',           stat: 'gamesWon',
      goals: [{ n: 3, reward: { coins: 250, xp: 60 } }, { n: 8, reward: { coins: 550, xp: 140 } }] },
    { id: 'sell',    text: 'Продай {n} персонажей',                  stat: 'itemsSold',
      goals: [{ n: 5, reward: { coins: 150, xp: 40 } }, { n: 20, reward: { coins: 400, xp: 100 } }] },
    { id: 'spend',   text: 'Потрать {n} монет на кейсы',             stat: 'spentOnCases',
      goals: [{ n: 1000, reward: { coins: 300, xp: 80 } }, { n: 3000, reward: { gems: 5, xp: 200 } }] },
    { id: 'memory',  text: 'Пройди «Мемори» {n} раз',                stat: 'game_memory_won', game: 'memory',
      goals: [{ n: 1, reward: { coins: 150, xp: 40 } }, { n: 3, reward: { coins: 400, xp: 100 } }] },
    { id: 'roulette', text: 'Сыграй {n} раундов в Рулетке',          stat: 'game_roulette_played', game: 'roulette',
      goals: [{ n: 3, reward: { coins: 200, xp: 50 } }, { n: 10, reward: { coins: 450, xp: 120 } }] },
    { id: 'jackpot', text: 'Сделай {n} спинов в «Джекпоте»',         stat: 'game_jackpot_played', game: 'jackpot',
      goals: [{ n: 10, reward: { coins: 200, xp: 50 } }, { n: 30, reward: { coins: 450, xp: 120 } }] },
    { id: 'crash',   text: 'Успей забрать выигрыш в «Краше» {n} раз', stat: 'game_crash_won', game: 'crash',
      goals: [{ n: 2, reward: { coins: 200, xp: 50 } }, { n: 5, reward: { coins: 450, xp: 120 } }] },
    { id: 'coinflip', text: 'Выиграй {n} раз в Коинфлипе',          stat: 'game_coinflip_won', game: 'coinflip',
      goals: [{ n: 2, reward: { coins: 200, xp: 50 } }, { n: 5, reward: { coins: 450, xp: 120 } }] },
    { id: 'dust',    text: 'Распыли {n} персонажей',                 stat: 'itemsDusted',
      goals: [{ n: 3, reward: { dust: 20, xp: 40 } }, { n: 10, reward: { dust: 60, xp: 100 } }] },
    { id: 'battle',  text: 'Сыграй {n} батл(а) кейсов',              stat: 'battlesPlayed', minLevel: 2,
      goals: [{ n: 1, reward: { coins: 300, xp: 80 } }, { n: 3, reward: { gems: 4, xp: 160 } }] },
    { id: 'upgrade', text: 'Сделай {n} апгрейд(а)',                  stat: 'upgradesDone', minLevel: 2,
      goals: [{ n: 1, reward: { coins: 250, xp: 60 } }, { n: 3, reward: { coins: 600, xp: 150 } }] },
    { id: 'contract',text: 'Заключи {n} контракт',                   stat: 'contractsDone', minLevel: 3,
      goals: [{ n: 1, reward: { coins: 300, xp: 80 } }] },
  ],
};
