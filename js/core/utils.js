/* Утилиты + шина событий */
(function () {
  'use strict';
  const App = (window.App = window.App || {});
  const U = {};

  U.$ = (sel, root) => (root || document).querySelector(sel);
  U.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  U.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);

  U.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  U.lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- случайность ---------- */
  const rbuf = new Uint32Array(1);
  const hasCrypto = !!(window.crypto && window.crypto.getRandomValues);
  U.rand = () => {
    if (hasCrypto) {
      window.crypto.getRandomValues(rbuf);
      return rbuf[0] / 4294967296;
    }
    return Math.random();
  };
  U.randInt = (min, max) => Math.floor(U.rand() * (max - min + 1)) + min;
  U.randFloat = (min, max) => min + U.rand() * (max - min);
  U.pick = (arr, rng) => arr[Math.floor((rng || U.rand)() * arr.length)];
  U.shuffle = (arr, rng) => {
    const r = rng || U.rand;
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  // Взвешенный выбор: entries — массив, getW — функция веса
  U.weighted = (entries, getW, rng) => {
    const w = getW || ((e) => e.weight);
    const r0 = rng || U.rand;
    let total = 0;
    for (const e of entries) total += Math.max(0, w(e) || 0);
    if (total <= 0) return entries[Math.floor(r0() * entries.length)];
    let r = r0() * total;
    for (const e of entries) {
      r -= Math.max(0, w(e) || 0);
      if (r < 0) return e;
    }
    return entries[entries.length - 1];
  };
  U.hash = (str) => {
    let h = 2166136261 >>> 0;
    str = String(str);
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  // Детерминированный генератор (mulberry32)
  U.seeded = (seed) => {
    let a = typeof seed === 'number' ? seed : U.hash(seed);
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.uid = (p) => (p || '') + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36);

  /* ---------- форматирование ---------- */
  U.fmt = (n) => Math.round(Number(n) || 0).toLocaleString('ru-RU');
  U.short = (n) => {
    n = Number(n) || 0;
    const a = Math.abs(n);
    if (a >= 1e9) return (n / 1e9).toFixed(a >= 1e10 ? 0 : 1).replace('.0', '') + 'B';
    if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace('.0', '') + 'M';
    if (a >= 1e5) return Math.floor(n / 1e3) + 'K';
    return U.fmt(n);
  };
  U.mult = (m) => '×' + (Number(m) || 0).toFixed(2);
  U.pct = (p, digits) => {
    const v = p * 100;
    const d = digits != null ? digits : v >= 10 ? 1 : v >= 1 ? 2 : v >= 0.1 ? 3 : 4;
    let str = v.toFixed(d);
    if (str.includes('.')) str = str.replace(/0+$/, '').replace(/\.$/, '');
    return str + '%';
  };
  U.plural = (n, forms) => {
    const a = Math.abs(n) % 100;
    const b = a % 10;
    if (a > 10 && a < 20) return forms[2];
    if (b > 1 && b < 5) return forms[1];
    if (b === 1) return forms[0];
    return forms[2];
  };

  /* ---------- время ---------- */
  U.todayKey = (d) => {
    d = d || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  U.dayDiff = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
  U.msToMidnight = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) - d;
  };
  U.duration = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h) return `${h}ч ${String(m).padStart(2, '0')}м`;
    if (m) return `${m}м ${String(sec).padStart(2, '0')}с`;
    return `${sec}с`;
  };
  U.clock = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const p = (v) => String(v).padStart(2, '0');
    return h ? `${p(h)}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
  };
  U.timeAgo = (ts) => {
    const d = Date.now() - ts;
    if (d < 60e3) return 'только что';
    if (d < 3600e3) return `${Math.floor(d / 60e3)} мин назад`;
    if (d < 86400e3) return `${Math.floor(d / 3600e3)} ч назад`;
    return new Date(ts).toLocaleDateString('ru-RU');
  };
  U.dateStr = (ts) => new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  /* ---------- прочее ---------- */
  U.debounce = (fn, ms) => {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  };
  U.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  U.el = (html) => {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };
  U.copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e2) { /* ignore */ }
      ta.remove();
      return ok;
    }
  };
  U.download = (name, text, mime) => {
    // В Android-приложении (WebView) обычное скачивание не работает — сохраняем через системный диалог
    if (window.AndroidApp && typeof window.AndroidApp.saveFile === 'function') {
      window.AndroidApp.saveFile(name, String(text));
      return;
    }
    const blob = new Blob([text], { type: mime || 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  };
  U.readFile = (file) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsText(file);
    });

  /* ---------- цвета ---------- */
  U.hexToRgb = (hex) => {
    let h = String(hex || '').trim().replace('#', '');
    if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(h)) return [128, 128, 128];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  U.rgbToHex = (r, g, b) =>
    '#' + [r, g, b].map((v) => Math.round(U.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  // amt: от -1 (чёрный) до 1 (белый)
  U.shade = (hex, amt) => {
    const [r, g, b] = U.hexToRgb(hex);
    const t = amt < 0 ? 0 : 255;
    const p = Math.abs(amt);
    return U.rgbToHex(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p);
  };
  U.rgba = (hex, a) => {
    const [r, g, b] = U.hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  };

  /* ---------- транслит для id ---------- */
  const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
  U.slug = (s) =>
    String(s || '')
      .toLowerCase()
      .split('')
      .map((c) => (TR[c] != null ? TR[c] : c))
      .join('')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40);

  App.utils = U;

  /* ---------- шина событий ---------- */
  const listeners = {};
  App.bus = {
    on(evt, fn) {
      (listeners[evt] = listeners[evt] || []).push(fn);
      return () => App.bus.off(evt, fn);
    },
    off(evt, fn) {
      const l = listeners[evt];
      if (!l) return;
      const i = l.indexOf(fn);
      if (i >= 0) l.splice(i, 1);
    },
    emit(evt, data) {
      const l = listeners[evt];
      if (!l) return;
      l.slice().forEach((fn) => {
        try {
          fn(data);
        } catch (e) {
          console.error('[bus]', evt, e);
        }
      });
    },
  };
})();
