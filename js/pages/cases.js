/* Страницы «Кейсы» и «Открытие кейса» */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;

  App.views = App.views || {};

  App.views.casePrice = (cs) => {
    if (cs.price > 0) return ui.cur(cs.price, cs.currency);
    const cd = App.cases.cooldownLeft(cs);
    if (cd > 0) return `<span class="case-timer" data-cd="${esc(cs.id)}">⏳ ${U.clock(cd)}</span>`;
    return '<span class="free-tag">Бесплатно</span>';
  };

  // Кейс «лестницы» (за монеты, открывается по уровню)
  const ladderIds = () => new Set(App.data.ladder().map((c) => c.id));
  App.views.isLadder = (cs) => ladderIds().has(cs.id);
  // Окупаемость кейса в процентах (или null для бесплатных)
  App.views.rtp = (cs) => {
    const r = App.data.caseRTP(cs);
    return r == null || !cs.pool.length ? null : Math.round(r * 100);
  };
  const RTP_TIP = 'Отдача — сколько в среднем возвращается от цены кейса ценой выпавших персонажей';

  // o: { best: id лучшего доступного кейса }
  App.views.caseCard = (cs, o) => {
    o = o || {};
    const locked = App.cases.isLocked(cs);
    const tickets = App.cases.tickets(cs);
    const prog = App.collection.caseProgress(cs);
    const ladder = App.views.isLadder(cs);
    const rtp = App.views.rtp(cs);
    const best = !locked && o.best === cs.id;
    const done = prog.done;
    return `<a class="case-card${locked ? ' locked' : ''}${best ? ' best' : ''}" href="#/case/${esc(cs.id)}" style="--cc:${esc(cs.color)}">
      <span class="case-glow"></span>
      ${cs.badge ? `<span class="case-badge">${esc(cs.badge)}</span>` : ladder ? `<span class="case-lvl">Ур. ${cs.requiredLevel}</span>` : ''}
      ${tickets ? `<span class="case-tickets" title="Билеты на бесплатное открытие">🎟️ ${tickets}</span>` : ''}
      <div class="case-art">${ui.caseImg(cs)}</div>
      <div class="case-name">${esc(cs.name)}</div>
      ${best ? '<div class="case-best">★ Лучший для тебя</div>' : ''}
      <div class="case-meta">
        ${rtp != null ? `<span class="case-rtp" title="${RTP_TIP}">📈 ${rtp}%</span>` : ''}
        <span class="${done ? 'good' : ''}" title="Сколько персонажей кейса уже в коллекции">${done ? '✓' : '📖'} ${prog.have}/${prog.total}</span>
      </div>
      <div class="case-price">${App.views.casePrice(cs)}</div>
      ${locked ? `<div class="case-lock"><span>🔒</span>Уровень ${cs.requiredLevel}</div>` : ''}
    </a>`;
  };

  // Обновление таймеров бесплатных кейсов на странице
  App.views.tickCaseTimers = (root) => {
    root.querySelectorAll('[data-cd]').forEach((el) => {
      const cs = App.data.getCase(el.dataset.cd);
      if (!cs) return;
      const left = App.cases.cooldownLeft(cs);
      if (left > 0) el.textContent = '⏳ ' + U.clock(left);
      else el.outerHTML = '<span class="free-tag">Бесплатно</span>';
    });
  };

  // Лучший доступный кейс и следующий закрытый — для «лестницы»
  App.views.ladderInfo = () => {
    const ladder = App.data.ladder();
    const open = ladder.filter((cs) => !App.cases.isLocked(cs));
    const best = open.reduce((b, cs) => (!b || cs.price > b.price ? cs : b), null);
    const next = ladder.find((cs) => App.cases.isLocked(cs)) || null;
    return { ladder, open, best, next };
  };

  // Панель «твой лучший кейс → следующий кейс»
  App.views.ladderPanel = () => {
    const { best, next } = App.views.ladderInfo();
    if (!best && !next) return '';
    const st = App.state;
    const item = (cs, label, extra) => `<a class="lp-item${App.cases.isLocked(cs) ? ' locked' : ''}" href="#/case/${esc(cs.id)}" style="--cc:${esc(cs.color)}">
        ${ui.caseImg(cs, 'lp-art')}
        <div class="lp-body">
          <small>${label}</small>
          <b>${esc(cs.name)}</b>
          <span class="lp-sub">${ui.cur(cs.price, cs.currency)}${App.views.rtp(cs) != null ? ` · <span title="${RTP_TIP}">отдача <b>${App.views.rtp(cs)}%</b></span>` : ''}</span>
          ${extra || ''}
        </div>
      </a>`;
    let nextHtml = '';
    if (next) {
      const lvls = next.requiredLevel - st.level;
      const need = App.eco.xpNeeded(st.level);
      const bar = lvls === 1 ? `${ui.bar(Math.min(1, st.xp / need))}<span class="lp-xp">${U.fmt(st.xp)} / ${U.fmt(need)} XP</span>` : `<span class="lp-xp">ещё ${lvls} ${U.plural(lvls, ['уровень', 'уровня', 'уровней'])}</span>`;
      nextHtml = `<div class="lp-arrow">➜</div>${item(next, `🔒 Откроется на ${next.requiredLevel} уровне`, bar)}`;
    }
    return `<div class="ladder-panel panel">
      ${best ? item(best, '⭐ Твой лучший кейс', '<span class="btn btn-primary btn-sm lp-btn">Открыть</span>') : ''}
      ${nextHtml}
      <div class="lp-hint muted small">Каждый новый уровень открывает кейс дороже и выгоднее. Опыт дают открытия кейсов (чем дороже кейс — тем больше) и ставки в мини-играх.</div>
    </div>`;
  };

  /* ======================= Список кейсов ======================= */
  App.router.register('cases', {
    title: 'Кейсы',
    render(ctx) {
      let hideLocked = false;
      try { hideLocked = localStorage.getItem('waifudrop:hideLocked') === '1'; } catch (e) { /* ignore */ }
      ctx.el.innerHTML = `
        <div class="page-head">
          <div><h1>Кейсы</h1><p class="muted">С каждым уровнем открывается новый кейс — дороже и с большей <b>отдачей</b>. Старые кейсы тоже пригодятся: у каждого свои персонажи для коллекции.</p></div>
        </div>
        <div data-ladder-panel></div>
        <section class="section" data-specials-sec>
          <div class="section-head"><h2>✨ Особые кейсы</h2></div>
          <div class="grid-cases" data-specials></div>
        </section>
        <section class="section">
          <div class="section-head"><h2>🪜 Кейсы по уровням</h2>
            <label class="switch-row small"><input type="checkbox" data-hide-locked ${hideLocked ? 'checked' : ''}><span class="switch"></span>Скрыть закрытые</label>
          </div>
          <div class="grid-cases" data-ladder></div>
        </section>`;
      const $ = (sel) => ctx.el.querySelector(sel);
      const render = () => {
        const info = App.views.ladderInfo();
        const ids = new Set(info.ladder.map((c) => c.id));
        const specials = App.cases.list().filter((c) => !ids.has(c.id));
        const o = { best: info.best && info.best.id };
        $('[data-ladder-panel]').innerHTML = App.views.ladderPanel();
        $('[data-specials-sec]').hidden = !specials.length;
        $('[data-specials]').innerHTML = specials.map((c) => App.views.caseCard(c, o)).join('');
        const list = info.ladder.filter((c) => !hideLocked || !App.cases.isLocked(c) || c === info.next);
        $('[data-ladder]').innerHTML = list.length ? list.map((c) => App.views.caseCard(c, o)).join('') : ui.empty('📦', 'Кейсов нет', 'Добавь кейсы в data/cases.js');
      };
      render();
      ctx.el.addEventListener('change', (e) => {
        if (!e.target.matches('[data-hide-locked]')) return;
        hideLocked = e.target.checked;
        try { localStorage.setItem('waifudrop:hideLocked', hideLocked ? '1' : '0'); } catch (err) { /* ignore */ }
        App.sfx.play('soft');
        render();
      });
      ctx.every(1000, () => App.views.tickCaseTimers(ctx.el));
      ctx.on('levelup', render);
      ctx.on('tickets', render);
      ctx.on('xp', U.debounce(() => ctx.alive && ($('[data-ladder-panel]').innerHTML = App.views.ladderPanel()), 200));
    },
  });

  /* ======================= Открытие кейса ======================= */
  App.router.register('case', {
    title: 'Кейс',
    nav: 'cases',
    render(ctx) {
      const cs = App.data.getCase(ctx.params[0]);
      if (!cs) {
        ctx.el.innerHTML = ui.empty('❓', 'Кейс не найден', 'Возможно, его удалили из data/cases.js', '<a class="btn btn-primary" href="#/cases">К кейсам</a>');
        return;
      }
      const isCooldown = !!cs.cooldown && !cs.price;
      let count = 1;
      let useTickets = false;
      let opening = false;
      let reels = [];
      const COUNTS = isCooldown || !cs.price ? [1] : [1, 2, 3, 5, 10];
      const opened = App.stats.get('case_' + cs.id);

      ctx.el.innerHTML = `
        <div class="case-page" style="--cc:${esc(cs.color)}">
          <a class="back-link" href="#/cases">← Все кейсы</a>
          <div class="case-hero">
            <div class="case-hero-art">${ui.caseImg(cs)}</div>
            <div class="case-hero-info">
              <div class="case-hero-tags">
                ${cs.badge ? `<span class="tag tag-accent">${esc(cs.badge)}</span>` : ''}
                ${cs.requiredLevel > 1 ? `<span class="tag">Ур. ${cs.requiredLevel}+</span>` : ''}
                ${cs.availableUntil ? `<span class="tag">До ${esc(cs.availableUntil)}</span>` : ''}
                ${cs.pity ? `<span class="tag tag-gold">Гарант: ${esc(App.data.getRarity(cs.pity.rarity).name)}</span>` : ''}
              </div>
              <h1>${esc(cs.name)}</h1>
              ${cs.description ? `<p class="muted">${esc(cs.description)}</p>` : ''}
              <div class="case-hero-stats">
                <div><span>Цена</span><b>${App.views.casePrice(cs)}</b></div>
                ${App.views.rtp(cs) != null ? `<div title="В среднем из кейса выпадает персонажей на эту долю его цены"><span>Отдача</span><b>${App.views.rtp(cs)}%</b></div>` : ''}
                <div><span>Персонажей</span><b>${cs.pool.length}</b></div>
                <div><span>Ты открыл</span><b data-opened>${U.fmt(opened)}</b></div>
                <div><span>Коллекция</span><b data-colprog></b></div>
              </div>
              <div class="case-hero-col small" data-colreward></div>
            </div>
          </div>

          <div class="opener panel" data-opener>
            <div class="opener-idle" data-idle>
              <div class="idle-cards">${cs.pool.slice(0, 5).map((e) => ui.card(e.cid, { size: 'sm', hideValue: true })).join('')}</div>
              <div class="idle-text">Нажми «Открыть», чтобы запустить рулетку</div>
            </div>
            <div class="reels" data-reels></div>
            <button class="btn btn-ghost btn-sm skip-btn" data-skip hidden>Пропустить ⏭</button>
          </div>

          <div class="open-controls panel">
            <div class="oc-row">
              ${COUNTS.length > 1 ? `<div class="chips count-chips" data-counts>${COUNTS.map((n) => `<button class="chip${n === count ? ' active' : ''}" data-count="${n}">×${n}</button>`).join('')}</div>` : ''}
              <button class="btn btn-primary btn-xl open-btn" data-open></button>
            </div>
            <div class="oc-row oc-extra">
              <label class="switch-row" data-ticket-row hidden><input type="checkbox" data-tickets><span class="switch"></span><span data-ticket-label></span></label>
              <div class="pity-box" data-pity hidden></div>
              <div class="luck-box" data-luck hidden></div>
              <div class="oc-speed">
                <span class="muted small">Анимация:</span>
                <div class="chips chips-sm" data-speed>
                  ${[['normal', 'Обычная'], ['fast', 'Быстрая'], ['instant', 'Мгновенно']].map(([v, l]) => `<button class="chip${App.settings.animSpeed === v ? ' active' : ''}" data-sp="${v}">${l}</button>`).join('')}
                </div>
              </div>
            </div>
            <div class="oc-hint muted small">Пробел — открыть · S — пропустить анимацию</div>
          </div>

          <section class="section">
            <div class="section-head"><h2>Содержимое кейса</h2><span class="muted small">Шанс выпадения указан на карточках</span></div>
            <div class="rar-strip">${App.data.rarities
              .map((r) => {
                const p = cs.pool.filter((e) => App.data.getChar(e.cid).rarity === r.id).reduce((s, e) => s + e.chance, 0);
                return p > 0 ? `<div class="rar-chip r-${r.id}"><i class="dot"></i>${esc(r.name)} <b>${U.pct(p)}</b></div>` : '';
              })
              .join('')}${App.data.shinyChance(cs) > 0 ? `<div class="rar-chip shiny-chip">✨ Шайни <b>${U.pct(App.data.shinyChance(cs))}</b></div>` : ''}</div>
            <div class="grid-cards" data-contents>${cs.pool
              .map((e) => ui.card(e.cid, { size: 'md', chance: e.chance, silhouette: false, badge: App.inv.discovered(e.cid) ? '' : '<span class="cbadge cb-missing" title="Ещё нет в коллекции">?</span>' }))
              .join('')}</div>
          </section>
        </div>`;

      const $ = (s) => ctx.el.querySelector(s);
      const openBtn = $('[data-open]');
      const reelsHost = $('[data-reels]');
      const idle = $('[data-idle]');
      const skipBtn = $('[data-skip]');

      function updateControls() {
        const tickets = App.cases.tickets(cs);
        const tr = $('[data-ticket-row]');
        if (tickets > 0 && cs.price > 0) {
          tr.hidden = false;
          $('[data-ticket-label]').innerHTML = `Использовать билеты <b>🎟️ ${tickets}</b>`;
          if (tickets < count) useTickets = false;
          $('[data-tickets]').checked = useTickets;
          $('[data-tickets]').disabled = tickets < count;
        } else {
          tr.hidden = true;
          useTickets = false;
        }
        const chk = App.cases.check(cs, count, { useTickets });
        let label;
        if (opening) label = 'Открываем…';
        else if (App.cases.isLocked(cs)) label = `🔒 Откроется на ${cs.requiredLevel} уровне`;
        else if (isCooldown && App.cases.cooldownLeft(cs) > 0) label = `⏳ Через ${U.clock(App.cases.cooldownLeft(cs))}`;
        else if (!cs.price) label = 'Открыть бесплатно';
        else if (useTickets) label = `Открыть ×${count} за 🎟️ ${count}`;
        else label = `Открыть${count > 1 ? ' ×' + count : ''} за ${ui.cur(cs.price * count, cs.currency)}`;
        openBtn.innerHTML = label;
        openBtn.disabled = opening || !chk.ok;
        openBtn.title = chk.ok ? '' : chk.reason;
        const pity = $('[data-pity]');
        if (cs.pity) {
          const left = cs.pity.count - (App.state.pity[cs.id] || 0);
          pity.hidden = false;
          pity.innerHTML = `<span>Гарант «${esc(App.data.getRarity(cs.pity.rarity).name)}» через <b>${left}</b> ${U.plural(left, ['открытие', 'открытия', 'открытий'])}</span>${ui.bar(1 - left / cs.pity.count, 'bar-gold')}`;
        }
        const luck = $('[data-luck]');
        const lc = App.boosts.luckCharges();
        luck.hidden = !lc;
        luck.innerHTML = !lc
          ? ''
          : App.boosts.luckApplies(cs)
            ? `🍀 Удача активна: ещё ${lc} ${U.plural(lc, ['открытие', 'открытия', 'открытий'])}`
            : `🍀 Удача не действует на этот кейс — только на кейсы до ${ui.cur(App.boosts.luckMaxPrice())}`;
        const prog = App.collection.caseProgress(cs);
        $('[data-colprog]').textContent = `${prog.have}/${prog.total}`;
        const claimed = App.collection.claimed(cs);
        $('[data-colreward]').innerHTML = claimed
          ? '<span class="good">✓ Коллекция кейса собрана, награда получена</span>'
          : prog.done
            ? `<a class="btn btn-gold btn-sm" href="#/collection/${esc(cs.id)}">Коллекция собрана — забрать награду</a>`
            : `<span class="muted">📖 Собери всех персонажей кейса — награда</span> ${ui.reward(App.collection.reward(cs))}`;
        $('[data-opened]').textContent = U.fmt(App.stats.get('case_' + cs.id));
      }
      updateControls();

      function buildReels(results) {
        reelsHost.innerHTML = '';
        reels = [];
        const n = results.length;
        const size = n === 1 ? 170 : n === 2 ? 150 : n === 3 ? 130 : 112;
        reelsHost.className = 'reels reels-' + n;
        results.forEach((r) => {
          const host = document.createElement('div');
          reelsHost.appendChild(host);
          const reel = new App.Reel(host, { size, gap: 10 });
          const winIndex = 46 + U.randInt(0, 4);
          reel.setItems(App.cases.strip(cs, { cid: r.item.cid, shiny: r.item.shiny }, winIndex + 8, winIndex));
          reel.center(3);
          reels.push({ reel, winIndex });
        });
      }

      async function spinReels(results) {
        buildReels(results);
        const base = App.anim.dur(6200, 2300);
        skipBtn.hidden = base === 0;
        await Promise.all(
          reels.map((r, i) =>
            r.reel.spin(r.winIndex, {
              duration: base ? base + i * (base > 3000 ? 280 : 120) : 0,
              onTick: i === 0 ? () => App.tick() : null,
            })
          )
        );
        skipBtn.hidden = true;
      }

      async function flipGrid(results) {
        reelsHost.innerHTML = `<div class="flip-grid">${results
          .map(
            (r, i) => `<div class="flip-card" data-i="${i}">
              <div class="flip-inner">
                <div class="flip-back"><span>🌸</span></div>
                <div class="flip-front">${ui.card(r.item, { size: 'md', showNew: false })}</div>
              </div>
            </div>`
          )
          .join('')}</div>`;
        reelsHost.className = 'reels reels-grid';
        const cards = Array.from(reelsHost.querySelectorAll('.flip-card'));
        const step = App.anim.dur(260, 90);
        skipBtn.hidden = step === 0;
        let skipped = step === 0;
        skipFn = () => (skipped = true);
        for (let i = 0; i < cards.length; i++) {
          const tier = results[i].ch.r.index;
          cards[i].classList.add('flipped', 'r-' + results[i].ch.rarity);
          if (!skipped) {
            App.sfx.play('flip');
            if (tier >= 3) {
              App.sfx.reveal(Math.min(tier, 3));
              App.fx.burstAt(cards[i], [results[i].ch.r.color, '#fff'], 24);
            }
            await U.sleep(step + (tier >= 3 ? 220 : 0));
            if (!ctx.alive) return;
          }
        }
        skipFn = null;
        skipBtn.hidden = true;
        await U.sleep(skipped ? 50 : 350);
      }

      let skipFn = null;
      function skip() {
        reels.forEach((r) => r.reel.skip());
        if (skipFn) skipFn();
      }

      async function doOpen() {
        if (opening) return;
        // «занято» включаем ДО открытия, чтобы окно нового уровня дождалось конца анимации
        App.setBusy(true);
        const results = App.cases.open(cs, count, { useTickets });
        if (!results) {
          App.setBusy(false);
          updateControls();
          return;
        }
        opening = true;
        updateControls();
        idle.hidden = true;
        App.sfx.play('open');
        const fast = App.anim.speed() === 'instant';
        try {
          if (fast) {
            reelsHost.innerHTML = '';
          } else if (results.length <= 5) await spinReels(results);
          else await flipGrid(results);
          if (!ctx.alive) {
            App.setBusy(false);
            App.feed.own(results.map((r) => r.item), cs.id);
            return;
          }
          if (!fast && results.length <= 5) {
            const best = results.reduce((b, r) => (r.ch.r.index > b.ch.r.index ? r : b), results[0]);
            App.sfx.reveal(best.ch.r.index);
            if (best.ch.r.index >= 3) reels.forEach((r) => App.fx.burstAt(r.reel.cells[r.winIndex], [best.ch.r.color, '#fff'], 30));
            await U.sleep(App.anim.dur(650, 300));
          }
        } catch (e) {
          console.error(e);
        }
        opening = false;
        App.feed.own(results.map((r) => r.item), cs.id);
        updateControls();
        const pityHit = results.some((r) => r.pity);
        if (pityHit) ui.toast('Сработал гарант! 🎯', 'gold');
        ui.dropModal(
          results.map((r) => r.item),
          {
            title: results.length === 1 ? 'Тебе выпала!' : `Открыто ${results.length} ${U.plural(results.length, ['кейс', 'кейса', 'кейсов'])}!`,
            firsts: new Set(results.filter((r) => r.first).map((r) => r.item.uid)),
            again: () => doOpen(),
            againLabel: 'Открыть ещё',
            onClose: () => {
              App.setBusy(false);
              if (ctx.alive) {
                updateControls();
                refreshContents();
              }
            },
          }
        );
      }

      function refreshContents() {
        const grid = $('[data-contents]');
        grid.querySelectorAll('.ccard').forEach((card) => {
          const missing = card.querySelector('.cb-missing');
          if (missing && App.inv.discovered(card.dataset.cid)) missing.remove();
        });
      }

      ctx.el.addEventListener('click', (e) => {
        const t = e.target;
        const cb = t.closest('[data-count]');
        if (cb) {
          count = Number(cb.dataset.count);
          ctx.el.querySelectorAll('[data-count]').forEach((x) => x.classList.toggle('active', x === cb));
          App.sfx.play('soft');
          updateControls();
          return;
        }
        const sp = t.closest('[data-sp]');
        if (sp) {
          App.store.setSetting('animSpeed', sp.dataset.sp);
          ctx.el.querySelectorAll('[data-sp]').forEach((x) => x.classList.toggle('active', x === sp));
          App.sfx.play('soft');
          return;
        }
        if (t.closest('[data-open]')) {
          doOpen();
          return;
        }
        if (t.closest('[data-skip]')) {
          skip();
          return;
        }
        const card = t.closest('[data-contents] .ccard');
        if (card) ui.showChar(card.dataset.cid);
      });
      ctx.el.addEventListener('change', (e) => {
        if (e.target.matches('[data-tickets]')) {
          useTickets = e.target.checked;
          updateControls();
        }
      });
      ctx.listen(document, 'keydown', (e) => {
        if (e.target.closest('input, textarea, select')) return;
        if (e.code === 'Space' && !ui.topModal()) {
          e.preventDefault();
          if (!opening) doOpen();
        } else if (e.code === 'KeyS' && opening) skip();
      });
      ctx.every(1000, () => {
        if (!opening && isCooldown) updateControls();
      });
      ctx.on('balance', () => !opening && updateControls());
      ctx.on('tickets', () => !opening && updateControls());
      ctx.on('boosts', () => !opening && updateControls());
      ctx.onDestroy(() => skip());
    },
  });
})();
