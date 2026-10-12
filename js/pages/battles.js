/* Батлы кейсов: открываешь те же кейсы, что и боты. Чей улов дороже — тот забирает всё. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;
  const CFG = GAME_DATA.config;

  const MODES = [
    [2, '1 на 1'],
    [3, '1 на 1 на 1'],
    [4, '4 игрока'],
  ];
  // настройки последнего батла (на время сессии)
  const last = { players: 2, crazy: false, rounds: [] };

  App.router.register('battles', {
    title: 'Батлы',
    minLevel: () => (CFG.unlocks && CFG.unlocks.battles) || 1,
    render(ctx) {
      const maxRounds = (CFG.battles && CFG.battles.maxRounds) || 10;
      const available = () => App.cases.list().filter((cs) => cs.price > 0 && cs.currency === 'coins' && !App.cases.isLocked(cs) && App.cases.availability(cs).ok && cs.pool.length);
      let running = null;

      function cost() {
        return last.rounds.reduce((s, id) => s + (App.data.getCase(id) ? App.data.getCase(id).price : 0), 0);
      }

      /* ---------------- настройка ---------------- */
      function renderSetup() {
        last.rounds = last.rounds.filter((id) => available().some((c) => c.id === id));
        const c = cost();
        ctx.el.innerHTML = `
          <div class="page-head"><div><h1>Батлы кейсов</h1><p class="muted">Открывай те же кейсы, что и соперники. ${last.crazy ? 'В безумном режиме побеждает самый <b>дешёвый</b> улов!' : 'У кого улов дороже — забирает всех персонажей!'}</p></div></div>
          <div class="battle-setup">
            <section class="panel">
              <h3>1. Режим</h3>
              <div class="chips">${MODES.map(([n, l]) => `<button class="chip${last.players === n ? ' active' : ''}" data-players="${n}">${l}</button>`).join('')}</div>
              <label class="switch-row mt"><input type="checkbox" data-crazy${last.crazy ? ' checked' : ''}><span class="switch"></span><span><b>Безумный режим</b> — побеждает самый дешёвый улов</span></label>
            </section>
            <section class="panel">
              <h3>2. Раунды <span class="muted small">(${last.rounds.length}/${maxRounds})</span></h3>
              <div class="battle-rounds">${
                last.rounds.length
                  ? last.rounds
                      .map((id, i) => {
                        const cs = App.data.getCase(id);
                        return `<div class="round-chip" style="--cc:${esc(cs.color)}">${ui.caseImg(cs)}<span>${i + 1}. ${esc(cs.name)}</span><button class="round-x" data-remove="${i}" title="Убрать">✕</button></div>`;
                      })
                      .join('')
                  : '<div class="muted">Добавь кейсы снизу — каждый кейс это один раунд</div>'
              }</div>
              ${last.rounds.length ? '<button class="btn btn-ghost btn-sm mt" data-act="clear">Очистить</button>' : ''}
            </section>
            <section class="panel battle-go">
              <div><div class="muted small">Стоимость участия</div><div class="battle-cost">${ui.cur(c)}</div>
              <div class="muted small">Соперники: ${last.players - 1} ${U.plural(last.players - 1, ['бот', 'бота', 'ботов'])}</div></div>
              <button class="btn btn-primary btn-xl" data-act="start" ${last.rounds.length ? '' : 'disabled'}>⚔️ Начать батл</button>
            </section>
          </div>
          <section class="section">
            <div class="section-head"><h2>Доступные кейсы</h2><span class="muted small">Нажми, чтобы добавить раунд</span></div>
            <div class="grid-cases compact">${available()
              .map((cs) => `<button class="case-card mini" data-add="${esc(cs.id)}" style="--cc:${esc(cs.color)}"><span class="case-glow"></span><div class="case-art">${ui.caseImg(cs)}</div><div class="case-name">${esc(cs.name)}</div><div class="case-price">${ui.cur(cs.price)}</div><span class="add-plus">+</span></button>`)
              .join('') || ui.empty('📦', 'Нет доступных кейсов', 'Батлы работают с кейсами за монеты')}</div>
          </section>`;
      }

      /* ---------------- запуск ---------------- */
      function start() {
        if (!last.rounds.length) return;
        const c = cost();
        if (!App.eco.spend(c, 'coins')) return;
        App.setBusy(true);
        const rounds = last.rounds.map((id) => App.data.getCase(id));
        const names = U.shuffle(CFG.bots || ['Bot']).slice(0, last.players - 1);
        const players = [{ you: true, name: App.state.profile.name, avatar: App.profile.avatarHtml('md') }].concat(
          names.map((n) => {
            const ch = App.data.chars.length ? U.pick(App.data.chars) : null;
            return {
              you: false,
              name: n,
              avatar: ch
                ? `<span class="avatar md"><img src="${esc(App.art.portrait(ch))}" data-cid="${esc(ch.id)}" alt=""></span>`
                : `<span class="avatar md"><span class="avatar-letter">${esc(n.charAt(0))}</span></span>`,
            };
          })
        );
        const drops = players.map(() => rounds.map((cs) => App.cases.roll(cs)));
        const totals = drops.map((list) => list.reduce((s, d) => s + App.data.value(d.cid, d.shiny), 0));
        const target = last.crazy ? Math.min(...totals) : Math.max(...totals);
        const tied = totals.map((t, i) => (t === target ? i : -1)).filter((i) => i >= 0);
        const winner = U.pick(tied);
        const won = winner === 0;
        let prize = [];
        // результат выдаётся сразу — анимация лишь показывает его
        if (won) {
          drops.forEach((list) => list.forEach((d) => prize.push(App.inv.add(d.cid, { shiny: d.shiny, source: 'battle' }))));
          App.stats.inc('battlesWon');
        }
        App.stats.inc('battlesPlayed');
        App.stats.inc('casesOpened', rounds.length);
        App.stats.inc('spentOnCases', c);
        rounds.forEach((cs) => App.stats.inc('case_' + cs.id));
        App.eco.addXp(rounds.reduce((s, cs) => s + App.cases.xpFor(cs), 0));
        App.store.dirty();
        running = { rounds, players, drops, totals, winner, won, prize, done: false, cost: c, pot: totals.reduce((a, b) => a + b, 0) };
        renderArena();
        play();
      }

      function renderArena() {
        const r = running;
        ctx.el.innerHTML = `
          <div class="arena">
            <div class="arena-head panel">
              <div class="arena-rounds">${r.rounds.map((cs, i) => `<div class="ar-case" data-ri="${i}" style="--cc:${esc(cs.color)}">${ui.caseImg(cs)}</div>`).join('')}</div>
              <div class="arena-status"><b data-status>Приготовились…</b><span class="muted small">${last.crazy ? '🤪 Безумный режим' : 'Обычный режим'} · Банк: <span data-pot>${ui.cur(0)}</span></span></div>
              <button class="btn btn-ghost btn-sm" data-act="skip">Пропустить ⏭</button>
            </div>
            <div class="arena-players cols-${r.players.length}">${r.players
              .map(
                (p, i) => `<div class="player${p.you ? ' you' : ''}" data-p="${i}">
                  <div class="pl-head">${p.avatar}<div class="pl-name"><b>${esc(p.name)}</b>${p.you ? '<small>Это ты</small>' : '<small>Бот</small>'}</div><div class="pl-total" data-total>${ui.cur(0)}</div></div>
                  <div class="pl-reel" data-reel></div>
                  <div class="pl-items" data-items></div>
                </div>`
              )
              .join('')}</div>
            <div class="arena-result panel" data-result hidden></div>
          </div>`;
      }

      async function play() {
        const r = running;
        const cols = Array.from(ctx.el.querySelectorAll('.player'));
        const run = [0, 0, 0, 0];
        let skip = false;
        r.skip = () => {
          skip = true;
          r.reels && r.reels.forEach((x) => x.skip());
        };
        for (let ri = 0; ri < r.rounds.length; ri++) {
          if (!ctx.alive) return;
          const cs = r.rounds[ri];
          ctx.el.querySelectorAll('.ar-case').forEach((el, i) => el.classList.toggle('active', i === ri));
          ctx.el.querySelector('[data-status]').textContent = `Раунд ${ri + 1} из ${r.rounds.length}: ${cs.name}`;
          const dur = skip ? 0 : App.anim.dur(3400, 1200);
          r.reels = cols.map((col, pi) => {
            const host = col.querySelector('[data-reel]');
            host.innerHTML = '';
            const reelHost = document.createElement('div');
            host.appendChild(reelHost);
            const reel = new App.Reel(reelHost, { vertical: true, size: 150, gap: 8 });
            const d = r.drops[pi][ri];
            const win = 26 + U.randInt(0, 3);
            reel.setItems(App.cases.strip(cs, d, win + 4, win));
            reel.center(2);
            reel.target = win;
            return reel;
          });
          if (dur) App.sfx.play('whoosh');
          await Promise.all(
            r.reels.map((reel, pi) => reel.spin(reel.target, { duration: dur, jitter: (U.rand() - 0.5) * 60, onTick: pi === 0 ? () => App.tick(1200) : null }))
          );
          if (!ctx.alive) return;
          let roundBest = 0;
          cols.forEach((col, pi) => {
            const d = r.drops[pi][ri];
            const ch = App.data.getChar(d.cid);
            roundBest = Math.max(roundBest, ch.r.index);
            run[pi] += App.data.value(d.cid, d.shiny);
            col.querySelector('[data-items]').insertAdjacentHTML('afterbegin', ui.card(d.cid, { size: 'xs', shiny: d.shiny }));
            ui.countTo(col.querySelector('[data-total] b'), run[pi], skip ? 0 : 500);
          });
          const potEl = ctx.el.querySelector('[data-pot] b');
          ui.countTo(potEl, run.reduce((a, b) => a + b, 0), skip ? 0 : 500);
          // лидер
          const lead = last.crazy ? Math.min(...run.slice(0, cols.length)) : Math.max(...run.slice(0, cols.length));
          cols.forEach((col, pi) => col.classList.toggle('leading', run[pi] === lead));
          if (!skip) {
            App.sfx.reveal(roundBest);
            await U.sleep(App.anim.dur(700, 300));
          }
        }
        finish();
      }

      function finish() {
        const r = running;
        if (!r || r.done) return;
        r.done = true;
        App.setBusy(false);
        if (!ctx.alive) return;
        const cols = Array.from(ctx.el.querySelectorAll('.player'));
        cols.forEach((col, pi) => {
          col.classList.remove('leading');
          col.classList.toggle('winner', pi === r.winner);
          col.classList.toggle('loser', pi !== r.winner);
          const tb = col.querySelector('[data-total] b');
          if (tb) tb.textContent = U.fmt(r.totals[pi]);
        });
        const potEl = ctx.el.querySelector('[data-pot] b');
        if (potEl) potEl.textContent = U.fmt(r.pot);
        ctx.el.querySelector('[data-status]').textContent = 'Батл завершён!';
        const skipBtn = ctx.el.querySelector('[data-act="skip"]');
        if (skipBtn) skipBtn.remove();
        const res = ctx.el.querySelector('[data-result]');
        res.hidden = false;
        if (r.won) {
          App.sfx.play('bigwin');
          App.fx.confetti({ count: 180 });
          res.className = 'arena-result panel win';
          res.innerHTML = `<div class="ar-title">🏆 Победа!</div>
            <div>Ты забираешь всех персонажей на сумму ${ui.cur(r.pot)} <span class="muted">(вложено ${ui.cur(r.cost)})</span></div>
            <div class="btn-row center"><button class="btn btn-gold" data-act="loot">Посмотреть добычу</button><button class="btn btn-primary" data-act="again">Повторить батл (${ui.cur(r.cost)})</button><button class="btn btn-ghost" data-act="new">Новый батл</button></div>`;
        } else {
          App.sfx.play('lose');
          res.className = 'arena-result panel lose';
          res.innerHTML = `<div class="ar-title">😿 Поражение</div>
            <div>Победил <b>${esc(r.players[r.winner].name)}</b> с уловом ${ui.cur(r.totals[r.winner])}</div>
            <div class="btn-row center"><button class="btn btn-primary" data-act="again">Реванш (${ui.cur(r.cost)})</button><button class="btn btn-ghost" data-act="new">Новый батл</button></div>`;
        }
      }

      ctx.el.addEventListener('click', (e) => {
        const t = e.target;
        const pl = t.closest('[data-players]');
        if (pl) {
          last.players = Number(pl.dataset.players);
          App.sfx.play('soft');
          renderSetup();
          return;
        }
        const add = t.closest('[data-add]');
        if (add) {
          if (last.rounds.length >= maxRounds) return ui.toast(`Максимум ${maxRounds} раундов`, 'bad');
          last.rounds.push(add.dataset.add);
          App.sfx.play('pop');
          renderSetup();
          return;
        }
        const rm = t.closest('[data-remove]');
        if (rm) {
          last.rounds.splice(Number(rm.dataset.remove), 1);
          App.sfx.play('soft');
          renderSetup();
          return;
        }
        const a = t.closest('[data-act]');
        if (!a) {
          const card = t.closest('.pl-items .ccard');
          if (card) ui.showChar(card.dataset.cid);
          return;
        }
        const act = a.dataset.act;
        if (act === 'start' || act === 'again') {
          running = null;
          start();
        } else if (act === 'clear') {
          last.rounds = [];
          renderSetup();
        } else if (act === 'new') {
          running = null;
          renderSetup();
        } else if (act === 'skip' && running && running.skip) running.skip();
        else if (act === 'loot' && running) ui.dropModal(running.prize, { title: 'Добыча с батла!' });
      });
      ctx.el.addEventListener('change', (e) => {
        if (e.target.matches('[data-crazy]')) {
          last.crazy = e.target.checked;
          renderSetup();
        }
      });
      ctx.onDestroy(() => {
        if (running && !running.done) {
          running.done = true;
          App.setBusy(false);
          ui.toast(running.won ? `⚔️ Батл выигран! Добыча ${ui.cur(running.pot)} уже в инвентаре` : `⚔️ Батл проигран — победил ${esc(running.players[running.winner].name)}`, running.won ? 'good' : 'bad', { timeout: 5000 });
        }
      });
      renderSetup();
    },
  });
})();
