/* Мини-игры: реестр, общий учёт результатов, страница «Игры» и рамка отдельной игры.
 * Игры открываются по уровням (data/config.js → features). Все игры — против казино, без других игроков. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;
  const CFG = GAME_DATA.config;

  // Порядок игр в списке
  const ORDER = ['upgrade', 'crash', 'coinflip', 'roulette', 'jackpot'];
  const rank = (d) => {
    const i = ORDER.indexOf(d.id);
    return i < 0 ? ORDER.length : i;
  };

  const defs = [];
  const featureOf = (d) => d.feature || d.id;

  App.games = {
    // def: { id, name, short, icon (имя ui.svg), rules (html), render(ctx, host) } или ссылка { id, href, ... }
    register(def) {
      const i = defs.findIndex((d) => d.id === def.id);
      if (i >= 0) defs.splice(i, 1, def);
      else defs.push(def);
    },
    // все игры по порядку
    all: () => defs.slice().sort((a, b) => rank(a) - rank(b)),
    // открытые на текущем уровне
    list: () => App.games.all().filter((d) => App.features.unlocked(featureOf(d))),
    get: (id) => defs.find((d) => d.id === id) || null,
    href: (g) => g.href || '#/game/' + g.id,
    feature: featureOf,

    // Проверяет ставку и сразу списывает её. Возвращает сумму или null.
    charge(bet) {
      const G = CFG.games;
      const v = bet.value;
      if (v >= G.minBet && v <= G.maxBet && !App.eco.can(v)) {
        App.sfx.play('error');
        ui.toast('Недостаточно монет', 'bad');
        return null;
      }
      const b = bet.take();
      if (b == null) return null;
      return App.eco.spend(b) ? b : null;
    },

    // Учёт результата: bet — ставка, payout — сколько вернулось игроку (0 при проигрыше)
    record(id, bet, payout, o) {
      o = o || {};
      const S = App.stats;
      const st = App.state.stats;
      S.inc('gamesPlayed');
      S.inc(`game_${id}_played`);
      const profit = payout - bet;
      const win = o.win != null ? !!o.win : payout > bet;
      if (win) {
        S.inc('gamesWon');
        S.inc(`game_${id}_won`);
        if (profit > 0) S.max('biggestWin', profit);
        st.loseStreak = 0;
      } else if (payout < bet) {
        st.loseStreak = (Number(st.loseStreak) || 0) + 1;
        S.max('loseStreakMax', st.loseStreak);
      }
      const xp = o.xp != null ? o.xp : Math.round(bet * CFG.levels.xpPerBet);
      if (xp > 0) App.eco.addXp(xp);
      App.store.dirty();
    },

    // Незавершённый результат (монета/лента/барабаны ещё крутятся) засчитываем один раз:
    // при уходе со страницы, а также если вкладку закрывают или сворачивают (и сразу сохраняем).
    // settle должен быть идемпотентным. o.unloadOnly — не засчитывать при сворачивании.
    guard(ctx, settle, o) {
      o = o || {};
      const flush = () => {
        if (!ctx.alive) return;
        settle();
        App.store.save();
      };
      ctx.onDestroy(settle);
      ctx.listen(window, 'pagehide', flush);
      ctx.listen(window, 'beforeunload', flush);
      if (!o.unloadOnly) ctx.listen(document, 'visibilitychange', () => document.hidden && flush());
    },

    // Шапка страницы игры: «назад», название и кнопка правил
    head(g) {
      return `<a class="gm-back" href="#/games">${ui.svg('back')}<span>Игры</span></a>
        <div class="page-head gm-head">
          <div><h1>${esc(g.name)}</h1>${g.short ? `<p>${esc(g.short)}</p>` : ''}</div>
          ${g.rules ? '<button class="btn btn-secondary btn-sm" data-rules>Правила</button>' : ''}
        </div>`;
    },
    bindHead(root, g) {
      const b = root.querySelector('[data-rules]');
      if (!b) return;
      b.addEventListener('click', () => {
        App.sfx.play('soft');
        ui.modal({ title: esc(g.name), size: 'sm', html: `<div class="gm-rules">${g.rules}</div>` });
      });
    },
  };

  // Апгрейдер — отдельная страница (#/upgrade), в списке игр он ссылкой
  App.games.register({
    id: 'upgrade',
    feature: 'upgrade',
    href: '#/upgrade',
    name: 'Апгрейдер',
    icon: 'up',
    short: 'Рискни ради персонажа подороже',
    get rules() {
      const o = CFG.upgrade;
      return `<p>Выбери до ${o.maxItems} своих персонажей (можно добавить монеты) и цель — персонажа дороже ставки.</p>
        <p>Шанс = ставка ÷ цена цели × ${Math.round((1 - o.houseEdge) * 100)}%, но не больше ${Math.round(o.maxChance * 100)}%.</p>
        <p>Повезло — получаешь цель. Нет — ставка сгорает.</p>`;
    },
  });

  /* ======================= Хаб «Игры» ======================= */
  App.router.register('games', {
    title: 'Игры',
    nav: 'games',
    // Роутер отмечает раздел «просмотренным» до render — поэтому «новые» игры запоминаем здесь, до отметки
    feature: (ctx) => {
      ctx.fresh = new Set(App.games.list().filter((g) => App.features.isNew(featureOf(g))).map((g) => g.id));
      return 'upgrade';
    },
    render(ctx) {
      const open = App.games.list();
      const fresh = ctx.fresh || new Set();
      const next = App.games.all().find((g) => !App.features.unlocked(featureOf(g)));

      const card = (g) => `<a class="gm-card" href="${esc(App.games.href(g))}">
          <span class="gm-ico">${ui.svg(g.icon || 'games')}</span>
          <span class="gm-body"><b class="gm-name">${esc(g.name)}</b><span class="gm-short">${esc(g.short || '')}</span></span>
          ${fresh.has(g.id) ? '<i class="gm-new" title="Новое"></i>' : ''}
        </a>`;
      const lockedCard = (g) => `<div class="gm-card locked">
          <span class="gm-ico">${ui.svg('lock')}</span>
          <span class="gm-body"><b class="gm-name">${esc(g.name)}</b><span class="gm-short">с ${App.features.level(featureOf(g))} уровня</span></span>
        </div>`;

      ctx.el.innerHTML = `
        <div class="page-head"><div><h1>Игры</h1><p>Каждая ставка даёт опыт</p></div></div>
        <div class="gm-grid">${open.map(card).join('')}${next ? lockedCard(next) : ''}</div>`;

      open.forEach((g) => App.features.markSeen(featureOf(g)));
    },
  });

  /* ======================= Рамка отдельной игры ======================= */
  App.router.register('game', {
    title: (ctx) => (App.games.get(ctx.params[0]) || {}).name || 'Игра',
    nav: 'games',
    feature: (ctx) => {
      const g = App.games.get(ctx.params[0]);
      return g ? featureOf(g) : null;
    },
    render(ctx) {
      const g = App.games.get(ctx.params[0]);
      if (g && g.href) {
        location.replace(g.href);
        return;
      }
      if (!g || !g.render) {
        ctx.el.innerHTML = ui.empty('games', 'Игра не найдена', '', '<a class="btn btn-primary" href="#/games">Все игры</a>');
        return;
      }
      ctx.el.innerHTML = `${App.games.head(g)}<div class="gm-host gm-${esc(g.id)}" data-host></div>`;
      App.games.bindHead(ctx.el, g);
      g.render(ctx, ctx.el.querySelector('[data-host]'));
    },
  });
})();
