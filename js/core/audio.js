/* Звуки — синтезируются на лету через WebAudio (никаких файлов не нужно) */
(function () {
  'use strict';
  const App = window.App;
  let ctx = null;
  let master = null;
  let noiseBuf = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        ctx = new AC();
      } catch (e) {
        return null;
      }
      master = ctx.createGain();
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    master.gain.value = Math.max(0, Math.min(1, App.settings.volume)) * 0.9;
    return ctx;
  }

  function tone(freq, dur, o) {
    o = o || {};
    const t0 = ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * o.slide), t0 + dur);
    const vol = o.vol != null ? o.vol : 0.2;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, o) {
    o = o || {};
    const t0 = ctx.currentTime + (o.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(o.freq || 1200, t0);
    if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t0 + dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    const vol = o.vol != null ? o.vol : 0.2;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (o.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  const arp = (notes, step, o) => notes.forEach((f, i) => tone(f, (o && o.dur) || 0.25, Object.assign({}, o, { delay: ((o && o.delay) || 0) + i * step })));

  const SOUNDS = {
    click: () => tone(720, 0.06, { type: 'triangle', vol: 0.08 }),
    soft: () => tone(520, 0.05, { type: 'sine', vol: 0.06 }),
    tick: () => tone(1500 + Math.random() * 300, 0.03, { type: 'square', vol: 0.035 }),
    tickLow: () => tone(900, 0.03, { type: 'triangle', vol: 0.05 }),
    open: () => {
      noise(0.5, { vol: 0.12, freq: 600, sweep: 4000, filter: 'bandpass', q: 2 });
      tone(220, 0.45, { type: 'sawtooth', vol: 0.04, slide: 3 });
    },
    whoosh: () => noise(0.35, { vol: 0.1, freq: 3000, sweep: 400, filter: 'bandpass', q: 1.5 }),
    coin: () => {
      tone(988, 0.08, { type: 'square', vol: 0.05 });
      tone(1319, 0.3, { type: 'square', vol: 0.05, delay: 0.07 });
    },
    gem: () => arp([1568, 2093, 2637], 0.05, { type: 'sine', vol: 0.08, dur: 0.3 }),
    win: () => arp([523, 659, 784, 1047], 0.08, { type: 'triangle', vol: 0.12 }),
    bigwin: () => {
      arp([523, 659, 784, 1047, 1319, 1568], 0.07, { type: 'triangle', vol: 0.12, dur: 0.35 });
      arp([1047, 1568, 2093], 0.09, { type: 'sine', vol: 0.06, dur: 0.6, delay: 0.45 });
    },
    lose: () => {
      tone(330, 0.3, { type: 'sawtooth', vol: 0.05, slide: 0.6 });
      tone(220, 0.45, { type: 'sawtooth', vol: 0.05, slide: 0.5, delay: 0.18 });
    },
    error: () => {
      tone(180, 0.12, { type: 'square', vol: 0.05 });
      tone(140, 0.16, { type: 'square', vol: 0.05, delay: 0.1 });
    },
    levelup: () => {
      arp([392, 523, 659, 784], 0.1, { type: 'square', vol: 0.06, dur: 0.2 });
      arp([523, 659, 784, 1047], 0.001, { type: 'triangle', vol: 0.08, dur: 0.9, delay: 0.42 });
    },
    achieve: () => arp([880, 1109, 1319, 1760], 0.07, { type: 'sine', vol: 0.09, dur: 0.4 }),
    explode: () => {
      noise(0.9, { vol: 0.3, freq: 900, sweep: 80 });
      tone(120, 0.6, { type: 'sawtooth', vol: 0.08, slide: 0.3 });
    },
    pop: () => tone(420, 0.09, { type: 'sine', vol: 0.12, slide: 2.2 }),
    flip: () => noise(0.12, { vol: 0.08, freq: 2500, filter: 'highpass' }),
    gemTile: () => arp([1175, 1568], 0.05, { type: 'sine', vol: 0.09, dur: 0.22 }),
    cashout: () => arp([784, 988, 1175, 1568], 0.05, { type: 'triangle', vol: 0.1, dur: 0.3 }),
  };

  // Звук открытия персонажа — чем выше редкость, тем богаче аккорд
  function reveal(tier) {
    const base = [261.6, 329.6, 392, 523.3, 659.3, 784, 1046.5, 1318.5];
    const n = Math.min(base.length, 2 + tier);
    const notes = base.slice(0, n).map((f) => f * (1 + tier * 0.06));
    arp(notes, tier >= 4 ? 0.09 : 0.06, { type: tier >= 3 ? 'triangle' : 'sine', vol: 0.09 + tier * 0.012, dur: 0.35 + tier * 0.08 });
    if (tier >= 4) {
      noise(1.2, { vol: 0.05, freq: 6000, filter: 'highpass', delay: 0.1 });
      arp([2093, 2637, 3136], 0.12, { type: 'sine', vol: 0.04, dur: 0.6, delay: n * 0.09 });
    }
  }

  App.sfx = {
    play(name) {
      if (!App.settings.sound) return;
      if (!ensure()) return;
      try {
        (SOUNDS[name] || SOUNDS.click)();
      } catch (e) { /* ignore */ }
    },
    reveal(tier) {
      if (!App.settings.sound) return;
      if (!ensure()) return;
      try { reveal(tier || 0); } catch (e) { /* ignore */ }
    },
    // для «тиков» с регулируемой высотой (колесо, рулетка)
    tick(freq) {
      if (!App.settings.sound) return;
      if (!ensure()) return;
      try { tone(freq || 1500, 0.03, { type: 'square', vol: 0.035 }); } catch (e) { /* ignore */ }
    },
    unlock() {
      if (App.settings.sound) ensure();
    },
  };

  window.addEventListener('pointerdown', () => App.sfx.unlock(), { once: true });
  window.addEventListener('keydown', () => App.sfx.unlock(), { once: true });
})();
