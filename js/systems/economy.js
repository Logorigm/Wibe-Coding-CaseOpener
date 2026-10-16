/* Экономика: монеты, опыт, уровни, награды и постепенное открытие разделов */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const CFG = GAME_DATA.config;

  const eco = {
    get: () => App.state.coins || 0,
    can: (amount) => (App.state.coins || 0) >= Math.round(amount),
    // списать монеты; false — если не хватает
    spend(amount, o) {
      amount = Math.round(amount);
      if (amount <= 0) return true;
      if (!eco.can(amount)) {
        if (!(o && o.silent)) {
          App.sfx.play('error');
          App.ui.toast('Недостаточно монет', 'bad');
        }
        return false;
      }
      App.state.coins -= amount;
      App.stats.inc('coinsSpent', amount);
      App.bus.emit('balance', { delta: -amount });
      App.store.dirty();
      return true;
    },
    add(amount) {
      amount = Math.round(amount);
      if (!amount) return;
      App.state.coins = Math.max(0, (App.state.coins || 0) + amount);
      if (amount > 0) App.stats.inc('coinsEarned', amount);
      App.stats.max('maxCoins', App.state.coins);
      App.bus.emit('balance', { delta: amount });
      App.store.dirty();
    },

    /* ---------- уровни ---------- */
    // Опыт до следующего уровня: N открытий «среднего» кейса текущего набора
    xpNeeded(level) {
      const L = CFG.levels;
      const opens = typeof L.opens === 'function' ? L.opens(level) : 20;
      return Math.max(50, Math.round(opens * App.data.tierPrice(level) * L.xpPerCoin));
    },
    // Чем выше уровень, тем крупнее монетные награды (помощь и т.п.)
    scale(level) {
      return Math.max(1, App.data.tierPrice(level || App.state.level) / 100);
    },
    addXp(amount) {
      if (!(amount > 0)) return;
      const st = App.state;
      if (st.level >= CFG.levels.max) return;
      st.xp += Math.round(amount);
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
        let coins = 0;
        gained.forEach((lvl) => {
          try {
            coins += (CFG.levels.reward(lvl, App.data.levelInfo(lvl)) || {}).coins || 0;
          } catch (e) {
            console.error(e);
          }
        });
        if (coins) eco.add(coins);
        App.stats.set('level', st.level);
        const features = App.features.list().filter((f) => gained.includes(f.level));
        App.bus.emit('levelup', { levels: gained, level: st.level, features });
        App.ui.levelUp(st.level, { coins }, gained, features);
      }
    },

    /* ---------- награды ---------- */
    // reward: { coins, xp, characters: ['id'] }
    grant(r, o) {
      o = o || {};
      if (!r) return [];
      if (r.coins) eco.add(r.coins);
      const items = [];
      (r.characters || []).forEach((id) => {
        if (App.data.getChar(id)) items.push(App.inv.add(id, { source: 'reward' }));
      });
      if (r.xp) eco.addXp(r.xp);
      App.store.dirty();
      if (!o.silent) {
        App.sfx.play('coin');
        App.ui.toast(`<b>${o.title || 'Награда'}</b>${r.coins ? ` <span class="nowrap">${App.ui.cur(r.coins, { sign: true })}</span>` : ''}`, o.type || 'good');
      }
      return items;
    },

    /* ---------- помощь, если монеты кончились ---------- */
    bankrupt() {
      const cheapest = App.cases.cheapestPrice();
      const bk = CFG.bankrupt || {};
      if (!cheapest || App.state.coins >= cheapest || App.inv.totalValue() >= cheapest) return null;
      const last = App.state.limits.bankrupt || 0;
      const left = last + (bk.cooldownMinutes || 10) * 60000 - Date.now();
      return { amount: Math.round(cheapest * (bk.cases || 5)), left: Math.max(0, left) };
    },
    claimBankrupt() {
      const b = eco.bankrupt();
      if (!b || b.left > 0) return false;
      App.state.limits.bankrupt = Date.now();
      eco.grant({ coins: b.amount }, { title: 'Помощь получена' });
      return true;
    },
  };
  App.eco = eco;

  /* ======================= Разделы, которые открываются с уровнем ======================= */
  App.features = {
    list: () => CFG.features || [],
    get: (id) => (CFG.features || []).find((f) => f.id === id) || null,
    level(id) {
      const f = App.features.get(id);
      return f ? f.level : 1;
    },
    unlocked(id) {
      if (App.settings.devMode) return true;
      return App.state.level >= App.features.level(id);
    },
    // раздел открыт, но игрок туда ещё не заходил — показываем точку «новое»
    isNew(id) {
      const f = App.features.get(id);
      return !!f && f.level > 1 && App.features.unlocked(id) && !App.state.seenFeatures[id];
    },
    markSeen(id) {
      if (App.state.seenFeatures[id] || !App.features.get(id)) return;
      App.state.seenFeatures[id] = Date.now();
      App.store.dirty();
      App.bus.emit('features');
    },
  };
})();
