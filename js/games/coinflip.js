/* Мини-игра «Монетка»: угадай сторону */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const CFG = GAME_DATA.config;

  const SIDES = {
    sakura: { name: 'Сакура', icon: '🌸' },
    moon: { name: 'Луна', icon: '🌙' },
  };
  const history = [];

  App.games.register({
    id: 'coinflip',
    name: 'Монетка',
    icon: '🌗',
    color: '#fbbf24',
    short: 'Сакура или Луна?',
    desc: 'Классика: угадай, какой стороной упадёт монетка. 50 на 50!',
    rules: `<p>Выбери сторону — 🌸 Сакура или 🌙 Луна — и сделай ставку.</p><p>Угадал — получаешь ставку × ${CFG.games.coinflip.payout}. Не угадал — ставка сгорает.</p>`,
    render(ctx, host) {
      const payoutMult = CFG.games.coinflip.payout;
      let side = App.state.lastBets.coinSide || 'sakura';
      let flipping = false;
      let rot = 0;
      host.innerHTML = `
        <div class="game-layout">
          <div class="game-panel panel">
            <div data-bet></div>
            <div class="field"><span>Сторона</span>
              <div class="side-pick">${Object.keys(SIDES).map((k) => `<button class="side-btn${k === side ? ' active' : ''}" data-side="${k}"><span>${SIDES[k].icon}</span>${SIDES[k].name}</button>`).join('')}</div>
            </div>
            <button class="btn btn-primary btn-xl btn-block" data-go>Подбросить</button>
            <div class="game-info"><span>Выигрыш: ставка × <b>${payoutMult}</b></span></div>
          </div>
          <div class="game-stage panel coin-stage">
            <div class="coin-wrap"><div class="coin" data-coin>
              <div class="coin-face coin-front">🌸</div>
              <div class="coin-face coin-back">🌙</div>
            </div></div>
            <div class="coin-result" data-result>Выбери сторону и подбрось монетку!</div>
            <div class="coin-hist" data-hist></div>
          </div>
        </div>`;
      const $ = (s) => host.querySelector(s);
      const bet = App.widgets.betInput($('[data-bet]'), { key: 'coinflip' });

      function renderHist() {
        $('[data-hist]').innerHTML = history.map((h) => `<span class="ch-dot ${h}">${SIDES[h].icon}</span>`).join('');
      }

      async function flip() {
        if (flipping) return;
        const b = bet.take();
        if (b == null || !App.eco.spend(b, 'coins')) return;
        flipping = true;
        bet.disable(true);
        $('[data-go]').disabled = true;
        const result = U.rand() < 0.5 ? 'sakura' : 'moon';
        const win = result === side;
        const payout = win ? Math.floor(b * payoutMult) : 0;
        if (payout) App.eco.add(payout, 'coins');
        App.games.record('coinflip', b, payout);
        const dur = App.anim.dur(1800, 700);
        const coin = $('[data-coin]');
        const base = rot - (rot % 360) + 360 * (dur ? 6 : 1);
        rot = base + (result === 'moon' ? 180 : 0);
        coin.style.transition = dur ? `transform ${dur}ms cubic-bezier(.2,.75,.25,1)` : 'none';
        coin.style.transform = `rotateY(${rot}deg)`;
        coin.classList.remove('land');
        $('[data-result]').innerHTML = '…';
        App.sfx.play('flip');
        if (dur) {
          const ticks = setInterval(() => App.sfx.play('flip'), 220);
          await U.sleep(dur);
          clearInterval(ticks);
        }
        flipping = false;
        history.unshift(result);
        if (history.length > 16) history.pop();
        if (!ctx.alive) return;
        coin.classList.add('land');
        bet.disable(false);
        $('[data-go]').disabled = false;
        renderHist();
        if (win) {
          App.sfx.play('win');
          App.fx.burstAt(coin, ['#fde68a', '#ff4fa3', '#fff'], 30);
          $('[data-result]').innerHTML = `<span class="good">${SIDES[result].icon} ${SIDES[result].name}! Выигрыш ${ui.cur(payout)}</span>`;
        } else {
          App.sfx.play('lose');
          $('[data-result]').innerHTML = `<span class="bad">${SIDES[result].icon} ${SIDES[result].name}… Не повезло</span>`;
        }
      }

      host.addEventListener('click', (e) => {
        const s = e.target.closest('[data-side]');
        if (s && !flipping) {
          side = s.dataset.side;
          App.state.lastBets.coinSide = side;
          host.querySelectorAll('[data-side]').forEach((b) => b.classList.toggle('active', b === s));
          App.sfx.play('soft');
          return;
        }
        if (e.target.closest('[data-go]')) flip();
      });
      ctx.listen(document, 'keydown', (e) => {
        if (e.code !== 'Space' || e.target.closest('input, select, textarea') || ui.topModal()) return;
        e.preventDefault();
        flip();
      });
      renderHist();
    },
  });
})();
