/* Мини-игра «Слоты»: 3 барабана, выигрыш по центральной линии */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;
  const CFG = GAME_DATA.config;

  const easeOutBack = (t) => {
    const c1 = 1.1;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  App.games.register({
    id: 'slots',
    name: 'Слоты',
    icon: '🎰',
    color: '#f97316',
    short: 'Три в ряд — джекпот',
    desc: 'Аниме-слоты: онигири, данго, сакура, неко… и корона на ×250!',
    rules: `<p>Выигрыш считается по центральной линии.</p><p>Три одинаковых символа — большой множитель, два одинаковых слева — маленький. Таблица выплат — в панели слева.</p>`,
    render(ctx, host) {
      const syms = CFG.games.slots.symbols;
      const pick = () => U.weighted(syms, (s) => s.weight);
      let spinning = false;
      const visible = [0, 1, 2].map(() => [pick(), pick(), pick()]);

      host.innerHTML = `
        <div class="game-layout">
          <div class="game-panel panel">
            <div data-bet></div>
            <button class="btn btn-primary btn-xl btn-block" data-go>🎰 Крутить</button>
            <div class="paytable">
              <div class="pt-head"><span>Символ</span><span>3 в ряд</span><span>2 слева</span></div>
              ${syms
                .slice()
                .reverse()
                .map((s) => `<div class="pt-row"><span class="pt-sym">${s.icon}${s.icon}${s.icon}</span><b>×${s.x3}</b><span class="muted">${s.x2 ? '×' + s.x2 : '—'}</span></div>`)
                .join('')}
            </div>
          </div>
          <div class="game-stage panel slots-stage">
            <div class="slot-machine">
              <div class="slot-top">🌸 WAIFU SLOTS 🌸</div>
              <div class="slot-window">
                ${[0, 1, 2].map((i) => `<div class="slot-reel"><div class="slot-strip" data-strip="${i}"></div></div>`).join('')}
                <div class="slot-line"></div>
              </div>
              <div class="slot-result" data-result>Удачи!</div>
            </div>
          </div>
        </div>`;
      const $ = (s) => host.querySelector(s);
      const bet = App.widgets.betInput($('[data-bet]'), { key: 'slots' });
      const strips = [0, 1, 2].map((i) => $(`[data-strip="${i}"]`));
      const cellHtml = (s, cls) => `<div class="slot-cell ${cls || ''}">${esc(s.icon)}</div>`;
      const cellSize = () => parseFloat(getComputedStyle($('.slot-window')).getPropertyValue('--cell')) || 92;

      function drawStatic() {
        strips.forEach((st, i) => {
          st.style.transform = 'translateY(0)';
          st.innerHTML = visible[i].map((s, r) => cellHtml(s, r === 1 ? 'mid' : '')).join('');
        });
      }

      function spinReel(i, result, dur) {
        const st = strips[i];
        const n = 16 + i * 6;
        const seq = visible[i].slice();
        for (let k = 0; k < n; k++) seq.push(pick());
        const top = pick();
        const bottom = pick();
        seq.push(top, result, bottom);
        st.innerHTML = seq.map((s, k) => cellHtml(s, k === seq.length - 2 ? 'mid final' : '')).join('');
        st.style.transform = 'translateY(0)';
        const CELL = cellSize();
        const end = (seq.length - 3) * CELL;
        visible[i] = [top, result, bottom];
        return new Promise((resolve) => {
          if (!dur) {
            st.style.transform = `translateY(${-end}px)`;
            return resolve();
          }
          const t0 = performance.now();
          let lastCell = 0;
          const frame = (now) => {
            if (!ctx.alive) return resolve();
            const t = Math.min(1, (now - t0) / dur);
            const y = end * easeOutBack(t);
            st.style.transform = `translateY(${-y}px)`;
            const c = Math.floor(y / CELL);
            if (c !== lastCell && t < 0.9) {
              lastCell = c;
              if (i === 0) App.tick(600 + U.rand() * 400);
            }
            if (t < 1) requestAnimationFrame(frame);
            else {
              App.sfx.play('tickLow');
              resolve();
            }
          };
          requestAnimationFrame(frame);
        });
      }

      async function spin() {
        if (spinning) return;
        const b = bet.take();
        if (b == null || !App.eco.spend(b, 'coins')) return;
        spinning = true;
        bet.disable(true);
        $('[data-go]').disabled = true;
        $('[data-result]').innerHTML = '…';
        host.querySelectorAll('.slot-cell.win').forEach((c) => c.classList.remove('win'));
        const res = [pick(), pick(), pick()];
        let mult = 0;
        let count = 0;
        if (res[0].id === res[1].id && res[1].id === res[2].id) {
          mult = res[0].x3;
          count = 3;
        } else if (res[0].id === res[1].id && res[0].x2) {
          mult = res[0].x2;
          count = 2;
        }
        const payout = Math.floor(b * mult);
        if (payout) App.eco.add(payout, 'coins');
        App.games.record('slots', b, payout);
        const base = App.anim.dur(1300, 450);
        await Promise.all([0, 1, 2].map((i) => spinReel(i, res[i], base ? base + i * (base > 900 ? 380 : 140) : 0)));
        spinning = false;
        if (!ctx.alive) return;
        bet.disable(false);
        $('[data-go]').disabled = false;
        const out = $('[data-result]');
        if (count) {
          strips.slice(0, count).forEach((st) => {
            const f = st.querySelector('.final');
            if (f) f.classList.add('win');
          });
        }
        if (payout > b) {
          App.sfx.play(mult >= 20 ? 'bigwin' : 'win');
          if (mult >= 20) App.fx.confetti({ count: mult >= 100 ? 260 : 150 });
          out.innerHTML = `<span class="good">${count === 3 ? 'ТРИ В РЯД!' : 'Пара!'} ×${mult} → ${ui.cur(payout)}</span>`;
        } else if (payout > 0) {
          App.sfx.play('coin');
          out.innerHTML = `<span class="muted">×${mult} — вернулось ${ui.cur(payout)}</span>`;
        } else {
          out.innerHTML = '<span class="muted">Мимо… ещё разок?</span>';
        }
      }

      $('[data-go]').addEventListener('click', spin);
      ctx.listen(document, 'keydown', (e) => {
        if (e.code !== 'Space' || e.target.closest('input, select, textarea') || ui.topModal()) return;
        e.preventDefault();
        spin();
      });
      drawStatic();
    },
  });
})();
