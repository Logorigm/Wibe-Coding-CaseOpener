/* Страница «Инвентарь»: одинаковые персонажи собраны в стопки */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const W = App.widgets;
  const esc = U.esc;

  const PAGE = 120; // сколько стопок показываем за раз
  const TOOLS_FROM = 8; // фильтры и сортировка появляются, когда персонажей много
  const SEARCH_FROM = 41; // поиск — когда разных персонажей больше 40

  // фильтры запоминаются на время сессии
  const F = { q: '', rar: 'all', sort: 'new' };

  // одна стопка на персонажа: самый новый экземпляр + количество
  function stacks() {
    const map = new Map();
    App.state.inventory.forEach((it) => {
      const ch = App.data.getChar(it.cid);
      if (!ch) return;
      let s = map.get(it.cid);
      if (!s) map.set(it.cid, (s = { cid: it.cid, ch, top: it, count: 0, isNew: false }));
      s.count++;
      if (it.isNew) s.isNew = true;
      if (it.t > s.top.t || (it.t === s.top.t && (it.n || 0) > (s.top.n || 0))) s.top = it;
    });
    return Array.from(map.values());
  }

  App.router.register('inventory', {
    title: 'Инвентарь',
    nav: 'inventory',
    feature: 'inventory',
    render(ctx) {
      let limit = PAGE;
      let toolsKey = '';

      ctx.el.innerHTML = `
        <div class="page-head">
          <div><h1>Инвентарь</h1><p data-summary></p></div>
          <div class="inv-actions" data-actions></div>
        </div>
        <div class="inv-tools" data-tools></div>
        <div data-list></div>
        <div class="inv-more" data-more></div>`;

      const $ = (s) => ctx.el.querySelector(s);

      function renderHead(total) {
        const n = App.state.inventory.length;
        $('[data-summary]').innerHTML = n
          ? `${U.fmt(n)} ${U.plural(n, ['персонаж', 'персонажа', 'персонажей'])} · стоимость ${ui.cur(total)}`
          : 'Здесь хранятся выпавшие персонажи';
        if (!n) {
          $('[data-actions]').innerHTML = '';
          return;
        }
        const d = App.inv.duplicates();
        const dv = d.reduce((s, it) => s + App.inv.value(it), 0);
        $('[data-actions]').innerHTML = `
          <button class="btn btn-primary btn-sm" data-act="dupes"${d.length ? '' : ' disabled title="У тебя по одному каждого персонажа"'}>
            Продать дубликаты${d.length ? ' ' + ui.cur(dv) : ''}
          </button>
          <button class="btn btn-secondary btn-sm" data-act="all">Продать всё</button>`;
      }

      // панель фильтров перерисовываем, только когда меняется её состав (чтобы не терять фокус в поиске)
      function renderTools(all) {
        const showTools = all.length >= TOOLS_FROM;
        const showSearch = all.length >= SEARCH_FROM;
        const have = new Set(all.map((s) => s.ch.rarity));
        if (!showTools) {
          F.rar = 'all';
          F.q = '';
        }
        if (!showSearch) F.q = '';
        if (F.rar !== 'all' && !have.has(F.rar)) F.rar = 'all';

        const key = showTools ? `${showSearch ? 1 : 0}|${F.rar}|${App.data.rarities.map((r) => (have.has(r.id) ? 1 : 0)).join('')}` : '';
        if (key === toolsKey) return;
        toolsKey = key;
        const box = $('[data-tools]');
        if (!showTools) {
          box.innerHTML = '';
          box.hidden = true;
          return;
        }
        box.hidden = false;
        box.innerHTML = `
          ${showSearch ? `<input class="input inv-search" type="search" placeholder="Поиск по имени" data-f="q" value="${esc(F.q)}">` : ''}
          ${W.rarityChips(F.rar, 'data-f="rar"')}
          ${W.sortSelect(F.sort, 'data-f="sort" aria-label="Сортировка"')}`;
        box.querySelectorAll('[data-f="rar"] [data-r]').forEach((b) => {
          if (b.dataset.r !== 'all' && !have.has(b.dataset.r)) b.disabled = true;
        });
      }

      function render() {
        const all = stacks();
        const total = App.inv.totalValue();
        renderHead(total);
        renderTools(all);

        const list = $('[data-list]');
        const more = $('[data-more]');
        if (!all.length) {
          list.innerHTML = ui.empty('inventory', 'Пока пусто', 'Открой кейс — выпавшие персонажи появятся здесь', '<a class="btn btn-primary" href="#/cases">К кейсам</a>');
          more.innerHTML = '';
          return;
        }

        let shown = all;
        if (F.rar !== 'all') shown = shown.filter((s) => s.ch.rarity === F.rar);
        if (F.q) shown = shown.filter((s) => s.ch.name.toLowerCase().includes(F.q));
        // сортируем стопки по их самому новому экземпляру
        const byUid = new Map(shown.map((s) => [s.top.uid, s]));
        shown = W.sortItems(shown.map((s) => s.top), F.sort).map((it) => byUid.get(it.uid));

        if (!shown.length) {
          list.innerHTML = ui.empty('', 'Ничего не найдено', 'Попробуй другой фильтр');
          more.innerHTML = '';
          return;
        }
        list.innerHTML = `<div class="grid-cards inv-grid">${shown
          .slice(0, limit)
          .map((s) => ui.card({ uid: s.top.uid, cid: s.cid, isNew: s.isNew }, { count: s.count, size: 'md', attrs: 'tabindex="0" role="button"' }))
          .join('')}</div>`;
        const rest = shown.length - limit;
        more.innerHTML = rest > 0 ? `<button class="btn btn-secondary" data-act="more">Показать ещё (${U.fmt(rest)})</button>` : '';
      }

      function soldToast(r) {
        if (r && r.n) ui.toast(`Продано ${U.fmt(r.n)} ${U.plural(r.n, ['персонаж', 'персонажа', 'персонажей'])} за ${ui.cur(r.total)}`, 'good');
      }

      async function sellDupes() {
        const d = App.inv.duplicates();
        if (!d.length) return;
        soldToast(await App.inv.sellSafe(d.map((it) => it.uid)));
      }

      async function sellAll() {
        const items = App.state.inventory.slice();
        if (!items.length) return;
        const total = items.reduce((s, it) => s + App.inv.value(it), 0);
        const ok = await ui.confirm(
          `Продать всех персонажей (${U.fmt(items.length)}) за ${ui.cur(total)}?<div class="muted small inv-note">Коллекция сохранится — открытые персонажи из неё не пропадут.</div>`,
          { title: 'Продать всё', ok: 'Продать всё', danger: true }
        );
        if (!ok || !ctx.alive) return;
        soldToast(App.inv.sell(items.map((it) => it.uid)));
      }

      function openCard(card) {
        App.sfx.play('soft');
        ui.showChar(card.dataset.cid, { uid: card.dataset.uid });
      }

      ctx.el.addEventListener('input', (e) => {
        if (e.target.dataset.f !== 'q') return;
        F.q = e.target.value.trim().toLowerCase();
        limit = PAGE;
        render();
      });
      ctx.el.addEventListener('change', (e) => {
        if (e.target.dataset.f !== 'sort') return;
        F.sort = e.target.value;
        limit = PAGE;
        render();
      });
      ctx.el.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-f="rar"] [data-r]');
        if (chip) {
          if (chip.disabled || chip.dataset.r === F.rar) return;
          F.rar = chip.dataset.r;
          ctx.el.querySelectorAll('[data-f="rar"] [data-r]').forEach((c) => c.classList.toggle('active', c === chip));
          App.sfx.play('soft');
          limit = PAGE;
          render();
          return;
        }
        const a = e.target.closest('[data-act]');
        if (a) {
          if (a.disabled) return;
          const act = a.dataset.act;
          if (act === 'more') {
            limit += PAGE;
            render();
          } else if (act === 'dupes') sellDupes();
          else if (act === 'all') sellAll();
          return;
        }
        const card = e.target.closest('.ccard[data-uid]');
        if (card) openCard(card);
      });
      ctx.el.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const card = e.target.closest && e.target.closest('.ccard[data-uid]');
        if (!card || card !== e.target) return;
        e.preventDefault();
        openCard(card);
      });

      render();
      ctx.on('inventory', U.debounce(() => ctx.alive && render(), 60));
      // отметки «новый» гаснут, когда игрок уходит со страницы
      ctx.onDestroy(() => App.inv.markSeen());
    },
  });
})();
