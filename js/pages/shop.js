/* Страница «Магазин»: промокоды, обмен валют, бусты, билеты, рамки */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;
  const CFG = GAME_DATA.config;

  function pay(price) {
    const keys = Object.keys(price || {});
    for (const k of keys) {
      if (!App.eco.can(price[k], k)) {
        App.sfx.play('error');
        ui.toast(ui.notEnough(k), 'bad', { icon: '💸' });
        return false;
      }
    }
    keys.forEach((k) => App.eco.spend(price[k], k));
    return true;
  }

  App.promo = {
    redeem(raw) {
      const code = String(raw || '').trim().toUpperCase();
      if (!code) return;
      const p = (GAME_DATA.promocodes || []).find((x) => String(x.code).toUpperCase() === code);
      if (!p) {
        App.sfx.play('error');
        ui.toast('Такого промокода нет 🤔', 'bad');
        return false;
      }
      if (App.state.promo.includes(code)) {
        ui.toast('Этот промокод уже активирован', 'bad');
        return false;
      }
      if (p.expires && U.todayKey() > p.expires) {
        ui.toast('Срок действия промокода истёк', 'bad');
        return false;
      }
      App.state.promo.push(code);
      App.stats.inc('promoUsed');
      App.eco.grant(p.reward, 'promo', { title: `Промокод ${esc(code)} активирован!`, itemsTitle: 'Подарок по промокоду!' });
      App.fx.confetti();
      return true;
    },
  };

  App.router.register('shop', {
    title: 'Магазин',
    render(ctx) {
      const shop = CFG.shop || {};
      function render() {
        const st = App.state;
        const xpLeft = App.boosts.xpLeft();
        const luck = App.boosts.luckCharges();
        ctx.el.innerHTML = `
          <div class="page-head"><div><h1>Магазин</h1><p class="muted">Обменивай валюту, покупай бусты, билеты и рамки для профиля</p></div></div>

          <section class="promo panel">
            <div class="promo-ico">🎟️</div>
            <div class="promo-body">
              <h3>Промокод</h3>
              <p class="muted small">Есть секретный код? Вводи сюда!</p>
              <form class="promo-form" data-promo><input class="input" placeholder="Например: WELCOME" maxlength="32" autocomplete="off"><button class="btn btn-primary" type="submit">Активировать</button></form>
            </div>
          </section>

          <section class="section">
            <div class="section-head"><h2>💎 Кристаллы</h2><span class="muted small">Кристаллы нужны для премиум-кейсов, бустов и рамок</span></div>
            <div class="shop-grid">
              ${(shop.gemPacks || [])
                .map(
                  (p, i) => `<div class="shop-item panel">
                    <div class="si-ico gem-ico">${ui.icon('gems')}<b>${U.fmt(p.gems)}</b></div>
                    <div class="si-name">${U.fmt(p.gems)} ${U.plural(p.gems, ['кристалл', 'кристалла', 'кристаллов'])}</div>
                    <button class="btn btn-gold" data-gempack="${i}">${ui.cur(p.price)}</button>
                  </div>`
                )
                .join('')}
              <div class="shop-item panel">
                <div class="si-ico">🔁</div>
                <div class="si-name">Продать кристаллы</div>
                <div class="si-desc">1 ${ui.icon('gems')} = ${U.fmt(shop.gemSellRate || 50)} ${ui.icon('coins')}</div>
                <div class="row-sm"><input class="input input-sm" type="number" min="1" value="1" data-gemsell-n><button class="btn btn-ghost" data-act="gemsell">Продать</button></div>
              </div>
            </div>
          </section>

          <section class="section">
            <div class="section-head"><h2>⚡ Бусты</h2></div>
            <div class="shop-grid">${(shop.boosts || [])
              .map((b) => {
                const active = b.type === 'xp' ? xpLeft > 0 : luck > 0;
                const status =
                  b.type === 'xp'
                    ? xpLeft > 0 ? `Активен: ${U.clock(xpLeft)}` : ''
                    : luck > 0 ? `Осталось: ${luck} · кейсы до ${ui.cur(App.boosts.luckMaxPrice())}` : '';
                return `<div class="shop-item panel${active ? ' active' : ''}">
                  <div class="si-ico">${b.icon || '⚡'}</div>
                  <div class="si-name">${esc(b.name)}</div>
                  <div class="si-desc">${esc(b.desc || '')}</div>
                  ${status ? `<div class="si-status">${status}</div>` : ''}
                  <button class="btn btn-primary" data-boost="${esc(b.id)}">${active ? (b.type === 'luck' ? 'Обновить' : 'Продлить') : 'Купить'} ${ui.priceTag(App.boosts.price(b))}</button>
                </div>`;
              })
              .join('')}</div>
          </section>

          <section class="section">
            <div class="section-head"><h2>🎟️ Билеты на кейсы</h2><span class="muted small">Билет = бесплатное открытие кейса</span></div>
            <div class="shop-grid">${(shop.tickets || [])
              .map((t, i) => {
                const cs = App.data.getCase(t.caseId);
                if (!cs) return '';
                const locked = App.cases.isLocked(cs);
                return `<div class="shop-item panel${locked ? ' locked' : ''}" style="--cc:${esc(cs.color)}">
                  <div class="si-art">${ui.caseImg(cs)}</div>
                  <div class="si-name">${esc(cs.name)} ×${t.amount}</div>
                  <div class="si-desc">${locked ? `🔒 Кейс откроется на ${cs.requiredLevel} уровне` : `У тебя: 🎟️ ${App.cases.tickets(cs)}`}</div>
                  <button class="btn btn-primary" data-ticket="${i}" ${locked ? 'disabled' : ''}>${ui.priceTag(t.price)}</button>
                </div>`;
              })
              .join('')}</div>
          </section>

          <section class="section">
            <div class="section-head"><h2>🖼️ Рамки аватара</h2><a class="link" href="#/profile">В профиль →</a></div>
            <div class="shop-grid frames-grid">${(CFG.frames || [])
              .map((f) => {
                const owned = App.profile.frameUnlocked(f);
                const equipped = st.profile.frame === f.id;
                let btn;
                if (equipped) btn = '<span class="tag tag-good">✓ Надета</span>';
                else if (owned) btn = `<button class="btn btn-ghost" data-equip="${esc(f.id)}">Надеть</button>`;
                else if (f.price) btn = `<button class="btn btn-primary" data-frame="${esc(f.id)}">${ui.priceTag(f.price)}</button>`;
                else if (f.level) btn = `<span class="tag">🔒 ${f.level} уровень</span>`;
                else if (f.achievement) {
                  const a = (GAME_DATA.achievements || []).find((x) => x.id === f.achievement);
                  btn = `<span class="tag" title="${a ? esc(a.desc) : ''}">🔒 ${a ? esc(a.name) : 'Достижение'}</span>`;
                } else btn = '';
                return `<div class="shop-item panel">
                  <div class="frame-preview"><span class="avatar frame-${esc(f.id)} lg">${App.profile.avatarSrc() ? `<img src="${esc(App.profile.avatarSrc())}" alt="">` : `<span class="avatar-letter">${esc((st.profile.name || '?').charAt(0).toUpperCase())}</span>`}</span></div>
                  <div class="si-name">${esc(f.name)}</div>
                  ${btn}
                </div>`;
              })
              .join('')}</div>
          </section>`;
      }
      render();

      ctx.el.addEventListener('submit', (e) => {
        if (!e.target.matches('[data-promo]')) return;
        e.preventDefault();
        const inp = e.target.querySelector('input');
        if (App.promo.redeem(inp.value)) {
          inp.value = '';
          render();
        }
      });
      ctx.el.addEventListener('click', (e) => {
        const t = e.target;
        const gp = t.closest('[data-gempack]');
        if (gp) {
          const p = shop.gemPacks[Number(gp.dataset.gempack)];
          if (App.eco.spend(p.price, 'coins')) {
            App.eco.add(p.gems, 'gems');
            App.sfx.play('gem');
            App.fx.burstAt(gp, ['#22d3ee', '#a5f3fc', '#fff'], 30);
            ui.toast(`Куплено ${ui.cur(p.gems, 'gems')}`, 'good');
            render();
          }
          return;
        }
        if (t.closest('[data-act="gemsell"]')) {
          const n = Math.floor(Number(ctx.el.querySelector('[data-gemsell-n]').value) || 0);
          if (n <= 0) return;
          if (App.eco.spend(n, 'gems')) {
            App.eco.add(n * (shop.gemSellRate || 50), 'coins');
            App.sfx.play('coin');
            ui.toast(`Продано ${ui.cur(n, 'gems')} за ${ui.cur(n * (shop.gemSellRate || 50))}`, 'good');
            render();
          }
          return;
        }
        const bb = t.closest('[data-boost]');
        if (bb) {
          const b = shop.boosts.find((x) => x.id === bb.dataset.boost);
          if (b && pay(App.boosts.price(b))) {
            App.boosts.activate(b);
            App.sfx.play('levelup');
            ui.toast(`${b.icon || '⚡'} ${esc(b.name)} — активировано!`, 'good');
            render();
          }
          return;
        }
        const tb = t.closest('[data-ticket]');
        if (tb) {
          const tk = shop.tickets[Number(tb.dataset.ticket)];
          const tcs = tk && App.data.getCase(tk.caseId);
          if (!tcs || App.cases.isLocked(tcs)) return;
          if (pay(tk.price)) {
            App.state.tickets[tk.caseId] = (App.state.tickets[tk.caseId] || 0) + tk.amount;
            App.bus.emit('tickets');
            App.store.dirty();
            App.sfx.play('coin');
            ui.toast(`Получено 🎟️ ×${tk.amount}`, 'good');
            render();
          }
          return;
        }
        const fb = t.closest('[data-frame]');
        if (fb) {
          const f = CFG.frames.find((x) => x.id === fb.dataset.frame);
          if (f && pay(f.price)) {
            App.state.owned.frames.push(f.id);
            App.state.profile.frame = f.id;
            App.store.dirty();
            App.bus.emit('profile');
            App.sfx.play('win');
            ui.toast(`Рамка «${esc(f.name)}» куплена и надета!`, 'good');
            render();
          }
          return;
        }
        const eb = t.closest('[data-equip]');
        if (eb) {
          App.state.profile.frame = eb.dataset.equip;
          App.store.dirty();
          App.bus.emit('profile');
          App.sfx.play('click');
          render();
        }
      });
      ctx.every(1000, () => {
        if (App.boosts.xpLeft() > 0) {
          const s = ctx.el.querySelector('.shop-item.active .si-status');
          if (s && s.textContent.startsWith('Активен')) s.textContent = 'Активен: ' + U.clock(App.boosts.xpLeft());
        }
      });
    },
  });
})();
