/* Статистика и достижения (награда выдаётся сразу) */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;

  /* ======================= Статистика ======================= */
  const computed = {
    level: () => App.state.level,
    uniqueCharacters: () => App.inv.uniqueCount(),
    collectionPercent: () => Math.floor(App.collection.total().pct),
    casesCompleted: () => App.collection.completedCount(),
    coins: () => App.state.coins,
  };
  let checkTimer = null;
  function scheduleCheck() {
    App.store.dirty();
    if (checkTimer) return;
    checkTimer = setTimeout(() => {
      checkTimer = null;
      App.ach.check();
      App.bus.emit('stats');
    }, 150);
  }

  App.stats = {
    get(key) {
      if (computed[key]) return computed[key]();
      return Number(App.state.stats[key]) || 0;
    },
    inc(key, n) {
      const s = App.state.stats;
      s[key] = (Number(s[key]) || 0) + (n == null ? 1 : n);
      scheduleCheck();
    },
    max(key, v) {
      const s = App.state.stats;
      if (v > (Number(s[key]) || 0)) {
        s[key] = v;
        scheduleCheck();
      }
    },
    set(key, v) {
      App.state.stats[key] = v;
      scheduleCheck();
    },
    touch() {
      scheduleCheck();
    },
  };

  /* ======================= Достижения ======================= */
  const RW = () => GAME_DATA.achievementRewards || {};
  App.ach = {
    // все достижения; у каждого: rarity (объект редкости), reward
    defs: () =>
      (GAME_DATA.achievements || []).map((d) => {
        const r = App.data.getRarity(d.rarity) || App.data.rarities[0];
        return Object.assign({}, d, { r, reward: d.reward || { coins: RW()[r.id] || 100 } });
      }),
    // видимые: без тех, чей раздел ещё не открыт
    visible: () => App.ach.defs().filter((d) => !d.feature || App.features.unlocked(d.feature) || App.state.achievements[d.id]),
    done: (id) => !!App.state.achievements[id],
    progress: (def) => Math.min(def.goal, App.stats.get(def.stat)),
    check() {
      if (!App.state) return;
      App.ach.defs().forEach((def) => {
        if (App.state.achievements[def.id]) return;
        if (def.feature && !App.features.unlocked(def.feature)) return;
        if (App.stats.get(def.stat) < def.goal) return;
        App.state.achievements[def.id] = Date.now();
        if (def.reward.coins) App.eco.add(def.reward.coins);
        App.store.dirty();
        App.ui.whenIdle(() => {
          App.sfx.play('achieve');
          App.ui.toast(
            `<div class="ach-toast r-${def.r.id}"><small>Достижение · ${U.esc(def.r.ach || def.r.name)}</small><b>${U.esc(def.name)}</b>${def.reward.coins ? App.ui.cur(def.reward.coins, { sign: true }) : ''}</div>`,
            'ach',
            { timeout: 4500, cls: 'r-' + def.r.id, onClick: () => App.features.unlocked('profile') && App.router.go('profile') }
          );
          App.bus.emit('achievements');
        });
      });
    },
  };
})();
