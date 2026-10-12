/* Экономика: валюты, опыт, уровни, награды, бусты */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const CFG = GAME_DATA.config;

  const eco = {
    get(cur) {
      return App.state[cur || 'coins'] || 0;
    },
    can(amount, cur) {
      return eco.get(cur) >= Math.round(amount);
    },
    spend(amount, cur, o) {
      cur = cur || 'coins';
      amount = Math.round(amount);
      if (amount <= 0) return true;
      if (!eco.can(amount, cur)) {
        if (!(o && o.silent)) {
          App.sfx.play('error');
          App.ui.toast(App.ui.notEnough(cur), 'bad', { icon: '💸' });
        }
        return false;
      }
      App.state[cur] -= amount;
      App.stats.inc('spent_' + cur, amount);
      App.bus.emit('balance', { cur, delta: -amount });
      App.store.dirty();
      return true;
    },
    add(amount, cur) {
      cur = cur || 'coins';
      amount = Math.round(amount);
      if (!amount) return;
      App.state[cur] = Math.max(0, (App.state[cur] || 0) + amount);
      if (amount > 0) App.stats.inc('earned_' + cur, amount);
      if (cur === 'coins') App.stats.max('maxCoins', App.state.coins);
      App.bus.emit('balance', { cur, delta: amount });
      App.store.dirty();
    },

    /* ---------- уровни ---------- */
    xpNeeded(level) {
      return Math.round(CFG.levels.xpBase * Math.pow(level, CFG.levels.xpPower));
    },
    title(level) {
      const t = (CFG.levels.titles || []).filter((x) => x.level <= level);
      return t.length ? t[t.length - 1].name : '';
    },
    // raw = без множителя бустов (для наград)
    addXp(amount, raw) {
      if (!(amount > 0)) return;
      const st = App.state;
      if (st.level >= CFG.levels.max) return;
      amount = Math.round(amount * (raw ? 1 : App.boosts.xpMult()));
      st.xp += amount;
      const gained = [];
      while (st.level < CFG.levels.max && st.xp >= eco.xpNeeded(st.level)) {
        st.xp -= eco.xpNeeded(st.level);
        st.level += 1;
        gained.push(st.level);
      }
      if (st.level >= CFG.levels.max) st.xp = 0;
      App.bus.emit('xp', { amount });
      App.store.dirty();
      if (gained.length) {
        const total = {};
        gained.forEach((lvl) => {
          let r = {};
          try { r = CFG.levels.reward(lvl) || {}; } catch (e) { console.error(e); }
          mergeReward(total, r);
          (CFG.frames || []).forEach((f) => {
            if (f.level === lvl && !st.owned.frames.includes(f.id)) {
              st.owned.frames.push(f.id);
              App.ui.toast(`Новая рамка аватара: <b>${U.esc(f.name)}</b>`, 'gold', { icon: '🖼️' });
            }
          });
        });
        eco.grant(total, 'level', { silent: true });
        App.stats.set('level', st.level);
        App.bus.emit('levelup', { levels: gained, level: st.level });
        App.ui.levelUp(st.level, total);
      }
    },

    /* ---------- награды ---------- */
    // reward: { coins, gems, dust, xp, tickets: {caseId: n}, characters: ['id' | {id, shiny}] }
    grant(r, source, o) {
      o = o || {};
      if (!r) return [];
      const items = [];
      if (r.coins) eco.add(r.coins, 'coins');
      if (r.gems) eco.add(r.gems, 'gems');
      if (r.dust) eco.add(r.dust, 'dust');
      if (r.tickets) {
        Object.keys(r.tickets).forEach((id) => {
          if (!App.data.getCase(id)) return console.warn('[награда] нет кейса', id);
          App.state.tickets[id] = (App.state.tickets[id] || 0) + Number(r.tickets[id] || 0);
        });
        App.bus.emit('tickets');
      }
      if (r.characters) {
        r.characters.forEach((c) => {
          const id = typeof c === 'string' ? c : c && c.id;
          if (!App.data.getChar(id)) return console.warn('[награда] нет персонажа', id);
          items.push(App.inv.add(id, { shiny: !!(c && c.shiny), source: source || 'reward' }));
        });
      }
      if (r.xp) eco.addXp(r.xp, true);
      App.store.dirty();
      if (!o.silent) {
        App.sfx.play('coin');
        App.ui.toast(`<b>${o.title || 'Награда получена!'}</b><div>${App.ui.reward(r)}</div>`, 'good', { icon: '🎁' });
      }
      if (items.length && o.showItems !== false) {
        App.ui.whenIdle(() => App.ui.dropModal(items, { title: o.itemsTitle || 'Подарок!', firsts: new Set(items.filter((it) => App.inv.wasFirst(it)).map((it) => it.uid)) }));
      }
      return items;
    },
  };

  function mergeReward(into, r) {
    ['coins', 'gems', 'dust', 'xp'].forEach((k) => {
      if (r[k]) into[k] = (into[k] || 0) + r[k];
    });
    if (r.tickets) {
      into.tickets = into.tickets || {};
      Object.keys(r.tickets).forEach((k) => (into.tickets[k] = (into.tickets[k] || 0) + r.tickets[k]));
    }
    if (r.characters) into.characters = (into.characters || []).concat(r.characters);
    return into;
  }
  eco.mergeReward = mergeReward;

  App.eco = eco;

  /* ======================= Бусты ======================= */
  const boosts = {
    defs: () => (CFG.shop && CFG.shop.boosts) || [],
    xpMult() {
      const b = App.state.boosts.xp;
      return b && b.until > Date.now() ? b.mult || 2 : 1;
    },
    xpLeft() {
      const b = App.state.boosts.xp;
      return b && b.until > Date.now() ? b.until - Date.now() : 0;
    },
    luckCharges() {
      const b = App.state.boosts.luck;
      return b ? b.charges || 0 : 0;
    },
    // использовать заряд удачи: вернёт множитель или 0
    useLuck() {
      const b = App.state.boosts.luck;
      if (!b || !(b.charges > 0)) return 0;
      b.charges -= 1;
      App.bus.emit('boosts');
      App.store.dirty();
      return b.mult || 1.5;
    },
    activate(def) {
      const st = App.state;
      if (def.type === 'xp') {
        const cur = st.boosts.xp && st.boosts.xp.until > Date.now() ? st.boosts.xp.until : Date.now();
        st.boosts.xp = { until: cur + def.minutes * 60000, mult: def.mult };
      } else if (def.type === 'luck') {
        const cur = st.boosts.luck ? st.boosts.luck.charges || 0 : 0;
        st.boosts.luck = { charges: cur + def.charges, mult: def.mult };
      }
      App.bus.emit('boosts');
      App.store.dirty();
    },
  };
  App.boosts = boosts;
})();
