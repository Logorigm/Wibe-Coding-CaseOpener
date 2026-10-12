/* Контракты: N персонажей одной редкости → 1 персонаж следующей редкости */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;
  const CFG = GAME_DATA.config;

  // следующая редкость, у которой есть персонажи
  function nextRarity(rid) {
    const r = App.data.getRarity(rid);
    if (!r) return null;
    for (let i = r.index + 1; i < App.data.rarities.length; i++) {
      const nr = App.data.rarities[i];
      if (App.data.byRarity(nr.id).length) return nr;
    }
    return null;
  }

  // возможные результаты с шансами
  function outcomes(nr) {
    const opt = CFG.contracts || {};
    const all = App.data.byRarity(nr.id);
    const fresh = all.filter((c) => !App.inv.discovered(c.id));
    const bias = fresh.length && fresh.length < all.length ? opt.newCharBias || 0 : 0;
    return all.map((c) => {
      const isNew = !App.inv.discovered(c.id);
      const p = (1 - bias) / all.length + (isNew && bias ? bias / fresh.length : 0);
      return { cid: c.id, p, isNew };
    });
  }

  App.router.register('contracts', {
    title: 'Контракты',
    minLevel: () => (CFG.unlocks && CFG.unlocks.contracts) || 1,
    render(ctx) {
      const opt = CFG.contracts || { inputCount: 5, shinyPerInput: 0.1 };
      const N = opt.inputCount || 5;
      const sel = [];
      let busy = false;

      ctx.el.innerHTML = `
        <div class="page-head"><div><h1>Контракты</h1><p class="muted">Обменяй ${N} персонажей одной редкости на 1 персонажа следующей редкости. Новые для тебя персонажи выпадают чаще!</p></div></div>
        <section class="contract panel" data-contract>
          <div class="contract-slots" data-slots></div>
          <div class="contract-arrow">➜</div>
          <div class="contract-out" data-out></div>
        </section>
        <div class="contract-actions"><button class="btn btn-primary btn-xl" data-sign>📜 Подписать контракт</button><button class="btn btn-ghost" data-auto>Заполнить автоматически</button><button class="btn btn-ghost" data-clear>Очистить</button></div>
        <section class="section" data-outcomes></section>
        <section class="section"><div class="section-head"><h2>Выбери персонажей</h2><span class="muted small">Закреплённые не показываются</span></div><div data-picker></div></section>`;

      const $ = (s) => ctx.el.querySelector(s);
      const items = () => sel.map((uid) => App.inv.get(uid)).filter(Boolean);
      const curRarity = () => {
        const it = items()[0];
        return it ? App.data.getChar(it.cid).rarity : null;
      };

      const picker = App.widgets.itemPicker($('[data-picker]'), {
        sort: 'rarity-asc',
        filter: (it) => !it.locked && !!nextRarity(App.data.getChar(it.cid).rarity),
        isSelected: (uid) => sel.includes(uid),
        isDisabled: (it) => sel.length >= N || (curRarity() && App.data.getChar(it.cid).rarity !== curRarity()),
        disabledText: 'Все персонажи в контракте должны быть одной редкости',
        emptyText: 'Нет подходящих персонажей. Мифических нельзя улучшить контрактом.',
        onToggle: (it) => {
          if (busy) return;
          const i = sel.indexOf(it.uid);
          if (i >= 0) sel.splice(i, 1);
          else if (sel.length < N && (!curRarity() || App.data.getChar(it.cid).rarity === curRarity())) sel.push(it.uid);
          update();
        },
      });

      function update() {
        for (let i = sel.length - 1; i >= 0; i--) if (!App.inv.get(sel[i])) sel.splice(i, 1);
        const its = items();
        $('[data-slots]').innerHTML = Array.from({ length: N })
          .map((_, i) => (its[i] ? `<div class="slot filled" data-slot="${esc(its[i].uid)}">${ui.card(its[i], { size: 'sm', showNew: false })}</div>` : '<div class="slot"><span>+</span></div>'))
          .join('');
        const rid = curRarity();
        const nr = rid ? nextRarity(rid) : null;
        const shinyCnt = its.filter((it) => it.shiny).length;
        const shinyP = Math.min(1, shinyCnt * (opt.shinyPerInput || 0));
        $('[data-out]').innerHTML = nr
          ? `<div class="out-card r-${nr.id}"><div class="out-q">?</div><div class="out-r">${esc(nr.name)}</div></div>${shinyP ? `<div class="small">✨ Шанс шайни: ${U.pct(shinyP, 0)}</div>` : ''}`
          : '<div class="out-card"><div class="out-q">?</div><div class="out-r muted">Результат</div></div>';
        const signBtn = $('[data-sign]');
        signBtn.disabled = busy || its.length < N;
        signBtn.innerHTML = its.length < N ? `📜 Добавь ещё ${N - its.length}` : '📜 Подписать контракт';
        if (nr) {
          const outs = outcomes(nr).sort((a, b) => b.p - a.p);
          const inVal = its.reduce((s, it) => s + App.inv.value(it), 0);
          $('[data-outcomes]').innerHTML = `<div class="section-head"><h2>Возможные результаты</h2><span class="muted small">Ставишь: ${ui.cur(inVal)}</span></div>
            <div class="grid-cards sm">${outs.map((o) => ui.card(o.cid, { size: 'sm', chance: o.p, silhouette: o.isNew, badge: o.isNew ? '<span class="cbadge cb-new">НОВАЯ</span>' : '' })).join('')}</div>`;
        } else $('[data-outcomes]').innerHTML = '';
        picker.refresh();
      }

      async function sign() {
        const its = items();
        if (busy || its.length < N) return;
        const rid = curRarity();
        const nr = nextRarity(rid);
        if (!nr) return;
        if (its.some((it) => App.data.getChar(it.cid).rarity !== rid || it.locked)) return ui.toast('Все персонажи должны быть одной редкости и не закреплены', 'bad');
        busy = true;
        App.setBusy(true);
        const outs = outcomes(nr);
        const pick = U.weighted(outs, (o) => o.p);
        const shinyP = Math.min(1, its.filter((it) => it.shiny).length * (opt.shinyPerInput || 0));
        App.inv.remove(its.map((it) => it.uid));
        const item = App.inv.add(pick.cid, { shiny: U.rand() < shinyP, source: 'contract' });
        App.stats.inc('contractsDone');
        App.eco.addXp(20 + nr.index * 15);
        sel.length = 0;
        // анимация слияния
        const box = $('[data-contract]');
        const dur = App.anim.dur(1300, 450);
        if (dur) {
          box.classList.add('merging');
          App.sfx.play('whoosh');
          await U.sleep(dur);
          App.fx.flash(nr.color);
          App.fx.burstAt($('[data-out]'), [nr.color, '#fff'], 50);
        }
        box.classList.remove('merging');
        busy = false;
        App.setBusy(false);
        if (!ctx.alive) return;
        update();
        ui.dropModal([item], { title: 'Контракт исполнен!', firsts: new Set(App.inv.wasFirst(item) ? [item.uid] : []) });
      }

      function autoFill() {
        // берём самую частую редкость среди незакреплённых дубликатов
        const dupUids = new Set(App.inv.duplicates().map((it) => it.uid));
        const pool = App.state.inventory.filter((it) => !it.locked && nextRarity((App.data.getChar(it.cid) || {}).rarity));
        const rid = curRarity();
        const groups = {};
        pool.forEach((it) => {
          const r = App.data.getChar(it.cid).rarity;
          if (rid && r !== rid) return;
          (groups[r] = groups[r] || []).push(it);
        });
        const best = Object.keys(groups)
          .filter((r) => groups[r].length >= N)
          .sort((a, b) => App.data.getRarity(a).index - App.data.getRarity(b).index)[0];
        if (!best) return ui.toast(`Нужно минимум ${N} персонажей одной редкости`, 'info');
        const list = groups[best].sort((a, b) => dupUids.has(b.uid) - dupUids.has(a.uid) || a.shiny - b.shiny || App.inv.value(a) - App.inv.value(b));
        sel.length = 0;
        list.slice(0, N).forEach((it) => sel.push(it.uid));
        App.sfx.play('pop');
        update();
      }

      ctx.el.addEventListener('click', (e) => {
        if (e.target.closest('[data-sign]')) return sign();
        if (e.target.closest('[data-auto]')) return !busy && autoFill();
        if (e.target.closest('[data-clear]')) {
          if (!busy) {
            sel.length = 0;
            update();
          }
          return;
        }
        const s = e.target.closest('[data-slot]');
        if (s && !busy) {
          sel.splice(sel.indexOf(s.dataset.slot), 1);
          update();
          return;
        }
        const oc = e.target.closest('[data-outcomes] .ccard');
        if (oc) ui.showChar(oc.dataset.cid);
      });
      update();
    },
  });
})();
