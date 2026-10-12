/* Общие элементы интерфейса: тосты, модалки, карточки, валюта, окна выпадения */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const esc = U.esc;
  const ui = (App.ui = {});

  /* ======================= Иконки и валюта ======================= */
  ui.icon = (name, cls) => `<svg class="ico ${cls || ''}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  ui.cur = (amount, type, o) => {
    type = type || 'coins';
    o = o || {};
    const num = o.short ? U.short(amount) : U.fmt(amount);
    return `<span class="cur cur-${type}${o.cls ? ' ' + o.cls : ''}">${ui.icon(type)}<b>${o.sign && amount > 0 ? '+' : ''}${num}</b></span>`;
  };
  ui.curName = (type, plural) => {
    const c = (GAME_DATA.config.currencies || {})[type];
    if (c) return c.name;
    return { coins: 'Монеты', gems: 'Кристаллы', dust: 'Звёздная пыль' }[type] || type;
  };
  ui.notEnough = (type) => ({ coins: 'Недостаточно монет', gems: 'Недостаточно кристаллов', dust: 'Недостаточно звёздной пыли' }[type] || 'Недостаточно средств');
  ui.priceTag = (price) => {
    if (!price) return '';
    return Object.keys(price).map((k) => ui.cur(price[k], k)).join(' ');
  };

  ui.rarityTag = (chOrR) => {
    const r = chOrR && chOrR.r ? chOrR.r : chOrR;
    if (!r) return '';
    return `<span class="rtag r-${r.id}">${esc(r.name)}</span>`;
  };
  ui.chance = (p) => U.pct(p);

  /* ======================= Награды ======================= */
  ui.rewardParts = (r) => {
    const out = [];
    if (!r) return out;
    if (r.coins) out.push(ui.cur(r.coins, 'coins', { sign: true }));
    if (r.gems) out.push(ui.cur(r.gems, 'gems', { sign: true }));
    if (r.dust) out.push(ui.cur(r.dust, 'dust', { sign: true }));
    if (r.xp) out.push(`<span class="cur cur-xp"><i>XP</i><b>+${U.fmt(r.xp)}</b></span>`);
    if (r.tickets) {
      Object.keys(r.tickets).forEach((id) => {
        const cs = App.data.getCase(id);
        if (cs) out.push(`<span class="cur cur-ticket"><i>🎟️</i><b>${esc(cs.name)} ×${r.tickets[id]}</b></span>`);
      });
    }
    if (r.characters) {
      r.characters.forEach((c) => {
        const id = typeof c === 'string' ? c : c && c.id;
        const ch = App.data.getChar(id);
        if (ch) out.push(`<span class="cur cur-char r-${ch.rarity}"><i>${c && c.shiny ? '✨' : '👤'}</i><b>${esc(ch.name)}</b></span>`);
      });
    }
    return out;
  };
  ui.reward = (r) => `<span class="reward">${ui.rewardParts(r).join('')}</span>`;

  /* ======================= Тосты ======================= */
  ui.toast = (html, type, o) => {
    o = o || {};
    const root = document.getElementById('toasts');
    if (!root) return () => {};
    const el = document.createElement('div');
    el.className = `toast toast-${type || 'info'}`;
    el.innerHTML = `${o.icon ? `<span class="toast-ico">${o.icon}</span>` : ''}<div class="toast-body">${html}</div>`;
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      el.classList.add('out');
      setTimeout(() => el.remove(), 300);
    };
    if (o.onClick) {
      el.classList.add('clickable');
      el.addEventListener('click', () => {
        o.onClick();
        close();
      });
    } else el.addEventListener('click', close);
    root.appendChild(el);
    while (root.children.length > 5) root.firstElementChild.remove();
    setTimeout(close, o.timeout || 3500);
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
      ${opts.title != null
        ? `<div class="modal-head"><h3>${opts.title}</h3>${closable ? '<button class="modal-x" data-close aria-label="Закрыть">✕</button>' : ''}</div>`
        : closable ? '<button class="modal-x floating" data-close aria-label="Закрыть">✕</button>' : ''}
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
      setTimeout(() => bg.remove(), 220);
      if (!stack.length) document.body.classList.remove('modal-open');
      if (opts.onClose) opts.onClose(result);
    }
    m.close = close;
    if (opts.actions) {
      const foot = modal.querySelector('.modal-foot');
      opts.actions.filter(Boolean).forEach((a) => {
        const b = document.createElement('button');
        b.className = 'btn ' + (a.cls || 'btn-ghost');
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
          { label: o.cancel || 'Отмена', cls: 'btn-ghost', onClick: () => { done = true; res(false); } },
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
          { label: 'Отмена', cls: 'btn-ghost', onClick: () => { done = true; res(null); } },
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

  /* ======================= Очередь «когда освободишься» ======================= */
  // Пока идёт анимация (открытие кейса и т.п.), уведомления о новом уровне ждут.
  let busy = 0;
  const idleQueue = [];
  App.setBusy = (on) => {
    busy = Math.max(0, busy + (on ? 1 : -1));
    if (!busy) {
      while (!busy && idleQueue.length) {
        try { idleQueue.shift()(); } catch (e) { console.error(e); }
      }
    }
  };
  App.isBusy = () => busy > 0;
  ui.whenIdle = (fn) => {
    if (!busy) fn();
    else idleQueue.push(fn);
  };

  /* ======================= Карточки персонажей ======================= */
  ui.portrait = (cid) => App.art.portrait(cid);

  // item: предмет инвентаря {uid,cid,shiny,...} или id персонажа
  ui.card = (src, o) => {
    o = o || {};
    const item = src && typeof src === 'object' ? src : null;
    const cid = item ? item.cid : src;
    const ch = App.data.getChar(cid);
    const size = o.size || 'md';
    if (!ch) {
      return `<div class="ccard unknown ${size}" ${item ? `data-uid="${esc(item.uid)}"` : ''}><div class="ccard-art"><img src="${App.art.unknown()}" alt=""></div><div class="ccard-info"><div class="ccard-name">Неизвестный</div><div class="ccard-meta"><span class="ccard-rar">удалён из игры</span></div></div></div>`;
    }
    const shiny = o.shiny != null ? o.shiny : !!(item && item.shiny);
    const sil = !!o.silhouette;
    const cls = ['ccard', 'r-' + ch.rarity, 't' + ch.r.index, size];
    if (shiny) cls.push('shiny');
    if (ch.r.rainbow) cls.push('rainbow');
    if (sil) cls.push('sil');
    if (o.selected) cls.push('sel');
    if (o.dim) cls.push('dim');
    if (o.cls) cls.push(o.cls);
    const value = App.data.value(cid, shiny);
    const badges = [];
    if (shiny) badges.push('<span class="cbadge cb-shiny" title="Шайни">✨</span>');
    if (item && item.isNew && o.showNew !== false) badges.push('<span class="cbadge cb-new">NEW</span>');
    if (item && item.locked) badges.push('<span class="cbadge cb-lock" title="Закреплён">🔒</span>');
    if (o.count > 1) badges.push(`<span class="cbadge cb-count">×${o.count}</span>`);
    if (o.badge) badges.push(o.badge);
    const meta = o.noMeta
      ? ''
      : `<div class="ccard-meta"><span class="ccard-rar">${esc(ch.r.name)}</span>${o.hideValue || sil ? '' : `<span class="ccard-val">${ui.cur(value, 'coins', { short: true })}</span>`}</div>`;
    return `<div class="${cls.join(' ')}" data-cid="${esc(cid)}"${item ? ` data-uid="${esc(item.uid)}"` : ''}${o.attrs ? ' ' + o.attrs : ''}>
<div class="ccard-art"><img src="${esc(App.art.portrait(ch))}" data-cid="${esc(cid)}" alt="" loading="lazy" draggable="false"></div>
<div class="ccard-shine"></div>
${badges.length ? `<div class="cbadges">${badges.join('')}</div>` : ''}
${o.chance != null ? `<span class="cchance">${U.pct(o.chance)}</span>` : ''}
<div class="ccard-info"><div class="ccard-name">${sil ? '???' : esc(ch.name)}</div>${meta}</div>
</div>`;
  };

  // Если картинка не загрузилась — подставляем сгенерированный портрет
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

  ui.empty = (icon, title, text, action) =>
    `<div class="empty"><div class="empty-ico">${icon}</div><div class="empty-title">${title}</div>${text ? `<div class="empty-text">${text}</div>` : ''}${action || ''}</div>`;

  ui.bar = (p, cls) => `<div class="bar ${cls || ''}"><div class="bar-fill" style="width:${U.clamp(p * 100, 0, 100).toFixed(1)}%"></div></div>`;

  /* ======================= Плавные числа ======================= */
  ui.countTo = (el, to, ms) => {
    if (!el) return;
    const from = Number(el.dataset.v || 0);
    el.dataset.v = to;
    if (App.settings.reduceMotion || from === to || ms === 0) {
      el.textContent = U.fmt(to);
      return;
    }
    const t0 = performance.now();
    const dur = ms || 600;
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
  ui.levelUp = (level, reward) => {
    ui.whenIdle(() => {
      App.sfx.play('levelup');
      App.fx.confetti({ count: 160 });
      ui.modal({
        cls: 'levelup-modal',
        size: 'sm',
        html: `<div class="lvlup">
          <div class="lvlup-rays"></div>
          <div class="lvlup-badge"><span>${level}</span></div>
          <h2>Новый уровень!</h2>
          <div class="muted">Титул: <b class="grad-text">${esc(App.eco.title(level))}</b></div>
          <div class="lvlup-reward">${ui.reward(reward)}</div>
        </div>`,
        actions: [{ label: 'Ура! 🎉', cls: 'btn-primary btn-block' }],
      });
    });
  };

  /* ======================= Окно выпадения ======================= */
  // items — предметы инвентаря. opts: { title, again(): void, onClose, firsts: Set(uid) }
  ui.dropModal = (items, opts) => {
    opts = opts || {};
    items = items.filter(Boolean);
    if (!items.length) return null;
    const tierOf = (it) => {
      const ch = App.data.getChar(it.cid);
      return ch ? ch.r.index : 0;
    };
    const best = items.reduce((b, it) => (tierOf(it) > tierOf(b) || (tierOf(it) === tierOf(b) && it.shiny) ? it : b), items[0]);
    const bestCh = App.data.getChar(best.cid);
    const firsts = opts.firsts || new Set();
    const single = items.length === 1;
    const sold = new Set();
    const alive = () => items.filter((it) => !sold.has(it.uid) && App.inv.get(it.uid));
    const totalLeft = () => alive().reduce((s, it) => s + App.inv.value(it), 0);

    let html;
    if (single) {
      const ch = bestCh;
      html = `<div class="drop single r-${ch ? ch.rarity : ''}">
        <div class="drop-rays"></div>
        <div class="drop-title">${opts.title || 'Тебе выпала!'}</div>
        ${firsts.has(best.uid) ? '<div class="drop-new">✦ Новый персонаж в коллекции ✦</div>' : ''}
        <div class="drop-card">${ui.card(best, { size: 'xl', showNew: false })}</div>
        <div class="drop-name">${ch ? esc(ch.name) : '???'}</div>
        <div class="drop-tags">${ch ? ui.rarityTag(ch) : ''}${best.shiny ? '<span class="rtag tag-shiny">✨ Шайни</span>' : ''}</div>
        ${ch && ch.series ? `<div class="drop-series">${esc(ch.series)}</div>` : ''}
      </div>`;
    } else {
      html = `<div class="drop multi r-${bestCh ? bestCh.rarity : ''}">
        <div class="drop-title">${opts.title || 'Твой улов!'}</div>
        <div class="drop-grid">${items
          .map(
            (it) => `<div class="drop-cell" data-uid="${esc(it.uid)}">
              ${firsts.has(it.uid) ? '<span class="drop-cell-new">NEW</span>' : ''}
              ${ui.card(it, { size: 'md', showNew: false })}
              <button class="btn btn-xs btn-ghost drop-sell" data-sell="${esc(it.uid)}">${ui.cur(App.inv.value(it))}</button>
            </div>`
          )
          .join('')}</div>
        <div class="drop-total">Общая стоимость: <b class="drop-total-v">${ui.cur(totalLeft())}</b></div>
      </div>`;
    }
    const sellLabel = () => `Продать${single ? '' : ' всё'} за ${ui.cur(totalLeft())}`;
    const m = ui.modal({
      cls: 'drop-modal',
      size: single ? '' : 'lg',
      html,
      actions: [
        {
          id: 'sell',
          label: sellLabel(),
          cls: 'btn-gold',
          onClick: async () => {
            const uids = alive().map((it) => it.uid);
            const r = await App.inv.sellSafe(uids);
            if (!r.n) return false;
            App.ui.toast(`Продано ${r.n} ${U.plural(r.n, ['персонаж', 'персонажа', 'персонажей'])} за ${ui.cur(r.total)}`, 'good');
          },
        },
        opts.again ? { id: 'again', label: opts.againLabel || 'Ещё раз', cls: 'btn-ghost', onClick: () => { setTimeout(opts.again, 60); } } : null,
        { id: 'take', label: 'Забрать', cls: 'btn-primary' },
      ],
      onClose: opts.onClose,
    });
    const refresh = () => {
      const left = alive();
      if (m.btn.sell) {
        m.btn.sell.innerHTML = sellLabel();
        m.btn.sell.disabled = !left.length;
      }
      const tv = m.body.querySelector('.drop-total-v');
      if (tv) tv.innerHTML = ui.cur(totalLeft());
    };
    m.body.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-sell]');
      if (b) {
        const uid = b.dataset.sell;
        const r = await App.inv.sellSafe([uid]);
        if (r.n) {
          sold.add(uid);
          const cell = b.closest('.drop-cell');
          cell.classList.add('sold');
          b.disabled = true;
          b.textContent = 'Продано';
          refresh();
        }
        return;
      }
      const card = e.target.closest('.ccard');
      if (card && card.dataset.uid && !single) ui.showChar(card.dataset.cid, { uid: card.dataset.uid });
    });
    // эффекты
    const tier = bestCh ? bestCh.r.index : 0;
    App.sfx.reveal(tier);
    if (tier >= 4 || best.shiny) {
      setTimeout(() => App.fx.confetti({ colors: [bestCh.r.color, '#fff', '#fde68a', bestCh.r.color], count: tier >= 5 ? 220 : 140 }), 120);
      if (tier >= 5) App.fx.flash(bestCh.r.color);
    } else if (tier >= 3) {
      setTimeout(() => App.fx.burstAt(m.body.querySelector('.ccard'), [bestCh.r.color, '#fff'], 40), 150);
    }
    return m;
  };

  /* ======================= Карточка персонажа (детали) ======================= */
  ui.showChar = (cid, o) => {
    o = o || {};
    const ch = App.data.getChar(cid);
    if (!ch) return;
    let item = o.uid ? App.inv.get(o.uid) : null;
    const discovered = App.inv.discovered(cid);
    const render = () => {
      item = o.uid ? App.inv.get(o.uid) : null;
      const shiny = item ? item.shiny : !!o.shiny;
      const owned = App.inv.countOf(cid);
      const col = App.state.collection[cid];
      const where = ch.inCases
        .map((id) => {
          const cs = App.data.getCase(id);
          const e = cs.pool.find((p) => p.cid === cid);
          return `<a class="where-row" href="#/case/${esc(cs.id)}" data-close>${ui.caseImg(cs)}<span>${esc(cs.name)}</span><b>${U.pct(e.chance)}</b></a>`;
        })
        .join('');
      const craft = App.data.craftCost(cid);
      const show = discovered || item;
      let actions = '';
      if (item) {
        const isAvatar = App.state.profile.avatar === cid;
        const inShowcase = App.state.profile.showcase.includes(item.uid);
        actions = `
          <button class="btn btn-gold" data-act="sell" ${item.locked ? 'disabled' : ''}>Продать ${ui.cur(App.inv.value(item))}</button>
          <button class="btn btn-ghost" data-act="dust" ${item.locked ? 'disabled' : ''}>Распылить ${ui.cur(App.data.dust(cid, item.shiny), 'dust')}</button>
          <button class="btn btn-ghost" data-act="lock">${item.locked ? '🔓 Открепить' : '🔒 Закрепить'}</button>
          <button class="btn btn-ghost" data-act="avatar" ${isAvatar ? 'disabled' : ''}>${isAvatar ? '✓ Аватар' : '👤 Сделать аватаром'}</button>
          <button class="btn btn-ghost" data-act="showcase">${inShowcase ? '✕ Убрать с витрины' : '⭐ На витрину'}</button>`;
      } else {
        actions = `<button class="btn btn-primary" data-act="craft">🔮 Создать за ${ui.cur(craft, 'dust')}</button>`;
        if (owned > 0) actions += `<button class="btn btn-ghost" data-act="inv">🎒 В инвентаре: ${owned}</button>`;
      }
      return `<div class="char-detail r-${ch.rarity}">
        <div class="cd-art">${ui.card(item || cid, { size: 'xl', shiny, silhouette: !show, showNew: false })}</div>
        <div class="cd-info">
          <div class="cd-tags">${ui.rarityTag(ch)}${shiny ? '<span class="rtag tag-shiny">✨ Шайни</span>' : ''}${!show ? '<span class="rtag tag-dim">Не открыта</span>' : ''}</div>
          <h2 class="cd-name">${show ? esc(ch.name) : '???'}</h2>
          ${ch.series && show ? `<div class="cd-series">${esc(ch.series)}</div>` : ''}
          ${ch.description && show ? `<p class="cd-desc">${esc(ch.description)}</p>` : ''}
          ${!show ? '<p class="cd-desc muted">Этот персонаж ещё не открыт. Выбей её из кейса или создай из звёздной пыли.</p>' : ''}
          <div class="cd-stats">
            <div><span>Стоимость</span>${ui.cur(App.data.value(cid, shiny))}</div>
            <div><span>Распыление</span>${ui.cur(App.data.dust(cid, shiny), 'dust')}</div>
            <div><span>В инвентаре</span><b>${owned} шт.</b></div>
            <div><span>Всего получено</span><b>${col ? col.n : 0}${col && col.shiny ? ` (✨${col.shiny})` : ''}</b></div>
            ${item ? `<div><span>Экземпляр</span><b>#${item.n}</b></div><div><span>Получен</span><b>${U.timeAgo(item.t)}</b></div>` : ''}
          </div>
          <div class="cd-where"><div class="cd-label">Где выпадает</div>${where || '<div class="muted small">Не выпадает из кейсов — только крафт, контракты и апгрейд</div>'}</div>
          <div class="cd-actions">${actions}</div>
        </div>
      </div>`;
    };
    const m = ui.modal({ size: 'lg', cls: 'char-modal', html: render() });
    const rerender = () => {
      if (!m.closed) m.body.innerHTML = render();
    };
    m.body.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      const act = b.dataset.act;
      if (act === 'sell' && item) {
        const r = await App.inv.sellSafe([item.uid]);
        if (r.n) {
          ui.toast(`Продано за ${ui.cur(r.total)}`, 'good');
          m.close();
        }
      } else if (act === 'dust' && item) {
        const r = App.inv.disenchant([item.uid]);
        if (r.n) {
          ui.toast(`Получено ${ui.cur(r.total, 'dust')}`, 'good');
          m.close();
        }
      } else if (act === 'lock' && item) {
        App.inv.toggleLock(item.uid);
        rerender();
      } else if (act === 'avatar') {
        App.state.profile.avatar = cid;
        App.store.dirty();
        App.bus.emit('profile');
        ui.toast('Аватар обновлён', 'good');
        rerender();
      } else if (act === 'showcase' && item) {
        App.profile.toggleShowcase(item.uid);
        rerender();
      } else if (act === 'craft') {
        if (App.inv.craft(cid)) {
          m.close();
        }
      } else if (act === 'inv') {
        m.close();
        App.router.go('inventory');
      }
    });
    return m;
  };
})();
