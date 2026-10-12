/* Страница «Коллекция» — все персонажи, прогресс по кейсам, крафт */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;
  const W = App.widgets;

  App.router.register('collection', {
    title: 'Коллекция',
    render(ctx) {
      let tab = ctx.params[0] || 'all';
      let rar = 'all';
      let missingOnly = false;
      let q = '';

      function tabs() {
        const list = [['all', 'Все персонажи']];
        App.cases.list().forEach((cs) => {
          const p = App.collection.caseProgress(cs);
          const ready = p.done && !App.collection.claimed(cs);
          list.push([cs.id, `${esc(cs.name)} <small>${p.have}/${p.total}</small>`, ready ? '!' : '']);
        });
        return W.tabs(list, tab, 'data-tabs');
      }

      function header() {
        const total = App.data.chars.length;
        const have = App.inv.uniqueCount();
        const shinyKinds = App.data.chars.filter((c) => (App.state.collection[c.id] || {}).shiny > 0).length;
        return `<div class="col-summary panel">
          <div class="col-ring" style="--p:${total ? (have / total) * 100 : 0}">
            <div><b>${total ? Math.floor((have / total) * 100) : 0}%</b><small>собрано</small></div>
          </div>
          <div class="col-stats">
            <div><span>Открыто персонажей</span><b>${have} / ${total}</b></div>
            <div><span>Шайни-версий</span><b>✨ ${shinyKinds}</b></div>
            <div><span>Звёздная пыль</span><b>${ui.cur(App.state.dust, 'dust')}</b></div>
            <div class="col-rar">${App.data.rarities
              .map((r) => {
                const all = App.data.byRarity(r.id);
                const got = all.filter((c) => App.inv.discovered(c.id)).length;
                return all.length ? `<span class="rar-chip r-${r.id}" title="${esc(r.name)}"><i class="dot"></i>${got}/${all.length}</span>` : '';
              })
              .join('')}</div>
          </div>
          <div class="col-hint muted small">🔮 Нажми на персонажа, чтобы создать его из звёздной пыли. Пыль получается за распыление дубликатов.</div>
        </div>`;
      }

      ctx.el.innerHTML = `
        <div class="page-head"><div><h1>Коллекция</h1><p class="muted">Собери всех героинь и получи награды за полные коллекции кейсов</p></div></div>
        <div data-header></div>
        <div data-tabs-host></div>
        <div data-reward></div>
        <div class="toolbar panel">
          <input class="input" placeholder="Поиск…" data-f="q">
          <label class="switch-row"><input type="checkbox" data-f="missing"><span class="switch"></span>Только недостающие</label>
        </div>
        ${W.rarityChips('all', 'data-f="rar"')}
        <div class="grid-cards" data-grid></div>`;

      const $ = (s) => ctx.el.querySelector(s);

      function render() {
        $('[data-header]').innerHTML = header();
        $('[data-tabs-host]').innerHTML = tabs();
        const cs = tab !== 'all' ? App.data.getCase(tab) : null;
        if (cs) {
          const p = App.collection.caseProgress(cs);
          const claimed = App.collection.claimed(cs);
          $('[data-reward]').innerHTML = `<div class="col-reward panel${p.done && !claimed ? ' ready' : ''}" style="--cc:${esc(cs.color)}">
            ${ui.caseImg(cs, 'col-reward-art')}
            <div class="col-reward-body">
              <div><b>Коллекция «${esc(cs.name)}»</b> — ${p.have}/${p.total}</div>
              ${ui.bar(p.pct)}
              <div class="small muted">Награда за полную коллекцию: ${ui.reward(App.collection.reward(cs))}</div>
            </div>
            ${claimed ? '<span class="tag tag-good">✓ Получено</span>' : `<button class="btn ${p.done ? 'btn-gold' : 'btn-ghost'}" data-act="claim" ${p.done ? '' : 'disabled'}>${p.done ? 'Забрать' : 'Не собрано'}</button>`}
          </div>`;
        } else $('[data-reward]').innerHTML = '';

        let chars = cs ? cs.pool.map((e) => App.data.getChar(e.cid)) : App.data.chars.slice().sort((a, b) => b.r.index - a.r.index || a.name.localeCompare(b.name, 'ru'));
        if (rar !== 'all') chars = chars.filter((c) => c.rarity === rar);
        if (missingOnly) chars = chars.filter((c) => !App.inv.discovered(c.id));
        if (q) chars = chars.filter((c) => App.inv.discovered(c.id) && c.name.toLowerCase().includes(q));
        $('[data-grid]').innerHTML = chars.length
          ? chars
              .map((c) => {
                const d = App.inv.discovered(c.id);
                const n = App.inv.countOf(c.id);
                const col = App.state.collection[c.id];
                const canCraft = !d && App.state.dust >= App.data.craftCost(c.id);
                return ui.card(c.id, {
                  silhouette: !d,
                  count: n,
                  hideValue: !d,
                  cls: d ? '' : 'undiscovered',
                  badge: (col && col.shiny ? '<span class="cbadge cb-shiny">✨</span>' : '') + (canCraft ? '<span class="cbadge cb-craft" title="Можно создать">🔮</span>' : ''),
                });
              })
              .join('')
          : ui.empty('🔍', 'Ничего не найдено', missingOnly ? 'Похоже, тут у тебя уже все! 🎉' : 'Попробуй изменить фильтры');
      }

      ctx.el.addEventListener('click', (e) => {
        const t = e.target.closest('[data-tab]');
        if (t) {
          tab = t.dataset.tab;
          App.sfx.play('soft');
          render();
          return;
        }
        const chip = e.target.closest('[data-f="rar"] [data-r]');
        if (chip) {
          rar = chip.dataset.r;
          ctx.el.querySelectorAll('[data-f="rar"] .chip').forEach((c) => c.classList.toggle('active', c === chip));
          render();
          return;
        }
        const a = e.target.closest('[data-act="claim"]');
        if (a) {
          const cs = App.data.getCase(tab);
          if (cs) App.collection.claim(cs);
          render();
          return;
        }
        const card = e.target.closest('[data-grid] .ccard');
        if (card) ui.showChar(card.dataset.cid);
      });
      ctx.el.addEventListener('change', (e) => {
        if (e.target.dataset.f === 'missing') {
          missingOnly = e.target.checked;
          render();
        }
      });
      ctx.el.addEventListener('input', (e) => {
        if (e.target.dataset.f === 'q') {
          q = e.target.value.trim().toLowerCase();
          render();
        }
      });
      render();
      ctx.on('inventory', U.debounce(() => ctx.alive && render(), 80));
      ctx.on('balance', U.debounce(() => ctx.alive && render(), 80));
    },
  });
})();
