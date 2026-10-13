/* Страница «Коллекция» — все персонажи, которых ты хоть раз выбивал (даже если продал),
 * прогресс по каждому кейсу, награды за проценты коллекции и за полные кейсы, крафт */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;
  const W = App.widgets;

  const orderedCases = () =>
    App.cases.list().slice().sort((a, b) => {
      const sa = a.currency === 'coins' && a.price > 0 && !a.cooldown ? 1 : 0;
      const sb = b.currency === 'coins' && b.price > 0 && !b.cooldown ? 1 : 0;
      return sb - sa || a.requiredLevel - b.requiredLevel || App.data.priceInCoins(a) - App.data.priceInCoins(b);
    });

  App.router.register('collection', {
    title: 'Коллекция',
    render(ctx) {
      let tab = ctx.params[0] || 'all';
      let rar = 'all';
      let missingOnly = false;
      let q = '';

      ctx.el.innerHTML = `
        <div class="page-head"><div><h1>Коллекция</h1><p class="muted">Здесь все персонажи, которых ты <b>хоть раз выбивал</b> — даже если потом продал или распылил. Собирай каждый кейс целиком и забирай награды.</p></div></div>
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

      function header() {
        const t = App.collection.total();
        const shinyKinds = App.data.chars.filter((c) => (App.state.collection[c.id] || {}).shiny > 0).length;
        const ms = App.collection.milestones();
        const doneCases = App.cases.list().filter((cs) => App.collection.caseProgress(cs).done).length;
        return `<div class="col-summary panel">
          <div class="col-ring" style="--p:${t.pct}">
            <div><b>${Math.floor(t.pct)}%</b><small>собрано</small></div>
          </div>
          <div class="col-stats">
            <div><span>Выбито хоть раз</span><b>${t.have} / ${t.total}</b></div>
            <div><span>Собранных кейсов</span><b>${doneCases} / ${App.cases.list().length}</b></div>
            <div><span>Шайни-версий</span><b>✨ ${shinyKinds}</b></div>
            <div><span>Звёздная пыль</span><b>${ui.cur(App.state.dust, 'dust')}</b></div>
          </div>
          ${ms.length
            ? `<div class="col-milestones">
                <div class="cm-track"><i style="width:${Math.min(100, t.pct)}%"></i>${ms.map((m) => `<span class="cm-mark${m.done ? ' done' : ''}" style="left:${m.pct}%"></span>`).join('')}</div>
                <div class="cm-list">${ms
                  .map((m) => {
                    const need = Math.max(0, Math.ceil((m.pct / 100) * t.total - 1e-9) - t.have);
                    return `<div class="cm-item${m.claimed ? ' claimed' : m.done ? ' ready' : ''}">
                      <div class="cm-top"><b>${m.pct}%</b>${ui.reward(m.reward)}</div>
                      ${m.claimed
                        ? '<span class="cm-state good">✓ Получено</span>'
                        : m.done
                          ? `<button class="btn btn-gold btn-xs" data-ms="${m.pct}">Забрать</button>`
                          : `<span class="cm-state">ещё ${need} ${U.plural(need, ['персонаж', 'персонажа', 'персонажей'])}</span>`}
                    </div>`;
                  })
                  .join('')}</div>
              </div>`
            : ''}
          <div class="col-hint muted small">🔮 Нажми на неоткрытого персонажа, чтобы создать его из звёздной пыли. Пыль даёт распыление дубликатов.</div>
        </div>`;
      }

      function tabs() {
        const list = [['all', 'Все персонажи']];
        orderedCases().forEach((cs) => {
          const p = App.collection.caseProgress(cs);
          const ready = p.done && !App.collection.claimed(cs);
          const lock = App.cases.isLocked(cs) ? '🔒 ' : '';
          const lvl = cs.currency === 'coins' && cs.price > 0 && !cs.cooldown ? `<small>ур.${cs.requiredLevel}</small> ` : '';
          list.push([cs.id, `${lock}${lvl}${esc(cs.name)} <small>${p.have}/${p.total}</small>`, ready ? '!' : '']);
        });
        return W.tabs(list, tab, 'data-tabs');
      }

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
              <div><b>Коллекция «${esc(cs.name)}»</b> — ${p.have}/${p.total}${cs.demo ? ' <span class="tag">демо</span>' : ''}</div>
              ${ui.bar(p.pct)}
              <div class="small muted">Награда за полную коллекцию: ${ui.reward(App.collection.reward(cs))}</div>
            </div>
            <a class="btn btn-ghost btn-sm" href="#/case/${esc(cs.id)}">К кейсу</a>
            ${claimed ? '<span class="tag tag-good">✓ Получено</span>' : `<button class="btn ${p.done ? 'btn-gold' : 'btn-ghost'}" data-act="claim" ${p.done ? '' : 'disabled'}>${p.done ? 'Забрать' : 'Не собрано'}</button>`}
          </div>`;
        } else $('[data-reward]').innerHTML = '';

        let chars = cs
          ? cs.pool.map((e) => App.data.getChar(e.cid))
          : App.data.chars.filter((c) => c.inCases.length).sort((a, b) => b.r.index - a.r.index || a.name.localeCompare(b.name, 'ru'));
        if (rar !== 'all') chars = chars.filter((c) => c.rarity === rar);
        if (missingOnly) chars = chars.filter((c) => !App.inv.discovered(c.id));
        if (q) chars = chars.filter((c) => App.inv.discovered(c.id) && c.name.toLowerCase().includes(q));
        const LIMIT = 240;
        $('[data-grid]').innerHTML = chars.length
          ? chars
              .slice(0, LIMIT)
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
              .join('') + (chars.length > LIMIT ? `<div class="empty small">Показаны первые ${LIMIT} — выбери кейс во вкладках</div>` : '')
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
        const ms = e.target.closest('[data-ms]');
        if (ms) {
          App.collection.claimMilestone(Number(ms.dataset.ms));
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
