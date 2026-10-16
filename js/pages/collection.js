/* Страница «Коллекция» — все персонажи, которых ты хоть раз выбивал (даже если продал).
 * Обзор: общий прогресс и кейсы по уровням. #/collection/<id> — персонажи одного кейса.
 * Награды за полный кейс и за проценты коллекции выдаются автоматически. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;

  // кейсы со своими персонажами (без бесплатного подарка — он берёт персонажей из других кейсов)
  const collectable = (cs) => !cs.cooldown && cs.pool.length > 0;

  const caseStyle = (cs) => {
    const color = cs.color || '#ff5fa2';
    return `--cc:${esc(color)};--cc-rgb:${U.hexToRgb(color).join(',')}`;
  };

  const pctText = (have, pct) => (have > 0 && pct < 1 ? '<1%' : Math.floor(pct) + '%');

  // «Собрано» с галочкой или награда за полный набор
  function rewardBadge(cs, p) {
    if (p.done) return `<span class="col-done">${ui.svg('check')}Собрано</span>`;
    const r = App.collection.reward(cs);
    return r && r.coins ? `<span class="col-reward" title="Награда за полный набор">${ui.cur(r.coins, { short: true })}</span>` : '';
  }

  /* ======================= Обзор ======================= */

  function summary() {
    const t = App.collection.total();
    const next = App.collection.nextMilestone();
    let nextLine;
    if (!next) nextLine = `<div class="col-sum-next good">${ui.svg('check')}<span>Все награды получены</span></div>`;
    else {
      const need = Math.max(0, Math.ceil((next.pct / 100) * t.total - 1e-9) - t.have);
      nextLine = `<div class="col-sum-next">
        <span class="col-sum-goal">Следующая награда: ${next.pct}% — ${ui.cur(next.reward && next.reward.coins)}</span>
        ${need > 0 ? `<span class="col-sum-need">ещё ${need} ${U.plural(need, ['персонаж', 'персонажа', 'персонажей'])}</span>` : ''}
      </div>`;
    }
    return `<div class="panel col-sum">
      <div class="col-sum-top">
        <span class="col-sum-count">Собрано <b>${U.fmt(t.have)}</b> из ${U.fmt(t.total)}</span>
        <span class="col-sum-pct">${pctText(t.have, t.pct)}</span>
      </div>
      ${ui.bar(t.pct / 100)}
      ${nextLine}
    </div>`;
  }

  function tile(cs) {
    const p = App.collection.caseProgress(cs);
    return `<a class="col-tile${p.done ? ' done' : ''}" href="#/collection/${esc(cs.id)}" style="${caseStyle(cs)}">
      <div class="col-tile-art">${ui.caseImg(cs)}</div>
      <div class="col-tile-name">${esc(cs.name)}</div>
      ${ui.bar(p.pct, p.done ? 'bar-good' : '')}
      <div class="col-tile-foot"><span class="col-tile-count"><b>${p.have}</b>/${p.total}</span>${rewardBadge(cs, p)}</div>
    </a>`;
  }

  function renderOverview(ctx) {
    const cases = App.cases
      .unlocked()
      .filter(collectable)
      .sort((a, b) => a.requiredLevel - b.requiredLevel || a.price - b.price);
    const levels = [...new Set(cases.map((cs) => cs.requiredLevel))].sort((a, b) => b - a); // новые сверху
    const groups = levels
      .map(
        (l) => `<section class="col-lvl">
          <h2 class="col-lvl-h">Уровень ${l}</h2>
          <div class="col-grid">${cases.filter((cs) => cs.requiredLevel === l).map(tile).join('')}</div>
        </section>`
      )
      .join('');
    ctx.el.innerHTML = `
      <div class="page-head"><div><h1>Коллекция</h1><p>Все, кого ты хоть раз выбивал. За полный набор кейса — награда.</p></div></div>
      ${summary()}
      ${groups || ui.empty('collection', 'Пока пусто', 'Открывай кейсы — каждый новый персонаж попадёт сюда.', '<a class="btn btn-primary" href="#/cases">К кейсам</a>')}`;
  }

  /* ======================= Один кейс ======================= */

  function renderCase(ctx, cs) {
    const p = App.collection.caseProgress(cs);
    const locked = App.cases.isLocked(cs);
    const r = App.collection.reward(cs);
    let reward;
    if (p.done && App.collection.claimed(cs)) reward = `<span class="col-done">${ui.svg('check')}Награда получена</span>`;
    else if (p.done) reward = `<span class="col-done">${ui.svg('check')}Собрано</span>`;
    else reward = r && r.coins ? `<span class="col-case-reward">За полный набор: ${ui.cur(r.coins)}</span>` : '';

    const cards = cs.pool
      .map((e) => (App.inv.discovered(e.cid) ? ui.card(e.cid, { size: 'sm' }) : ui.card(e.cid, { size: 'sm', silhouette: true })))
      .join('');

    ctx.el.innerHTML = `
      <a class="col-back" href="#/collection">${ui.svg('back')}<span>Коллекция</span></a>
      <div class="panel col-case" style="${caseStyle(cs)}">
        <div class="col-case-art">${ui.caseImg(cs)}</div>
        <div class="col-case-info">
          <h1 class="col-case-name">${esc(cs.name)}</h1>
          <div class="col-case-progress">
            <span class="col-case-count"><b>${p.have}</b> из ${p.total}</span>
            ${ui.bar(p.pct, p.done ? 'bar-good' : '')}
          </div>
          ${reward}
        </div>
        <div class="col-case-act">
          ${locked
            ? `<span class="col-case-lock">${ui.svg('lock')}С ${cs.requiredLevel} уровня</span>`
            : `<a class="btn btn-primary" href="#/case/${esc(cs.id)}">Открыть кейс</a>`}
        </div>
      </div>
      <div class="grid-cards col-cards" data-cards>${cards}</div>`;
  }

  function renderMissing(ctx) {
    ctx.el.innerHTML = `
      <a class="col-back" href="#/collection">${ui.svg('back')}<span>Коллекция</span></a>
      ${ui.empty('collection', 'Кейс не найден', 'Возможно, его убрали из игры.', '<a class="btn btn-secondary" href="#/collection">К коллекции</a>')}`;
  }

  /* ======================= Регистрация ======================= */

  App.router.register('collection', {
    title: (ctx) => {
      const cs = ctx.params[0] ? App.data.getCase(ctx.params[0]) : null;
      return cs ? `Коллекция · ${cs.name}` : 'Коллекция';
    },
    nav: 'collection',
    feature: 'collection',
    render(ctx) {
      const id = ctx.params[0];

      function render() {
        if (!ctx.alive) return;
        if (!id) return renderOverview(ctx);
        const cs = App.data.getCase(id);
        if (cs && cs.pool.length) renderCase(ctx, cs);
        else renderMissing(ctx);
      }

      ctx.el.addEventListener('click', (e) => {
        const card = e.target.closest('[data-cards] .ccard');
        if (!card) return;
        App.sfx.play('soft');
        ui.showChar(card.dataset.cid);
      });

      render();
      const later = U.debounce(render, 120);
      ctx.on('inventory', later);
      ctx.on('levelup', later);
    },
  });
})();
