/* Мини-игра «Колесо удачи»: ставки с тремя уровнями риска + бесплатное колесо раз в день */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;
  const CFG = GAME_DATA.config;

  const MULT_COLORS = [
    [0, '#2a2540'],
    [1.2, '#3b82f6'],
    [1.5, '#22c55e'],
    [2, '#a855f7'],
    [3, '#ec4899'],
    [4, '#f97316'],
    [5, '#f97316'],
    [10, '#facc15'],
    [20, '#fde047'],
  ];
  const colorFor = (m) => {
    let c = MULT_COLORS[0][1];
    MULT_COLORS.forEach(([v, col]) => {
      if (m >= v) c = col;
    });
    return c;
  };
  const PRIZE_COLORS = ['#ff4fa3', '#8b5cf6', '#22d3ee', '#f59e0b', '#34d399', '#f43f5e', '#6366f1', '#ec4899', '#facc15'];

  // segments: [{ label, color, weight }]
  function wheelSvg(segments) {
    const total = segments.reduce((s, x) => s + x.weight, 0);
    let a0 = 0;
    const R = 150;
    let paths = '';
    let labels = '';
    segments.forEach((s, i) => {
      const a1 = a0 + (s.weight / total) * 360;
      const rad = (d) => ((d - 90) * Math.PI) / 180;
      const x0 = 160 + R * Math.cos(rad(a0));
      const y0 = 160 + R * Math.sin(rad(a0));
      const x1 = 160 + R * Math.cos(rad(a1));
      const y1 = 160 + R * Math.sin(rad(a1));
      const large = a1 - a0 > 180 ? 1 : 0;
      paths += `<path d="M160 160 L${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z" fill="${s.color}" stroke="rgba(0,0,0,.35)" stroke-width="1"/>`;
      const mid = (a0 + a1) / 2;
      const span = a1 - a0;
      if (span >= 9) {
        const fs = span < 14 ? 10 : span < 25 ? 12 : 14;
        labels += `<text x="160" y="${160 - R + 22}" transform="rotate(${mid.toFixed(2)} 160 160)" text-anchor="middle" font-size="${fs}" font-weight="800" fill="${s.text || '#fff'}" font-family="Nunito, sans-serif">${esc(s.label)}</text>`;
      }
      s.a0 = a0;
      s.a1 = a1;
      a0 = a1;
    });
    return `<svg viewBox="0 0 320 320" class="wheel-svg"><g data-rot>${paths}${labels}<circle cx="160" cy="160" r="${R}" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="3"/></g><circle cx="160" cy="160" r="34" class="wheel-hub"/><text x="160" y="166" text-anchor="middle" font-size="20">🌸</text></svg>`;
  }

  function prizeLabel(r) {
    if (r.coins) return '+' + U.short(r.coins);
    if (r.gems) return r.gems + ' 💎';
    if (r.dust) return r.dust + ' ✨';
    if (r.tickets) return '🎟️×' + Object.values(r.tickets)[0];
    if (r.characters) return '👤';
    return '🎁';
  }

  App.games.register({
    id: 'wheel',
    name: 'Колесо удачи',
    icon: '🎡',
    color: '#a855f7',
    short: 'Крути и умножай',
    desc: 'Три уровня риска: от спокойного ×1.5 до безумного ×20. Плюс бесплатное колесо каждый день!',
    rules: `<p>Выбери уровень риска и ставку. Колесо остановится на случайном секторе — ставка умножится на его множитель.</p>
      <p>Все секторы одинаковые по размеру и шансу. Чем выше риск — тем больше пустых секторов (×0), но и множители выше.</p>
      <p><b>Бесплатное колесо</b> можно крутить раз в день — там только призы!</p>`,
    render(ctx, host) {
      const cfg = CFG.games.wheel;
      let tab = App.games.freeWheelReady() ? 'free' : 'bet';
      let modeId = App.state.lastBets.wheelMode || 'medium';
      let spinning = false;
      let rot = 0;
      let segs = [];

      host.innerHTML = `
        ${App.widgets.tabs([['bet', '🎯 На ставку'], ['free', '🎁 Бесплатное колесо']], tab, 'data-wtabs')}
        <div class="game-layout">
          <div class="game-panel panel" data-panel></div>
          <div class="game-stage panel wheel-stage">
            <div class="wheel-wrap"><div class="wheel-pointer"></div><div data-wheel></div></div>
            <div class="wheel-result" data-result></div>
          </div>
        </div>`;
      const $ = (s) => host.querySelector(s);
      let bet = null;

      function mode() {
        return cfg.modes.find((m) => m.id === modeId) || cfg.modes[0];
      }

      function buildWheel() {
        if (tab === 'bet') {
          segs = mode().segments.map((m) => ({ label: m ? '×' + m : '✕', color: colorFor(m), weight: 1, mult: m }));
        } else {
          segs = cfg.daily.map((p, i) => ({ label: prizeLabel(p.reward), text: p.reward.coins ? '#fff3b0' : '#fff', color: PRIZE_COLORS[i % PRIZE_COLORS.length], weight: p.weight, reward: p.reward }));
        }
        $('[data-wheel]').innerHTML = wheelSvg(segs);
        const g = $('[data-rot]');
        g.style.transform = `rotate(${rot}deg)`;
      }

      function renderPanel() {
        host.querySelectorAll('[data-wtabs] .tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
        const p = $('[data-panel]');
        if (tab === 'bet') {
          const m = mode();
          const ev = m.segments.reduce((s, x) => s + x, 0) / m.segments.length;
          const uniq = Array.from(new Set(m.segments)).sort((a, b) => a - b);
          p.innerHTML = `
            <div data-bet></div>
            <div class="field"><span>Риск</span><div class="chips">${cfg.modes.map((x) => `<button class="chip${x.id === modeId ? ' active' : ''}" data-mode="${esc(x.id)}">${esc(x.name)}</button>`).join('')}</div></div>
            <div class="wheel-legend">${uniq
              .map((v) => {
                const n = m.segments.filter((x) => x === v).length;
                return `<div><i style="background:${colorFor(v)}"></i>${v ? '×' + v : '×0'} <span class="muted small">${U.pct(n / m.segments.length, 0)}</span></div>`;
              })
              .join('')}</div>
            <button class="btn btn-primary btn-xl btn-block" data-spin>🎡 Крутить</button>
            <div class="muted small">Средний возврат: ${U.pct(ev, 0)}</div>`;
          bet = App.widgets.betInput(p.querySelector('[data-bet]'), { key: 'wheel' });
        } else {
          const ready = App.games.freeWheelReady();
          p.innerHTML = `
            <h3>🎁 Бесплатное колесо</h3>
            <p class="muted">Раз в день — гарантированный приз! Чем меньше сектор, тем реже он выпадает.</p>
            <button class="btn btn-gold btn-xl btn-block" data-free ${ready ? '' : 'disabled'}>${ready ? 'Крутить бесплатно!' : `Следующий спин через ${U.duration(U.msToMidnight())}`}</button>`;
          bet = null;
        }
        buildWheel();
      }

      function spinTo(index) {
        const s = segs[index];
        const span = s.a1 - s.a0;
        const target = s.a0 + span * U.randFloat(0.15, 0.85);
        const dur = App.anim.dur(4800, 1700);
        const base = rot - (rot % 360);
        const final = base + 360 * (dur ? 6 : 1) + (360 - target);
        const g = $('[data-rot]');
        const start = rot;
        return new Promise((resolve) => {
          if (!dur) {
            rot = final;
            g.style.transform = `rotate(${rot}deg)`;
            return resolve();
          }
          const t0 = performance.now();
          let lastSeg = -1;
          const frame = (now) => {
            if (!ctx.alive) return resolve();
            const t = Math.min(1, (now - t0) / dur);
            const e = 1 - Math.pow(1 - t, 4);
            rot = start + (final - start) * e;
            g.style.transform = `rotate(${rot}deg)`;
            const pointerAngle = (360 - (rot % 360)) % 360;
            const seg = segs.findIndex((x) => pointerAngle >= x.a0 && pointerAngle < x.a1);
            if (seg !== lastSeg) {
              lastSeg = seg;
              App.tick(900 + seg * 20);
            }
            if (t < 1) requestAnimationFrame(frame);
            else resolve();
          };
          requestAnimationFrame(frame);
        });
      }

      async function spinBet() {
        if (spinning) return;
        const b = bet.take();
        if (b == null || !App.eco.spend(b, 'coins')) return;
        spinning = true;
        bet.disable(true);
        $('[data-spin]').disabled = true;
        $('[data-result]').innerHTML = '';
        const idx = U.randInt(0, segs.length - 1);
        const mult = segs[idx].mult;
        const payout = Math.floor(b * mult);
        // результат фиксируется сразу
        if (payout) App.eco.add(payout, 'coins');
        App.games.record('wheel', b, payout);
        await spinTo(idx);
        spinning = false;
        if (!ctx.alive) return;
        bet.disable(false);
        $('[data-spin]').disabled = false;
        const res = $('[data-result]');
        if (payout > b) {
          App.sfx.play(mult >= 5 ? 'bigwin' : 'win');
          if (mult >= 5) App.fx.confetti();
          res.innerHTML = `<div class="good">×${mult} — выигрыш ${ui.cur(payout)}!</div>`;
        } else if (payout > 0) {
          App.sfx.play('coin');
          res.innerHTML = `<div class="muted">×${mult} — вернулось ${ui.cur(payout)}</div>`;
        } else {
          App.sfx.play('lose');
          res.innerHTML = '<div class="bad">Пусто… ×0</div>';
        }
      }

      async function spinFree() {
        if (spinning || !App.games.freeWheelReady()) return;
        spinning = true;
        App.state.wheel.lastFree = U.todayKey();
        App.store.dirty();
        App.bus.emit('badges');
        $('[data-free]').disabled = true;
        const idx = segs.indexOf(U.weighted(segs, (s) => s.weight));
        const reward = segs[idx].reward;
        await spinTo(idx);
        spinning = false;
        App.eco.grant(reward, 'wheel', { title: 'Приз колеса удачи!' });
        App.fx.confetti();
        if (!ctx.alive) return;
        $('[data-result]').innerHTML = `<div class="good">Приз: ${ui.reward(reward)}</div>`;
        renderPanel();
      }

      host.addEventListener('click', (e) => {
        const t = e.target.closest('[data-wtabs] [data-tab]');
        if (t && !spinning) {
          tab = t.dataset.tab;
          $('[data-result]').innerHTML = '';
          App.sfx.play('soft');
          renderPanel();
          return;
        }
        const m = e.target.closest('[data-mode]');
        if (m && !spinning) {
          modeId = m.dataset.mode;
          App.state.lastBets.wheelMode = modeId;
          renderPanel();
          return;
        }
        if (e.target.closest('[data-spin]')) spinBet();
        if (e.target.closest('[data-free]')) spinFree();
      });
      renderPanel();
    },
  });
})();
