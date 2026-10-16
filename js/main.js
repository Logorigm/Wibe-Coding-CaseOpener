/* Запуск игры */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;

  function boot() {
    App.data.rebuild();
    App.fx.init();
    App.shell.init();
    App.ach.check();
    App.router.start();

    // новый уровень мог открыть коллекцию и достижения — проверяем награды
    App.bus.on('levelup', () => {
      App.collection.check();
      App.ach.check();
    });

    // время в игре
    setInterval(() => {
      if (!document.hidden) App.stats.inc('playTime', 60);
    }, 60000);

    const errors = App.data.warnings.filter((w) => w.level === 'error');
    if (errors.length) {
      console.warn('[WaifuDrop] Ошибки в данных:', errors.map((w) => w.msg));
      App.ui.toast(`В данных игры ${errors.length} ${U.plural(errors.length, ['ошибка', 'ошибки', 'ошибок'])}. Подробности — в Конструкторе.`, 'bad', {
        timeout: 7000,
        onClick: () => {
          App.store.setSetting('devMode', true);
          App.router.go('dev');
        },
      });
    }
    if (!App.store.available) App.ui.toast('Браузер не даёт сохранять прогресс (localStorage недоступен)', 'bad', { timeout: 8000 });
    document.body.classList.add('ready');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
