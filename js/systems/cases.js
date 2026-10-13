/* Логика кейсов: проверка, оплата, выпадение, гарант, удача */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const CFG = GAME_DATA.config;

  const C = {
    list() {
      return App.data.cases.filter((cs) => !cs.hidden);
    },
    get: (id) => App.data.getCase(id),
    isLocked(cs) {
      return App.state.level < (cs.requiredLevel || 1) && !App.settings.devMode;
    },
    availability(cs) {
      const today = U.todayKey();
      if (cs.availableFrom && today < cs.availableFrom) return { ok: false, reason: `Кейс станет доступен ${cs.availableFrom}` };
      if (cs.availableUntil && today > cs.availableUntil) return { ok: false, reason: 'Ивент закончился — кейс больше недоступен' };
      return { ok: true };
    },
    cooldownLeft(cs) {
      if (!cs.cooldown) return 0;
      const last = App.state.cooldowns[cs.id] || 0;
      return Math.max(0, last + cs.cooldown * 60000 - Date.now());
    },
    tickets: (cs) => App.state.tickets[cs.id] || 0,
    isFree: (cs) => !cs.price,
    xpFor(cs) {
      if (cs.xp != null) return cs.xp;
      return Math.max(5, Math.round(App.data.priceInCoins(cs) * CFG.levels.xpPerCoin));
    },
    cheapestPrice() {
      const prices = C.list().filter((cs) => cs.price > 0 && cs.currency === 'coins' && !C.isLocked(cs)).map((cs) => cs.price);
      return prices.length ? Math.min(...prices) : 0;
    },

    check(cs, count, o) {
      o = o || {};
      count = count || 1;
      if (!cs) return { ok: false, reason: 'Кейс не найден' };
      if (!cs.pool.length) return { ok: false, reason: 'Кейс пуст — добавь в него персонажей' };
      if (C.isLocked(cs)) return { ok: false, reason: `Кейс откроется на ${cs.requiredLevel} уровне` };
      const av = C.availability(cs);
      if (!av.ok) return av;
      if (C.isFree(cs)) {
        if (cs.cooldown) {
          if (count !== 1) return { ok: false, reason: 'Бесплатный кейс открывается по одному' };
          const left = C.cooldownLeft(cs);
          if (left > 0) return { ok: false, reason: `Будет доступен через ${U.duration(left)}` };
        }
        return { ok: true, method: 'free' };
      }
      if (o.useTickets) {
        if (C.tickets(cs) >= count) return { ok: true, method: 'ticket' };
        return { ok: false, reason: 'Не хватает билетов' };
      }
      if (!App.eco.can(cs.price * count, cs.currency)) return { ok: false, reason: App.ui.notEnough(cs.currency) };
      return { ok: true, method: 'currency' };
    },

    // Чистый бросок без побочных эффектов
    roll(cs, o) {
      o = o || {};
      let pool = cs.pool;
      if (o.minTier != null) {
        const f = pool.filter((e) => App.data.getChar(e.cid).r.index >= o.minTier);
        if (f.length) pool = f;
      }
      const luckTier = App.data.getRarity('epic') ? App.data.getRarity('epic').index : 3;
      const getW = o.luck ? (e) => (App.data.getChar(e.cid).r.index >= luckTier ? e.w * o.luck : e.w) : (e) => e.w;
      const e = U.weighted(pool, getW);
      const sh = App.data.shinyChance(cs) * (o.luck ? 1.5 : 1);
      return { cid: e.cid, shiny: U.rand() < sh };
    },

    // Открыть: списывает оплату, добавляет предметы, возвращает результаты
    open(cs, count, o) {
      o = o || {};
      count = count || 1;
      const chk = C.check(cs, count, o);
      if (!chk.ok) {
        App.sfx.play('error');
        App.ui.toast(chk.reason, 'bad');
        return null;
      }
      const st = App.state;
      if (chk.method === 'ticket') {
        st.tickets[cs.id] -= count;
        App.bus.emit('tickets');
      } else if (chk.method === 'free') {
        if (cs.cooldown) st.cooldowns[cs.id] = Date.now();
      } else if (!App.eco.spend(cs.price * count, cs.currency)) return null;

      const pityTier = cs.pity ? App.data.getRarity(cs.pity.rarity).index : null;
      const results = [];
      for (let i = 0; i < count; i++) {
        let minTier = null;
        if (cs.pity && (st.pity[cs.id] || 0) + 1 >= cs.pity.count) minTier = pityTier;
        const luck = App.boosts.useLuck(cs);
        const r = C.roll(cs, { minTier, luck });
        const ch = App.data.getChar(r.cid);
        if (cs.pity) st.pity[cs.id] = ch.r.index >= pityTier ? 0 : (st.pity[cs.id] || 0) + 1;
        const item = App.inv.add(r.cid, { shiny: r.shiny, source: 'case:' + cs.id });
        results.push({ item, ch, first: App.inv.wasFirst(item), pity: minTier != null });
        st.history.unshift({ t: Date.now(), cid: r.cid, shiny: r.shiny, src: cs.id });
      }
      if (st.history.length > 100) st.history.length = 100;
      App.stats.inc('casesOpened', count);
      App.stats.inc('case_' + cs.id, count);
      if (chk.method === 'currency') App.stats.inc('spentOnCases', App.data.priceInCoins(cs) * count);
      App.eco.addXp(C.xpFor(cs) * count);
      App.bus.emit('caseOpened', { cs, results });
      App.store.dirty();
      return results;
    },

    // Лента для рулетки: случайные персонажи + выигрыш на позиции winIndex
    strip(cs, win, len, winIndex) {
      const arr = [];
      for (let i = 0; i < len; i++) arr.push({ cid: U.weighted(cs.pool, (e) => e.w).cid, shiny: false });
      // немного «почти выиграл» рядом с победной позицией
      const rare = cs.pool.filter((e) => App.data.getChar(e.cid).r.index >= 3);
      if (rare.length) {
        [-3, -2, -1, 1, 2, 3].forEach((off) => {
          if (U.rand() < 0.22 && arr[winIndex + off]) arr[winIndex + off] = { cid: U.pick(rare).cid, shiny: false };
        });
      }
      arr[winIndex] = { cid: win.cid, shiny: !!win.shiny };
      return arr;
    },
  };
  App.cases = C;
})();
