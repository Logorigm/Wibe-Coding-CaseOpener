/* Апгрейд: ставишь персонажей (и монеты) ради более дорогого персонажа */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const CFG = GAME_DATA.config;

  const R = 92;
  const CIRC = 2 * Math.PI * R;

  App.router.register('upgrade', {
    title: 'Апгрейд',
    minLevel: () => (CFG.unlocks && CFG.unlocks.upgrade) || 1,
    render(ctx) {
      const opt = CFG.upgrade || { houseEdge: 0.05, maxChance: 0.9, maxItems: 8 };
      const stake = new Set();
      let coins = 0;
      let target = null; // { cid, shiny }
      let busy = false;
      let rot = 0;
      let tq = '';
      let tShiny = false;

      ctx.el.innerHTML = `
        <div class="page-head"><div><h1>Апгрейд</h1><p class="muted">Поставь персонажей и попробуй превратить их в кого-то подороже. Чем выше цель — тем меньше шанс.</p></div></div>
        <div class="upgrade-layout">
          <section class="panel up-side">
            <h3>Твоя ставка</h3>
            <div class="up-stake" data-stake></div>
            <label class="up-coins">+ монеты <span class="bet-input">${ui.icon('coins')}<input type="number" min="0" step="10" value="0" data-coins></span></label>
            <div class="up-sum">Сумма: <b data-stakesum></b></div>
          </section>
          <section class="panel up-center">
            <div class="dial" data-dial>
              <svg viewBox="0 0 220 220">
                <defs><linearGradient id="upg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>
                <circle cx="110" cy="110" r="${R}" class="dial-track"/>
                <circle cx="110" cy="110" r="${R}" class="dial-arc" data-arc stroke="url(#upg)" stroke-dasharray="0 ${CIRC}" transform="rotate(-90 110 110)"/>
                <g class="dial-pointer" data-pointer><path d="M110 4 L101 22 L119 22 Z"/></g>
              </svg>
              <div class="dial-center"><b data-chance>0%</b><small>шанс</small></div>
            </div>
            <div class="chips chips-sm" data-mults>${[1.5, 2, 3, 5, 10].map((m) => `<button class="chip" data-mult="${m}">×${m}</button>`).join('')}</div>
            <button class="btn btn-primary btn-xl" data-go>Апгрейд!</button>
            <div class="small muted">Шанс = ставка ÷ цель × ${Math.round((1 - opt.houseEdge) * 100)}%, максимум ${Math.round(opt.maxChance * 100)}%</div>
          </section>
          <section class="panel up-side">
            <h3>Цель</h3>
            <div class="up-target" data-target></div>
          </section>
        </div>
        <div class="two-col up-pickers">
          <section class="section"><div class="section-head"><h2>Твои персонажи</h2><span class="muted small">до ${opt.maxItems} шт.</span></div><div data-picker></div></section>
          <section class="section">
            <div class="section-head"><h2>Выбери цель</h2></div>
            <div class="picker-tools"><input class="input" placeholder="Поиск…" data-tq><label class="switch-row"><input type="checkbox" data-tshinytoggle><span class="switch"></span>✨ Шайни</label></div>
            <div class="picker-grid" data-targets></div>
          </section>
        </div>`;

      const $ = (s) => ctx.el.querySelector(s);

      const stakeValue = () => {
        let v = coins;
        stake.forEach((uid) => {
          const it = App.inv.get(uid);
          if (it) v += App.inv.value(it);
        });
        return v;
      };
      const targetValue = () => (target ? App.data.value(target.cid, target.shiny) : 0);
      const chanceFor = (sv, tv) => (tv > 0 && sv > 0 ? Math.min(opt.maxChance, (sv / tv) * (1 - opt.houseEdge)) : 0);
      const chance = () => chanceFor(stakeValue(), targetValue());

      const picker = App.widgets.itemPicker($('[data-picker]'), {
        sort: 'value-desc',
        filter: (it) => !it.locked,
        emptyText: 'Нет персонажей (закреплённые не показываются)',
        isSelected: (uid) => stake.has(uid),
        isDisabled: () => stake.size >= opt.maxItems,
        disabledText: `Максимум ${opt.maxItems} персонажей в ставке`,
        onToggle: (it) => {
          if (busy) return;
          if (stake.has(it.uid)) stake.delete(it.uid);
          else if (stake.size < opt.maxItems) stake.add(it.uid);
          update();
        },
      });

      function candidates() {
        const sv = stakeValue();
        const list = [];
        App.data.chars.forEach((c) => {
          list.push({ cid: c.id, shiny: false, v: App.data.value(c.id, false) });
          if (tShiny) list.push({ cid: c.id, shiny: true, v: App.data.value(c.id, true) });
        });
        return list
          .filter((x) => (!tShiny || x.shiny) && x.v > sv && (!tq || App.data.getChar(x.cid).name.toLowerCase().includes(tq)))
          .sort((a, b) => a.v - b.v);
      }

      function renderTargets() {
        const sv = stakeValue();
        const list = candidates().slice(0, 80);
        $('[data-targets]').innerHTML = list.length
          ? list
              .map((x) =>
                ui.card(x.cid, {
                  size: 'sm',
                  shiny: x.shiny,
                  selected: target && target.cid === x.cid && target.shiny === x.shiny,
                  attrs: `data-tshiny="${x.shiny ? 1 : 0}"`,
                  badge: sv > 0 ? `<span class="cbadge cb-chance">${U.pct(chanceFor(sv, x.v), 1)}</span>` : '',
                })
              )
              .join('')
          : `<div class="picker-empty">${sv > 0 ? 'Нет персонажей дороже ставки' : 'Ничего не найдено'}</div>`;
      }

      function update() {
        const sv = stakeValue();
        if (target && targetValue() <= sv) target = null;
        const items = Array.from(stake).map((uid) => App.inv.get(uid)).filter(Boolean);
        $('[data-stake]').innerHTML = items.length
          ? `<div class="mini-cards">${items.map((it) => ui.card(it, { size: 'xs', showNew: false })).join('')}</div>`
          : '<div class="up-empty">Выбери персонажей снизу</div>';
        $('[data-stakesum]').innerHTML = ui.cur(sv);
        $('[data-target]').innerHTML = target
          ? `${ui.card(target.cid, { size: 'md', shiny: target.shiny })}<div class="up-mult">×${(targetValue() / Math.max(1, sv)).toFixed(2)}</div>`
          : '<div class="up-empty">Выбери цель справа</div>';
        const ch = chance();
        $('[data-chance]').textContent = U.pct(ch, 2);
        $('[data-arc]').setAttribute('stroke-dasharray', `${(ch * CIRC).toFixed(1)} ${CIRC}`);
        const go = $('[data-go]');
        go.disabled = busy || !target || sv <= 0;
        go.innerHTML = busy ? 'Крутим…' : target ? `Апгрейд! <small>${U.pct(ch, 1)}</small>` : 'Выбери цель';
        renderTargets();
      }

      async function go() {
        if (busy || !target) return;
        const items = Array.from(stake).map((uid) => App.inv.get(uid)).filter((it) => it && !it.locked);
        const sv = stakeValue();
        if (sv <= 0) return;
        if (coins > 0 && !App.eco.can(coins, 'coins')) return ui.toast(ui.notEnough('coins'), 'bad');
        const ch = chance();
        const tgt = target;
        busy = true;
        App.setBusy(true);
        // результат определяется сразу
        if (coins > 0) App.eco.spend(coins, 'coins');
        App.inv.remove(items.map((it) => it.uid));
        const win = U.rand() < ch;
        let newItem = null;
        if (win) newItem = App.inv.add(tgt.cid, { shiny: tgt.shiny, source: 'upgrade' });
        App.stats.inc('upgradesDone');
        if (win) App.stats.inc('upgradesWon');
        App.eco.addXp(Math.round(sv * 0.02));
        stake.clear();
        update();
        // анимация стрелки
        const arcDeg = ch * 360;
        const m = Math.min(6, arcDeg * 0.1);
        const angle = win ? U.randFloat(m, Math.max(m, arcDeg - m)) : U.randFloat(arcDeg + Math.min(6, (360 - arcDeg) * 0.1), 360 - Math.min(6, (360 - arcDeg) * 0.1));
        const dur = App.anim.dur(4200, 1500);
        rot = rot - (rot % 360) + 360 * (dur ? 5 : 0) + angle;
        const ptr = $('[data-pointer]');
        ptr.style.transition = dur ? `transform ${dur}ms cubic-bezier(.12,.82,.18,1)` : 'none';
        ptr.style.transform = `rotate(${rot}deg)`;
        App.sfx.play('whoosh');
        // тики во время вращения
        let tickT = 0;
        const t0 = performance.now();
        const tickLoop = (now) => {
          if (now - t0 >= dur || !ctx.alive) return;
          const p = (now - t0) / dur;
          const interval = 40 + p * p * 260;
          if (now - tickT > interval) {
            tickT = now;
            App.tick(1100);
          }
          requestAnimationFrame(tickLoop);
        };
        if (dur) requestAnimationFrame(tickLoop);
        await U.sleep(dur + 150);
        busy = false;
        App.setBusy(false);
        if (!ctx.alive) {
          ui.toast(win ? 'Апгрейд удался! 🎉' : 'Апгрейд не удался 😿', win ? 'good' : 'bad');
          return;
        }
        const dial = $('[data-dial]');
        dial.classList.remove('win', 'lose');
        void dial.offsetWidth;
        dial.classList.add(win ? 'win' : 'lose');
        if (win) {
          target = null;
          update();
          ui.dropModal([newItem], { title: 'Апгрейд удался!', firsts: new Set(App.inv.wasFirst(newItem) ? [newItem.uid] : []) });
        } else {
          App.sfx.play('lose');
          App.fx.shake(dial);
          ui.toast(`Не повезло… Шанс был ${U.pct(ch, 1)}`, 'bad', { icon: '😿' });
          update();
        }
        picker.refresh();
      }

      ctx.el.addEventListener('click', (e) => {
        const t = e.target;
        if (t.closest('[data-go]')) return go();
        const mb = t.closest('[data-mult]');
        if (mb) {
          const sv = stakeValue();
          if (sv <= 0) return ui.toast('Сначала выбери ставку', 'info');
          const need = sv * Number(mb.dataset.mult);
          const c = candidates().find((x) => x.v >= need) || candidates().slice(-1)[0];
          if (c) {
            target = { cid: c.cid, shiny: c.shiny };
            App.sfx.play('soft');
            update();
          }
          return;
        }
        const tc = t.closest('[data-targets] .ccard');
        if (tc && !busy) {
          target = { cid: tc.dataset.cid, shiny: tc.dataset.tshiny === '1' };
          App.sfx.play('soft');
          update();
          return;
        }
        const sc = t.closest('[data-stake] .ccard');
        if (sc && !busy) {
          stake.delete(sc.dataset.uid);
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
          renderTargets();
        }
      });
      ctx.el.addEventListener('change', (e) => {
        if (e.target.matches('[data-coins]')) e.target.value = coins;
        if (e.target.matches('[data-tshinytoggle]')) {
          tShiny = e.target.checked;
          renderTargets();
        }
      });
      update();
    },
  });
})();
