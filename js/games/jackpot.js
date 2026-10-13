/* Мини-игра «Джекпот»: однорукий бандит с прогрессивной копилкой.
 * Каждая ставка пополняет копилку, три символа с jackpot: true (👑👑👑) забирают её.
 * Символы, выплаты и параметры копилки — в data/config.js → games.jackpot */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;
  const CFG = GAME_DATA.config;

  const cfg = () => CFG.games.jackpot;
  const easeOutBack = (t) => {
    const c1 = 1.1;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  /* ---------- копилка (хранится в сохранении) ---------- */
  const JP = {
    seed: () => Math.round((cfg().seed || 1000) * App.eco.scale()),
    fullBet: () => Math.max(1, Math.round((cfg().fullBet || 500) * App.eco.scale())),
    state() {
      const st = App.state;
      if (!st.jackpot || typeof st.jackpot.pool !== 'number' || !(st.jackpot.pool >= 0)) {
        st.jackpot = { pool: JP.seed(), wins: 0, last: null };
      }
      return st.jackpot;
    },
    pool: () => Math.floor(JP.state().pool),
    // доля копилки при такой ставке
    share: (bet) => Math.min(1, bet / JP.fullBet()),
    add(amount) {
      JP.state().pool += amount;
    },
    // забрать (часть) копилки; копилка не опускается ниже стартовой суммы
    take(bet) {
      const s = JP.state();
      const win = Math.floor(s.pool * JP.share(bet));
      s.pool = Math.max(s.pool - win, JP.seed());
      s.wins = (s.wins || 0) + 1;
      s.last = { amount: win, at: Date.now() };
      return win;
    },
  };
  App.jackpot = JP;

  // Средний возврат без учёта копилки (для правил)
  function baseRtp() {
    const syms = cfg().symbols;
    const total = syms.reduce((s, x) => s + x.weight, 0);
    return syms.reduce((s, x) => {
      const p = x.weight / total;
      return s + (x.jackpot ? 0 : (x.x3 || 0) * p * p * p) + (x.x2 || 0) * p * p * (1 - p);
    }, 0);
  }
  function jackpotOdds() {
    const syms = cfg().symbols;
    const total = syms.reduce((s, x) => s + x.weight, 0);
    const p = syms.filter((x) => x.jackpot).reduce((s, x) => s + Math.pow(x.weight / total, 3), 0);
    return p > 0 ? Math.round(1 / p) : 0;
  }

  App.games.register({
    id: 'jackpot',
    name: 'Джекпот',
    icon: '🎰',
    color: '#f97316',
    short: 'Три короны — забери копилку',
    desc: 'Однорукий бандит с прогрессивным джекпотом: каждая ставка пополняет копилку, а 👑👑👑 забирают её целиком!',
    flag: () => `💰 ${U.short(JP.pool())}`,
    get rules() {
      const c = cfg();
      return `<p>Выигрыш считается по центральной линии: три одинаковых символа — большой множитель, два одинаковых слева — маленький.</p>
        <p><b>Копилка джекпота</b> растёт с каждой ставки (${U.pct(c.contribution || 0, 0)} от ставки). Три 👑 забирают её:
        при ставке от ${ui.cur(JP.fullBet())} — целиком, при меньшей — пропорционально ставке.</p>
        <p>Шанс джекпота — примерно 1 к ${U.fmt(jackpotOdds())} за спин. Средний возврат без джекпота — ${U.pct(baseRtp(), 1)}.</p>
        <p class="muted">Пробел — крутить.</p>`;
    },
    render(ctx, host) {
      const syms = cfg().symbols;
      const pick = () => U.weighted(syms, (s) => s.weight);
      let spinning = false;
      let auto = 0; // сколько автоспинов осталось
      let shownPool = JP.pool();
      let poolAnim = 0;
      const visible = [0, 1, 2].map(() => [pick(), pick(), pick()]);

      host.innerHTML = `
        <div class="game-layout">
          <div class="game-panel panel">
            <div data-bet></div>
            <div class="jp-share small" data-share></div>
            <button class="btn btn-primary btn-xl btn-block" data-go>🎰 Крутить</button>
            <div class="field"><span>Автоспин</span>
              <div class="chips chips-sm" data-autos>${[10, 25, 50].map((n) => `<button class="chip" data-auto="${n}">×${n}</button>`).join('')}<button class="chip" data-auto="stop" hidden>⏹ Стоп</button></div>
            </div>
            <div class="paytable">
              <div class="pt-head"><span>Символ</span><span>3 в ряд</span><span>2 слева</span></div>
              ${syms
                .slice()
                .reverse()
                .map(
                  (s) => `<div class="pt-row${s.jackpot ? ' pt-jp' : ''}"><span class="pt-sym">${s.icon}${s.icon}${s.icon}</span><b>${s.jackpot ? 'ДЖЕКПОТ' : '×' + s.x3}</b><span class="muted">${s.x2 ? '×' + s.x2 : '—'}</span></div>`
                )
                .join('')}
            </div>
          </div>
          <div class="game-stage panel slots-stage">
            <div class="jp-counter" data-jp>
              <div class="jp-label">👑 ДЖЕКПОТ 👑</div>
              <div class="jp-value"><span data-pool>${U.fmt(shownPool)}</span>${ui.icon('coins')}</div>
              <div class="jp-meta muted small" data-jpmeta></div>
            </div>
            <div class="slot-machine">
              <div class="slot-top">🌸 WAIFU JACKPOT 🌸</div>
              <div class="slot-window">
                ${[0, 1, 2].map((i) => `<div class="slot-reel"><div class="slot-strip" data-strip="${i}"></div></div>`).join('')}
                <div class="slot-line"></div>
              </div>
              <div class="slot-result" data-result>Удачи!</div>
            </div>
          </div>
        </div>`;
      const $ = (s) => host.querySelector(s);
      const bet = App.widgets.betInput($('[data-bet]'), { key: 'jackpot', onChange: () => renderShare() });
      const strips = [0, 1, 2].map((i) => $(`[data-strip="${i}"]`));
      const cellHtml = (s, cls) => `<div class="slot-cell ${cls || ''}">${esc(s.icon)}</div>`;
      const cellSize = () => parseFloat(getComputedStyle($('.slot-window')).getPropertyValue('--cell')) || 92;

      function renderShare() {
        const share = JP.share(bet.value || 0);
        $('[data-share]').innerHTML =
          share >= 1
            ? '<span class="good">✓ Ставка забирает весь джекпот</span>'
            : `Твоя доля джекпота: <b>${U.pct(share, 0)}</b> · весь — при ставке от ${ui.cur(JP.fullBet())}`;
      }
      function renderMeta() {
        const s = JP.state();
        $('[data-jpmeta]').innerHTML = s.last
          ? `Последний джекпот: ${ui.cur(s.last.amount)} · ${new Date(s.last.at).toLocaleDateString('ru-RU')}`
          : `Шанс — 1 к ${U.fmt(jackpotOdds())} за спин`;
      }
      // плавный счётчик копилки
      function animatePool() {
        const target = JP.pool();
        cancelAnimationFrame(poolAnim);
        const from = shownPool;
        if (from === target) return;
        const t0 = performance.now();
        const dur = Math.abs(target - from) > target * 0.5 ? 1200 : 450;
        const step = (now) => {
          if (!ctx.alive) return;
          const k = Math.min(1, (now - t0) / dur);
          shownPool = Math.round(from + (target - from) * (1 - Math.pow(1 - k, 3)));
          $('[data-pool]').textContent = U.fmt(shownPool);
          if (k < 1) poolAnim = requestAnimationFrame(step);
        };
        poolAnim = requestAnimationFrame(step);
      }

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

      function setAuto(n) {
        auto = n;
        host.querySelectorAll('[data-auto]').forEach((b) => {
          if (b.dataset.auto === 'stop') {
            b.hidden = !auto;
            b.textContent = `⏹ Стоп (${auto})`;
          } else b.hidden = !!auto;
        });
      }

      async function spin() {
        if (spinning) return;
        const b = bet.take();
        if (b == null || !App.eco.spend(b, 'coins')) {
          setAuto(0);
          return;
        }
        spinning = true;
        bet.disable(true);
        $('[data-go]').disabled = true;
        $('[data-result]').innerHTML = '…';
        host.querySelectorAll('.slot-cell.win').forEach((c) => c.classList.remove('win'));
        // ставка пополняет копилку
        JP.add(b * (cfg().contribution || 0));
        animatePool();
        const res = [pick(), pick(), pick()];
        let mult = 0;
        let count = 0;
        let jackpot = 0;
        if (res[0].id === res[1].id && res[1].id === res[2].id) {
          count = 3;
          if (res[0].jackpot) jackpot = JP.take(b);
          else mult = res[0].x3;
        } else if (res[0].id === res[1].id && res[0].x2) {
          mult = res[0].x2;
          count = 2;
        }
        const payout = jackpot || Math.floor(b * mult);
        App.store.dirty();
        const base = App.anim.dur(1300, 450);
        await Promise.all([0, 1, 2].map((i) => spinReel(i, res[i], base ? base + i * (base > 900 ? 380 : 140) : 0)));
        // выплата после остановки барабанов (если ушли со страницы — всё равно засчитаем)
        if (payout) App.eco.add(payout, 'coins');
        if (jackpot) App.stats.inc('jackpotsWon');
        App.games.record('jackpot', b, payout);
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
        if (jackpot) {
          App.sfx.play('bigwin');
          App.fx.confetti({ count: 320 });
          $('[data-jp]').classList.add('hit');
          ctx.after(2600, () => $('[data-jp]').classList.remove('hit'));
          out.innerHTML = `<span class="gold-text">👑 ДЖЕКПОТ! ${ui.cur(jackpot)} 👑</span>`;
          ui.toast(`<b>ДЖЕКПОТ!</b> ${ui.cur(jackpot)}`, 'gold', { icon: '🎰', timeout: 6000 });
          animatePool();
          renderMeta();
          setAuto(0);
        } else if (payout > b) {
          App.sfx.play(mult >= 20 ? 'bigwin' : 'win');
          if (mult >= 20) App.fx.confetti({ count: mult >= 50 ? 220 : 140 });
          out.innerHTML = `<span class="good">${count === 3 ? 'ТРИ В РЯД!' : 'Пара!'} ×${mult} → ${ui.cur(payout)}</span>`;
          if (mult >= 20) setAuto(0);
        } else if (payout > 0) {
          App.sfx.play('coin');
          out.innerHTML = `<span class="muted">×${mult} — вернулось ${ui.cur(payout)}</span>`;
        } else {
          out.innerHTML = '<span class="muted">Мимо… ещё разок?</span>';
        }
        renderShare();
        if (auto > 0) {
          setAuto(auto - 1);
          if (auto > 0) ctx.after(App.anim.dur(450, 250) || 150, spin);
        }
      }

      host.addEventListener('click', (e) => {
        if (e.target.closest('[data-go]')) {
          spin();
          return;
        }
        const a = e.target.closest('[data-auto]');
        if (a) {
          App.sfx.play('soft');
          if (a.dataset.auto === 'stop') setAuto(0);
          else {
            setAuto(Number(a.dataset.auto));
            spin();
          }
        }
      });
      ctx.listen(document, 'keydown', (e) => {
        if (e.code !== 'Space' || e.target.closest('input, select, textarea') || ui.topModal()) return;
        e.preventDefault();
        spin();
      });
      ctx.on('levelup', () => {
        renderShare();
      });
      ctx.onDestroy(() => cancelAnimationFrame(poolAnim));
      drawStatic();
      renderShare();
      renderMeta();
    },
  });
})();
