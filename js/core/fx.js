/* Визуальные эффекты: конфетти, искры, вспышки, лепестки сакуры */
(function () {
  'use strict';
  const reducedMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const App = window.App;
  const U = App.utils;
  let canvas = null;
  let ctx = null;
  let parts = [];
  let running = false;
  let W = 0;
  let H = 0;

  function init() {
    canvas = document.getElementById('fx-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }
  function resize() {
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawStar(c, r) {
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const rr = i % 2 ? r * 0.35 : r;
      const a = (i * Math.PI) / 4;
      c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath();
    c.fill();
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    parts = parts.filter((p) => p.life > 0 && p.y < H + 60);
    for (const p of parts) {
      p.vy += p.g;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 1;
      const alpha = Math.min(1, p.life / 30);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.scale(1, Math.cos(p.rot * 2.3));
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else if (p.shape === 'star') {
        drawStar(ctx, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (parts.length) requestAnimationFrame(loop);
    else {
      running = false;
      ctx.clearRect(0, 0, W, H);
    }
  }
  function add(p) {
    parts.push(p);
    if (!running) {
      running = true;
      requestAnimationFrame(loop);
    }
  }

  const DEFAULT_COLORS = ['#ff4fa3', '#8b5cf6', '#22d3ee', '#fbbf24', '#34d399', '#f8fafc'];

  App.fx = {
    init,
    enabled() {
      return !!ctx && !reducedMotion();
    },
    confetti(o) {
      if (!App.fx.enabled()) return;
      o = o || {};
      const colors = o.colors || DEFAULT_COLORS;
      const count = o.count || 140;
      const x = o.x != null ? o.x : W / 2;
      const y = o.y != null ? o.y : H * 0.35;
      for (let i = 0; i < count; i++) {
        const a = U.randFloat(0, Math.PI * 2);
        const s = U.randFloat(4, 15);
        add({
          x, y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s - 6,
          g: 0.28, drag: 0.975,
          rot: U.randFloat(0, 6), vr: U.randFloat(-0.25, 0.25),
          size: U.randFloat(7, 13),
          color: U.pick(colors),
          shape: U.rand() < 0.75 ? 'rect' : 'star',
          life: U.randInt(90, 170),
        });
      }
    },
    rain(o) {
      if (!App.fx.enabled()) return;
      o = o || {};
      const colors = o.colors || DEFAULT_COLORS;
      for (let i = 0; i < (o.count || 120); i++) {
        add({
          x: U.randFloat(0, W), y: U.randFloat(-H * 0.6, -10),
          vx: U.randFloat(-1.5, 1.5), vy: U.randFloat(2, 6),
          g: 0.05, drag: 0.995,
          rot: U.randFloat(0, 6), vr: U.randFloat(-0.2, 0.2),
          size: U.randFloat(7, 12), color: U.pick(colors),
          shape: U.rand() < 0.7 ? 'rect' : 'star', life: 260,
        });
      }
    },
    burst(x, y, color, count) {
      if (!App.fx.enabled()) return;
      for (let i = 0; i < (count || 28); i++) {
        const a = U.randFloat(0, Math.PI * 2);
        const s = U.randFloat(2, 8);
        add({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          g: 0.06, drag: 0.94, rot: 0, vr: 0.1,
          size: U.randFloat(4, 9), color: Array.isArray(color) ? U.pick(color) : color || '#fff',
          shape: U.rand() < 0.5 ? 'star' : 'dot', life: U.randInt(40, 70),
        });
      }
    },
    burstAt(el, color, count) {
      if (!el) return;
      const r = el.getBoundingClientRect();
      App.fx.burst(r.left + r.width / 2, r.top + r.height / 2, color, count);
    },
    flash(color) {
      if (reducedMotion()) return;
      const d = document.createElement('div');
      d.className = 'fx-flash';
      d.style.background = color || '#fff';
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 700);
    },
    shake(el) {
      if (!el || reducedMotion()) return;
      el.classList.remove('fx-shake');
      void el.offsetWidth;
      el.classList.add('fx-shake');
      setTimeout(() => el.classList.remove('fx-shake'), 600);
    },
  };
})();
