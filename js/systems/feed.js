/* Живая лента дропов (твои дропы + боты для атмосферы) */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const MAX = 24;
  let host = null;
  let track = null;
  let timer = null;

  function itemHtml(d) {
    const ch = App.data.getChar(d.cid);
    if (!ch) return '';
    const cs = App.data.getCase(d.caseId);
    return `<button class="feed-item r-${ch.rarity}${d.shiny ? ' shiny' : ''}${d.own ? ' own' : ''}" data-cid="${U.esc(d.cid)}" title="${U.esc(d.player)} — ${U.esc(ch.name)}${cs ? ' из «' + U.esc(cs.name) + '»' : ''}">
      <img src="${U.esc(App.art.portrait(ch))}" data-cid="${U.esc(d.cid)}" alt="">
      <span class="fi-text"><b>${U.esc(ch.name)}</b><small>${U.esc(d.player)}</small></span>
    </button>`;
  }

  function push(d) {
    if (!track) return;
    const html = itemHtml(d);
    if (!html) return;
    const el = U.el(html);
    el.classList.add('enter');
    track.prepend(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('enter')));
    while (track.children.length > MAX) track.lastElementChild.remove();
  }

  function botDrop() {
    const cases = App.cases.list().filter((cs) => cs.pool.length);
    if (!cases.length) return;
    const cs = U.weighted(cases, (c) => 1 / Math.sqrt(1 + App.data.priceInCoins(c) / 100));
    let r = App.cases.roll(cs);
    // в ленте интереснее видеть что-то кроме обычных
    for (let i = 0; i < 2 && App.data.getChar(r.cid).r.index === 0; i++) r = App.cases.roll(cs);
    push({ cid: r.cid, shiny: r.shiny, caseId: cs.id, player: U.pick(GAME_DATA.config.bots || ['Bot']) });
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (App.settings.liveFeed && !document.hidden) botDrop();
      schedule();
    }, U.randInt(2200, 6500));
  }

  function applyVisibility() {
    if (host) host.classList.toggle('hidden', !App.settings.liveFeed);
  }

  App.feed = {
    init() {
      host = document.getElementById('livefeed');
      if (!host) return;
      host.innerHTML = `<div class="feed-label"><span class="live-dot"></span>LIVE</div><div class="feed-track"></div>`;
      track = host.querySelector('.feed-track');
      host.addEventListener('click', (e) => {
        const b = e.target.closest('.feed-item');
        if (b) App.ui.showChar(b.dataset.cid);
      });
      for (let i = 0; i < 10; i++) botDrop();
      schedule();
      applyVisibility();
      App.bus.on('settings', applyVisibility);
    },
    // свои дропы — после анимации
    own(items, caseId) {
      const name = App.state.profile.name || 'Ты';
      items.forEach((it) => push({ cid: it.cid, shiny: it.shiny, caseId, player: name, own: true }));
    },
  };
})();
