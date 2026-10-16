/* Страница «Профиль»: уровень, немного статистики и достижения по редкостям */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;
  const CFG = GAME_DATA.config;

  // выбранный фильтр редкости и раскрытые списки (запоминаются, пока открыта игра)
  let filter = 'all';
  const open = { todo: false, done: false };
  const LIMIT = { todo: 8, done: 4 };

  // «Редкое» → «Редкие», «Обычное» → «Обычные» — для подписей фильтра
  function pluralName(r) {
    const n = r.ach || r.name || r.id;
    if (/ое$/.test(n)) return n.replace(/([кгхжшщч])ое$/, '$1ие').replace(/ое$/, 'ые');
    return n;
  }

  const dateShort = (ts) => new Date(ts).toLocaleDateString('ru-RU');

  /* ---------- уровень ---------- */
  function levelHtml() {
    const st = App.state;
    const max = st.level >= CFG.levels.max;
    const need = App.eco.xpNeeded(st.level);
    return `<section class="panel pf-level">
      <div class="pf-level-top">
        <h2>Уровень ${st.level}</h2>
        <span class="pf-level-xp">${max ? 'Максимальный уровень' : `${U.fmt(st.xp)} / ${U.fmt(need)} опыта`}</span>
      </div>
      ${ui.bar(max ? 1 : st.xp / need)}
      <p class="pf-hint">${App.features.unlocked('upgrade') ? 'Опыт дают открытия кейсов и ставки в играх' : 'Опыт дают открытия кейсов'}</p>
    </section>`;
  }

  /* ---------- статистика ---------- */
  function statsHtml() {
    const s = (k) => App.stats.get(k);
    const col = App.collection.total();
    const best = App.state.stats.bestDrop;
    const bestCh = best && App.data.getChar(best.cid);
    const bestHtml = bestCh
      ? `<div class="pf-best" title="${esc(bestCh.name)}">${ui.card(best.cid, { size: 'xs' })}${ui.cur(best.value)}</div>`
      : '<b>—</b>';
    const tile = (label, value, cls) => `<div class="pf-stat${cls ? ' ' + cls : ''}"><span>${label}</span><div class="pf-stat-v">${value}</div></div>`;
    return `<section class="pf-stats">
      ${tile('Кейсов открыто', `<b>${U.fmt(s('casesOpened'))}</b>`)}
      ${tile('Коллекция', `<span><b>${U.fmt(col.have)}</b> <small>/ ${U.fmt(col.total)}</small></span>`)}
      ${tile('Лучший дроп', bestHtml, 'pf-stat-best')}
      ${tile('Монет заработано', ui.cur(s('coinsEarned')))}
    </section>`;
  }

  /* ---------- достижения ---------- */
  const ratio = (def) => (def.goal > 0 ? App.ach.progress(def) / def.goal : 0);

  function achItem(def) {
    const done = App.ach.done(def.id);
    const secret = def.hidden && !done;
    const cls = ['pf-ach', 'r-' + def.r.id, done ? 'done' : 'todo'];
    if (secret) cls.push('secret');
    if (done && def.r.index >= 4) cls.push('top');
    let foot;
    if (done) {
      foot = `<span class="pf-ach-got">${ui.svg('check')}${dateShort(App.state.achievements[def.id])}</span>`;
    } else if (secret) {
      foot = '';
    } else {
      foot = `<span class="pf-ach-num">${U.fmt(App.ach.progress(def))} / ${U.fmt(def.goal)}</span>`;
    }
    return `<div class="${cls.join(' ')}">
      <div class="pf-ach-ico">${ui.svg('star')}</div>
      <div class="pf-ach-main">
        <div class="pf-ach-top">
          <b class="pf-ach-name">${secret ? 'Секретное достижение' : esc(def.name)}</b>
          ${def.reward.coins ? `<span class="pf-ach-reward">${ui.cur(def.reward.coins)}</span>` : ''}
        </div>
        <p class="pf-ach-desc">${secret ? 'Откроется само' : esc(def.desc || '')}</p>
        <div class="pf-ach-foot">${ui.rarityTag(def.r, { ach: true })}${foot}</div>
        ${!done && !secret ? `<div class="bar pf-ach-bar"><div class="bar-fill" style="width:${(U.clamp(ratio(def), 0, 1) * 100).toFixed(1)}%"></div></div>` : ''}
      </div>
    </div>`;
  }

  // список достижений; длинный сворачивается до LIMIT с кнопкой «Показать ещё»
  function group(key, list) {
    if (!list.length) return '';
    const cut = !open[key] && list.length > LIMIT[key] + 1;
    const shown = cut ? list.slice(0, LIMIT[key]) : list;
    const more = list.length - shown.length;
    return `<div class="pf-ach-list">${shown.map(achItem).join('')}</div>
      ${cut ? `<button class="btn btn-secondary btn-sm pf-more" data-more="${key}">Показать ещё ${more}</button>` : ''}`;
  }

  function achHtml() {
    const all = App.ach.visible();
    const doneAll = all.filter((d) => App.ach.done(d.id)).length;
    const present = App.data.rarities.filter((r) => all.some((d) => d.r.id === r.id));
    if (filter !== 'all' && !present.some((r) => r.id === filter)) filter = 'all';
    const list = filter === 'all' ? all : all.filter((d) => d.r.id === filter);

    const todo = list
      .filter((d) => !App.ach.done(d.id))
      .sort((a, b) => {
        const ra = a.hidden ? -1 : ratio(a);
        const rb = b.hidden ? -1 : ratio(b);
        return rb - ra || a.r.index - b.r.index || a.goal - b.goal;
      });
    const done = list
      .filter((d) => App.ach.done(d.id))
      .sort((a, b) => (App.state.achievements[b.id] || 0) - (App.state.achievements[a.id] || 0));

    const chips = `<div class="chips pf-chips">
      <button class="chip${filter === 'all' ? ' active' : ''}" data-r="all">Все</button>
      ${present
        .map((r) => {
          const inR = all.filter((d) => d.r.id === r.id);
          const got = inR.filter((d) => App.ach.done(d.id)).length;
          return `<button class="chip r-${r.id}${filter === r.id ? ' active' : ''}" data-r="${r.id}"><i class="dot"></i>${esc(pluralName(r))}<small>${got}/${inR.length}</small></button>`;
        })
        .join('')}
    </div>`;

    return `<div class="section-head pf-ach-head">
        <h2>Достижения</h2>
        <span class="pf-ach-count">получено ${doneAll} из ${all.length}</span>
      </div>
      ${chips}
      ${group('todo', todo)}
      ${done.length && todo.length ? `<div class="pf-ach-sub">Получено · ${done.length}</div>` : ''}
      ${group('done', done)}
      ${!list.length ? ui.empty('star', 'Пока нет достижений', '') : ''}`;
  }

  App.router.register('profile', {
    title: 'Профиль',
    nav: 'profile',
    feature: 'profile',
    render(ctx) {
      // на телефоне фильтры листаются вбок: после перерисовки возвращаем прокрутку
      // и показываем выбранный фильтр, иначе он уезжает за край
      function keepChips(fn) {
        const old = ctx.el.querySelector('.pf-chips');
        const left = old ? old.scrollLeft : 0;
        fn();
        const row = ctx.el.querySelector('.pf-chips');
        if (!row) return;
        row.scrollLeft = left;
        const a = row.querySelector('.chip.active');
        if (!a) return;
        const r = row.getBoundingClientRect();
        const b = a.getBoundingClientRect();
        if (b.left < r.left) row.scrollLeft += b.left - r.left - 14;
        else if (b.right > r.right) row.scrollLeft += b.right - r.right + 14;
      }
      function render() {
        keepChips(() => {
          ctx.el.innerHTML = `
            <div class="page-head"><div><h1>Профиль</h1></div></div>
            ${levelHtml()}
            ${statsHtml()}
            <section class="section pf-ach-sec">${achHtml()}</section>`;
        });
      }
      function renderAch() {
        const sec = ctx.el.querySelector('.pf-ach-sec');
        if (sec) keepChips(() => (sec.innerHTML = achHtml()));
        else render();
      }
      render();

      ctx.listen(ctx.el, 'click', (e) => {
        const chip = e.target.closest('.pf-chips [data-r]');
        if (chip) {
          if (chip.dataset.r === filter) return;
          filter = chip.dataset.r;
          App.sfx.play('click');
          renderAch();
          return;
        }
        const more = e.target.closest('[data-more]');
        if (more) {
          open[more.dataset.more] = true;
          App.sfx.play('click');
          renderAch();
          return;
        }
        const card = e.target.closest('.pf-best .ccard');
        if (card) ui.showChar(card.dataset.cid);
      });

      const later = U.debounce(() => ctx.alive && render(), 200);
      ['achievements', 'stats', 'xp', 'levelup'].forEach((evt) => ctx.on(evt, later));
    },
  });
})();
