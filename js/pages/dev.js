/* «Конструктор» — инструмент владельца игры:
 *  - Проверка: ошибки в данных, кейсы (цены и окупаемость), список персонажей
 *  - Персонаж / Кейс: форма с живым предпросмотром и готовым кодом для data/*.js
 *  - Читы: монеты, уровень, симуляция открытий, сбросы
 * Работает, когда в настройках включён «Режим разработчика». */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const ui = App.ui;
  const esc = U.esc;
  const G = window.GAME_DATA;
  const CFG = G.config;

  const TABS = [
    ['check', 'Проверка'],
    ['char', 'Персонаж'],
    ['case', 'Кейс'],
    ['cheats', 'Читы'],
  ];
  const RISKS = [
    ['low', 'Низкий разброс'],
    ['mid', 'Средний разброс'],
    ['high', 'Высокий разброс'],
    ['elite', 'Элитный'],
  ];
  const SOURCE = { manual: 'characters.js', folder: 'папка characters/', demo: 'демо' };
  const LEVEL_NAME = { error: 'Ошибка', warn: 'Внимание', info: 'Заметка' };
  const LEVEL_ORDER = { error: 0, warn: 1, info: 2 };
  const PAGE_SIZE = 100;
  const MSG_LIMIT = 8;
  const SIM_N = [100, 1000, 10000, 100000];

  /* ---------- мелочи ---------- */
  const jsStr = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n') + "'";
  const num = (v) => (v === '' || v == null ? NaN : Number(v));
  const opts = (list, cur) => list.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${esc(l)}</option>`).join('');
  const byLevel = (a, b) => a.requiredLevel - b.requiredLevel || a.price - b.price || String(a.name).localeCompare(String(b.name), 'ru');
  const sortedCases = () => App.data.cases.slice().sort(byLevel);
  function groupByLevel(list) {
    const m = new Map();
    list.forEach((cs) => {
      if (!m.has(cs.requiredLevel)) m.set(cs.requiredLevel, []);
      m.get(cs.requiredLevel).push(cs);
    });
    return Array.from(m.entries());
  }
  // факт RTP: красный — больше 100%, жёлтый — заметно отличается от цели
  const rtpClass = (fact, target) => (fact == null ? '' : fact > 1 ? 'bad' : Math.abs(fact - target) > 0.02 ? 'dv-off' : '');
  const toHex6 = (c) => {
    const [r, g, b] = U.hexToRgb(c || '#ff8fc4');
    return U.rgbToHex(r, g, b);
  };
  const msgRow = (w) => `<div class="dv-msg dv-${esc(w.level)}"><i title="${LEVEL_NAME[w.level] || ''}"></i><span>${esc(w.msg)}</span></div>`;
  const stat = (v, label, cls) => `<div class="dv-stat"><b class="${cls || ''}">${U.fmt(v)}</b><span>${label}</span></div>`;
  const copyBtn = (act) => `<button class="btn btn-secondary btn-xs" data-act="${act}">Копировать</button>`;

  /* ---------- состояние (живёт, пока открыта вкладка браузера) ---------- */
  const S = {
    tab: 'check',
    allMsgs: false,
    chars: { open: false, demo: false, page: 0 },
    sim: { caseId: '', n: 10000 },
  };
  const draft = {
    ch: { name: '', id: '', idTouched: false, rarity: 'rare', image: '', series: '', description: '', value: '', cases: [] },
    cs: { from: '', name: '', id: '', idTouched: false, requiredLevel: 1, price: 100, rtp: 90, risk: 'mid', cooldown: 60, image: '', color: '#ff8fc4', weights: {}, items: [], extra: [], q: '', demo: null },
  };

  /* ============================== Проверка ============================== */
  function renderCheck(body) {
    const D = App.data;
    const count = { error: 0, warn: 0, info: 0 };
    D.warnings.forEach((w) => (count[w.level] = (count[w.level] || 0) + 1));
    const msgs = D.warnings.slice().sort((a, b) => (LEVEL_ORDER[a.level] || 0) - (LEVEL_ORDER[b.level] || 0));
    const shown = S.allMsgs ? msgs : msgs.slice(0, MSG_LIMIT);
    const own = D.chars.filter((c) => !c.demo).length;
    const demo = D.chars.length - own;
    body.innerHTML = `
      <div class="dv-stats">
        ${stat(D.chars.length, 'персонажей')}
        ${stat(D.cases.length, 'кейсов')}
        ${stat(count.error, 'ошибок', count.error ? 'bad' : '')}
        ${stat(count.warn, 'предупреждений', count.warn ? 'dv-off' : '')}
      </div>

      <section class="section">
        <div class="section-head"><h2>Сообщения</h2></div>
        ${
          msgs.length
            ? `<div class="panel dv-msgs">${shown.map(msgRow).join('')}${
                msgs.length > shown.length ? `<button class="btn btn-secondary btn-sm dv-more" data-act="all-msgs">Показать все (${msgs.length})</button>` : ''
              }</div>`
            : `<div class="panel dv-ok">${ui.svg('check')}<span>Ошибок в данных нет</span></div>`
        }
      </section>

      <section class="section">
        <div class="section-head"><h2>Кейсы</h2><span class="small muted">RTP — какая доля цены кейса в среднем возвращается игроку</span></div>
        <div class="dv-table-wrap">${casesTable()}</div>
      </section>

      <section class="section">
        <details class="dv-details" data-chars-box${S.chars.open ? ' open' : ''}>
          <summary>
            <h2>Персонажи</h2>
            <span class="small muted">${own} ${U.plural(own, ['свой', 'своих', 'своих'])}${demo ? ` · ${demo} демо` : ''}</span>
            ${ui.svg('next', 'dv-chev')}
          </summary>
          <div class="dv-details-body" data-chars></div>
        </details>
      </section>`;

    const box = body.querySelector('[data-chars-box]');
    const host = body.querySelector('[data-chars]');
    if (S.chars.open) renderChars(host);
    // toggle не всплывает — вешаем прямо на <details>
    box.addEventListener('toggle', () => {
      S.chars.open = box.open;
      if (box.open && !host.childElementCount) renderChars(host);
    });
  }

  function casesTable() {
    const D = App.data;
    return `<table class="dv-table">
      <thead><tr><th class="num">Ур.</th><th>Кейс</th><th>id</th><th>Цена</th><th class="num">Персонажей</th><th>Средний дроп</th><th class="num">RTP цель</th><th class="num">RTP факт</th></tr></thead>
      <tbody>${sortedCases()
        .map((cs) => {
          const rtp = D.caseRTP(cs);
          const tags = (cs.demo ? '<span class="dv-tag">демо</span>' : '') + (cs.hidden ? '<span class="dv-tag">скрыт</span>' : '');
          return `<tr>
            <td class="num">${cs.requiredLevel}</td>
            <td><div class="dv-case-cell"><a class="dv-case" href="#/case/${esc(cs.id)}">${ui.caseImg(cs)}<span>${esc(cs.name)}</span></a>${tags}</div></td>
            <td><code>${esc(cs.id)}</code></td>
            <td>${cs.price ? ui.cur(cs.price) : '<span class="muted">бесплатно</span>'}</td>
            <td class="num">${cs.pool.length}</td>
            <td>${cs.pool.length ? ui.cur(D.caseEV(cs)) : '—'}</td>
            <td class="num">${cs.price ? U.pct(cs.rtp, 1) : '—'}</td>
            <td class="num ${rtpClass(rtp, cs.rtp)}">${rtp == null ? '—' : U.pct(rtp, 1)}</td>
          </tr>`;
        })
        .join('')}</tbody>
    </table>`;
  }

  function renderChars(host) {
    const D = App.data;
    const demoN = D.chars.filter((c) => c.demo).length;
    const list = D.chars.filter((c) => S.chars.demo || !c.demo);
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    S.chars.page = U.clamp(S.chars.page, 0, pages - 1);
    const from = S.chars.page * PAGE_SIZE;
    const rows = list.slice(from, from + PAGE_SIZE);
    host.innerHTML = `
      ${demoN ? `<label class="switch-row dv-switch"><input type="checkbox" data-act="chars-demo"${S.chars.demo ? ' checked' : ''}><span class="switch"></span><span>Показывать демо-персонажей (${demoN})</span></label>` : ''}
      ${
        rows.length
          ? `<div class="dv-table-wrap"><table class="dv-table">
              <thead><tr><th>Имя</th><th>id</th><th>Редкость</th><th>Домашний кейс</th><th>Цена</th><th>Откуда</th></tr></thead>
              <tbody>${rows.map(charRow).join('')}</tbody>
            </table></div>`
          : `<p class="muted dv-note">Своих персонажей пока нет — кейсы заполнены демо. Положи картинки в папку <code>characters/</code> или создай персонажа во вкладке «Персонаж».</p>`
      }
      ${
        pages > 1
          ? `<div class="dv-pager">
              <button class="btn btn-secondary btn-sm" data-page="-1"${S.chars.page ? '' : ' disabled'}>${ui.svg('back')}Назад</button>
              <span class="small muted">${from + 1}–${from + rows.length} из ${list.length}</span>
              <button class="btn btn-secondary btn-sm" data-page="1"${S.chars.page < pages - 1 ? '' : ' disabled'}>Дальше${ui.svg('next')}</button>
            </div>`
          : ''
      }`;
  }

  function charRow(c) {
    const home = c.home ? App.data.getCase(c.home) : null;
    return `<tr>
      <td class="dv-strong">${esc(c.name)}</td>
      <td><code>${esc(c.id)}</code></td>
      <td>${ui.rarityTag(c)}</td>
      <td>${home ? esc(home.name) : '<span class="bad">нет</span>'}${c.inCases.length > 1 ? ` <span class="dim">+${c.inCases.length - 1}</span>` : ''}</td>
      <td>${ui.cur(c.value)}${c.fixedValue != null ? '<span class="dv-tag">своя</span>' : ''}</td>
      <td class="muted">${SOURCE[c._source] || '—'}</td>
    </tr>`;
  }

  /* ============================== Персонаж ============================== */
  function charObj() {
    const d = draft.ch;
    const o = { id: d.id.trim() || U.slug(d.name) || 'new_character', name: d.name.trim() || 'Новый персонаж', rarity: d.rarity };
    if (d.image.trim()) o.image = d.image.trim();
    if (d.series.trim()) o.series = d.series.trim();
    if (d.description.trim()) o.description = d.description.trim();
    const cases = d.cases.filter((id) => App.data.getCase(id));
    if (cases.length) o.cases = cases;
    const v = num(d.value);
    if (v > 0) o.value = Math.round(v);
    return o;
  }

  function charCode() {
    const o = charObj();
    const L = ['  {', `    id: ${jsStr(o.id)},`, `    name: ${jsStr(o.name)},`, `    rarity: ${jsStr(o.rarity)},`];
    if (o.cases) L.push(`    cases: [${o.cases.map(jsStr).join(', ')}],`);
    if (o.image) L.push(`    image: ${jsStr(o.image)},`);
    if (o.series) L.push(`    series: ${jsStr(o.series)},`);
    if (o.description) L.push(`    description: ${jsStr(o.description)},`);
    if (o.value != null) L.push(`    value: ${o.value},`);
    L.push('  },');
    return L.join('\n');
  }

  function caseChecks(selected) {
    return groupByLevel(sortedCases())
      .map(
        ([lvl, list]) => `<div class="dv-lvl">
          <div class="dv-lvl-h">Уровень ${lvl}</div>
          <div class="dv-checks">${list
            .map(
              (cs) => `<label class="dv-check"><input type="checkbox" data-ccase="${esc(cs.id)}"${selected.includes(cs.id) ? ' checked' : ''}><span>${ui.caseImg(cs)}<span>${esc(cs.name)}</span></span></label>`
            )
            .join('')}</div>
        </div>`
      )
      .join('');
  }

  function renderCharTab(body) {
    const d = draft.ch;
    const D = App.data;
    if (!D.getRarity(d.rarity)) d.rarity = D.rarities[Math.min(2, D.rarities.length - 1)].id;
    body.innerHTML = `
      <div class="panel dv-tip">
        <b>Проще всего — папкой.</b>
        <span>Положи картинку в <code>characters/&lt;NN-кейс&gt;/&lt;N-редкость&gt;/Имя.png</code> и запусти <code>node tools/import-characters.js</code> — или просто отправь файлы на GitHub, сборка импортирует их сама. Форма ниже — чтобы добавить персонажа вручную через <code>data/characters.js</code>.</span>
      </div>

      <div class="dv-layout">
        <div class="panel dv-form">
          <div class="dv-grid">
            <label class="field"><span>Имя</span><input class="input" data-c="name" value="${esc(d.name)}" placeholder="Например: Рем" maxlength="60"></label>
            <label class="field"><span>id (латиницей)</span><input class="input" data-c="id" value="${esc(d.id)}" placeholder="rem" maxlength="60" spellcheck="false" autocapitalize="off"></label>
            <label class="field"><span>Редкость</span><select class="select" data-c="rarity">${opts(D.rarities.map((r) => [r.id, r.name]), d.rarity)}</select></label>
            <label class="field"><span>Своя цена (необязательно)</span><input class="input" type="number" min="0" inputmode="numeric" data-c="value" value="${esc(d.value)}" placeholder="посчитается сама"></label>
            <label class="field dv-span2"><span>Картинка</span><input class="input" data-c="image" value="${esc(d.image)}" placeholder="assets/characters/rem.png" spellcheck="false" autocapitalize="off"></label>
            <label class="field dv-span2"><span>Серия (необязательно)</span><input class="input" data-c="series" value="${esc(d.series)}" placeholder="Re:Zero" list="dv-series"><datalist id="dv-series">${D.seriesList()
              .map((s) => `<option value="${esc(s)}">`)
              .join('')}</datalist></label>
            <label class="field dv-span2"><span>Описание (необязательно)</span><textarea class="input" rows="2" data-c="description" placeholder="Пара строк о персонаже">${esc(d.description)}</textarea></label>
          </div>
          <div class="dv-sub">Кейсы <small>Первый отмеченный — «домашний»: от его цены считается цена персонажа.</small></div>
          <div class="dv-case-checks">${caseChecks(d.cases)}</div>
        </div>

        <div class="dv-side">
          <div class="panel dv-preview" data-prev data-cprev></div>
          <div class="panel dv-code-panel">
            <div class="dv-code-head"><b>Код для data/characters.js</b>${copyBtn('copy-ch')}</div>
            <pre class="dv-code" data-ccode></pre>
            <p class="small muted">Вставь внутрь <code>GAME_DATA.characters = [ … ]</code> и обнови страницу.</p>
            <button class="btn btn-primary btn-block" data-act="test-ch">Добавить в игру для теста</button>
            <p class="small dim">Тестовое добавление действует до перезагрузки страницы.</p>
          </div>
        </div>
      </div>`;
    refreshChar(body);
  }

  function charPreviewHtml() {
    const D = App.data;
    const o = charObj();
    const r = D.getRarity(o.rarity) || D.rarities[0];
    const gen = App.art.generated({ id: o.id, rarity: r.id, r });
    const est = (o.cases || []).map((id) => ({ cs: D.getCase(id), v: D.estimateValue(id, r.id) }));
    const value = o.value != null ? o.value : est.length ? est[0].v : D.estimateValue(null, r.id);
    const ex = D.getChar(o.id);
    return `
      <div class="dv-prev-card">
        <div class="ccard xl r-${r.id} t${r.index}">
          <div class="ccard-art"><img src="${esc(o.image || gen)}" data-gen="${esc(gen)}" alt="" draggable="false"></div>
          <div class="ccard-info"><div class="ccard-name">${esc(o.name)}</div><div class="ccard-val">${ui.cur(value, { short: true })}</div></div>
        </div>
        <div class="dv-prev-meta">${ui.rarityTag(r)}${o.series ? `<span class="muted small">${esc(o.series)}</span>` : ''}</div>
        <div class="small bad" data-img-err hidden>Картинка не найдена: ${esc(o.image || '')}</div>
        ${ex && !ex.demo && draft.ch.name.trim() ? `<div class="small muted">Персонаж с id «${esc(o.id)}» уже есть — тест заменит его.</div>` : ''}
      </div>
      <div class="dv-vals">
        <div class="dv-vals-h">Цена по кейсам</div>
        ${o.value != null ? `<div class="dv-val"><span>Своя цена</span>${ui.cur(o.value)}</div>` : ''}
        ${est
          .map(
            ({ cs, v }, i) =>
              `<div class="dv-val${o.value != null || i > 0 ? ' dv-val-alt' : ''}"><span>${esc(cs.name)}${i === 0 && est.length > 1 ? ' <small>домашний</small>' : ''}</span>${ui.cur(v)}</div>`
          )
          .join('')}
        ${!est.length && o.value == null ? '<p class="small muted">Отметь кейс — цена посчитается от его цены и редкости.</p>' : ''}
      </div>`;
  }
  function refreshChar(body) {
    const prev = body.querySelector('[data-cprev]');
    const code = body.querySelector('[data-ccode]');
    if (prev) prev.innerHTML = charPreviewHtml();
    if (code) code.textContent = charCode();
  }

  /* ============================== Кейс ============================== */
  function caseObj() {
    const d = draft.cs;
    const o = { id: d.id.trim() || U.slug(d.name) || 'new_case', name: d.name.trim() || 'Новый кейс' };
    o.requiredLevel = Math.max(1, Math.round(num(d.requiredLevel)) || 1);
    o.price = Math.max(0, Math.round(num(d.price)) || 0);
    const rtp = num(d.rtp);
    if (rtp > 0) o.rtp = Math.round(rtp * 10) / 1000;
    if (o.price > 0) o.risk = d.risk;
    else if (num(d.cooldown) > 0) o.cooldown = Math.round(num(d.cooldown));
    if (d.image.trim()) o.image = d.image.trim();
    o.color = d.color;
    const w = {};
    App.data.rarities.forEach((r) => {
      const v = num(d.weights[r.id]);
      if (v >= 0) w[r.id] = v;
    });
    if (Object.keys(w).length) o.rarityWeights = w;
    const items = d.extra.concat(d.items.filter((id) => App.data.getChar(id)));
    if (items.length) o.items = items;
    return o;
  }

  const itemStr = (it) => (typeof it === 'string' ? jsStr(it) : `{ id: ${jsStr(it.id)}${it.weight != null ? `, weight: ${Number(it.weight)}` : ''} }`);
  function caseCode() {
    const o = caseObj();
    const L = ['  {'];
    Object.keys(o).forEach((k) => {
      const v = o[k];
      if (k === 'rarityWeights') {
        const parts = Object.keys(v).map((r) => `${r}: ${v[r]}`);
        if (parts.join(', ').length <= 44) L.push(`    rarityWeights: { ${parts.join(', ')} },`);
        else {
          L.push('    rarityWeights: {');
          for (let i = 0; i < parts.length; i += 3) L.push('      ' + parts.slice(i, i + 3).join(', ') + ',');
          L.push('    },');
        }
      } else if (k === 'items') {
        const parts = v.map(itemStr);
        if (parts.join(', ').length <= 46) L.push(`    items: [${parts.join(', ')}],`);
        else {
          // переносим строки по ширине, чтобы код читался без горизонтальной прокрутки
          L.push('    items: [');
          let line = '';
          parts.forEach((p) => {
            if (line && line.length + p.length + 2 > 46) {
              L.push('      ' + line + ',');
              line = '';
            }
            line += (line ? ', ' : '') + p;
          });
          if (line) L.push('      ' + line + ',');
          L.push('    ],');
        }
      } else L.push(`    ${k}: ${typeof v === 'string' ? jsStr(v) : v},`);
    });
    L.push('  },');
    return L.join('\n');
  }

  // заполнить форму существующим кейсом
  function loadCase(id) {
    const d = draft.cs;
    const raw = (G.cases || []).find((c) => c && String(c.id) === id);
    const cs = App.data.getCase(id);
    if (!raw || !cs) return;
    const items = Array.isArray(raw.items) ? raw.items.filter((it) => it != null && it !== '') : [];
    const isChar = (it) => typeof it === 'string' && !!App.data.getChar(it);
    const weights = {};
    Object.keys(raw.rarityWeights || {}).forEach((k) => (weights[k] = String(raw.rarityWeights[k])));
    Object.assign(d, {
      from: id,
      name: cs.name,
      id: cs.id,
      idTouched: true,
      requiredLevel: cs.requiredLevel,
      price: cs.price,
      rtp: raw.rtp != null ? Math.round(cs.rtp * 1000) / 10 : '',
      risk: cs.risk || 'mid',
      cooldown: cs.cooldown || 60,
      image: raw.image || '',
      color: toHex6(cs.color),
      weights,
      items: items.filter(isChar),
      extra: items.filter((it) => !isChar(it)),
      q: '',
    });
  }
  function resetCase() {
    Object.assign(draft.cs, { from: '', name: '', id: '', idTouched: false, requiredLevel: 1, price: 100, rtp: 90, risk: 'mid', cooldown: 60, image: '', color: '#ff8fc4', weights: {}, items: [], extra: [], q: '' });
  }

  const pickDemo = () => (draft.cs.demo != null ? draft.cs.demo : !App.data.chars.some((c) => !c.demo));

  function renderCaseTab(body) {
    const d = draft.cs;
    const D = App.data;
    const demoN = D.chars.filter((c) => c.demo).length;
    const free = Math.round(num(d.price)) === 0;
    body.innerHTML = `
      <div class="dv-layout">
        <div class="panel dv-form">
          <label class="field dv-from"><span>Основа</span><select class="select" data-k="from"><option value="">Новый кейс</option>${groupByLevel(sortedCases())
            .map(([lvl, list]) => `<optgroup label="Уровень ${lvl}">${list.map((cs) => `<option value="${esc(cs.id)}"${cs.id === d.from ? ' selected' : ''}>${esc(cs.name)}</option>`).join('')}</optgroup>`)
            .join('')}</select></label>
          <div class="dv-grid">
            <label class="field"><span>Название</span><input class="input" data-k="name" value="${esc(d.name)}" placeholder="Например: Кошачья коробка" maxlength="60"></label>
            <label class="field"><span>id (латиницей)</span><input class="input" data-k="id" value="${esc(d.id)}" placeholder="neko-box" maxlength="60" spellcheck="false" autocapitalize="off"></label>
            <label class="field"><span>С какого уровня</span><input class="input" type="number" min="1" max="${CFG.levels.max}" inputmode="numeric" data-k="requiredLevel" value="${esc(d.requiredLevel)}"></label>
            <label class="field"><span>Цена (0 — бесплатный)</span><input class="input" type="number" min="0" inputmode="numeric" data-k="price" value="${esc(d.price)}"></label>
            <label class="field"><span>Окупаемость, %</span><input class="input" type="number" min="1" max="200" step="0.5" inputmode="decimal" data-k="rtp" value="${esc(d.rtp)}" placeholder="${Math.round(((CFG.economy && CFG.economy.defaultRtp) || 0.9) * 100)}"></label>
            ${
              free
                ? `<label class="field"><span>Перезарядка, мин</span><input class="input" type="number" min="0" inputmode="numeric" data-k="cooldown" value="${esc(d.cooldown)}"></label>`
                : `<label class="field"><span>Разброс</span><select class="select" data-k="risk">${opts(RISKS, d.risk)}</select></label>`
            }
            <label class="field dv-span2"><span>Картинка</span><input class="input" data-k="image" value="${esc(d.image)}" placeholder="assets/cases/neko-box.webp" spellcheck="false" autocapitalize="off"></label>
            <label class="field dv-span2"><span>Цвет подсветки</span><span class="dv-color"><input type="color" data-k="color" value="${esc(toHex6(d.color))}"><code data-color-text>${esc(toHex6(d.color))}</code></span></label>
          </div>

          <div class="dv-sub">Шансы редкостей <small>Пусто — как в config.js. Шанс редкости делится поровну между её персонажами в кейсе.</small></div>
          <div class="dv-grid dv-grid-3">${D.rarities
            .map(
              (r) => `<label class="field r-${r.id}"><span class="dv-rlabel"><i></i>${esc(r.name)}</span><input class="input" type="number" min="0" step="any" inputmode="decimal" data-w="${r.id}" value="${esc(d.weights[r.id] != null ? d.weights[r.id] : '')}" placeholder="${r.weight}"></label>`
            )
            .join('')}</div>

          <div class="dv-sub">Персонажи <small data-items-count>${itemsCountText()}</small></div>
          <div class="dv-pick-tools">
            <input class="input" type="search" data-q value="${esc(d.q)}" placeholder="Поиск по имени или id">
            ${demoN ? `<label class="switch-row dv-switch"><input type="checkbox" data-act="pick-demo"${pickDemo() ? ' checked' : ''}><span class="switch"></span><span>Демо</span></label>` : ''}
          </div>
          <div class="dv-pick" data-pick></div>
        </div>

        <div class="dv-side">
          <div class="panel dv-preview" data-prev data-kprev></div>
          <div class="panel dv-code-panel">
            <div class="dv-code-head"><b>Код для data/cases.js</b>${copyBtn('copy-cs')}</div>
            <pre class="dv-code" data-kcode></pre>
            <p class="small muted">Вставь внутрь <code>GAME_DATA.cases = [ … ]</code> (или замени старый кейс с тем же id) и обнови страницу.</p>
            <button class="btn btn-primary btn-block" data-act="test-cs">Добавить для теста</button>
            <p class="small dim">Тестовое добавление действует до перезагрузки страницы.</p>
          </div>
        </div>
      </div>`;
    renderPick(body.querySelector('[data-pick]'));
    refreshCase(body);
  }

  function itemsCountText() {
    const d = draft.cs;
    const n = d.items.length;
    return `Выбрано: ${n}${d.extra.length ? ` · ещё ${d.extra.length} ${U.plural(d.extra.length, ['правило', 'правила', 'правил'])} из кода` : ''}`;
  }

  let pickGroups = {}; // редкость → id видимых в списке персонажей (для «Все» / «Снять»)
  function renderPick(host) {
    if (!host) return;
    const d = draft.cs;
    const D = App.data;
    const showDemo = pickDemo();
    const q = d.q.trim().toLowerCase();
    pickGroups = {};
    const groups = D.rarities
      .map((r) => ({
        r,
        list: D.chars.filter(
          (c) => c.rarity === r.id && (showDemo || !c.demo || d.items.includes(c.id)) && (!q || c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
        ),
      }))
      .filter((g) => g.list.length);
    groups.forEach((g) => (pickGroups[g.r.id] = g.list.map((c) => c.id)));
    host.innerHTML = groups.length
      ? groups
          .map(
            ({ r, list }) => `<div class="dv-pick-group">
              <div class="dv-pick-head">${ui.rarityTag(r)}<span class="dim small">${list.length}</span><span class="dv-spacer"></span><button class="btn btn-secondary btn-xs" data-all="${r.id}">Все</button><button class="btn btn-secondary btn-xs" data-none="${r.id}">Снять</button></div>
              <div class="dv-checks">${list
                .map(
                  (c) =>
                    `<label class="dv-check r-${c.rarity}"><input type="checkbox" data-item="${esc(c.id)}"${d.items.includes(c.id) ? ' checked' : ''}><span><i class="dv-dot"></i><span>${esc(c.name)}</span></span></label>`
                )
                .join('')}</div>
            </div>`
          )
          .join('')
      : `<p class="small muted dv-pick-empty">${q ? 'Никого не найдено' : 'Своих персонажей пока нет. Включи «Демо» или добавь персонажей через папку characters/.'}</p>`;
  }

  function casePreviewHtml() {
    const D = App.data;
    const d = draft.cs;
    const o = caseObj();
    const { cs, warnings } = D.previewCase(o);
    let ws = warnings.slice();
    if (cs && !cs.pool.length) ws = ws.filter((w) => !/пустой/.test(w.msg));
    if (/[^a-z0-9_-]/i.test(o.id)) ws.unshift({ level: 'warn', msg: 'id лучше писать латиницей без пробелов, например neko-box' });
    if (D.getCase(o.id) && d.from !== o.id) ws.unshift({ level: 'info', msg: `Кейс с id «${o.id}» уже есть — тест заменит его` });
    if (o.price === 0 && !o.cooldown) ws.push({ level: 'warn', msg: 'Бесплатный кейс без перезарядки можно открывать бесконечно' });

    const gen = App.art.caseGenerated(cs || o);
    const price = cs ? cs.price : o.price;
    const hasPool = !!(cs && cs.pool.length);
    const ev = hasPool ? cs.previewEV || 0 : 0;
    const rtp = hasPool && price > 0 ? ev / price : null;
    const risk = RISKS.find(([k]) => k === o.risk);
    if (rtp != null && Math.abs(rtp - cs.rtp) > 0.02) {
      ws.push({ level: 'info', msg: 'Окупаемость не совпадает с целью: цены подстраиваются только у персонажей, для которых этот кейс «домашний». Остальные уже оценены в своих кейсах.' });
    }

    let html = `<div class="dv-cprev">
        <img class="dv-cprev-img" src="${esc(o.image || gen)}" data-gen="${esc(gen)}" alt="" draggable="false">
        <div class="dv-cprev-info">
          <div class="dv-cprev-name">${esc(o.name)}</div>
          <div class="small muted">Уровень ${o.requiredLevel}${o.price > 0 && risk ? ' · ' + risk[1].toLowerCase() : o.cooldown ? ` · раз в ${o.cooldown} мин` : ''}</div>
          <div class="dv-cprev-price">${price > 0 ? ui.cur(price) : 'Бесплатно'}</div>
        </div>
      </div>
      <div class="small bad" data-img-err hidden>Картинка не найдена: ${esc(o.image || '')}</div>`;

    if (hasPool) {
      const rows = D.rarities
        .map((r) => {
          const es = cs.pool.filter((e) => D.getChar(e.cid).rarity === r.id);
          if (!es.length) return '';
          const chance = es.reduce((s, e) => s + e.chance, 0);
          const vals = es.map((e) => cs.previewValues[e.cid] || 0);
          const lo = Math.min.apply(null, vals);
          const hi = Math.max.apply(null, vals);
          return `<tr><td>${ui.rarityTag(r)}</td><td class="num">${es.length}</td><td class="num">${U.pct(chance)}</td><td><span class="dv-range">${ui.cur(lo)}${hi > lo ? `<span class="dim">– ${U.fmt(hi)}</span>` : ''}</span></td></tr>`;
        })
        .join('');
      html += `<div class="dv-kv">
          <div><span>Средний дроп</span>${ui.cur(ev)}</div>
          <div><span>RTP</span><b class="${rtpClass(rtp, cs.rtp)}">${rtp == null ? '—' : U.pct(rtp, 1)}</b></div>
          <div><span>Персонажей</span><b>${cs.pool.length}</b></div>
        </div>
        <div class="dv-table-wrap dv-flat"><table class="dv-table dv-mini">
          <thead><tr><th>Редкость</th><th class="num">Перс.</th><th class="num">Шанс</th><th>Цена</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>`;
    } else {
      html += `<p class="small muted dv-hint">Отметь персонажей. Можно оставить пустым — тогда кейс заполнится демо-персонажами, а своих добавишь через папку <code>characters/</code>.</p>`;
    }
    if (ws.length) html += `<div class="dv-msgs dv-flat">${ws.map(msgRow).join('')}</div>`;
    return html;
  }

  function refreshCase(body) {
    const prev = body.querySelector('[data-kprev]');
    const code = body.querySelector('[data-kcode]');
    const cnt = body.querySelector('[data-items-count]');
    if (prev) prev.innerHTML = casePreviewHtml();
    if (code) code.textContent = caseCode();
    if (cnt) cnt.textContent = itemsCountText();
  }

  /* ============================== Читы ============================== */
  function renderCheats(body) {
    const st = App.state;
    const cases = sortedCases().filter((cs) => cs.pool.length);
    if (!S.sim.caseId || !App.data.getCase(S.sim.caseId)) {
      const first = cases.find((cs) => cs.price > 0) || cases[0];
      S.sim.caseId = first ? first.id : '';
    }
    const resetRow = (key, title, desc, label) =>
      `<div class="dv-reset"><div><b>${title}</b><span class="small muted">${desc}</span></div><button class="btn btn-secondary btn-sm" data-cheat="${key}">${label}</button></div>`;
    body.innerHTML = `
      <div class="dv-cheats">
        <section class="panel dv-cheat">
          <h3>Монеты</h3>
          <p class="small muted">Сейчас: <span data-coins-now>${ui.cur(st.coins)}</span></p>
          <div class="dv-row">
            <button class="btn btn-secondary" data-cheat="coins" data-n="1000">${ui.cur(1000, { sign: true })}</button>
            <button class="btn btn-secondary" data-cheat="coins" data-n="100000">${ui.cur(100000, { sign: true })}</button>
          </div>
        </section>

        <section class="panel dv-cheat">
          <h3>Уровень</h3>
          <p class="small muted">Сейчас: <b data-level-now>${st.level}</b>. Опыт обнулится.</p>
          <div class="dv-row">
            <input class="input dv-level-input" type="number" inputmode="numeric" min="1" max="${CFG.levels.max}" value="${st.level}" data-level>
            <button class="btn btn-secondary" data-cheat="level">Установить</button>
          </div>
        </section>

        <section class="panel dv-cheat dv-wide">
          <h3>Симуляция открытий</h3>
          <p class="small muted">Кейсы открываются понарошку: монеты не тратятся, персонажи не выдаются.</p>
          ${
            cases.length
              ? `<div class="dv-row dv-sim-row">
                  <select class="select" data-sim-case>${groupByLevel(cases)
                    .map(([lvl, list]) => `<optgroup label="Уровень ${lvl}">${list.map((cs) => `<option value="${esc(cs.id)}"${cs.id === S.sim.caseId ? ' selected' : ''}>${esc(cs.name)}</option>`).join('')}</optgroup>`)
                    .join('')}</select>
                  <select class="select dv-sim-n" data-sim-n>${opts(SIM_N.map((n) => [n, '× ' + U.fmt(n)]), S.sim.n)}</select>
                  <button class="btn btn-primary" data-cheat="sim">Открыть</button>
                </div>
                <div class="dv-sim-out" data-sim-out></div>`
              : '<p class="small muted">Нет кейсов с персонажами.</p>'
          }
        </section>

        <section class="panel dv-cheat dv-wide">
          <h3>Сброс</h3>
          <div class="dv-resets">
            ${resetRow('collection', 'Коллекция', 'Кого ты выбивал и награды за собранные наборы', 'Очистить')}
            ${resetRow('inventory', 'Инвентарь', `Сейчас персонажей: <span data-inv-now>${U.fmt(st.inventory.length)}</span>`, 'Очистить')}
            ${resetRow('jackpot', 'Джекпот', 'Копилка вернётся к стартовой сумме', 'Сбросить')}
            ${resetRow('timers', 'Таймеры', 'Бесплатный кейс и помощь, когда кончились монеты', 'Сбросить')}
          </div>
        </section>
      </div>`;
  }

  function simulate(body) {
    const D = App.data;
    const cs = D.getCase(S.sim.caseId);
    const out = body.querySelector('[data-sim-out]');
    if (!cs || !cs.pool.length || !out) return;
    const n = S.sim.n;
    const got = {};
    let total = 0;
    let best = null;
    for (let i = 0; i < n; i++) {
      const cid = App.cases.roll(cs).cid;
      const ch = D.getChar(cid);
      got[ch.rarity] = (got[ch.rarity] || 0) + 1;
      const v = D.value(cid);
      total += v;
      if (!best || v > best.v) best = { ch, v };
    }
    const exp = {};
    cs.pool.forEach((e) => {
      const r = D.getChar(e.cid).rarity;
      exp[r] = (exp[r] || 0) + e.chance;
    });
    const avg = total / n;
    out.innerHTML = `
      <div class="dv-kv">
        <div><span>Открыто</span><b>${U.fmt(n)}</b></div>
        <div><span>Средний дроп</span>${ui.cur(avg)}</div>
        <div><span>Окупаемость</span><b>${cs.price ? U.pct(avg / cs.price, 1) : '—'}</b></div>
        <div><span>Лучший</span><b class="dv-best r-${best.ch.rarity}">${esc(best.ch.name)}</b></div>
      </div>
      <div class="dv-table-wrap"><table class="dv-table">
        <thead><tr><th>Редкость</th><th class="num">Шанс</th><th class="num">Выпало</th><th class="num">Доля</th></tr></thead>
        <tbody>${D.rarities
          .filter((r) => exp[r.id] || got[r.id])
          .map(
            (r) =>
              `<tr><td>${ui.rarityTag(r)}</td><td class="num">${U.pct(exp[r.id] || 0)}</td><td class="num">${U.fmt(got[r.id] || 0)}</td><td class="num">${U.pct((got[r.id] || 0) / n)}</td></tr>`
          )
          .join('')}</tbody>
      </table></div>`;
  }

  function setLevel(lvl) {
    const st = App.state;
    st.level = U.clamp(Math.round(lvl) || 1, 1, CFG.levels.max);
    st.xp = 0;
    App.store.dirty();
    App.bus.emit('levelup', { levels: [], level: st.level, features: [] });
    App.shell.renderNav();
    return st.level;
  }

  async function cheat(kind, btn, body) {
    const st = App.state;
    if (kind === 'coins') {
      App.eco.add(Number(btn.dataset.n) || 0);
      App.sfx.play('coin');
    } else if (kind === 'level') {
      const inp = body.querySelector('[data-level]');
      const lvl = setLevel(Number(inp && inp.value));
      if (inp) inp.value = lvl;
      const now = body.querySelector('[data-level-now]');
      if (now) now.textContent = lvl;
      ui.toast(`Уровень ${lvl}`, 'good');
    } else if (kind === 'sim') {
      simulate(body);
    } else if (kind === 'collection') {
      if (!(await ui.confirm('Очистить коллекцию? Персонажи в инвентаре останутся, а награды за наборы можно будет получить снова.', { danger: true, ok: 'Очистить' }))) return;
      st.collection = {};
      st.collectionClaims = {};
      st.collectionMilestones = {};
      App.store.dirty();
      App.bus.emit('inventory');
      App.stats.touch();
      ui.toast('Коллекция очищена', 'good');
    } else if (kind === 'inventory') {
      if (!st.inventory.length) return ui.toast('Инвентарь и так пуст', 'info');
      if (!(await ui.confirm(`Удалить всех персонажей из инвентаря (${U.fmt(st.inventory.length)})?`, { danger: true, ok: 'Удалить' }))) return;
      App.inv.remove(st.inventory.map((it) => it.uid));
      ui.toast('Инвентарь очищен', 'good');
    } else if (kind === 'jackpot') {
      st.jackpot = null;
      App.store.dirty();
      ui.toast('Копилка джекпота сброшена', 'good');
    } else if (kind === 'timers') {
      st.cooldowns = {};
      if (st.limits) delete st.limits.bankrupt;
      App.store.dirty();
      ui.toast('Таймеры сброшены', 'good');
    }
  }

  /* ============================== Страница ============================== */
  App.router.register('dev', {
    title: 'Конструктор',
    nav: 'dev',
    render(ctx) {
      const el = ctx.el;
      if (!App.settings.devMode) {
        el.innerHTML = `<div class="locked-page">
          ${ui.svg('dev')}
          <h2>Конструктор выключен</h2>
          <p class="muted">Включи «Режим разработчика» в настройках, чтобы добавлять персонажей и кейсы.</p>
          <a class="btn btn-primary" href="#/settings">Открыть настройки</a>
        </div>`;
        return;
      }

      const fromHash = ctx.params[0];
      if (fromHash && TABS.some(([id]) => id === fromHash)) S.tab = fromHash;

      el.innerHTML = `
        <div class="page-head"><div><h1>Конструктор</h1><p>Проверка данных, новые персонажи и кейсы, читы для тестов</p></div></div>
        ${App.widgets.tabs(TABS, S.tab, 'data-dv-tabs')}
        <div class="dv-body" data-body></div>`;
      const body = el.querySelector('[data-body]');

      function render() {
        el.querySelectorAll('[data-dv-tabs] .tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === S.tab));
        if (S.tab === 'check') renderCheck(body);
        else if (S.tab === 'char') renderCharTab(body);
        else if (S.tab === 'case') renderCaseTab(body);
        else renderCheats(body);
      }
      render();

      // предпросмотр обновляется с небольшой задержкой, чтобы не дёргать картинки на каждую букву
      const refreshCharSoon = U.debounce(() => ctx.alive && S.tab === 'char' && refreshChar(body), 120);
      const refreshCaseSoon = U.debounce(() => ctx.alive && S.tab === 'case' && refreshCase(body), 120);
      const renderPickSoon = U.debounce(() => ctx.alive && S.tab === 'case' && renderPick(body.querySelector('[data-pick]')), 120);

      // данные пересобрались (например, после теста) — обновляем «Проверку»
      ctx.on('data', () => {
        if (S.tab === 'check') render();
      });
      ctx.on('balance', () => {
        const n = body.querySelector('[data-coins-now]');
        if (n) n.innerHTML = ui.cur(App.state.coins);
      });
      ctx.on('inventory', () => {
        const n = body.querySelector('[data-inv-now]');
        if (n) n.textContent = U.fmt(App.state.inventory.length);
      });

      // если картинка из формы не нашлась — показываем заглушку и подсказку
      el.addEventListener(
        'error',
        (e) => {
          const t = e.target;
          if (!t || t.tagName !== 'IMG' || !t.dataset.gen || t.dataset.failed) return;
          t.dataset.failed = '1';
          t.src = t.dataset.gen;
          const box = t.closest('[data-prev]');
          const err = box && box.querySelector('[data-img-err]');
          if (err) err.hidden = false;
        },
        true
      );

      /* ---------- поля форм ---------- */
      function onField(e) {
        const t = e.target;
        const isToggle = t.type === 'checkbox' || t.tagName === 'SELECT' || t.type === 'color';
        // флажки и списки — по change, текст — по input (цвет — по обоим)
        if (e.type === 'input' && isToggle && t.type !== 'color') return;
        if (e.type === 'change' && !isToggle) return;

        if (t.dataset.act === 'chars-demo') {
          S.chars.demo = t.checked;
          S.chars.page = 0;
          renderChars(body.querySelector('[data-chars]'));
          return;
        }

        if (S.tab === 'char') {
          const d = draft.ch;
          if (t.dataset.ccase) {
            const id = t.dataset.ccase;
            d.cases = d.cases.filter((x) => x !== id);
            if (t.checked) d.cases.push(id);
            refreshChar(body);
            return;
          }
          const k = t.dataset.c;
          if (!k) return;
          d[k] = t.value;
          if (k === 'id') d.idTouched = !!t.value.trim();
          if (k === 'name' && !d.idTouched) {
            d.id = U.slug(t.value);
            const idInp = body.querySelector('[data-c="id"]');
            if (idInp) idInp.value = d.id;
          }
          if (k === 'rarity') refreshChar(body);
          else refreshCharSoon();
          return;
        }

        if (S.tab === 'case') {
          const d = draft.cs;
          if (t.dataset.item) {
            const id = t.dataset.item;
            d.items = d.items.filter((x) => x !== id);
            if (t.checked) d.items.push(id);
            refreshCase(body);
            return;
          }
          if (t.dataset.act === 'pick-demo') {
            d.demo = t.checked;
            renderPick(body.querySelector('[data-pick]'));
            return;
          }
          if (t.matches('[data-q]')) {
            d.q = t.value;
            renderPickSoon();
            return;
          }
          if (t.dataset.w) {
            d.weights[t.dataset.w] = t.value;
            refreshCaseSoon();
            return;
          }
          const k = t.dataset.k;
          if (!k) return;
          if (k === 'from') {
            if (t.value) loadCase(t.value);
            else resetCase();
            renderCaseTab(body);
            return;
          }
          const wasFree = Math.round(num(d.price)) === 0;
          d[k] = t.value;
          if (k === 'id') d.idTouched = !!t.value.trim();
          if (k === 'name' && !d.idTouched) {
            d.id = U.slug(t.value).replace(/_/g, '-');
            const idInp = body.querySelector('[data-k="id"]');
            if (idInp) idInp.value = d.id;
          }
          if (k === 'color') {
            const txt = body.querySelector('[data-color-text]');
            if (txt) txt.textContent = t.value;
          }
          // цена 0 ⇄ платный: меняется поле «Разброс» / «Перезарядка»
          if (k === 'price' && wasFree !== (Math.round(num(d.price)) === 0)) {
            const pos = t.selectionStart;
            renderCaseTab(body);
            const inp = body.querySelector('[data-k="price"]');
            if (inp) {
              inp.focus();
              try { inp.setSelectionRange(pos, pos); } catch (err) { /* у number нет выделения */ }
            }
            return;
          }
          if (k === 'risk') refreshCase(body);
          else refreshCaseSoon();
          return;
        }

        if (S.tab === 'cheats') {
          if (t.matches('[data-sim-case]')) S.sim.caseId = t.value;
          else if (t.matches('[data-sim-n]')) S.sim.n = Number(t.value) || 10000;
        }
      }
      el.addEventListener('input', onField);
      el.addEventListener('change', onField);

      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-level]')) {
          e.preventDefault();
          cheat('level', e.target, body);
        }
      });

      /* ---------- кнопки ---------- */
      el.addEventListener('click', async (e) => {
        const t = e.target;

        const tb = t.closest('[data-dv-tabs] [data-tab]');
        if (tb) {
          if (tb.dataset.tab === S.tab) return;
          S.tab = tb.dataset.tab;
          App.sfx.play('soft');
          render();
          return;
        }

        const pg = t.closest('[data-page]');
        if (pg) {
          S.chars.page += Number(pg.dataset.page) || 0;
          const host = body.querySelector('[data-chars]');
          renderChars(host);
          const box = body.querySelector('[data-chars-box]');
          if (box && box.getBoundingClientRect().top < 0) box.scrollIntoView({ block: 'start' });
          return;
        }

        const all = t.closest('[data-all]');
        const none = t.closest('[data-none]');
        if (all || none) {
          const ids = pickGroups[(all || none).dataset.all || (all || none).dataset.none] || [];
          const d = draft.cs;
          if (all) ids.forEach((id) => d.items.includes(id) || d.items.push(id));
          else d.items = d.items.filter((id) => !ids.includes(id));
          renderPick(body.querySelector('[data-pick]'));
          refreshCase(body);
          return;
        }

        const a = t.closest('[data-act]');
        if (a && a.tagName === 'BUTTON') {
          const act = a.dataset.act;
          if (act === 'all-msgs') {
            S.allMsgs = true;
            renderCheck(body);
          } else if (act === 'copy-ch' || act === 'copy-cs') {
            const ok = await U.copy(act === 'copy-ch' ? charCode() : caseCode());
            ui.toast(ok ? 'Код скопирован' : 'Не удалось скопировать — выдели текст вручную', ok ? 'good' : 'bad');
          } else if (act === 'test-ch') {
            if (!draft.ch.name.trim()) return ui.toast('Укажи имя персонажа', 'bad');
            const o = charObj();
            const demoCases = (o.cases || []).map((id) => App.data.getCase(id)).filter((cs) => cs && cs.demo);
            App.data.upsertCharacter(o);
            let msg = `«${esc(o.name)}» добавлен(а) до перезагрузки.`;
            if (!o.cases) msg += ' Отметь кейс, чтобы персонаж выпадал.';
            else if (demoCases.length) msg += ` Демо из кейса «${esc(demoCases[0].name)}» убраны.`;
            ui.toast(msg, 'good', { timeout: 5000 });
            renderCharTab(body);
          } else if (act === 'test-cs') {
            if (!draft.cs.name.trim()) return ui.toast('Укажи название кейса', 'bad');
            const o = caseObj();
            App.data.upsertCase(o);
            draft.cs.from = o.id;
            ui.toast(`Кейс «${esc(o.name)}» добавлен до перезагрузки. Нажми, чтобы открыть.`, 'good', { timeout: 5000, onClick: () => App.router.go('case/' + o.id) });
            renderCaseTab(body);
          }
          return;
        }

        const ch = t.closest('[data-cheat]');
        if (ch) {
          App.sfx.play('click');
          await cheat(ch.dataset.cheat, ch, body);
        }
      });
    },
  });
})();
