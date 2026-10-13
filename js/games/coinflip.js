/* Мини-игра «Коинфлип»: дуэль один на один — выбираешь сторону, соперник ставит столько же,
 * победитель забирает банк (за вычетом комиссии). Выплата — data/config.js → games.coinflip.payout */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;
  const CFG = GAME_DATA.config;

  const SIDES = {
    sakura: { name: 'Сакура', icon: '🌸' },
    moon: { name: 'Луна', icon: '🌙' },
  };
  const other = (s) => (s === 'sakura' ? 'moon' : 'sakura');
  const history = []; // { side, win }

  App.games.register({
    id: 'coinflip',
    name: 'Коинфлип',
    icon: '🌗',
    color: '#fbbf24',
    short: 'Дуэль 50 на 50',
    desc: 'Дуэль один на один: выбери сторону монеты, соперник ставит столько же. Победитель забирает банк!',
    get rules() {
      const k = CFG.games.coinflip.payout;
      return `<p>Выбери сторону — 🌸 Сакура или 🌙 Луна — и сделай ставку. Соперник займёт другую сторону и поставит столько же.</p>
        <p>Монетка решает: победитель забирает банк — ставка × <b>${k}</b> (комиссия ${U.pct(1 - k / 2, 0)}).</p>
        <p class="muted">Пробел — новая дуэль.</p>`;
    },
    render(ctx, host) {
      const payoutMult = CFG.games.coinflip.payout;
      let side = App.state.lastBets.coinSide || 'sakura';
      let busy = false;
      let rot = 0;
      let streak = 0;
      host.innerHTML = `
        <div class="game-layout">
          <div class="game-panel panel">
            <div data-bet></div>
            <div class="field"><span>Твоя сторона</span>
              <div class="side-pick">${Object.keys(SIDES).map((k) => `<button class="side-btn${k === side ? ' active' : ''}" data-side="${k}"><span>${SIDES[k].icon}</span>${SIDES[k].name}</button>`).join('')}</div>
            </div>
            <button class="btn btn-primary btn-xl btn-block" data-go>⚔️ Начать дуэль</button>
            <div class="game-info">
              <span>Выигрыш: ставка × <b>${payoutMult}</b></span>
              <span>Серия побед: <b data-streak>0</b></span>
            </div>
          </div>
          <div class="game-stage panel coin-stage">
            <div class="cf-duel">
              <div class="cf-player" data-me></div>
              <div class="coin-wrap"><div class="coin" data-coin>
                <div class="coin-face coin-front">🌸</div>
                <div class="coin-face coin-back">🌙</div>
              </div></div>
              <div class="cf-player" data-opp></div>
            </div>
            <div class="coin-result" data-result>Выбери сторону и начни дуэль!</div>
            <div class="coin-hist" data-hist></div>
          </div>
        </div>`;
      const $ = (s) => host.querySelector(s);
      const bet = App.widgets.betInput($('[data-bet]'), { key: 'coinflip' });

      function playerHtml(o) {
        const s = SIDES[o.side];
        return `<div class="cf-ava">${o.avatar}<span class="cf-side">${s.icon}</span></div>
          <b class="cf-name">${esc(o.name)}</b>
          <span class="cf-bet">${o.bet ? ui.cur(o.bet) : '<span class="muted">—</span>'}</span>`;
      }
      function renderPlayers(opp, stake) {
        const me = $('[data-me]');
        me.innerHTML = playerHtml({ avatar: App.profile.avatarHtml('lg'), name: App.state.profile.name || 'Ты', side, bet: stake });
        me.className = 'cf-player me side-' + side;
        const op = $('[data-opp]');
        op.innerHTML = opp
          ? playerHtml({ avatar: App.games.botAvatar(opp.name, 'lg'), name: opp.name, side: other(side), bet: stake })
          : `<div class="cf-ava cf-wait"><span class="avatar lg"><span class="avatar-letter">?</span></span><span class="cf-side">${SIDES[other(side)].icon}</span></div><b class="cf-name muted">Соперник</b><span class="cf-bet muted">ждёт ставку</span>`;
        op.className = 'cf-player opp side-' + other(side) + (opp ? '' : ' waiting');
      }
      function renderHist() {
        $('[data-hist]').innerHTML = history.map((h) => `<span class="ch-dot ${h.side}${h.win ? ' won' : ''}" title="${h.win ? 'Победа' : 'Поражение'}">${SIDES[h.side].icon}</span>`).join('');
        $('[data-streak]').textContent = streak;
      }

      async function duel() {
        if (busy) return;
        const b = bet.take();
        if (b == null || !App.eco.spend(b, 'coins')) return;
        busy = true;
        bet.disable(true);
        $('[data-go]').disabled = true;
        host.querySelectorAll('[data-side]').forEach((x) => (x.disabled = true));
        const result = U.rand() < 0.5 ? 'sakura' : 'moon';
        const win = result === side;
        const payout = win ? Math.floor(b * payoutMult) : 0;
        const opp = { name: U.pick(CFG.bots || ['Bot']) };
        const coin = $('[data-coin]');
        coin.classList.remove('land');
        host.querySelectorAll('.cf-player').forEach((p) => p.classList.remove('winner', 'loser'));
        // ищем соперника
        renderPlayers(null, b);
        $('[data-result]').innerHTML = '<span class="muted">Ищем соперника…</span>';
        const wait = App.anim.dur(U.randInt(500, 1200), 250);
        if (wait) await U.sleep(wait);
        if (ctx.alive) {
          renderPlayers(opp, b);
          App.sfx.play('pop');
          $('[data-result]').innerHTML = `Банк: <b>${ui.cur(b * 2)}</b>`;
        }
        const dur = App.anim.dur(1800, 700);
        if (ctx.alive) {
          const base = rot - (rot % 360) + 360 * (dur ? 6 : 1);
          rot = base + (result === 'moon' ? 180 : 0);
          coin.style.transition = dur ? `transform ${dur}ms cubic-bezier(.2,.75,.25,1)` : 'none';
          coin.style.transform = `rotateY(${rot}deg)`;
          App.sfx.play('flip');
          if (dur) {
            const ticks = setInterval(() => ctx.alive && App.sfx.play('flip'), 220);
            await U.sleep(dur);
            clearInterval(ticks);
          }
        }
        // результат засчитывается, даже если ушли со страницы во время броска
        if (payout) App.eco.add(payout, 'coins');
        streak = win ? streak + 1 : 0;
        if (win) App.stats.max('coinflipStreakMax', streak);
        App.games.record('coinflip', b, payout);
        busy = false;
        history.unshift({ side: result, win });
        if (history.length > 16) history.pop();
        if (!ctx.alive) return;
        coin.classList.add('land');
        bet.disable(false);
        $('[data-go]').disabled = false;
        host.querySelectorAll('[data-side]').forEach((x) => (x.disabled = false));
        $('[data-me]').classList.add(win ? 'winner' : 'loser');
        $('[data-opp]').classList.add(win ? 'loser' : 'winner');
        renderHist();
        if (win) {
          App.sfx.play('win');
          App.fx.burstAt(coin, ['#fde68a', '#ff4fa3', '#fff'], 30);
          $('[data-result]').innerHTML = `<span class="good">${SIDES[result].icon} ${SIDES[result].name}! Ты забираешь ${ui.cur(payout)}${streak > 1 ? ` · серия ${streak} 🔥` : ''}</span>`;
        } else {
          App.sfx.play('lose');
          $('[data-result]').innerHTML = `<span class="bad">${SIDES[result].icon} ${SIDES[result].name}… Банк забирает ${esc(opp.name)}</span>`;
        }
      }

      host.addEventListener('click', (e) => {
        const s = e.target.closest('[data-side]');
        if (s && !busy) {
          side = s.dataset.side;
          App.state.lastBets.coinSide = side;
          host.querySelectorAll('[data-side]').forEach((x) => x.classList.toggle('active', x === s));
          App.sfx.play('soft');
          renderPlayers(null, 0);
          return;
        }
        if (e.target.closest('[data-go]')) duel();
      });
      ctx.listen(document, 'keydown', (e) => {
        if (e.code !== 'Space' || e.target.closest('input, select, textarea') || ui.topModal()) return;
        e.preventDefault();
        duel();
      });
      renderPlayers(null, 0);
      renderHist();
    },
  });
})();
