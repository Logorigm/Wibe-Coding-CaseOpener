/* Страница «Профиль» */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;
  const CFG = GAME_DATA.config;

  function pickAvatar() {
    const chars = App.data.chars.filter((c) => App.inv.discovered(c.id)).sort((a, b) => b.r.index - a.r.index);
    if (!chars.length) {
      ui.toast('Сначала получи хотя бы одного персонажа', 'info');
      return;
    }
    const m = ui.modal({
      title: 'Выбери аватар',
      size: 'lg',
      html: `<p class="muted small">Доступны все персонажи, которых ты когда-либо получал.</p>
        <div class="grid-cards sm">${chars.map((c) => ui.card(c.id, { size: 'sm', hideValue: true, selected: App.state.profile.avatar === c.id })).join('')}</div>
        <div class="center mt"><button class="btn btn-ghost btn-sm" data-noav>Убрать аватар</button></div>`,
    });
    m.body.addEventListener('click', (e) => {
      const card = e.target.closest('.ccard');
      if (card) App.state.profile.avatar = card.dataset.cid;
      else if (e.target.closest('[data-noav]')) App.state.profile.avatar = null;
      else return;
      App.store.dirty();
      App.bus.emit('profile');
      App.sfx.play('click');
      m.close();
    });
  }

  function pickShowcase() {
    const p = App.state.profile;
    if (!App.state.inventory.length) return ui.toast('Инвентарь пуст', 'info');
    const host = document.createElement('div');
    const m = ui.modal({ title: `Витрина (${p.showcase.length}/${App.profile.maxShowcase})`, size: 'lg', html: host, actions: [{ label: 'Готово', cls: 'btn-primary' }] });
    App.widgets.itemPicker(host, {
      sort: 'rarity-desc',
      isSelected: (uid) => p.showcase.includes(uid),
      onToggle: (it) => {
        App.profile.toggleShowcase(it.uid);
        m.el.querySelector('.modal-head h3').textContent = `Витрина (${p.showcase.length}/${App.profile.maxShowcase})`;
      },
    });
  }

  App.router.register('profile', {
    title: 'Профиль',
    render(ctx) {
      function render() {
        const st = App.state;
        const p = st.profile;
        const s = (k) => App.stats.get(k);
        const need = App.eco.xpNeeded(st.level);
        const best = st.stats.bestDrop;
        const titles = (CFG.levels.titles || []).filter((t) => t.level <= st.level);
        const currentTitle = p.title && titles.some((t) => t.name === p.title) ? p.title : App.eco.title(st.level);
        const rarCounts = App.data.rarities.map((r) => ({ r, n: s('rarity_' + r.id) }));
        const maxR = Math.max(1, ...rarCounts.map((x) => x.n));
        const showcase = p.showcase.map((uid) => App.inv.get(uid)).filter(Boolean);
        const playMin = Math.floor(s('playTime') / 60);

        ctx.el.innerHTML = `
          <section class="profile-hero panel">
            <div class="ph-bg"></div>
            <button class="ph-avatar" data-act="avatar" title="Сменить аватар">${App.profile.avatarHtml('xl')}<span class="ph-edit">✎</span></button>
            <div class="ph-info">
              <div class="ph-name"><h1>${esc(p.name)}</h1><button class="icon-btn" data-act="name" title="Изменить имя">✏️</button></div>
              <div class="ph-title">
                <select class="select select-sm" data-act="title">${titles.map((t) => `<option${t.name === currentTitle ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
              </div>
              <div class="ph-bio" data-act="bio" title="Нажми, чтобы изменить">${p.bio ? esc(p.bio) : '<span class="muted">+ Добавить статус</span>'}</div>
              <div class="ph-level">
                <span class="lvl-badge">${st.level}</span>
                <div class="ph-xp">
                  <div class="small muted">Уровень ${st.level} · ${U.fmt(st.xp)} / ${U.fmt(need)} XP</div>
                  ${ui.bar(st.level >= CFG.levels.max ? 1 : st.xp / need, 'bar-xp')}
                </div>
              </div>
              <div class="small muted">В игре с ${U.dateStr(st.createdAt)}${playMin ? ` · ${playMin >= 60 ? Math.floor(playMin / 60) + ' ч ' : ''}${playMin % 60} мин в игре` : ''}</div>
            </div>
          </section>

          <section class="section">
            <div class="section-head"><h2>⭐ Витрина</h2><button class="btn btn-ghost btn-sm" data-act="showcase">Настроить</button></div>
            <div class="showcase">${Array.from({ length: App.profile.maxShowcase })
              .map((_, i) => (showcase[i] ? ui.card(showcase[i], { showNew: false }) : '<button class="showcase-empty" data-act="showcase">+</button>'))
              .join('')}</div>
          </section>

          <section class="section">
            <div class="section-head"><h2>📊 Статистика</h2></div>
            <div class="stats-grid">
              ${[
                ['🎁', 'Кейсов открыто', U.fmt(s('casesOpened'))],
                ['👥', 'Персонажей получено', U.fmt(s('itemsObtained'))],
                ['📖', 'Коллекция', `${App.collection.total().have} / ${App.collection.total().total}`],
                ['✨', 'Шайни найдено', U.fmt(s('shinyObtained'))],
                ['🎒', 'Стоимость инвентаря', ui.cur(App.inv.totalValue())],
                ['💸', 'Потрачено на кейсы', ui.cur(s('spentOnCases'))],
                ['🪙', 'Заработано продажами', ui.cur(s('coinsFromSales'))],
                ['🎮', 'Мини-игр сыграно', U.fmt(s('gamesPlayed'))],
                ['🏅', 'Побед в мини-играх', U.fmt(s('gamesWon'))],
                ['💰', 'Самый большой выигрыш', ui.cur(s('biggestWin'))],
                ['⚔️', 'Батлов выиграно', `${U.fmt(s('battlesWon'))} / ${U.fmt(s('battlesPlayed'))}`],
                ['🆙', 'Удачных апгрейдов', `${U.fmt(s('upgradesWon'))} / ${U.fmt(s('upgradesDone'))}`],
                ['📜', 'Контрактов', U.fmt(s('contractsDone'))],
                ['🏆', 'Достижений', `${Object.keys(st.achievements).length} / ${App.ach.defs().length}`],
                ['🚀', 'Рекорд «Краша»', s('crashBest') ? U.mult(s('crashBest')) : '—'],
                ['🎰', 'Джекпотов сорвано', U.fmt(s('jackpotsWon'))],
                ['📅', 'Лучшая серия входов', U.fmt(s('dailyStreakMax'))],
              ]
                .map(([i, l, v]) => `<div class="stat panel"><span class="stat-ico">${i}</span><div><div class="stat-v">${v}</div><div class="stat-l">${l}</div></div></div>`)
                .join('')}
            </div>
          </section>

          <div class="two-col">
            <section class="section">
              <div class="section-head"><h2>🌈 Выбито по редкостям</h2></div>
              <div class="panel rar-bars">${rarCounts
                .map(({ r, n }) => `<div class="rar-bar r-${r.id}"><span class="rb-name">${esc(r.name)}</span><div class="rb-track"><i style="width:${(n / maxR) * 100}%"></i></div><b>${U.fmt(n)}</b></div>`)
                .join('')}</div>
              <div class="section-head mt"><h2>💎 Лучший дроп</h2></div>
              ${best && App.data.getChar(best.cid)
                ? `<div class="panel best-drop">${ui.card(best.cid, { shiny: best.shiny, size: 'md' })}<div><div class="muted small">Самый дорогой персонаж, которого ты выбил</div><h3>${esc(App.data.getChar(best.cid).name)}${best.shiny ? ' ✨' : ''}</h3>${ui.cur(best.value)}<div class="small muted">${U.timeAgo(best.t)}</div></div></div>`
                : '<div class="panel muted">Пока ничего — открой кейс!</div>'}
            </section>
            <section class="section">
              <div class="section-head"><h2>🕘 История открытий</h2><span class="muted small">последние ${Math.min(30, st.history.length)}</span></div>
              <div class="panel history">${st.history.length
                ? st.history
                    .slice(0, 30)
                    .map((h) => {
                      const ch = App.data.getChar(h.cid);
                      const cs = App.data.getCase(h.src);
                      if (!ch) return '';
                      return `<div class="hist-row r-${ch.rarity}" data-cid="${esc(h.cid)}"><img src="${esc(App.art.portrait(ch))}" data-cid="${esc(h.cid)}" alt=""><div class="hist-main"><b>${esc(ch.name)}${h.shiny ? ' ✨' : ''}</b><small>${cs ? esc(cs.name) : ''}</small></div><span class="hist-time">${U.timeAgo(h.t)}</span></div>`;
                    })
                    .join('')
                : '<div class="muted">История пуста</div>'}</div>
            </section>
          </div>`;
      }
      render();

      ctx.el.addEventListener('click', async (e) => {
        const a = e.target.closest('[data-act]');
        if (a) {
          const act = a.dataset.act;
          if (act === 'avatar') pickAvatar();
          else if (act === 'showcase') pickShowcase();
          else if (act === 'name') {
            const n = await ui.prompt('Новое имя', App.state.profile.name, { maxLength: 20, placeholder: 'Никнейм' });
            if (n) {
              App.state.profile.name = n.slice(0, 20);
              App.store.dirty();
              App.bus.emit('profile');
              render();
            }
          } else if (act === 'bio') {
            const b = await ui.prompt('Статус', App.state.profile.bio, { maxLength: 80, placeholder: 'Например: Лучшая вайфу — Рем' });
            if (b != null) {
              App.state.profile.bio = b.slice(0, 80);
              App.store.dirty();
              render();
            }
          }
          return;
        }
        const card = e.target.closest('.ccard');
        if (card) {
          ui.showChar(card.dataset.cid, { uid: card.dataset.uid });
          return;
        }
        const h = e.target.closest('.hist-row');
        if (h) ui.showChar(h.dataset.cid);
      });
      ctx.el.addEventListener('change', (e) => {
        if (e.target.matches('[data-act="title"]')) {
          App.state.profile.title = e.target.value;
          App.store.dirty();
          App.sfx.play('click');
        }
      });
      ctx.on('profile', render);
      ctx.on('levelup', render);
    },
  });
})();
