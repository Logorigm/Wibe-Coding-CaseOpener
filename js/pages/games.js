/* Мини-игры: реестр, общий учёт результатов, страница-хаб и рамка игры */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;
  const CFG = GAME_DATA.config;

  const defs = [];
  App.games = {
    register(def) {
      defs.push(def);
    },
    // Включённые игры в порядке config.games.enabled
    list() {
      const en = CFG.games && CFG.games.enabled;
      if (!Array.isArray(en)) return defs;
      return en.map((id) => defs.find((d) => d.id === id)).filter(Boolean);
    },
    all: () => defs,
    get: (id) => defs.find((d) => d.id === id) || null,
    href: (g) => g.href || '#/game/' + g.id,

    // Учёт результата игры: bet — ставка, payout — сколько вернулось игроку (0 при проигрыше)
    record(id, bet, payout, o) {
      o = o || {};
      const S = App.stats;
      S.inc('gamesPlayed');
      S.inc(`game_${id}_played`);
      const profit = payout - bet;
      const st = App.state.stats;
      if (payout > bet || o.win) {
        S.inc('gamesWon');
        S.inc(`game_${id}_won`);
        if (profit > 0) {
          S.inc('gamesProfit', profit);
          S.max('biggestWin', profit);
        }
        st.loseStreak = 0;
      } else if (payout < bet) {
        st.loseStreak = (st.loseStreak || 0) + 1;
        S.max('loseStreakMax', st.loseStreak);
      }
      const xp = o.xp != null ? o.xp : Math.round(bet * CFG.levels.xpPerBet);
      if (xp > 0) App.eco.addXp(xp);
      App.store.dirty();
    },

    freeWheelReady() {
      return App.state.wheel.lastFree !== U.todayKey();
    },

    // Аватар бота: один и тот же персонаж для одного имени
    botAvatar(name, cls) {
      const chars = App.data.chars;
      if (!chars.length) return `<span class="avatar ${cls || 'sm'}"><span class="avatar-letter">${esc(String(name).charAt(0))}</span></span>`;
      let h = 7;
      for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const c = chars[h % chars.length];
      return `<span class="avatar ${cls || 'sm'}"><img src="${esc(App.art.portrait(c))}" data-cid="${esc(c.id)}" alt=""></span>`;
    },
    // Ставка бота — примерно как у игроков твоего уровня
    botBet() {
      const base = U.pick([10, 20, 25, 50, 50, 75, 100, 100, 150, 200, 250, 300, 500, 1000]);
      return Math.max(CFG.games.minBet || 10, Math.round((base * App.eco.scale()) / 10) * 10);
    },
  };

  // Апгрейдер — отдельная страница (#/upgrade), в списке мини-игр он ссылкой
  App.games.register({
    id: 'upgrade',
    name: 'Апгрейдер',
    icon: '🆙',
    color: '#34d399',
    href: '#/upgrade',
    short: 'Персонажи → персонаж дороже',
    desc: 'Поставь своих персонажей и монеты и попробуй превратить их в кого-то подороже. Шанс выбираешь сам!',
    stats: () => ({ played: App.stats.get('upgradesDone'), won: App.stats.get('upgradesWon') }),
    locked() {
      const lvl = (CFG.unlocks && CFG.unlocks.upgrade) || 1;
      return !App.settings.devMode && App.state.level < lvl ? lvl : 0;
    },
  });

  /* ---------------- хаб ---------------- */
  App.router.register('games', {
    title: 'Мини-игры',
    render(ctx) {
      ctx.el.innerHTML = `
        <div class="page-head"><div><h1>Мини-игры</h1><p class="muted">Приумножай монеты (или теряй их 😅). Каждая ставка даёт опыт для нового уровня.</p></div></div>
        <div class="games-grid">${App.games
          .list()
          .map((g) => {
            const played = g.stats ? g.stats().played : App.stats.get(`game_${g.id}_played`);
            const won = g.stats ? g.stats().won : App.stats.get(`game_${g.id}_won`);
            const special = g.flag ? g.flag() : '';
            const lock = g.locked ? g.locked() : 0;
            return `<a class="game-card${lock ? ' locked' : ''}" href="${App.games.href(g)}" style="--gc:${g.color || 'var(--accent)'}">
              <div class="game-card-bg"></div>
              ${special ? `<span class="game-flag">${special}</span>` : ''}
              <div class="game-card-ico">${g.icon}</div>
              <div class="game-card-name">${esc(g.name)}</div>
              <div class="game-card-desc">${esc(g.desc || g.short || '')}</div>
              <div class="game-card-stats">${lock ? `🔒 Откроется на ${lock} уровне` : played ? `Сыграно: ${U.fmt(played)} · Побед: ${U.fmt(won)}` : 'Ещё не играл'}</div>
            </a>`;
          })
          .join('')}</div>`;
    },
  });

  /* ---------------- рамка отдельной игры ---------------- */
  App.router.register('game', {
    title: (ctx) => (App.games.get(ctx.params[0]) || {}).name || 'Мини-игра',
    nav: 'games',
    render(ctx) {
      const g = App.games.get(ctx.params[0]);
      if (g && g.href) {
        location.replace(g.href);
        return;
      }
      if (!g) {
        ctx.el.innerHTML = ui.empty('🎮', 'Игра не найдена', '', '<a class="btn btn-primary" href="#/games">Все игры</a>');
        return;
      }
      ctx.el.innerHTML = `
        <div class="game-head">
          <a class="back-link" href="#/games">← Мини-игры</a>
          <div class="game-title"><span class="game-title-ico" style="--gc:${g.color || 'var(--accent)'}">${g.icon}</span><div><h1>${esc(g.name)}</h1><div class="muted small">${esc(g.short || '')}</div></div></div>
          ${g.rules ? '<button class="btn btn-ghost btn-sm" data-rules>❔ Правила</button>' : ''}
        </div>
        <div class="game-host" data-host></div>`;
      ctx.el.querySelector('[data-rules]') &&
        ctx.el.querySelector('[data-rules]').addEventListener('click', () => ui.modal({ title: `Правила: ${esc(g.name)}`, size: 'sm', html: `<div class="rules">${g.rules}</div>` }));
      g.render(ctx, ctx.el.querySelector('[data-host]'));
    },
  });
})();
