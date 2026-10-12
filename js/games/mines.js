/* Мини-игра «Мины»: открывай клетки с кристаллами и не наткнись на бомбу */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const CFG = GAME_DATA.config;
  const SIZE = 25;

  App.games.register({
    id: 'mines',
    name: 'Мины',
    icon: '💣',
    color: '#22d3ee',
    short: 'Найди кристаллы, обойди бомбы',
    desc: 'Поле 5×5. Каждая найденная клетка с кристаллом увеличивает множитель. Забери выигрыш, пока не взорвался!',
    rules: `<p>Выбери ставку и количество бомб (1–24). Больше бомб — быстрее растёт множитель.</p>
      <p>Открывай клетки: 💎 — множитель растёт, 💣 — ставка сгорает.</p>
      <p>Нажми <b>«Забрать»</b>, чтобы получить ставку × текущий множитель.</p>`,
    render(ctx, host) {
      const edge = CFG.games.mines.houseEdge;
      let mines = App.state.lastBets.minesCount || 3;
      host.innerHTML = `
        <div class="game-layout">
          <div class="game-panel panel">
            <div data-bet></div>
            <div class="field"><span>Количество бомб: <b data-mc>${mines}</b></span>
              <input type="range" class="range" min="1" max="24" value="${mines}" data-mines>
              <div class="chips chips-sm">${[1, 3, 5, 10, 20].map((n) => `<button class="chip" data-mq="${n}">${n}</button>`).join('')}</div>
            </div>
            <button class="btn btn-primary btn-xl btn-block" data-go>Играть</button>
            <button class="btn btn-ghost btn-block" data-random hidden>🎲 Случайная клетка</button>
            <div class="game-info" data-info></div>
          </div>
          <div class="game-stage panel mines-stage">
            <div class="mines-grid" data-grid>${Array.from({ length: SIZE }).map((_, i) => `<button class="tile" data-i="${i}" disabled></button>`).join('')}</div>
          </div>
        </div>`;
      const $ = (s) => host.querySelector(s);
      const bet = App.widgets.betInput($('[data-bet]'), { key: 'mines' });
      const goBtn = $('[data-go]');
      const tiles = Array.from(host.querySelectorAll('.tile'));
      let state = 'idle';
      let stake = 0;
      let bombs = new Set();
      let opened = new Set();

      const multFor = (k) => {
        let m = 1 - edge;
        for (let i = 0; i < k; i++) m *= (SIZE - i) / (SIZE - mines - i);
        return m;
      };

      function info() {
        const k = opened.size;
        const el = $('[data-info]');
        if (state === 'playing') {
          el.innerHTML = `<div>Множитель: <b>×${multFor(k).toFixed(2)}</b></div>
            <div>Следующая клетка: <b>×${multFor(k + 1).toFixed(2)}</b></div>
            <div>Выигрыш: <b>${ui.cur(Math.floor(stake * multFor(k)))}</b></div>`;
        } else {
          el.innerHTML = `<div class="muted small">Первая клетка даст ×${multFor(1).toFixed(2)}, пять клеток — ×${multFor(Math.min(5, SIZE - mines)).toFixed(2)}</div>`;
        }
      }
      function updateBtn() {
        if (state === 'playing') {
          const k = opened.size;
          goBtn.className = 'btn btn-gold btn-xl btn-block';
          goBtn.disabled = k === 0;
          goBtn.innerHTML = k ? `Забрать ${ui.cur(Math.floor(stake * multFor(k)))}` : 'Открой клетку';
          $('[data-random]').hidden = false;
        } else {
          goBtn.className = 'btn btn-primary btn-xl btn-block';
          goBtn.disabled = false;
          goBtn.innerHTML = 'Играть';
          $('[data-random]').hidden = true;
        }
        $('[data-mines]').disabled = state === 'playing';
        host.querySelectorAll('[data-mq]').forEach((b) => (b.disabled = state === 'playing'));
      }

      function start() {
        const b = bet.take();
        if (b == null || !App.eco.spend(b, 'coins')) return;
        stake = b;
        state = 'playing';
        opened = new Set();
        bombs = new Set(U.shuffle(Array.from({ length: SIZE }, (_, i) => i)).slice(0, mines));
        tiles.forEach((t) => {
          t.className = 'tile';
          t.innerHTML = '';
          t.disabled = false;
        });
        bet.disable(true);
        App.sfx.play('click');
        info();
        updateBtn();
      }

      function reveal(i) {
        if (state !== 'playing' || opened.has(i)) return;
        const t = tiles[i];
        if (bombs.has(i)) {
          t.className = 'tile open bomb';
          t.innerHTML = '💣';
          App.sfx.play('explode');
          App.fx.shake($('[data-grid]'));
          end(false);
          return;
        }
        opened.add(i);
        t.className = 'tile open gem';
        t.innerHTML = '💎';
        t.disabled = true;
        App.sfx.play('gemTile');
        App.fx.burstAt(t, ['#22d3ee', '#a5f3fc', '#fff'], 12);
        if (opened.size >= SIZE - mines) return cashout();
        info();
        updateBtn();
      }

      function cashout() {
        if (state !== 'playing' || !opened.size) return;
        const payout = Math.floor(stake * multFor(opened.size));
        App.eco.add(payout, 'coins');
        App.games.record('mines', stake, payout);
        App.sfx.play('cashout');
        ui.toast(`💎 ×${multFor(opened.size).toFixed(2)} → ${ui.cur(payout)}`, 'good');
        end(true);
      }

      function end(win) {
        state = 'over';
        App.stats.max('minesBest', opened.size);
        if (!win) App.games.record('mines', stake, 0);
        tiles.forEach((t, i) => {
          t.disabled = true;
          if (opened.has(i)) return;
          if (bombs.has(i)) {
            if (!t.classList.contains('bomb')) {
              t.className = 'tile open bomb dim';
              t.innerHTML = '💣';
            }
          } else {
            t.className = 'tile open gem dim';
            t.innerHTML = '💎';
          }
        });
        bet.disable(false);
        state = 'idle';
        info();
        updateBtn();
      }

      host.addEventListener('click', (e) => {
        const t = e.target.closest('.tile');
        if (t) return reveal(Number(t.dataset.i));
        if (e.target.closest('[data-go]')) return state === 'playing' ? cashout() : start();
        if (e.target.closest('[data-random]')) {
          const free = tiles.map((_, i) => i).filter((i) => !opened.has(i));
          if (free.length) reveal(U.pick(free));
          return;
        }
        const q = e.target.closest('[data-mq]');
        if (q && state !== 'playing') {
          mines = Number(q.dataset.mq);
          $('[data-mines]').value = mines;
          $('[data-mc]').textContent = mines;
          App.state.lastBets.minesCount = mines;
          info();
        }
      });
      host.addEventListener('input', (e) => {
        if (e.target.matches('[data-mines]')) {
          mines = Number(e.target.value);
          $('[data-mc]').textContent = mines;
          App.state.lastBets.minesCount = mines;
          info();
        }
      });
      ctx.onDestroy(() => {
        if (state === 'playing') {
          if (opened.size) {
            const payout = Math.floor(stake * multFor(opened.size));
            App.eco.add(payout, 'coins');
            App.games.record('mines', stake, payout);
            ui.toast(`💣 Мины: авто-вывод ${ui.cur(payout)}`, 'good');
          } else {
            App.eco.add(stake, 'coins');
            ui.toast('💣 Мины: ставка возвращена', 'info');
          }
        }
      });
      info();
      updateBtn();
    },
  });
})();
