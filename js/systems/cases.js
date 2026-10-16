/* Логика кейсов: доступность, оплата, выпадение */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const CFG = GAME_DATA.config;

  const C = {
    list: () => App.data.cases.filter((cs) => !cs.hidden),
    get: (id) => App.data.getCase(id),
    isLocked: (cs) => App.state.level < (cs.requiredLevel || 1) && !App.settings.devMode,
    // кейсы, открытые на текущем уровне
    unlocked: () => C.list().filter((cs) => !C.isLocked(cs)),
    cooldownLeft(cs) {
      if (!cs.cooldown) return 0;
      const last = App.state.cooldowns[cs.id] || 0;
      return Math.max(0, last + cs.cooldown * 60000 - Date.now());
    },
    isFree: (cs) => !cs.price,
    xpFor: (cs) => (cs.xp != null ? cs.xp : Math.round(cs.price * CFG.levels.xpPerCoin)),
    cheapestPrice() {
      const prices = C.unlocked().filter((cs) => cs.price > 0).map((cs) => cs.price);
      return prices.length ? Math.min(...prices) : 0;
    },
    maxCount: () => (App.features.unlocked('multi') ? 10 : 1),

    check(cs, count) {
      count = count || 1;
      if (!cs) return { ok: false, reason: 'Кейс не найден' };
      if (!cs.pool.length) return { ok: false, reason: 'Кейс пуст — добавь в него персонажей' };
      if (C.isLocked(cs)) return { ok: false, reason: `Кейс откроется на ${cs.requiredLevel} уровне` };
      if (C.isFree(cs)) {
        if (count !== 1) return { ok: false, reason: 'Бесплатный кейс открывается по одному' };
        const left = C.cooldownLeft(cs);
        if (left > 0) return { ok: false, reason: `Будет доступен через ${U.duration(left)}` };
        return { ok: true, method: 'free' };
      }
      if (count > C.maxCount()) return { ok: false, reason: 'Пока можно открывать по одному кейсу' };
      if (!App.eco.can(cs.price * count)) return { ok: false, reason: 'Недостаточно монет' };
      return { ok: true, method: 'coins' };
    },

    // Чистый бросок без побочных эффектов
    roll(cs) {
      return { cid: U.weighted(cs.pool, (e) => e.w).cid };
    },

    // Открыть: списывает оплату, добавляет персонажей, возвращает результаты
    open(cs, count) {
      count = count || 1;
      const chk = C.check(cs, count);
      if (!chk.ok) {
        App.sfx.play('error');
        App.ui.toast(chk.reason, 'bad');
        return null;
      }
      const st = App.state;
      if (chk.method === 'free') st.cooldowns[cs.id] = Date.now();
      else if (!App.eco.spend(cs.price * count)) return null;
      const results = [];
      for (let i = 0; i < count; i++) {
        const r = C.roll(cs);
        const item = App.inv.add(r.cid, { source: 'case:' + cs.id });
        results.push({ item, ch: App.data.getChar(r.cid), first: App.inv.wasFirst(item) });
        st.history.unshift({ t: Date.now(), cid: r.cid, src: cs.id });
      }
      if (st.history.length > 100) st.history.length = 100;
      App.stats.inc('casesOpened', count);
      App.stats.inc('case_' + cs.id, count);
      App.eco.addXp(C.xpFor(cs) * count);
      App.bus.emit('caseOpened', { cs, results });
      App.store.dirty();
      return results;
    },

    // Лента для рулетки: случайные персонажи + выигрыш на позиции winIndex
    strip(cs, win, len, winIndex) {
      const arr = [];
      for (let i = 0; i < len; i++) arr.push({ cid: U.weighted(cs.pool, (e) => e.w).cid });
      // немного «почти выиграл» рядом с победной позицией
      const rare = cs.pool.filter((e) => App.data.getChar(e.cid).r.index >= 3);
      if (rare.length) {
        [-3, -2, -1, 1, 2, 3].forEach((off) => {
          if (U.rand() < 0.22 && arr[winIndex + off]) arr[winIndex + off] = { cid: U.pick(rare).cid };
        });
      }
      arr[winIndex] = { cid: win.cid };
      return arr;
    },
  };
  App.cases = C;
})();
