/* Картинки-заглушки: силуэт персонажа (пока нет своей картинки) и простая коробка кейса.
 * Если у персонажа/кейса указан image — используется картинка, а это только запасной вариант. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const cache = new Map();

  // смешать два цвета: t = доля первого
  function mix(a, b, t) {
    const A = U.hexToRgb(a);
    const B = U.hexToRgb(b);
    const c = A.map((v, i) => Math.round(v * t + B[i] * (1 - t)));
    return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  const HAIR = {
    long: '<path d="M80 200C70 92 230 92 220 200L232 352C214 362 196 352 190 330L188 230H112L110 330C104 352 86 362 68 352Z"/>',
    bob: '<path d="M76 206C66 90 234 90 224 206C226 232 214 250 198 252L194 214H106L102 252C86 250 74 232 76 206Z"/>',
    twintails: '<path d="M80 200C70 96 230 96 220 200L206 236H94Z"/><ellipse cx="66" cy="250" rx="22" ry="78"/><ellipse cx="234" cy="250" rx="22" ry="78"/><circle cx="84" cy="168" r="12"/><circle cx="216" cy="168" r="12"/>',
    ponytail: '<path d="M80 200C70 96 230 96 220 200L206 232H94Z"/><path d="M206 132C258 132 270 210 252 300C246 330 228 336 222 316C238 254 234 186 202 164Z"/>',
    buns: '<path d="M80 204C70 104 230 104 220 204L206 236H94Z"/><circle cx="96" cy="112" r="28"/><circle cx="204" cy="112" r="28"/>',
  };
  const STYLES = Object.keys(HAIR);

  function placeholderSVG(ch) {
    const rc = ch.r ? ch.r.color : '#9aa3b5';
    const rng = U.seeded('ph:' + ch.id);
    const style = (ch.look && ch.look.style && HAIR[ch.look.style] && ch.look.style) || STYLES[Math.floor(rng() * STYLES.length)];
    const bg = '#17171f';
    const body = mix(rc, bg, 0.3);
    const hair = mix(rc, bg, 0.45);
    const id = 'g' + U.hash(ch.id).toString(36);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
<defs><radialGradient id="${id}" cx="50%" cy="38%" r="60%"><stop offset="0" stop-color="${rc}" stop-opacity=".32"/><stop offset="1" stop-color="${rc}" stop-opacity="0"/></radialGradient></defs>
<rect width="300" height="400" fill="${bg}"/>
<rect width="300" height="400" fill="url(#${id})"/>
<g fill="${hair}">${HAIR[style]}</g>
<path d="M36 400C40 342 78 314 126 300H174C222 314 260 342 264 400Z" fill="${body}"/>
<rect x="130" y="246" width="40" height="62" rx="16" fill="${body}"/>
<ellipse cx="150" cy="196" rx="56" ry="64" fill="${body}"/>
<path d="M92 190C90 120 210 120 208 190C190 160 170 148 150 146C128 148 108 160 92 190Z" fill="${hair}"/>
</svg>`;
  }

  function caseSVG(cs) {
    const c = cs.color || '#ff5fa2';
    const d = mix(c, '#000000', 0.7);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
<path d="M40 92L120 60L200 92V178L120 210L40 178Z" fill="${d}"/>
<path d="M40 92L120 124V210L40 178Z" fill="${c}"/>
<path d="M200 92L120 124V210L200 178Z" fill="${mix(c, '#000000', 0.82)}"/>
<path d="M40 92L120 60L200 92L120 124Z" fill="${mix(c, '#ffffff', 0.75)}"/>
</svg>`;
  }

  function toUrl(svg) {
    try {
      return URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    } catch (e) {
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }
  }

  App.art = {
    // заглушка-силуэт (без учёта image)
    generated(ch) {
      if (!ch) return App.art.unknown();
      const key = 'p:' + ch.id + ':' + ch.rarity;
      if (!cache.has(key)) cache.set(key, toUrl(placeholderSVG(ch)));
      return cache.get(key);
    },
    // картинка персонажа: image или заглушка
    portrait(chOrId) {
      const ch = typeof chOrId === 'string' ? App.data.getChar(chOrId) : chOrId;
      if (!ch) return App.art.unknown();
      return ch.image ? ch.image : App.art.generated(ch);
    },
    caseGenerated(cs) {
      const key = 'c:' + cs.id + ':' + cs.color;
      if (!cache.has(key)) cache.set(key, toUrl(caseSVG(cs)));
      return cache.get(key);
    },
    caseArt(cs) {
      if (!cs) return '';
      return cs.image ? cs.image : App.art.caseGenerated(cs);
    },
    unknown() {
      if (!cache.has('unknown')) {
        cache.set('unknown', toUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="#17171f"/><text x="150" y="235" font-size="120" text-anchor="middle" fill="#30303d" font-family="sans-serif" font-weight="700">?</text></svg>'));
      }
      return cache.get('unknown');
    },
    mix,
  };
})();
