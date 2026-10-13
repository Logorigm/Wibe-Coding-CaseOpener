/* Оболочка интерфейса: боковое меню, верхняя панель, нижняя панель на телефоне */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const CFG = GAME_DATA.config;

  const NAV = [
    {
      title: 'Игра',
      items: [
        { id: 'home', icon: '🏠', label: 'Главная' },
        { id: 'cases', icon: '🎁', label: 'Кейсы' },
        { id: 'battles', icon: '⚔️', label: 'Батлы', unlock: 'battles' },
        { id: 'upgrade', icon: '🆙', label: 'Апгрейдер', unlock: 'upgrade' },
        { id: 'contracts', icon: '📜', label: 'Контракты', unlock: 'contracts' },
        { id: 'games', icon: '🎮', label: 'Мини-игры' },
      ],
    },
    {
      title: 'Коллекция',
      items: [
        { id: 'inventory', icon: '🎒', label: 'Инвентарь', badge: 'inventory' },
        { id: 'collection', icon: '📖', label: 'Коллекция', badge: 'collection' },
        { id: 'quests', icon: '🏆', label: 'Задания', badge: 'quests' },
      ],
    },
    {
      title: 'Аккаунт',
      items: [
        { id: 'shop', icon: '🛒', label: 'Магазин' },
        { id: 'profile', icon: '👤', label: 'Профиль' },
        { id: 'settings', icon: '⚙️', label: 'Настройки' },
        { id: 'dev', icon: '🛠️', label: 'Конструктор', dev: true },
      ],
    },
  ];
  const TABBAR = [
    { id: 'home', icon: '🏠', label: 'Главная' },
    { id: 'cases', icon: '🎁', label: 'Кейсы' },
    { id: 'games', icon: '🎮', label: 'Игры' },
    { id: 'inventory', icon: '🎒', label: 'Инвентарь', badge: 'inventory' },
    { id: 'menu', icon: '☰', label: 'Ещё', badge: 'menu' },
  ];

  let sidebar, topbar, tabbar, backdrop;
  let activeNav = 'home';

  const unlockLevel = (key) => (CFG.unlocks && CFG.unlocks[key]) || 1;

  function navItem(it) {
    const need = it.unlock ? unlockLevel(it.unlock) : 1;
    const locked = need > App.state.level && !App.settings.devMode;
    return `<a class="nav-item${locked ? ' locked' : ''}" href="#/${it.id}" data-nav="${it.id}">
      <span class="nav-ico">${it.icon}</span><span class="nav-label">${it.label}</span>
      ${locked ? `<span class="nav-lock" title="Откроется на ${need} уровне">🔒${need}</span>` : ''}
      ${it.badge ? `<span class="nav-badge" data-badge="${it.badge}"></span>` : ''}
    </a>`;
  }

  function renderSidebar() {
    sidebar.innerHTML = `
      <a class="logo" href="#/home">
        <span class="logo-mark">🌸</span>
        <span class="logo-text"><b>${U.esc(CFG.title)}</b><small>${U.esc(CFG.subtitle || '')}</small></span>
      </a>
      <nav class="nav">${NAV.map(
        (g) => `<div class="nav-group"><div class="nav-title">${g.title}</div>${g.items
          .filter((it) => !it.dev || App.settings.devMode)
          .map(navItem)
          .join('')}</div>`
      ).join('')}</nav>
      <div class="sidebar-foot">
        <div class="sb-online"><span class="live-dot"></span> Онлайн: <b id="onlineCount">${U.fmt(1200 + U.randInt(0, 800))}</b></div>
        <div class="sb-ver">v1.0 · сохранение локальное</div>
      </div>`;
    setActive(activeNav);
    updateBadges();
  }

  function renderTopbar() {
    topbar.innerHTML = `
      <button class="icon-btn burger" data-act="menu" aria-label="Меню">☰</button>
      <a class="logo-mini" href="#/home"><span>🌸</span><b>${U.esc(CFG.title)}</b></a>
      <div class="topbar-spacer"></div>
      <div class="boost-pills" id="boostPills"></div>
      <div class="balances">
        <a class="bal bal-coins" href="#/shop" title="Монеты">${ui.icon('coins')}<b data-bal="coins">0</b></a>
        <a class="bal bal-gems" href="#/shop" title="Кристаллы">${ui.icon('gems')}<b data-bal="gems">0</b></a>
        <a class="bal bal-dust" href="#/collection" title="Звёздная пыль">${ui.icon('dust')}<b data-bal="dust">0</b></a>
      </div>
      <a class="lvl-pill" href="#/profile" title="Уровень и опыт">
        <span class="lvl-num">${App.state.level}</span>
        <span class="lvl-info"><small data-lvl-title></small><span class="lvl-bar"><i data-xpbar></i></span></span>
      </a>
      <button class="icon-btn" data-act="sound" title="Звук"></button>
      <a class="top-avatar" href="#/profile" title="Профиль" data-avatar></a>`;
    updateBalances(true);
    updateLevel();
    updateSound();
    updateAvatar();
    updateBoosts();
  }

  function renderTabbar() {
    tabbar.innerHTML = TABBAR.map(
      (t) => `<a class="tab-item" ${t.id === 'menu' ? 'href="javascript:void 0" data-act="menu"' : `href="#/${t.id}"`} data-tab="${t.id}">
        <span class="tab-ico">${t.icon}</span><span class="tab-label">${t.label}</span>
        ${t.badge ? `<span class="nav-badge" data-badge="${t.badge}"></span>` : ''}
      </a>`
    ).join('');
  }

  function updateBalances(instant) {
    ['coins', 'gems', 'dust'].forEach((k) => {
      const el = topbar.querySelector(`[data-bal="${k}"]`);
      if (!el) return;
      const prev = Number(el.dataset.v || 0);
      ui.countTo(el, App.state[k], instant ? 0 : 600);
      if (!instant && prev !== App.state[k]) {
        const pill = el.closest('.bal');
        pill.classList.remove('bump-up', 'bump-down');
        void pill.offsetWidth;
        pill.classList.add(App.state[k] > prev ? 'bump-up' : 'bump-down');
      }
    });
  }
  function updateLevel() {
    const st = App.state;
    const need = App.eco.xpNeeded(st.level);
    const num = topbar.querySelector('.lvl-num');
    if (num) num.textContent = st.level;
    const bar = topbar.querySelector('[data-xpbar]');
    if (bar) bar.style.width = (st.level >= CFG.levels.max ? 100 : U.clamp((st.xp / need) * 100, 0, 100)) + '%';
    const t = topbar.querySelector('[data-lvl-title]');
    if (t) t.textContent = `${U.fmt(st.xp)} / ${U.fmt(need)} XP`;
    const pill = topbar.querySelector('.lvl-pill');
    if (pill) pill.title = `Уровень ${st.level} — ${App.eco.title(st.level)}`;
  }
  function updateSound() {
    const b = topbar.querySelector('[data-act="sound"]');
    if (b) b.textContent = App.settings.sound ? '🔊' : '🔇';
  }
  function updateAvatar() {
    const a = topbar.querySelector('[data-avatar]');
    if (a) a.innerHTML = App.profile.avatarHtml('sm');
  }
  function updateBoosts() {
    const host = topbar.querySelector('#boostPills');
    if (!host) return;
    const parts = [];
    const xl = App.boosts.xpLeft();
    if (xl > 0) parts.push(`<a class="boost-pill" href="#/shop" title="Двойной опыт">⚡ ${U.clock(xl)}</a>`);
    const lc = App.boosts.luckCharges();
    if (lc > 0) parts.push(`<a class="boost-pill luck" href="#/shop" title="Удача: осталось открытий">🍀 ${lc}</a>`);
    host.innerHTML = parts.join('');
  }
  function updateBadges() {
    const counts = {
      inventory: App.badges.inventory(),
      collection: App.badges.collection(),
      quests: App.badges.quests(),
    };
    counts.menu = counts.collection + counts.quests;
    document.querySelectorAll('[data-badge]').forEach((el) => {
      const n = counts[el.dataset.badge] || 0;
      el.textContent = n > 99 ? '99+' : n;
      el.classList.toggle('show', n > 0);
    });
  }
  function setActive(nav) {
    activeNav = nav;
    sidebar.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === nav));
    tabbar.querySelectorAll('[data-tab]').forEach((a) => a.classList.toggle('active', a.dataset.tab === nav));
  }
  function toggleMenu(open) {
    document.body.classList.toggle('menu-open', open != null ? open : !document.body.classList.contains('menu-open'));
  }

  App.shell = {
    init() {
      sidebar = document.getElementById('sidebar');
      topbar = document.getElementById('topbar');
      tabbar = document.getElementById('tabbar');
      backdrop = document.getElementById('sidebarBackdrop');
      renderSidebar();
      renderTopbar();
      renderTabbar();
      document.addEventListener('click', (e) => {
        const a = e.target.closest('[data-act]');
        if (a && a.dataset.act === 'menu') {
          e.preventDefault();
          toggleMenu();
          App.sfx.play('soft');
        } else if (a && a.dataset.act === 'sound') {
          App.store.setSetting('sound', !App.settings.sound);
          App.sfx.play('click');
        }
        if (e.target.closest('.nav-item') || e.target === backdrop) toggleMenu(false);
      });
      App.bus.on('balance', () => updateBalances(false));
      App.bus.on('xp', updateLevel);
      App.bus.on('levelup', () => {
        updateLevel();
        renderSidebar();
      });
      App.bus.on('route', (r) => setActive(r.nav));
      App.bus.on('badges', updateBadges);
      App.bus.on('inventory', U.debounce(updateBadges, 100));
      App.bus.on('boosts', updateBoosts);
      App.bus.on('profile', updateAvatar);
      App.bus.on('settings', (s) => {
        if (s.key === 'sound') updateSound();
        if (s.key === 'devMode') renderSidebar();
      });
      setInterval(() => {
        updateBoosts();
        const oc = document.getElementById('onlineCount');
        if (oc) oc.textContent = U.fmt(Math.max(300, Number(oc.textContent.replace(/\D/g, '')) + U.randInt(-25, 25)));
      }, 1000 * 5);
      setInterval(() => {
        if (App.boosts.xpLeft() > 0) updateBoosts();
      }, 1000);
    },
    renderNav: renderSidebar,
    updateBadges,
  };
})();
