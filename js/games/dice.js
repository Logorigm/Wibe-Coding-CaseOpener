/* Мини-игра «Кости»: выбери порог и шанс — чем меньше шанс, тем больше множитель */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const CFG = GAME_DATA.config;
  const history = [];

  App.games.register({
    id: 'dice',
    name: 'Кости',
    icon: '🎲',
    color: '#34d399',
    short: 'Сам выбираешь риск',
    desc: 'Выпадает число от 0 до 100. Выбери порог и направление — множитель рассчитается сам.',
    rules: `<p>Выпадает случайное число от 0.00 до 99.99.</p>
      <p>Выбери порог и режим: <b>«Меньше»</b> — выигрыш, если число меньше порога; <b>«Больше»</b> — если больше.</p>
      <p>Множитель = ${Math.round((1 - CFG.games.dice.houseEdge) * 100)} ÷ шанс в процентах.</p>`,
    render(ctx, host) {
      const edge = CFG.games.dice.houseEdge;
      let target = App.state.lastBets.diceTarget || 50;
      let over = !!App.state.lastBets.diceOver;
      let rolling = false;
      host.innerHTML = `
        <div class="game-layout">
          <div class="game-panel panel">
            <div data-bet></div>
            <div class="field"><span>Режим</span><div class="chips"><button class="chip" data-mode="under">⬇ Меньше</button><button class="chip" data-mode="over">⬆ Больше</button></div></div>
            <div class="dice-stats">
              <div><span>Шанс</span><b data-chance></b></div>
              <div><span>Множитель</span><b data-mult></b></div>
              <div><span>Выигрыш</span><b data-win></b></div>
            </div>
            <button class="btn btn-primary btn-xl btn-block" data-go>🎲 Бросить</button>
          </div>
          <div class="game-stage panel dice-stage">
            <div class="dice-num" data-num>50.00</div>
            <div class="dice-track">
              <div class="dice-zone" data-zone></div>
              <input type="range" class="dice-range" min="2" max="98" step="1" value="${target}" data-target>
              <div class="dice-marker" data-marker hidden><span data-mval></span></div>
              <div class="dice-scale"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
            </div>
            <div class="dice-target-label">Порог: <b data-tval>${target}</b></div>
            <div class="hist-chips" data-hist></div>
          </div>
        </div>`;
      const $ = (s) => host.querySelector(s);
      const bet = App.widgets.betInput($('[data-bet]'), { key: 'dice', onChange: update });

      const chance = () => (over ? 100 - target : target) / 100;
      const mult = () => (1 - edge) / chance();

      function update() {
        host.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('active', (b.dataset.mode === 'over') === over));
        $('[data-chance]').textContent = U.pct(chance(), 0);
        $('[data-mult]').textContent = U.mult(mult());
        $('[data-win]').innerHTML = ui.cur(Math.floor(bet.value * mult()));
        $('[data-tval]').textContent = target;
        const z = $('[data-zone]');
        z.style.left = over ? target + '%' : '0';
        z.style.width = (over ? 100 - target : target) + '%';
      }

      async function roll() {
        if (rolling) return;
        const b = bet.take();
        if (b == null || !App.eco.spend(b, 'coins')) return;
        rolling = true;
        bet.disable(true);
        $('[data-go]').disabled = true;
        const value = Math.floor(U.rand() * 10000) / 100;
        const win = over ? value > target : value < target;
        const m = mult();
        const payout = win ? Math.floor(b * m) : 0;
        if (payout) App.eco.add(payout, 'coins');
        App.games.record('dice', b, payout);
        const num = $('[data-num]');
        num.className = 'dice-num rolling';
        const dur = App.anim.dur(700, 250);
        const t0 = performance.now();
        while (performance.now() - t0 < dur) {
          num.textContent = (U.rand() * 100).toFixed(2);
          App.tick(700 + U.rand() * 600);
          await U.sleep(45);
          if (!ctx.alive) return;
        }
        rolling = false;
        num.textContent = value.toFixed(2);
        num.className = 'dice-num ' + (win ? 'win' : 'lose');
        const mk = $('[data-marker]');
        mk.hidden = false;
        mk.style.left = value + '%';
        mk.className = 'dice-marker ' + (win ? 'win' : 'lose');
        $('[data-mval]').textContent = value.toFixed(2);
        history.unshift({ v: value, win });
        if (history.length > 20) history.pop();
        $('[data-hist]').innerHTML = history.map((h) => `<span class="hchip ${h.win ? 'h-mid' : 'h-low'}">${h.v.toFixed(2)}</span>`).join('');
        bet.disable(false);
        $('[data-go]').disabled = false;
        if (win) {
          App.sfx.play(m >= 5 ? 'bigwin' : 'win');
          if (m >= 10) App.fx.confetti();
          ui.toast(`🎲 ${value.toFixed(2)} — выигрыш ${ui.cur(payout)}`, 'good');
        } else App.sfx.play('lose');
      }

      host.addEventListener('click', (e) => {
        const md = e.target.closest('[data-mode]');
        if (md && !rolling) {
          over = md.dataset.mode === 'over';
          App.state.lastBets.diceOver = over;
          App.sfx.play('soft');
          update();
        }
        if (e.target.closest('[data-go]')) roll();
      });
      host.addEventListener('input', (e) => {
        if (e.target.matches('[data-target]')) {
          target = Number(e.target.value);
          App.state.lastBets.diceTarget = target;
          update();
        }
      });
      ctx.listen(document, 'keydown', (e) => {
        if (e.code !== 'Space' || e.target.closest('input, select, textarea') || ui.topModal()) return;
        e.preventDefault();
        roll();
      });
      update();
    },
  });
})();
