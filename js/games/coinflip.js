/* Мини-игра «Коинфлип»: угадай сторону монеты. Играешь против казино.
 * Выплата — data/config.js → games.coinflip.payout */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const CFG = GAME_DATA.config;

  // Простые знаки сторон (без эмодзи)
  const PETALS = [0, 72, 144, 216, 288].map((a) => `<ellipse cx="12" cy="6.6" rx="3.4" ry="4.9" transform="rotate(${a} 12 12)"/>`).join('');
  const SIDES = {
    sakura: {
      name: 'Сакура',
      glyph: `<svg class="cf-glyph" viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor">${PETALS}</g><circle cx="12" cy="12" r="2.2" fill="#b8336f" fill-opacity=".5"/></svg>`,
    },
    moon: {
      name: 'Луна',
      glyph: '<svg class="cf-glyph" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15.2 2.6a9.6 9.6 0 1 0 6.3 14.6A7.9 7.9 0 0 1 15.2 2.6z"/></svg>',
    },
  };
  const history = []; // { side, win } — новые в начале
  let streak = 0;

  App.games.register({
    id: 'coinflip',
    name: 'Коинфлип',
    icon: 'coinflip',
    short: 'Угадай сторону монеты',
    get rules() {
      const k = CFG.games.coinflip.payout;
      return `<p>Выбери сторону — Сакура или Луна — и сделай ставку.</p>
        <p>Угадал — получаешь ставку × <b>${k}</b>. Не угадал — ставка сгорает. Шанс 50 на 50.</p>`;
    },
    render(ctx, host) {
      const payoutMult = CFG.games.coinflip.payout;
      let side = SIDES[App.state.lastBets.coinSide] ? App.state.lastBets.coinSide : 'sakura';
      let rot = 0;
      let pending = null; // бросок, который ещё не засчитан

      host.innerHTML = `
        <div class="game-layout">
          <div class="game-panel panel">
            <div data-bet></div>
            <div class="field"><span>Сторона</span>
              <div class="cf-sides">${Object.keys(SIDES)
                .map((k) => `<button type="button" class="cf-side cf-${k}${k === side ? ' active' : ''}" data-side="${k}">${SIDES[k].glyph}<span>${SIDES[k].name}</span></button>`)
                .join('')}</div>
            </div>
            <button class="btn btn-primary btn-xl btn-block" data-go>Подбросить</button>
            <div class="game-note">Угадал — ставка × ${payoutMult}</div>
          </div>
          <div class="game-main">
            <div class="game-stage panel cf-stage">
              <div class="cf-wrap"><div class="cf-coin" data-coin>
                <div class="cf-face cf-sakura">${SIDES.sakura.glyph}</div>
                <div class="cf-face cf-moon cf-back">${SIDES.moon.glyph}</div>
              </div></div>
              <div class="cf-hist" data-hist></div>
            </div>
            <div class="game-result" data-result></div>
          </div>
        </div>`;
      const $ = (s) => host.querySelector(s);
      const bet = App.widgets.betInput($('[data-bet]'), { key: 'coinflip' });
      const coin = $('[data-coin]');
      const goBtn = $('[data-go]');

      function setBusyUi(on) {
        bet.disable(on);
        goBtn.disabled = on;
        host.querySelectorAll('[data-side]').forEach((x) => (x.disabled = on));
      }
      function renderHist() {
        $('[data-hist]').innerHTML = history
          .slice(0, 16)
          .map((h) => `<i class="cf-dot cf-${h.side}${h.win ? ' won' : ''}" title="${SIDES[h.side].name}${h.win ? ' · победа' : ''}"></i>`)
          .join('');
      }
      function idleText() {
        const r = $('[data-result]');
        r.className = 'game-result muted';
        r.innerHTML = streak > 1 ? `Серия побед: ${streak}` : `Ты ставишь на: ${SIDES[side].name}`;
      }
      // показать монету нужной стороной без анимации
      function face(s) {
        rot = s === 'moon' ? 180 : 0;
        coin.style.transition = 'none';
        coin.style.transform = `rotateY(${rot}deg)`;
      }

      async function flip() {
        if (pending) return;
        const b = App.games.charge(bet);
        if (b == null) return;
        const result = U.rand() < 0.5 ? 'sakura' : 'moon';
        const win = result === side;
        const payout = win ? Math.floor(b * payoutMult) : 0;
        const p = (pending = { done: false });
        // засчитываем один раз: после анимации или сразу, если игрок ушёл
        p.settle = () => {
          if (p.done) return;
          p.done = true;
          if (payout) App.eco.add(payout);
          streak = win ? streak + 1 : 0;
          if (win) App.stats.max('coinflipStreakMax', streak);
          App.games.record('coinflip', b, payout);
          history.unshift({ side: result, win });
          if (history.length > 30) history.pop();
          App.setBusy(false);
        };
        App.setBusy(true);
        setBusyUi(true);
        $('[data-result]').className = 'game-result muted';
        $('[data-result]').textContent = 'Монета в воздухе…';
        const dur = App.anim.dur(1600, 650);
        const turns = dur ? 5 : 0;
        rot = rot - (rot % 360) + 360 * turns + (result === 'moon' ? 180 : 0);
        coin.classList.remove('land');
        coin.style.transition = dur ? `transform ${dur}ms cubic-bezier(.2,.7,.25,1)` : 'none';
        coin.style.transform = `rotateY(${rot}deg)`;
        App.sfx.play('flip');
        if (dur) await U.sleep(dur);
        p.settle();
        pending = null;
        if (!ctx.alive) return;
        coin.classList.add('land');
        setBusyUi(false);
        renderHist();
        const r = $('[data-result]');
        if (win) {
          App.sfx.play('win');
          r.className = 'game-result';
          r.innerHTML = `${SIDES[result].name}! Выигрыш <b class="good">${ui.cur(payout, { sign: true })}</b>${streak > 1 ? ` <span class="muted">· серия ${streak}</span>` : ''}`;
        } else {
          App.sfx.play('lose');
          r.className = 'game-result';
          r.innerHTML = `${SIDES[result].name}. <span class="muted">Ставка не сыграла</span>`;
        }
      }

      host.addEventListener('click', (e) => {
        const s = e.target.closest('[data-side]');
        if (s) {
          if (pending) return;
          side = s.dataset.side;
          App.state.lastBets.coinSide = side;
          App.store.dirty();
          host.querySelectorAll('[data-side]').forEach((x) => x.classList.toggle('active', x === s));
          App.sfx.play('soft');
          face(side);
          idleText();
          return;
        }
        if (e.target.closest('[data-go]')) flip();
      });
      ctx.listen(document, 'keydown', (e) => {
        if (e.code !== 'Space' || e.repeat || e.target.closest('input, select, textarea, button') || ui.topModal()) return;
        e.preventDefault();
        flip();
      });
      ctx.onDestroy(() => {
        if (pending) pending.settle();
      });

      face(history.length ? history[0].side : side);
      renderHist();
      idleText();
    },
  });
})();
