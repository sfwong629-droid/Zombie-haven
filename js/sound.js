/* Zombie Haven — sound (V2.21). Every sound is synthesised with the Web Audio API at run time:
   no audio files, all original. SND.play(name) for effects, SND.setMode('all'|'sfx'|'off'),
   SND.music(isNight) keeps the ambient loop in step with the clock. iOS needs a tap before audio
   can start, so SND.unlock() is called from the first touch. */
(function () {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, sfxBus = null, musBus = null, mode = 'all', night = false, nextNote = 0, step = 0, timer = null;
  try { mode = localStorage.getItem('zhSound') || 'all'; } catch (e) { /* storage blocked */ }
  const last = {};   // per-sound throttle (game speed 3× can fire the same event many times a second)
  const GAP = { hit: 90, hurt: 140, kill: 120, click: 60, groan: 2500, crackle: 900, down: 400, chime: 300, reward: 400, build: 250, breach: 600, alarm: 3000, night: 5000, dawn: 5000, boss: 6000, coin: 200, woof: 900, rescued: 1200, rankup: 4000, event: 3000 };

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
    rescued: (c, o, t) => { tone(c, o, t, N(12), .14, 'triangle', .08); tone(c, o, t + .12, N(19), .3, 'triangle', .08); },   /* V2.38: someone made it to care */
    rankup: (c, o, t) => { [0, 4, 7, 12].forEach((s2, i) => tone(c, o, t + i * .11, N(s2 + 12), .3, 'square', .05)); [12, 16, 19].forEach((s2) => tone(c, o, t + .5, N(s2 + 12), .7, 'triangle', .05)); },
    event: (c, o, t) => { [7, 12, 16, 12, 19].forEach((s2, i) => tone(c, o, t + i * .09, N(s2 + 12), .14, 'triangle', .06)); },
    woof: (c, o, t) => { tone(c, o, t, 420, .08, 'sawtooth', .1, 260); tone(c, o, t + .13, 400, .09, 'sawtooth', .1, 240); },
  };
  /* ---- 3D.50 music: a generative score in three moods, all synthesised (offline, original) ----
     day    folk guitar fingerpicking (Karplus-Strong strings) over soft strings, a breathy whistle tune now and then (A minor, 84 bpm)
     night  low drone, sparse music-box / piano notes in a big reverb, a faint heartbeat on the tense chord (D minor, 60 bpm)
     danger driving low-string ostinato, drums and brass stabs (E minor, 116 bpm) while a horde or fight is on
     Each bar is written just ahead of time from the mood's chord loop, with seeded variation so it doesn't repeat exactly. */
  const MOODS = {
    day: { bpm: 84, prog: [[0, 'm'], [-4, 'M'], [3, 'M'], [-2, 'M'], [0, 'm'], [-4, 'M'], [-2, 'M'], [-5, 'm']] },
    night: { bpm: 60, prog: [[-7, 'm'], [-11, 'M'], [-2, 'm'], [0, 'M'], [-7, 'm'], [-11, 'M'], [-9, 'M'], [0, 'M']] },
    danger: { bpm: 116, prog: [[-5, 'm'], [-9, 'M'], [-7, 'M'], [2, 'M'], [-5, 'm'], [-9, 'M'], [-7, 'M'], [-3, 'M']] },
  };
  const Q = { m: [0, 3, 7], M: [0, 4, 7] };
  const fold = (r) => { while (r > 0) r -= 12; while (r < -12) r += 12; return r; };   // chord roots live in A2..A3
  const ksCache = new Map();
  function ksBuf(c, f, sec = 1.8, bright = .5) {   // Karplus-Strong plucked string, cached per pitch
    const k = c.sampleRate + ':' + Math.round(f * 10) + ':' + bright; if (ksCache.has(k)) return ksCache.get(k);
    const n = Math.floor(c.sampleRate * sec), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0), P = Math.max(2, Math.round(c.sampleRate / f)), ring = new Float32Array(P);
    for (let i = 0; i < P; i++) ring[i] = (Math.random() * 2 - 1) * (1 - bright * Math.random());
    let p = 0; for (let i = 0; i < n; i++) { const nx = (p + 1) % P, v = ring[p]; d[i] = v; ring[p] = (v + ring[nx]) * .4985; p = nx; }
    ksCache.set(k, b); return b;
  }
  function pluck(c, out, t, f, vol, sec = 1.6, pan = 0) { const s = c.createBufferSource(); s.buffer = ksBuf(c, f, sec); const g = c.createGain(); g.gain.value = vol; const p = c.createStereoPanner ? c.createStereoPanner() : null; s.connect(g); if (p) { p.pan.value = pan; g.connect(p); p.connect(out); } else g.connect(out); s.start(t); s.stop(t + sec); }
  function pad(c, out, t, freqs, dur, vol, cut = 900, att = 1.2) {   // soft strings: detuned saws through a low-pass, slow swell
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cut; fl.Q.value = .4; const g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.setValueAtTime(vol, t + dur - .6); g.gain.linearRampToValueAtTime(.0001, t + dur); fl.connect(g); g.connect(out);
    for (const f of freqs) for (const dt of [-4, 4]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; o.connect(fl); o.start(t); o.stop(t + dur + .05); }
  }
  function whistle(c, out, t, f, dur, vol) {   // breathy flute: sine + vibrato + a little noise
    const o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f; lfo.frequency.value = 5.2; lg.gain.value = f * .006; lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .09); g.gain.setValueAtTime(vol * .85, t + dur * .7); g.gain.linearRampToValueAtTime(.0001, t + dur); o.connect(g); g.connect(out); o.start(t); lfo.start(t); o.stop(t + dur + .05); lfo.stop(t + dur + .05);
    noise(c, out, t, Math.min(.12, dur), vol * .25, f * 2, 2);
  }
  function bell(c, out, t, f, vol) { tone(c, out, t, f, 2.4, 'sine', vol, null, .004); tone(c, out, t, f * 2.01, 1.1, 'sine', vol * .35, null, .004); tone(c, out, t, f * 3.98, .5, 'sine', vol * .12, null, .002); }   // music box / soft piano
  function kick(c, out, t, vol) { tone(c, out, t, 120, .28, 'sine', vol, 42, .002); }
  function snare(c, out, t, vol) { noise(c, out, t, .16, vol, 1800, .7); tone(c, out, t, 190, .08, 'triangle', vol * .4, 150); }
  function hat(c, out, t, vol) { noise(c, out, t, .035, vol, 7000, 1.5, 'highpass'); }
  function stab(c, out, t, freqs, vol) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(2200, t); fl.frequency.exponentialRampToValueAtTime(500, t + .35); const g = c.createGain(); env(c, g, t, .01, vol, .4); fl.connect(g); g.connect(out);
    for (const f of freqs) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(fl); o.start(t); o.stop(t + .45); } }
  function verb(c) {   // a simple generated hall reverb
    const sec = 2.6, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2); }
    const cv = c.createConvolver(); cv.buffer = b; return cv;
  }
  function musicGraph(c, out) {   // dry + reverb send
    const dry = c.createGain(), wet = c.createGain(), cv = verb(c); dry.gain.value = 1; wet.gain.value = .55; dry.connect(out); dry.connect(cv); cv.connect(wet); wet.connect(out);
    return dry;
  }
  let mrnd = 1; const mr = () => ((mrnd = (mrnd * 16807) % 2147483647) / 2147483647);
  function writeBar(c, out, t0, mood, bar) {   // schedules one bar; returns its length in seconds
    const M = MOODS[mood], beat = 60 / M.bpm, len = beat * 4, [r0, q] = M.prog[bar % M.prog.length], root = fold(r0), ch = Q[q].map((s) => root + s), F = (s) => N(s);
    const phrase = Math.floor(bar / M.prog.length);
    if (mood === 'day') {
      if (bar % 2 === 0) pad(c, out, t0, [F(root - 12), F(ch[1]), F(ch[2])], len * 2, .011, 700, 1.5);
      const pat = [[-12, 0], [ch[2] - root, 1], [ch[1] - root + 12, 2], [ch[2] - root, 1], [7 - 12, 0], [ch[2] - root, 1], [ch[1] - root + 12, 2], [12, 2]];   // fingerpicking: bass, then the chord's middle and top
      pat.forEach(([s, v], i) => { if (i === 7 && mr() < .4) return; pluck(c, out, t0 + i * beat / 2 + (i % 2 ? .012 : 0), F(root + s), [.17, .1, .085][v], v ? 1.4 : 2, [0, -.35, .35][v]); });
      if (phrase % 2 === 1) { const tones = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24, ch[1] + 12 + 2], rh = mr() < .5 ? [0, 1.5, 2, 3] : [0, 2, 3]; rh.forEach((b, i) => { if (mr() < .15) return; const d = (rh[i + 1] ?? 4) - b; whistle(c, out, t0 + b * beat, F(tones[(bar + i * 2 + Math.floor(mr() * 3)) % tones.length]), d * beat * .95, .045); }); }
    } else if (mood === 'night') {
      pad(c, out, t0, [F(root - 12), F(root - 5)], len + .3, .016, 380, 2.2);
      for (let b = 0; b < 4; b++) if (mr() < (b === 0 ? .8 : .38)) bell(c, out, t0 + b * beat + (mr() < .3 ? beat / 2 : 0), F(ch[Math.floor(mr() * 3)] + 12 + (mr() < .3 ? 12 : 0)), .05);
      if (q === 'M' && root === 0) for (let b = 0; b < 4; b += 1) { kick(c, out, t0 + b * beat, .05); kick(c, out, t0 + b * beat + .22, .03); }   // heartbeat on the tense chord
    } else {
      const eighth = beat / 2, six = beat / 4;
      for (let i = 0; i < 16; i++) { const f = F(root - 12 + (i % 4 === 2 ? 12 : 0)); tone(c, out, t0 + i * six, f, six * .9, 'sawtooth', .05, null, .004); }   // low-string ostinato
      [0, 2].forEach((b) => kick(c, out, t0 + b * beat, .22)); if (mr() < .5) kick(c, out, t0 + 2.5 * beat, .14);
      [1, 3].forEach((b) => snare(c, out, t0 + b * beat, .1)); for (let i = 0; i < 8; i++) hat(c, out, t0 + i * eighth, i % 2 ? .025 : .04);
      stab(c, out, t0, ch.map((s) => F(s)), .05); if (bar % 4 === 3) for (let i = 0; i < 4; i++) tone(c, out, t0 + 3 * beat + i * six, 160 - i * 22, .12, 'sine', .14, 70);   // tom fill
      if (bar % 2 === 1) pad(c, out, t0, [F(ch[0] + 12), F(ch[2] + 12)], len, .012, 1600, .2);
    }
    return len;
  }
  let mood = 'day', want = 'day', bar = 0, musOut = null, danger = false;
  function scheduler() {
    if (!ctx || mode !== 'all') return; if (!musOut) musOut = musicGraph(ctx, musBus);
    while (nextNote < ctx.currentTime + .6) {
      const t = Math.max(nextNote, ctx.currentTime + .05);
      if (want !== mood && bar % 2 === 0) { mood = want; bar = 0; musBus.gain.cancelScheduledValues(t); musBus.gain.setValueAtTime(.0001, t); musBus.gain.linearRampToValueAtTime(mode === 'all' ? 1 : 0, t + 1.2); }
      nextNote = t + writeBar(ctx, musOut, t, mood, bar++);
    }
  }
  const setWant = () => { want = danger ? 'danger' : night ? 'night' : 'day'; };
  // iOS rejects resume()/suspend() when the audio device is busy (a call, another app, silent switch): ignore it
  const quiet = (pr) => { if (pr && pr.catch) pr.catch(() => {}); };
  const SND = {
    unlock() {
      if (!AC || mode === 'off') return; if (!ctx) { try { ctx = new AC(); const g = build(ctx); master = g.m; sfxBus = g.s; musBus = g.mu; } catch (e) { ctx = null; return; } }
      if (ctx.state === 'suspended') quiet(ctx.resume()); if (!timer) { nextNote = ctx.currentTime + .1; timer = setInterval(scheduler, 200); }
    },
    play(name) {
      if (!ctx || mode === 'off' || ctx.state !== 'running' || !FX[name]) return; const now = performance.now(); if (now - (last[name] || 0) < (GAP[name] || 80)) return; last[name] = now;
      try { FX[name](ctx, sfxBus, ctx.currentTime + .01); } catch (e) { /* ignore */ }
    },
    music(isNight) { night = !!isNight; setWant(); },
    danger(on) { danger = !!on; setWant(); },   /* 3D.50 a horde or a fight in town */
    get mood() { return mood; },
    get mode() { return mode; },
    setMode(m) { mode = m; try { localStorage.setItem('zhSound', m); } catch (e) { /* storage blocked */ } if (m === 'off' && ctx) quiet(ctx.suspend()); else { SND.unlock(); if (ctx && ctx.state === 'suspended') quiet(ctx.resume()); } if (musBus) musBus.gain.value = m === 'all' ? 1.0 : 0; },
    cycle() { SND.setMode(mode === 'all' ? 'sfx' : mode === 'sfx' ? 'off' : 'all'); return mode; },
    pause(on) { if (!ctx) return; if (on) quiet(ctx.suspend()); else if (mode !== 'off') quiet(ctx.resume()); },
    // offline render for previews/tests: a list of [time, name] effects plus `musicSec` seconds of music
    async render(events, sec, musicSec = 0, dark = false) {
      const c = new OfflineAudioContext(2, Math.ceil(44100 * sec), 44100), g = build(c);
      for (const [t, n] of events) FX[n](c, g.s, t);
      const md = dark === true ? 'night' : dark || 'day', o = musicSec ? musicGraph(c, g.mu) : null; let tt = .05, i = 0; while (tt < musicSec) tt += writeBar(c, o, tt, md, i++);
      const buf = await c.startRendering(); return buf.getChannelData(0);
    },
    names: Object.keys(FX),
  };
  window.SND = SND;
})();
