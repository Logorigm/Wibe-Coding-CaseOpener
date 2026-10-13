/* Главная страница */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;
  const CFG = GAME_DATA.config;

  function greeting() {
    const h = new Date().getHours();
    if (h < 6) return 'Доброй ночи';
    if (h < 12) return 'Доброе утро';
    if (h < 18) return 'Добрый день';
    return 'Добрый вечер';
  }

  App.router.register('home', {
    title: 'Главная',
    render(ctx) {
      const st = App.state;
      const cases = App.cases.list();
      const lad = App.views.ladderInfo();
      const featured =
        cases.find((c) => c.featured && !App.cases.isLocked(c)) || lad.best || cases.find((c) => c.price > 0 && !App.cases.isLocked(c)) || cases[0];
      // На главной: панель «лучший → следующий», затем особые и остальные доступные (от дорогих к дешёвым)
      const ladIds = new Set(lad.ladder.map((c) => c.id));
      const homeCases = cases
        .filter((c) => !ladIds.has(c.id) && !App.cases.isLocked(c))
        .concat(lad.open.slice().reverse().filter((c) => c !== lad.best))
        .slice(0, 8);
      const colTotal = App.collection.total();
      let heroChars = featured ? Array.from(new Set(featured.pool.map((e) => e.cid))).slice(0, 3) : [];
      if (!heroChars.length) heroChars = App.data.chars.slice(-3).map((c) => c.id);
      const top = App.widgets.sortItems(st.inventory, 'value-desc').slice(0, 6);
      const games = (App.games && App.games.list()) || [];

      ctx.el.innerHTML = `
        <section class="hero">
          <div class="hero-bg"></div>
          <div class="hero-text">
            <div class="hero-kicker">${greeting()}, <b>${esc(st.profile.name)}</b> 👋</div>
            <h1>Собери свою <span class="grad-text">аниме-коллекцию</span></h1>
            <p>Открывай кейсы, лови легендарных и шайни-героинь, проходи задания и соревнуйся с ботами в батлах.</p>
            <div class="hero-actions">
              ${featured ? `<a class="btn btn-primary btn-lg" href="#/case/${esc(featured.id)}">Открыть «${esc(featured.name)}»</a>` : ''}
              <a class="btn btn-ghost btn-lg" href="#/cases">Все кейсы</a>
            </div>
            <div class="hero-stats">
              <div><b>${U.fmt(App.stats.get('casesOpened'))}</b><span>кейсов открыто</span></div>
              <div><b>${colTotal.have}/${colTotal.total}</b><span>в коллекции</span></div>
              <div><b>${st.level}</b><span>уровень</span></div>
            </div>
          </div>
          <div class="hero-art">${heroChars.map((cid, i) => `<div class="hero-card hc-${i}">${ui.card(cid, { size: 'lg', hideValue: true })}</div>`).join('')}</div>
        </section>

        <div class="widgets" data-widgets></div>

        <section class="section">
          <div class="section-head"><h2>🎁 Кейсы</h2><a class="link" href="#/cases">Все кейсы →</a></div>
          ${App.views.ladderPanel()}
          <div class="grid-cases">${homeCases.map((c) => App.views.caseCard(c, { best: lad.best && lad.best.id })).join('')}</div>
        </section>

        <section class="section">
          <div class="section-head"><h2>🎮 Мини-игры</h2><a class="link" href="#/games">Все игры →</a></div>
          <div class="games-strip">${games
            .map((g) => `<a class="game-chip" href="${App.games.href(g)}" style="--gc:${g.color || 'var(--accent)'}"><span class="game-chip-ico">${g.icon}</span><span><b>${esc(g.name)}</b><small>${esc(g.short || '')}</small></span></a>`)
            .join('')}</div>
        </section>

        <section class="section">
          <div class="section-head"><h2>💎 Твои лучшие персонажи</h2><a class="link" href="#/inventory">Инвентарь →</a></div>
          ${top.length ? `<div class="grid-cards">${top.map((it) => ui.card(it)).join('')}</div>` : ui.empty('🎁', 'Пока пусто', 'Открой первый кейс — и тут появятся твои лучшие персонажи', '<a class="btn btn-primary" href="#/cases">Открыть кейс</a>')}
        </section>`;

      const wHost = ctx.el.querySelector('[data-widgets]');

      function renderWidgets() {
        const w = [];
        // бесплатный кейс
        const free = cases.find((c) => !c.price && c.cooldown);
        if (free) {
          const left = App.cases.cooldownLeft(free);
          w.push(`<a class="widget w-free" href="#/case/${esc(free.id)}" style="--cc:${esc(free.color)}">
            <div class="widget-ico">${ui.caseImg(free)}</div>
            <div class="widget-body"><div class="widget-title">${esc(free.name)}</div>
            <div class="widget-sub">${left > 0 ? `Через <b data-cd-left>${U.clock(left)}</b>` : '<b class="good">Доступен прямо сейчас!</b>'}</div></div>
            <span class="btn btn-sm ${left > 0 ? 'btn-ghost' : 'btn-primary'}">${left > 0 ? 'Ждать' : 'Открыть'}</span>
          </a>`);
        }
        // ежедневная награда
        const d = App.daily.info();
        if (d.rewards.length) {
          w.push(`<div class="widget w-daily">
            <div class="widget-ico big">📅</div>
            <div class="widget-body"><div class="widget-title">Ежедневная награда</div>
            <div class="widget-sub">${d.claimedToday ? `Серия: <b>${d.streak}</b> ${U.plural(d.streak, ['день', 'дня', 'дней'])}. Возвращайся завтра!` : `День ${d.dayIndex + 1}: ${ui.reward(d.rewards[d.dayIndex])}`}</div></div>
            ${d.claimedToday ? '<span class="btn btn-sm btn-ghost" disabled>✓ Получено</span>' : '<button class="btn btn-sm btn-gold" data-act="daily">Забрать</button>'}
          </div>`);
        }
        // задания
        const q = App.quests.list();
        const done = q.filter((x) => x.claimed).length;
        const ready = q.filter((x) => x.done && !x.claimed).length;
        w.push(`<a class="widget w-quests" href="#/quests">
          <div class="widget-ico big">📝</div>
          <div class="widget-body"><div class="widget-title">Задания дня</div>
          <div class="widget-sub">Выполнено ${done}/${q.length}${ready ? ` · <b class="good">${ready} можно забрать!</b>` : ''}</div>
          ${ui.bar(q.length ? done / q.length : 0)}</div>
        </a>`);
        // колесо
        const wheelFree = App.games && App.games.freeWheelReady ? App.games.freeWheelReady() : false;
        w.push(`<a class="widget w-wheel" href="#/game/wheel">
          <div class="widget-ico big">🎡</div>
          <div class="widget-body"><div class="widget-title">Колесо удачи</div>
          <div class="widget-sub">${wheelFree ? '<b class="good">Бесплатный спин доступен!</b>' : 'Бесплатный спин — завтра'}</div></div>
          <span class="btn btn-sm ${wheelFree ? 'btn-primary' : 'btn-ghost'}">${wheelFree ? 'Крутить' : 'Играть'}</span>
        </a>`);
        // помощь при банкротстве
        const cheapest = App.cases.cheapestPrice();
        const bk = CFG.bankrupt;
        if (bk && cheapest && st.coins < cheapest && App.inv.totalValue() < cheapest) {
          const last = st.limits.bankrupt || 0;
          const left = last + bk.cooldownMinutes * 60000 - Date.now();
          w.push(`<div class="widget w-help">
            <div class="widget-ico big">🆘</div>
            <div class="widget-body"><div class="widget-title">Монеты закончились?</div>
            <div class="widget-sub">${left > 0 ? `Помощь снова будет через ${U.duration(left)}` : `Держи ${ui.cur(App.eco.scaled({ coins: bk.coins }).coins)} на новые кейсы`}</div></div>
            ${left > 0 ? '' : '<button class="btn btn-sm btn-gold" data-act="bankrupt">Получить</button>'}
          </div>`);
        }
        wHost.innerHTML = w.join('');
      }
      renderWidgets();

      ctx.el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-act]');
        if (b && b.dataset.act === 'daily') {
          App.daily.claim();
          App.fx.burstAt(b, ['#fbbf24', '#fff'], 30);
          renderWidgets();
        } else if (b && b.dataset.act === 'bankrupt') {
          st.limits.bankrupt = Date.now();
          App.eco.grant(App.eco.scaled({ coins: CFG.bankrupt.coins }), 'help', { title: 'Помощь от сенпая' });
          renderWidgets();
        }
        const card = e.target.closest('.hero-card .ccard, .grid-cards .ccard');
        if (card) ui.showChar(card.dataset.cid, { uid: card.dataset.uid });
      });
      ctx.every(1000, () => {
        const el = wHost.querySelector('[data-cd-left]');
        if (el) {
          const free = cases.find((c) => !c.price && c.cooldown);
          const left = App.cases.cooldownLeft(free);
          if (left > 0) el.textContent = U.clock(left);
          else renderWidgets();
        }
        App.views.tickCaseTimers(ctx.el);
      });
      ctx.on('badges', renderWidgets);
    },
  });
})();
