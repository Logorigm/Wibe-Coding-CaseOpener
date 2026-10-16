/* Инвентарь и коллекция */
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
    value: (it) => App.data.value(it.cid),
    totalValue: () => App.state.inventory.reduce((s, it) => s + inv.value(it), 0),
    countOf: (cid) => App.state.inventory.reduce((n, it) => n + (it.cid === cid ? 1 : 0), 0),
    // «хоть раз выбит» — остаётся в коллекции, даже если персонажа продали
    discovered: (cid) => !!(App.state.collection[cid] && App.state.collection[cid].n > 0),
    uniqueCount: () => App.data.chars.reduce((n, c) => n + (inv.discovered(c.id) ? 1 : 0), 0),
    wasFirst: (it) => firstCopies.has(it),
    newCount: () => App.state.inventory.reduce((n, it) => n + (it.isNew ? 1 : 0), 0),

    add(cid, o) {
      o = o || {};
      const st = App.state;
      const ch = App.data.getChar(cid);
      st.serial = (st.serial || 0) + 1;
      const item = { uid: U.uid('i'), cid, n: st.serial, t: Date.now(), src: o.source || '', isNew: true };
      st.inventory.push(item);
      if (index) index.set(item.uid, item);
      const col = st.collection[cid] || (st.collection[cid] = { n: 0, first: Date.now() });
      const first = col.n === 0;
      if (first) firstCopies.add(item);
      col.n += 1;
      App.stats.inc('itemsObtained');
      if (ch) {
        App.stats.inc('rarity_' + ch.rarity);
        const v = inv.value(item);
        App.stats.max('bestDropValue', v);
        const best = st.stats.bestDrop;
        if (!best || v > best.value) st.stats.bestDrop = { cid, value: v, t: item.t };
      }
      App.stats.touch();
      App.bus.emit('inventory');
      App.store.dirty();
      if (first) App.collection.check();
      return item;
    },

    // убрать без продажи (апгрейд)
    remove(uids) {
      const set = new Set(uids);
      const before = App.state.inventory.length;
      App.state.inventory = App.state.inventory.filter((it) => !set.has(it.uid));
      if (App.state.inventory.length !== before) changed();
    },

    sell(uids) {
      const set = new Set(uids);
      let total = 0;
      let n = 0;
      App.state.inventory = App.state.inventory.filter((it) => {
        if (!set.has(it.uid)) return true;
        total += inv.value(it);
        n++;
        return false;
      });
      if (n) {
        App.eco.add(total);
        App.stats.inc('itemsSold', n);
        App.sfx.play('coin');
        changed();
      }
      return { n, total };
    },

    // продажа с подтверждением, если продаём много или что-то редкое (эпическое и выше)
    async sellSafe(uids, o) {
      o = o || {};
      const items = uids.map(inv.get).filter(Boolean);
      if (!items.length) return { n: 0, total: 0 };
      const total = items.reduce((s, it) => s + inv.value(it), 0);
      const rare = items.filter((it) => {
        const ch = App.data.getChar(it.cid);
        return ch && ch.r.index >= 3;
      });
      if (!o.noConfirm && (rare.length || items.length > 10)) {
        const names = rare.slice(0, 3).map((it) => U.esc(App.data.getChar(it.cid).name)).join(', ');
        const ok = await App.ui.confirm(
          `Продать ${items.length} ${U.plural(items.length, ['персонажа', 'персонажей', 'персонажей'])} за ${App.ui.cur(total)}?${rare.length ? `<div class="muted small">Среди них редкие: ${names}${rare.length > 3 ? '…' : ''}</div>` : ''}`,
          { ok: 'Продать', title: 'Продажа' }
        );
        if (!ok) return { n: 0, total: 0 };
      }
      return inv.sell(items.map((it) => it.uid));
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

    // лишние копии: оставляем по одной (самую старую)
    duplicates() {
      const keep = new Set();
      const dups = [];
      App.state.inventory
        .slice()
        .sort((a, b) => a.t - b.t)
        .forEach((it) => {
          if (!keep.has(it.cid)) keep.add(it.cid);
          else dups.push(it);
        });
      return dups;
    },
  };
  App.inv = inv;

  /* ======================= Коллекция: награды выдаются сразу ======================= */
  // наборы коллекции: видимые кейсы со своими персонажами (бесплатный подарок не считается)
  const collectable = (cs) => !cs.hidden && !cs.cooldown && cs.pool.length > 0;

  App.collection = {
    collectable,
    caseProgress(cs) {
      const total = cs.pool.length;
      const have = cs.pool.reduce((n, e) => n + (inv.discovered(e.cid) ? 1 : 0), 0);
      return { have, total, pct: total ? have / total : 0, done: total > 0 && have === total };
    },
    // награда за полный набор кейса: своя (collectionReward) или 15 цен кейса
    reward(cs) {
      if (cs.collectionReward) return cs.collectionReward;
      const base = cs.price > 0 ? cs.price : App.data.tierPrice(1);
      const coins = base * 15;
      return { coins: coins >= 1000 ? Math.round(coins / 100) * 100 : Math.round(coins / 10) * 10 };
    },
    claimed: (cs) => !!App.state.collectionClaims[cs.id],
    // все, кого можно выбить из кейсов
    total() {
      const all = App.data.chars.filter((c) => c.inCases.length);
      const have = all.filter((c) => inv.discovered(c.id)).length;
      return { have, total: all.length, pct: all.length ? (have / all.length) * 100 : 0 };
    },
    completedCount: () => App.data.cases.filter((cs) => collectable(cs) && App.collection.caseProgress(cs).done).length,
    milestones() {
      const list = (GAME_DATA.config.collection && GAME_DATA.config.collection.milestones) || [];
      const pct = App.collection.total().pct;
      const got = App.state.collectionMilestones || {};
      return list.map((m) => ({ pct: m.pct, reward: m.reward, done: pct >= m.pct - 1e-9, claimed: !!got[m.pct] }));
    },
    nextMilestone: () => App.collection.milestones().find((m) => !m.claimed) || null,
    // проверить новые награды (вызывается, когда выбит новый персонаж)
    check() {
      if (!App.features.unlocked('collection')) return;
      App.data.cases.forEach((cs) => {
        if (!collectable(cs) || App.collection.claimed(cs) || !App.collection.caseProgress(cs).done) return;
        App.state.collectionClaims[cs.id] = Date.now();
        App.eco.grant(App.collection.reward(cs), { title: `Коллекция «${U.esc(cs.name)}» собрана`, type: 'gold' });
      });
      App.collection.milestones().forEach((m) => {
        if (!m.done || m.claimed) return;
        App.state.collectionMilestones[m.pct] = Date.now();
        App.eco.grant(m.reward, { title: `Собрано ${m.pct}% коллекции`, type: 'gold' });
      });
      App.store.dirty();
    },
  };
})();
