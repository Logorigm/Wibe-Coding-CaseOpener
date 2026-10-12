/* Рулетка — лента карточек, которая прокручивается и останавливается на выигрыше */
(function () {
  'use strict';
  const App = window.App;
  const U = App.utils;

  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

  class Reel {
    constructor(host, o) {
      o = o || {};
      this.host = host;
      this.vertical = !!o.vertical;
      this.size = o.size || 150;
      this.gap = o.gap != null ? o.gap : 10;
      this.pos = 0;
      this.raf = 0;
      this._resolve = null;
      host.classList.add('reel', this.vertical ? 'reel-v' : 'reel-h');
      host.innerHTML = '<div class="reel-track"></div><div class="reel-marker"></div>';
      this.track = host.querySelector('.reel-track');
      this.track.style.gap = this.gap + 'px';
    }
    setItems(items) {
      this.items = items;
      const dim = this.vertical ? 'height' : 'width';
      this.track.innerHTML = items
        .map((it) => `<div class="reel-cell" style="${dim}:${this.size}px;flex:0 0 ${this.size}px">${App.ui.card(it.cid, { size: 'reel', shiny: it.shiny, hideValue: true })}</div>`)
        .join('');
      this.cells = Array.from(this.track.children);
      this.host.classList.remove('done', 'spinning');
      this.pos = 0;
      this.apply(0);
    }
    apply(px) {
      this.track.style.transform = this.vertical ? `translate3d(0,${-px}px,0)` : `translate3d(${-px}px,0,0)`;
    }
    viewport() {
      return this.vertical ? this.host.clientHeight : this.host.clientWidth;
    }
    targetFor(index, jitter) {
      const step = this.size + this.gap;
      return index * step + this.size / 2 - this.viewport() / 2 + (jitter || 0);
    }
    // Показать позицию index по центру без анимации
    center(index) {
      this.pos = this.targetFor(index, 0);
      this.apply(this.pos);
    }
    spin(index, o) {
      o = o || {};
      const duration = o.duration != null ? o.duration : 6000;
      const jitter = o.jitter != null ? o.jitter : (U.rand() - 0.5) * this.size * 0.7;
      const start = this.pos;
      const end = this.targetFor(index, jitter);
      const step = this.size + this.gap;
      const vp = this.viewport();
      this.winIndex = index;
      this._end = end;
      this.host.classList.add('spinning');
      this.host.classList.remove('done');
      cancelAnimationFrame(this.raf);
      if (this._resolve) {
        const prev = this._resolve;
        this._resolve = null;
        prev();
      }
      const token = (this._token = {});
      return new Promise((resolve) => {
        this._resolve = resolve;
        if (duration <= 0) {
          this.finish();
          return;
        }
        const t0 = performance.now();
        let lastCell = -1;
        const frame = (now) => {
          if (!this._resolve || this._token !== token) return;
          const t = Math.min(1, (now - t0) / duration);
          const p = start + (end - start) * easeOutQuart(t);
          this.pos = p;
          this.apply(p);
          const cell = Math.floor((p + vp / 2 + this.gap / 2) / step);
          if (cell !== lastCell) {
            lastCell = cell;
            if (o.onTick) o.onTick(cell);
          }
          if (t < 1) this.raf = requestAnimationFrame(frame);
          else this.finish();
        };
        this.raf = requestAnimationFrame(frame);
      });
    }
    skip() {
      if (this._resolve) this.finish();
    }
    finish() {
      cancelAnimationFrame(this.raf);
      this.pos = this._end;
      this.apply(this._end);
      this.host.classList.remove('spinning');
      this.host.classList.add('done');
      if (this.cells && this.cells[this.winIndex]) this.cells[this.winIndex].classList.add('win');
      const r = this._resolve;
      this._resolve = null;
      if (r) r();
    }
    get spinning() {
      return !!this._resolve;
    }
  }

  App.Reel = Reel;

  // Длительность анимаций в зависимости от настроек
  App.anim = {
    speed: () => App.settings.animSpeed || 'normal',
    dur(normal, fast) {
      const s = App.anim.speed();
      if (s === 'instant') return 0;
      if (s === 'fast') return fast != null ? fast : normal * 0.35;
      return normal;
    },
  };

  // Тики со ограничением частоты
  let lastTick = 0;
  App.tick = (freq) => {
    const now = performance.now();
    if (now - lastTick < 28) return;
    lastTick = now;
    App.sfx.tick(freq);
  };
})();
