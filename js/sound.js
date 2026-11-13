/* Zombie Haven — sound (V2.21). Every sound is synthesised with the Web Audio API at run time:
   no audio files, all original. SND.play(name) for effects, SND.setMode('all'|'sfx'|'off'),
   SND.music(isNight) keeps the ambient loop in step with the clock. iOS needs a tap before audio
   can start, so SND.unlock() is called from the first touch. */
(function () {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, sfxBus = null, musBus = null, mode = 'all', night = false, nextNote = 0, step = 0, timer = null;
  try { mode = localStorage.getItem('zhSound') || 'all'; } catch (e) { /* storage blocked */ }
  const last = {};   // per-sound throttle (game speed 3× can fire the same event many times a second)
  const GAP = { chop: 150, hammer: 150, rescued2: 1200, rescued3: 1200, rescued4: 1200, rescued5: 1200, rescued6: 1200, hit: 90, hurt: 140, kill: 120, click: 60, groan: 2500, crackle: 900, down: 400, chime: 300, reward: 400, build: 250, breach: 600, alarm: 3000, night: 5000, dawn: 5000, boss: 6000, coin: 200, woof: 900, rescued: 1200, rankup: 4000, event: 3000 };

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
  /* 3D.51 effects: layered and more physical (thuds, wood, metal, voices through formant filters) instead of plain beeps */
  function formant(c, out, t, f0, dur, vol, forms, slideTo, vib = 0) {   // a voice-like buzz shaped by vowel filters
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    if (vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = vib; lg.gain.value = f0 * .04; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + .05); }
    const g = c.createGain(); env(c, g, t, Math.min(.08, dur * .2), vol, dur); g.connect(out);
    for (const [f, q, a] of forms) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; const ga = c.createGain(); ga.gain.value = a; o.connect(bp); bp.connect(ga); ga.connect(g); }
    o.start(t); o.stop(t + dur + .05);
  }
  const thud = (c, o, t, f = 110, vol = .3, d = .18) => tone(c, o, t, f, d, 'sine', vol, f * .4, .002);
  const knock = (c, o, t, f = 420, vol = .25) => { pluck(c, o, t, f, vol, .25); noise(c, o, t, .03, vol * .8, f * 3, 3); thud(c, o, t, f * .45, vol * .5, .1); };
  const clang = (c, o, t, f = 600, vol = .12, d = 1.1) => { [1, 2.76, 5.4, 8.9].forEach((m, i) => tone(c, o, t, f * m, d / (1 + i * .7), 'sine', vol / (1 + i), null, .001)); noise(c, o, t, .02, vol, 5000, 1); };
  const FX = {   // each: (context, output, start time)
    hit: (c, o, t) => { thud(c, o, t, 95, .32, .16); noise(c, o, t, .09, .32, 700, .9, 'lowpass', 200); noise(c, o, t, .025, .18, 3200, 1.5); },
    hurt: (c, o, t) => { formant(c, o, t, 210, .22, .2, [[700, 6, 1], [1200, 8, .6]], 150); thud(c, o, t, 120, .18, .1); },
    kill: (c, o, t) => { thud(c, o, t, 80, .38, .3); noise(c, o, t, .22, .3, 600, .7, 'lowpass', 120); formant(c, o, t + .02, 120, .45, .11, [[500, 5, 1], [900, 6, .5]], 70, 6); },
    groan: (c, o, t) => { const d = 1.3 + Math.random() * .5, f = 82 + Math.random() * 25; formant(c, o, t, f, d, .12, [[420, 5, 1], [820, 7, .55], [2400, 10, .15]], f * .8, 3.5); noise(c, o, t, d, .025, 500, .6, 'lowpass'); },
    down: (c, o, t) => { thud(c, o, t, 70, .35, .35); formant(c, o, t + .05, 180, .5, .13, [[600, 6, 1], [1000, 7, .5]], 110); thud(c, o, t + .55, 60, .15, .2); thud(c, o, t + .78, 60, .12, .2); },
    build: (c, o, t) => {   /* 3D.57 hammer on nails: recorded wood + metal hits (Kenney, CC0), tap-tap-BANG */
      const hits = [[0, 'woodL', .8, 1.25], [.24, 'woodL', .85, 1.2], [.5, 'woodM', 1, 1.1]];
      if (!SFXB.woodL0) { knock(c, o, t, 330, .28); knock(c, o, t + .24, 360, .26); knock(c, o, t + .5, 300, .3); return; }
      for (const [dt, k, v, r] of hits) { sfx(c, o, t + dt, k + rnd3(), v * .36, r); sfx(c, o, t + dt, 'metalL' + rnd3(), v * .19, 1.35); }
    },
    click: (c, o, t) => { pluck(c, o, t, 1400, .12, .08); noise(c, o, t, .012, .08, 4500, 2); },
    chime: (c, o, t) => { bell(c, o, t, N(15), .09); bell(c, o, t + .09, N(22), .08); },
    reward: (c, o, t) => { [12, 16, 19, 24].forEach((s, i) => bell(c, o, t + i * .08, N(s), .08)); pluck(c, o, t, N(0), .2, 1); },
    coin: (c, o, t) => { clang(c, o, t, 1800, .07, .35); clang(c, o, t + .07, 2400, .07, .5); },
    breach: (c, o, t) => { thud(c, o, t, 55, .5, .5); noise(c, o, t, .5, .5, 900, .5, 'lowpass', 80); for (let i = 0; i < 5; i++) knock(c, o, t + .05 + Math.random() * .3, 500 + Math.random() * 500, .12); },
    caralarm: (c, o, t) => { for (let i = 0; i < 8; i++) tone(c, o, t + i * .22, i % 2 ? 980 : 760, .2, 'square', .045, i % 2 ? 760 : 980); },   /* 3D.147 a wreck's alarm: two-tone whoop */
    alarm: (c, o, t) => { for (let i = 0; i < 4; i++) clang(c, o, t + i * .28, 880, .12, .5); },
    boss: (c, o, t) => { formant(c, o, t, 58, 1.8, .3, [[300, 4, 1], [700, 5, .7], [1600, 7, .2]], 40, 5); thud(c, o, t, 45, .4, .8); noise(c, o, t + .1, 1.3, .12, 220, .5, 'lowpass'); },
    night: (c, o, t) => { [0, -5, -9].forEach((s, i) => bell(c, o, t + i * .45, N(s - 12), .07)); },
    dawn: (c, o, t) => { [3, 7, 10, 15].forEach((s, i) => bell(c, o, t + i * .22, N(s + 12), .06)); },
    crackle: (c, o, t) => { for (let i = 0; i < 9; i++) noise(c, o, t + Math.random() * .6, .01 + Math.random() * .03, .2, 1500 + Math.random() * 3500, 2); noise(c, o, t, .7, .06, 300, .5, 'lowpass'); },
    rescued2: (c, o, t) => {   /* 3D.57 option B: a real nylon guitar strums G major, vibraphone answers */
      const ch = [-14, -10, -7, -2, 2, 10], ok = samp(c, o, t, 'nyl', N(ch[0]), .5, 1.8);
      if (!ok) { FX.rescued(c, o, t); return; }
      ch.forEach((sm, i) => samp(c, o, t + i * .022, 'nyl', N(sm), .5, 1.8)); [10, 14, 17, 22].forEach((sm, i) => samp(c, o, t + .32 + i * .11, 'vibes', N(sm), .42, 1.6));
    },
    rescued3: (c, o, t) => { if (!sfx(c, o, t, 'pizzi', .85, 1)) FX.rescued(c, o, t); },   /* 3D.57 option C: recorded pizzicato strings jingle (Kenney, CC0) */
    rescued4: (c, o, t) => {   /* option D: acoustic guitar, C to G 'home' cadence, harp on top */
      const strum = (tt, ch, v) => ch.forEach((sm, i) => samp(c, o, tt + i * .02, 'gtr', N(sm), v, 2));
      if (!samp(c, o, t, 'gtr', N(-9), .001, .1)) { FX.rescued(c, o, t); return; }
      strum(t, [-9, -2, 3, 7, 10], .42); strum(t + .42, [-14, -7, -2, 2, 5, 10], .5); samp(c, o, t + .46, 'harp', N(22), .5, 1.8); samp(c, o, t + .6, 'harp', N(26), .35, 1.6);
    },
    rescued5: (c, o, t) => {   /* option E: a whistled three-note lift over a soft nylon chord */
      if (!samp(c, o, t, 'nyl', N(-2), .5, 2)) { FX.rescued(c, o, t); return; }
      [2, 5, 10].forEach((sm, i) => samp(c, o, t + .02 + i * .02, 'nyl', N(sm), .45, 2));
      [[14, 0, .2], [17, .18, .2], [22, .36, .9]].forEach(([sm, dt, d]) => samp(c, o, t + .05 + dt, 'whis', N(sm), .75, d, 0, .03, .2));
    },
    rescued6: (c, o, t) => {   /* option F: strings swell under a music-box arpeggio */
      if (!samp(c, o, t, 'mbox', N(22), .75, 1.4)) { FX.rescued(c, o, t); return; }
      [-2, 2, 5].forEach((sm) => samp(c, o, t, 'str', N(sm), .4, 1.9, 0, .3, .6)); [26, 29, 34].forEach((sm, i) => samp(c, o, t + (i + 1) * .13, 'mbox', N(sm), .75, 1.4));
    },
    rescued: (c, o, t) => { [0, 4, 7, 12].forEach((s, i) => pluck(c, o, t + i * .07, N(s), .18, 1.2)); bell(c, o, t + .3, N(19), .07); },
    rankup: (c, o, t) => { [0, 4, 7].forEach((s2, i) => stab(c, o, t + i * .13, [N(s2), N(s2 + 7)], .07)); stab(c, o, t + .42, [N(12), N(16), N(19)], .09); [12, 16, 19].forEach((s2) => bell(c, o, t + .42, N(s2 + 12), .05)); },
    radio: (c, o, t) => { noise(c, o, t, .42, .1, 1800, .6, 'bandpass', 900); for (let i = 0; i < 7; i++) noise(c, o, t + Math.random() * .4, .012 + Math.random() * .025, .14, 2200 + Math.random() * 3000, 2); tone(c, o, t + .05, 1400, .22, 'sine', .018, 700); noise(c, o, t + .38, .08, .05, 1200, .8); },   /* 3D.147 static and a tuning whistle when the radio comes on */
    event: (c, o, t) => { [7, 12, 16, 12, 19].forEach((s2, i) => bell(c, o, t + i * .1, N(s2 + 12), .06)); },
    woof: (c, o, t) => { formant(c, o, t, 330, .1, .3, [[900, 4, 1], [1800, 6, .4]], 210); formant(c, o, t + .16, 310, .11, .28, [[880, 4, 1], [1700, 6, .4]], 200); },
    hammer: (c, o, t) => { if (!sfx(c, o, t, 'woodL' + rnd3(), .38, 1.2)) { knock(c, o, t, 340, .2); return; } sfx(c, o, t, 'metalL' + rnd3(), .18, 1.35); },   /* 3D.57 one hammer blow (builders at work) */
    chop: (c, o, t) => {   /* 3D.57 an axe biting into a log: recorded chop + heavy wood thunk (Kenney, CC0) */
      if (!SFXB.chop) { knock(c, o, t, 260, .3); noise(c, o, t, .05, .2, 1800, 1.2); return; }
      sfx(c, o, t, 'chop', 1, 1); sfx(c, o, t + .008, 'woodH' + rnd3(), .9, .82 + Math.random() * .08); noise(c, o, t + .03, .06, .05, 2600, 1.5);
    },
  };
  /* ---- 3D.50 music: a generative score in three moods, all synthesised (offline, original) ----
     day    folk guitar fingerpicking (Karplus-Strong strings) over soft strings, a breathy whistle tune now and then (A minor, 84 bpm)
     night  low drone, sparse music-box / piano notes in a big reverb, a faint heartbeat on the tense chord (D minor, 60 bpm)
     danger driving low-string ostinato, drums and brass stabs (E minor, 116 bpm) while a horde or fight is on
     Each bar is written just ahead of time from the mood's chord loop, with seeded variation so it doesn't repeat exactly. */
  const MOODS = {
    day: { bpm: 84, prog: [[0, 'm'], [-4, 'M'], [3, 'M'], [-2, 'M'], [0, 'm'], [-4, 'M'], [-2, 'M'], [-5, 'm']] },
    night: { bpm: 60, prog: [[-7, 'm'], [-11, 'M'], [-2, 'm'], [0, 'M'], [-7, 'm'], [-11, 'M'], [-9, 'M'], [0, 'M']] },
    lounge: { bpm: 112, prog: [[-4, 'M7'], [-7, 'm7'], [-2, 'm7'], [3, '7'], [0, 'm7'], [-7, '7'], [-2, 'm7'], [3, '7']] },   /* 3D.51 retro 50s lounge (F major, swing) */
    porch: { bpm: 98, prog: [[-2, 'M'], [3, 'M'], [-7, 'M'], [-2, 'M'], [-5, 'm'], [3, 'M'], [-7, 'M'], [-2, 'M']] },   /* 3D.51 country porch (G major) */
    strum: { bpm: 120, prog: [[-7, 'M'], [0, 'M'], [2, 'm'], [-2, 'M'], [-7, 'M'], [0, 'M'], [-2, 'M'], [0, 'M']] },   /* 3D.52 lively strummed acoustic (D major) */
    travis: { bpm: 104, prog: [[-2, 'M'], [3, 'M'], [-2, 'M'], [-7, 'M'], [-5, 'm'], [3, 'M'], [-7, 'M'], [-2, 'M']] },   /* 3D.52 bright fingerstyle (G major) */
    western: { bpm: 92, prog: [[0, 'm'], [0, 'm'], [-7, 'm'], [0, 'm'], [-4, 'M'], [-2, 'M'], [0, 'm'], [-5, 'M']] },   /* 3D.54 desert western (A minor) */
    jig: { bpm: 120, prog: [[-7, 'M'], [-7, 'M'], [-2, 'M'], [0, 'M'], [-7, 'M'], [-5, 'm'], [-2, 'M'], [0, 'M']] },   /* 3D.54 Celtic fiddle jig in 6/8 (D major); bpm = dotted quarters */
    rag: { bpm: 100, prog: [[3, '7M'], [0, '7'], [-7, '7'], [-2, '7'], [3, '7M'], [3, '7'], [-4, 'M'], [-2, '7']] },   /* 3D.54 honky-tonk piano (C major) */
    calm: { bpm: 64, prog: [[3, 'M'], [0, 'm'], [-4, 'M'], [-2, 'M'], [-5, 'm'], [-4, 'M'], [3, 'M'], [-2, 'M']] },   /* 3D.55 slow ballad (C major) */
    hearth: { bpm: 70, prog: [[-2, 'M'], [-7, 'M'], [-5, 'm'], [3, 'M'], [-2, 'M'], [-7, 'M'], [3, 'M'], [-7, 'M']] },   /* 3D.55 slow fingerpicking with cello (G major) */
    danger: { bpm: 116, prog: [[-5, 'm'], [-9, 'M'], [-7, 'M'], [2, 'M'], [-5, 'm'], [-9, 'M'], [-7, 'M'], [-3, 'M']] },
  };
  const Q = { '7M': [0, 4, 7], m: [0, 3, 7], M: [0, 4, 7], M7: [0, 4, 7, 11], m7: [0, 3, 7, 10], '7': [0, 4, 7, 10] };
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
  /* 3D.53 real instruments: recorded samples bundled with the game (assets/audio, works offline). Instruments from the FluidR3 GM
     sound font (Frank Wen, CC BY 3.0), percussion from the Versilian Community Sample Library (CC0). Every 3rd semitone is
     recorded; notes in between are re-pitched. Until they have loaded, the synth versions play instead. */
  const INST = { fid: [4, 6], gtr: [2, 5], nyl: [2, 5], bass: [1, 3], banjo: [3, 5], harp: [4, 5], vibes: [3, 5], tpt: [3, 5], str: [2, 5], mbox: [4, 6], whis: [4, 6], ep: [3, 5], cello: [2, 3], brass: [3, 4], timp: [2, 2], piano: [3, 6] };
  const KIT = ['cajon_lo', 'cajon_hi', 'shaker_dn', 'shaker_up', 'clap', 'snare', 'hat', 'kick', 'tom', 'ride'];
  const SFXN = ['chop', 'pizzi', ...['woodH', 'woodL', 'woodM', 'metalL'].flatMap((k) => [0, 1, 2].map((i) => k + i))], SFXB = {};   /* 3D.57 recorded effects */
  const rnd3 = () => Math.floor(Math.random() * 3);
  function sfx(c, out, t, k, vol, rate = 1) { const b = SFXB[k]; if (!b) return false; const s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = rate * (1 + (Math.random() - .5) * .05); const g = c.createGain(); g.gain.value = vol; s.connect(g); g.connect(out); s.start(t); return true; }
  const NOTES = [['C', 0], ['Eb', 3], ['Gb', 6], ['A', 9]], BANK = {}, KITB = {}; let bankP = null;
  const AUDIO_BASE = (window.ZH_AUDIO_BASE || 'assets/audio/');
  async function loadBank(c) {
    if (bankP) return bankP; const dec = (ab) => new Promise((ok, no) => { const p = c.decodeAudioData(ab, ok, no); if (p && p.then) p.then(ok, no); });
    const get = (u) => fetch(AUDIO_BASE + u).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(u))).then(dec);
    const jobs = [];
    for (const [k, [a, b]] of Object.entries(INST)) { BANK[k] = []; for (let o = a; o <= b; o++) for (const [n, off] of NOTES) jobs.push(get(`${k}/${n}${o}.mp3`).then((buf) => BANK[k].push({ m: 12 * (o + 1) + off, buf })).catch(() => {})); }
    for (const k of KIT) jobs.push(get(`kit/${k}.mp3`).then((buf) => { KITB[k] = buf; }).catch(() => {}));
    for (const k of SFXN) jobs.push(get(`sfx/${k}.mp3`).then((buf) => { SFXB[k] = buf; }).catch(() => {}));
    return (bankP = Promise.all(jobs));
  }
  const LEVEL = { fid: .8, gtr: 1, nyl: 1.1, bass: 1.6, banjo: .9, harp: .7, vibes: 1, tpt: .8, str: .9, mbox: .8, whis: .7, ep: 1, cello: 1.1, brass: .8, timp: 1.2, piano: 1 };
  function samp(c, out, t, k, f, vol, dur = 1.5, pan = 0, att = .004, rel = .25) {   // play instrument k at frequency f; false if not loaded
    const B = BANK[k]; if (!B || !B.length) return false; const m = 69 + 12 * Math.log2(f / 440); let best = B[0]; for (const x of B) if (Math.abs(x.m - m) < Math.abs(best.m - m)) best = x;
    const s = c.createBufferSource(); s.buffer = best.buf; s.playbackRate.value = Math.pow(2, (m - best.m) / 12); const g = c.createGain(), v = vol * (LEVEL[k] || 1);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + att); g.gain.setValueAtTime(v, t + Math.max(att, dur - rel)); g.gain.linearRampToValueAtTime(.0001, t + dur);
    s.connect(g); if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(out); } else g.connect(out); s.start(t); s.stop(t + dur + .05); return true;
  }
  function kit(c, out, t, k, vol, rate = 1) { const b = KITB[k]; if (!b) return false; const s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = rate * (1 + (Math.random() - .5) * .04); const g = c.createGain(); g.gain.value = vol; s.connect(g); g.connect(out); s.start(t); return true; }
  const MVOL = { calm: 2.6, hearth: 2.8, western: 2.3, jig: .75, rag: 4, day: 1.5, travis: 1.6, strum: .8, lounge: .7, porch: .8, night: 1.5, danger: .45 };   /* 3D.53 even out the moods' loudness */
  function writeBar(c, out0, t0, mood, bar) {   // schedules one bar; returns its length in seconds
    const out = c.createGain(); out.gain.value = MVOL[mood] || 1; out.connect(out0);
    const M = MOODS[mood], beat = 60 / M.bpm, len = beat * 4, [r0, q] = M.prog[bar % M.prog.length], root = fold(r0), ch = Q[q].map((s) => root + s), F = (s) => N(s);
    const phrase = Math.floor(bar / M.prog.length);
    const P = (k) => (t, f, vol, dur = 1.4, pan = 0, att, rel) => samp(c, out, t, k, f, vol, dur, pan, att, rel) || pluck(c, out, t, f, vol * .9, Math.min(2, dur), pan);
    const PAD = (k, t, fs, dur, vol, cut) => { if (!fs.every((f) => samp(c, out, t, k, f, vol, dur, 0, .5, .6))) pad(c, out, t, fs, dur, vol * .25, cut, 1.2); };
    const K = (t, k, vol, rate, alt) => kit(c, out, t, k, vol, rate) || (alt && alt());
    if (mood === 'day') {   /* folk: nylon guitar fingerpicking over soft strings, whistle tune */
      const g = P('nyl');
      if (bar % 2 === 0) PAD('str', t0, [F(root - 12), F(ch[1]), F(ch[2])], len * 2, .035, 700);
      const pat = [[-12, 0], [ch[2] - root, 1], [ch[1] - root + 12, 2], [ch[2] - root, 1], [7 - 12, 0], [ch[2] - root, 1], [ch[1] - root + 12, 2], [12, 2]];
      pat.forEach(([s, v], i) => { if (i === 7 && mr() < .4) return; g(t0 + i * beat / 2 + (i % 2 ? .012 : 0), F(root + s), [.32, .2, .17][v], v ? 1.4 : 2, [0, -.3, .3][v]); });
      if (phrase % 2 === 1) { const tones = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24, ch[1] + 14], rh = mr() < .5 ? [0, 1.5, 2, 3] : [0, 2, 3]; rh.forEach((b, i) => { if (mr() < .15) return; const d = (rh[i + 1] ?? 4) - b, f = F(tones[(bar + i * 2 + Math.floor(mr() * 3)) % tones.length]); if (!samp(c, out, t0 + b * beat, 'whis', f, .14, d * beat * .95, .1, .06, .15)) whistle(c, out, t0 + b * beat, f, d * beat * .95, .045); }); }
    } else if (mood === 'strum') {   /* steel guitar strumming, cajon, shaker, a lead lick */
      const g = P('gtr'), six = beat / 4, voice = [root - 12, root - 5, root, ch[1], ch[2], root + 12];
      const strum = (t, down, vol) => { const v = down ? voice : voice.slice(2).reverse(); v.forEach((s2, i) => g(t + i * (down ? .012 : .009), F(s2), vol * (down ? 1 : .65), .9, (i / 5 - .5) * .5)); };
      [[0, 1], [4, 1], [6, 0], [10, 0], [12, 1], [14, 0]].forEach(([i, d]) => strum(t0 + i * six, d, i === 0 ? .2 : .15));
      [0, 2].forEach((b) => K(t0 + b * beat, 'cajon_lo', .55, 1, () => thud(c, out, t0 + b * beat, 90, .2, .14))); [1, 3].forEach((b) => K(t0 + b * beat, 'cajon_hi', .4, 1, () => noise(c, out, t0 + b * beat, .09, .13, 1300, .9)));
      for (let i = 0; i < 16; i += 2) K(t0 + i * six, i % 4 ? 'shaker_up' : 'shaker_dn', .25);
      if (phrase % 2 === 1) { const pent = [0, 2, 4, 7, 9, 12, 14, 16].map((x) => x + 5); [0, 2, 3, 6, 8, 10, 11, 14].forEach((i, k) => { if (mr() < .2) return; g(t0 + i * six, F(pent[(k * 3 + bar * 2) % pent.length]), .2, .5, .4); }); }
    } else if (mood === 'travis') {   /* fingerstyle steel guitar: alternating bass, pinched melody, claps */
      const g = P('gtr');
      [root - 12, root - 5, root - 12, root - 5].forEach((s2, b) => g(t0 + b * beat, F(s2), .28, 1.1, -.2));
      [0, 1, 2, 3].forEach((b) => g(t0 + (b + .5) * beat, F([ch[1], ch[2], ch[1] + 12, ch[2]][b]), .15, .7, .25));
      const mel = [ch[2] + 12, ch[0] + 24, ch[1] + 12, ch[2] + 12, ch[0] + 14, ch[1] + 12], rh = phrase % 2 ? [0, 1.5, 2.5, 3] : [0, 1, 2.5];
      rh.forEach((b, i) => g(t0 + b * beat, F(mel[(i + bar) % mel.length]), .24, 1.2, .35));
      if (phrase % 2 === 1) [1, 3].forEach((b) => K(t0 + b * beat, 'clap', .35, 1, () => noise(c, out, t0 + b * beat, .06, .09, 1600, 1.4)));
      else [1, 3].forEach((b) => K(t0 + b * beat, 'shaker_dn', .25));
    } else if (mood === 'lounge') {   /* 50s swing: upright bass, brushes and ride, electric piano comping, vibraphone, muted trumpet */
      const sw = (b, off) => t0 + (b + (off ? 2 / 3 : 0)) * beat, nx = MOODS.lounge.prog[(bar + 1) % 8], nroot = fold(nx[0]);
      const bs = P('bass'); [root, root + (ch[1] - root), root + 7, nroot + (mr() < .5 ? -1 : 1)].forEach((s2, b) => bs(t0 + b * beat, F(s2 - 24), .5, beat * 1.05, 0, .005, .08));
      [[0, 0], [1, 0], [1, 1], [2, 0], [3, 0], [3, 1]].forEach(([b, o2]) => K(sw(b, o2), 'ride', o2 ? .1 : .16, 1.1, () => clang(c, out, sw(b, o2), 3100, o2 ? .008 : .013, .35)));
      [1, 3].forEach((b) => K(t0 + b * beat, 'snare', .12, .9, () => noise(c, out, t0 + b * beat, .22, .05, 2600, .6)));
      const voic = [ch[1] + 12, ch[3] !== undefined ? ch[3] : ch[2] + 12, ch[2] + 12].map((s2) => F(s2)), ep = P('ep'); [[1, 1], [3, 0]].forEach(([b, o2]) => { if (mr() < .85) voic.forEach((f) => ep(sw(b, o2), f, .09, .55, 0, .005, .15)); });
      const vb = P('vibes'), motif = [[0, 0, 2], [0, 1, 1], [1, 1, 0], [2, 0, 3], [3, 0, 1]], half = bar % 4 < 2 || phrase % 2 === 1;
      if (half) for (const [b, o2, k] of motif) { if (mr() < .2) continue; vb(sw(b, o2), F(ch[(k + bar) % ch.length] + 12 + (k === 3 ? 12 : 0)), .17, 1.2, .2); }
      else if (phrase % 2 === 0) [[0, 0], [0, 1], [1, 1], [2, 0]].forEach(([b, o2], i) => { if (mr() < .25) return; samp(c, out, sw(b, o2), 'tpt', F(ch[(i + bar) % ch.length] + 12), .14, beat * (i === 3 ? 1.6 : .55), -.2, .02, .12); });
    } else if (mood === 'porch') {   /* banjo rolls, boom-chick bass and guitar, stomp, harmonica */
      const bj = P('banjo'), gt = P('gtr'), bs = P('bass'), roll = [0, 2, 1, 3, 0, 2, 1, 3].map((k) => [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24][k]);
      roll.forEach((s2, i) => bj(t0 + i * beat / 2 + (i % 2 ? .01 : 0), F(s2), i % 4 === 0 ? .22 : .16, .7, .3));
      [0, 2].forEach((b, i) => bs(t0 + b * beat, F(root - 24 + (i ? 7 : 0)), .5, beat * .95));
      [1, 3].forEach((b) => ch.forEach((s2, i) => gt(t0 + b * beat + i * .012, F(s2), .1, .4, -.3)));
      K(t0, 'kick', .35, 1, () => kick(c, out, t0, .05)); K(t0 + 2 * beat, 'kick', .28, 1, () => kick(c, out, t0 + 2 * beat, .04));
      if (phrase % 2 === 1 && mr() < .85) { const tn = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 12, ch[0] + 12]; [[0, 1.5], [1.5, .5], [2, 1], [3, 1]].forEach(([b, d], i) => samp(c, out, t0 + b * beat, 'harp', F(tn[(i + bar) % tn.length]), .16, d * beat * .95, .15, .04, .12)); }
    } else if (mood === 'calm') {   /* slow: rolling nylon guitar, a few piano notes, warm strings */
      const g = P('nyl'); PAD('str', t0, [F(root - 12), F(ch[1]), F(ch[2])], len + .4, .028, 600);
      [root - 12, ch[2] - 12, ch[1], ch[2], root + 12, ch[2], ch[1], ch[2] - 12].forEach((s2, i) => g(t0 + i * beat / 2 + i * .004, F(s2), i === 0 ? .26 : .15, 2.2, (i % 2 ? .25 : -.25)));
      const mel = [ch[2] + 12, ch[1] + 12, ch[0] + 24, ch[1] + 12], at = phrase % 2 ? [0, 2] : [0, 1.5, 3];
      if (bar % 2 === 0 || phrase % 2) at.forEach((b, i) => samp(c, out, t0 + b * beat, 'piano', F(mel[(i + bar) % mel.length]), .2, 2.8, .1));
    } else if (mood === 'hearth') {   /* slow: steel-string fingerpicking, a long cello line, soft brushes */
      const g = P('gtr');
      [[0, root - 12], [1, ch[1]], [1.5, ch[2]], [2, root - 5], [3, ch[1] + 12], [3.5, ch[2]]].forEach(([b, s2], i) => g(t0 + b * beat, F(s2), i === 0 ? .24 : .13, 2, i % 2 ? .3 : -.2));
      if (phrase % 2 === 1 || bar % 2 === 0) { const tn = [ch[0], ch[1], ch[2], ch[1]]; samp(c, out, t0, 'cello', F(tn[bar % 4] - 12 + 12), .17, len * .98, -.15, .25, .4); }
      [1, 3].forEach((b) => K(t0 + b * beat, 'snare', .05, .8));
    } else if (mood === 'western') {   /* galloping nylon guitar, lonely whistle, muted trumpet answer, timpani */
      const g = P('nyl'), six = beat / 4;
      [[0, 1, .26], [2, 0, .14], [3, 0, .14], [4, 1, .2], [6, 0, .14], [7, 0, .14], [8, 1, .22], [10, 0, .14], [11, 0, .14], [12, 1, .2], [14, 0, .14], [15, 0, .14]].forEach(([i, full, v]) => (full ? [root - 12, root - 5, ch[1], ch[2]] : [ch[1], ch[2]]).forEach((s2, k) => g(t0 + i * six + k * .01, F(s2), v * (full ? .8 : .7), .45, (k / 3 - .5) * .4)));
      if (bar % 2 === 0) { samp(c, out, t0, 'timp', F(root - 12), .3, 1.4); PAD('str', t0, [F(root - 12), F(ch[2] - 12)], len * 2, .03, 500); }
      const tune = [[0, 2.5, 2], [2.5, .5, 1], [3, 1, 0]], alt = [[0, 1, 1], [1, 1, 2], [2, 2, 0]];
      if (phrase % 2 === 0) (bar % 2 ? alt : tune).forEach(([b, d, k]) => { const f = F(ch[k] + 12 + (k === 2 && bar % 4 === 0 ? 12 : 0)); if (!samp(c, out, t0 + b * beat, 'whis', f, .16, d * beat * .95, .1, .05, .2)) whistle(c, out, t0 + b * beat, f, d * beat * .95, .045); });
      else (bar % 2 ? tune : alt).forEach(([b, d, k]) => samp(c, out, t0 + b * beat, 'tpt', F(ch[k] + 12), .15, d * beat * .95, -.2, .03, .15));
    } else if (mood === 'jig') {   /* 6/8: running fiddle, strummed nylon guitar, bass and a soft frame-drum pulse */
      const e8 = 60 / M.bpm / 3, L = e8 * 6, g = P('nyl'), bs = P('bass'), sc = [0, 2, 4, 5, 7, 9, 11, 12].map((x) => x - 7 + 12);
      [0, 3].forEach((i) => { bs(t0 + i * e8, F(root - 24 + (i ? 7 : 0)), .45, e8 * 2.8); [root - 12, root - 5, ch[1], ch[2], root + 12].forEach((s2, k) => g(t0 + i * e8 + k * .01, F(s2), .12, e8 * 2.6)); });
      [2, 5].forEach((i) => [ch[1], ch[2]].forEach((s2, k) => g(t0 + i * e8 + k * .01, F(s2), .07, e8 * .9)));
      for (let i = 0; i < 6; i++) K(t0 + i * e8, i % 3 ? 'tom' : 'cajon_lo', i % 3 ? .1 : .3, i % 3 ? .7 : 1);
      const start = sc.indexOf(sc.find((x) => ((x - root) % 12 + 12) % 12 === 0)) || 0, shape = [[0, 2, 4, 2, 0, -1], [0, 1, 2, 4, 2, 1], [4, 2, 0, 2, 4, 7], [2, 1, 0, -1, 0, 2]][(bar + phrase) % 4];
      shape.forEach((d, i) => { const k = Math.max(0, Math.min(sc.length - 1, (start < 0 ? 0 : start) + d)); if (mr() < .08) return; samp(c, out, t0 + i * e8, 'fid', F(sc[k] + 12), i % 3 ? .12 : .16, e8 * 1.05, .2, .015, .05); });
      return L;
    } else if (mood === 'rag') {   /* honky-tonk upright: oom-pah left hand, syncopated right hand, slightly out-of-tune double */
      const pn = (t, f, v, d) => { samp(c, out, t, 'piano', f, v, d, -.1); samp(c, out, t + .006, 'piano', f * 1.006, v * .45, d, .15); };
      [0, 2].forEach((b, i) => pn(t0 + b * beat, F(root - 24 + (i ? 7 : 0)), .3, beat * .9)); [1, 3].forEach((b) => ch.forEach((s2) => pn(t0 + b * beat, F(s2 - 12 + 12), .13, beat * .5)));
      const rh = [[0, 0], [.75, 1], [1.5, 2], [2, 1], [2.75, 3], [3.5, 2]], tn = [ch[2] + 12, ch[1] + 12, ch[0] + 24, ch[2] + 12 + (q === '7' ? 3 : 2)];
      rh.forEach(([b, k], i) => { if (bar % 4 === 3 && i > 3) return; if (mr() < .1) return; pn(t0 + b * beat, F(tn[(k + bar) % tn.length]), .2, beat * .6); });
      K(t0 + beat, 'snare', .06, 1.2); K(t0 + 3 * beat, 'snare', .06, 1.2);
    } else if (mood === 'night') {   /* low strings, sparse music box and piano in a big hall, a faint heartbeat */
      PAD('str', t0, [F(root - 12), F(root - 5)], len + .3, .05, 380);
      for (let b = 0; b < 4; b++) if (mr() < (b === 0 ? .8 : .38)) { const f = F(ch[Math.floor(mr() * 3)] + 12 + (mr() < .3 ? 12 : 0)), tt = t0 + b * beat + (mr() < .3 ? beat / 2 : 0); if (!samp(c, out, tt, mr() < .5 ? 'mbox' : 'piano', f, .14, 2.6)) bell(c, out, tt, f, .05); }
      if (q === 'M' && root === 0) for (let b = 0; b < 4; b += 1) { K(t0 + b * beat, 'kick', .14, .8, () => kick(c, out, t0 + b * beat, .05)); K(t0 + b * beat + .22, 'kick', .09, .8, () => kick(c, out, t0 + b * beat + .22, .03)); }
    } else {   /* danger: cello ostinato, drums, brass stabs, timpani */
      const eighth = beat / 2, six = beat / 4, ce = P('cello');
      for (let i = 0; i < 16; i++) { const f = F(root - 12 + (i % 4 === 2 ? 12 : 0)); if (!samp(c, out, t0 + i * six, 'cello', f, .2, six * .95, 0, .003, .05)) tone(c, out, t0 + i * six, f, six * .9, 'sawtooth', .05, null, .004); }
      [0, 2].forEach((b) => K(t0 + b * beat, 'kick', .7, 1, () => kick(c, out, t0 + b * beat, .22))); if (mr() < .5) K(t0 + 2.5 * beat, 'kick', .45, 1, () => kick(c, out, t0 + 2.5 * beat, .14));
      [1, 3].forEach((b) => K(t0 + b * beat, 'snare', .5, 1, () => snare(c, out, t0 + b * beat, .1))); for (let i = 0; i < 8; i++) K(t0 + i * eighth, 'hat', i % 2 ? .12 : .2, 1, () => hat(c, out, t0 + i * eighth, i % 2 ? .025 : .04));
      if (!ch.every((s2) => samp(c, out, t0, 'brass', F(s2), .13, .45, 0, .01, .15))) stab(c, out, t0, ch.map((s2) => F(s2)), .05);
      samp(c, out, t0, 'timp', F(root - 12), .35, 1.2);
      if (bar % 4 === 3) for (let i = 0; i < 4; i++) K(t0 + 3 * beat + i * six, 'tom', .4, 1.1 - i * .08, () => tone(c, out, t0 + 3 * beat + i * six, 160 - i * 22, .12, 'sine', .14, 70));
      if (bar % 2 === 1) PAD('str', t0, [F(ch[0] + 12), F(ch[2] + 12)], len, .04, 1600);
    }
    return len;
  }
  let mood = 'day', want = 'day', bar = 0, musOut = null, danger = false;
  function scheduler() {
    if (!ctx || mode !== 'all') return; if (!musOut) { musOut = musicGraph(ctx, musBus); loadBank(ctx); }
    while (nextNote < ctx.currentTime + .6) {
      const t = Math.max(nextNote, ctx.currentTime + .05);
      if (want !== mood && bar % 2 === 0) { mood = want; bar = 0; musBus.gain.cancelScheduledValues(t); musBus.gain.setValueAtTime(.0001, t); musBus.gain.linearRampToValueAtTime(mode === 'all' ? 1 : 0, t + 1.2); }
      nextNote = t + writeBar(ctx, musOut, t, mood, bar++);
    }
  }
  const DAY_TRACKS = ['strum', 'calm', 'western', 'day', 'jig', 'hearth', 'travis', 'rag', 'lounge', 'porch'], SLOW_TRACKS = ['calm', 'hearth', 'day']; let dayN = 0, dayPick = 'hearth';
  try { dayPick = localStorage.getItem('zhDayMusic') || 'hearth'; } catch (e) { /* storage blocked */ }   /* 3D.56 owner: Hearth is the default day music */
  const setWant = () => { want = danger ? 'danger' : night ? 'night' : dayPick === 'mix' ? DAY_TRACKS[dayN % DAY_TRACKS.length] : dayPick === 'slow' ? SLOW_TRACKS[dayN % SLOW_TRACKS.length] : dayPick; };   /* 3D.55 'slow' = only the slow tracks */   /* 3D.51 a different day track each game day */
  // iOS rejects resume()/suspend() when the audio device is busy (a call, another app, silent switch): ignore it
  const quiet = (pr) => { if (pr && pr.catch) pr.catch(() => {}); };
  const SND = {
    unlock() {
      if (!AC || mode === 'off') return; if (!ctx) { try { ctx = new AC(); const g = build(ctx); master = g.m; sfxBus = g.s; musBus = g.mu; } catch (e) { ctx = null; return; } }
      loadBank(ctx);   /* 3D.57 recorded effects load even with music off */
      if (ctx.state === 'suspended') quiet(ctx.resume()); if (!timer) { nextNote = ctx.currentTime + .1; timer = setInterval(scheduler, 200); }
    },
    play(name) {
      if (!ctx || mode === 'off' || ctx.state !== 'running' || !FX[name]) return; const now = performance.now(); if (now - (last[name] || 0) < (GAP[name] || 80)) return; last[name] = now;
      try { FX[name](ctx, sfxBus, ctx.currentTime + .01); } catch (e) { /* ignore */ }
    },
    music(isNight, day) { night = !!isNight; if (day != null) dayN = day; setWant(); },
    get dayMusic() { return dayPick; }, setDayMusic(p) { dayPick = p; try { localStorage.setItem('zhDayMusic', p); } catch (e) { /* storage blocked */ } setWant(); },
    tracks: DAY_TRACKS,
    danger(on) { danger = !!on; setWant(); },   /* 3D.50 a horde or a fight in town */
    get mood() { return mood; },
    get mode() { return mode; },
    setMode(m) { mode = m; try { localStorage.setItem('zhSound', m); } catch (e) { /* storage blocked */ } if (m === 'off' && ctx) quiet(ctx.suspend()); else { SND.unlock(); if (ctx && ctx.state === 'suspended') quiet(ctx.resume()); } if (musBus) musBus.gain.value = m === 'all' ? 1.0 : 0; },
    cycle() { SND.setMode(mode === 'all' ? 'sfx' : mode === 'sfx' ? 'off' : 'all'); return mode; },
    pause(on) { if (!ctx) return; if (on) quiet(ctx.suspend()); else if (mode !== 'off') quiet(ctx.resume()); },
    // offline render for previews/tests: a list of [time, name] effects plus `musicSec` seconds of music
    async render(events, sec, musicSec = 0, dark = false) {
      const c = new OfflineAudioContext(2, Math.ceil(44100 * sec), 44100), g = build(c);
      await loadBank(new OfflineAudioContext(1, 1, 44100));
      for (const [t, n] of events) FX[n](c, g.s, t);
      const md = dark === true ? 'night' : dark || 'day', o = musicSec ? musicGraph(c, g.mu) : null; let tt = .05, i = 0; while (tt < musicSec) tt += writeBar(c, o, tt, md, i++);
      const buf = await c.startRendering(); return buf.getChannelData(0);
    },
    names: Object.keys(FX),
  };
  window.SND = SND;
})();
