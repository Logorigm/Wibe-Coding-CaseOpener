/* Процедурная графика: портреты-заглушки персонажей и арты кейсов (SVG).
 * Если у персонажа/кейса указан image — используется картинка, а это только запасной вариант. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;
  const S = U.shade;
  const cache = new Map();

  const PAL = {
    hair: ['#ff9ecf', '#f472b6', '#ffc6e5', '#c4b5fd', '#a78bfa', '#93c5fd', '#60a5fa', '#fde68a', '#facc15', '#f8fafc', '#e2e8f0', '#211d2e', '#3b2f2f', '#6b4632', '#a0522d', '#ef4444', '#fb923c', '#5eead4', '#86efac', '#1e3a8a', '#7c3aed'],
    eyes: ['#3b82f6', '#ef4444', '#a855f7', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#84cc16', '#f43f5e'],
    skin: ['#ffe9de', '#fde3d2', '#f9d9c6', '#fff1e8', '#f4cfb6'],
    outfit: ['#1e293b', '#334155', '#6d28d9', '#be185d', '#0369a1', '#15803d', '#b45309', '#b91c1c', '#0f172a', '#7c2d12'],
    accent: ['#ef4444', '#ec4899', '#f59e0b', '#3b82f6', '#a855f7', '#10b981'],
    style: ['long', 'bob', 'twintails', 'ponytail', 'buns', 'hime'],
    acc: ['none', 'none', 'catears', 'foxears', 'bow', 'flower', 'glasses', 'headphones', 'halo', 'horns', 'tiara', 'clip', 'bunny'],
    clothes: ['sailor', 'dress', 'hoodie', 'kimono', 'blazer'],
    mouth: ['smile', 'smile', 'open', 'cat', 'smug', 'o'],
    expr: ['normal', 'normal', 'normal', 'happy', 'wink'],
  };

  function resolveLook(ch) {
    const rng = U.seeded('look:' + ch.id);
    const p = (a) => a[Math.floor(rng() * a.length)];
    const L = {
      hair: p(PAL.hair), eyes: p(PAL.eyes), skin: p(PAL.skin), outfit: p(PAL.outfit), accent: p(PAL.accent),
      style: p(PAL.style), acc: p(PAL.acc), clothes: p(PAL.clothes), mouth: p(PAL.mouth), expr: p(PAL.expr),
      ahoge: rng() < 0.35,
    };
    Object.assign(L, ch.look || {});
    L.accs = (Array.isArray(L.acc) ? L.acc : [L.acc]).filter((a) => a && a !== 'none');
    return L;
  }

  const n1 = (v) => Math.round(v * 10) / 10;
  const mirror = (svg) => `<g transform="translate(300 0) scale(-1 1)">${svg}</g>`;
  const both = (svg) => svg + mirror(svg);
  function star4(x, y, r, fill, op) {
    const k = r * 0.22;
    return `<path d="M${n1(x)} ${n1(y - r)}Q${n1(x + k)} ${n1(y - k)} ${n1(x + r)} ${n1(y)}Q${n1(x + k)} ${n1(y + k)} ${n1(x)} ${n1(y + r)}Q${n1(x - k)} ${n1(y + k)} ${n1(x - r)} ${n1(y)}Q${n1(x - k)} ${n1(y - k)} ${n1(x)} ${n1(y - r)}Z" fill="${fill}" opacity="${n1(op)}"/>`;
  }

  /* ---------------- волосы ---------------- */
  const HAIR_FILL = 'fill="url(#hg)"';
  const BOB = `<path d="M150 64C84 64 60 118 64 190C66 232 68 258 82 278C112 270 188 270 218 278C232 258 234 232 236 190C240 118 216 64 150 64Z" ${HAIR_FILL}/>`;
  function backHair(L) {
    switch (L.style) {
      case 'long':
        return `<path d="M150 64C86 64 58 118 62 192C64 252 54 322 44 400L256 400C246 322 236 252 238 192C242 118 214 64 150 64Z" ${HAIR_FILL}/>`;
      case 'hime':
        return `<path d="M150 64C86 64 60 118 64 192L58 400L242 400L236 192C240 118 214 64 150 64Z" ${HAIR_FILL}/>`;
      case 'ponytail':
        return `<path d="M194 96C262 84 286 162 270 242C260 294 266 340 284 386C236 358 220 302 224 250C228 198 220 150 188 128Z" ${HAIR_FILL}/>` + BOB;
      case 'twintails':
        return both(`<path d="M100 102C44 102 22 178 30 252C36 312 22 356 12 398C64 374 88 318 84 262C80 210 88 160 112 132Z" ${HAIR_FILL}/>`) + BOB;
      case 'buns':
        return both(`<circle cx="90" cy="84" r="31" ${HAIR_FILL}/><path d="M70 76Q90 60 110 74" stroke="#000" stroke-opacity=".15" stroke-width="3" fill="none"/>`) + BOB;
      default:
        return BOB;
    }
  }

  const BANGS =
    'M80 222C72 168 74 112 104 86C126 66 174 66 196 86C226 112 228 168 220 222' +
    'C214 200 210 182 207 162Q201 172 195 186Q191 162 183 148Q179 168 170 182' +
    'Q166 158 157 146Q153 166 144 184Q139 160 130 148Q125 168 115 182' +
    'Q111 164 103 152Q99 170 95 186C91 198 86 210 80 222Z';

  function frontHair(L, c) {
    let s = `<path d="${BANGS}" ${HAIR_FILL}/>`;
    // пряди
    s += `<g stroke="${c.hairD}" stroke-width="1.6" fill="none" opacity=".55" stroke-linecap="round">
      <path d="M150 74Q144 120 144 176"/><path d="M128 82Q114 120 116 176"/><path d="M174 82Q188 120 186 176"/>
      <path d="M106 96Q90 140 88 206"/><path d="M196 98Q212 140 212 206"/></g>`;
    // блик «ангельское кольцо»
    s += `<path d="M104 114Q150 92 196 114" stroke="${c.hairL}" stroke-width="7" fill="none" stroke-linecap="round" stroke-dasharray="16 9" opacity=".7"/>`;
    if (L.style === 'long' || L.style === 'hime') {
      s += both(`<path d="M78 196C72 250 76 300 64 356C76 354 86 346 93 336C97 290 97 240 99 194Z" ${HAIR_FILL}/>`);
    }
    if (L.ahoge) s += `<path d="M150 72C138 44 160 26 178 38C162 38 154 52 157 72Z" ${HAIR_FILL}/>`;
    if (L.style === 'twintails') {
      s += both(`<rect x="88" y="104" width="22" height="13" rx="6" transform="rotate(-32 99 110)" fill="${c.accent}"/>`);
    }
    return s;
  }

  /* ---------------- одежда ---------------- */
  function body(L, c) {
    const o = L.outfit;
    let s = `<path d="M34 400C40 334 86 302 150 298C214 302 260 334 266 400Z" fill="${o}"/>`;
    s += `<path d="M34 400C40 334 86 302 150 298C214 302 260 334 266 400" fill="none" stroke="${S(o, 0.25)}" stroke-width="2" opacity=".4"/>`;
    // шея
    s += `<path d="M131 232L131 300C140 312 160 312 169 300L169 232Z" fill="${c.skin}"/>`;
    s += `<path d="M131 244C140 266 160 266 169 244L169 232L131 232Z" fill="${c.skinD}" opacity=".8"/>`;
    switch (L.clothes) {
      case 'sailor':
        s += `<path d="M114 300L150 350L186 300Z" fill="${c.skin}"/>`;
        s += `<path d="M104 298L150 360L196 298" stroke="#f8fafc" stroke-width="11" fill="none" stroke-linejoin="round"/>`;
        s += `<path d="M104 298L150 360L196 298" stroke="${c.accent}" stroke-width="2.5" fill="none" stroke-linejoin="round" opacity=".9"/>`;
        s += `<path d="M150 360L126 346L130 376Z" fill="${c.accent}"/><path d="M150 360L174 346L170 376Z" fill="${c.accent}"/>`;
        s += `<path d="M146 364L136 400L150 392L164 400L154 364Z" fill="${S(c.accent, -0.15)}"/><circle cx="150" cy="361" r="6" fill="${S(c.accent, -0.25)}"/>`;
        break;
      case 'dress':
        s += `<path d="M106 304C122 334 178 334 194 304L184 300C170 318 130 318 116 300Z" fill="${c.skin}"/>`;
        s += `<path d="M104 304C122 338 178 338 196 304" stroke="#fff" stroke-width="4" fill="none" stroke-dasharray="2 5" stroke-linecap="round" opacity=".85"/>`;
        s += `<rect x="131" y="268" width="38" height="8" rx="4" fill="#1f1b2e"/><path d="M150 276l-6 8l6 8l6-8Z" fill="${c.accent}"/>`;
        break;
      case 'hoodie':
        s += `<path d="M90 314C106 286 194 286 210 314C196 330 104 330 90 314Z" fill="${S(o, -0.22)}"/>`;
        s += `<path d="M138 320L134 372M162 320L166 372" stroke="#f8fafc" stroke-width="3" stroke-linecap="round"/>`;
        s += `<circle cx="134" cy="375" r="4" fill="#f8fafc"/><circle cx="166" cy="375" r="4" fill="#f8fafc"/>`;
        break;
      case 'kimono':
        s += `<path d="M118 298L150 344L182 298Z" fill="${c.skin}"/>`;
        s += `<path d="M112 296L160 372" stroke="#f8fafc" stroke-width="10" stroke-linecap="round"/>`;
        s += `<path d="M188 296L144 360" stroke="#f8fafc" stroke-width="10" stroke-linecap="round"/>`;
        s += `<path d="M44 386L256 386L262 400L38 400Z" fill="${c.accent}"/>`;
        s += `<g fill="${S(o, 0.35)}" opacity=".5"><circle cx="80" cy="350" r="5"/><circle cx="222" cy="342" r="5"/><circle cx="100" cy="376" r="3.5"/><circle cx="206" cy="372" r="3.5"/></g>`;
        break;
      case 'blazer':
      default:
        s += `<path d="M122 298L150 352L178 298Z" fill="#f8fafc"/>`;
        s += `<path d="M118 298L150 360L104 330Z" fill="${S(o, -0.25)}"/><path d="M182 298L150 360L196 330Z" fill="${S(o, -0.25)}"/>`;
        s += `<path d="M145 304L155 304L158 340L150 356L142 340Z" fill="${c.accent}"/>`;
        break;
    }
    return s;
  }

  /* ---------------- лицо ---------------- */
  const FACE = 'M92 152C92 206 112 248 150 262C188 248 208 206 208 152C208 106 182 88 150 88C118 88 92 106 92 152Z';

  function eye(cx, cy, dir, L, idx) {
    const id = 'e' + idx;
    const P = (dx, dy) => `${n1(cx + dir * dx)} ${n1(cy + dy)}`;
    const white = `M${P(-17, -4)}Q${P(0, -15)} ${P(18, -8)}Q${P(19, 14)} ${P(0, 19)}Q${P(-18, 15)} ${P(-17, -4)}Z`;
    let s = `<clipPath id="${id}"><path d="${white}"/></clipPath>`;
    s += `<path d="${white}" fill="#fff"/>`;
    s += `<g clip-path="url(#${id})">`;
    s += `<ellipse cx="${n1(cx + dir)}" cy="${cy + 3}" rx="12.5" ry="16" fill="url(#ig)"/>`;
    s += `<ellipse cx="${n1(cx + dir)}" cy="${cy + 5}" rx="5.5" ry="8" fill="${S(L.eyes, -0.7)}"/>`;
    s += `<ellipse cx="${n1(cx + dir)}" cy="${cy + 13}" rx="7" ry="3" fill="${S(L.eyes, 0.55)}" opacity=".55"/>`;
    s += `<path d="M${P(-20, -12)}L${P(20, -12)}L${P(20, -3)}Q${P(0, -9)} ${P(-20, -2)}Z" fill="#000" opacity=".12"/>`;
    s += '</g>';
    s += `<circle cx="${cx - 5}" cy="${cy - 3}" r="5" fill="#fff"/><circle cx="${cx + 5}" cy="${cy + 10}" r="2.2" fill="#fff" opacity=".9"/>`;
    s += `<path d="M${P(-20, -2)}Q${P(-2, -18)} ${P(19, -9)}" stroke="#2a1a2e" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M${P(17, -8)}L${P(25, -13)}" stroke="#2a1a2e" stroke-width="3" stroke-linecap="round"/>`;
    s += `<path d="M${P(-9, 19)}Q${P(0, 21)} ${P(10, 17)}" stroke="#2a1a2e" stroke-width="1.5" fill="none" opacity=".4"/>`;
    return s;
  }
  function closedEye(cx, cy) {
    return `<path d="M${cx - 15} ${cy + 5}Q${cx} ${cy - 12} ${cx + 15} ${cy + 5}" stroke="#2a1a2e" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  }

  function face(L, c) {
    let s = `<path d="${FACE}" fill="${c.skin}"/>`;
    // тень от чёлки
    s += `<clipPath id="fc"><path d="${FACE}"/></clipPath><g clip-path="url(#fc)"><path d="${BANGS}" transform="translate(0 8)" fill="${c.skinD}" opacity=".75"/></g>`;
    // румянец
    s += `<ellipse cx="113" cy="222" rx="12" ry="5.5" fill="#ff6f91" opacity=".28"/><ellipse cx="187" cy="222" rx="12" ry="5.5" fill="#ff6f91" opacity=".28"/>`;
    s += `<g stroke="#ff5d8a" stroke-width="1.4" opacity=".45" stroke-linecap="round"><path d="M108 219l-3 5M114 219l-3 5M120 219l-3 5M184 219l-3 5M190 219l-3 5M196 219l-3 5"/></g>`;
    // глаза
    const ey = 190;
    if (L.expr === 'happy') s += closedEye(122, ey) + closedEye(178, ey);
    else if (L.expr === 'wink') s += eye(122, ey, -1, L, 1) + closedEye(178, ey);
    else s += eye(122, ey, -1, L, 1) + eye(178, ey, 1, L, 2);
    // нос
    s += `<path d="M151 212L149 217" stroke="${S(c.skin, -0.3)}" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`;
    // рот
    const mc = '#9b3b55';
    switch (L.mouth) {
      case 'open':
        s += `<path d="M141 228Q150 246 159 228Q150 231 141 228Z" fill="#8e2b47"/><ellipse cx="150" cy="238" rx="4.5" ry="2.6" fill="#f27b8f"/>`;
        break;
      case 'cat':
        s += `<path d="M139 229Q144.5 236 150 230Q155.5 236 161 229" stroke="${mc}" stroke-width="2.3" fill="none" stroke-linecap="round"/>`;
        break;
      case 'smug':
        s += `<path d="M141 233Q152 236 160 227" stroke="${mc}" stroke-width="2.3" fill="none" stroke-linecap="round"/>`;
        break;
      case 'o':
        s += `<ellipse cx="150" cy="233" rx="3.6" ry="4.4" fill="#8e2b47"/>`;
        break;
      default:
        s += `<path d="M142 230Q150 237 158 230" stroke="${mc}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    }
    return s;
  }

  /* ---------------- аксессуары ---------------- */
  const ACC = {
    catears: { layer: 'under', draw: (c) => both(`<path d="M86 132L80 46L142 88Z" fill="${c.hair}" stroke="${c.hair}" stroke-width="8" stroke-linejoin="round"/><path d="M93 118L90 64L128 90Z" fill="#ffb3c8"/>`) },
    foxears: { layer: 'under', draw: (c) => both(`<path d="M84 136L62 28L146 88Z" fill="${c.hair}" stroke="${c.hair}" stroke-width="6" stroke-linejoin="round"/><path d="M91 120L74 52L127 90Z" fill="#fff4e6"/><path d="M62 28L69 56L84 47Z" fill="#fff"/>`) },
    bunny: { layer: 'under', draw: () => both(`<ellipse cx="112" cy="40" rx="16" ry="50" transform="rotate(-14 112 70)" fill="#f8fafc"/><ellipse cx="112" cy="44" rx="7" ry="38" transform="rotate(-14 112 70)" fill="#ffc4d6"/>`) },
    horns: { layer: 'under', draw: () => both(`<path d="M110 96C92 74 94 44 114 24C110 50 118 70 134 86Z" fill="#2d2338"/><path d="M112 88C100 70 100 52 112 36" stroke="#8b7aa3" stroke-width="2" fill="none" opacity=".6"/>`) },
    glasses: { layer: 'mid', draw: () => `<g fill="#fff" fill-opacity=".08" stroke="#3b2f4a" stroke-width="3.2"><circle cx="122" cy="192" r="22"/><circle cx="178" cy="192" r="22"/></g><path d="M144 190Q150 185 156 190" stroke="#3b2f4a" stroke-width="3" fill="none"/>` },
    bow: { layer: 'over', draw: (c) => `<g transform="translate(206 90) rotate(18)"><path d="M0 0C-30 -30 -48 6 -38 16C-28 24 -12 10 0 0Z" fill="${c.accent}"/><path d="M0 0C30 -30 48 6 38 16C28 24 12 10 0 0Z" fill="${c.accent}"/><path d="M-4 4L-14 36L-2 30Z" fill="${S(c.accent, -0.2)}"/><path d="M4 4L14 36L2 30Z" fill="${S(c.accent, -0.2)}"/><circle r="8" fill="${S(c.accent, -0.25)}"/><path d="M-30 -8C-24 -14 -16 -10 -10 -4" stroke="#fff" stroke-width="2" fill="none" opacity=".45"/></g>` },
    flower: { layer: 'over', draw: () => {
      let p = '';
      for (let i = 0; i < 5; i++) p += `<ellipse cx="0" cy="-11" rx="7.5" ry="11" transform="rotate(${i * 72})" fill="#ffc0dc" stroke="#ff8fbf" stroke-width="1"/>`;
      return `<g transform="translate(94 120)">${p}<circle r="5" fill="#fde047"/></g>`;
    } },
    clip: { layer: 'over', draw: (c) => `<g transform="translate(202 128) rotate(-30)"><rect x="-14" y="-5" width="28" height="8" rx="4" fill="${c.accent}"/><rect x="-14" y="6" width="28" height="6" rx="3" fill="${S(c.accent, 0.35)}"/></g>` },
    headphones: { layer: 'over', draw: (c) => `<path d="M74 182C64 56 236 56 226 182" stroke="#2a2540" stroke-width="10" fill="none" stroke-linecap="round"/>` + both(`<rect x="58" y="160" width="28" height="52" rx="12" fill="#2a2540"/><rect x="64" y="170" width="14" height="32" rx="7" fill="${c.accent}"/>`) },
    halo: { layer: 'top', draw: () => `<ellipse cx="150" cy="42" rx="56" ry="13" fill="none" stroke="#fff3b0" stroke-width="14" opacity=".22"/><ellipse cx="150" cy="42" rx="56" ry="13" fill="none" stroke="#fde68a" stroke-width="5"/>` },
    tiara: { layer: 'over', draw: (c) => `<path d="M106 98L116 72L130 90L150 56L170 90L184 72L194 98Q150 84 106 98Z" fill="#fcd34d" stroke="#b45309" stroke-width="2" stroke-linejoin="round"/><circle cx="150" cy="80" r="6" fill="${c.accent}" stroke="#fff" stroke-width="1.5"/><circle cx="118" cy="87" r="3" fill="#fff"/><circle cx="182" cy="87" r="3" fill="#fff"/>` },
  };

  function portraitSVG(ch) {
    const L = resolveLook(ch);
    const rc = (ch.r && ch.r.color) || '#888';
    const tier = (ch.r && ch.r.index) || 0;
    const c = {
      hair: L.hair, hairD: S(L.hair, -0.32), hairL: S(L.hair, 0.45),
      skin: L.skin, skinD: S(L.skin, -0.1), accent: L.accent,
    };
    const rng = U.seeded('bg:' + ch.id);
    const accs = L.accs.map((a) => ACC[a]).filter(Boolean);
    const layer = (name) => accs.filter((a) => a.layer === name).map((a) => a.draw(c, L)).join('');

    let s = `<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${S(rc, -0.3)}"/><stop offset="1" stop-color="${S(rc, -0.85)}"/></linearGradient>
<radialGradient id="gl" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="${S(rc, 0.2)}" stop-opacity=".7"/><stop offset="1" stop-color="${rc}" stop-opacity="0"/></radialGradient>
<linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.hairL}"/><stop offset=".3" stop-color="${c.hair}"/><stop offset="1" stop-color="${c.hairD}"/></linearGradient>
<linearGradient id="ig" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${S(L.eyes, -0.55)}"/><stop offset=".55" stop-color="${L.eyes}"/><stop offset="1" stop-color="${S(L.eyes, 0.5)}"/></linearGradient>
</defs>`;
    s += '<rect width="300" height="400" fill="url(#bg)"/>';
    if (tier >= 4) {
      let rays = '';
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const a1 = a - 0.09;
        const a2 = a + 0.09;
        rays += `<path d="M150 170L${n1(150 + Math.cos(a1) * 420)} ${n1(170 + Math.sin(a1) * 420)}L${n1(150 + Math.cos(a2) * 420)} ${n1(170 + Math.sin(a2) * 420)}Z"/>`;
      }
      s += `<g fill="#fff" opacity=".09">${rays}</g>`;
    }
    s += '<circle cx="150" cy="175" r="200" fill="url(#gl)"/>';
    for (let i = 0; i < 4 + tier * 2; i++) s += star4(rng() * 300, rng() * 360, 3 + rng() * 8, '#fff', 0.2 + rng() * 0.45);
    s += '<g transform="translate(150 200) scale(1.1) translate(-150 -200)">';
    s += backHair(L);
    s += layer('under');
    s += body(L, c);
    s += face(L, c);
    s += layer('mid');
    s += frontHair(L, c);
    s += layer('over');
    s += layer('top');
    s += '</g>';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">${s}</svg>`;
  }

  /* ---------------- арт кейса ---------------- */
  const EMB = {
    star() {
      let d = '';
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 6.5 : 15;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        d += (i ? 'L' : 'M') + n1(r * Math.cos(a)) + ' ' + n1(r * Math.sin(a));
      }
      return `<path d="${d}Z"/>`;
    },
    heart: () => '<path d="M0 13C-19 0 -15 -17 0 -7C15 -17 19 0 0 13Z"/>',
    moon: () => '<path d="M4 -15A15 15 0 1 0 4 15A18 18 0 0 1 4 -15Z"/>',
    paw: () => '<ellipse cx="0" cy="6" rx="9.5" ry="7.5"/><circle cx="-11" cy="-4" r="4.2"/><circle cx="-4" cy="-11" r="4.2"/><circle cx="4" cy="-11" r="4.2"/><circle cx="11" cy="-4" r="4.2"/>',
    flower() {
      let p = '';
      for (let i = 0; i < 5; i++) p += `<ellipse cx="0" cy="-8" rx="6" ry="8.5" transform="rotate(${i * 72})"/>`;
      return p;
    },
    crown: () => '<path d="M-15 9L-15 -8L-7 -1L0 -13L7 -1L15 -8L15 9Z"/>',
    gem: () => '<path d="M-13 -4L-6 -12L6 -12L13 -4L0 13Z"/>',
    fire: () => '<path d="M0 -15C9 -4 13 3 9 10C6 15 -6 15 -9 10C-12 3 -6 -2 -4 -9C-2 -3 1 -1 3 -2C4 -7 2 -11 0 -15Z"/>',
  };

  function caseSVG(cs) {
    const col = cs.color || '#ff6fb5';
    const d = S(col, -0.35);
    const l = S(col, 0.3);
    const rib = cs.ribbon || '#fdf2c4';
    const rng = U.seeded('case:' + cs.id);
    const emb = (EMB[cs.emblem] || EMB.star)();
    let sp = '';
    for (let i = 0; i < 6; i++) sp += star4(20 + rng() * 200, 20 + rng() * 80, 4 + rng() * 7, '#fff', 0.4 + rng() * 0.5);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
<defs>
<radialGradient id="g" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="${col}" stop-opacity=".75"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>
<linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${l}"/><stop offset=".5" stop-color="${col}"/><stop offset="1" stop-color="${d}"/></linearGradient>
<linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${S(col, 0.45)}"/><stop offset="1" stop-color="${col}"/></linearGradient>
</defs>
<circle cx="120" cy="130" r="118" fill="url(#g)"/>
${sp}
<ellipse cx="120" cy="214" rx="80" ry="10" fill="#000" opacity=".35"/>
<rect x="46" y="104" width="148" height="106" rx="12" fill="url(#b)"/>
<path d="M60 112L104 112L70 206L56 206Z" fill="#fff" opacity=".13"/>
<rect x="108" y="104" width="24" height="106" fill="${rib}"/>
<rect x="38" y="84" width="164" height="34" rx="9" fill="url(#t)"/>
<rect x="38" y="112" width="164" height="6" fill="#000" opacity=".15"/>
<rect x="108" y="84" width="24" height="34" fill="${S(rib, -0.06)}"/>
<path d="M120 84C92 50 66 64 80 84C88 96 108 92 120 84Z" fill="${rib}"/>
<path d="M120 84C148 50 174 64 160 84C152 96 132 92 120 84Z" fill="${rib}"/>
<path d="M120 84C98 60 82 66 88 80" stroke="${S(rib, -0.25)}" stroke-width="2" fill="none"/>
<path d="M120 84C142 60 158 66 152 80" stroke="${S(rib, -0.25)}" stroke-width="2" fill="none"/>
<circle cx="120" cy="84" r="10" fill="${S(rib, -0.12)}"/>
<circle cx="120" cy="160" r="25" fill="${d}" stroke="${rib}" stroke-width="4"/>
<g transform="translate(120 160)" fill="${rib}">${emb}</g>
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
    // сгенерированный портрет (без учёта image)
    generated(ch) {
      if (!ch) return '';
      const key = 'p:' + ch.id + ':' + ch.rarity + ':' + JSON.stringify(ch.look || {});
      if (!cache.has(key)) cache.set(key, toUrl(portraitSVG(ch)));
      return cache.get(key);
    },
    // картинка персонажа: image или сгенерированная
    portrait(chOrId) {
      const ch = typeof chOrId === 'string' ? App.data.getChar(chOrId) : chOrId;
      if (!ch) return App.art.unknown();
      return ch.image ? ch.image : App.art.generated(ch);
    },
    caseGenerated(cs) {
      const key = 'c:' + cs.id + ':' + cs.color + ':' + cs.emblem + ':' + (cs.ribbon || '');
      if (!cache.has(key)) cache.set(key, toUrl(caseSVG(cs)));
      return cache.get(key);
    },
    caseArt(cs) {
      if (!cs) return '';
      return cs.image ? cs.image : App.art.caseGenerated(cs);
    },
    unknown() {
      if (!cache.has('unknown')) {
        cache.set('unknown', toUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="#1d1a2e"/><text x="150" y="230" font-size="140" text-anchor="middle" fill="#3d3758" font-family="sans-serif">?</text></svg>'));
      }
      return cache.get('unknown');
    },
    svg: { portrait: portraitSVG, caseBox: caseSVG },
    palette: PAL,
  };
})();
