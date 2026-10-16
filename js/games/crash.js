/* Мини-игра «Краш»: множитель растёт — забери ставку, пока не случился обвал.
 * Параметры — data/config.js → games.crash */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const CFG = GAME_DATA.config;

  const history = []; // последние точки обвала (новые — в начале)

  App.games.register({
    id: 'crash',
    name: 'Краш',
    icon: 'trend',
    short: 'Забери ставку до обвала',
    get rules() {
      return `<p>Сделай ставку и нажми «Запустить». Множитель растёт с ×1.00.</p>
        <p>Нажми «Забрать» в любой момент — получишь ставку × текущий множитель.</p>
        <p>Если график обвалится раньше — ставка сгорает. Обвал может случиться когда угодно, даже сразу.</p>
        <p>Автовывод заберёт выигрыш сам на нужном множителе.</p>`;
    },
    render(ctx, host) {
      const C = CFG.games.crash;
      host.innerHTML = `
        <div class="game-layout">
          <div class="game-panel panel">
            <div data-bet></div>
            <button class="btn btn-primary btn-xl btn-block" data-go>Запустить</button>
            <label class="field crash-auto">
              <span>Автовывод</span>
              <span class="bet-input"><b class="crash-x">×</b><input type="number" inputmode="decimal" min="1.01" step="0.01" placeholder="выключен" data-auto value="${App.state.lastBets.crashAuto || ''}"></span>
            </label>
            <div class="game-note" data-info></div>
          </div>
          <div class="game-main">
            <div class="game-stage panel crash-stage" data-stage>
              <canvas data-canvas></canvas>
              <div class="crash-mult" data-mult>×1.00</div>
            </div>
            <div class="game-result" data-result>Сделай ставку и запускай</div>
            <div class="crash-hist" data-hist></div>
          </div>
        </div>`;
      const $ = (s) => host.querySelector(s);
      const bet = App.widgets.betInput($('[data-bet]'), { key: 'crash' });
      const canvas = $('[data-canvas]');
      const c2 = canvas.getContext('2d');
      const stage = $('[data-stage]');
      const goBtn = $('[data-go]');
      const autoInp = $('[data-auto]');

      // idle — ждём ставку; running — растёт; after — ставка уже забрана, график ещё летит; done — раунд окончен
      let state = 'idle';
      let stake = 0;
      let crashAt = 1;
      let cashed = 0;
      let t0 = 0;
      let raf = 0;
      let m = 1;
      let W = 0;
      let H = 0;
      let busy = false;
      let lockUntil = 0;

      const hold = (on) => {
        if (busy === on) return;
        busy = on;
        App.setBusy(on);
      };
      const multAt = (ms) => Math.exp((C.speed * ms) / 1000);
      const timeFor = (mult) => (Math.log(mult) / C.speed) * 1000;
      function crashPoint() {
        const r = U.rand();
        const v = Math.floor((100 * (1 - C.houseEdge)) / (1 - r)) / 100;
        return U.clamp(v, 1, C.maxMultiplier);
      }
      const autoValue = () => {
        const v = Number(autoInp.value);
        return v >= 1.01 ? v : 0;
      };
      let palette = null;
      const colors = () => {
        if (palette) return palette;
        const css = getComputedStyle(document.documentElement);
        const v = (n, d) => css.getPropertyValue(n).trim() || d;
        palette = { accent: v('--accent', '#ff5fa2'), good: v('--good', '#3ccf91'), bad: v('--bad', '#ff5f6d'), muted: v('--dim', '#6c6c7c') };
        return palette;
      };

      /* ---------- график ---------- */
      function resize() {
        if (!ctx.alive) return;
        const r = canvas.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        W = r.width;
        H = r.height;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        c2.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw(state === 'idle' ? 0 : elapsed());
      }
      let frozenT = 0;
      const elapsed = () => (state === 'done' ? frozenT : performance.now() - t0);

      function draw(t) {
        if (!W || !H) return;
        const col = colors();
        c2.clearRect(0, 0, W, H);
        const pad = { l: 44, r: 18, t: 18, b: 26 };
        const tMax = Math.max(8000, t * 1.15);
        const mNow = state === 'idle' ? 1 : multAt(t);
        const mMax = Math.max(2, mNow * 1.2);
        const X = (ms) => pad.l + (ms / tMax) * (W - pad.l - pad.r);
        const Y = (mult) => H - pad.b - ((mult - 1) / (mMax - 1)) * (H - pad.t - pad.b);
        // сетка
        c2.font = '700 11px Nunito, system-ui, sans-serif';
        c2.fillStyle = 'rgba(255,255,255,.35)';
        c2.strokeStyle = 'rgba(255,255,255,.06)';
        c2.lineWidth = 1;
        const stepM = mMax <= 3 ? 0.5 : mMax <= 6 ? 1 : mMax <= 15 ? 2 : Math.pow(10, Math.floor(Math.log10(mMax))) / 2;
        for (let v = 1; v <= mMax + 1e-9; v += stepM) {
          const y = Math.round(Y(v)) + 0.5;
          c2.beginPath();
          c2.moveTo(pad.l, y);
          c2.lineTo(W - pad.r, y);
          c2.stroke();
          c2.fillText('×' + (v % 1 ? v.toFixed(1) : v), 8, y + 4);
        }
        const stepT = tMax <= 12000 ? 2000 : tMax <= 30000 ? 5000 : 10000;
        for (let s = stepT; s < tMax; s += stepT) c2.fillText(s / 1000 + 'с', X(s) - 8, H - 8);
        if (state === 'idle') return;

        const crashed = state === 'done' && !cashed;
        const color = crashed ? col.bad : cashed ? col.good : col.accent;
        const N = 90;
        const pts = [];
        for (let i = 0; i <= N; i++) {
          const ms = (t * i) / N;
          pts.push([X(ms), Y(multAt(ms))]);
        }
        // мягкая заливка под линией
        c2.beginPath();
        c2.moveTo(pts[0][0], H - pad.b);
        pts.forEach((p) => c2.lineTo(p[0], p[1]));
        c2.lineTo(pts[N][0], H - pad.b);
        c2.closePath();
        c2.fillStyle = color.startsWith('#') ? U.rgba(color, 0.08) : 'rgba(255,255,255,.05)';
        c2.fill();
        // линия
        c2.beginPath();
        pts.forEach((p, i) => (i ? c2.lineTo(p[0], p[1]) : c2.moveTo(p[0], p[1])));
        c2.strokeStyle = color;
        c2.lineWidth = 3;
        c2.lineCap = 'round';
        c2.lineJoin = 'round';
        c2.stroke();
        // точка, где забрал
        if (cashed) {
          const tc = timeFor(cashed);
          if (tc <= t) {
            c2.fillStyle = col.good;
            c2.beginPath();
            c2.arc(X(tc), Y(cashed), 5, 0, Math.PI * 2);
            c2.fill();
          }
        }
        // кончик графика
        const tip = pts[N];
        c2.fillStyle = color;
        c2.beginPath();
        c2.arc(tip[0], tip[1], crashed ? 5 : 6, 0, Math.PI * 2);
        c2.fill();
        if (crashed) {
          c2.strokeStyle = color;
          c2.lineWidth = 2;
          c2.beginPath();
          c2.moveTo(tip[0] - 7, tip[1] - 7);
          c2.lineTo(tip[0] + 7, tip[1] + 7);
          c2.moveTo(tip[0] + 7, tip[1] - 7);
          c2.lineTo(tip[0] - 7, tip[1] + 7);
          c2.stroke();
        }
      }

      /* ---------- интерфейс ---------- */
      function setResult(html, cls) {
        const el = $('[data-result]');
        el.innerHTML = html;
        el.className = 'game-result' + (cls ? ' ' + cls : '');
      }
      function setMult(v, cls) {
        const el = $('[data-mult]');
        el.textContent = '×' + v.toFixed(2);
        el.className = 'crash-mult' + (cls ? ' ' + cls : '');
      }
      function info() {
        const el = $('[data-info]');
        if (state === 'running') el.innerHTML = `Ставка ${ui.cur(stake)}${autoValue() ? ` · автовывод ×${autoValue().toFixed(2)}` : ''}`;
        else el.innerHTML = 'Множитель растёт, пока не обвалится';
      }
      let btnMode = '';
      function updateBtn() {
        const running = state === 'running';
        if (running) {
          // каждый кадр меняем только сумму, а не всю кнопку
          if (btnMode !== 'cash') goBtn.innerHTML = `Забрать ${ui.cur(0)}`;
          const b = goBtn.querySelector('.cur b');
          if (b) b.textContent = U.fmt(Math.floor(stake * m));
        } else if (btnMode !== 'start') goBtn.textContent = 'Запустить';
        const mode = running ? 'cash' : 'start';
        if (btnMode === mode) return;
        btnMode = mode;
        goBtn.disabled = false;
        goBtn.className = `btn ${running ? 'btn-gold' : 'btn-primary'} btn-xl btn-block`;
        bet.disable(running);
        autoInp.disabled = running;
      }
      function renderHist() {
        $('[data-hist]').innerHTML = history
          .slice(0, 14)
          .map((v) => `<span class="crash-chip${v < 2 ? ' low' : v >= 10 ? ' high' : ''}">×${v.toFixed(2)}</span>`)
          .join('');
      }

      /* ---------- раунд ---------- */
      function start() {
        if (Date.now() < lockUntil) return;
        if (state === 'after') endRound();
        const b = App.games.charge(bet);
        if (b == null) return;
        const auto = autoValue();
        App.state.lastBets.crashAuto = auto || '';
        stake = b;
        cashed = 0;
        crashAt = crashPoint();
        state = 'running';
        t0 = performance.now();
        m = 1;
        hold(true);
        setMult(1);
        setResult('Растёт…', 'muted');
        App.sfx.play('whoosh');
        info();
        updateBtn();
        cancelAnimationFrame(raf);
        loop();
      }

      function loop() {
        if (!ctx.alive) return;
        const t = performance.now() - t0;
        m = multAt(t);
        const auto = autoValue();
        if (m >= crashAt) {
          m = crashAt;
          if (state === 'running' && auto && auto <= crashAt) cashout(auto);
          return crash();
        }
        if (state === 'running' && auto && m >= auto) cashout(auto);
        setMult(m, cashed ? 'good' : '');
        draw(t);
        if (state === 'running') updateBtn();
        raf = requestAnimationFrame(loop);
      }

      function cashout(at) {
        if (state !== 'running') return;
        cashed = Math.min(at || m, crashAt);
        const payout = Math.floor(stake * cashed);
        App.eco.add(payout);
        App.stats.max('crashBest', Math.floor(cashed * 100) / 100);
        App.games.record('crash', stake, payout);
        state = 'after';
        hold(false);
        App.sfx.play('cashout');
        setResult(`Забрал на ×${cashed.toFixed(2)}: <b class="good">${ui.cur(payout, { sign: true })}</b>`);
        lockUntil = Date.now() + 400;
        info();
        updateBtn();
      }

      // раунд окончен: график обвалился
      function crash() {
        cancelAnimationFrame(raf);
        const wasRunning = state === 'running';
        state = 'done';
        frozenT = timeFor(crashAt);
        setMult(crashAt, cashed ? 'good' : 'bad');
        draw(frozenT);
        if (wasRunning) {
          App.games.record('crash', stake, 0);
          hold(false);
          App.sfx.play('lose');
          App.fx.shake(stage);
          setResult(`Обвал на ×${crashAt.toFixed(2)} — ставка сгорела`, 'bad');
          lockUntil = Date.now() + 600;
        } else {
          App.sfx.play('tickLow');
          setResult(`Забрал на ×${cashed.toFixed(2)}: <b class="good">${ui.cur(Math.floor(stake * cashed), { sign: true })}</b> · обвал на ×${crashAt.toFixed(2)}`);
        }
        history.unshift(crashAt);
        if (history.length > 30) history.pop();
        renderHist();
        info();
        updateBtn();
      }

      // ставка уже забрана, а игрок запускает новый раунд — дорисовываем старый мгновенно
      function endRound() {
        cancelAnimationFrame(raf);
        history.unshift(crashAt);
        if (history.length > 30) history.pop();
        frozenT = performance.now() - t0;
        state = 'done';
        renderHist();
      }

      // «Забрать» сейчас: по множителю на этот момент (а не на последний кадр).
      // Если график к этому моменту уже обвалился — раунд заканчивается так же, как в loop().
      function cashNow() {
        if (state !== 'running') return;
        const cur = multAt(performance.now() - t0);
        const auto = autoValue();
        if (cur < crashAt) return cashout(auto && auto <= cur ? auto : cur);
        m = crashAt;
        if (auto && auto <= crashAt) cashout(auto);
        crash();
      }

      goBtn.addEventListener('click', () => {
        if (state === 'running') cashNow();
        else start();
      });
      autoInp.addEventListener('change', () => {
        const v = autoValue();
        autoInp.value = v ? v.toFixed(2) : '';
        App.state.lastBets.crashAuto = v || '';
        App.store.dirty();
      });
      ctx.listen(document, 'keydown', (e) => {
        if (e.code !== 'Space' || e.repeat || e.target.closest('input, select, textarea, button') || ui.topModal()) return;
        e.preventDefault();
        goBtn.click();
      });
      ctx.listen(window, 'resize', U.debounce(resize, 100));
      ctx.onDestroy(() => {
        cancelAnimationFrame(raf);
        // ставка уже забрана, график ещё летел — запоминаем точку обвала
        if (state === 'after') history.unshift(crashAt);
        if (history.length > 30) history.length = 30;
        hold(false);
      });
      // ушёл со страницы или закрыл вкладку во время роста — забираем по текущему множителю
      App.games.guard(
        ctx,
        () => {
          if (state !== 'running') return;
          cashNow();
          if (ctx.alive) return;
          if (cashed) ui.toast(`Краш: забрал на ×${cashed.toFixed(2)} — ${ui.cur(Math.floor(stake * cashed))}`, 'good');
          else ui.toast(`Краш: обвал на ×${crashAt.toFixed(2)}`, 'bad');
        },
        { unloadOnly: true }
      );

      requestAnimationFrame(resize);
      renderHist();
      info();
      updateBtn();
    },
  });
})();
