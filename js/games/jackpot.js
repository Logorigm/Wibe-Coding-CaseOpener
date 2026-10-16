/* Мини-игра «Джекпот»: однорукий бандит с копилкой.
 * Каждая ставка пополняет копилку, три символа с jackpot: true забирают её.
 * Символы, выплаты и параметры копилки — data/config.js → games.jackpot */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;
  const CFG = GAME_DATA.config;

  const cfg = () => CFG.games.jackpot;
  const easeOut = (t) => {
    // мягкая остановка с небольшим «доводом»
    const c1 = 0.9;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  /* ---------- копилка (хранится в сохранении: App.state.jackpot) ---------- */
  const JP = {
    seed: () => Math.round((cfg().seed || 1000) * App.eco.scale()),
    fullBet: () => Math.max(1, Math.round((cfg().fullBet || 500) * App.eco.scale())),
    state() {
      const st = App.state;
      if (!st.jackpot || typeof st.jackpot.pool !== 'number' || !(st.jackpot.pool >= 0)) {
        st.jackpot = { pool: JP.seed(), wins: 0, last: null };
      }
      if (st.jackpot.pool < JP.seed()) st.jackpot.pool = JP.seed();
      return st.jackpot;
    },
    pool: () => Math.floor(JP.state().pool),
    // доля копилки при такой ставке
    share: (bet) => Math.min(1, bet / JP.fullBet()),
    add(amount) {
      JP.state().pool += amount;
      App.store.dirty();
    },
    // забрать (часть) копилки; копилка не опускается ниже стартовой суммы
    take(bet) {
      const s = JP.state();
      const win = Math.floor(s.pool * JP.share(bet));
      s.pool = Math.max(s.pool - win, JP.seed());
      s.wins = (s.wins || 0) + 1;
      s.last = { amount: win, at: Date.now() };
      App.store.dirty();
      return win;
    },
  };
  App.jackpot = JP;

  const symbols = () => cfg().symbols;
  const jpSymbol = () => symbols().find((s) => s.jackpot) || symbols()[symbols().length - 1];
  function jackpotOdds() {
    const syms = symbols();
    const total = syms.reduce((s, x) => s + x.weight, 0);
    const p = syms.filter((x) => x.jackpot).reduce((s, x) => s + Math.pow(x.weight / total, 3), 0);
    return p > 0 ? Math.round(1 / p) : 0;
  }

  App.games.register({
    id: 'jackpot',
    name: 'Джекпот',
    icon: 'slots',
    short: 'Однорукий бандит с копилкой',
    get rules() {
      const c = cfg();
      const jp = jpSymbol();
      return `<p>Выигрыш считается по средней линии: три одинаковых символа — большой множитель, два одинаковых слева — маленький.</p>
        <p>Каждая ставка пополняет копилку на ${U.pct(c.contribution || 0, 0)}. Три ${esc(jp.icon)} забирают копилку:
        при ставке от ${ui.cur(JP.fullBet())} — целиком, при меньшей — часть, пропорционально ставке.</p>
        <p>Шанс джекпота — примерно 1 к ${U.fmt(jackpotOdds())} за спин.</p>`;
    },
    render(ctx, host) {
      const syms = symbols();
      const pick = () => U.weighted(syms, (s) => s.weight);
      let auto = 0; // сколько автоспинов осталось
      let pending = null;
      let shownPool = JP.pool();
      let poolRaf = 0;
      const visible = [0, 1, 2].map(() => [pick(), pick(), pick()]);
      const rafs = [0, 0, 0];

      host.innerHTML = `
        <div class="game-layout">
          <div class="game-panel panel">
            <div data-bet></div>
            <div class="game-note" data-share></div>
            <button class="btn btn-primary btn-xl btn-block" data-go>Крутить</button>
            <div class="jp-auto">
              <span>Автоспин</span>
              <button type="button" class="chip" data-auto="10">×10</button>
              <button type="button" class="chip" data-auto="25">×25</button>
              <button type="button" class="chip" data-auto="stop" hidden>Стоп</button>
            </div>
            <div class="jp-pay">
              <div class="jp-pay-head"><span>Выплаты</span><span>3 в ряд</span><span>2 слева</span></div>
              ${syms
                .slice()
                .reverse()
                .map(
                  (s) => `<div class="jp-pay-row${s.jackpot ? ' jp' : ''}"><span class="jp-sym">${esc(s.icon)}</span><b>${s.jackpot ? 'копилка' : '×' + s.x3}</b><span>${s.x2 ? '×' + s.x2 : '—'}</span></div>`
                )
                .join('')}
            </div>
          </div>
          <div class="game-main">
            <div class="game-stage panel jp-stage">
              <div class="jp-counter" data-jp>
                <div class="jp-label">Джекпот</div>
                <div class="jp-value">${ui.coin()}<b data-pool>${U.fmt(shownPool)}</b></div>
                <div class="jp-meta" data-meta></div>
              </div>
              <div class="jp-window" data-window>
                ${[0, 1, 2].map((i) => `<div class="jp-reel"><div class="jp-strip" data-strip="${i}"></div></div>`).join('')}
                <div class="jp-line"></div>
              </div>
            </div>
            <div class="game-result" data-result></div>
          </div>
        </div>`;
      const $ = (s) => host.querySelector(s);
      const bet = App.widgets.betInput($('[data-bet]'), { key: 'jackpot', onChange: () => renderShare() });
      const strips = [0, 1, 2].map((i) => $(`[data-strip="${i}"]`));
      const goBtn = $('[data-go]');
      const cellHtml = (s, cls) => `<div class="jp-cell${cls ? ' ' + cls : ''}">${esc(s.icon)}</div>`;
      const cellSize = () => {
        const c = strips[0].querySelector('.jp-cell');
        return c ? c.getBoundingClientRect().height : 80;
      };

      function renderShare() {
        const v = bet.value || 0;
        const share = JP.share(v);
        $('[data-share]').innerHTML =
          share >= 1 ? 'Ставка забирает всю копилку' : `Доля копилки: <b>${U.pct(share, share < 0.1 ? 1 : 0)}</b> · вся — от ${ui.cur(JP.fullBet())}`;
      }
      function renderMeta() {
        const s = JP.state();
        $('[data-meta]').innerHTML = s.last ? `Последний выигрыш: ${ui.cur(s.last.amount)}` : `Шанс 1 к ${U.fmt(jackpotOdds())}`;
      }
      // плавный счётчик копилки
      function animatePool() {
        const target = JP.pool();
        cancelAnimationFrame(poolRaf);
        const from = shownPool;
        const el = $('[data-pool]');
        if (from === target) return;
        const t0 = performance.now();
        const dur = 500;
        const step = (now) => {
          if (!ctx.alive) return;
          const k = Math.min(1, (now - t0) / dur);
          shownPool = Math.round(from + (target - from) * (1 - Math.pow(1 - k, 3)));
          el.textContent = U.fmt(shownPool);
          if (k < 1) poolRaf = requestAnimationFrame(step);
        };
        poolRaf = requestAnimationFrame(step);
      }
      function drawStatic() {
        strips.forEach((st, i) => {
          st.style.transform = 'translateY(0)';
          st.innerHTML = visible[i].map((s, r) => cellHtml(s, r === 1 ? 'mid' : '')).join('');
        });
      }
      function setResult(html, cls) {
        const el = $('[data-result]');
        el.className = 'game-result' + (cls ? ' ' + cls : '');
        el.innerHTML = html;
      }
      function setAuto(n) {
        auto = n;
        host.querySelectorAll('[data-auto]').forEach((b) => {
          if (b.dataset.auto === 'stop') {
            b.hidden = !auto;
            b.textContent = `Стоп · ${auto}`;
          } else b.hidden = !!auto;
        });
      }

      function spinReel(i, result, dur) {
        const st = strips[i];
        const n = 14 + i * 5;
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
            const y = end * easeOut(t);
            st.style.transform = `translateY(${(-y).toFixed(1)}px)`;
            const c = Math.floor(y / CELL);
            if (c !== lastCell && t < 0.9) {
              lastCell = c;
              if (i === 0) App.tick(600 + U.rand() * 400);
            }
            if (t < 1) rafs[i] = requestAnimationFrame(frame);
            else {
              App.sfx.play('tickLow');
              resolve();
            }
          };
          rafs[i] = requestAnimationFrame(frame);
        });
      }

      async function spin() {
        if (pending) return;
        const b = App.games.charge(bet);
        if (b == null) {
          setAuto(0);
          return;
        }
        // ставка пополняет копилку; результат известен сразу
        JP.add(b * (cfg().contribution || 0));
        animatePool();
        const res = [pick(), pick(), pick()];
        let mult = 0;
        let count = 0;
        let jackpot = 0;
        if (res[0].id === res[1].id && res[1].id === res[2].id) {
          count = 3;
          if (res[0].jackpot) jackpot = JP.take(b);
          else mult = res[0].x3 || 0;
        } else if (res[0].id === res[1].id && res[0].x2) {
          mult = res[0].x2;
          count = 2;
        }
        const payout = jackpot || Math.floor(b * mult);
        const p = (pending = { done: false });
        p.settle = () => {
          if (p.done) return;
          p.done = true;
          if (payout) App.eco.add(payout);
          if (jackpot) App.stats.inc('jackpotsWon');
          App.games.record('jackpot', b, payout);
          App.setBusy(false);
        };
        App.setBusy(true);
        bet.disable(true);
        goBtn.disabled = true;
        setResult('&nbsp;');
        host.querySelectorAll('.jp-cell.win').forEach((c) => c.classList.remove('win'));

        const base = App.anim.dur(1200, 450);
        await Promise.all([0, 1, 2].map((i) => spinReel(i, res[i], base ? base + i * (base > 800 ? 320 : 120) : 0)));
        p.settle();
        pending = null;
        if (!ctx.alive) return;
        bet.disable(false);
        goBtn.disabled = false;
        if (count) {
          strips.slice(0, count).forEach((st) => {
            const f = st.querySelector('.final');
            if (f) f.classList.add('win');
          });
        }
        if (jackpot) {
          App.sfx.play('bigwin');
          App.fx.confetti({ count: 160 });
          animatePool();
          renderMeta();
          setResult(`Джекпот! <b class="good">${ui.cur(jackpot, { sign: true })}</b>`);
          setAuto(0);
        } else if (payout > b) {
          App.sfx.play(mult >= 20 ? 'bigwin' : 'win');
          setResult(`${count === 3 ? 'Три в ряд' : 'Пара'} ×${mult} · выигрыш <b class="good">${ui.cur(payout, { sign: true })}</b>`);
          if (mult >= 20) setAuto(0);
        } else if (payout > 0) {
          App.sfx.play('coin');
          setResult(`×${mult} · вернулось ${ui.cur(payout)}`);
        } else {
          setResult('Мимо', 'muted');
        }
        renderShare();
        if (auto > 0) {
          setAuto(auto - 1);
          if (auto > 0) ctx.after(App.anim.dur(450, 220) || 150, spin);
        }
      }

      host.addEventListener('click', (e) => {
        if (e.target.closest('[data-go]')) return spin();
        const a = e.target.closest('[data-auto]');
        if (!a) return;
        App.sfx.play('soft');
        if (a.dataset.auto === 'stop') setAuto(0);
        else {
          setAuto(Number(a.dataset.auto));
          if (!pending) spin();
        }
      });
      ctx.listen(document, 'keydown', (e) => {
        if (e.code !== 'Space' || e.repeat || e.target.closest('input, select, textarea, button') || ui.topModal()) return;
        e.preventDefault();
        spin();
      });
      ctx.on('levelup', () => {
        renderShare();
        animatePool();
      });
      // ушёл во время вращения — выигрыш всё равно засчитывается
      ctx.onDestroy(() => {
        cancelAnimationFrame(poolRaf);
        rafs.forEach((r) => cancelAnimationFrame(r));
        auto = 0;
        if (pending) pending.settle();
      });

      drawStatic();
      renderShare();
      renderMeta();
      setResult('Удачи!', 'muted');
    },
  });
})();
