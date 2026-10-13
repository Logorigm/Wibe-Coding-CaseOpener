/* Мини-игра «Краш»: ракета летит, множитель растёт — забери выигрыш до взрыва */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const CFG = GAME_DATA.config;

  const history = [];

  App.games.register({
    id: 'crash',
    name: 'Краш',
    icon: '🚀',
    color: '#f43f5e',
    short: 'Забери выигрыш до взрыва',
    desc: 'Множитель растёт, пока ракета летит. Успей забрать ставку до того, как она взорвётся!',
    rules: `<p>Сделай ставку и запусти ракету. Множитель начинает расти с <b>×1.00</b>.</p>
      <p>Нажми <b>«Забрать»</b> в любой момент — выигрыш = ставка × текущий множитель.</p>
      <p>Если ракета взорвётся раньше — ставка сгорает. Взрыв может случиться в любой момент, даже сразу.</p>
      <p>Можно задать <b>автовывод</b> — игра заберёт выигрыш сама на нужном множителе.</p>
      <p class="muted">Пробел — запуск / забрать.</p>`,
    render(ctx, host) {
      const C = CFG.games.crash;
      host.innerHTML = `
        <div class="game-layout">
          <div class="game-panel panel">
            <div data-bet></div>
            <label class="field"><span>Автовывод (необязательно)</span><span class="bet-input"><b class="x-prefix">×</b><input type="number" min="1.01" step="0.01" placeholder="выкл" data-auto value="${App.state.lastBets.crashAuto || ''}"></span></label>
            <button class="btn btn-primary btn-xl btn-block" data-go>🚀 Запустить</button>
            <div class="game-info" data-info></div>
          </div>
          <div class="game-stage panel crash-stage" data-stage>
            <canvas data-canvas></canvas>
            <div class="crash-mult" data-mult>×1.00</div>
            <div class="crash-msg" data-msg>Сделай ставку и запускай ракету!</div>
          </div>
        </div>
        <div class="hist-chips" data-hist></div>`;
      const $ = (s) => host.querySelector(s);
      const bet = App.widgets.betInput($('[data-bet]'), { key: 'crash' });
      const canvas = $('[data-canvas]');
      const c2 = canvas.getContext('2d');
      const goBtn = $('[data-go]');
      let state = 'idle';
      let stake = 0;
      let crashAt = 1;
      let cashed = 0;
      let t0 = 0;
      let raf = 0;
      let m = 1;
      let W = 0;
      let H = 0;

      const multAt = (ms) => Math.exp((C.speed * ms) / 1000);
      const timeFor = (mult) => (Math.log(mult) / C.speed) * 1000;
      function crashPoint() {
        const r = U.rand();
        const v = Math.floor((100 * (1 - C.houseEdge)) / (1 - r)) / 100;
        return U.clamp(v, 1, C.maxMultiplier);
      }

      function resize() {
        const r = canvas.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        W = r.width;
        H = r.height;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        c2.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw(state === 'idle' ? 0 : performance.now() - t0);
      }

      function draw(t) {
        const css = getComputedStyle(document.documentElement);
        const accent = css.getPropertyValue('--accent').trim() || '#ff4fa3';
        c2.clearRect(0, 0, W, H);
        const pad = { l: 46, r: 20, t: 20, b: 28 };
        const tMax = Math.max(8000, t * 1.15);
        const mNow = state === 'idle' ? 1 : multAt(t);
        const mMax = Math.max(2, mNow * 1.25);
        const X = (ms) => pad.l + (ms / tMax) * (W - pad.l - pad.r);
        const Y = (mult) => H - pad.b - ((mult - 1) / (mMax - 1)) * (H - pad.t - pad.b);
        // сетка
        c2.font = '600 11px Nunito, sans-serif';
        c2.fillStyle = 'rgba(255,255,255,.45)';
        c2.strokeStyle = 'rgba(255,255,255,.07)';
        c2.lineWidth = 1;
        const stepM = mMax <= 3 ? 0.5 : mMax <= 6 ? 1 : mMax <= 15 ? 2 : Math.pow(10, Math.floor(Math.log10(mMax))) / 2;
        for (let v = 1; v <= mMax; v += stepM) {
          const y = Y(v);
          c2.beginPath();
          c2.moveTo(pad.l, y);
          c2.lineTo(W - pad.r, y);
          c2.stroke();
          c2.fillText('×' + (v % 1 ? v.toFixed(1) : v), 6, y + 4);
        }
        const stepT = tMax <= 12000 ? 2000 : tMax <= 30000 ? 5000 : 10000;
        for (let s = stepT; s < tMax; s += stepT) c2.fillText(s / 1000 + 'с', X(s) - 8, H - 8);
        if (state === 'idle') return;
        // кривая
        const crashed = state === 'crashed';
        const color = crashed ? '#f43f5e' : cashed ? '#34d399' : accent;
        const pts = [];
        const N = 80;
        for (let i = 0; i <= N; i++) {
          const ms = (t * i) / N;
          pts.push([X(ms), Y(multAt(ms))]);
        }
        const grad = c2.createLinearGradient(0, pad.t, 0, H - pad.b);
        grad.addColorStop(0, U.rgba(color.startsWith('#') ? color : '#ff4fa3', 0.35));
        grad.addColorStop(1, U.rgba(color.startsWith('#') ? color : '#ff4fa3', 0));
        c2.beginPath();
        c2.moveTo(pts[0][0], H - pad.b);
        pts.forEach((p) => c2.lineTo(p[0], p[1]));
        c2.lineTo(pts[pts.length - 1][0], H - pad.b);
        c2.closePath();
        c2.fillStyle = grad;
        c2.fill();
        c2.beginPath();
        pts.forEach((p, i) => (i ? c2.lineTo(p[0], p[1]) : c2.moveTo(p[0], p[1])));
        c2.strokeStyle = color;
        c2.lineWidth = 4;
        c2.lineCap = 'round';
        c2.stroke();
        // точка вывода
        if (cashed) {
          const tc = timeFor(cashed);
          if (tc <= t) {
            c2.fillStyle = '#34d399';
            c2.beginPath();
            c2.arc(X(tc), Y(cashed), 6, 0, Math.PI * 2);
            c2.fill();
          }
        }
        // ракета
        const tip = pts[pts.length - 1];
        const prev = pts[pts.length - 4] || pts[0];
        const ang = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]);
        c2.save();
        c2.translate(tip[0], tip[1]);
        c2.font = '30px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
        c2.textAlign = 'center';
        c2.textBaseline = 'middle';
        if (crashed) c2.fillText('💥', 0, 0);
        else {
          c2.rotate(ang + Math.PI / 4);
          c2.fillText('🚀', 0, 0);
        }
        c2.restore();
      }

      function setMsg(html, cls) {
        const el = $('[data-msg]');
        el.innerHTML = html;
        el.className = 'crash-msg ' + (cls || '');
      }
      function info() {
        const el = $('[data-info]');
        if (state === 'running' && !cashed) el.innerHTML = `Возможный выигрыш: <b>${ui.cur(Math.floor(stake * m))}</b>`;
        else if (cashed) el.innerHTML = `Выведено на ×${cashed.toFixed(2)}: <b class="good">${ui.cur(Math.floor(stake * cashed))}</b>`;
        else el.innerHTML = '';
      }
      function updateBtn() {
        if (state === 'idle') {
          goBtn.disabled = false;
          goBtn.className = 'btn btn-primary btn-xl btn-block';
          goBtn.innerHTML = '🚀 Запустить';
        } else if (state === 'running' && !cashed) {
          goBtn.disabled = false;
          goBtn.className = 'btn btn-gold btn-xl btn-block';
          goBtn.innerHTML = `Забрать ${ui.cur(Math.floor(stake * m))}`;
        } else {
          goBtn.disabled = true;
          goBtn.className = 'btn btn-ghost btn-xl btn-block';
          goBtn.innerHTML = cashed && state === 'running' ? '✓ Выведено, ждём…' : 'Ждём…';
        }
      }

      function start() {
        const b = bet.take();
        if (b == null) return;
        const autoVal = Number($('[data-auto]').value);
        App.state.lastBets.crashAuto = autoVal > 1 ? autoVal : '';
        if (!App.eco.spend(b, 'coins')) return;
        stake = b;
        cashed = 0;
        crashAt = crashPoint();
        state = 'running';
        bet.disable(true);
        t0 = performance.now();
        m = 1;
        $('[data-stage]').classList.remove('crashed', 'cashed');
        setMsg('');
        App.sfx.play('whoosh');
        loop();
      }

      function loop() {
        if (!ctx.alive) return;
        const t = performance.now() - t0;
        m = multAt(t);
        const auto = Number($('[data-auto]').value);
        if (m >= crashAt) {
          m = crashAt;
          if (!cashed && auto > 1 && auto <= crashAt) cashout(auto);
          return crash(timeFor(crashAt));
        }
        if (!cashed && auto > 1 && m >= auto) cashout(auto);
        $('[data-mult]').textContent = '×' + m.toFixed(2);
        draw(t);
        info();
        updateBtn();
        raf = requestAnimationFrame(loop);
      }

      function cashout(at) {
        if (state !== 'running' || cashed) return;
        cashed = Math.min(at || m, crashAt);
        const payout = Math.floor(stake * cashed);
        App.eco.add(payout, 'coins');
        App.games.record('crash', stake, payout);
        App.stats.max('crashBest', Math.floor(cashed * 100) / 100);
        App.sfx.play('cashout');
        $('[data-stage]').classList.add('cashed');
        App.fx.burstAt(goBtn, ['#34d399', '#fde68a', '#fff'], 30);
        ui.toast(`Забрал ×${cashed.toFixed(2)} → ${ui.cur(payout)}`, 'good', { icon: '🚀' });
        info();
        updateBtn();
      }

      function crash(t) {
        cancelAnimationFrame(raf);
        state = 'crashed';
        $('[data-mult]').textContent = '×' + crashAt.toFixed(2);
        draw(t);
        const stage = $('[data-stage]');
        stage.classList.add('crashed');
        App.sfx.play('explode');
        App.fx.shake(stage);
        if (!cashed) {
          App.games.record('crash', stake, 0);
          setMsg(`💥 Взрыв на ×${crashAt.toFixed(2)}`, 'bad');
        } else setMsg(`💥 Взрыв на ×${crashAt.toFixed(2)} — а ты успел забрать ×${cashed.toFixed(2)}! 😎`, 'good');
        history.unshift(crashAt);
        if (history.length > 24) history.pop();
        renderHist();
        info();
        updateBtn();
        ctx.after(1400, () => {
          state = 'idle';
          bet.disable(false);
          updateBtn();
        });
      }

      function renderHist() {
        $('[data-hist]').innerHTML = history.length
          ? '<span class="muted small">Последние:</span>' + history.map((v) => `<span class="hchip ${v < 2 ? 'h-low' : v < 10 ? 'h-mid' : 'h-high'}">×${v.toFixed(2)}</span>`).join('')
          : '';
      }

      goBtn.addEventListener('click', () => {
        if (state === 'idle') start();
        else if (state === 'running' && !cashed) cashout();
      });
      ctx.listen(document, 'keydown', (e) => {
        if (e.code !== 'Space' || e.target.closest('input, select, textarea') || ui.topModal()) return;
        e.preventDefault();
        goBtn.click();
      });
      ctx.listen(window, 'resize', U.debounce(resize, 100));
      ctx.onDestroy(() => {
        cancelAnimationFrame(raf);
        // ушёл со страницы во время полёта — автоматически забираем
        if (state === 'running' && !cashed) {
          const t = performance.now() - t0;
          const cur = multAt(t);
          if (cur < crashAt) {
            const payout = Math.floor(stake * cur);
            App.eco.add(payout, 'coins');
            App.games.record('crash', stake, payout);
            ui.toast(`🚀 Краш: авто-вывод на ×${cur.toFixed(2)} → ${ui.cur(payout)}`, 'good');
          } else {
            App.games.record('crash', stake, 0);
            ui.toast(`🚀 Ракета взорвалась на ×${crashAt.toFixed(2)}`, 'bad');
          }
        }
      });
      requestAnimationFrame(resize);
      renderHist();
      updateBtn();
    },
  });
})();
