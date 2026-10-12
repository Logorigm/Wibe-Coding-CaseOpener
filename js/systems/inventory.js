/* Инвентарь, коллекция, крафт, профиль */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const firstCopies = new WeakSet();
  let index = null; // uid -> item

  function rebuildIndex() {
    index = new Map();
    App.state.inventory.forEach((it) => index.set(it.uid, it));
  }
  function changed() {
    index = null;
    App.bus.emit('inventory');
    App.store.dirty();
  }

  const inv = {
    items: () => App.state.inventory,
    get(uid) {
      if (!index) rebuildIndex();
      return index.get(uid) || null;
    },
    value: (it) => App.data.value(it.cid, it.shiny),
    totalValue: () => App.state.inventory.reduce((s, it) => s + inv.value(it), 0),
    countOf: (cid) => App.state.inventory.reduce((n, it) => n + (it.cid === cid ? 1 : 0), 0),
    discovered: (cid) => !!(App.state.collection[cid] && App.state.collection[cid].n > 0),
    uniqueCount: () => App.data.chars.reduce((n, c) => n + (inv.discovered(c.id) ? 1 : 0), 0),
    wasFirst: (it) => firstCopies.has(it),
    newCount: () => App.state.inventory.reduce((n, it) => n + (it.isNew ? 1 : 0), 0),

    add(cid, o) {
      o = o || {};
      const st = App.state;
      const ch = App.data.getChar(cid);
      st.serial = (st.serial || 0) + 1;
      const item = { uid: U.uid('i'), cid, shiny: !!o.shiny, n: st.serial, t: Date.now(), src: o.source || '', isNew: true, locked: false };
      st.inventory.push(item);
      if (index) index.set(item.uid, item);
      const col = st.collection[cid] || (st.collection[cid] = { n: 0, shiny: 0, first: Date.now() });
      if (col.n === 0) firstCopies.add(item);
      col.n += 1;
      if (item.shiny) col.shiny = (col.shiny || 0) + 1;
      App.stats.inc('itemsObtained');
      if (ch) {
        App.stats.inc('rarity_' + ch.rarity);
        if (ch.r.index >= 2) App.stats.inc('rareOrBetter');
        const v = inv.value(item);
        const best = st.stats.bestDrop;
        if (!best || v > best.value) st.stats.bestDrop = { cid, shiny: item.shiny, value: v, t: item.t };
      }
      if (item.shiny) App.stats.inc('shinyObtained');
      App.stats.touch('uniqueCharacters');
      App.bus.emit('inventory');
      App.store.dirty();
      return item;
    },

    // принудительно убрать (апгрейд, контракт)
    remove(uids) {
      const set = new Set(uids);
      const before = App.state.inventory.length;
      App.state.inventory = App.state.inventory.filter((it) => !set.has(it.uid));
      App.profile.cleanShowcase();
      if (App.state.inventory.length !== before) changed();
    },

    sell(uids) {
      const set = new Set(uids);
      let total = 0;
      let n = 0;
      App.state.inventory = App.state.inventory.filter((it) => {
        if (set.has(it.uid) && !it.locked) {
          total += inv.value(it);
          n++;
          return false;
        }
        return true;
      });
      if (n) {
        App.eco.add(total, 'coins');
        App.stats.inc('itemsSold', n);
        App.stats.inc('coinsFromSales', total);
        App.profile.cleanShowcase();
        App.sfx.play('coin');
        changed();
      }
      return { n, total };
    },

    // продажа с подтверждением для дорогих персонажей
    async sellSafe(uids) {
      const items = uids.map(inv.get).filter((it) => it && !it.locked);
      if (!items.length) {
        App.ui.toast('Нечего продавать (закреплённые персонажи не продаются)', 'info');
        return { n: 0, total: 0 };
      }
      const thr = Number(App.settings.confirmSell) || 0;
      const total = items.reduce((s, it) => s + inv.value(it), 0);
      const pricey = thr > 0 ? items.filter((it) => inv.value(it) >= thr) : [];
      if (pricey.length) {
        const names = pricey.slice(0, 4).map((it) => U.esc((App.data.getChar(it.cid) || {}).name || '?')).join(', ');
        const ok = await App.ui.confirm(
          `Продать ${items.length} ${U.plural(items.length, ['персонажа', 'персонажей', 'персонажей'])} за ${App.ui.cur(total)}?<br><span class="muted small">Среди них дорогие: ${names}${pricey.length > 4 ? '…' : ''}</span>`,
          { ok: 'Продать', title: 'Продажа' }
        );
        if (!ok) return { n: 0, total: 0 };
      }
      return inv.sell(items.map((it) => it.uid));
    },

    disenchant(uids) {
      const set = new Set(uids);
      let total = 0;
      let n = 0;
      App.state.inventory = App.state.inventory.filter((it) => {
        if (set.has(it.uid) && !it.locked) {
          total += App.data.dust(it.cid, it.shiny);
          n++;
          return false;
        }
        return true;
      });
      if (n) {
        App.eco.add(total, 'dust');
        App.stats.inc('itemsDusted', n);
        App.profile.cleanShowcase();
        App.sfx.play('gem');
        changed();
      }
      return { n, total };
    },

    craft(cid) {
      const ch = App.data.getChar(cid);
      if (!ch) return null;
      const cost = App.data.craftCost(cid);
      if (!App.eco.spend(cost, 'dust')) return null;
      const item = inv.add(cid, { source: 'craft' });
      App.stats.inc('crafted');
      App.ui.dropModal([item], { title: 'Создано из звёздной пыли!', firsts: new Set(inv.wasFirst(item) ? [item.uid] : []) });
      return item;
    },

    toggleLock(uid) {
      const it = inv.get(uid);
      if (!it) return;
      it.locked = !it.locked;
      changed();
    },

    markSeen() {
      let any = false;
      App.state.inventory.forEach((it) => {
        if (it.isNew) {
          it.isNew = false;
          any = true;
        }
      });
      if (any) changed();
    },

    // дубликаты: оставляем по одному (приоритет — закреплённые, шайни, старые)
    duplicates() {
      const keep = new Map();
      const sorted = App.state.inventory.slice().sort((a, b) => (b.locked - a.locked) || (b.shiny - a.shiny) || a.t - b.t);
      const dups = [];
      sorted.forEach((it) => {
        if (!keep.has(it.cid)) keep.set(it.cid, it);
        else if (!it.locked) dups.push(it);
      });
      return dups;
    },
  };
  App.inv = inv;

  /* ======================= Награды за коллекции кейсов ======================= */
  App.collection = {
    caseProgress(cs) {
      const total = cs.pool.length;
      const have = cs.pool.reduce((n, e) => n + (inv.discovered(e.cid) ? 1 : 0), 0);
      return { have, total, pct: total ? have / total : 0, done: total > 0 && have === total };
    },
    reward(cs) {
      if (cs.collectionReward) return cs.collectionReward;
      if (cs.currency === 'gems') return { gems: Math.max(5, cs.price * 3) };
      return { coins: Math.max(500, cs.price * 8) };
    },
    claimed: (cs) => !!App.state.collectionClaims[cs.id],
    claimable() {
      return App.data.cases.filter((cs) => !App.collection.claimed(cs) && App.collection.caseProgress(cs).done);
    },
    claim(cs) {
      if (App.collection.claimed(cs) || !App.collection.caseProgress(cs).done) return;
      App.state.collectionClaims[cs.id] = Date.now();
      App.eco.grant(App.collection.reward(cs), 'collection', { title: `Коллекция «${U.esc(cs.name)}» собрана!` });
      App.fx.confetti();
      App.bus.emit('badges');
    },
  };

  /* ======================= Профиль ======================= */
  App.profile = {
    maxShowcase: 6,
    cleanShowcase() {
      const p = App.state.profile;
      const before = p.showcase.length;
      p.showcase = p.showcase.filter((uid) => inv.get(uid));
      if (p.showcase.length !== before) App.bus.emit('profile');
    },
    toggleShowcase(uid) {
      const p = App.state.profile;
      const i = p.showcase.indexOf(uid);
      if (i >= 0) p.showcase.splice(i, 1);
      else {
        if (p.showcase.length >= App.profile.maxShowcase) {
          App.ui.toast(`На витрине максимум ${App.profile.maxShowcase} персонажей`, 'bad');
          return;
        }
        p.showcase.push(uid);
        App.ui.toast('Добавлено на витрину профиля', 'good');
      }
      App.store.dirty();
      App.bus.emit('profile');
    },
    avatarSrc() {
      const cid = App.state.profile.avatar;
      const ch = cid && App.data.getChar(cid);
      return ch ? App.art.portrait(ch) : null;
    },
    avatarHtml(cls) {
      const p = App.state.profile;
      const src = App.profile.avatarSrc();
      const inner = src
        ? `<img src="${U.esc(src)}" data-cid="${U.esc(p.avatar)}" alt="">`
        : `<span class="avatar-letter">${U.esc((p.name || '?').trim().charAt(0).toUpperCase() || '?')}</span>`;
      return `<span class="avatar frame-${U.esc(p.frame || 'none')} ${cls || ''}">${inner}</span>`;
    },
    frameUnlocked(f) {
      const st = App.state;
      if (st.owned.frames.includes(f.id)) return true;
      if (!f.price && !f.level && !f.achievement) return true;
      if (f.level && st.level >= f.level) return true;
      if (f.achievement && st.achievements[f.achievement]) return true;
      return false;
    },
  };
})();
