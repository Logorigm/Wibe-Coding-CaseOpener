/* Страница «Настройки» */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;

  const ACCENTS = [
    ['sakura', 'Сакура', '#ff4fa3', '#8b5cf6'],
    ['violet', 'Фиалка', '#8b5cf6', '#22d3ee'],
    ['ocean', 'Океан', '#22d3ee', '#3b82f6'],
    ['gold', 'Закат', '#fbbf24', '#f97316'],
    ['mint', 'Мята', '#34d399', '#22d3ee'],
    ['crimson', 'Кармин', '#f43f5e', '#f97316'],
  ];

  const toggle = (key, label, desc) => `<label class="set-row">
    <div><div class="set-label">${label}</div>${desc ? `<div class="set-desc">${desc}</div>` : ''}</div>
    <span class="switch-row"><input type="checkbox" data-set="${key}"${App.settings[key] ? ' checked' : ''}><span class="switch"></span></span>
  </label>`;

  App.router.register('settings', {
    title: 'Настройки',
    render(ctx) {
      function render() {
        const S = App.settings;
        ctx.el.innerHTML = `
          <div class="page-head"><div><h1>Настройки</h1><p class="muted">Звук, анимации, оформление и управление сохранением</p></div></div>
          <div class="settings-grid">
            <section class="panel set-section">
              <h3>🔊 Звук</h3>
              ${toggle('sound', 'Звуки', 'Все звуки генерируются прямо в браузере')}
              <div class="set-row">
                <div><div class="set-label">Громкость</div></div>
                <input type="range" class="range" min="0" max="1" step="0.05" value="${S.volume}" data-set="volume">
              </div>
            </section>

            <section class="panel set-section">
              <h3>✨ Анимации и эффекты</h3>
              <div class="set-row">
                <div><div class="set-label">Скорость открытия кейсов</div><div class="set-desc">Также влияет на батлы и апгрейды</div></div>
                <select class="select" data-set="animSpeed">
                  ${[['normal', 'Обычная'], ['fast', 'Быстрая'], ['instant', 'Мгновенно']].map(([v, l]) => `<option value="${v}"${S.animSpeed === v ? ' selected' : ''}>${l}</option>`).join('')}
                </select>
              </div>
              ${toggle('particles', 'Конфетти и искры', 'Эффекты при редких выпадениях и победах')}
              ${toggle('petals', 'Лепестки сакуры', 'Падающие лепестки на фоне')}
              ${toggle('reduceMotion', 'Меньше движения', 'Отключает тряску, вспышки и фоновые анимации')}
              ${toggle('liveFeed', 'Лента дропов', 'Живая лента выпадений сверху')}
            </section>

            <section class="panel set-section">
              <h3>🎨 Оформление</h3>
              <div class="set-label">Цветовая тема</div>
              <div class="accents">${ACCENTS.map(
                ([id, name, a, b]) => `<button class="accent-opt${S.accent === id ? ' active' : ''}" data-accent="${id}" style="--a:${a};--b:${b}"><i></i><span>${name}</span></button>`
              ).join('')}</div>
            </section>

            <section class="panel set-section">
              <h3>🪙 Продажа</h3>
              <div class="set-row">
                <div><div class="set-label">Подтверждать продажу дороже</div><div class="set-desc">0 — никогда не спрашивать</div></div>
                <input class="input input-sm" type="number" min="0" step="100" value="${S.confirmSell}" data-set="confirmSell">
              </div>
            </section>

            <section class="panel set-section">
              <h3>💾 Сохранение</h3>
              <p class="set-desc">Прогресс хранится в этом браузере. Сделай резервную копию, чтобы перенести его на другое устройство.</p>
              <div class="btn-row">
                <button class="btn btn-ghost" data-act="export">⬇️ Скачать сохранение</button>
                <button class="btn btn-ghost" data-act="import">⬆️ Загрузить из файла</button>
                <button class="btn btn-ghost" data-act="copy">📋 Скопировать код</button>
                <button class="btn btn-ghost" data-act="paste">📥 Вставить код</button>
              </div>
              <input type="file" accept=".json,application/json" data-file hidden>
              <div class="danger-zone">
                <div><div class="set-label">Сбросить прогресс</div><div class="set-desc">Удалит всех персонажей, валюту и достижения. Настройки останутся.</div></div>
                <button class="btn btn-danger" data-act="reset">Сбросить</button>
              </div>
            </section>

            <section class="panel set-section">
              <h3>🛠️ Для разработчика</h3>
              ${toggle('devMode', 'Режим разработчика', 'Показывает «Конструктор» в меню: добавление персонажей и кейсов, проверка данных, читы для тестов')}
              ${S.devMode ? '<a class="btn btn-primary" href="#/dev">Открыть конструктор</a>' : ''}
            </section>

            <section class="panel set-section about">
              <h3>ℹ️ Об игре</h3>
              <p><b>${esc(GAME_DATA.config.title)}</b> — ${esc(GAME_DATA.config.subtitle || '')}.</p>
              <p class="set-desc">Персонажей: ${App.data.chars.length} · Кейсов: ${App.data.cases.length} · Достижений: ${App.ach.defs().length}</p>
              <p class="set-desc">Игра работает полностью в браузере, без сервера. Все шансы честные и видны на странице кейса.</p>
            </section>
          </div>`;
      }
      render();

      ctx.el.addEventListener('change', (e) => {
        const key = e.target.dataset.set;
        if (!key) return;
        let v;
        if (e.target.type === 'checkbox') v = e.target.checked;
        else if (e.target.type === 'range') v = Number(e.target.value);
        else if (e.target.type === 'number') v = Math.max(0, Number(e.target.value) || 0);
        else v = e.target.value;
        App.store.setSetting(key, v);
        App.sfx.play('click');
        if (key === 'devMode') render();
      });
      ctx.el.addEventListener('input', (e) => {
        if (e.target.dataset.set === 'volume') App.settings.volume = Number(e.target.value);
      });
      ctx.el.addEventListener('click', async (e) => {
        const ac = e.target.closest('[data-accent]');
        if (ac) {
          App.store.setSetting('accent', ac.dataset.accent);
          ctx.el.querySelectorAll('[data-accent]').forEach((x) => x.classList.toggle('active', x === ac));
          App.sfx.play('click');
          return;
        }
        const a = e.target.closest('[data-act]');
        if (!a) return;
        const act = a.dataset.act;
        if (act === 'export') {
          U.download(`waifudrop-save-${U.todayKey()}.json`, App.store.exportSave());
          ui.toast('Файл сохранения скачан', 'good');
        } else if (act === 'import') {
          ctx.el.querySelector('[data-file]').click();
        } else if (act === 'copy') {
          const code = btoa(unescape(encodeURIComponent(App.store.exportSave())));
          if (await U.copy(code)) ui.toast('Код сохранения скопирован в буфер обмена', 'good');
          else ui.toast('Не удалось скопировать', 'bad');
        } else if (act === 'paste') {
          const code = await ui.prompt('Вставь код сохранения', '', { maxLength: 10000000, placeholder: 'Код…', ok: 'Загрузить' });
          if (!code) return;
          try {
            const text = decodeURIComponent(escape(atob(code.trim())));
            if (await ui.confirm('Текущий прогресс будет заменён. Продолжить?', { danger: true, ok: 'Заменить' })) App.store.importSave(text);
          } catch (err) {
            ui.toast('Код повреждён: ' + esc(err.message), 'bad');
          }
        } else if (act === 'reset') {
          if (!(await ui.confirm('Точно сбросить ВЕСЬ прогресс? Это нельзя отменить.', { danger: true, ok: 'Сбросить' }))) return;
          if (!(await ui.confirm('Последний шанс! Все персонажи и валюта исчезнут.', { danger: true, ok: 'Да, сбросить всё' }))) return;
          App.store.reset();
        }
      });
      ctx.el.addEventListener('change', async (e) => {
        if (!e.target.matches('[data-file]')) return;
        const f = e.target.files[0];
        if (!f) return;
        try {
          const text = await U.readFile(f);
          if (await ui.confirm('Текущий прогресс будет заменён прогрессом из файла. Продолжить?', { danger: true, ok: 'Загрузить' })) App.store.importSave(text);
        } catch (err) {
          ui.toast('Ошибка: ' + esc(err.message), 'bad');
        }
        e.target.value = '';
      });
    },
  });
})();
