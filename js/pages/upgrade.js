/* Апгрейдер: ставишь своих персонажей (и монеты) ради более дорогого персонажа.
 * Шанс = ставка ÷ цена цели × (1 − houseEdge), но не больше maxChance (data/config.js → upgrade) */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;
  const CFG = GAME_DATA.config;

  const R = 92;
  const CIRC = 2 * Math.PI * R;
  const MULTS = [1.5, 2, 3, 5, 10];

  App.router.register('upgrade', {
    title: 'Апгрейдер',
    nav: 'games',
    feature: 'upgrade',
    render(ctx) {
      const g = App.games.get('upgrade') || { name: 'Апгрейдер' };
      const opt = Object.assign({ houseEdge: 0.05, maxChance: 0.9, maxItems: 8 }, CFG.upgrade);
      const head = App.games.head(g);
      const stake = new Set(); // uid персонажей в ставке
      const hidden = new Set(); // выигранный персонаж не показываем в списке, пока крутится стрелка
      let coins = 0;
      let target = null; // id персонажа
      let spinning = false;
      let empty = false; // сейчас показан экран «нечего ставить»
      let rot = 0;
      let tq = '';
      let tLimit = 60;
      let tab = 'stake';
      let picker = null;
      let last = null; // { ch, win } — итог прошлого апгрейда; виден на круге, пока не выбрана новая ставка
      const $ = (s) => ctx.el.querySelector(s);

      // пока крутится стрелка, окна нового уровня и достижений ждут; если ушёл со страницы — не ждут
      let held = false;
      const hold = (on) => {
        if (held === on) return;
        held = on;
        App.setBusy(on);
      };
      ctx.onDestroy(() => hold(false));

      /* ---------- расчёты ---------- */
      const stakeItems = () => Array.from(stake).map((uid) => App.inv.get(uid)).filter(Boolean);
      const stakeValue = () => stakeItems().reduce((s, it) => s + App.inv.value(it), coins);
      const targetValue = () => (target ? App.data.value(target) : 0);
      const chanceFor = (sv, tv) => (tv > 0 && sv > 0 ? Math.min(opt.maxChance, (sv / tv) * (1 - opt.houseEdge)) : 0);
      const chance = () => chanceFor(stakeValue(), targetValue());
      // все персонажи дороже ставки, от дешёвых к дорогим
      function candidates() {
        const sv = stakeValue();
        return App.data.chars
          .map((c) => ({ c, v: App.data.value(c.id) }))
          .filter((x) => x.v > sv)
          .sort((a, b) => a.v - b.v || a.c.name.localeCompare(b.c.name, 'ru'));
      }

      /* ---------- экраны ---------- */
      // Пустой инвентарь — нечего ставить
      function renderEmpty() {
        empty = true;
        stake.clear();
        coins = 0;
        ctx.el.innerHTML = `${head}${ui.empty(
          'inventory',
          'Пока нечего ставить',
          'Апгрейдер превращает твоих персонажей в кого-то подороже. Открой пару кейсов и возвращайся.',
          '<a class="btn btn-primary" href="#/cases">К кейсам</a>'
        )}`;
        App.games.bindHead(ctx.el, g);
      }

      function build() {
        empty = false;
        tq = '';
        tLimit = 60;
        ctx.el.innerHTML = `${head}
          <div class="up-top">
            <section class="panel up-col up-stake">
              <div class="up-col-head"><h3>Ставка</h3><span class="up-count" data-count></span></div>
              <div class="up-stake-cards" data-stake></div>
              <label class="up-coins"><span>+ монеты</span><span class="bet-input">${ui.coin()}<input type="number" inputmode="numeric" min="0" step="1" placeholder="0" data-coins></span></label>
              <div class="up-sum"><span>Сумма</span><b data-stakesum></b></div>
            </section>
            <section class="panel up-col up-center">
              <div class="up-dial" data-dial>
                <svg viewBox="0 0 220 220" aria-hidden="true">
                  <circle cx="110" cy="110" r="${R}" class="up-track"/>
                  <circle cx="110" cy="110" r="${R}" class="up-arc" data-arc stroke-dasharray="0 ${CIRC.toFixed(1)}" transform="rotate(-90 110 110)"/>
                  <g class="up-pointer" data-pointer><path d="M110 30 L101 6 L119 6 Z"/></g>
                </svg>
                <div class="up-dial-center"><b data-chance>0%</b><small>шанс</small></div>
              </div>
              <div class="chips up-mults">${MULTS.map((m) => `<button type="button" class="chip" data-mult="${m}">×${m}</button>`).join('')}</div>
              <button class="btn btn-primary btn-xl btn-block" data-go>Апгрейд</button>
              <div class="up-hint" data-hint></div>
            </section>
            <section class="panel up-col up-target">
              <div class="up-col-head"><h3>Цель</h3><span class="up-count" data-x></span></div>
              <div class="up-target-card" data-target></div>
            </section>
          </div>
          <div class="up-lists" data-lists data-tab="${tab}">
            ${App.widgets.tabs([['stake', 'Мои персонажи'], ['target', 'Цель']], tab, 'data-tabs')}
            <section class="up-list up-list-stake">
              <div class="section-head"><h2>Мои персонажи</h2><span class="muted small">до ${opt.maxItems} в ставке</span></div>
              <div data-picker></div>
            </section>
            <section class="up-list up-list-target">
              <div class="section-head"><h2>Цель</h2><span class="muted small">дороже ставки</span></div>
              <div class="picker">
                <div class="picker-tools"><input class="input" placeholder="Поиск по имени…" data-tq></div>
                <div class="picker-grid" data-targets></div>
                <div class="picker-more" data-tmore></div>
              </div>
            </section>
          </div>`;
        App.games.bindHead(ctx.el, g);
        picker = App.widgets.itemPicker($('[data-picker]'), {
          sort: 'value-desc',
          filter: (it) => !hidden.has(it.uid),
          emptyText: 'Нет персонажей',
          isSelected: (uid) => stake.has(uid),
          isDisabled: (it) => spinning || (stake.size >= opt.maxItems && !stake.has(it.uid)),
          disabledText: `В ставке может быть до ${opt.maxItems} персонажей`,
          onToggle: (it) => {
            if (spinning) return;
            if (stake.has(it.uid)) stake.delete(it.uid);
            else if (stake.size < opt.maxItems) stake.add(it.uid);
            update();
          },
        });
        update();
      }

      function renderTargets() {
        const sv = stakeValue();
        let list = candidates();
        if (tq) list = list.filter((x) => x.c.name.toLowerCase().includes(tq));
        $('[data-targets]').innerHTML = list.length
          ? list
              .slice(0, tLimit)
              .map((x) => ui.card(x.c.id, { size: 'sm', selected: target === x.c.id, chance: sv > 0 ? chanceFor(sv, x.v) : null }))
              .join('')
          : `<div class="picker-empty">${tq ? 'Никого не нашли' : 'Нет персонажей дороже ставки'}</div>`;
        $('[data-tmore]').innerHTML = list.length > tLimit ? `<button class="btn btn-secondary btn-sm" data-tmorebtn>Показать ещё (${list.length - tLimit})</button>` : '';
      }

      function update() {
        if (empty) return;
        const sv = stakeValue();
        if (target && targetValue() <= sv) target = null;
        const items = stakeItems();
        $('[data-count]').textContent = `${items.length} / ${opt.maxItems}`;
        $('[data-stake]').innerHTML = items.length
          ? items.map((it) => ui.card(it, { size: 'xs', showNew: false, attrs: 'title="Убрать из ставки"' })).join('')
          : '<div class="up-empty">Выбери персонажей в списке ниже</div>';
        $('[data-stakesum]').innerHTML = ui.cur(sv);
        const tv = targetValue();
        $('[data-target]').innerHTML = target
          ? ui.card(target, { size: 'sm' })
          : `<div class="up-empty">${sv > 0 ? 'Выбери цель или множитель' : 'Сначала выбери ставку'}</div>`;
        $('[data-x]').textContent = target && sv > 0 ? '×' + (tv / sv).toFixed(2) : '';
        if (sv > 0) last = null;
        const ch = last ? last.ch : chance();
        $('[data-chance]').textContent = U.pct(ch, ch > 0 && ch < 0.1 ? 2 : 1);
        $('[data-arc]').setAttribute('stroke-dasharray', `${(ch * CIRC).toFixed(1)} ${CIRC.toFixed(1)}`);
        $('[data-go]').disabled = spinning || !target || sv <= 0;
        $('[data-hint]').innerHTML = spinning
          ? 'Крутим…'
          : last
          ? `${last.win ? 'Получилось!' : 'Не повезло.'} Выбери новую ставку`
          : sv <= 0
          ? 'Выбери персонажей для ставки'
          : !target
          ? 'Выбери, во что апгрейдить'
          : `Ставка ${ui.cur(sv)} → ${ui.cur(tv)}`;
        ctx.el.querySelectorAll('[data-mult]').forEach((b) => (b.disabled = spinning));
        $('[data-dial]').classList.toggle('win', !!last && last.win);
        $('[data-dial]').classList.toggle('lose', !!last && !last.win);
        renderTargets();
      }

      /* ---------- апгрейд ---------- */
      async function go() {
        if (spinning || !target || empty) return;
        const items = stakeItems();
        const sv = stakeValue();
        if (sv <= 0) return;
        if (coins > 0 && !App.eco.can(coins)) {
          App.sfx.play('error');
          return ui.toast('Недостаточно монет', 'bad');
        }
        const ch = chance();
        const tgt = target;
        const tgtCh = App.data.getChar(tgt);
        spinning = true;
        hold(true);
        let newItem = null;
        const win = U.rand() < ch;
        try {
          // результат применяется сразу — уход со страницы ничего не ломает
          if (coins > 0) App.eco.spend(coins);
          App.inv.remove(items.map((it) => it.uid));
          if (win) {
            newItem = App.inv.add(tgt, { source: 'upgrade' });
            hidden.add(newItem.uid);
          }
          App.stats.inc('upgradesDone');
          if (win) App.stats.inc('upgradesWon');
          App.eco.addXp(Math.round(sv * CFG.levels.xpPerBet));
          stake.clear();
          coins = 0;
          $('[data-coins]').value = '';
          last = null;
          const dial = $('[data-dial]');
          dial.classList.remove('win', 'lose');
          // стрелку должно быть видно (на телефоне список персонажей ниже, и страница может быть прокручена)
          const r = dial.getBoundingClientRect();
          if (r.top < 64 || r.bottom > window.innerHeight) dial.scrollIntoView({ block: 'center', behavior: 'smooth' });
          $('[data-hint]').textContent = 'Крутим…';
          $('[data-go]').disabled = true;
          ctx.el.querySelectorAll('[data-mult]').forEach((b) => (b.disabled = true));
          picker.refresh();

          // стрелка: в зону шанса при победе, мимо — при проигрыше
          const arc = ch * 360;
          const mIn = Math.min(6, arc * 0.15);
          const mOut = Math.min(6, (360 - arc) * 0.15);
          const angle = win ? U.randFloat(mIn, Math.max(mIn, arc - mIn)) : U.randFloat(arc + mOut, Math.max(arc + mOut, 360 - mOut));
          const dur = App.anim.dur(3600, 1300);
          rot = rot - (rot % 360) + 360 * (dur ? 4 : 0) + angle;
          const ptr = $('[data-pointer]');
          ptr.style.transition = dur ? `transform ${dur}ms cubic-bezier(.15,.8,.2,1)` : 'none';
          ptr.style.transform = `rotate(${rot}deg)`;
          App.sfx.play('whoosh');
          if (dur) {
            const t0 = performance.now();
            let lastTick = 0;
            const tickLoop = (now) => {
              if (!ctx.alive || now - t0 >= dur) return;
              const p = (now - t0) / dur;
              if (now - lastTick > 50 + p * p * 260) {
                lastTick = now;
                App.tick(1100);
              }
              requestAnimationFrame(tickLoop);
            };
            requestAnimationFrame(tickLoop);
            await U.sleep(dur + 120);
          }
        } finally {
          spinning = false;
          hidden.clear();
          hold(false);
        }
        const name = tgtCh ? esc(tgtCh.name) : 'персонаж';
        if (!ctx.alive) {
          ui.toast(win ? `Апгрейд удался: ${name}` : 'Апгрейд не удался', win ? 'good' : 'bad');
          return;
        }
        last = { ch, win };
        if (win) {
          target = null;
          ui.dropModal([newItem], { title: 'Апгрейд удался', firsts: new Set(App.inv.wasFirst(newItem) ? [newItem.uid] : []) });
        } else {
          App.sfx.play('lose');
          App.fx.shake($('[data-dial]'));
        }
        if (!App.state.inventory.length) return renderEmpty();
        picker.refresh();
        update();
      }

      function setTab(t) {
        tab = t;
        const lists = $('[data-lists]');
        if (!lists) return;
        lists.dataset.tab = t;
        lists.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
      }

      /* ---------- события (ctx.el живёт, пока открыта страница) ---------- */
      ctx.el.addEventListener('click', (e) => {
        if (empty) return;
        const t = e.target;
        if (t.closest('[data-rules]')) return;
        if (t.closest('[data-go]')) return go();
        const tb = t.closest('[data-tabs] [data-tab]');
        if (tb) {
          App.sfx.play('soft');
          return setTab(tb.dataset.tab);
        }
        if (spinning) return;
        const mb = t.closest('[data-mult]');
        if (mb) {
          const sv = stakeValue();
          if (sv <= 0) return ui.toast('Сначала выбери персонажей для ставки', 'info');
          const list = candidates();
          const need = sv * Number(mb.dataset.mult);
          const c = list.find((x) => x.v >= need) || list[list.length - 1];
          if (!c) return ui.toast('Нет персонажей дороже ставки', 'info');
          target = c.c.id;
          App.sfx.play('soft');
          update();
          return;
        }
        if (t.closest('[data-tmorebtn]')) {
          tLimit += 60;
          renderTargets();
          return;
        }
        const tc = t.closest('[data-targets] .ccard');
        if (tc) {
          target = target === tc.dataset.cid ? null : tc.dataset.cid;
          App.sfx.play('soft');
          update();
          return;
        }
        const sc = t.closest('[data-stake] .ccard');
        if (sc) {
          stake.delete(sc.dataset.uid);
          App.sfx.play('soft');
          update();
          picker.refresh();
        }
      });
      ctx.el.addEventListener('input', (e) => {
        if (e.target.matches('[data-coins]')) {
          coins = U.clamp(Math.floor(Number(e.target.value) || 0), 0, App.state.coins);
          update();
        } else if (e.target.matches('[data-tq]')) {
          tq = e.target.value.trim().toLowerCase();
          tLimit = 60;
          renderTargets();
        }
      });
      ctx.el.addEventListener('change', (e) => {
        if (e.target.matches('[data-coins]')) e.target.value = coins || '';
      });
      // инвентарь поменялся (продажа из окна выпадения, награда и т.п.)
      ctx.on(
        'inventory',
        U.debounce(() => {
          if (!ctx.alive || spinning) return;
          if (!App.state.inventory.length) {
            if (!empty) renderEmpty();
            return;
          }
          if (empty) return build();
          stake.forEach((uid) => App.inv.get(uid) || stake.delete(uid));
          picker.refresh();
          update();
        }, 80)
      );

      if (App.state.inventory.length) build();
      else renderEmpty();
    },
  });
})();
