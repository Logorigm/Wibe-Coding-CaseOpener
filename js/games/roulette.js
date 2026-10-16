/* Мини-игра «Рулетка»: ставишь на цвета и крутишь ленту. Без раундов и чужих ставок.
 * Сектора и множители — data/config.js → games.roulette.sectors */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;
  const CFG = GAME_DATA.config;

  const REPEAT = 10; // сколько раз узор повторяется в ленте
  const history = []; // id выпавших секторов (новые — в начале)

  // Узор ленты: редкие сектора первыми, остальные чередуются (звезда, розовый, фиолетовый, розовый, …)
  function buildPattern(sectors) {
    const rest = sectors.map((s) => ({ s, left: Math.max(1, s.count || 1) })).sort((a, b) => a.left - b.left);
    const out = [];
    while (rest.some((r) => r.left > 0)) {
      rest.forEach((r) => {
        if (r.left > 0) {
          out.push(r.s);
          r.left--;
        }
      });
    }
    return out;
  }
  const sectors = () => (CFG.games.roulette && CFG.games.roulette.sectors) || [];
  const isRare = (s) => s.mult > 2;

  App.games.register({
    id: 'roulette',
    name: 'Рулетка',
    icon: 'target',
    short: 'Ставь на цвет и крути',
    get rules() {
      const secs = sectors();
      const n = secs.reduce((a, s) => a + (s.count || 1), 0);
      return `<p>Нажимай на цвета, чтобы поставить на них сумму ставки. Можно ставить на несколько цветов сразу.</p>
        <p>${secs.map((s) => `<b style="color:${esc(s.color)}">${esc(s.name)}</b> — ${s.count || 1} из ${n} ячеек, выплата ×${s.mult}`).join('<br>')}</p>
        <p>Монеты списываются, когда нажимаешь «Крутить». Ставки остаются на столе — можно крутить снова.</p>`;
    },
    render(ctx, host) {
      const secs = sectors();
      const pattern = buildPattern(secs);
      const N = pattern.length;
      const byId = (id) => secs.find((s) => s.id === id);
      const my = {}; // ставки по секторам (ещё не списаны)
      let pos = 2 * N + U.randInt(0, N - 1); // ячейка под указателем (дробная во время прокрутки)
      let raf = 0;
      let pending = null;

      host.innerHTML = `
        <div class="game-layout">
          <div class="game-panel panel">
            <div data-bet></div>
            <button class="btn btn-primary btn-xl btn-block" data-go>Крутить</button>
            <button class="btn btn-secondary btn-sm btn-block" data-clear>Очистить ставки</button>
            <div class="game-note">Нажми на цвет, чтобы поставить на него</div>
          </div>
          <div class="game-main">
            <div class="game-stage panel rl-stage">
              <div class="rl-track" data-track>
                <div class="rl-strip" data-strip>${Array.from({ length: N * REPEAT }, (_, i) => {
                  const s = pattern[i % N];
                  return `<div class="rl-tile${isRare(s) ? ' rare' : ''}" style="--sc:${esc(s.color)}">${isRare(s) ? ui.svg('star') : ''}</div>`;
                }).join('')}</div>
                <div class="rl-marker"></div>
              </div>
              <div class="rl-hist" data-hist></div>
            </div>
            <div class="rl-sectors">${secs
              .map(
                (s) => `<button type="button" class="rl-sector" data-place="${esc(s.id)}" style="--sc:${esc(s.color)}">
                  <span class="rl-sec-name"><i class="rl-sw"></i><b>${esc(s.name)}</b></span>
                  <span class="rl-mult"><span class="rl-mult-l">выплата </span>×${s.mult}</span>
                  <span class="rl-my" data-my="${esc(s.id)}"></span>
                </button>`
              )
              .join('')}</div>
            <div class="game-result" data-result></div>
          </div>
        </div>`;

      const $ = (s) => host.querySelector(s);
      const strip = $('[data-strip]');
      const track = $('[data-track]');
      const tiles = Array.from(strip.children);
      const goBtn = $('[data-go]');
      const bet = App.widgets.betInput($('[data-bet]'), { key: 'roulette' });
      const total = () => Object.values(my).reduce((a, b) => a + b, 0);

      /* ---------- лента ---------- */
      function geom() {
        const cs = getComputedStyle(track);
        const tile = parseFloat(cs.getPropertyValue('--tile')) || 64;
        const gap = parseFloat(cs.getPropertyValue('--gap')) || 6;
        return { tile, step: tile + gap, w: track.clientWidth };
      }
      function draw() {
        const g = geom();
        const x = g.w / 2 - (pos * g.step + g.tile / 2);
        strip.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
      }
      // сдвигаем позицию на целое число узоров — визуально ничего не меняется, а лента не кончается
      function normalize() {
        const shift = Math.floor(pos / N) - 2;
        if (shift) pos -= shift * N;
      }

      /* ---------- интерфейс ---------- */
      function renderBets() {
        const spinning = !!pending;
        secs.forEach((s) => {
          const el = $(`[data-my="${s.id}"]`);
          el.innerHTML = my[s.id] ? ui.cur(my[s.id]) : '<span class="dim">нет ставки</span>';
          const btn = $(`[data-place="${s.id}"]`);
          btn.classList.toggle('has', !!my[s.id]);
          btn.disabled = spinning;
        });
        const t = total();
        goBtn.disabled = spinning;
        goBtn.innerHTML = t ? `Крутить · ${ui.cur(t)}` : 'Крутить';
        $('[data-clear]').disabled = spinning || !t;
        bet.disable(spinning);
      }
      function renderHist() {
        $('[data-hist]').innerHTML = history
          .slice(0, 15)
          .map((id) => {
            const s = byId(id);
            return s ? `<i class="rl-dot${isRare(s) ? ' rare' : ''}" style="--sc:${esc(s.color)}" title="${esc(s.name)}"></i>` : '';
          })
          .join('');
      }
      function setResult(html, cls) {
        const el = $('[data-result]');
        el.className = 'game-result' + (cls ? ' ' + cls : '');
        el.innerHTML = html;
      }

      function place(sid) {
        if (pending) return;
        const s = byId(sid);
        if (!s) return;
        const G = CFG.games;
        const v = bet.value;
        if (v < G.minBet) return ui.toast(`Минимальная ставка — ${U.fmt(G.minBet)}`, 'bad');
        if (v > G.maxBet) return ui.toast(`Максимальная ставка — ${U.fmt(G.maxBet)}`, 'bad');
        if (!App.eco.can(total() + v)) {
          App.sfx.play('error');
          return ui.toast('Недостаточно монет', 'bad');
        }
        my[sid] = (my[sid] || 0) + v;
        App.sfx.play('soft');
        renderBets();
      }

      function spin() {
        if (pending) return;
        const t = total();
        if (!t) {
          App.sfx.play('error');
          return ui.toast('Сначала нажми на цвет', 'info');
        }
        if (!App.eco.spend(t)) return;
        const stake = Object.assign({}, my);
        const idx = U.randInt(0, N - 1);
        const s = pattern[idx];
        const payout = stake[s.id] ? Math.floor(stake[s.id] * s.mult) : 0;
        const p = (pending = { done: false });
        p.settle = () => {
          if (p.done) return;
          p.done = true;
          if (payout) App.eco.add(payout);
          if (payout && isRare(s)) App.stats.inc('rouletteStars');
          App.games.record('roulette', t, payout);
          history.unshift(s.id);
          if (history.length > 50) history.pop();
          App.setBusy(false);
        };
        App.setBusy(true);
        tiles.forEach((el) => el.classList.remove('win'));
        track.classList.remove('done');
        setResult('Крутится…', 'muted');
        renderBets();

        // цель: ячейка нужного узора на 4–5 оборотов впереди, с небольшим смещением внутри ячейки
        const base = Math.floor(pos) + 4 * N;
        let target = base - (base % N) + idx;
        if (target < base) target += N;
        target += U.randFloat(-0.32, 0.32);
        const from = pos;
        const dur = App.anim.dur(4200, 1600);
        App.sfx.play('whoosh');

        const finish = () => {
          pos = target;
          normalize();
          draw();
          p.settle();
          pending = null;
          if (!ctx.alive) return;
          const tile = tiles[Math.round(pos)];
          if (tile) tile.classList.add('win');
          track.classList.add('done');
          renderHist();
          renderBets();
          const name = `<b style="color:${esc(s.color)}">${esc(s.name)}</b>`;
          if (payout > t) {
            App.sfx.play(isRare(s) ? 'bigwin' : 'win');
            if (isRare(s)) App.fx.confetti({ count: 120, colors: [s.color, '#ffffff'] });
            setResult(`Выпало: ${name} ×${s.mult} · выигрыш <b class="good">${ui.cur(payout, { sign: true })}</b>`);
          } else if (payout > 0) {
            App.sfx.play('coin');
            setResult(`Выпало: ${name} · вернулось ${ui.cur(payout)}`);
          } else {
            App.sfx.play('lose');
            setResult(`Выпало: ${name} · <span class="muted">ставка не сыграла</span>`);
          }
        };
        if (!dur) return finish();
        let lastTile = Math.round(pos);
        const t0 = performance.now();
        const frame = (now) => {
          if (!ctx.alive) return;
          const k = Math.min(1, (now - t0) / dur);
          const e = 1 - Math.pow(1 - k, 4);
          pos = from + (target - from) * e;
          draw();
          const tile = Math.round(pos);
          if (tile !== lastTile) {
            lastTile = tile;
            App.tick(1000 + (tile % N) * 25);
          }
          if (k < 1) raf = requestAnimationFrame(frame);
          else finish();
        };
        raf = requestAnimationFrame(frame);
      }

      host.addEventListener('click', (e) => {
        const p = e.target.closest('[data-place]');
        if (p) return place(p.dataset.place);
        if (e.target.closest('[data-go]')) return spin();
        if (e.target.closest('[data-clear]') && !pending) {
          Object.keys(my).forEach((k) => delete my[k]);
          App.sfx.play('soft');
          renderBets();
        }
      });
      ctx.listen(document, 'keydown', (e) => {
        if (e.code !== 'Space' || e.repeat || e.target.closest('input, select, textarea, button') || ui.topModal()) return;
        e.preventDefault();
        spin();
      });
      ctx.listen(window, 'resize', U.debounce(() => ctx.alive && draw(), 60));
      // ушёл во время прокрутки — результат всё равно засчитывается
      ctx.onDestroy(() => cancelAnimationFrame(raf));
      App.games.guard(ctx, () => pending && pending.settle());

      draw();
      requestAnimationFrame(() => ctx.alive && draw());
      renderHist();
      renderBets();
      const last = history.length ? byId(history[0]) : null;
      setResult(last ? `В прошлый раз: <b style="color:${esc(last.color)}">${esc(last.name)}</b>` : 'Поставь на цвет и крути', 'muted');
    },
  });
})();
