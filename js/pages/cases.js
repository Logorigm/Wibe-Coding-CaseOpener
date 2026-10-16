/* Главная «Кейсы» (кейсы по уровням) и страница открытия кейса */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;

  const LS_EARLY = 'waifudrop:earlyCasesOpen';
  const LS_COUNT = 'waifudrop:openCount';
  const lsGet = (k) => {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  };
  const lsSet = (k, v) => {
    try { localStorage.setItem(k, v); } catch (e) { /* хранилище недоступно — не страшно */ }
  };

  // цвет кейса для мягкой подсветки картинки
  const ccStyle = (cs) => {
    const rgb = U.hexToRgb(cs.color || '#ff5fa2').join(',');
    return `--cc:rgb(${rgb});--cc-rgb:${rgb}`;
  };

  // «Бесплатно раз в час» / «раз в 2 часа» / «раз в 30 мин»
  function freeLabel(cs) {
    const m = Number(cs.cooldown) || 0;
    if (!m) return 'Бесплатно';
    if (m === 60) return 'Бесплатно раз в час';
    if (m === 1440) return 'Бесплатно раз в сутки';
    if (m % 60 === 0) {
      const h = m / 60;
      return `Бесплатно раз в ${h} ${U.plural(h, ['час', 'часа', 'часов'])}`;
    }
    return `Бесплатно раз в ${m} мин`;
  }

  const RISK = { low: 'низкий разброс', mid: 'средний разброс', high: 'высокий разброс', elite: 'элитный' };

  /* ======================= Главная: список кейсов ======================= */

  function caseCard(cs, locked) {
    return `<a class="cs-card${locked ? ' locked' : ''}" href="#/case/${esc(cs.id)}" style="${ccStyle(cs)}">
      <div class="cs-art">${ui.caseImg(cs)}${locked ? `<span class="cs-lock">${ui.svg('lock')}</span>` : ''}</div>
      <div class="cs-name">${esc(cs.name)}</div>
      <div class="cs-price">${ui.cur(cs.price)}</div>
    </a>`;
  }

  function giftAction(cs) {
    const left = App.cases.cooldownLeft(cs);
    return left > 0
      ? `<span class="gift-timer">${ui.svg('clock')}<span>Через ${U.clock(left)}</span></span>`
      : `<span class="btn btn-primary btn-sm" data-gift-open="${esc(cs.id)}">Открыть</span>`;
  }

  function giftCard(cs, highlight) {
    return `<a class="gift-card${highlight ? ' onboard' : ''}" href="#/case/${esc(cs.id)}" style="${ccStyle(cs)}" data-gift="${esc(cs.id)}">
      <div class="gift-art">${ui.caseImg(cs)}</div>
      <div class="gift-body">
        <div class="gift-name">${esc(cs.name)}</div>
        <div class="gift-sub">${freeLabel(cs)}</div>
      </div>
      <div class="gift-act" data-gift-act>${giftAction(cs)}</div>
    </a>`;
  }

  App.router.register('cases', {
    title: 'Кейсы',
    nav: 'cases',
    feature: 'cases',
    render(ctx) {
      ctx.el.innerHTML = `
        <div class="page-head">
          <div><h1>Кейсы</h1><p>С каждым уровнем открываются новые кейсы</p></div>
        </div>
        <div data-bank></div>
        <div data-gift></div>
        <div data-levels></div>`;
      const $ = (s) => ctx.el.querySelector(s);
      const bankHost = $('[data-bank]');
      const giftHost = $('[data-gift]');
      const levelsHost = $('[data-levels]');

      /* ---------- помощь, если монеты кончились ---------- */
      let bankKey = '';
      function renderBank() {
        const b = App.eco.bankrupt();
        const key = !b ? 'none' : b.left > 0 ? 'wait' : 'ready:' + b.amount;
        if (key === bankKey) {
          if (b && b.left > 0) {
            const t = bankHost.querySelector('[data-bank-left]');
            if (t) t.textContent = 'Через ' + U.clock(b.left);
          }
          return;
        }
        bankKey = key;
        if (!b) {
          bankHost.innerHTML = '';
          return;
        }
        bankHost.innerHTML = `<div class="bank">
          <div class="bank-text"><b>Монеты закончились</b><span>${b.left > 0 ? 'Помощь скоро будет доступна' : 'Возьми помощь, чтобы продолжить'}</span></div>
          ${b.left > 0
            ? `<span class="bank-timer">${ui.svg('clock')}<span data-bank-left>Через ${U.clock(b.left)}</span></span>`
            : `<button class="btn btn-gold btn-sm" data-bank-claim>Получить ${ui.cur(b.amount)}</button>`}
        </div>`;
      }

      /* ---------- бесплатный подарок ---------- */
      function gifts() {
        return App.cases
          .list()
          .filter((cs) => App.cases.isFree(cs) && !App.cases.isLocked(cs) && cs.pool.length)
          .sort((a, b) => (b.id === 'gift') - (a.id === 'gift'));
      }
      let giftKey = '';
      const giftState = () => `${App.stats.get('casesOpened') === 0}|${gifts().map((cs) => cs.id + (App.cases.cooldownLeft(cs) > 0 ? '-' : '+')).join(',')}`;
      function renderGift() {
        giftKey = giftState();
        const list = gifts();
        const first = App.stats.get('casesOpened') === 0;
        const target = first ? list.find((cs) => App.cases.cooldownLeft(cs) <= 0) : null;
        giftHost.innerHTML = list.length
          ? `${target ? `<div class="onboard-hint">${ui.svg('gift')}<span>Начни с бесплатного подарка — нажми «Открыть»</span></div>` : ''}
             <div class="gift-list">${list.map((cs) => giftCard(cs, cs === target)).join('')}</div>`
          : '';
      }
      function tickGift() {
        if (giftState() !== giftKey) return renderGift();
        giftHost.querySelectorAll('[data-gift]').forEach((card) => {
          const cs = App.data.getCase(card.dataset.gift);
          const act = card.querySelector('[data-gift-act]');
          if (!cs || !act) return;
          const html = giftAction(cs);
          if (act.innerHTML !== html) act.innerHTML = html;
        });
      }

      /* ---------- кейсы по уровням ---------- */
      const earlyOpen = () => lsGet(LS_EARLY) === '1';

      function levelSection(level, cases, o) {
        o = o || {};
        return `<section class="lvl-sec">
          <div class="lvl-head"><h2>Уровень ${level}</h2>${o.isNew ? '<span class="lvl-new">новые</span>' : ''}</div>
          <div class="cs-grid">${cases.map((cs) => caseCard(cs, false)).join('')}</div>
        </section>`;
      }

      function lockedSection(level, cases) {
        const st = App.state;
        let info;
        if (level === st.level + 1) {
          const need = App.eco.xpNeeded(st.level);
          const left = Math.max(0, need - st.xp);
          info = `<div class="lvl-lock-text">Откроется на ${level} уровне <span>· ещё ${U.fmt(left)} опыта</span></div>${ui.bar(need ? st.xp / need : 0)}`;
        } else {
          const n = level - st.level;
          info = `<div class="lvl-lock-text">Откроется на ${level} уровне <span>· ещё ${n} ${U.plural(n, ['уровень', 'уровня', 'уровней'])}</span></div>`;
        }
        return `<section class="lvl-sec lvl-locked">
          <div class="lvl-head"><h2>${ui.svg('lock')}<span>Уровень ${level}</span></h2></div>
          <div class="lvl-lock-info">${info}</div>
          <div class="cs-grid">${cases.map((cs) => caseCard(cs, true)).join('')}</div>
        </section>`;
      }

      function renderLevels() {
        const dev = App.settings.devMode;
        const lvl = App.state.level;
        // все платные кейсы (как App.data.ladder(), но и с необычными настройками из Конструктора)
        const paid = App.cases
          .list()
          .filter((cs) => !App.cases.isFree(cs))
          .sort((a, b) => (a.requiredLevel || 1) - (b.requiredLevel || 1) || a.price - b.price);
        const levels = Array.from(new Set(paid.map((cs) => cs.requiredLevel || 1))).sort((a, b) => a - b);
        const of = (l) => paid.filter((cs) => (cs.requiredLevel || 1) === l);
        const open = levels.filter((l) => dev || l <= lvl).reverse(); // новые сверху
        const next = dev ? null : levels.find((l) => l > lvl);
        const recent = open.slice(0, 2);
        const early = open.slice(2);

        let html = recent.map((l, i) => levelSection(l, of(l), { isNew: i === 0 && open.length > 1 })).join('');
        if (early.length) {
          const n = early.reduce((s, l) => s + of(l).length, 0);
          html += `<details class="early" data-early${earlyOpen() ? ' open' : ''}>
            <summary>${ui.svg('next')}<span>Ранние кейсы</span><span class="early-n">${n}</span></summary>
            <div class="early-body">${early.map((l) => levelSection(l, of(l))).join('')}</div>
          </details>`;
        }
        if (next != null) html += lockedSection(next, of(next));
        if (!html && !gifts().length) html = ui.empty('cases', 'Кейсов пока нет', 'Добавь кейсы в data/cases.js или в Конструкторе');
        levelsHost.innerHTML = html;
      }

      function renderAll() {
        if (!ctx.alive) return;
        renderBank();
        renderGift();
        renderLevels();
      }
      renderAll();

      ctx.el.addEventListener('click', (e) => {
        const go = e.target.closest('[data-gift-open]');
        if (go) {
          e.preventDefault();
          App.router.go('case/' + encodeURIComponent(go.dataset.giftOpen) + '/open');
          return;
        }
        if (e.target.closest('[data-bank-claim]')) {
          App.eco.claimBankrupt();
          renderBank();
        }
      });
      // details: событие toggle не всплывает — ловим на погружении
      ctx.listen(
        ctx.el,
        'toggle',
        (e) => {
          if (e.target.matches && e.target.matches('[data-early]')) lsSet(LS_EARLY, e.target.open ? '1' : '0');
        },
        true
      );

      ctx.every(1000, () => {
        tickGift();
        renderBank();
      });
      const rerender = U.debounce(renderAll, 120);
      const rebank = U.debounce(() => ctx.alive && renderBank(), 120);
      ctx.on('levelup', rerender);
      ctx.on('xp', rerender);
      ctx.on('settings', (s) => {
        if (!s || !s.key || s.key === 'devMode') rerender();
      });
      ctx.on('balance', rebank);
      ctx.on('inventory', rebank);
    },
  });

  /* ======================= Открытие кейса ======================= */
  const COUNTS = [1, 3, 5, 10];
  const PRE = 6; // сколько карточек слева/справа переносим со старой ленты, чтобы не было скачка

  App.router.register('case', {
    title: (ctx) => {
      const cs = App.data.getCase(ctx.params[0]);
      return cs ? cs.name : 'Кейс';
    },
    nav: 'cases',
    render(ctx) {
      const cs = App.data.getCase(ctx.params[0]);
      if (!cs) {
        ctx.el.innerHTML = ui.empty('cases', 'Кейс не найден', 'Возможно, его убрали из игры.', '<a class="btn btn-primary" href="#/cases">К кейсам</a>');
        return;
      }
      const free = App.cases.isFree(cs);
      const empty = !cs.pool.length;
      const multiAllowed = () => !free && !App.cases.isLocked(cs) && App.cases.maxCount() > 1;
      let count = 1;
      if (multiAllowed()) {
        const saved = Number(lsGet(LS_COUNT));
        if (COUNTS.includes(saved) && saved <= App.cases.maxCount()) count = saved;
      }
      const n = () => (multiAllowed() ? count : 1);

      let opening = false;
      let fresh = true; // на этой странице ещё ничего не открывали
      let skipFlips = false;
      let release = null; // снять «занято» (ровно один раз за открытие)

      const rtp = free ? null : App.data.caseRTP(cs);
      const meta = !free && rtp != null && !empty
        ? `Средний возврат ≈ ${Math.round(rtp * 100)}%${RISK[cs.risk] ? ' · ' + RISK[cs.risk] : ''}`
        : '';

      ctx.el.innerHTML = `
        <a class="back-link" href="#/cases">${ui.svg('back')}<span>Кейсы</span></a>
        <div class="co-head" style="${ccStyle(cs)}">
          <div class="co-art">${ui.caseImg(cs)}</div>
          <div class="co-info">
            <h1>${esc(cs.name)}</h1>
            <div class="co-price">${free ? `<span>${freeLabel(cs)}</span>` : ui.cur(cs.price)}</div>
            ${meta ? `<div class="co-meta">${meta}</div>` : ''}
          </div>
        </div>

        <div class="panel co-stage idle" data-stage>
          ${empty
            ? ui.empty('cases', 'Кейс пуст', 'В нём пока нет персонажей.')
            : `<div class="co-reel" data-reel></div>
               <div class="co-grid" data-grid hidden></div>
               <div class="co-overlay" data-overlay hidden><span>Нажми «Открыть»</span></div>`}
        </div>

        <div class="co-controls" data-controls></div>

        ${empty
          ? ''
          : `<section class="section co-contents">
              <div class="section-head"><h2>Что внутри</h2><span class="muted small" data-prog></span></div>
              <div class="grid-cards" data-contents></div>
            </section>`}`;

      const $ = (s) => ctx.el.querySelector(s);
      const stage = $('[data-stage]');
      const reelHost = $('[data-reel]');
      const grid = $('[data-grid]');
      const overlay = $('[data-overlay]');
      const controls = $('[data-controls]');

      /* ---------- лента ---------- */
      const smallScreen = () => window.matchMedia('(max-width: 600px)').matches;
      let reel = null;
      let reelSize = 0;
      let reelItems = null;
      let reelCenter = 0;

      function buildReel() {
        reelSize = smallScreen() ? 110 : 150;
        reelHost.style.height = Math.round((reelSize * 4) / 3 + 50) + 'px';
        reel = new App.Reel(reelHost, { size: reelSize, gap: 10 });
        if (!reelItems) {
          reelItems = [];
          for (let i = 0; i < 24; i++) reelItems.push(App.cases.roll(cs));
          reelCenter = 10;
        }
        reel.setItems(reelItems);
        reel.center(reelCenter);
      }

      // Новая лента: начало — те же карточки, что сейчас видны, поэтому прокрутка начинается без скачка
      function prepStrip(cid) {
        const winIndex = 40 + U.randInt(0, 5);
        const items = App.cases.strip(cs, { cid }, winIndex + 8, winIndex);
        let offset = 0;
        if (reelItems) {
          for (let k = -PRE; k <= PRE; k++) {
            const src = reelItems[reelCenter + k];
            if (src) items[PRE + k] = { cid: src.cid };
          }
          offset = reel.pos - reel.targetFor(reelCenter, 0);
          if (!isFinite(offset) || Math.abs(offset) > reelSize) offset = 0;
        }
        reel.setItems(items);
        reel.pos = reel.targetFor(PRE, 0) + offset;
        reel.apply(reel.pos);
        reelItems = items;
        reelCenter = winIndex;
        return winIndex;
      }

      /* ---------- плитки для нескольких кейсов ---------- */
      const placeholder = '<div class="ccard sm co-ph"><div class="ccard-art"></div><div class="ccard-info"><div class="ccard-name">&nbsp;</div></div></div>';
      function renderTiles(k, results) {
        grid.className = 'co-grid n' + k;
        grid.innerHTML = Array.from(
          { length: k },
          (_, i) => `<div class="flip"><div class="flip-in">
            <div class="flip-front">${results ? ui.card(results[i].item, { size: 'sm', hideValue: true, showNew: false }) : placeholder}</div>
            <div class="flip-back">${ui.caseImg(cs)}</div>
          </div></div>`
        ).join('');
      }

      function showMode() {
        if (empty) return;
        if (n() === 1) {
          grid.hidden = true;
          reelHost.hidden = false;
          if (!reel || reelSize !== (smallScreen() ? 110 : 150)) buildReel();
          else reel.center(reelCenter);
        } else {
          reelHost.hidden = true;
          grid.hidden = false;
          renderTiles(n());
        }
        updateOverlay();
      }

      function updateOverlay() {
        if (!overlay) return;
        // подсказка нужна только над лентой: плитки рубашкой вверх понятны и так
        overlay.hidden = !(fresh && !opening && n() === 1 && App.cases.check(cs, n()).ok);
        stage.classList.toggle('idle', fresh);
      }

      /* ---------- кнопки ---------- */
      function renderControls() {
        const multi = multiAllowed();
        if (!multi) count = 1;
        controls.innerHTML = `
          ${multi ? `<div class="co-seg" role="group" aria-label="Сколько открыть">${COUNTS.filter((k) => k <= App.cases.maxCount())
            .map((k) => `<button class="${k === count ? 'active' : ''}" data-count="${k}">×${k}</button>`)
            .join('')}</div>` : ''}
          <button class="btn btn-primary btn-xl co-open" data-open></button>
          <button class="btn btn-secondary btn-xl co-skip" data-skip hidden>Пропустить</button>`;
        updateButton();
      }

      function updateButton() {
        const btn = controls.querySelector('[data-open]');
        if (!btn) return;
        const k = n();
        const chk = App.cases.check(cs, k);
        const left = App.cases.cooldownLeft(cs);
        let label;
        if (App.cases.isLocked(cs)) label = `${ui.svg('lock')}<span>Откроется на ${cs.requiredLevel} уровне</span>`;
        else if (empty) label = 'Кейс пуст';
        else if (free && left > 0) label = `${ui.svg('clock')}<span>Через ${U.clock(left)}</span>`;
        else if (free) label = 'Открыть бесплатно';
        else if (!App.eco.can(cs.price * k)) label = 'Недостаточно монет';
        else label = `Открыть за ${ui.cur(cs.price * k)}`;
        if (btn.innerHTML !== label) btn.innerHTML = label;
        btn.disabled = opening || !chk.ok;
        controls.querySelectorAll('[data-count]').forEach((b) => (b.disabled = opening));
      }

      function setSpinning(on, canSkip) {
        const open = controls.querySelector('[data-open]');
        const skip = controls.querySelector('[data-skip]');
        if (open) open.hidden = on;
        if (skip) skip.hidden = !(on && canSkip);
        updateButton();
      }

      /* ---------- что внутри ---------- */
      const HAVE = `<span class="cbadge cb-have" title="Уже в коллекции">${ui.svg('check')}</span>`;
      function renderContents() {
        const host = $('[data-contents]');
        if (!host) return;
        host.innerHTML = cs.pool
          .map((e) => ui.card(e.cid, { size: 'sm', chance: e.chance, badge: App.inv.discovered(e.cid) ? HAVE : '' }))
          .join('');
        const prog = $('[data-prog]');
        if (prog) {
          const p = App.collection.caseProgress(cs);
          prog.textContent = App.features.unlocked('collection') && p.have ? `Собрано ${p.have} из ${p.total}` : '';
        }
      }

      /* ---------- открытие ---------- */
      async function spin(result) {
        if (!reel) buildReel();
        const win = prepStrip(result.item.cid);
        const dur = App.anim.dur(5500, 2200);
        setSpinning(true, dur > 0);
        await reel.spin(win, { duration: dur, onTick: () => App.tick() });
        if (dur > 0 && ctx.alive) await U.sleep(App.anim.dur(450, 220));
      }

      async function flip(results) {
        renderTiles(results.length, results);
        const tiles = Array.from(grid.children);
        const step = App.anim.dur(120, 60);
        skipFlips = step === 0;
        grid.classList.toggle('instant', skipFlips);
        setSpinning(true, step > 0);
        void grid.offsetWidth; // чтобы переворот был анимированным
        if (!skipFlips) await U.sleep(120);
        for (let i = 0; i < tiles.length; i++) {
          if (!ctx.alive) return;
          tiles[i].classList.add('flipped');
          if (skipFlips) continue;
          App.sfx.play('flip');
          const tier = results[i].ch ? results[i].ch.r.index : 0;
          await U.sleep(step + (tier >= 4 ? 260 : 0));
        }
        if (!skipFlips && ctx.alive) await U.sleep(App.anim.dur(450, 220));
      }

      function skip() {
        if (reel) reel.skip();
        skipFlips = true;
        if (grid) grid.classList.add('instant');
      }

      async function doOpen() {
        if (opening || !ctx.alive || empty || ui.topModal()) return;
        const k = n();
        // «занято» включаем ДО открытия: окно нового уровня дождётся конца анимации
        App.setBusy(true);
        let held = true;
        const done = () => {
          if (!held) return;
          held = false;
          App.setBusy(false);
        };
        let results = null;
        try {
          results = App.cases.open(cs, k);
        } finally {
          if (!results) {
            done();
            updateButton();
          }
        }
        if (!results) return;
        release = done;
        opening = true;
        fresh = false;
        updateOverlay();
        App.sfx.play('open');
        try {
          if (k === 1) {
            grid.hidden = true;
            reelHost.hidden = false;
            await spin(results[0]);
          } else {
            await flip(results);
          }
        } catch (e) {
          console.error(e);
        }
        if (!ctx.alive) {
          done();
          return;
        }
        setSpinning(false);
        const canAgain = App.cases.check(cs, k).ok;
        let m = null;
        try {
          m = ui.dropModal(
            results.map((r) => r.item),
            {
              firsts: new Set(results.filter((r) => r.first).map((r) => r.item.uid)),
              again: canAgain
                ? () => {
                    if (ctx.alive && !opening && !ui.topModal()) doOpen();
                  }
                : null,
              againLabel: 'Открыть ещё',
              onClose: () => {
                opening = false;
                done();
                if (ctx.alive) refresh();
              },
            }
          );
        } catch (e) {
          console.error(e);
        }
        if (!m) {
          opening = false;
          done();
          refresh();
        }
      }

      function refresh() {
        if (!ctx.alive) return;
        const multiWas = !!controls.querySelector('[data-count]');
        if (multiWas !== multiAllowed()) {
          renderControls();
          showMode();
        } else updateButton();
        updateOverlay();
        renderContents();
      }

      /* ---------- события ---------- */
      ctx.el.addEventListener('click', (e) => {
        const t = e.target;
        const cb = t.closest('[data-count]');
        if (cb) {
          if (opening) return;
          count = Number(cb.dataset.count) || 1;
          lsSet(LS_COUNT, String(count));
          controls.querySelectorAll('[data-count]').forEach((b) => b.classList.toggle('active', b === cb));
          App.sfx.play('soft');
          updateButton();
          showMode();
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

      ctx.listen(document, 'keydown', (e) => {
        if (ui.topModal() || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
        if (e.code === 'Space') {
          e.preventDefault();
          if (e.repeat) return;
          if (opening) skip();
          else doOpen();
        } else if (e.code === 'KeyS' && opening) skip();
      });

      ctx.listen(
        window,
        'resize',
        U.debounce(() => {
          if (!ctx.alive || opening || empty || n() !== 1) return;
          if (reelSize !== (smallScreen() ? 110 : 150)) buildReel();
          else if (reel) reel.center(reelCenter);
        }, 150)
      );

      ctx.every(1000, () => {
        if (!opening && free) {
          updateButton();
          updateOverlay();
        }
      });
      ctx.on('balance', () => {
        if (!opening) {
          updateButton();
          updateOverlay();
        }
      });
      ctx.on('levelup', () => !opening && refresh());
      ctx.on('settings', (s) => {
        if (!opening && (!s || !s.key || s.key === 'devMode')) {
          renderControls();
          showMode();
        }
      });
      // ушли со страницы посреди анимации — досрочно останавливаем и снимаем «занято»
      ctx.onDestroy(() => {
        skip();
        if (release) release();
      });

      renderControls();
      showMode();
      renderContents();

      // #/case/<id>/open — пришли с кнопки «Открыть» (подарок на главной): сразу открываем
      if (ctx.params[1] === 'open') {
        try {
          history.replaceState(null, '', '#/case/' + encodeURIComponent(cs.id));
        } catch (e) { /* не страшно */ }
        if (App.cases.check(cs, n()).ok) ctx.after(App.anim.dur(250, 120), doOpen);
      }
    },
  });
})();
