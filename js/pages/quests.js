/* Страница «Задания»: ежедневная награда, задания дня, достижения */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;
  const W = App.widgets;

  App.router.register('quests', {
    title: 'Задания',
    render(ctx) {
      let tab = ctx.params[0] === 'achievements' ? 'achievements' : 'daily';
      let achFilter = 'all';

      ctx.el.innerHTML = `
        <div class="page-head"><div><h1>Задания</h1><p class="muted">Ежедневные награды, задания и достижения — бесплатный способ разбогатеть</p></div></div>
        <div data-tabs></div>
        <div data-body></div>`;
      const $ = (s) => ctx.el.querySelector(s);

      function renderTabs() {
        const qd = App.quests.claimable() + (App.daily.info().claimedToday ? 0 : 1);
        const ad = App.ach.claimable();
        $('[data-tabs]').innerHTML = W.tabs([['daily', '📅 Ежедневное', qd || ''], ['achievements', '🏆 Достижения', ad || '']], tab);
      }

      function daily() {
        const d = App.daily.info();
        const days = d.rewards
          .map((r, i) => {
            const past = d.claimedToday ? i <= d.dayIndex : i < d.dayIndex;
            const cur = i === d.dayIndex;
            return `<div class="day${past ? ' claimed' : ''}${cur && !d.claimedToday ? ' current' : ''}">
              <div class="day-n">День ${i + 1}</div>
              <div class="day-r">${ui.reward(r)}</div>
              ${past ? '<div class="day-ok">✓</div>' : ''}
            </div>`;
          })
          .join('');
        const quests = App.quests.list();
        const bonus = App.quests.cfg().bonus;
        const allDone = App.quests.allDone();
        const bonusClaimed = App.state.quests && App.state.quests.bonusClaimed;
        return `
          <section class="section">
            <div class="section-head"><h2>Ежедневная награда</h2><span class="muted small">Серия: <b>${d.streak}</b> ${U.plural(d.streak, ['день', 'дня', 'дней'])} · пропустишь день — серия сбросится</span></div>
            <div class="days">${days}</div>
            <div class="center mt">${d.claimedToday ? `<span class="muted">Следующая награда через ${U.duration(U.msToMidnight())}</span>` : '<button class="btn btn-gold btn-lg" data-act="daily">🎁 Забрать награду</button>'}</div>
          </section>
          <section class="section">
            <div class="section-head"><h2>Задания дня</h2><span class="muted small">Обновятся через <b data-reset>${U.duration(U.msToMidnight())}</b></span></div>
            <div class="quest-list">${quests
              .map(
                (q) => `<div class="quest panel${q.claimed ? ' claimed' : q.done ? ' done' : ''}">
                  <div class="quest-body">
                    <div class="quest-text">${esc(q.text)}</div>
                    ${ui.bar(q.progress / q.goal.n)}
                    <div class="quest-meta"><span class="muted small">${U.fmt(q.progress)} / ${U.fmt(q.goal.n)}</span>${ui.reward(q.goal.reward)}</div>
                  </div>
                  ${q.claimed ? '<span class="tag tag-good">✓ Готово</span>' : `<button class="btn ${q.done ? 'btn-gold' : 'btn-ghost'}" data-quest="${q.index}" ${q.done ? '' : 'disabled'}>${q.done ? 'Забрать' : 'В процессе'}</button>`}
                </div>`
              )
              .join('')}</div>
            <div class="quest-bonus panel${allDone && !bonusClaimed ? ' ready' : ''}">
              <div class="qb-ico">🎉</div>
              <div class="quest-body"><div class="quest-text">Бонус за все задания дня</div><div>${ui.reward(bonus)}</div></div>
              ${bonusClaimed ? '<span class="tag tag-good">✓ Получено</span>' : `<button class="btn ${allDone ? 'btn-gold' : 'btn-ghost'}" data-act="bonus" ${allDone ? '' : 'disabled'}>${allDone ? 'Забрать' : `${quests.filter((q) => q.claimed).length}/${quests.length}`}</button>`}
            </div>
          </section>`;
      }

      function achievements() {
        const defs = App.ach.defs();
        const got = defs.filter((d) => App.ach.state(d)).length;
        let list = defs.slice();
        if (achFilter === 'ready') list = list.filter((d) => App.ach.state(d) && !App.ach.state(d).claimed);
        if (achFilter === 'done') list = list.filter((d) => App.ach.state(d));
        if (achFilter === 'todo') list = list.filter((d) => !App.ach.state(d));
        // готовые к получению — первыми
        list.sort((a, b) => {
          const sa = App.ach.state(a);
          const sb = App.ach.state(b);
          const ra = sa && !sa.claimed ? 0 : sa ? 2 : 1;
          const rb = sb && !sb.claimed ? 0 : sb ? 2 : 1;
          return ra - rb;
        });
        return `
          <div class="ach-head panel">
            <div><b>${got}</b> из ${defs.length} достижений получено</div>
            ${ui.bar(defs.length ? got / defs.length : 0)}
          </div>
          <div class="chips" data-achf>${[['all', 'Все'], ['ready', 'Можно забрать'], ['todo', 'В процессе'], ['done', 'Полученные']]
            .map(([id, l]) => `<button class="chip${achFilter === id ? ' active' : ''}" data-achf="${id}">${l}</button>`)
            .join('')}</div>
          <div class="ach-grid">${list
            .map((d) => {
              const s = App.ach.state(d);
              const hidden = d.hidden && !s;
              const prog = App.ach.progress(d);
              return `<div class="ach panel${s ? (s.claimed ? ' claimed' : ' ready') : ''}${hidden ? ' secret' : ''}">
                <div class="ach-ico">${hidden ? '❔' : d.icon || '🏆'}</div>
                <div class="ach-body">
                  <div class="ach-name">${hidden ? 'Секретное достижение' : esc(d.name)}</div>
                  <div class="ach-desc">${hidden ? 'Выполни особое условие, чтобы узнать' : esc(d.desc || '')}</div>
                  ${s ? '' : ui.bar(prog / d.goal)}
                  <div class="ach-meta">${s ? '' : `<span class="muted small">${U.short(prog)} / ${U.short(d.goal)}</span>`}${hidden ? '' : ui.reward(d.reward)}</div>
                </div>
                ${s ? (s.claimed ? '<span class="ach-done">✓</span>' : `<button class="btn btn-gold btn-sm" data-ach="${esc(d.id)}">Забрать</button>`) : ''}
              </div>`;
            })
            .join('') || ui.empty('🏆', 'Пусто', 'В этой категории ничего нет')}</div>`;
      }

      function render() {
        renderTabs();
        $('[data-body]').innerHTML = tab === 'daily' ? daily() : achievements();
      }

      ctx.el.addEventListener('click', (e) => {
        const t = e.target.closest('[data-tab]');
        if (t) {
          tab = t.dataset.tab;
          App.sfx.play('soft');
          render();
          return;
        }
        const f = e.target.closest('[data-achf]');
        if (f && f.dataset.achf) {
          achFilter = f.dataset.achf;
          render();
          return;
        }
        const a = e.target.closest('[data-act]');
        if (a && a.dataset.act === 'daily') {
          App.fx.burstAt(a, ['#fbbf24', '#fff'], 40);
          App.daily.claim();
          render();
          return;
        }
        if (a && a.dataset.act === 'bonus') {
          App.quests.claimBonus();
          render();
          return;
        }
        const q = e.target.closest('[data-quest]');
        if (q) {
          App.fx.burstAt(q, ['#34d399', '#fff'], 30);
          App.quests.claim(Number(q.dataset.quest));
          render();
          return;
        }
        const ab = e.target.closest('[data-ach]');
        if (ab) {
          App.fx.burstAt(ab, ['#fbbf24', '#fff'], 30);
          App.ach.claim(ab.dataset.ach);
          render();
        }
      });
      render();
      ctx.every(1000, () => {
        const r = ctx.el.querySelector('[data-reset]');
        if (r) r.textContent = U.duration(U.msToMidnight());
      });
      ctx.on('newday', render);
    },
  });
})();
