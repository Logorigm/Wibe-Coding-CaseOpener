/* Страница «Инвентарь» */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const W = App.widgets;

  // фильтры запоминаются на время сессии
  const F = { q: '', rar: 'all', sort: 'new', shiny: false, group: false };

  App.router.register('inventory', {
    title: 'Инвентарь',
    render(ctx) {
      let selectMode = false;
      const selected = new Set();
      let limit = 120;

      ctx.el.innerHTML = `
        <div class="page-head">
          <div><h1>Инвентарь</h1><p class="muted" data-summary></p></div>
          <div class="page-actions">
            <button class="btn btn-ghost" data-act="dupes-sell">Продать дубликаты</button>
            <button class="btn btn-ghost" data-act="dupes-dust">Распылить дубликаты</button>
            <button class="btn btn-gold" data-act="sell-all">Продать всё</button>
          </div>
        </div>
        <div class="toolbar panel">
          <input class="input" placeholder="Поиск по имени…" data-f="q" value="${U.esc(F.q)}">
          ${W.sortSelect(F.sort, 'data-f="sort"')}
          <label class="switch-row"><input type="checkbox" data-f="shiny"${F.shiny ? ' checked' : ''}><span class="switch"></span>Только шайни</label>
          <label class="switch-row"><input type="checkbox" data-f="group"${F.group ? ' checked' : ''}><span class="switch"></span>Стопками</label>
          <button class="btn btn-ghost btn-sm" data-act="select">☑ Выбрать</button>
        </div>
        ${W.rarityChips(F.rar, 'data-f="rar"')}
        <div class="grid-cards" data-grid></div>
        <div class="center" data-more></div>
        <div class="select-bar" data-selbar hidden>
          <div class="sb-info"><b data-selcount>0</b> выбрано · <span data-selvalue></span></div>
          <div class="sb-actions">
            <button class="btn btn-sm btn-ghost" data-act="sel-all">Выбрать все</button>
            <button class="btn btn-sm btn-gold" data-act="sel-sell">Продать</button>
            <button class="btn btn-sm btn-ghost" data-act="sel-dust">Распылить</button>
            <button class="btn btn-sm btn-ghost" data-act="sel-lock">🔒</button>
            <button class="btn btn-sm btn-ghost" data-act="select">Отмена</button>
          </div>
        </div>`;

      const $ = (s) => ctx.el.querySelector(s);
      const grid = $('[data-grid]');

      function filtered() {
        let items = App.state.inventory.slice();
        if (F.rar !== 'all') items = items.filter((it) => (App.data.getChar(it.cid) || {}).rarity === F.rar);
        if (F.shiny) items = items.filter((it) => it.shiny);
        if (F.q) items = items.filter((it) => ((App.data.getChar(it.cid) || {}).name || '').toLowerCase().includes(F.q));
        return W.sortItems(items, F.sort);
      }

      function summary() {
        const inv = App.state.inventory;
        $('[data-summary]').innerHTML = `${U.fmt(inv.length)} ${U.plural(inv.length, ['персонаж', 'персонажа', 'персонажей'])} на сумму ${ui.cur(App.inv.totalValue())}`;
      }

      function render() {
        summary();
        const items = filtered();
        if (!App.state.inventory.length) {
          grid.innerHTML = ui.empty('🎒', 'Инвентарь пуст', 'Открой кейс, чтобы получить первых персонажей', '<a class="btn btn-primary" href="#/cases">К кейсам</a>');
          $('[data-more]').innerHTML = '';
          return;
        }
        if (F.group) {
          const groups = new Map();
          items.forEach((it) => {
            const k = it.cid + (it.shiny ? ':s' : '');
            if (!groups.has(k)) groups.set(k, []);
            groups.get(k).push(it);
          });
          const arr = Array.from(groups.values());
          grid.innerHTML = arr.length
            ? arr.slice(0, limit).map((g) => ui.card(g[0], { count: g.length, attrs: `data-group="${U.esc(g[0].cid)}"`, selected: g.every((x) => selected.has(x.uid)) })).join('')
            : ui.empty('🔍', 'Ничего не найдено', 'Попробуй изменить фильтры');
          $('[data-more]').innerHTML = arr.length > limit ? `<button class="btn btn-ghost" data-act="more">Показать ещё</button>` : '';
        } else {
          grid.innerHTML = items.length
            ? items.slice(0, limit).map((it) => ui.card(it, { selected: selected.has(it.uid) })).join('')
            : ui.empty('🔍', 'Ничего не найдено', 'Попробуй изменить фильтры');
          $('[data-more]').innerHTML = items.length > limit ? `<button class="btn btn-ghost" data-act="more">Показать ещё (${items.length - limit})</button>` : '';
        }
        updateSelBar();
      }

      function updateSelBar() {
        const bar = $('[data-selbar]');
        bar.hidden = !selectMode;
        ctx.el.classList.toggle('selecting', selectMode);
        if (!selectMode) return;
        let v = 0;
        selected.forEach((uid) => {
          const it = App.inv.get(uid);
          if (it) v += App.inv.value(it);
        });
        $('[data-selcount]').textContent = selected.size;
        $('[data-selvalue]').innerHTML = ui.cur(v);
      }

      async function bulk(act) {
        const uids = Array.from(selected);
        if (!uids.length) return ui.toast('Ничего не выбрано', 'info');
        if (act === 'sell') {
          const r = await App.inv.sellSafe(uids);
          if (r.n) ui.toast(`Продано ${r.n} за ${ui.cur(r.total)}`, 'good');
        } else if (act === 'dust') {
          const total = uids.reduce((s, uid) => {
            const it = App.inv.get(uid);
            return s + (it && !it.locked ? App.data.dust(it.cid, it.shiny) : 0);
          }, 0);
          if (!(await ui.confirm(`Распылить ${uids.length} ${U.plural(uids.length, ['персонажа', 'персонажей', 'персонажей'])} и получить ${ui.cur(total, 'dust')}?`, { ok: 'Распылить' }))) return;
          const r = App.inv.disenchant(uids);
          if (r.n) ui.toast(`Получено ${ui.cur(r.total, 'dust')}`, 'good');
        } else if (act === 'lock') {
          const anyUnlocked = uids.some((uid) => App.inv.get(uid) && !App.inv.get(uid).locked);
          uids.forEach((uid) => {
            const it = App.inv.get(uid);
            if (it) it.locked = anyUnlocked;
          });
          App.bus.emit('inventory');
          App.store.dirty();
          ui.toast(anyUnlocked ? 'Закреплено — эти персонажи не продаются массово' : 'Откреплено', 'info');
        }
        selected.clear();
        render();
      }

      async function dupes(mode) {
        const d = App.inv.duplicates();
        if (!d.length) return ui.toast('Дубликатов нет — у тебя по одному каждого персонажа', 'info');
        const uids = d.map((it) => it.uid);
        if (mode === 'sell') {
          const total = d.reduce((s, it) => s + App.inv.value(it), 0);
          if (!(await ui.confirm(`Продать ${d.length} ${U.plural(d.length, ['дубликат', 'дубликата', 'дубликатов'])} за ${ui.cur(total)}?<br><span class="small muted">Останется по одному экземпляру каждого персонажа (шайни и закреплённые — в приоритете).</span>`, { ok: 'Продать' }))) return;
          const r = App.inv.sell(uids);
          ui.toast(`Продано ${r.n} за ${ui.cur(r.total)}`, 'good');
        } else {
          const total = d.reduce((s, it) => s + App.data.dust(it.cid, it.shiny), 0);
          if (!(await ui.confirm(`Распылить ${d.length} ${U.plural(d.length, ['дубликат', 'дубликата', 'дубликатов'])} и получить ${ui.cur(total, 'dust')}?`, { ok: 'Распылить' }))) return;
          const r = App.inv.disenchant(uids);
          ui.toast(`Получено ${ui.cur(r.total, 'dust')}`, 'good');
        }
        render();
      }

      ctx.el.addEventListener('input', (e) => {
        if (e.target.dataset.f === 'q') {
          F.q = e.target.value.trim().toLowerCase();
          limit = 120;
          render();
        }
      });
      ctx.el.addEventListener('change', (e) => {
        const f = e.target.dataset.f;
        if (f === 'sort') F.sort = e.target.value;
        else if (f === 'shiny') F.shiny = e.target.checked;
        else if (f === 'group') F.group = e.target.checked;
        else return;
        render();
      });
      ctx.el.addEventListener('click', async (e) => {
        const chip = e.target.closest('[data-f="rar"] [data-r]');
        if (chip) {
          F.rar = chip.dataset.r;
          ctx.el.querySelectorAll('[data-f="rar"] .chip').forEach((c) => c.classList.toggle('active', c === chip));
          App.sfx.play('soft');
          limit = 120;
          render();
          return;
        }
        const a = e.target.closest('[data-act]');
        if (a) {
          const act = a.dataset.act;
          if (act === 'more') { limit += 120; render(); }
          else if (act === 'select') { selectMode = !selectMode; selected.clear(); render(); }
          else if (act === 'sel-all') { filtered().forEach((it) => !it.locked && selected.add(it.uid)); render(); }
          else if (act === 'sel-sell') bulk('sell');
          else if (act === 'sel-dust') bulk('dust');
          else if (act === 'sel-lock') bulk('lock');
          else if (act === 'dupes-sell') dupes('sell');
          else if (act === 'dupes-dust') dupes('dust');
          else if (act === 'sell-all') {
            const items = App.state.inventory.filter((it) => !it.locked);
            if (!items.length) return ui.toast('Нечего продавать', 'info');
            const total = items.reduce((s, it) => s + App.inv.value(it), 0);
            if (await ui.confirm(`Продать ВСЕХ незакреплённых персонажей (${items.length}) за ${ui.cur(total)}?`, { ok: 'Продать всё', danger: true })) {
              const r = App.inv.sell(items.map((it) => it.uid));
              ui.toast(`Продано ${r.n} за ${ui.cur(r.total)}`, 'good');
              render();
            }
          }
          return;
        }
        const card = e.target.closest('.ccard');
        if (!card) return;
        if (selectMode) {
          const uids = F.group && card.dataset.group
            ? filtered().filter((it) => it.cid === card.dataset.group && it.shiny === card.classList.contains('shiny')).map((it) => it.uid)
            : [card.dataset.uid];
          const allSel = uids.every((u) => selected.has(u));
          uids.forEach((u) => {
            const it = App.inv.get(u);
            if (!it) return;
            if (allSel) selected.delete(u);
            else if (!it.locked) selected.add(u);
          });
          card.classList.toggle('sel', !allSel);
          App.sfx.play('soft');
          updateSelBar();
        } else {
          ui.showChar(card.dataset.cid, { uid: card.dataset.uid });
        }
      });

      render();
      ctx.on('inventory', U.debounce(() => ctx.alive && render(), 60));
      ctx.onDestroy(() => App.inv.markSeen());
    },
  });
})();
