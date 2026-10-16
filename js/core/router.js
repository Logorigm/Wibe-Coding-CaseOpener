/* Простой hash-роутер: #/страница/параметр */
(function () {
  'use strict';
  const App = window.App;

  function makeCtx(el, params, name) {
    const offs = [];
    const ctx = {
      el,
      params,
      name,
      alive: true,
      on(evt, fn) {
        offs.push(App.bus.on(evt, fn));
      },
      every(ms, fn) {
        const id = setInterval(() => ctx.alive && fn(), ms);
        offs.push(() => clearInterval(id));
        return id;
      },
      after(ms, fn) {
        const id = setTimeout(() => ctx.alive && fn(), ms);
        offs.push(() => clearTimeout(id));
        return id;
      },
      listen(target, evt, fn, opt) {
        target.addEventListener(evt, fn, opt);
        offs.push(() => target.removeEventListener(evt, fn, opt));
      },
      onDestroy(fn) {
        offs.push(fn);
      },
      destroy() {
        ctx.alive = false;
        offs.reverse().forEach((f) => {
          try { f(); } catch (e) { console.error(e); }
        });
        offs.length = 0;
      },
    };
    return ctx;
  }

  const R = {
    pages: {},
    ctx: null,
    current: null,
    register(name, def) {
      R.pages[name] = def;
    },
    go(path) {
      const h = '#/' + path;
      if (location.hash === h) R.render();
      else location.hash = h;
    },
    parse() {
      const h = location.hash.replace(/^#\/?/, '');
      const parts = h.split('/').filter(Boolean).map((p) => {
        try { return decodeURIComponent(p); } catch (e) { return p; }
      });
      return { name: parts[0] || 'cases', params: parts.slice(1) };
    },
    render() {
      let { name, params } = R.parse();
      let def = R.pages[name];
      if (!def) {
        name = 'cases';
        def = R.pages.cases;
      }
      if (R.ctx) R.ctx.destroy();
      const view = document.getElementById('view');
      const el = document.createElement('div');
      el.className = 'page page-' + name;
      view.replaceChildren(el);
      const ctx = makeCtx(el, params, name);
      R.ctx = ctx;
      R.current = name;
      // раздел, который открывается с уровнем (def.feature — id из config.features)
      const feature = typeof def.feature === 'function' ? def.feature(ctx) : def.feature;
      if (feature && !App.features.unlocked(feature)) {
        const f = App.features.get(feature);
        el.innerHTML = `<div class="locked-page">
          ${App.ui.svg('lock')}
          <h2>${App.utils.esc((f && f.name) || def.title || 'Раздел')} — с ${f ? f.level : '?'} уровня</h2>
          <p class="muted">Открывай кейсы, чтобы получать опыт.</p>
          <a class="btn btn-primary" href="#/cases">К кейсам</a>
        </div>`;
      } else {
        if (feature) App.features.markSeen(feature);
        try {
          def.render(ctx);
        } catch (e) {
          console.error(e);
          el.innerHTML = `<div class="panel error-box"><h2>Ой! Ошибка на странице</h2><pre>${App.utils.esc(e && e.stack ? e.stack : String(e))}</pre></div>`;
        }
      }
      const title = typeof def.title === 'function' ? def.title(ctx) : def.title;
      document.title = (title ? title + ' — ' : '') + GAME_DATA.config.title;
      App.bus.emit('route', { name, params, nav: def.nav || name });
      window.scrollTo(0, 0);
    },
    start() {
      window.addEventListener('hashchange', R.render);
      R.render();
    },
  };
  App.router = R;
})();
