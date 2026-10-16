/* Общие элементы интерфейса: иконки, монеты, тосты, окна, карточки, окно выпадения */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const esc = U.esc;
  const ui = (App.ui = {});

  /* ======================= Иконки (линейные, цвет = currentColor) ======================= */
  const ICONS = {
    cases: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    inventory: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    collection: '<rect x="7" y="3" width="13" height="17" rx="2"/><path d="M4 7v12a2 2 0 0 0 2 2h10"/>',
    games: '<path d="M7 8h10a4 4 0 0 1 3.9 4.9l-.8 3.5a2.6 2.6 0 0 1-4.4 1.2L14 16h-4l-1.7 1.6a2.6 2.6 0 0 1-4.4-1.2l-.8-3.5A4 4 0 0 1 7 8z"/><path d="M8 11v3M6.5 12.5h3M15.5 11.5h.01M17.5 13.5h.01"/>',
    profile: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5v1A3.5 3.5 0 0 0 8 10.5M16 6h3.5v1a3.5 3.5 0 0 1-3.5 3.5M12 13v4M8 21h8M10 17h4v4h-4z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    dev: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    next: '<path d="M9 18l6-6-6-6"/>',
    close: '<path d="M18 6L6 18M6 6l12 12"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8C10 4 6.5 4.5 7 7c.3 1 2 1 5 1M12 8c2-4 5.5-3.5 5-1-.3 1-2 1-5 1"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    coinflip: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/>',
    slots: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 5v14M15 5v14"/>',
    sound: '<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
    mute: '<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/>',
    sell: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  };
  ui.svg = (name, cls) => `<svg class="i ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  ui.hasIcon = (name) => !!ICONS[name];

  /* ======================= Монеты ======================= */
  const COIN = 'assets/ui/coin-64.webp';
  const COIN_BIG = 'assets/ui/coin-256.webp';
  ui.coin = (cls) => `<img class="coin ${cls || ''}" src="${cls && cls.includes('big') ? COIN_BIG : COIN}" alt="" draggable="false">`;
  // ui.cur(сумма, { sign, short, cls }); старый вызов ui.cur(сумма, 'coins', o) тоже работает
  ui.cur = (amount, a, b) => {
    const o = (typeof a === 'object' && a) || b || {};
    const n = Math.round(Number(amount) || 0);
    const num = o.short ? U.short(n) : U.fmt(n);
    return `<span class="cur${o.cls ? ' ' + o.cls : ''}">${ui.coin()}<b>${o.sign && n > 0 ? '+' : ''}${num}</b></span>`;
  };
  ui.reward = (r) => (r && r.coins ? ui.cur(r.coins, { sign: true }) : '');

  ui.rarityTag = (chOrR, o) => {
    const r = chOrR && chOrR.r ? chOrR.r : chOrR;
    if (!r) return '';
    const name = o && o.ach ? r.ach || r.name : r.name;
    return `<span class="rtag r-${r.id}"><i></i>${esc(name)}</span>`;
  };

  /* ======================= Тосты ======================= */
  ui.toast = (html, type, o) => {
    o = o || {};
    const root = document.getElementById('toasts');
    if (!root) return () => {};
    const el = document.createElement('div');
    el.className = `toast toast-${type || 'info'}${o.cls ? ' ' + o.cls : ''}`;
    el.innerHTML = `<div class="toast-body">${html}</div>`;
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      el.classList.add('out');
      setTimeout(() => el.remove(), 250);
    };
    el.addEventListener('click', () => {
      if (o.onClick) o.onClick();
      close();
    });
    if (o.onClick) el.classList.add('clickable');
    root.appendChild(el);
    while (root.children.length > 4) root.firstElementChild.remove();
    setTimeout(close, o.timeout || 3200);
    return close;
  };

  /* ======================= Модальные окна ======================= */
  const stack = [];
  ui.modal = (opts) => {
    opts = opts || {};
    const root = document.getElementById('modal-root');
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    const closable = opts.closable !== false;
    bg.innerHTML = `<div class="modal ${opts.cls || ''} ${opts.size ? 'modal-' + opts.size : ''}" role="dialog" aria-modal="true">
      ${opts.title != null ? `<div class="modal-head"><h3>${opts.title}</h3></div>` : ''}
      ${closable ? `<button class="modal-x" data-close aria-label="Закрыть">${ui.svg('close')}</button>` : ''}
      <div class="modal-body"></div>
      ${opts.actions && opts.actions.length ? '<div class="modal-foot"></div>' : ''}
    </div>`;
    const modal = bg.firstElementChild;
    const body = modal.querySelector('.modal-body');
    if (typeof opts.html === 'string') body.innerHTML = opts.html;
    else if (opts.html instanceof Node) body.appendChild(opts.html);
    const m = { el: modal, bg, body, closed: false, closable, btn: {} };
    function close(result) {
      if (m.closed) return;
      m.closed = true;
      bg.classList.add('closing');
      const i = stack.indexOf(m);
      if (i >= 0) stack.splice(i, 1);
      setTimeout(() => bg.remove(), 180);
      if (!stack.length) document.body.classList.remove('modal-open');
      if (opts.onClose) opts.onClose(result);
    }
    m.close = close;
    if (opts.actions) {
      const foot = modal.querySelector('.modal-foot');
      opts.actions.filter(Boolean).forEach((a) => {
        const b = document.createElement('button');
        b.className = 'btn ' + (a.cls || 'btn-secondary');
        b.innerHTML = a.label;
        b.addEventListener('click', async () => {
          if (b.disabled) return;
          App.sfx.play('click');
          const r = a.onClick ? await a.onClick(m, b) : undefined;
          if (r !== false) close(a.id);
        });
        foot.appendChild(b);
        if (a.id) m.btn[a.id] = b;
      });
    }
    bg.addEventListener('mousedown', (e) => {
      if (e.target === bg && closable && opts.backdropClose !== false) close();
    });
    modal.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) close();
    });
    root.appendChild(bg);
    stack.push(m);
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => bg.classList.add('open'));
    if (opts.onOpen) opts.onOpen(m);
    return m;
  };
  ui.topModal = () => stack[stack.length - 1] || null;
  ui.closeAll = () => stack.slice().forEach((m) => m.close());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && stack.length) {
      const m = stack[stack.length - 1];
      if (m.closable) m.close();
    }
  });

  ui.confirm = (text, o) =>
    new Promise((res) => {
      o = o || {};
      let done = false;
      ui.modal({
        title: o.title || 'Подтверждение',
        size: 'sm',
        html: `<div class="confirm-text">${text}</div>`,
        actions: [
          { label: o.cancel || 'Отмена', cls: 'btn-secondary', onClick: () => { done = true; res(false); } },
          { label: o.ok || 'Да', cls: o.danger ? 'btn-danger' : 'btn-primary', onClick: () => { done = true; res(true); } },
        ],
        onClose: () => { if (!done) res(false); },
      });
    });

  ui.prompt = (title, value, o) =>
    new Promise((res) => {
      o = o || {};
      let done = false;
      const m = ui.modal({
        title,
        size: 'sm',
        html: `${o.text ? `<p class="muted">${o.text}</p>` : ''}<input class="input" maxlength="${o.maxLength || 40}" placeholder="${esc(o.placeholder || '')}" value="${esc(value || '')}">`,
        actions: [
          { label: 'Отмена', cls: 'btn-secondary', onClick: () => { done = true; res(null); } },
          { label: o.ok || 'Сохранить', cls: 'btn-primary', onClick: (mm) => { done = true; res(mm.body.querySelector('input').value.trim()); } },
        ],
        onClose: () => { if (!done) res(null); },
      });
      const inp = m.body.querySelector('input');
      setTimeout(() => { inp.focus(); inp.select(); }, 50);
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          done = true;
          res(inp.value.trim());
          m.close();
        }
      });
    });

  /* ======================= «Когда освободишься» ======================= */
  // Пока идёт анимация (открытие кейса и т.п.), окна нового уровня и достижения ждут.
  let busy = 0;
  const idleQueue = [];
  App.setBusy = (on) => {
    busy = Math.max(0, busy + (on ? 1 : -1));
    while (!busy && idleQueue.length) {
      try { idleQueue.shift()(); } catch (e) { console.error(e); }
    }
  };
  App.isBusy = () => busy > 0;
  ui.whenIdle = (fn) => {
    if (!busy) fn();
    else idleQueue.push(fn);
  };

  /* ======================= Карточка персонажа ======================= */
  // src: предмет инвентаря {uid,cid,...} или id персонажа
  // o: { size: xs|sm|md|lg|xl, silhouette, hideValue, count, chance, selected, dim, cls, attrs, badge, showNew }
  ui.card = (src, o) => {
    o = o || {};
    const item = src && typeof src === 'object' ? src : null;
    const cid = item ? item.cid : src;
    const ch = App.data.getChar(cid);
    const size = o.size || 'md';
    if (!ch) {
      return `<div class="ccard ${size} unknown"${item ? ` data-uid="${esc(item.uid)}"` : ''}><div class="ccard-art"><img src="${App.art.unknown()}" alt=""></div><div class="ccard-info"><div class="ccard-name">Неизвестный</div></div></div>`;
    }
    const sil = !!o.silhouette;
    const cls = ['ccard', size, 'r-' + ch.rarity, 't' + ch.r.index];
    if (sil) cls.push('sil');
    if (o.selected) cls.push('sel');
    if (o.dim) cls.push('dim');
    if (o.cls) cls.push(o.cls);
    const badges = [];
    if (item && item.isNew && o.showNew !== false) badges.push('<span class="cbadge cb-new"></span>');
    if (o.count > 1) badges.push(`<span class="cbadge cb-count">×${o.count}</span>`);
    if (o.badge) badges.push(o.badge);
    const img = sil ? App.art.unknown() : App.art.portrait(ch);
    return `<div class="${cls.join(' ')}" data-cid="${esc(cid)}"${item ? ` data-uid="${esc(item.uid)}"` : ''}${o.attrs ? ' ' + o.attrs : ''}>
<div class="ccard-art"><img src="${esc(img)}"${sil ? '' : ` data-cid="${esc(cid)}"`} alt="" loading="lazy" draggable="false"></div>
${badges.length ? `<div class="cbadges">${badges.join('')}</div>` : ''}
${o.chance != null ? `<span class="cchance">${U.pct(o.chance)}</span>` : ''}
<div class="ccard-info"><div class="ccard-name">${sil ? '???' : esc(ch.name)}</div>${o.hideValue || sil || size === 'xs' ? '' : `<div class="ccard-val">${ui.cur(App.data.value(cid), { short: true })}</div>`}</div>
</div>`;
  };

  // Если картинка персонажа не загрузилась — подставляем заглушку
  document.addEventListener(
    'error',
    (e) => {
      const t = e.target;
      if (!t || t.tagName !== 'IMG' || t.dataset.fallback) return;
      if (t.dataset.cid) {
        const ch = App.data.getChar(t.dataset.cid);
        t.dataset.fallback = '1';
        t.src = ch ? App.art.generated(ch) : App.art.unknown();
        if (ch && !ui._imgWarned[ch.id]) {
          ui._imgWarned[ch.id] = true;
          console.warn(`[WaifuDrop] Не найдена картинка персонажа «${ch.id}»: ${ch.image}`);
        }
      } else if (t.dataset.case) {
        const cs = App.data.getCase(t.dataset.case);
        t.dataset.fallback = '1';
        if (cs) t.src = App.art.caseGenerated(cs);
      }
    },
    true
  );
  ui._imgWarned = {};

  ui.caseImg = (cs, cls) => `<img class="${cls || ''}" src="${esc(App.art.caseArt(cs))}" data-case="${esc(cs.id)}" alt="" loading="lazy" draggable="false">`;
  // маленькая плашка кейса: картинка + название
  ui.caseThumb = (cs) => `<a class="case-thumb" href="#/case/${esc(cs.id)}" data-close>${ui.caseImg(cs)}<span>${esc(cs.name)}</span></a>`;

  ui.empty = (icon, title, text, action) =>
    `<div class="empty">${icon ? `<div class="empty-ico">${ui.hasIcon(icon) ? ui.svg(icon) : icon}</div>` : ''}<div class="empty-title">${title}</div>${text ? `<div class="empty-text">${text}</div>` : ''}${action || ''}</div>`;

  ui.bar = (p, cls) => `<div class="bar ${cls || ''}"><div class="bar-fill" style="width:${U.clamp(p * 100, 0, 100).toFixed(1)}%"></div></div>`;

  /* ======================= Плавные числа ======================= */
  ui.countTo = (el, to, ms) => {
    if (!el) return;
    const from = Number(el.dataset.v || 0);
    el.dataset.v = to;
    if (from === to || ms === 0) {
      el.textContent = U.fmt(to);
      return;
    }
    const t0 = performance.now();
    const dur = ms || 500;
    cancelAnimationFrame(el._raf);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = U.fmt(from + (to - from) * e);
      if (t < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  };

  /* ======================= Новый уровень ======================= */
  // gained — полученные уровни, features — разделы, которые открылись.
  // Если окно прошлого уровня ещё открыто, новое окно объединяет оба.
  let levelShown = null; // { modal, gained, features, coins }
  ui.levelUp = (level, reward, gained, features) => {
    gained = gained && gained.length ? gained : [level];
    features = (features || []).filter((f) => f.desc);
    const coins = (reward && reward.coins) || 0;
    ui.whenIdle(() => {
      let allGained = gained;
      let allFeatures = features;
      let allCoins = coins;
      if (levelShown && !levelShown.modal.closed) {
        allGained = levelShown.gained.concat(gained);
        allFeatures = levelShown.features.concat(features);
        allCoins += levelShown.coins;
        levelShown.modal.close();
      }
      const cases = App.data.cases.filter((cs) => !cs.hidden && cs.requiredLevel > 1 && allGained.includes(cs.requiredLevel));
      App.sfx.play('levelup');
      App.fx.confetti({ count: 40 });
      const modal = ui.modal({
        cls: 'levelup-modal',
        size: 'sm',
        html: `<div class="lvlup">
          <div class="lvlup-label">Новый уровень</div>
          <div class="lvlup-num">${level}</div>
          ${allCoins ? `<div class="lvlup-reward">${ui.cur(allCoins, { sign: true })}</div>` : ''}
          ${cases.length ? `<div class="lvlup-sec"><div class="lvlup-title">Новые кейсы</div><div class="lvlup-cases">${cases.map(ui.caseThumb).join('')}</div></div>` : ''}
          ${allFeatures
            .map((f) => `<div class="lvlup-feature"><b>Открыто: ${esc(f.name)}</b><span>${esc(f.desc)}</span></div>`)
            .join('')}
        </div>`,
        actions: [{ label: 'Отлично', cls: 'btn-primary btn-block' }],
      });
      levelShown = { modal, gained: allGained, features: allFeatures, coins: allCoins };
    });
  };

  /* ======================= Окно выпадения ======================= */
  // items — предметы инвентаря. opts: { title, again(): void, againLabel, onClose, firsts: Set(uid) }
  ui.dropModal = (items, opts) => {
    opts = opts || {};
    items = items.filter(Boolean);
    if (!items.length) return null;
    const tierOf = (it) => {
      const ch = App.data.getChar(it.cid);
      return ch ? ch.r.index : 0;
    };
    const best = items.reduce((b, it) => (tierOf(it) > tierOf(b) ? it : b), items[0]);
    const bestCh = App.data.getChar(best.cid);
    const firsts = opts.firsts || new Set();
    const single = items.length === 1;
    const alive = () => items.filter((it) => App.inv.get(it.uid));
    const totalLeft = () => alive().reduce((s, it) => s + App.inv.value(it), 0);

    let html;
    if (single) {
      const ch = bestCh;
      html = `<div class="drop single r-${ch ? ch.rarity : 'common'}">
        <div class="drop-card">${ui.card(best, { size: 'xl', showNew: false, hideValue: true })}</div>
        <div class="drop-name">${ch ? esc(ch.name) : '???'}</div>
        <div class="drop-tags">${ch ? ui.rarityTag(ch) : ''}${firsts.has(best.uid) ? '<span class="drop-new">Новый в коллекции</span>' : ''}</div>
        <div class="drop-value">${ui.cur(App.inv.value(best))}</div>
      </div>`;
    } else {
      html = `<div class="drop multi">
        <div class="drop-grid">${items
          .map((it) => `<div class="drop-cell${firsts.has(it.uid) ? ' first' : ''}">${ui.card(it, { size: 'sm', showNew: false })}</div>`)
          .join('')}</div>
        <div class="drop-total">Всего: ${ui.cur(totalLeft())}</div>
      </div>`;
    }
    const m = ui.modal({
      cls: 'drop-modal',
      size: single ? 'sm' : 'md',
      title: opts.title || (single ? 'Выпало' : `Выпало ${items.length}`),
      html,
      actions: [
        {
          id: 'sell',
          label: `Продать за ${ui.cur(totalLeft())}`,
          cls: 'btn-secondary',
          onClick: async () => {
            const r = await App.inv.sellSafe(alive().map((it) => it.uid), { noConfirm: single });
            if (!r.n) return false;
          },
        },
        opts.again ? { id: 'again', label: opts.againLabel || 'Ещё раз', cls: 'btn-secondary', onClick: () => { setTimeout(opts.again, 60); } } : null,
        { id: 'take', label: 'Забрать', cls: 'btn-primary' },
      ],
      onClose: opts.onClose,
    });
    const tier = bestCh ? bestCh.r.index : 0;
    App.sfx.reveal(tier);
    if (tier >= 4) setTimeout(() => App.fx.confetti({ colors: [bestCh.r.color, '#ffffff', bestCh.r.color], count: tier >= 5 ? 180 : 110 }), 100);
    return m;
  };

  /* ======================= Подробно о персонаже ======================= */
  // o: { uid } — если открыт конкретный предмет инвентаря
  ui.showChar = (cid, o) => {
    o = o || {};
    const ch = App.data.getChar(cid);
    if (!ch) return null;
    const item = o.uid ? App.inv.get(o.uid) : null;
    const known = App.inv.discovered(cid) || !!item;
    const owned = App.inv.countOf(cid);
    const where = ch.inCases
      .map((id) => App.data.getCase(id))
      .filter((cs) => cs && !cs.hidden)
      .map((cs) => {
        const e = cs.pool.find((p) => p.cid === cid);
        return `<a class="where-row" href="#/case/${esc(cs.id)}" data-close>${ui.caseImg(cs)}<span>${esc(cs.name)}</span><b>${U.pct(e.chance)}</b></a>`;
      })
      .join('');
    const m = ui.modal({
      size: 'md',
      cls: 'char-modal',
      html: `<div class="char-detail r-${ch.rarity}">
        <div class="cd-art">${ui.card(item || cid, { size: 'xl', silhouette: !known, hideValue: true, showNew: false })}</div>
        <div class="cd-info">
          ${ui.rarityTag(ch)}
          <h2 class="cd-name">${known ? esc(ch.name) : '???'}</h2>
          ${known && ch.series ? `<div class="cd-series">${esc(ch.series)}</div>` : ''}
          ${known && ch.description && !ch.demo ? `<p class="cd-desc">${esc(ch.description)}</p>` : ''}
          ${!known ? '<p class="cd-desc muted">Ещё не выбит. Открывай кейсы ниже, чтобы получить.</p>' : ''}
          <div class="cd-stats">
            <div><span>Цена</span>${ui.cur(App.data.value(cid))}</div>
            <div><span>В инвентаре</span><b>${owned}</b></div>
          </div>
          ${where ? `<div class="cd-where"><div class="cd-label">Выпадает из</div>${where}</div>` : ''}
          ${item ? `<div class="cd-actions"><button class="btn btn-secondary btn-block" data-act="sell">Продать за ${ui.cur(App.inv.value(item))}</button></div>` : ''}
        </div>
      </div>`,
    });
    m.body.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act="sell"]');
      if (!b || !item) return;
      const r = await App.inv.sellSafe([item.uid], { noConfirm: true });
      if (r.n) m.close();
    });
    return m;
  };
})();
