/* Переиспользуемые виджеты: ставка, выбор персонажей из инвентаря, сортировка */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const W = (App.widgets = {});

  /* ---------- сортировка предметов ---------- */
  W.sortItems = (items, sort) => {
    const ch = (it) => App.data.getChar(it.cid);
    const tier = (it) => (ch(it) ? ch(it).r.index : -1);
    const val = (it) => App.inv.value(it);
    const name = (it) => (ch(it) ? ch(it).name : '');
    const arr = items.slice();
    switch (sort) {
      case 'old': arr.sort((a, b) => a.t - b.t); break;
      case 'value-desc': arr.sort((a, b) => val(b) - val(a) || b.t - a.t); break;
      case 'value-asc': arr.sort((a, b) => val(a) - val(b) || b.t - a.t); break;
      case 'rarity-desc': arr.sort((a, b) => tier(b) - tier(a) || b.shiny - a.shiny || val(b) - val(a)); break;
      case 'rarity-asc': arr.sort((a, b) => tier(a) - tier(b) || val(a) - val(b)); break;
      case 'name': arr.sort((a, b) => name(a).localeCompare(name(b), 'ru')); break;
      default: arr.sort((a, b) => b.t - a.t);
    }
    return arr;
  };
  W.SORTS = [
    ['new', 'Сначала новые'],
    ['old', 'Сначала старые'],
    ['value-desc', 'Дороже'],
    ['value-asc', 'Дешевле'],
    ['rarity-desc', 'Редкость ↓'],
    ['rarity-asc', 'Редкость ↑'],
    ['name', 'По имени'],
  ];
  W.sortSelect = (current, attrs) =>
    `<select class="select" ${attrs || ''}>${W.SORTS.map(([v, l]) => `<option value="${v}"${v === current ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
  W.rarityChips = (current, attrs) =>
    `<div class="chips" ${attrs || ''}><button class="chip${current === 'all' ? ' active' : ''}" data-r="all">Все</button>${App.data.rarities
      .map((r) => `<button class="chip r-${r.id}${current === r.id ? ' active' : ''}" data-r="${r.id}"><i class="dot"></i>${U.esc(r.name)}</button>`)
      .join('')}</div>`;

  /* ---------- поле ставки ---------- */
  W.betInput = (host, o) => {
    o = o || {};
    const G = GAME_DATA.config.games;
    const key = o.key || 'default';
    const start = App.state.lastBets[key] || o.default || 100;
    host.innerHTML = `<div class="bet">
      <div class="bet-label">${o.label || 'Ставка'}</div>
      <label class="bet-input">${App.ui.icon('coins')}<input type="number" inputmode="numeric" min="${G.minBet}" max="${G.maxBet}" step="1" value="${start}"></label>
      <div class="bet-quick">
        <button type="button" data-q="min">мин</button>
        <button type="button" data-q="half">½</button>
        <button type="button" data-q="double">×2</button>
        <button type="button" data-q="max">макс</button>
      </div>
    </div>`;
    const inp = host.querySelector('input');
    const norm = (v) => U.clamp(Math.floor(Number(v) || 0), G.minBet, G.maxBet);
    function save() {
      App.state.lastBets[key] = api.value;
      App.store.dirty();
      if (o.onChange) o.onChange(api.value);
    }
    host.addEventListener('click', (e) => {
      const b = e.target.closest('[data-q]');
      if (!b || api.disabled) return;
      let v = Number(inp.value) || 0;
      if (b.dataset.q === 'min') v = G.minBet;
      if (b.dataset.q === 'half') v = Math.floor(v / 2);
      if (b.dataset.q === 'double') v = v * 2;
      if (b.dataset.q === 'max') v = Math.min(G.maxBet, App.state.coins);
      inp.value = norm(v);
      App.sfx.play('soft');
      save();
    });
    inp.addEventListener('change', () => {
      inp.value = norm(inp.value);
      save();
    });
    inp.addEventListener('input', () => o.onChange && o.onChange(api.value));
    const api = {
      el: host,
      disabled: false,
      get value() {
        return Math.floor(Number(inp.value) || 0);
      },
      set value(v) {
        inp.value = v;
      },
      disable(on) {
        api.disabled = !!on;
        inp.disabled = !!on;
        host.querySelectorAll('button').forEach((b) => (b.disabled = !!on));
      },
      // проверяет ставку; возвращает число или null
      take() {
        const v = api.value;
        if (v < G.minBet) {
          App.ui.toast(`Минимальная ставка — ${U.fmt(G.minBet)}`, 'bad');
          return null;
        }
        if (v > G.maxBet) {
          App.ui.toast(`Максимальная ставка — ${U.fmt(G.maxBet)}`, 'bad');
          return null;
        }
        if (!App.eco.can(v, 'coins')) {
          App.sfx.play('error');
          App.ui.toast(App.ui.notEnough('coins'), 'bad', { icon: '💸' });
          return null;
        }
        return v;
      },
    };
    return api;
  };

  /* ---------- выбор персонажей из инвентаря ---------- */
  // o: { filter(it), isSelected(uid), isDisabled(it), onToggle(item), emptyText, sort }
  W.itemPicker = (host, o) => {
    o = o || {};
    let q = '';
    let rar = 'all';
    let sort = o.sort || 'value-desc';
    let limit = 60;
    host.innerHTML = `<div class="picker">
      <div class="picker-tools">
        <input class="input" placeholder="Поиск по имени…" data-f="q">
        ${W.sortSelect(sort, 'data-f="sort"')}
      </div>
      ${W.rarityChips('all', 'data-f="rar"')}
      <div class="picker-grid"></div>
      <div class="picker-more"></div>
    </div>`;
    const grid = host.querySelector('.picker-grid');
    const more = host.querySelector('.picker-more');
    function list() {
      let items = App.state.inventory.filter((it) => App.data.getChar(it.cid) && (!o.filter || o.filter(it)));
      if (rar !== 'all') items = items.filter((it) => App.data.getChar(it.cid).rarity === rar);
      if (q) items = items.filter((it) => App.data.getChar(it.cid).name.toLowerCase().includes(q));
      return W.sortItems(items, sort);
    }
    function render() {
      const items = list();
      grid.innerHTML = items.length
        ? items
            .slice(0, limit)
            .map((it) => App.ui.card(it, { size: 'sm', selected: o.isSelected && o.isSelected(it.uid), dim: o.isDisabled && o.isDisabled(it), showNew: false }))
            .join('')
        : `<div class="picker-empty">${o.emptyText || 'Нет подходящих персонажей'}</div>`;
      more.innerHTML = items.length > limit ? `<button class="btn btn-ghost btn-sm" data-more>Показать ещё (${items.length - limit})</button>` : '';
    }
    host.addEventListener('input', (e) => {
      if (e.target.dataset.f === 'q') {
        q = e.target.value.trim().toLowerCase();
        render();
      }
    });
    host.addEventListener('change', (e) => {
      if (e.target.dataset.f === 'sort') {
        sort = e.target.value;
        render();
      }
    });
    host.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-r]');
      if (chip) {
        rar = chip.dataset.r;
        host.querySelectorAll('[data-f="rar"] .chip').forEach((c) => c.classList.toggle('active', c === chip));
        render();
        return;
      }
      if (e.target.closest('[data-more]')) {
        limit += 60;
        render();
        return;
      }
      const card = e.target.closest('.ccard');
      if (card && card.dataset.uid) {
        const it = App.inv.get(card.dataset.uid);
        if (!it) return;
        if (o.isDisabled && o.isDisabled(it) && !(o.isSelected && o.isSelected(it.uid))) {
          if (o.disabledText) App.ui.toast(o.disabledText, 'info');
          return;
        }
        App.sfx.play('soft');
        if (o.onToggle) o.onToggle(it);
        render();
      }
    });
    render();
    return { refresh: render };
  };

  /* ---------- вкладки ---------- */
  W.tabs = (items, active, attrs) =>
    `<div class="tabs" ${attrs || ''}>${items
      .map(([id, label, badge]) => `<button class="tab${id === active ? ' active' : ''}" data-tab="${id}">${label}${badge ? `<span class="tab-badge">${badge}</span>` : ''}</button>`)
      .join('')}</div>`;
})();
