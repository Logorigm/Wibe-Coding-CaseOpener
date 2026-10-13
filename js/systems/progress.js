/* Статистика, достижения, ежедневные задания, ежедневная награда */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const CFG = GAME_DATA.config;

  // Включена ли мини-игра (config.games.enabled)
  App.gameEnabled = (id) => {
    const en = CFG.games && CFG.games.enabled;
    return !Array.isArray(en) || en.includes(id);
  };

  /* ======================= Статистика ======================= */
  const computed = {
    level: () => App.state.level,
    uniqueCharacters: () => App.inv.uniqueCount(),
    collectionPercent: () => Math.floor(App.collection.total().pct),
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
      App.bus.emit('badges');
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
  App.ach = {
    defs: () => (GAME_DATA.achievements || []).filter((d) => !d.game || App.gameEnabled(d.game)),
    progress(def) {
      return Math.min(def.goal, App.stats.get(def.stat));
    },
    state(def) {
      return App.state.achievements[def.id] || null;
    },
    check() {
      const fresh = [];
      App.ach.defs().forEach((def) => {
        if (App.state.achievements[def.id]) return;
        if (App.stats.get(def.stat) >= def.goal) {
          App.state.achievements[def.id] = { done: Date.now(), claimed: false };
          fresh.push(def);
          // рамки за достижения
          (CFG.frames || []).forEach((f) => {
            if (f.achievement === def.id && !App.state.owned.frames.includes(f.id)) App.state.owned.frames.push(f.id);
          });
        }
      });
      if (!fresh.length) return;
      App.sfx.play('achieve');
      const open = () => App.router.go('quests/achievements');
      if (fresh.length <= 2) {
        fresh.forEach((def) =>
          App.ui.toast(`<b>Достижение: ${U.esc(def.name)}</b><div class="small">Забери награду в «Заданиях»</div>`, 'gold', { icon: def.icon || '🏆', timeout: 5000, onClick: open })
        );
      } else {
        App.ui.toast(
          `<b>Новые достижения: ${fresh.length}</b><div class="small">${fresh.map((d) => U.esc(d.name)).join(', ')}</div>`,
          'gold',
          { icon: '🏆', timeout: 6000, onClick: open }
        );
      }
      App.store.dirty();
      App.bus.emit('badges');
    },
    claim(id) {
      const def = App.ach.defs().find((d) => d.id === id);
      const s = App.state.achievements[id];
      if (!def || !s || s.claimed) return;
      s.claimed = true;
      App.eco.grant(def.reward, 'achievement', { title: `${def.icon || '🏆'} ${U.esc(def.name)}` });
      App.bus.emit('badges');
    },
    claimable() {
      return App.ach.defs().filter((d) => {
        const s = App.state.achievements[d.id];
        return s && !s.claimed;
      }).length;
    },
  };

  /* ======================= Ежедневные задания ======================= */
  App.quests = {
    cfg: () => GAME_DATA.quests || { perDay: 0, pool: [] },
    ensure() {
      const today = U.todayKey();
      const st = App.state;
      if (st.quests && st.quests.date === today) return;
      const cfg = App.quests.cfg();
      const rng = U.seeded(today + ':' + st.createdAt);
      const pool = (cfg.pool || []).filter((q) => (!q.minLevel || st.level >= q.minLevel) && (!q.game || App.gameEnabled(q.game)));
      const picked = U.shuffle(pool, rng).slice(0, cfg.perDay || 3);
      st.quests = {
        date: today,
        bonusClaimed: false,
        list: picked.map((q) => {
          const gi = Math.floor(rng() * q.goals.length);
          return { id: q.id, g: gi, base: App.stats.get(q.stat), claimed: false };
        }),
      };
      App.store.dirty();
    },
    list() {
      App.quests.ensure();
      const cfg = App.quests.cfg();
      return App.state.quests.list
        .map((q, i) => {
          const def = (cfg.pool || []).find((d) => d.id === q.id);
          if (!def) return null;
          const goal = def.goals[Math.min(q.g, def.goals.length - 1)];
          const progress = Math.max(0, Math.min(goal.n, App.stats.get(def.stat) - q.base));
          return {
            index: i, def, goal, progress,
            reward: App.eco.scaled(goal.reward),
            done: progress >= goal.n,
            claimed: q.claimed,
            text: def.text.replace('{n}', U.fmt(goal.n)),
          };
        })
        .filter(Boolean);
    },
    claim(i) {
      const q = App.quests.list().find((x) => x.index === i);
      if (!q || !q.done || q.claimed) return;
      App.state.quests.list[i].claimed = true;
      App.stats.inc('questsDone');
      App.eco.grant(q.reward, 'quest', { title: 'Задание выполнено!' });
      App.bus.emit('badges');
    },
    allDone() {
      const l = App.quests.list();
      return l.length > 0 && l.every((q) => q.claimed);
    },
    claimBonus() {
      if (!App.quests.allDone() || App.state.quests.bonusClaimed) return;
      App.state.quests.bonusClaimed = true;
      App.eco.grant(App.eco.scaled(App.quests.cfg().bonus), 'quest', { title: 'Все задания дня выполнены!' });
      App.fx.confetti();
      App.bus.emit('badges');
    },
    claimable() {
      const l = App.quests.list();
      let n = l.filter((q) => q.done && !q.claimed).length;
      if (App.quests.allDone() && !App.state.quests.bonusClaimed) n++;
      return n;
    },
  };

  /* ======================= Ежедневная награда ======================= */
  App.daily = {
    rewards: () => (CFG.dailyRewards || []).map((r) => App.eco.scaled(r)),
    info() {
      const d = App.state.daily;
      const today = U.todayKey();
      const claimedToday = d.last === today;
      let streak = d.streak || 0;
      if (!claimedToday && d.last && U.dayDiff(d.last, today) > 1) streak = 0;
      const len = App.daily.rewards().length || 1;
      const dayIndex = claimedToday ? (streak - 1) % len : streak % len;
      return { claimedToday, streak, dayIndex, rewards: App.daily.rewards() };
    },
    claim() {
      const info = App.daily.info();
      if (info.claimedToday || !info.rewards.length) return;
      const d = App.state.daily;
      d.streak = info.streak + 1;
      d.last = U.todayKey();
      App.stats.max('dailyStreakMax', d.streak);
      App.eco.grant(info.rewards[info.dayIndex], 'daily', { title: `Награда за ${info.dayIndex + 1}-й день!` });
      App.bus.emit('badges');
    },
  };

  /* ======================= Значки на меню ======================= */
  App.badges = {
    quests: () => App.ach.claimable() + App.quests.claimable() + (App.daily.info().claimedToday ? 0 : 1),
    inventory: () => App.inv.newCount(),
    collection: () => App.collection.claimableCount(),
  };
})();
