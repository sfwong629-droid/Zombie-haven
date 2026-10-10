/* Zombie Haven — sound (V2.21). Every sound is synthesised with the Web Audio API at run time:
   no audio files, all original. SND.play(name) for effects, SND.setMode('all'|'sfx'|'off'),
   SND.music(isNight) keeps the ambient loop in step with the clock. iOS needs a tap before audio
   can start, so SND.unlock() is called from the first touch. */
(function () {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, sfxBus = null, musBus = null, mode = 'all', night = false, nextNote = 0, step = 0, timer = null;
  try { mode = localStorage.getItem('zhSound') || 'all'; } catch (e) { /* storage blocked */ }
  const last = {};   // per-sound throttle (game speed 3× can fire the same event many times a second)
  const GAP = { hit: 90, hurt: 140, kill: 120, click: 60, groan: 2500, crackle: 900, down: 400, chime: 300, reward: 400, build: 250, breach: 600, alarm: 3000, night: 5000, dawn: 5000, boss: 6000, coin: 200, woof: 900 };

  function build(c) {   // the graph for a given context (a live one, or an OfflineAudioContext for previews)
    const m = c.createGain(); m.gain.value = .9; m.connect(c.destination);
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 6; comp.knee.value = 6; comp.connect(m);
    const s = c.createGain(); s.gain.value = 3.2; s.connect(comp);
    const mu = c.createGain(); mu.gain.value = 1.0; mu.connect(comp);
    return { m, s, mu };
  }
  function noiseBuf(c, sec) { const b = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * sec)), c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
  function env(c, g, t, a, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  function tone(c, out, t, freq, dur, type = 'square', vol = .2, slideTo = null, a = .005) {
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    env(c, g, t, a, vol, dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + .02);
  }
  function noise(c, out, t, dur, vol = .3, f = 1200, q = .8, type = 'bandpass', fTo = null) {
    const n = c.createBufferSource(); n.buffer = noiseBuf(c, dur + .05); const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (fTo) fl.frequency.exponentialRampToValueAtTime(fTo, t + dur); fl.Q.value = q;
    const g = c.createGain(); env(c, g, t, .003, vol, dur); n.connect(fl); fl.connect(g); g.connect(out); n.start(t); n.stop(t + dur + .05);
  }
  const N = (semi) => 220 * Math.pow(2, semi / 12);   // A3-based note helper
  const FX = {   // each: (context, output, start time)
    hit: (c, o, t) => { noise(c, o, t, .07, .35, 900, 1.2); tone(c, o, t, 160, .06, 'square', .08, 80); },
    hurt: (c, o, t) => { tone(c, o, t, 300, .12, 'sawtooth', .1, 140); noise(c, o, t, .05, .15, 2000); },
    kill: (c, o, t) => { noise(c, o, t, .18, .3, 500, .7, 'lowpass', 120); tone(c, o, t, 110, .2, 'triangle', .14, 55); },
    groan: (c, o, t) => { const d = .9; tone(c, o, t, 95, d, 'sawtooth', .05, 70, .15); tone(c, o, t, 97.5, d, 'sawtooth', .04, 68, .15); },
    down: (c, o, t) => { tone(c, o, t, 392, .18, 'triangle', .14, 330); tone(c, o, t + .18, 311, .35, 'triangle', .14, 262); },
    build: (c, o, t) => { noise(c, o, t, .06, .3, 300, 1, 'lowpass'); noise(c, o, t + .14, .06, .3, 340, 1, 'lowpass'); tone(c, o, t + .28, 880, .12, 'square', .05); },
    click: (c, o, t) => { tone(c, o, t, 1200, .03, 'square', .04); },
    chime: (c, o, t) => { tone(c, o, t, N(15), .18, 'triangle', .1); tone(c, o, t + .08, N(19), .26, 'triangle', .09); },
    reward: (c, o, t) => { [12, 16, 19, 24].forEach((s, i) => tone(c, o, t + i * .07, N(s), .22, 'square', .05)); },
    coin: (c, o, t) => { tone(c, o, t, N(24), .07, 'square', .05); tone(c, o, t + .06, N(31), .16, 'square', .05); },
    breach: (c, o, t) => { noise(c, o, t, .35, .45, 700, .6, 'lowpass', 90); tone(c, o, t, 70, .4, 'sawtooth', .12, 40); },
    alarm: (c, o, t) => { for (let i = 0; i < 3; i++) { tone(c, o, t + i * .36, 660, .16, 'square', .07); tone(c, o, t + i * .36 + .18, 520, .16, 'square', .07); } },
    boss: (c, o, t) => { tone(c, o, t, 55, 1.6, 'sawtooth', .16, 41, .2); tone(c, o, t, 82, 1.6, 'sawtooth', .08, 61, .2); noise(c, o, t + .1, 1.2, .14, 200, .5, 'lowpass'); },
    night: (c, o, t) => { [0, -5, -9].forEach((s, i) => tone(c, o, t + i * .35, N(s), 1.2, 'triangle', .08)); },
    dawn: (c, o, t) => { [3, 7, 10, 15].forEach((s, i) => tone(c, o, t + i * .18, N(s), .7, 'triangle', .07)); },
    crackle: (c, o, t) => { for (let i = 0; i < 6; i++) noise(c, o, t + Math.random() * .5, .02 + Math.random() * .03, .18, 1800 + Math.random() * 2500, 2); noise(c, o, t, .6, .05, 400, .5, 'lowpass'); },
    woof: (c, o, t) => { tone(c, o, t, 420, .08, 'sawtooth', .1, 260); tone(c, o, t + .13, 400, .09, 'sawtooth', .1, 240); },
  };
  // ambient music: a slow minor-pentatonic pluck over a soft pad; darker and lower at night
  const SCALE = [0, 3, 5, 7, 10, 12, 15, 17];
  function musicStep(c, out, t, i, dark) {
    const beat = 60 / 66;   // 66 bpm
    if (i % 16 === 0) { const root = dark ? -12 : -7; [0, 7, 12].forEach((s) => tone(c, out, t, N(root + s), beat * 15.5, 'sine', dark ? .05 : .04, null, 1.2)); }   // pad
    const pat = dark ? [0, null, 2, null, 1, null, null, 3, 0, null, 2, null, 4, null, null, null] : [4, 2, null, 3, 5, null, 2, null, 4, 3, null, 1, 2, null, 0, null];
    const k = pat[i % 16]; if (k !== null) { const s = SCALE[k] + (dark ? -12 : 0) + (i % 32 >= 16 && !dark ? 2 : 0); tone(c, out, t, N(s), beat * 1.6, 'triangle', dark ? .05 : .045, null, .01); }
    return beat / 2;   // eighth notes
  }
  function scheduler() {
    if (!ctx || mode !== 'all') return;
    while (nextNote < ctx.currentTime + .4) { nextNote += musicStep(ctx, musBus, Math.max(nextNote, ctx.currentTime + .02), step++, night); }
  }
  const SND = {
    unlock() {
      if (!AC || mode === 'off') return; if (!ctx) { try { ctx = new AC(); const g = build(ctx); master = g.m; sfxBus = g.s; musBus = g.mu; } catch (e) { ctx = null; return; } }
      if (ctx.state === 'suspended') ctx.resume(); if (!timer) { nextNote = ctx.currentTime + .1; timer = setInterval(scheduler, 150); }
    },
    play(name) {
      if (!ctx || mode === 'off' || ctx.state !== 'running' || !FX[name]) return; const now = performance.now(); if (now - (last[name] || 0) < (GAP[name] || 80)) return; last[name] = now;
      try { FX[name](ctx, sfxBus, ctx.currentTime + .01); } catch (e) { /* ignore */ }
    },
    music(isNight) { night = !!isNight; },
    get mode() { return mode; },
    setMode(m) { mode = m; try { localStorage.setItem('zhSound', m); } catch (e) { /* storage blocked */ } if (m === 'off' && ctx) ctx.suspend(); else { SND.unlock(); if (ctx && ctx.state === 'suspended') ctx.resume(); } if (musBus) musBus.gain.value = m === 'all' ? 1.0 : 0; },
    cycle() { SND.setMode(mode === 'all' ? 'sfx' : mode === 'sfx' ? 'off' : 'all'); return mode; },
    pause(on) { if (!ctx) return; if (on) ctx.suspend(); else if (mode !== 'off') ctx.resume(); },
    // offline render for previews/tests: a list of [time, name] effects plus `musicSec` seconds of music
    async render(events, sec, musicSec = 0, dark = false) {
      const c = new OfflineAudioContext(1, Math.ceil(44100 * sec), 44100), g = build(c);
      for (const [t, n] of events) FX[n](c, g.s, t);
      let tt = .05, i = 0; while (tt < musicSec) tt += musicStep(c, g.mu, tt, i++, dark);
      const buf = await c.startRendering(); return buf.getChannelData(0);
    },
    names: Object.keys(FX),
  };
  window.SND = SND;
})();
