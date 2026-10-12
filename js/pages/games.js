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
    list: () => defs,
    get: (id) => defs.find((d) => d.id === id) || null,

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
  };

  /* ---------------- хаб ---------------- */
  App.router.register('games', {
    title: 'Мини-игры',
    render(ctx) {
      ctx.el.innerHTML = `
        <div class="page-head"><div><h1>Мини-игры</h1><p class="muted">Приумножай монеты (или теряй их 😅). Мемори — бесплатная игра без ставок.</p></div></div>
        <div class="games-grid">${defs
          .map((g) => {
            const played = App.stats.get(`game_${g.id}_played`);
            const won = App.stats.get(`game_${g.id}_won`);
            const special = g.id === 'wheel' && App.games.freeWheelReady() ? '<span class="game-flag">Бесплатный спин!</span>' : '';
            return `<a class="game-card" href="#/game/${g.id}" style="--gc:${g.color || 'var(--accent)'}">
              <div class="game-card-bg"></div>
              ${special}
              <div class="game-card-ico">${g.icon}</div>
              <div class="game-card-name">${esc(g.name)}</div>
              <div class="game-card-desc">${esc(g.desc || g.short || '')}</div>
              <div class="game-card-stats">${played ? `Сыграно: ${U.fmt(played)} · Побед: ${U.fmt(won)}` : 'Ещё не играл'}</div>
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
