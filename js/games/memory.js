/* Мини-игра «Мемори»: найди пары персонажей. Бесплатная, награда за первые победы дня */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const CFG = GAME_DATA.config;

  App.games.register({
    id: 'memory',
    name: 'Мемори',
    icon: '🧠',
    color: '#8b5cf6',
    short: 'Бесплатная игра на память',
    desc: 'Найди все пары персонажей. Без ставок — монеты за первые победы каждый день!',
    rules: `<p>Переворачивай карточки по две и ищи одинаковых персонажей.</p>
      <p>Чем меньше ходов — тем больше награда. Награда выдаётся за первые ${CFG.games.memory.dailyRewarded} побед в день.</p>`,
    render(ctx, host) {
      const M = CFG.games.memory;
      let modeId = App.state.lastBets.memoryMode || 'normal';
      let cards = [];
      let open = [];
      let lock = false;
      let moves = 0;
      let matched = 0;
      let started = 0;
      let finished = false;

      const mode = () => M.modes.find((m) => m.id === modeId) || M.modes[0];
      const limits = () => {
        const l = App.state.limits.memory;
        return l && l.date === U.todayKey() ? l : { date: U.todayKey(), n: 0 };
      };
      const rewardsLeft = () => Math.max(0, M.dailyRewarded - limits().n);

      host.innerHTML = `
        <div class="game-layout">
          <div class="game-panel panel">
            <div class="field"><span>Сложность</span><div class="chips">${M.modes.map((m) => `<button class="chip" data-mode="${m.id}">${m.name}</button>`).join('')}</div></div>
            <div class="mem-stats">
              <div><span>Ходы</span><b data-moves>0</b></div>
              <div><span>Время</span><b data-time>0:00</b></div>
              <div><span>Пары</span><b data-pairs>0</b></div>
            </div>
            <div class="game-info" data-info></div>
            <button class="btn btn-primary btn-xl btn-block" data-new>🔄 Новая игра</button>
          </div>
          <div class="game-stage panel mem-stage">
            <div class="mem-grid" data-grid></div>
          </div>
        </div>`;
      const $ = (s) => host.querySelector(s);

      function info() {
        const left = rewardsLeft();
        const m = mode();
        $('[data-info]').innerHTML = left
          ? `Награда за победу: до ${ui.cur(Math.round(m.reward * 1.5))}<br><span class="muted small">Наградных игр сегодня: ${left} из ${M.dailyRewarded}</span>`
          : '<span class="muted">Наградные игры на сегодня закончились — но играть можно сколько угодно!</span>';
        host.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('active', b.dataset.mode === modeId));
      }
      function stats() {
        $('[data-moves]').textContent = moves;
        $('[data-pairs]').textContent = `${matched}/${cards.length / 2}`;
        const s = started ? Math.floor((Date.now() - started) / 1000) : 0;
        $('[data-time]').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      }

      function newGame() {
        if (!App.data.chars.length) {
          $('[data-grid]').innerHTML = ui.empty('🧠', 'Нет персонажей', 'Добавь персонажей в data/characters.js');
          return;
        }
        const m = mode();
        const pairs = (m.cols * m.rows) / 2;
        let pool = App.data.chars.filter((c) => App.inv.discovered(c.id));
        if (pool.length < pairs) pool = App.data.chars.slice();
        const picked = U.shuffle(pool).slice(0, pairs);
        while (picked.length < pairs) picked.push(U.pick(App.data.chars));
        cards = U.shuffle(picked.concat(picked).map((c, i) => ({ cid: c.id, key: i % pairs, done: false })));
        // ключ пары — по id персонажа (на случай повторов)
        cards.forEach((c) => (c.key = c.cid));
        open = [];
        lock = false;
        moves = 0;
        matched = 0;
        started = 0;
        finished = false;
        const grid = $('[data-grid]');
        grid.style.setProperty('--cols', m.cols);
        grid.innerHTML = cards
          .map(
            (c, i) => `<button class="mem-card" data-i="${i}"><div class="mem-inner">
              <div class="mem-back">🌸</div>
              <div class="mem-front r-${App.data.getChar(c.cid).rarity}"><img src="${U.esc(App.art.portrait(c.cid))}" data-cid="${U.esc(c.cid)}" alt="" draggable="false"></div>
            </div></button>`
          )
          .join('');
        stats();
        info();
      }

      function flip(i) {
        const c = cards[i];
        if (lock || finished || c.done || open.includes(i)) return;
        if (!started) started = Date.now();
        const el = host.querySelector(`.mem-card[data-i="${i}"]`);
        el.classList.add('open');
        App.sfx.play('flip');
        open.push(i);
        if (open.length < 2) return;
        moves++;
        const [a, b] = open;
        if (cards[a].key === cards[b].key) {
          cards[a].done = cards[b].done = true;
          matched++;
          open = [];
          [a, b].forEach((k) => host.querySelector(`.mem-card[data-i="${k}"]`).classList.add('done'));
          App.sfx.play('gemTile');
          if (matched === cards.length / 2) win();
        } else {
          lock = true;
          ctx.after(750, () => {
            [a, b].forEach((k) => host.querySelector(`.mem-card[data-i="${k}"]`).classList.remove('open'));
            open = [];
            lock = false;
          });
        }
        stats();
      }

      function win() {
        finished = true;
        stats();
        const m = mode();
        const pairs = cards.length / 2;
        const perf = U.clamp(1.6 - (moves - pairs) / (pairs * 2), 0.4, 1.5);
        let reward = 0;
        if (rewardsLeft() > 0) {
          reward = Math.round(m.reward * perf);
          const l = limits();
          l.n += 1;
          App.state.limits.memory = l;
          App.eco.add(reward, 'coins');
        }
        App.games.record('memory', 0, reward, { win: true, xp: 10 + pairs * 3 });
        App.sfx.play('win');
        App.fx.confetti({ count: 120 });
        const secs = Math.floor((Date.now() - started) / 1000);
        ui.modal({
          size: 'sm',
          title: '🧠 Все пары найдены!',
          html: `<div class="center"><p>Ходов: <b>${moves}</b> · Время: <b>${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}</b></p>
            ${reward ? `<p>Награда: ${ui.cur(reward)}</p>` : '<p class="muted">Наградные игры на сегодня закончились</p>'}
            <p class="muted small">${perf >= 1.3 ? 'Феноменальная память! 🌟' : perf >= 0.9 ? 'Отличный результат!' : 'Можно лучше — попробуй ещё!'}</p></div>`,
          actions: [{ label: 'Сыграть ещё', cls: 'btn-primary', onClick: () => newGame() }],
        });
        info();
      }

      host.addEventListener('click', (e) => {
        const c = e.target.closest('.mem-card');
        if (c) return flip(Number(c.dataset.i));
        const m = e.target.closest('[data-mode]');
        if (m) {
          modeId = m.dataset.mode;
          App.state.lastBets.memoryMode = modeId;
          App.sfx.play('soft');
          newGame();
          return;
        }
        if (e.target.closest('[data-new]')) newGame();
      });
      ctx.every(1000, () => started && !finished && stats());
      newGame();
    },
  });
})();
