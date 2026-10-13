/* «Конструктор» — инструменты разработчика:
 *  - проверка данных (ошибки, шансы, окупаемость кейсов, картинки)
 *  - создание персонажа и кейса с живым предпросмотром и готовым кодом
 *  - читы и симуляция кейсов для тестов
 * Показывается в меню, если включён «Режим разработчика» в настройках. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;
  const W = App.widgets;
  const PAL = () => App.art.palette;

  const jsStr = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
  const svgUri = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

  // черновики форм живут, пока открыта вкладка браузера
  const draft = {
    ch: { name: '', id: '', idTouched: false, rarity: 'rare', series: '', description: '', image: '', value: '', cases: [], look: { hair: '#ff9ecf', eyes: '#3b82f6', skin: '#ffe9de', outfit: '#1e293b', accent: '#ec4899', style: 'long', acc: 'none', clothes: 'sailor', mouth: 'smile', expr: 'normal' } },
    cs: { name: '', id: '', idTouched: false, description: '', price: 300, rtp: 90, currency: 'coins', color: '#ff6fb5', emblem: 'star', category: 'standard', badge: '', requiredLevel: 1, cooldown: '', image: '', featured: false, items: [], weights: {}, pityCount: '', pityRarity: 'legendary' },
  };

  /* ============================== Проверка данных ============================== */
  let showDemo = false;
  function renderCheck(host) {
    const warnings = App.data.warnings;
    const icon = { error: '❌', warn: '⚠️', info: 'ℹ️' };
    const counts = { error: 0, warn: 0, info: 0 };
    warnings.forEach((w) => counts[w.level]++);
    host.innerHTML = `
      <div class="dev-summary">
        <div class="stat panel"><span class="stat-ico">👧</span><div><div class="stat-v">${App.data.chars.length}</div><div class="stat-l">персонажей</div></div></div>
        <div class="stat panel"><span class="stat-ico">🎁</span><div><div class="stat-v">${App.data.cases.length}</div><div class="stat-l">кейсов</div></div></div>
        <div class="stat panel"><span class="stat-ico">❌</span><div><div class="stat-v">${counts.error}</div><div class="stat-l">ошибок</div></div></div>
        <div class="stat panel"><span class="stat-ico">⚠️</span><div><div class="stat-v">${counts.warn}</div><div class="stat-l">предупреждений</div></div></div>
      </div>
      <section class="section">
        <div class="section-head"><h2>Сообщения</h2></div>
        <div class="panel warn-list">${warnings.length ? warnings.map((w) => `<div class="warn-row w-${w.level}"><span>${icon[w.level]}</span><div>${esc(w.msg)}</div></div>`).join('') : '<div class="good">✅ Всё отлично — ошибок в данных нет</div>'}</div>
      </section>
      <section class="section">
        <div class="section-head"><h2>Кейсы: шансы и окупаемость</h2><span class="muted small">RTP — сколько в среднем возвращается игроку от цены кейса</span></div>
        <div class="panel table-wrap"><table class="table">
          <thead><tr><th>Ур.</th><th>Кейс</th><th>id</th><th>Цена</th><th>Персонажей</th><th>Средний дроп</th><th>RTP (цель)</th><th>RTP (факт)</th><th>Гарант</th></tr></thead>
          <tbody>${App.data.cases
            .slice()
            .sort((a, b) => a.requiredLevel - b.requiredLevel || App.data.priceInCoins(a) - App.data.priceInCoins(b))
            .map((cs) => {
              const ev = App.data.caseEV(cs);
              const rtp = App.data.caseRTP(cs);
              const cls = rtp == null ? '' : rtp > 1 ? 'bad' : rtp >= 0.8 ? 'good' : 'warn';
              return `<tr data-goto="case/${esc(cs.id)}"><td>${cs.requiredLevel}</td><td><b>${esc(cs.name)}</b>${cs.demo ? ' <span class="tag">демо</span>' : ''}</td><td><code>${esc(cs.id)}</code></td><td>${cs.price ? ui.cur(cs.price, cs.currency) : 'бесплатно'}</td><td>${cs.pool.length}</td><td>${ui.cur(Math.round(ev))}</td><td>${cs.price ? U.pct(cs.rtp, 1) : '—'}</td><td class="${cls}">${rtp == null ? '—' : U.pct(rtp, 1)}</td><td>${cs.pity ? `${cs.pity.count} → ${esc(cs.pity.rarity)}` : '—'}</td></tr>`;
            })
            .join('')}</tbody></table></div>
        <p class="small muted">RTP — окупаемость: какая доля цены кейса в среднем возвращается игроку. Цены персонажей подгоняются под RTP (цель) автоматически. Если факт отличается — у кого-то из персонажей задана своя <code>value</code> или персонаж «домашний» в другом кейсе.</p>
      </section>
      <section class="section">
        <div class="section-head"><h2>Персонажи</h2><button class="btn btn-ghost btn-sm" data-act="checkimg">🖼️ Проверить картинки</button></div>
        <div class="panel table-wrap"><table class="table">
          <thead><tr><th></th><th>Имя</th><th>id</th><th>Редкость</th><th>Цена</th><th>Кейсы</th><th>Откуда</th><th>Картинка</th></tr></thead>
          <tbody>${App.data.chars
            .filter((c) => showDemo || !c.demo)
            .map(
              (c) => `<tr class="r-${c.rarity}"><td><img class="tbl-ava" src="${esc(App.art.portrait(c))}" data-cid="${esc(c.id)}" alt=""></td><td><b>${esc(c.name)}</b></td><td><code>${esc(c.id)}</code></td><td><span class="rtag r-${c.rarity}">${esc(c.r.name)}</span></td><td>${U.fmt(c.value)}${c.fixedValue != null ? ' <small class="muted">своя</small>' : ''}</td><td>${c.inCases.length ? c.inCases.map((k) => `<code${k === c.home ? ' title="домашний кейс — от него считается цена"' : ''}>${k === c.home ? '🏠' : ''}${esc(k)}</code>`).join(' ') : '<span class="warn">нет</span>'}</td><td>${{ manual: 'characters.js', folder: '📁 папка', demo: '<span class="muted">демо</span>' }[c._source] || ''}</td><td data-img="${esc(c.id)}">${c.image ? `<span class="muted">${esc(decodeURIComponent(c.image))}</span>` : '🎨 нарисована'}</td></tr>`
            )
            .join('')}</tbody></table></div>
        <label class="switch-row mt"><input type="checkbox" data-act="toggledemo"${showDemo ? ' checked' : ''}><span class="switch"></span>Показывать демо-персонажей (${App.data.chars.filter((c) => c.demo).length})</label>
      </section>`;
  }
  function checkImages(host) {
    App.data.chars.forEach((c) => {
      if (!c.image) return;
      const cell = host.querySelector(`[data-img="${CSS.escape(c.id)}"]`);
      const img = new Image();
      img.onload = () => cell && (cell.innerHTML = `✅ <span class="muted">${esc(c.image)}</span> <span class="small muted">${img.naturalWidth}×${img.naturalHeight}</span>`);
      img.onerror = () => cell && (cell.innerHTML = `❌ <span class="bad">не найдена: ${esc(c.image)}</span>`);
      img.src = c.image;
    });
  }

  /* ============================== Персонаж ============================== */
  function charObj() {
    const d = draft.ch;
    const o = { id: d.id || U.slug(d.name) || 'new_character', name: d.name || 'Новый персонаж', rarity: d.rarity };
    if (d.image) o.image = d.image;
    if (d.series) o.series = d.series;
    if (d.description) o.description = d.description;
    if (d.cases.length) o.cases = d.cases.slice();
    if (d.value !== '' && !isNaN(d.value)) o.value = Number(d.value);
    if (!d.image) o.look = Object.assign({}, d.look);
    return o;
  }
  function charCode() {
    const o = charObj();
    const lines = [`  {`, `    id: ${jsStr(o.id)},`, `    name: ${jsStr(o.name)},`, `    rarity: ${jsStr(o.rarity)},`];
    if (o.image) lines.push(`    image: ${jsStr(o.image)},`);
    if (o.series) lines.push(`    series: ${jsStr(o.series)},`);
    if (o.description) lines.push(`    description: ${jsStr(o.description)},`);
    if (o.cases) lines.push(`    cases: [${o.cases.map(jsStr).join(', ')}],`);
    if (o.value != null) lines.push(`    value: ${o.value},`);
    if (o.look) {
      const L = o.look;
      lines.push(`    look: { ${Object.keys(L).map((k) => `${k}: ${jsStr(L[k])}`).join(', ')} },`);
    }
    lines.push('  },');
    return lines.join('\n');
  }
  function charPreview() {
    const o = charObj();
    const r = App.data.getRarity(o.rarity) || App.data.rarities[0];
    const fake = { id: o.id, rarity: r.id, r, look: o.look || {} };
    const src = o.image || svgUri(App.art.svg.portrait(fake));
    const value = o.value != null ? o.value : App.data.estimateValue(o.cases && o.cases[0], r.id);
    const cs = o.cases && App.data.getCase(o.cases[0]);
    return `<div class="ccard r-${r.id} t${r.index} lg${r.rainbow ? ' rainbow' : ''}"><div class="ccard-art"><img src="${esc(src)}" alt="" data-preview></div><div class="ccard-shine"></div><div class="ccard-info"><div class="ccard-name">${esc(o.name)}</div><div class="ccard-meta"><span class="ccard-rar">${esc(r.name)}</span><span class="ccard-val">${ui.cur(value, 'coins', { short: true })}</span></div></div></div>
      <div class="small muted center">${o.value != null ? 'Своя цена' : cs ? `Цена ≈ ${ui.cur(value)} — считается от кейса «${esc(cs.name)}» и редкости` : 'Выбери кейс — цена посчитается от него'}</div>`;
  }
  const opts = (list, cur) => list.map((v) => (Array.isArray(v) ? v : [v, v])).map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${esc(l)}</option>`).join('');

  function renderCharForm(host) {
    const d = draft.ch;
    const P = PAL();
    host.innerHTML = `
      <div class="dev-form">
        <div class="panel form-panel">
          <h3>Новый персонаж</h3>
          <div class="form-grid">
            <label class="field"><span>Имя *</span><input class="input" data-c="name" value="${esc(d.name)}" placeholder="Например: Рем"></label>
            <label class="field"><span>id (латиницей) *</span><input class="input" data-c="id" value="${esc(d.id)}" placeholder="rem"></label>
            <label class="field"><span>Редкость *</span><select class="select" data-c="rarity">${opts(App.data.rarities.map((r) => [r.id, r.name]), d.rarity)}</select></label>
            <label class="field"><span>Своя цена (необязательно)</span><input class="input" type="number" min="0" data-c="value" value="${esc(d.value)}" placeholder="по редкости"></label>
            <label class="field span2"><span>Картинка (путь к файлу)</span><input class="input" data-c="image" value="${esc(d.image)}" placeholder="assets/characters/rem.png"><small class="muted">Положи файл в папку <code>assets/characters/</code>. Пусто — нарисуется заглушка.</small><small class="bad" data-imgerr hidden>Картинка не найдена по этому пути</small></label>
            <label class="field span2"><span>Серия / тайтл</span><input class="input" data-c="series" value="${esc(d.series)}" list="dev-series" placeholder="Re:Zero"><datalist id="dev-series">${App.data.seriesList().map((s) => `<option value="${esc(s)}">`).join('')}</datalist></label>
            <label class="field span2"><span>Описание</span><textarea class="input" rows="2" data-c="description" placeholder="Пара строк о персонаже">${esc(d.description)}</textarea></label>
          </div>
          <div class="field"><span>В какой кейс положить (первый отмеченный — «домашний», от него считается цена)</span><div class="check-list">${App.data.cases
            .slice()
            .sort((a, b) => a.requiredLevel - b.requiredLevel || a.price - b.price)
            .map((cs) => `<label class="check"><input type="checkbox" data-ccase="${esc(cs.id)}"${d.cases.includes(cs.id) ? ' checked' : ''}><span>${esc(cs.name)} <small class="muted">ур. ${cs.requiredLevel}${cs.demo ? ' · демо' : ''}</small></span></label>`)
            .join('')}</div></div>
          <details class="look-box"${d.image ? '' : ' open'}>
            <summary>🎨 Внешность заглушки (если нет картинки)</summary>
            <div class="form-grid">
              ${['hair', 'eyes', 'skin', 'outfit', 'accent'].map((k) => `<label class="field"><span>${{ hair: 'Волосы', eyes: 'Глаза', skin: 'Кожа', outfit: 'Одежда', accent: 'Акцент' }[k]}</span><input type="color" class="color" data-look="${k}" value="${esc(d.look[k])}"></label>`).join('')}
              <label class="field"><span>Причёска</span><select class="select" data-look="style">${opts(P.style, d.look.style)}</select></label>
              <label class="field"><span>Аксессуар</span><select class="select" data-look="acc">${opts(['none', 'catears', 'foxears', 'bunny', 'horns', 'bow', 'flower', 'clip', 'glasses', 'headphones', 'halo', 'tiara'], d.look.acc)}</select></label>
              <label class="field"><span>Одежда</span><select class="select" data-look="clothes">${opts(P.clothes, d.look.clothes)}</select></label>
              <label class="field"><span>Рот</span><select class="select" data-look="mouth">${opts(['smile', 'open', 'cat', 'smug', 'o'], d.look.mouth)}</select></label>
              <label class="field"><span>Глаза</span><select class="select" data-look="expr">${opts(['normal', 'happy', 'wink'], d.look.expr)}</select></label>
            </div>
            <button class="btn btn-ghost btn-sm" data-act="randlook">🎲 Случайная внешность</button>
          </details>
        </div>
        <div class="dev-side">
          <div class="panel preview-panel"><div class="muted small">Предпросмотр</div><div data-cprev></div></div>
          <div class="panel code-panel">
            <div class="code-head"><b>Код для data/characters.js</b><button class="btn btn-ghost btn-sm" data-act="copych">📋 Копировать</button></div>
            <pre class="code" data-ccode></pre>
            <p class="small muted">Вставь этот код внутрь массива <code>GAME_DATA.characters = [ ... ]</code> в файле <code>data/characters.js</code> и обнови страницу.</p>
            <button class="btn btn-primary btn-block" data-act="testch">▶️ Добавить в игру для теста</button>
            <p class="small muted">Тестовое добавление работает до перезагрузки страницы.</p>
          </div>
        </div>
      </div>`;
    refreshChar(host);
  }
  function refreshChar(host) {
    host.querySelector('[data-cprev]').innerHTML = charPreview();
    host.querySelector('[data-ccode]').textContent = charCode();
    const img = host.querySelector('[data-cprev] img');
    const err = host.querySelector('[data-imgerr]');
    if (err) err.hidden = true;
    if (img && draft.ch.image) img.addEventListener('error', () => err && (err.hidden = false), { once: true });
  }

  /* ============================== Кейс ============================== */
  function caseObj() {
    const d = draft.cs;
    const o = { id: d.id || U.slug(d.name) || 'new_case', name: d.name || 'Новый кейс' };
    if (d.description) o.description = d.description;
    o.price = Math.max(0, Number(d.price) || 0);
    o.currency = d.currency;
    if (Number(d.rtp) > 0) o.rtp = Math.round(Number(d.rtp)) / 100;
    o.color = d.color;
    if (d.image) o.image = d.image;
    else o.emblem = d.emblem;
    o.category = d.category;
    if (d.badge) o.badge = d.badge;
    if (d.featured) o.featured = true;
    if (Number(d.requiredLevel) > 1) o.requiredLevel = Number(d.requiredLevel);
    if (Number(d.cooldown) > 0) o.cooldown = Number(d.cooldown);
    o.items = d.items.slice();
    const w = {};
    Object.keys(d.weights).forEach((k) => {
      if (d.weights[k] !== '' && !isNaN(d.weights[k])) w[k] = Number(d.weights[k]);
    });
    if (Object.keys(w).length) o.rarityWeights = w;
    if (Number(d.pityCount) > 0) o.pity = { count: Number(d.pityCount), rarity: d.pityRarity };
    return o;
  }
  function caseCode() {
    const o = caseObj();
    const L = ['  {'];
    Object.keys(o).forEach((k) => {
      const v = o[k];
      if (k === 'items') {
        const chunks = [];
        for (let i = 0; i < v.length; i += 6) chunks.push(v.slice(i, i + 6).map(jsStr).join(', '));
        L.push(`    items: [${chunks.length > 1 ? '\n      ' + chunks.join(',\n      ') + ',\n    ' : chunks.join('')}],`);
      } else if (k === 'rarityWeights') L.push(`    rarityWeights: { ${Object.keys(v).map((r) => `${r}: ${v[r]}`).join(', ')} },`);
      else if (k === 'pity') L.push(`    pity: { count: ${v.count}, rarity: ${jsStr(v.rarity)} },`);
      else if (typeof v === 'string') L.push(`    ${k}: ${jsStr(v)},`);
      else L.push(`    ${k}: ${v},`);
    });
    L.push('  },');
    return L.join('\n');
  }
  function renderCaseForm(host) {
    const d = draft.cs;
    const byR = App.data.rarities.map((r) => ({ r, chars: App.data.byRarity(r.id) })).filter((x) => x.chars.length);
    host.innerHTML = `
      <div class="dev-form">
        <div class="panel form-panel">
          <h3>Новый кейс</h3>
          <div class="form-grid">
            <label class="field"><span>Название *</span><input class="input" data-k="name" value="${esc(d.name)}" placeholder="Кейс «Неко»"></label>
            <label class="field"><span>id (латиницей) *</span><input class="input" data-k="id" value="${esc(d.id)}" placeholder="neko2"></label>
            <label class="field"><span>Цена</span><input class="input" type="number" min="0" data-k="price" value="${esc(d.price)}"></label>
            <label class="field"><span>Валюта</span><select class="select" data-k="currency">${opts([['coins', 'Монеты'], ['gems', 'Кристаллы']], d.currency)}</select></label>
            <label class="field"><span>Окупаемость, % (rtp)</span><input class="input" type="number" min="10" max="200" data-k="rtp" value="${esc(d.rtp)}"><small class="muted">Цены персонажей кейса подстроятся под неё</small></label>
            <label class="field"><span>Цвет</span><input type="color" class="color" data-k="color" value="${esc(d.color)}"></label>
            <label class="field"><span>Значок на коробке</span><select class="select" data-k="emblem">${opts(['star', 'heart', 'moon', 'paw', 'flower', 'crown', 'gem', 'fire'], d.emblem)}</select></label>
            <label class="field"><span>Категория</span><select class="select" data-k="category">${opts([['free', 'Бесплатные'], ['standard', 'Обычные'], ['theme', 'Тематические'], ['event', 'Ивенты'], ['premium', 'Премиум']], d.category)}</select></label>
            <label class="field"><span>Наклейка</span><input class="input" data-k="badge" value="${esc(d.badge)}" placeholder="NEW, HOT…"></label>
            <label class="field"><span>С какого уровня</span><input class="input" type="number" min="1" data-k="requiredLevel" value="${esc(d.requiredLevel)}"></label>
            <label class="field"><span>Перезарядка, мин (для бесплатных)</span><input class="input" type="number" min="0" data-k="cooldown" value="${esc(d.cooldown)}" placeholder="—"></label>
            <label class="field span2"><span>Картинка кейса (необязательно)</span><input class="input" data-k="image" value="${esc(d.image)}" placeholder="assets/cases/neko.png"></label>
            <label class="field span2"><span>Описание</span><input class="input" data-k="description" value="${esc(d.description)}"></label>
            <label class="check span2"><input type="checkbox" data-k="featured"${d.featured ? ' checked' : ''}><span>Показывать на главной</span></label>
          </div>
          <div class="field"><span data-itemcount>Персонажи в кейсе (${d.items.length})</span></div>
          <div class="pick-chars">${byR
            .map(
              ({ r, chars }) => `<div class="pick-group r-${r.id}"><div class="pick-group-head"><span class="rtag r-${r.id}">${esc(r.name)}</span><button class="btn btn-xs btn-ghost" data-allr="${r.id}">все</button><button class="btn btn-xs btn-ghost" data-noner="${r.id}">никого</button></div>
              <div class="pick-group-list">${chars
                .map((c) => `<label class="pick-char${d.items.includes(c.id) ? ' on' : ''}"><input type="checkbox" data-item="${esc(c.id)}"${d.items.includes(c.id) ? ' checked' : ''}><img src="${esc(App.art.portrait(c))}" data-cid="${esc(c.id)}" alt=""><span>${esc(c.name)}</span></label>`)
                .join('')}</div></div>`
            )
            .join('')}</div>
          <details class="look-box">
            <summary>🎯 Шансы редкостей и гарант (необязательно)</summary>
            <p class="small muted">Вес редкости делится поровну между её персонажами в кейсе. Пусто — стандартный вес из config.js.</p>
            <div class="form-grid">${App.data.rarities
              .map((r) => `<label class="field"><span class="r-${r.id}" style="color:var(--rc)">${esc(r.name)}</span><input class="input" type="number" min="0" step="0.1" data-w="${r.id}" value="${esc(d.weights[r.id] != null ? d.weights[r.id] : '')}" placeholder="${r.weight}"></label>`)
              .join('')}</div>
            <div class="form-grid">
              <label class="field"><span>Гарант: через N открытий</span><input class="input" type="number" min="0" data-k="pityCount" value="${esc(d.pityCount)}" placeholder="нет"></label>
              <label class="field"><span>Гарант: редкость</span><select class="select" data-k="pityRarity">${opts(App.data.rarities.map((r) => [r.id, r.name]), d.pityRarity)}</select></label>
            </div>
          </details>
        </div>
        <div class="dev-side">
          <div class="panel preview-panel"><div class="muted small">Предпросмотр</div><div data-kprev></div></div>
          <div class="panel code-panel">
            <div class="code-head"><b>Код для data/cases.js</b><button class="btn btn-ghost btn-sm" data-act="copycs">📋 Копировать</button></div>
            <pre class="code" data-kcode></pre>
            <p class="small muted">Вставь внутрь массива <code>GAME_DATA.cases = [ ... ]</code> в файле <code>data/cases.js</code>.</p>
            <button class="btn btn-primary btn-block" data-act="testcs">▶️ Добавить в игру для теста</button>
          </div>
        </div>
      </div>`;
    refreshCase(host);
  }
  function refreshCase(host) {
    const o = caseObj();
    const { cs, warnings } = App.data.previewCase(o);
    const art = o.image || svgUri(App.art.svg.caseBox(Object.assign({}, o, { emblem: o.emblem || 'star' })));
    let html = `<div class="case-card static" style="--cc:${esc(o.color)}"><span class="case-glow"></span>${o.badge ? `<span class="case-badge">${esc(o.badge)}</span>` : ''}<div class="case-art"><img src="${esc(art)}" alt=""></div><div class="case-name">${esc(o.name)}</div><div class="case-price">${o.price ? ui.cur(o.price, o.currency) : '<span class="free-tag">Бесплатно</span>'}</div></div>`;
    if (cs && cs.pool.length) {
      const ev = cs.previewEV || 0;
      const priceCoins = App.data.priceInCoins(cs);
      const rtp = priceCoins > 0 ? ev / priceCoins : null;
      html += `<div class="prev-stats"><div>Средний дроп: <b>${ui.cur(Math.round(ev))}</b></div><div>RTP: <b class="${rtp == null ? '' : rtp > 1 ? 'bad' : rtp >= 0.85 ? 'good' : 'warn'}">${rtp == null ? '—' : U.pct(rtp, 1)}</b></div></div>`;
      html += `<div class="chance-list">${cs.pool.map((e) => {
        const c = App.data.getChar(e.cid);
        return `<div class="chance-row r-${c.rarity}"><i class="dot"></i><span>${esc(c.name)}</span><small class="muted">${U.short(cs.previewValues[e.cid] || 0)}</small><b>${U.pct(e.chance)}</b></div>`;
      }).join('')}</div>`;
    } else html += '<div class="muted small mt">Выбери персонажей, чтобы увидеть шансы</div>';
    if (warnings.length) html += warnings.map((w) => `<div class="small ${w.level === 'error' ? 'bad' : 'warn'}">⚠️ ${esc(w.msg)}</div>`).join('');
    host.querySelector('[data-kprev]').innerHTML = html;
    host.querySelector('[data-kcode]').textContent = caseCode();
  }

  /* ============================== Читы ============================== */
  function renderCheats(host) {
    host.innerHTML = `
      <div class="settings-grid">
        <section class="panel set-section">
          <h3>💰 Валюта и уровень</h3>
          <div class="btn-row">
            <button class="btn btn-ghost" data-cheat="coins:1000">+1 000 ${ui.icon('coins')}</button>
            <button class="btn btn-ghost" data-cheat="coins:100000">+100 000 ${ui.icon('coins')}</button>
            <button class="btn btn-ghost" data-cheat="gems:100">+100 ${ui.icon('gems')}</button>
            <button class="btn btn-ghost" data-cheat="dust:5000">+5 000 ${ui.icon('dust')}</button>
            <button class="btn btn-ghost" data-cheat="level:1">+1 уровень</button>
            <button class="btn btn-ghost" data-cheat="level:5">+5 уровней</button>
          </div>
        </section>
        <section class="panel set-section">
          <h3>👧 Выдать персонажа</h3>
          <div class="row-sm">
            <select class="select" data-givechar>${App.data.rarities
              .map((r) => `<optgroup label="${esc(r.name)}">${App.data.byRarity(r.id).map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</optgroup>`)
              .join('')}</select>
            <label class="check"><input type="checkbox" data-giveshiny><span>✨ шайни</span></label>
            <button class="btn btn-primary" data-cheat="give">Выдать</button>
          </div>
          <button class="btn btn-ghost btn-sm mt" data-cheat="giveall">Выдать по одному каждого персонажа</button>
        </section>
        <section class="panel set-section">
          <h3>⏱️ Сбросить таймеры</h3>
          <p class="set-desc">Бесплатные кейсы, ежедневная награда, бесплатное колесо, лимиты мемори, помощь при банкротстве.</p>
          <button class="btn btn-ghost" data-cheat="timers">Сбросить</button>
          <button class="btn btn-ghost" data-cheat="frames">Открыть все рамки</button>
        </section>
        <section class="panel set-section">
          <h3>🎲 Симуляция кейса</h3>
          <p class="set-desc">Проверь, как часто что выпадает. Ничего не тратится и не выдаётся.</p>
          <div class="row-sm">
            <select class="select" data-simcase>${App.data.cases.map((cs) => `<option value="${esc(cs.id)}">${esc(cs.name)}</option>`).join('')}</select>
            <select class="select" data-simn>${opts([[1000, '1 000'], [10000, '10 000'], [100000, '100 000']], 10000)}</select>
            <button class="btn btn-primary" data-cheat="sim">Запустить</button>
          </div>
          <div data-simout></div>
        </section>
        <section class="panel set-section">
          <h3>🧹 Опасная зона</h3>
          <button class="btn btn-danger" data-cheat="clearinv">Очистить инвентарь</button>
        </section>
      </div>`;
  }
  function simulate(host) {
    const cs = App.data.getCase(host.querySelector('[data-simcase]').value);
    const n = Number(host.querySelector('[data-simn]').value);
    if (!cs || !cs.pool.length) return;
    const byR = {};
    let shiny = 0;
    let total = 0;
    for (let i = 0; i < n; i++) {
      const r = App.cases.roll(cs);
      const ch = App.data.getChar(r.cid);
      byR[ch.rarity] = (byR[ch.rarity] || 0) + 1;
      if (r.shiny) shiny++;
      total += App.data.value(r.cid, r.shiny);
    }
    const exp = {};
    cs.pool.forEach((e) => {
      const rid = App.data.getChar(e.cid).rarity;
      exp[rid] = (exp[rid] || 0) + e.chance;
    });
    const price = App.data.priceInCoins(cs);
    host.querySelector('[data-simout]').innerHTML = `<table class="table mt"><thead><tr><th>Редкость</th><th>Ожидается</th><th>Выпало</th></tr></thead><tbody>${App.data.rarities
      .filter((r) => exp[r.id])
      .map((r) => `<tr><td><span class="rtag r-${r.id}">${esc(r.name)}</span></td><td>${U.pct(exp[r.id])}</td><td>${U.pct((byR[r.id] || 0) / n)} <span class="muted small">(${U.fmt(byR[r.id] || 0)})</span></td></tr>`)
      .join('')}<tr><td>✨ Шайни</td><td>${U.pct(App.data.shinyChance(cs))}</td><td>${U.pct(shiny / n)} <span class="muted small">(${shiny})</span></td></tr></tbody></table>
      <p class="small">Средний дроп: <b>${U.fmt(total / n)}</b>${price ? ` · окупаемость: <b>${U.pct(total / n / price, 1)}</b>` : ''}</p>`;
  }

  /* ============================== Страница ============================== */
  App.router.register('dev', {
    title: 'Конструктор',
    render(ctx) {
      let tab = ctx.params[0] || 'check';
      if (!App.settings.devMode) {
        ctx.el.innerHTML = `<div class="locked-page panel"><div class="locked-ico">🛠️</div><h2>Конструктор выключен</h2><p class="muted">Включи «Режим разработчика» в настройках, чтобы добавлять персонажей и кейсы прямо из игры.</p><button class="btn btn-primary" data-act="enable">Включить режим разработчика</button></div>`;
        ctx.el.addEventListener('click', (e) => {
          if (e.target.closest('[data-act="enable"]')) {
            App.store.setSetting('devMode', true);
            App.router.render();
          }
        });
        return;
      }
      ctx.el.innerHTML = `
        <div class="page-head"><div><h1>🛠️ Конструктор</h1><p class="muted">Добавляй персонажей и кейсы, проверяй шансы и тестируй игру</p></div></div>
        ${W.tabs([['check', '🔎 Проверка данных'], ['char', '👧 Персонаж'], ['case', '🎁 Кейс'], ['cheats', '🧪 Читы и тесты']], tab, 'data-devtabs')}
        <div data-body></div>`;
      const body = ctx.el.querySelector('[data-body]');
      function render() {
        ctx.el.querySelectorAll('[data-devtabs] .tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
        if (tab === 'check') renderCheck(body);
        else if (tab === 'char') renderCharForm(body);
        else if (tab === 'case') renderCaseForm(body);
        else renderCheats(body);
      }
      render();

      ctx.el.addEventListener('input', (e) => {
        const t = e.target;
        if (tab === 'char') {
          const d = draft.ch;
          if (t.dataset.c) {
            const k = t.dataset.c;
            d[k] = t.value;
            if (k === 'id') d.idTouched = !!t.value;
            if (k === 'name' && !d.idTouched) {
              d.id = U.slug(t.value);
              const idInp = body.querySelector('[data-c="id"]');
              if (idInp) idInp.value = d.id;
            }
          } else if (t.dataset.look) d.look[t.dataset.look] = t.value;
          else return;
          refreshChar(body);
        } else if (tab === 'case') {
          const d = draft.cs;
          if (t.dataset.k) {
            const k = t.dataset.k;
            d[k] = t.type === 'checkbox' ? t.checked : t.value;
            if (k === 'id') d.idTouched = !!t.value;
            if (k === 'name' && !d.idTouched) {
              d.id = U.slug(t.value);
              const idInp = body.querySelector('[data-k="id"]');
              if (idInp) idInp.value = d.id;
            }
          } else if (t.dataset.w) d.weights[t.dataset.w] = t.value;
          else return;
          refreshCase(body);
        }
      });
      ctx.el.addEventListener('change', (e) => {
        const t = e.target;
        if (tab === 'char') {
          if (t.dataset.ccase) {
            const d = draft.ch;
            if (t.checked) d.cases.includes(t.dataset.ccase) || d.cases.push(t.dataset.ccase);
            else d.cases = d.cases.filter((x) => x !== t.dataset.ccase);
            refreshChar(body);
          } else if (t.dataset.c === 'rarity' || t.dataset.look) {
            if (t.dataset.look) draft.ch.look[t.dataset.look] = t.value;
            else draft.ch.rarity = t.value;
            refreshChar(body);
          }
        } else if (tab === 'case') {
          if (t.dataset.item) {
            const d = draft.cs;
            if (t.checked) d.items.includes(t.dataset.item) || d.items.push(t.dataset.item);
            else d.items = d.items.filter((x) => x !== t.dataset.item);
            t.closest('.pick-char').classList.toggle('on', t.checked);
            body.querySelector('[data-itemcount]').textContent = `Персонажи в кейсе (${d.items.length})`;
            refreshCase(body);
          } else if (t.dataset.k) {
            draft.cs[t.dataset.k] = t.type === 'checkbox' ? t.checked : t.value;
            refreshCase(body);
          }
        }
      });
      ctx.el.addEventListener('click', async (e) => {
        const t = e.target;
        const tb = t.closest('[data-devtabs] [data-tab]');
        if (tb) {
          tab = tb.dataset.tab;
          App.sfx.play('soft');
          render();
          return;
        }
        const go = t.closest('[data-goto]');
        if (go) return App.router.go(go.dataset.goto);
        const allr = t.closest('[data-allr]');
        const noner = t.closest('[data-noner]');
        if (allr || noner) {
          const rid = (allr || noner).dataset.allr || (allr || noner).dataset.noner;
          const ids = App.data.byRarity(rid).map((c) => c.id);
          const d = draft.cs;
          if (allr) ids.forEach((id) => d.items.includes(id) || d.items.push(id));
          else d.items = d.items.filter((id) => !ids.includes(id));
          renderCaseForm(body);
          return;
        }
        const a = t.closest('[data-act]');
        if (a) {
          const act = a.dataset.act;
          if (act === 'toggledemo') {
            showDemo = a.checked;
            renderCheck(body);
          } else if (act === 'checkimg') checkImages(body);
          else if (act === 'randlook') {
            const P = PAL();
            const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
            Object.assign(draft.ch.look, { hair: pick(P.hair), eyes: pick(P.eyes), skin: pick(P.skin), outfit: pick(P.outfit), accent: pick(P.accent), style: pick(P.style), acc: pick(P.acc), clothes: pick(P.clothes), mouth: pick(P.mouth), expr: pick(P.expr) });
            renderCharForm(body);
          } else if (act === 'copych' || act === 'copycs') {
            const ok = await U.copy(act === 'copych' ? charCode() : caseCode());
            ui.toast(ok ? 'Код скопирован! Вставь его в файл данных.' : 'Не удалось скопировать — выдели текст вручную', ok ? 'good' : 'bad');
          } else if (act === 'testch') {
            const o = charObj();
            if (!draft.ch.name) return ui.toast('Укажи имя персонажа', 'bad');
            App.data.upsertCharacter(o);
            ui.toast(`«${esc(o.name)}» добавлена в игру (до перезагрузки). ${o.cases ? 'Она уже есть в выбранных кейсах!' : 'Выбери кейсы, чтобы она выпадала.'}`, 'good', { timeout: 5000 });
            renderCharForm(body);
          } else if (act === 'testcs') {
            const o = caseObj();
            if (!draft.cs.name) return ui.toast('Укажи название кейса', 'bad');
            if (!o.items.length) return ui.toast('Добавь в кейс хотя бы одного персонажа', 'bad');
            App.data.upsertCase(o);
            ui.toast(`Кейс «${esc(o.name)}» добавлен (до перезагрузки)`, 'good', { onClick: () => App.router.go('case/' + o.id) });
            renderCaseForm(body);
          }
          return;
        }
        const ch = t.closest('[data-cheat]');
        if (!ch) return;
        const [kind, arg] = ch.dataset.cheat.split(':');
        const st = App.state;
        if (kind === 'coins' || kind === 'gems' || kind === 'dust') App.eco.add(Number(arg), kind);
        else if (kind === 'level') {
          for (let i = 0; i < Number(arg); i++) App.eco.addXp(App.eco.xpNeeded(st.level) - st.xp, true);
        } else if (kind === 'give') {
          const cid = body.querySelector('[data-givechar]').value;
          const shiny = body.querySelector('[data-giveshiny]').checked;
          const it = App.inv.add(cid, { shiny, source: 'dev' });
          ui.dropModal([it], { title: 'Выдано', firsts: new Set(App.inv.wasFirst(it) ? [it.uid] : []) });
        } else if (kind === 'giveall') {
          App.data.chars.forEach((c) => App.inv.add(c.id, { source: 'dev' }));
          ui.toast(`Выдано ${App.data.chars.length} персонажей`, 'good');
        } else if (kind === 'timers') {
          st.cooldowns = {};
          st.daily.last = null;
          st.wheel.lastFree = null;
          st.limits = {};
          App.store.dirty();
          App.bus.emit('badges');
          ui.toast('Таймеры сброшены', 'good');
        } else if (kind === 'frames') {
          (GAME_DATA.config.frames || []).forEach((f) => st.owned.frames.includes(f.id) || st.owned.frames.push(f.id));
          App.store.dirty();
          ui.toast('Все рамки открыты', 'good');
        } else if (kind === 'sim') simulate(body);
        else if (kind === 'clearinv') {
          if (await ui.confirm('Удалить всех персонажей из инвентаря?', { danger: true, ok: 'Удалить' })) {
            App.inv.remove(st.inventory.map((it) => it.uid));
            ui.toast('Инвентарь очищен', 'good');
          }
        }
        App.sfx.play('click');
      });
    },
  });
})();
