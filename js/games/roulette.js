/* Мини-игра «Рулетка»: раунды по таймеру, ставки на цвет — как «дабл» на кейс-сайтах.
 * Сектора и множители — в data/config.js → games.roulette */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;
  const CFG = GAME_DATA.config;

  const REPEAT = 10; // сколько раз повторяется узор секторов в ленте
  const history = []; // id выпавших секторов (новые — в начале)

  // Узор ленты: редкие сектора — первыми, остальные чередуются (⭐ 🌸 🌙 🌸 🌙 …)
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

  const cfg = () => CFG.games.roulette || { bettingSeconds: 12, sectors: [] };
  const rtpOf = (s, n) => (s.mult * (s.count || 1)) / n;

  App.games.register({
    id: 'roulette',
    name: 'Рулетка',
    icon: '🎯',
    color: '#6366f1',
    short: 'Сакура, Луна или Звезда?',
    desc: 'Раунды каждые несколько секунд: ставь на цвет вместе с другими игроками. Звезда платит ×14!',
    get rules() {
      const secs = cfg().sectors;
      const n = secs.reduce((s, x) => s + (x.count || 1), 0);
      return `<p>Рулетка крутится раундами. Пока идёт отсчёт, делай ставки на один или несколько секторов.</p>
        <p>${secs.map((s) => `${s.icon} <b>${esc(s.name)}</b> — ${s.count || 1} из ${n} ячеек, выплата ×${s.mult}`).join('<br>')}</p>
        <p>Если покинуть игру во время отсчёта — ставки вернутся. Если во время прокрутки — результат всё равно засчитается.</p>`;
    },
    render(ctx, host) {
      const R = cfg();
      const sectors = R.sectors;
      const pattern = buildPattern(sectors);
      const N = pattern.length;
      const BET_MS = Math.max(3, R.bettingSeconds || 12) * 1000;
      const botWeights = (s) => (s.mult <= 2 ? 45 : 10);

      let phase = 'betting'; // betting | rolling | result
      let endsAt = Date.now() + BET_MS;
      let my = {}; // мои ставки по секторам
      let bots = [];
      let botsWanted = U.randInt(4, 11);
      let pos = 2 * N + U.randInt(0, N - 1); // индекс ячейки под указателем (дробный во время прокрутки)
      let result = null; // { idx, sector }
      let settled = true;
      let rollRaf = 0;
      let lastTile = Math.round(pos);

      host.innerHTML = `
        <div class="roul">
          <div class="roul-top">
            <div class="roul-status panel">
              <div class="roul-status-text" data-status></div>
              <div class="roul-timer"><i data-timebar></i></div>
            </div>
            <div class="roul-hist panel">
              <div class="roul-hist-dots" data-hist></div>
              <div class="roul-hist-sum muted small" data-histsum></div>
            </div>
          </div>
          <div class="roul-track panel" data-track>
            <div class="roul-strip" data-strip>${Array.from({ length: N * REPEAT }, (_, i) => {
              const s = pattern[i % N];
              return `<div class="rt${s.mult > 2 ? ' rt-gold' : ''}" style="--sc:${esc(s.color)}"><span>${s.icon}</span></div>`;
            }).join('')}</div>
            <div class="roul-marker"></div>
          </div>
          <div class="roul-controls panel">
            <div class="roul-bet" data-bet></div>
            <div class="roul-hint muted small">Выбери сумму и нажми на сектор — можно ставить на несколько.<br>Ставки: <b data-mytotal>0</b></div>
            <button class="btn btn-ghost btn-sm" data-skip hidden>⏩ Не ждать</button>
          </div>
          <div class="roul-cols">${sectors
            .map(
              (s) => `<div class="roul-col" data-col="${esc(s.id)}" style="--sc:${esc(s.color)}">
                <button class="roul-place" data-place="${esc(s.id)}"><span class="rp-ico">${s.icon}</span><span class="rp-name">${esc(s.name)}</span><b>×${s.mult}</b></button>
                <div class="roul-my" data-my="${esc(s.id)}"></div>
                <div class="roul-sum"><span data-cnt="${esc(s.id)}"></span><b data-total="${esc(s.id)}"></b></div>
                <div class="roul-list" data-list="${esc(s.id)}"></div>
              </div>`
            )
            .join('')}</div>
        </div>`;

      const $ = (s) => host.querySelector(s);
      const strip = $('[data-strip]');
      const track = $('[data-track]');
      const tiles = Array.from(strip.children);
      const bet = App.widgets.betInput($('[data-bet]'), { key: 'roulette' });
      const sectorById = (id) => sectors.find((s) => s.id === id);
      const myTotal = () => Object.values(my).reduce((a, b) => a + b, 0);

      /* ---------- лента ---------- */
      function geom() {
        const cs = getComputedStyle(track);
        const tile = parseFloat(cs.getPropertyValue('--tile')) || 80;
        const gap = parseFloat(cs.getPropertyValue('--gap')) || 6;
        return { tile, step: tile + gap, w: track.clientWidth };
      }
      function draw() {
        const g = geom();
        const x = g.w / 2 - (pos * g.step + g.tile / 2);
        strip.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
      }
      // Сдвигаем позицию на целое число узоров, чтобы лента не кончалась (визуально ничего не меняется)
      function normalize() {
        const shift = Math.floor(pos / N) - 2;
        if (shift) pos -= shift * N;
      }

      /* ---------- интерфейс ---------- */
      function renderHist() {
        $('[data-hist]').innerHTML = history
          .slice(0, 16)
          .map((id) => {
            const s = sectorById(id);
            return s ? `<span class="rh-dot" style="--sc:${esc(s.color)}" title="${esc(s.name)}">${s.icon}</span>` : '';
          })
          .join('') || '<span class="muted small">Раундов ещё не было</span>';
        const last = history.slice(0, 100);
        $('[data-histsum]').innerHTML = last.length
          ? `Последние ${last.length}: ` + sectors.map((s) => `${s.icon} ${last.filter((x) => x === s.id).length}`).join(' · ')
          : '';
      }

      function renderCols() {
        const youName = App.state.profile.name || 'Ты';
        sectors.forEach((s) => {
          const entries = bots.filter((b) => b.sid === s.id).map((b) => ({ name: b.name, amount: b.amount, you: false }));
          if (my[s.id]) entries.push({ name: youName, amount: my[s.id], you: true });
          entries.sort((a, b) => b.you - a.you || b.amount - a.amount);
          const total = entries.reduce((a, e) => a + e.amount, 0);
          const won = phase === 'result' && result && result.sector.id === s.id;
          const lost = phase === 'result' && result && result.sector.id !== s.id;
          const col = $(`[data-col="${s.id}"]`);
          col.classList.toggle('won', !!won);
          col.classList.toggle('lost', !!lost);
          $(`[data-cnt="${s.id}"]`).textContent = `${entries.length} ${U.plural(entries.length, ['ставка', 'ставки', 'ставок'])}`;
          $(`[data-total="${s.id}"]`).innerHTML = ui.cur(total);
          $(`[data-my="${s.id}"]`).innerHTML = my[s.id] ? `Твоя ставка: ${ui.cur(my[s.id])}` : '';
          const shown = entries.slice(0, 8);
          $(`[data-list="${s.id}"]`).innerHTML =
            shown
              .map(
                (e) => `<div class="rl-row${e.you ? ' you' : ''}">
                  ${e.you ? App.profile.avatarHtml('xs') : App.games.botAvatar(e.name, 'xs')}
                  <span class="rl-name">${esc(e.name)}</span>
                  <b class="${won ? 'good' : lost ? 'bad' : ''}">${won ? '+' + U.fmt(Math.floor(e.amount * s.mult)) : U.fmt(e.amount)}</b>
                </div>`
              )
              .join('') + (entries.length > shown.length ? `<div class="rl-more muted small">и ещё ${entries.length - shown.length}</div>` : '');
          col.querySelector('[data-place]').disabled = phase !== 'betting';
        });
        $('[data-mytotal]').innerHTML = ui.cur(myTotal());
        $('[data-skip]').hidden = !(phase === 'betting' && myTotal() > 0);
      }

      function renderStatus() {
        const st = $('[data-status]');
        const bar = $('[data-timebar]');
        if (phase === 'betting') {
          const left = Math.max(0, endsAt - Date.now());
          st.innerHTML = `Ставки принимаются · <b>${(left / 1000).toFixed(1)}</b> с`;
          bar.style.width = (left / BET_MS) * 100 + '%';
          bar.parentElement.classList.toggle('hurry', left < 3000);
        } else if (phase === 'rolling') {
          st.innerHTML = '<b>Крутим!</b> Ставки закрыты';
          bar.style.width = '0%';
        } else if (result) {
          const s = result.sector;
          const t = myTotal();
          const win = my[s.id] ? Math.floor(my[s.id] * s.mult) : 0;
          st.innerHTML = `Выпало: <b style="color:${esc(s.color)}">${s.icon} ${esc(s.name)}</b> ×${s.mult}${
            t ? (win > 0 ? ` · <span class="good">твой выигрыш ${ui.cur(win)}</span>` : ` · <span class="bad">ставка не сыграла</span>`) : ''
          }`;
          bar.style.width = '0%';
        }
      }

      /* ---------- раунды ---------- */
      function newRound() {
        phase = 'betting';
        endsAt = Date.now() + BET_MS;
        my = {};
        bots = [];
        botsWanted = U.randInt(4, 11);
        result = null;
        tiles.forEach((t) => t.classList.remove('win'));
        bet.disable(false);
        renderCols();
        renderStatus();
      }

      function botStep() {
        const left = endsAt - Date.now();
        if (bots.length >= botsWanted || left < 700) return;
        if (U.rand() > 0.16) return;
        const names = (CFG.bots || ['Bot']).filter((n) => !bots.some((b) => b.name === n));
        if (!names.length) return;
        const s = U.weighted(sectors, botWeights);
        bots.push({ name: U.pick(names), sid: s.id, amount: App.games.botBet() });
        renderCols();
      }

      function place(sid) {
        if (phase !== 'betting') return;
        const s = sectorById(sid);
        if (!s) return;
        const b = bet.take();
        if (b == null || !App.eco.spend(b, 'coins')) return;
        my[sid] = (my[sid] || 0) + b;
        settled = false;
        App.sfx.play('coin');
        const btn = $(`[data-place="${sid}"]`);
        if (btn) App.fx.burstAt(btn, [s.color, '#fff'], 12);
        renderCols();
      }

      // Выплата и учёт раунда (вызывается один раз: после прокрутки или при уходе со страницы)
      function settle() {
        if (settled || !result) return;
        settled = true;
        const t = myTotal();
        if (!t) return;
        const s = result.sector;
        const payout = my[s.id] ? Math.floor(my[s.id] * s.mult) : 0;
        if (payout) App.eco.add(payout, 'coins');
        if (payout && s.mult > 2) App.stats.inc('rouletteStars');
        App.games.record('roulette', t, payout);
      }

      function startRoll() {
        phase = 'rolling';
        bet.disable(true);
        const idx = U.randInt(0, N - 1);
        result = { idx, sector: pattern[idx] };
        // цель: ячейка с нужным узором на 4–5 оборотов впереди
        const base = Math.floor(pos) + 4 * N;
        let target = base - (base % N) + idx;
        if (target < base) target += N;
        target += U.randFloat(-0.36, 0.36);
        renderCols();
        renderStatus();
        App.sfx.play('whoosh');
        const dur = App.anim.dur(5600, 2300);
        const from = pos;
        const done = () => {
          pos = target;
          normalize();
          draw();
          lastTile = Math.round(pos);
          const t = tiles[Math.round(pos)];
          if (t) t.classList.add('win');
          finish();
        };
        if (!dur) return done();
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
            App.tick(1100 + (tile % N) * 30);
          }
          if (k < 1) rollRaf = requestAnimationFrame(frame);
          else done();
        };
        rollRaf = requestAnimationFrame(frame);
      }

      function finish() {
        phase = 'result';
        history.unshift(result.sector.id);
        if (history.length > 200) history.pop();
        const t = myTotal();
        const s = result.sector;
        const payout = my[s.id] ? Math.floor(my[s.id] * s.mult) : 0;
        settle();
        if (t) {
          if (payout > t) {
            App.sfx.play(s.mult > 2 ? 'bigwin' : 'win');
            if (s.mult > 2) App.fx.confetti({ count: 200 });
            else App.fx.burstAt(track, [s.color, '#fff'], 30);
          } else if (payout > 0) App.sfx.play('coin');
          else App.sfx.play('lose');
        } else App.sfx.play('tickLow');
        renderHist();
        renderCols();
        renderStatus();
        ctx.after(App.anim.dur(2800, 1800) || 1300, newRound);
      }

      /* ---------- события ---------- */
      host.addEventListener('click', (e) => {
        const p = e.target.closest('[data-place]');
        if (p) {
          place(p.dataset.place);
          return;
        }
        if (e.target.closest('[data-skip]') && phase === 'betting') {
          endsAt = Math.min(endsAt, Date.now() + 400);
          App.sfx.play('soft');
        }
      });
      ctx.every(100, () => {
        if (phase !== 'betting') return;
        botStep();
        if (Date.now() >= endsAt) startRoll();
        else renderStatus();
      });
      ctx.listen(window, 'resize', U.debounce(() => ctx.alive && draw(), 60));
      ctx.onDestroy(() => {
        cancelAnimationFrame(rollRaf);
        if (phase === 'betting') {
          // раунд не начался — возвращаем ставки
          const t = myTotal();
          if (t > 0) {
            App.eco.add(t, 'coins');
            ui.toast(`Рулетка: ставка ${ui.cur(t)} возвращена`, 'info', { icon: '🎯' });
          }
        } else settle();
      });

      draw();
      renderHist();
      renderCols();
      renderStatus();
      // RTP для любопытных (по секторам он одинаковый)
      host.querySelector('.roul-hint').title = 'Средний возврат: ' + sectors.map((s) => `${s.name} ${U.pct(rtpOf(s, N), 1)}`).join(', ');
    },
  });
})();
