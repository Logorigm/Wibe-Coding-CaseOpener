/* Страница «Настройки»: звук, скорость анимаций, сохранение, режим разработчика */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;
  const CFG = GAME_DATA.config;

  const SPEEDS = [
    ['normal', 'Обычная'],
    ['fast', 'Быстрая'],
  ];

  const sw = (key) =>
    `<label class="switch-row"><input type="checkbox" data-set="${key}"${App.settings[key] ? ' checked' : ''}><span class="switch"></span></label>`;

  // старый код сохранения был в base64 — понимаем и его
  function decodeCode(code) {
    const t = String(code || '').trim();
    if (!t || t.startsWith('{')) return t;
    try {
      return decodeURIComponent(escape(atob(t)));
    } catch (e) {
      return t;
    }
  }

  // то же, что проверяет App.store.importSave, — но до вопроса «заменить прогресс?»
  function looksLikeSave(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return false;
    }
    const st = data && data.state ? data.state : data;
    return !!st && typeof st === 'object' && !Array.isArray(st) && 'inventory' in st && 'coins' in st;
  }

  async function importText(text) {
    if (!looksLikeSave(text)) {
      ui.toast('Это не похоже на сохранение', 'bad');
      return;
    }
    if (!(await ui.confirm('Текущий прогресс будет заменён. Продолжить?', { danger: true, ok: 'Заменить', title: 'Загрузить сохранение' }))) return;
    try {
      App.store.importSave(text);
    } catch (err) {
      ui.toast('Не получилось загрузить: ' + esc(err.message), 'bad');
    }
  }

  App.router.register('settings', {
    title: 'Настройки',
    nav: 'settings',
    render(ctx) {
      function devHtml() {
        return `<div class="set-row">
            <div class="set-text">
              <div class="set-label">Режим разработчика</div>
              <div class="set-desc">Открывает Конструктор: проверка данных и добавление персонажей и кейсов. В режиме разработчика открыты все разделы и кейсы.</div>
            </div>
            ${sw('devMode')}
          </div>
          ${App.settings.devMode ? `<a class="btn btn-secondary btn-sm set-dev-link" href="#/dev">${ui.svg('dev')}Открыть Конструктор</a>` : ''}`;
      }

      function render() {
        const S = App.settings;
        const vol = U.clamp(Number(S.volume) || 0, 0, 1);
        ctx.el.innerHTML = `
          <div class="page-head"><div><h1>Настройки</h1></div></div>

          <section class="panel set-panel">
            <h2 class="set-title">Звук</h2>
            <div class="set-row">
              <div class="set-text"><div class="set-label">Звуки в игре</div></div>
              ${sw('sound')}
            </div>
            <div class="set-row${S.sound ? '' : ' off'}" data-vol-row>
              <div class="set-text"><div class="set-label">Громкость</div></div>
              <input class="set-range" type="range" min="0" max="1" step="0.05" value="${vol}" data-set="volume" style="--p:${(vol * 100).toFixed(0)}%"${S.sound ? '' : ' disabled'} aria-label="Громкость">
            </div>
          </section>

          <section class="panel set-panel">
            <h2 class="set-title">Анимации</h2>
            <div class="set-row set-row-stack">
              <div class="set-text">
                <div class="set-label">Скорость</div>
                <div class="set-desc">Быстрая — короче прокрутка кейсов и игр</div>
              </div>
              <div class="chips set-speed">${SPEEDS.map(
                ([v, l]) => `<button class="chip${S.animSpeed === v ? ' active' : ''}" data-speed="${v}">${l}</button>`
              ).join('')}</div>
            </div>
          </section>

          <section class="panel set-panel">
            <h2 class="set-title">Сохранение</h2>
            <p class="set-desc">Сделай копию, чтобы перенести прогресс на другое устройство или не потерять его.</p>
            <div class="set-btns">
              <button class="btn btn-secondary btn-sm" data-act="export">Скачать файл</button>
              <button class="btn btn-secondary btn-sm" data-act="import">Загрузить файл</button>
              <button class="btn btn-secondary btn-sm" data-act="copy">Скопировать код</button>
              <button class="btn btn-secondary btn-sm" data-act="paste">Вставить код</button>
            </div>
            <input type="file" accept=".json,application/json" data-file hidden>
          </section>

          <section class="panel set-panel" data-dev>${devHtml()}</section>

          <section class="panel set-panel set-danger">
            <div class="set-row set-row-stack">
              <div class="set-text">
                <div class="set-label">Сбросить прогресс</div>
                <div class="set-desc">Монеты, персонажи, уровень и достижения удалятся. Настройки останутся.</div>
              </div>
              <button class="btn btn-danger btn-sm" data-act="reset">Сбросить</button>
            </div>
          </section>

          <footer class="set-foot"><b>${esc(CFG.title)}</b><span>Прогресс хранится на этом устройстве</span></footer>`;
      }
      render();

      const paintRange = (r) => r.style.setProperty('--p', (Number(r.value) * 100).toFixed(0) + '%');

      ctx.listen(ctx.el, 'input', (e) => {
        if (e.target.dataset.set !== 'volume') return;
        App.settings.volume = Number(e.target.value);
        paintRange(e.target);
      });

      ctx.listen(ctx.el, 'change', async (e) => {
        const t = e.target;
        if (t.matches('[data-file]')) {
          const f = t.files && t.files[0];
          t.value = '';
          if (!f) return;
          let text;
          try {
            text = await U.readFile(f);
          } catch (err) {
            ui.toast('Не удалось прочитать файл', 'bad');
            return;
          }
          importText(text);
          return;
        }
        const key = t.dataset.set;
        if (!key) return;
        if (key === 'volume') {
          App.store.setSetting('volume', Number(t.value));
          App.sfx.play('click');
          return;
        }
        App.store.setSetting(key, t.checked);
        if (key === 'sound') {
          const row = ctx.el.querySelector('[data-vol-row]');
          row.classList.toggle('off', !t.checked);
          row.querySelector('input').disabled = !t.checked;
          if (t.checked) App.sfx.play('click');
        } else if (key === 'devMode') {
          App.sfx.play('click');
          ctx.el.querySelector('[data-dev]').innerHTML = devHtml();
        }
      });

      ctx.listen(ctx.el, 'click', async (e) => {
        const sp = e.target.closest('[data-speed]');
        if (sp) {
          if (App.settings.animSpeed === sp.dataset.speed) return;
          App.store.setSetting('animSpeed', sp.dataset.speed);
          ctx.el.querySelectorAll('[data-speed]').forEach((b) => b.classList.toggle('active', b === sp));
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
          if (await U.copy(App.store.exportSave())) ui.toast('Код сохранения скопирован', 'good');
          else ui.toast('Не удалось скопировать', 'bad');
        } else if (act === 'paste') {
          const code = await ui.prompt('Вставить код', '', {
            text: 'Вставь код сохранения, который ты скопировал раньше.',
            placeholder: 'Код сохранения',
            maxLength: 20000000,
            ok: 'Загрузить',
          });
          if (!code) return;
          importText(decodeCode(code));
        } else if (act === 'reset') {
          const ok = await ui.confirm('Весь прогресс будет удалён: монеты, персонажи, уровень и достижения. Это нельзя отменить.', {
            title: 'Сбросить прогресс?',
            danger: true,
            ok: 'Сбросить',
          });
          if (ok) App.store.reset();
        }
      });
    },
  });
})();
