/* Оболочка: боковое меню (компьютер), нижнее меню (телефон), верхняя панель.
 * В меню видны только открытые разделы — новичок видит только кейсы и инвентарь. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const CFG = GAME_DATA.config;

  // feature — id раздела из config.features; раздел появляется в меню, когда открыт
  const NAV = [
    { id: 'cases', label: 'Кейсы', icon: 'cases', feature: 'cases' },
    { id: 'inventory', label: 'Инвентарь', icon: 'inventory', feature: 'inventory', badge: 'inventory' },
    { id: 'collection', label: 'Коллекция', icon: 'collection', feature: 'collection' },
    { id: 'games', label: 'Игры', icon: 'games', feature: 'upgrade', features: ['upgrade', 'crash', 'coinflip', 'roulette', 'jackpot'] },
    { id: 'profile', label: 'Профиль', icon: 'profile', feature: 'profile' },
  ];

  let sidebar, topbar, tabbar;
  let active = 'cases';

  const visible = () => NAV.filter((it) => App.features.unlocked(it.feature));
  const isNew = (it) => (it.features || [it.feature]).some((f) => App.features.isNew(f));

  function navLink(it, cls) {
    return `<a class="${cls}${it.id === active ? ' active' : ''}" href="#/${it.id}" data-nav="${it.id}">
      ${ui.svg(it.icon)}<span>${it.label}</span>
      ${isNew(it) ? '<i class="nav-new" title="Новое"></i>' : ''}
      ${it.badge ? `<b class="nav-badge" data-badge="${it.badge}"></b>` : ''}
    </a>`;
  }

  function renderNav() {
    const items = visible();
    sidebar.innerHTML = `
      <a class="logo" href="#/cases">${ui.coin()}<b>${U.esc(CFG.title)}</b></a>
      <nav class="nav">${items.map((it) => navLink(it, 'nav-item')).join('')}</nav>
      <div class="nav-bottom">
        ${App.settings.devMode ? navLink({ id: 'dev', label: 'Конструктор', icon: 'dev' }, 'nav-item') : ''}
        ${navLink({ id: 'settings', label: 'Настройки', icon: 'settings' }, 'nav-item')}
      </div>`;
    tabbar.innerHTML = items.map((it) => navLink(it, 'tab-item')).join('');
    document.body.classList.toggle('one-tab', items.length < 2);
    updateBadges();
  }

  function renderTopbar() {
    topbar.innerHTML = `
      <a class="logo-mini" href="#/cases">${ui.coin()}<b>${U.esc(CFG.title)}</b></a>
      <div class="topbar-spacer"></div>
      <div class="balance" title="Монеты">${ui.coin()}<b data-bal>0</b></div>
      <div class="level" title="Уровень">
        <span class="level-num" data-lvl></span>
        <span class="level-bar"><i data-xpbar></i></span>
      </div>
      <a class="icon-btn settings-btn" href="#/settings" aria-label="Настройки">${ui.svg('settings')}</a>`;
    updateBalance(true);
    updateLevel();
  }

  function updateBalance(instant) {
    const el = topbar.querySelector('[data-bal]');
    if (!el) return;
    const prev = Number(el.dataset.v || 0);
    ui.countTo(el, App.state.coins, instant ? 0 : 450);
    if (!instant && prev !== App.state.coins) {
      const pill = el.closest('.balance');
      pill.classList.remove('up', 'down');
      void pill.offsetWidth;
      pill.classList.add(App.state.coins > prev ? 'up' : 'down');
    }
  }
  function updateLevel() {
    const st = App.state;
    const max = st.level >= CFG.levels.max;
    const need = App.eco.xpNeeded(st.level);
    const num = topbar.querySelector('[data-lvl]');
    if (num) num.textContent = `Ур. ${st.level}`;
    const bar = topbar.querySelector('[data-xpbar]');
    if (bar) bar.style.width = (max ? 100 : U.clamp((st.xp / need) * 100, 0, 100)) + '%';
    const box = topbar.querySelector('.level');
    if (box) box.title = max ? `Уровень ${st.level} — максимальный` : `Уровень ${st.level}: ${U.fmt(st.xp)} / ${U.fmt(need)} опыта`;
  }
  function updateBadges() {
    const n = App.inv.newCount();
    document.querySelectorAll('[data-badge="inventory"]').forEach((el) => {
      el.textContent = n > 99 ? '99+' : n;
      el.classList.toggle('show', n > 0);
    });
  }
  function setActive(nav) {
    active = nav;
    document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === nav));
  }

  App.shell = {
    init() {
      sidebar = document.getElementById('sidebar');
      topbar = document.getElementById('topbar');
      tabbar = document.getElementById('tabbar');
      renderNav();
      renderTopbar();
      App.bus.on('balance', () => updateBalance(false));
      App.bus.on('xp', updateLevel);
      App.bus.on('levelup', () => {
        updateLevel();
        renderNav();
      });
      App.bus.on('route', (r) => {
        setActive(r.nav);
        renderNav();
      });
      App.bus.on('features', renderNav);
      App.bus.on('inventory', U.debounce(updateBadges, 100));
      App.bus.on('settings', (s) => {
        if (s.key === 'devMode' || !s.key) renderNav();
      });
    },
    renderNav,
  };
})();
