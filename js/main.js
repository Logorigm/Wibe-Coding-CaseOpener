/* Запуск игры */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const CFG = GAME_DATA.config;

  function applyTheme() {
    const root = document.documentElement;
    root.dataset.accent = App.settings.accent || 'sakura';
    root.classList.toggle('reduce-motion', !!App.settings.reduceMotion);
  }

  function welcome() {
    const m = App.ui.modal({
      cls: 'welcome-modal',
      closable: false,
      html: `<div class="welcome">
        <div class="welcome-cards">${App.data.chars
          .slice()
          .sort((a, b) => b.r.index - a.r.index)
          .slice(0, 3)
          .map((c) => App.ui.card(c.id, { size: 'md', hideValue: true }))
          .join('')}</div>
        <h2>Добро пожаловать в <span class="grad-text">${U.esc(CFG.title)}</span>!</h2>
        <p class="muted">Открывай кейсы, собирай аниме-девочек всех редкостей, прокачивай уровень, играй в мини-игры и сражайся в батлах.</p>
        <ul class="welcome-list">
          <li>🎁 <b>Кейсы</b> — главный способ пополнить коллекцию</li>
          <li>✨ <b>Шайни</b> — редкие сияющие версии, стоят ×${CFG.shiny.valueMult}</li>
          <li>🏆 <b>Задания и достижения</b> — бесплатные награды каждый день</li>
          <li>🎮 <b>Мини-игры</b> — Джекпот, Коинфлип, Рулетка, Апгрейдер и Краш</li>
        </ul>
        <label class="field"><span>Как тебя зовут?</span><input class="input" id="welcomeName" maxlength="20" placeholder="Никнейм" value=""></label>
        <p class="small muted">Подсказка: в магазине работает промокод <b>WELCOME</b> 😉</p>
      </div>`,
      actions: [
        {
          label: 'Начать играть! 🌸',
          cls: 'btn-primary btn-lg btn-block',
          onClick: (mm) => {
            const name = mm.body.querySelector('#welcomeName').value.trim();
            if (name) App.state.profile.name = name.slice(0, 20);
            App.state.welcomed = true;
            App.store.save();
            App.bus.emit('profile');
            App.fx.confetti();
            App.sfx.play('win');
          },
        },
      ],
    });
    setTimeout(() => {
      const i = m.body.querySelector('#welcomeName');
      if (i) i.focus();
    }, 100);
  }

  function boot() {
    App.data.rebuild();
    applyTheme();
    App.fx.init();
    App.fx.petals(App.settings.petals);
    App.shell.init();
    App.feed.init();
    App.quests.ensure();
    App.ach.check();
    App.router.start();

    App.bus.on('settings', (s) => {
      if (s.key === 'accent' || s.key === 'reduceMotion' || !s.key) applyTheme();
      if (s.key === 'petals' || s.key === 'reduceMotion' || !s.key) App.fx.petals(App.settings.petals);
    });

    // время в игре
    setInterval(() => {
      if (!document.hidden) App.stats.inc('playTime', 60);
    }, 60000);

    // смена дня — новые задания
    let day = U.todayKey();
    setInterval(() => {
      if (U.todayKey() !== day) {
        day = U.todayKey();
        App.quests.ensure();
        App.bus.emit('badges');
        App.bus.emit('newday');
      }
    }, 30000);

    const errors = App.data.warnings.filter((w) => w.level === 'error');
    if (errors.length) {
      console.warn('[WaifuDrop] Ошибки в данных:', errors.map((w) => w.msg));
      App.ui.toast(`В данных игры ${errors.length} ${U.plural(errors.length, ['ошибка', 'ошибки', 'ошибок'])}. Подробности — в «Конструктор → Проверка данных».`, 'bad', {
        timeout: 7000,
        onClick: () => {
          App.store.setSetting('devMode', true);
          App.router.go('dev');
        },
      });
    }
    if (!App.store.available) App.ui.toast('Браузер не даёт сохранять прогресс (localStorage недоступен)', 'bad', { timeout: 8000 });

    if (!App.state.welcomed) setTimeout(welcome, 300);
    document.body.classList.add('ready');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
