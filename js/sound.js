/* Zombie Haven — sound (V2.21). Every sound is synthesised with the Web Audio API at run time:
   no audio files, all original. SND.play(name) for effects, SND.setMode('all'|'sfx'|'off'),
   SND.music(isNight) keeps the ambient loop in step with the clock. iOS needs a tap before audio
   can start, so SND.unlock() is called from the first touch. */
(function () {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, sfxBus = null, musBus = null, mode = 'all', night = false, nextNote = 0, step = 0, timer = null;
  try { mode = localStorage.getItem('zhSound') || 'all'; } catch (e) { /* storage blocked */ }
  const last = {};   // per-sound throttle (game speed 3× can fire the same event many times a second)
  const GAP = { chop: 120, swing: 80, door: 300, hit: 90, hurt: 140, kill: 120, click: 60, groan: 2500, crackle: 900, down: 400, chime: 300, reward: 400, build: 250, breach: 600, alarm: 3000, night: 5000, dawn: 5000, boss: 6000, coin: 200, woof: 900, rescued: 1200, rankup: 4000, event: 3000 };

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
    build: (c, o, t) => { knock(c, o, t, 330, .28); knock(c, o, t + .16, 360, .26); knock(c, o, t + .34, 300, .3); },
    click: (c, o, t) => { pluck(c, o, t, 1400, .12, .08); noise(c, o, t, .012, .08, 4500, 2); },
    chime: (c, o, t) => { bell(c, o, t, N(15), .09); bell(c, o, t + .09, N(22), .08); },
    reward: (c, o, t) => { [12, 16, 19, 24].forEach((s, i) => bell(c, o, t + i * .08, N(s), .08)); pluck(c, o, t, N(0), .2, 1); },
    coin: (c, o, t) => { clang(c, o, t, 1800, .07, .35); clang(c, o, t + .07, 2400, .07, .5); },
    breach: (c, o, t) => { thud(c, o, t, 55, .5, .5); noise(c, o, t, .5, .5, 900, .5, 'lowpass', 80); for (let i = 0; i < 5; i++) knock(c, o, t + .05 + Math.random() * .3, 500 + Math.random() * 500, .12); },
    alarm: (c, o, t) => { for (let i = 0; i < 4; i++) clang(c, o, t + i * .28, 880, .12, .5); },
    boss: (c, o, t) => { formant(c, o, t, 58, 1.8, .3, [[300, 4, 1], [700, 5, .7], [1600, 7, .2]], 40, 5); thud(c, o, t, 45, .4, .8); noise(c, o, t + .1, 1.3, .12, 220, .5, 'lowpass'); },
    night: (c, o, t) => { [0, -5, -9].forEach((s, i) => bell(c, o, t + i * .45, N(s - 12), .07)); },
    dawn: (c, o, t) => { [3, 7, 10, 15].forEach((s, i) => bell(c, o, t + i * .22, N(s + 12), .06)); },
    crackle: (c, o, t) => { for (let i = 0; i < 9; i++) noise(c, o, t + Math.random() * .6, .01 + Math.random() * .03, .2, 1500 + Math.random() * 3500, 2); noise(c, o, t, .7, .06, 300, .5, 'lowpass'); },
    rescued: (c, o, t) => { [0, 4, 7, 12].forEach((s, i) => pluck(c, o, t + i * .07, N(s), .18, 1.2)); bell(c, o, t + .3, N(19), .07); },
    rankup: (c, o, t) => { [0, 4, 7].forEach((s2, i) => stab(c, o, t + i * .13, [N(s2), N(s2 + 7)], .07)); stab(c, o, t + .42, [N(12), N(16), N(19)], .09); [12, 16, 19].forEach((s2) => bell(c, o, t + .42, N(s2 + 12), .05)); },
    event: (c, o, t) => { [7, 12, 16, 12, 19].forEach((s2, i) => bell(c, o, t + i * .1, N(s2 + 12), .06)); },
    woof: (c, o, t) => { formant(c, o, t, 330, .1, .3, [[900, 4, 1], [1800, 6, .4]], 210); formant(c, o, t + .16, 310, .11, .28, [[880, 4, 1], [1700, 6, .4]], 200); },
    chop: (c, o, t) => { knock(c, o, t, 260, .3); noise(c, o, t, .05, .2, 1800, 1.2); },   /* 3D.51 new */
    swing: (c, o, t) => { noise(c, o, t, .14, .14, 900, .9, 'bandpass', 2400); },
    door: (c, o, t) => { knock(c, o, t, 200, .2); formant(c, o, t + .02, 300, .3, .03, [[1800, 15, 1]], 260); },
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
    danger: { bpm: 116, prog: [[-5, 'm'], [-9, 'M'], [-7, 'M'], [2, 'M'], [-5, 'm'], [-9, 'M'], [-7, 'M'], [-3, 'M']] },
  };
  const Q = { m: [0, 3, 7], M: [0, 4, 7], M7: [0, 4, 7, 11], m7: [0, 3, 7, 10], '7': [0, 4, 7, 10] };
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
    } else if (mood === 'lounge') {   /* swing: walking bass, brushes and ride, Rhodes-like comping, a vibraphone tune */
      const sw = (b, off) => t0 + (b + (off ? 2 / 3 : 0)) * beat, nx = MOODS.lounge.prog[(bar + 1) % 8], nroot = fold(nx[0]);
      const walk = [root, root + (ch[1] - root), root + 7, nroot + (mr() < .5 ? -1 : 1)]; walk.forEach((s2, b) => pluck(c, out, t0 + b * beat, F(s2 - 24), .19, .9));
      [[0, 0], [1, 0], [1, 1], [2, 0], [3, 0], [3, 1]].forEach(([b, o2]) => clang(c, out, sw(b, o2), 3100, o2 ? .008 : .013, .35));   // ride: ding, ding-ga-ding
      [1, 3].forEach((b) => noise(c, out, t0 + b * beat, .22, .05, 2600, .6));   // brushes
      const voic = [ch[1] + 12, ch[3] !== undefined ? ch[3] : ch[2] + 12, ch[2] + 12].map((s2) => F(s2)); [[1, 1], [3, 0]].forEach(([b, o2]) => { if (mr() < .85) voic.forEach((f) => { tone(c, out, sw(b, o2), f, .5, 'sine', .022, null, .004); tone(c, out, sw(b, o2), f * 2, .2, 'triangle', .006, null, .002); }); });
      const motif = [[0, 0, 2], [0, 1, 1], [1, 1, 0], [2, 0, 3], [3, 0, 1]], half = bar % 4 < 2 || phrase % 2 === 1;   // vibes: a short swung phrase, answered every other bar
      if (half) for (const [b, o2, k] of motif) { if (mr() < .2) continue; const tn = ch[(k + bar) % ch.length] + 12 + (k === 3 ? 12 : 0); bell(c, out, sw(b, o2), F(tn), .045); }
    } else if (mood === 'porch') {   /* banjo rolls, boom-chick bass and guitar, a harmonica tune */
      const roll = [0, 2, 1, 3, 0, 2, 1, 3].map((k) => [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24][k]);
      roll.forEach((s2, i) => pluck(c, out, t0 + i * beat / 2 + (i % 2 ? .01 : 0), F(s2), i % 4 === 0 ? .13 : .09, .7, .3));
      [0, 2].forEach((b, i) => pluck(c, out, t0 + b * beat, F(root - 24 + (i ? 7 : 0)), .3, 1));
      [1, 3].forEach((b) => ch.forEach((s2, i) => pluck(c, out, t0 + b * beat + i * .012, F(s2), .05, .4, -.3)));
      kick(c, out, t0, .05); kick(c, out, t0 + 2 * beat, .04);
      if (phrase % 2 === 1 && mr() < .85) { const tn = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 12, ch[0] + 12]; [[0, 1.5], [1.5, .5], [2, 1], [3, 1]].forEach(([b, d], i) => {
          const f = F(tn[(i + bar) % tn.length]), o = c.createOscillator(), bp = c.createBiquadFilter(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain(); o.type = 'square'; o.frequency.value = f; bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 1.2;
          l.frequency.value = 6; lg.gain.value = f * .01; l.connect(lg); lg.connect(o.frequency); const tt = t0 + b * beat, dd = d * beat * .95; g.gain.setValueAtTime(.0001, tt); g.gain.linearRampToValueAtTime(.05, tt + .06); g.gain.linearRampToValueAtTime(.0001, tt + dd);
          o.connect(bp); bp.connect(g); g.connect(out); o.start(tt); l.start(tt); o.stop(tt + dd + .05); l.stop(tt + dd + .05); }); }
    } else if (mood === 'strum') {   /* down-up strumming, cajon and shaker, a lead riff every other phrase */
      const six = beat / 4, voice = [root - 12, root - 5, root, ch[1], ch[2], root + 12];
      const strum = (t, down, vol) => { const v = down ? voice : voice.slice(2).reverse(); v.forEach((s2, i) => pluck(c, out, t + i * (down ? .011 : .008), F(s2), vol * (down ? 1 : .7), .9, (i / 5 - .5) * .5)); };
      [[0, 1], [4, 1], [6, 0], [10, 0], [12, 1], [14, 0]].forEach(([i, d]) => strum(t0 + i * six, d, i === 0 ? .075 : .055));
      [0, 2].forEach((b) => thud(c, out, t0 + b * beat, 90, .2, .14)); [1, 3].forEach((b) => noise(c, out, t0 + b * beat, .09, .13, 1300, .9));
      for (let i = 0; i < 16; i++) noise(c, out, t0 + i * six, .03, i % 2 ? .018 : .03, 6500, 1.4, 'highpass');
      if (phrase % 2 === 1) { const pent = [0, 2, 4, 7, 9, 12, 14, 16].map((x) => x - 7 + 12); [0, 2, 3, 6, 8, 10, 11, 14].forEach((i, k) => { if (mr() < .2) return; pluck(c, out, t0 + i * six, F(pent[(k * 3 + bar * 2) % pent.length] + (ch[0] === root ? 0 : 0)), .1, .5, .4); }); }
    } else if (mood === 'travis') {   /* alternating thumb bass, pinched melody on top, claps on 2 and 4 */
      const bassN = [root - 12, root - 5, root - 12 + (q === 'm' ? 3 : 4) + 12 - 12, root - 5];
      bassN.forEach((s2, b) => pluck(c, out, t0 + b * beat, F(s2), .16, 1.1, -.2));
      [0, 1, 2, 3].forEach((b) => pluck(c, out, t0 + (b + .5) * beat, F([ch[1], ch[2], ch[1] + 12, ch[2]][b] + 12 - 12), .07, .7, .25));
      const mel = [ch[2] + 12, ch[0] + 24, ch[1] + 12, ch[2] + 12, ch[0] + 12 + 2, ch[1] + 12], rh = phrase % 2 ? [0, 1.5, 2.5, 3] : [0, 1, 2.5];
      rh.forEach((b, i) => pluck(c, out, t0 + b * beat, F(mel[(i + bar) % mel.length]), .11, 1.2, .35));
      if (phrase % 2 === 1) [1, 3].forEach((b) => { noise(c, out, t0 + b * beat, .06, .09, 1600, 1.4); noise(c, out, t0 + b * beat + .012, .05, .06, 2400, 1.4); });
      else [1, 3].forEach((b) => noise(c, out, t0 + b * beat, .05, .03, 6000, 1.4, 'highpass'));
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
  const DAY_TRACKS = ['strum', 'day', 'travis', 'lounge', 'porch']; let dayN = 0, dayPick = 'mix';
  try { dayPick = localStorage.getItem('zhDayMusic') || 'mix'; } catch (e) { /* storage blocked */ }
  const setWant = () => { want = danger ? 'danger' : night ? 'night' : dayPick === 'mix' ? DAY_TRACKS[dayN % DAY_TRACKS.length] : dayPick; };   /* 3D.51 a different day track each game day */
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
      for (const [t, n] of events) FX[n](c, g.s, t);
      const md = dark === true ? 'night' : dark || 'day', o = musicSec ? musicGraph(c, g.mu) : null; let tt = .05, i = 0; while (tt < musicSec) tt += writeBar(c, o, tt, md, i++);
      const buf = await c.startRendering(); return buf.getChannelData(0);
    },
    names: Object.keys(FX),
  };
  window.SND = SND;
})();
