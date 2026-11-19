/* Zombie Haven — sound (V2.21). Every sound is synthesised with the Web Audio API at run time:
   no audio files, all original. SND.play(name) for effects, SND.setMode('all'|'sfx'|'off'),
   SND.music(isNight) keeps the ambient loop in step with the clock. iOS needs a tap before audio
   can start, so SND.unlock() is called from the first touch. */
(function () {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, sfxBus = null, musBus = null, mode = 'all', night = false, nextNote = 0, step = 0, timer = null;
  try { mode = localStorage.getItem('zhSound') || 'all'; } catch (e) { /* storage blocked */ }
  const last = {};   // per-sound throttle (game speed 3× can fire the same event many times a second)
  const GAP = { shot: 60, shot_pistol: 60, shot_smg: 50, shot_magnum: 90, shot_auto: 50, shot_rifle: 120, shot_bow: 120, shot_arrow: 120, shot_shotgun: 150, chop: 150, hammer: 150, rescued2: 1200, rescued3: 1200, rescued4: 1200, rescued5: 1200, rescued6: 1200, hit: 90, hurt: 140, kill: 120, click: 60, groan: 2500, crackle: 900, down: 400, chime: 300, reward: 400, build: 250, breach: 600, alarm: 3000, night: 5000, dawn: 5000, boss: 6000, coin: 200, woof: 900, rescued: 1200, rankup: 4000, event: 3000 };

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
  /* Music chat (W100): gunshots. A sharp crack, a blast that darkens, a low thump, then an outdoor echo rolling away (all made here, no files) */
  function swell(c, out, t, dur, vol, f, fTo, a = .02) {   // filtered noise that fades in and dies away slowly (the gun's tail)
    const n = c.createBufferSource(); n.buffer = noiseBuf(c, dur + .05); const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(f, t); fl.frequency.exponentialRampToValueAtTime(fTo, t + dur); fl.Q.value = .5;
    const g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + dur); n.connect(fl); fl.connect(g); g.connect(out); n.start(t); n.stop(t + dur + .05);
  }
  function gun(c, o, t, G) {   // G: crack, blast (length), thump (pitch), tail (length), echo (delay), size (loudness)
    const v = G.size * .36, r = 1 + (Math.random() - .5) * .08;
    noise(c, o, t, .018, .34 * v, G.crack * r, 1.2, 'highpass');
    noise(c, o, t, G.blast, .42 * v, 3200 * r, .6, 'lowpass', 260);
    thud(c, o, t, G.thump * r, .45 * v, G.blast * 1.4);
    swell(c, o, t + .01, G.tail, .11 * v, 1400, 140, .015);
    swell(c, o, t + G.echo, G.tail * .8, .045 * v, 900, 120, .04);
    if (G.echo2) swell(c, o, t + G.echo2, G.tail * .6, .03 * v, 650, 100, .06);
    if (G.snap) noise(c, o, t, .008, .35 * v, 6000, 1, 'highpass');
    if (G.boom) { swell(c, o, t + .005, .9, .3 * v, 420, 45, .03); tone(c, o, t, 38, .7, 'sine', .35 * v, 30, .01); }
    if (G.tink) { clang(c, o, t + .32, 4300, .01, .18); clang(c, o, t + .41, 4700, .006, .12); }
    if (G.bolt) { if (!sfx(c, o, t + .6, 'metalL' + rnd3(), .07, 2.3)) noise(c, o, t + .6, .02, .05, 3000, 3); if (!sfx(c, o, t + .78, 'metalL' + rnd3(), .08, 1.9)) noise(c, o, t + .78, .02, .05, 2500, 3); }
  }
  const GUNS = {   /* pistols are short, snappy and dry with a case tinkling down; rifles boom and roll away twice down the valley, then the bolt is worked */
    shot_pistol: { crack: 3600, blast: .045, thump: 170, tail: .28, echo: .11, size: .9 },
    shot_smg: { crack: 3300, blast: .04, thump: 160, tail: .25, echo: .1, size: .7 },
    shot_magnum: { crack: 2300, blast: .12, thump: 95, tail: .7, echo: .18, size: .9 },
    shot_auto: { crack: 2600, blast: .07, thump: 115, tail: .5, echo: .2, size: .8 },
    shot_shotgun: { crack: 900, blast: .34, thump: 42, tail: 1.6, echo: .3, size: .85, boom: 1 },   /* a wide, blooming boom: no sharp crack */
    shot_rifle: { crack: 1300, blast: .2, thump: 50, tail: 1.9, echo: .38, echo2: .85, size: .9, snap: 1 },
  };
  const FX = {   // each: (context, output, start time)
    ...Object.fromEntries(Object.entries(GUNS).map(([k, G]) => [k, (c, o, t) => gun(c, o, t, G)])),
    shot: (c, o, t) => gun(c, o, t, GUNS.shot_pistol),   /* any gun without its own sound */
    shot_arrow: (c, o, t) => {   /* a hunting bow: a soft thwip and a low thrum of the limbs */
      noise(c, o, t, .16, .26, 1900, 2.2, 'bandpass', 380); tone(c, o, t, 105, .08, 'sine', .12, 70, .002); noise(c, o, t, .012, .08, 2600, 2);
    },
    shot_bow: (c, o, t) => {   /* a crossbow: a hard wooden thunk of the stock and the bolt hissing away */
      if (!sfx(c, o, t, 'woodM' + rnd3(), .36, 1.5)) knock(c, o, t, 520, .22); noise(c, o, t, .015, .2, 4000, 1, 'highpass'); thud(c, o, t, 140, .18, .06);
      noise(c, o, t + .02, .22, .12, 2400, 1.2, 'bandpass', 700);
    },
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
  /* Music chat (W106): the Ghibli remake of the effects, for review next to the old ones (render '+name'). Musical sounds are storybook
     (harp, celesta, glockenspiel, horn, a village bell); fighting sounds are wood and body, natural and solid. Each falls back to the old sound until the samples load. */
  const NEWFX = {
    click: (c, o, t) => { if (!sfx(c, o, t, 'woodM' + rnd3(), .11, 2.6)) FX.click(c, o, t); },   /* a soft wooden tock */
    chime: (c, o, t) => { if (!samp(c, o, t, 'tpt', N(22), .28, .11, .1, .01, .05)) return FX.chime(c, o, t); samp(c, o, t + .13, 'tpt', N(22), .28, .11, .1, .01, .05); samp(c, o, t + .26, 'tpt', N(22), .28, .11, .1, .01, .05); samp(c, o, t + .39, 'tpt', N(27), .32, .7, .1, .015, .3); },   /* dum dum dum daaa: three short trumpet notes and a long one a fourth higher */
    reward_a: (c, o, t) => { if (!samp(c, o, t, 'vibes', N(15), .001, .1)) return FX.reward(c, o, t); [15, 19, 22, 27, 31].forEach((sm, i) => samp(c, o, t + i * .06, 'vibes', N(sm), .4, 1.6, (i / 4 - .5) * .4)); samp(c, o, t + .3, 'glk', N(39), .24, 2, .2); [3, 7, 10].forEach((sm) => samp(c, o, t + .05, 'str', N(sm + 12), .07, 1.4, 0, .25, .5)); },   /* vibraphone */
    reward_b: (c, o, t) => { if (!samp(c, o, t, 'cel', N(27), .001, .1)) return FX.reward(c, o, t); [27, 31, 34, 39].forEach((sm, i) => samp(c, o, t + i * .07, 'cel', N(sm), .36, 1.6, (i / 3 - .5) * .4)); [3, 7, 10, 15].forEach((sm) => samp(c, o, t, 'str', N(sm + 12), .08, 1.6, 0, .15, .6)); samp(c, o, t + .3, 'glk', N(39), .2, 2); },   /* celesta */
    reward_c: (c, o, t) => { if (!samp(c, o, t, 'flu', N(22), .001, .1)) return FX.reward(c, o, t); [[22, 0, .1], [24, .09, .1], [27, .18, .9]].forEach(([sm, dt, d]) => { samp(c, o, t + dt, 'flu', N(sm), .4, d, .1, .02, .25); samp(c, o, t + dt, 'obo', N(sm - 5), .22, d, -.1, .02, .25); }); [3, 7, 10].forEach((sm) => samp(c, o, t + .18, 'str', N(sm + 12), .09, 1.3, 0, .1, .5)); samp(c, o, t + .2, 'glk', N(39), .2, 2, .2); },   /* flute and oboe */
    coin: (c, o, t) => { if (!samp(c, o, t, 'glk', N(31), .26, .9)) return FX.coin(c, o, t); samp(c, o, t + .07, 'glk', N(36), .26, 1.1); },
    rankup: (c, o, t) => { if (!samp(c, o, t, 'hrn', N(10), .3, .16)) return FX.rankup(c, o, t); samp(c, o, t + .15, 'hrn', N(15), .3, .16); samp(c, o, t + .3, 'hrn', N(19), .3, .16); samp(c, o, t + .45, 'hrn', N(22), .36, 1.2, 0, .02, .4); [15, 19, 22].forEach((sm) => samp(c, o, t + .45, 'str', N(sm), .08, 1.3, 0, .08, .5)); samp(c, o, t + .45, 'timp', N(-9), .3, 1.2); samp(c, o, t + .47, 'glk', N(39), .22, 2, .3); },
    event: (c, o, t) => { if (!samp(c, o, t, 'cel', N(22), .3, 1)) return FX.event(c, o, t); [27, 31, 29, 27].forEach((sm, i) => samp(c, o, t + (i + 1) * .1, 'cel', N(sm), .3, 1.2, .15)); samp(c, o, t, 'pz', N(-9), .4, .6, -.2); samp(c, o, t + .2, 'pz', N(-2), .35, .6, -.2); },
    rescued: (c, o, t) => { if (!samp(c, o, t, 'nyl', N(-2), .45, 2)) return FX.rescued(c, o, t); [2, 5, 10].forEach((sm, i) => samp(c, o, t + .02 + i * .022, 'nyl', N(sm), .42, 2)); [[14, 0, .2], [17, .18, .2], [22, .36, 1]].forEach(([sm, dt, d]) => samp(c, o, t + .05 + dt, 'flu', N(sm), .4, d, .1, .04, .25)); },
    night: (c, o, t) => { if (!samp(c, o, t, 'cel', N(24), .3, 1.8, .1)) return FX.night(c, o, t); samp(c, o, t + .45, 'cel', N(20), .28, 1.8, .1); samp(c, o, t + .9, 'cel', N(17), .3, 2.4, .1); [-7, 0].forEach((sm) => samp(c, o, t, 'str', N(sm), .07, 2.6, 0, .6, .9)); },
    dawn: (c, o, t) => { if (sfx(c, o, t, 'rooster', .6, 1)) return; if (!samp(c, o, t, 'harp', N(5), .3, 1.5)) return FX.dawn(c, o, t); [12, 17, 21].forEach((sm, i) => samp(c, o, t + (i + 1) * .08, 'harp', N(sm), .3, 1.6, (i / 2 - .5) * .4)); [[17, .3, .3], [19, .6, .3], [24, .9, 1.2]].forEach(([sm, dt, d]) => samp(c, o, t + dt, 'flu', N(sm), .36, d, .1, .05, .3)); [5, 9, 12].forEach((sm) => samp(c, o, t + .3, 'str', N(sm), .05, 1.9, 0, .5, .7)); },
    alarm: (c, o, t) => { if (!samp(c, o, t, 'tub', N(10), .5, 1.2)) return FX.alarm(c, o, t); for (let i = 1; i < 8; i++) { const tt = t + i * .15 - i * i * .002; samp(c, o, tt, 'tub', N(i % 2 ? 15 : 10), .5, 1.2); clang(c, o, tt, i % 2 ? 1180 : 880, .02, .3); } },   /* the village bell rung fast, two bells clashing: a warning */
    hit: (c, o, t) => { if (!sfx(c, o, t, 'woodH' + rnd3(), .42, .7)) return FX.hit(c, o, t); thud(c, o, t, 90, .28, .14); noise(c, o, t, .05, .12, 900, .8, 'lowpass', 250); },
    hurt: (c, o, t) => { noise(c, o, t, .18, .14, 750, 5); noise(c, o, t, .16, .09, 1250, 6); formant(c, o, t, 190, .16, .06, [[700, 6, 1], [1200, 8, .5]], 140); thud(c, o, t, 120, .15, .08); },
    kill: (c, o, t) => { if (!sfx(c, o, t, 'woodL' + rnd3(), .42, .5)) return FX.kill(c, o, t); thud(c, o, t, 70, .32, .3); noise(c, o, t + .03, .5, .05, 500, 4, 'bandpass', 250); formant(c, o, t + .02, 95, .5, .06, [[480, 5, 1], [850, 6, .4]], 65, 5); },
    down: (c, o, t, f, take = Math.random() < .5 ? 0 : 1) => { if (!SFXB.oofm0) return FX.down(c, o, t); const k = ((f ?? Math.random() < .5) ? 'ooff' : 'oofm') + take; sfx(c, o, t, k, .6 * ({ oofm1: 1.6, ooff0: 1.6, ooff2: 1.8, ooff3: 1.1, ooff4: 1, ooff5: .8, ooff6: .75, ooff7: .85, ooff8: 1.05, ooff9: 1.15, ooff10: .72, ooff11: 2.6, ooff12: 2.5, ooff13: 1.6, ooff14: 1.6, ooff15: 1.7, ooff16: 1.6, ooff17: 1.6, ooff18: 1.6, ooff19: 1.3 }[k] || 1), .97 + Math.random() * .06); sfx(c, o, t + .2, 'woodL' + rnd3(), .3, .55); thud(c, o, t + .2, 70, .22, .25); },   /* a short oof or ugh, and the fall */
    down_f: (c, o, t) => NEWFX.down(c, o, t, true), down_m: (c, o, t) => NEWFX.down(c, o, t, false),
    down_f0: (c, o, t) => NEWFX.down(c, o, t, true, 0), down_f1: (c, o, t) => NEWFX.down(c, o, t, true, 1), down_m0: (c, o, t) => NEWFX.down(c, o, t, false, 0), down_m1: (c, o, t) => NEWFX.down(c, o, t, false, 1), down_f2: (c, o, t) => NEWFX.down(c, o, t, true, 2), down_f3: (c, o, t) => NEWFX.down(c, o, t, true, 3), down_f4: (c, o, t) => NEWFX.down(c, o, t, true, 4), down_f5: (c, o, t) => NEWFX.down(c, o, t, true, 5), down_f6: (c, o, t) => NEWFX.down(c, o, t, true, 6), down_f7: (c, o, t) => NEWFX.down(c, o, t, true, 7), down_f8: (c, o, t) => NEWFX.down(c, o, t, true, 8), down_f9: (c, o, t) => NEWFX.down(c, o, t, true, 9), down_f10: (c, o, t) => NEWFX.down(c, o, t, true, 10), down_f11: (c, o, t) => NEWFX.down(c, o, t, true, 11), down_f12: (c, o, t) => NEWFX.down(c, o, t, true, 12), down_f13: (c, o, t) => NEWFX.down(c, o, t, true, 13), down_f14: (c, o, t) => NEWFX.down(c, o, t, true, 14), down_f15: (c, o, t) => NEWFX.down(c, o, t, true, 15), down_f16: (c, o, t) => NEWFX.down(c, o, t, true, 16), down_f17: (c, o, t) => NEWFX.down(c, o, t, true, 17), down_f18: (c, o, t) => NEWFX.down(c, o, t, true, 18), down_f19: (c, o, t) => NEWFX.down(c, o, t, true, 19),
    groan: (c, o, t) => { if (!sfx(c, o, t, 'zgroan' + Math.floor(Math.random() * 7), .7, .8 + Math.random() * .12)) FX.groan(c, o, t); },   /* recorded moans and growls, slowed so they drag on */
    boss: (c, o, t) => { sfx(c, o, t, 'zgroan6', .8, .55); sfx(c, o, t + .05, 'zgroan4', .55, .5); formant(c, o, t, 52, 2, .18, [[290, 4, 1], [680, 5, .7], [1500, 7, .2]], 38, 4.5); noise(c, o, t + .1, 1.4, .12, 220, .5, 'lowpass'); if (!samp(c, o, t, 'timp', N(-12), .5, 2)) thud(c, o, t, 45, .4, .8); },   /* a huge zombie roar (recorded growls slowed down) over a timpani hit */
    radio: (c, o, t, beeps = true) => {   /* radio static with the signal pulsing through it: A little beeps between bursts, B the static itself throbbing */
      const d = 2.3, n = c.createBufferSource(); n.buffer = noiseBuf(c, d + .1); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = .5; const g = c.createGain();
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.12, t + .08);
      if (beeps) { for (let k = 1; k < 18; k++) g.gain.linearRampToValueAtTime(.05 + Math.random() * .07, t + k * .12); [.45, .95, 1.45].forEach((dt) => { g.gain.setValueAtTime(.05, t + dt - .02); g.gain.linearRampToValueAtTime(.015, t + dt + .02); g.gain.linearRampToValueAtTime(.015, t + dt + .16); g.gain.linearRampToValueAtTime(.07, t + dt + .22); tone(c, o, t + dt, 1150, .07, 'sine', .05, null, .004); tone(c, o, t + dt + .1, 1150, .07, 'sine', .05, null, .004); }); }
      else for (let k = 1; k < 23; k++) g.gain.linearRampToValueAtTime(k % 2 ? .13 : .03, t + k * .1);
      g.gain.linearRampToValueAtTime(.0001, t + d); n.connect(bp); bp.connect(g); g.connect(o); n.start(t); n.stop(t + d + .1);
      for (let i = 0; i < 22; i++) noise(c, o, t + Math.random() * (d - .1), .008 + Math.random() * .02, .1, 2500 + Math.random() * 3000, 2);
      tone(c, o, t + .3, 1300, 1.4, 'sine', .01, 700);
    },
    radio_b: (c, o, t) => NEWFX.radio(c, o, t, false),
    radio_c: (c, o, t, tone2 = false) => {   /* a steady bed of static with pulses rising out of it (D: a faint tone inside each pulse) */
      const d = 2.4, bed = c.createBufferSource(); bed.buffer = noiseBuf(c, d + .1); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = .5; const g = c.createGain();
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.065, t + .1); g.gain.setValueAtTime(.065, t + d - .3); g.gain.linearRampToValueAtTime(.0001, t + d); bed.connect(bp); bp.connect(g); g.connect(o); bed.start(t); bed.stop(t + d + .1);
      for (let k = 0; k < 5; k++) { const pt = t + .3 + k * .4; noise(c, o, pt, .13, .11, 1700, .9); if (tone2) tone(c, o, pt + .01, 880, .11, 'sine', .028, null, .01); }
      for (let i = 0; i < 18; i++) noise(c, o, t + Math.random() * (d - .1), .008 + Math.random() * .02, .09, 2500 + Math.random() * 3000, 2);
    },
    radio_d: (c, o, t) => NEWFX.radio_c(c, o, t, true),
    caralarm: (c, o, t) => {   /* a real car alarm's cycle through its little horn speaker: rising whoops, a fast warble, then hi-lo */
      const sp = c.createBiquadFilter(); sp.type = 'bandpass'; sp.frequency.value = 2000; sp.Q.value = .7; const ws = c.createWaveShaper(), cv = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; cv[i] = Math.tanh(3 * x); } ws.curve = cv; ws.connect(sp); sp.connect(o);
      const sweep = (t0, f0, f1, d, v = .05) => { const os = c.createOscillator(), g = c.createGain(); os.type = 'sawtooth'; os.frequency.setValueAtTime(f0, t0); os.frequency.exponentialRampToValueAtTime(f1, t0 + d); g.gain.setValueAtTime(v, t0); g.gain.setValueAtTime(v, t0 + d - .01); g.gain.linearRampToValueAtTime(0, t0 + d); os.connect(g); g.connect(ws); os.start(t0); os.stop(t0 + d + .02); };
      for (let i = 0; i < 3; i++) sweep(t + i * .4, 650, 1600, .38);
      for (let i = 0; i < 12; i++) sweep(t + 1.2 + i * .08, i % 2 ? 1500 : 1100, i % 2 ? 1500 : 1100, .08);
      for (let i = 0; i < 4; i++) sweep(t + 2.2 + i * .3, i % 2 ? 950 : 1250, i % 2 ? 950 : 1250, .3);
      swell(c, o, t + .2, 3.2, .015, 1500, 600, .3);
    },
    woof: (c, o, t) => { if (!sfx(c, o, t, 'dog0', .8, 1)) FX.woof(c, o, t); },   /* a real dog barking */
    breach: (c, o, t) => { if (!SFXB.rockb0) return FX.breach(c, o, t); thud(c, o, t, 55, .4, .5); sfx(c, o, t, 'rockb' + rnd3(), .6, .8); sfx(c, o, t + .08, 'woodL' + rnd3(), .3, .5); [.18, .34, .55, .8].forEach((dt, i) => sfx(c, o, t + dt, 'rockf' + rnd3(), .5 - i * .08, .85 + Math.random() * .2)); noise(c, o, t + .1, 1.1, .08, 900, .5, 'lowpass', 120); },   /* a wall crumbling: cracking, then rubble falling */
  };
  const NFXV = { chime: 4.5, reward_a: 2.2, reward_b: 2.2, reward_c: 2.2, coin: 4.5, rankup: 1.7, event: 1.8, night: 3.7, dawn: .58, alarm: 2, boss: .31, down: .175, hurt: 2.2, breach: .8, caralarm: .4, woof: .22, groan: .17, radio: .4, radio_c: .6 };   /* level each new sound to sit near the old one */
  for (const [k, f] of Object.entries(NEWFX)) if (NFXV[k]) NEWFX[k] = (c, o, t, ...r) => { const g = c.createGain(); g.gain.value = NFXV[k]; g.connect(o); f(c, g, t, ...r); };
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
  const Q = { '7M': [0, 4, 7], m: [0, 3, 7], M: [0, 4, 7], M7: [0, 4, 7, 11], m7: [0, 3, 7, 10], '7': [0, 4, 7, 10], add9: [0, 4, 7, 14], m6: [0, 3, 7, 9], sus4: [0, 5, 7], dim: [0, 3, 6] };
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
  const INST = { fid: [4, 6], gtr: [2, 5], nyl: [2, 5], bass: [1, 3], banjo: [3, 5], harp: [4, 5], vibes: [3, 5], tpt: [3, 5], str: [2, 5], mbox: [4, 6], whis: [4, 6], ep: [3, 5], cello: [2, 3], brass: [3, 4], timp: [2, 2], piano: [3, 6], flu: [4, 6], glk: [5, 7], acc: [3, 6], pz: [2, 5], obo: [4, 6], cel: [4, 7], hrn: [2, 5], tub: [4, 5] };
  const KIT = ['cajon_lo', 'cajon_hi', 'shaker_dn', 'shaker_up', 'clap', 'snare', 'hat', 'kick', 'tom', 'ride'];
  const SFXN = ['chop', 'pizzi', 'rooster', ...['woodH', 'woodL', 'woodM', 'metalL', 'rockb', 'rockf'].flatMap((k) => [0, 1, 2].map((i) => k + i)), 'dog0', 'dog1', 'downm0', 'downm1', 'downf0', 'downf1', 'oofm0', 'oofm1', 'ooff0', 'ooff1', 'ooff2', 'ooff3', 'ooff4', 'ooff5', 'ooff6', 'ooff7', 'ooff8', 'ooff9', 'ooff10', 'ooff11', 'ooff12', 'ooff13', 'ooff14', 'ooff15', 'ooff16', 'ooff17', 'ooff18', 'ooff19', ...[0, 1, 2, 3, 4, 5, 6].map((i) => 'zgroan' + i)], SFXB = {};   /* Music chat: recorded CC0 animals, voices, rock and zombies (assets/audio/CREDITS.txt) */   /* 3D.57 recorded effects */
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
  const LEVEL = { fid: .8, gtr: 1, nyl: 1.1, bass: 1.6, banjo: .9, harp: .7, vibes: 1, tpt: .8, str: .9, mbox: .8, whis: .7, ep: 1, cello: 1.1, brass: .8, timp: 1.2, piano: 1, flu: .8, glk: .6, acc: .7, pz: 1.2, obo: .8, cel: .8, hrn: .9, tub: .7 };
  function samp(c, out, t, k, f, vol, dur = 1.5, pan = 0, att = .004, rel = .25) {   // play instrument k at frequency f; false if not loaded
    const B = BANK[k]; if (!B || !B.length) return false; const m = 69 + 12 * Math.log2(f / 440); let best = B[0]; for (const x of B) if (Math.abs(x.m - m) < Math.abs(best.m - m)) best = x;
    const s = c.createBufferSource(); s.buffer = best.buf; s.playbackRate.value = Math.pow(2, (m - best.m) / 12); const g = c.createGain(), v = vol * (LEVEL[k] || 1);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + att); g.gain.setValueAtTime(v, t + Math.max(att, dur - rel)); g.gain.linearRampToValueAtTime(.0001, t + dur);
    s.connect(g); if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(out); } else g.connect(out); s.start(t); s.stop(t + dur + .05); return true;
  }
  function kit(c, out, t, k, vol, rate = 1) { const b = KITB[k]; if (!b) return false; const s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = rate * (1 + (Math.random() - .5) * .04); const g = c.createGain(); g.gain.value = vol; s.connect(g); g.connect(out); s.start(t); return true; }
  /* ---- Music chat (W106): the Ghibli soundtrack. Original tunes, written out as note names so they can be read:
     a melody is bars split by '|', each note NAME+OCTAVE:BEATS ('D5:2'; no number = 1 beat; 'r' = rest); chords are names ('Bbmaj7 C Am7'). */
  const NL = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  const nt = (n) => { const m = /^([A-G])([#b]?)(\d)$/.exec(n); return NL[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] - 3) * 12; };   // semitones from A3
  const tune = (str) => str.split('|').map((b) => b.trim().split(/\s+/).map((tk) => { const [n, d] = tk.split(':'); return [n === 'r' ? null : nt(n), d ? +d : 1]; }));
  const QN = { '': 'M', m: 'm', maj7: 'M7', m7: 'm7', 7: '7', add9: 'add9', m6: 'm6', sus4: 'sus4', dim: 'dim' };
  const chords = (str) => str.trim().split(/\s+/).map((c) => { const m = /^([A-G])([#b]?)(.*)$/.exec(c); return [NL[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0), QN[m[3]]]; });
  function line(x, k, bar, vol, o = {}) {   // play one bar of melody on instrument k; o.ring for struck instruments, o.oct to shift, o.from/o.to to play part of it
    let b = 0; const P = x.P(k);
    for (const [s2, d] of bar) { if (s2 != null && b >= (o.from || 0) && b < (o.to ?? 99)) { const tt = x.t0 + b * x.beat + (o.loose ? x.j() : 0), dur = o.ring ? Math.max(o.ring, d * x.beat * 1.2) : d * x.beat * .97; P(tt, x.F(s2 + (o.oct || 0)), vol * (b === 0 ? 1.08 : 1), dur, o.pan || 0, o.ring ? .004 : (o.att ?? .05), o.ring ? .3 : (o.rel ?? .15)); } b += d; }
  }
  function arp(x, k, notes, idx, step, vol, o = {}) { const P = x.P(k); idx.forEach((n, i) => { if (n == null) return; P(x.t0 + i * step * x.beat + x.j(), x.F(notes[n] + (o.oct || 0)), i === 0 ? vol * 1.5 : vol, o.ring || 1.6, ((n / (notes.length - 1)) - .5) * (o.wide ?? .3)); }); }
  const SONG_DEF = {
    meadow: { bpm: 84, beats: 3, prog: 'Bbmaj7 C Am7 Dm7 Gm7 C Fmaj7 Fadd9 Bbmaj7 C Am7 Dm7 Gm7 A7 Bbm6 C7',
      mel: 'D5:2 C5:.5 D5:.5 | E5:2 G5 | A5:2 E5 | F5:3 | D5 C5 Bb4 | F5:1.5 E5:1.5 | C5 A4 F4 | G4 A4:2 | D5:2 F5 | E5:1.5 G5:.5 A5 | C6:2 A5 | G5 F5 D5 | F5:2 D5 | C#5:2 E5 | F5:1.5 Db5:1.5 | C5:3' },
    morning: { bpm: 96, beats: 4, prog: 'G D Em7 Cmaj7 G Am7 D7 G Cmaj7 Bm7 Em7 A7 Cmaj7 D D7 G',
      mel: 'B4 D5 G5:1.5 F#5:.5 | E5 D5 A4:2 | B4 D5 E5 G5 | E5:3 D5 | B4 D5 G5:1.5 A5:.5 | B5 A5 E5:2 | F#5 E5 C5 A4 | G4 B4 D5:2 | E5:1.5 G5:.5 B5:2 | A5 F#5 D5:2 | G5 F#5 E5 B4 | C#5:2 E5 G5 | G5:1.5 E5:.5 B4:2 | A4 D5 F#5 A5 | C6:2 A5 F#5 | G5:4' },
    fair: { bpm: 112, beats: 4, prog: 'Dm A7 Dm D7 Gm Dm E7 A7 Dm A7 Dm D7 Gm Dm A7 Dm',
      mel: 'A4:.5 D5:.5 F5:.5 A5:.5 G5 F5 | E5:.5 F5:.5 G5:.5 E5:.5 C#5:2 | D5:.5 F5:.5 A5:.5 D6:.5 C6 A5 | A5 F#5 D5 C5 | Bb4:.5 D5:.5 G5:.5 Bb5:.5 A5 G5 | F5 E5:.5 D5:.5 A4:2 | G#4 B4 D5 E5 | C#5 E5 A5:2 | A5:1.5 F5:.5 D5 A4 | G5:1.5 E5:.5 C#5 A4 | F5:.5 G5:.5 A5 D6:2 | C6 A5 F#5 D5 | D6 Bb5 G5 D5 | F5 A5 D5:2 | E5:.5 F5:.5 E5:.5 D5:.5 C#5 E5 | D5:2 r:2' },
    rain: { bpm: 66, beats: 4, prog: 'Ebmaj7 Cm7 Abmaj7 Bbsus4 Gm7 Cm7 Fm7 Bb7 Abmaj7 Gm7 Fm7 Eb7 Abmaj7 Abm6 Eb Bbsus4',
      mel: 'G5:2 F5 D5 | Eb5:3 G4 | C5 Eb5 G5:2 | F5:3 Eb5 | D5:2 Bb4 F5 | Eb5:2 D5 C5 | Ab4 C5 Eb5 Ab5 | G5:3 r | Eb5 G5 C6:2 | Bb5:2 F5:2 | Ab5 G5 F5 C5 | Db5:2 Bb4 G4 | C5 Eb5 G5 Bb5 | B4:2 Eb5 F5 | G5:2 Eb5:2 | F5:4' },
    harvest: { bpm: 168, beats: 6, prog: 'D G D A Bm G Em7 A7 D F#m G D Em A Bm D',
      mel: 'A4:2 D5 F#5:2 E5 | D5:2 B4 D5:3 | F#5:2 A5 F#5:2 D5 | E5:3 C#5:3 | D5:2 F#5 B5:2 A5 | G5:2 F#5 D5:3 | E5:2 G5 B5:2 G5 | A5:3 G5:3 | F#5:2 A5 D6:3 | C#6:2 A5 F#5:3 | B5:2 A5 G5:2 D5 | F#5:3 A4:3 | G5:2 F#5 E5:2 B4 | C#5:2 E5 A5:3 | B5:2 A5 F#5:2 E5 | D5:6' },
    lantern: { bpm: 58, beats: 4, prog: 'Dm Bbmaj7 Gm7 A7 Dm Fmaj7 Gm Asus4 Bbmaj7 C Am7 Dm Gm7 C7 Fmaj7 A7',
      mel: 'A5:2 F5 D5 | A5:3 G5 | F5:2 D5 Bb4 | C#5:3 E5 | F5:2 A5 D6 | C6:2 A5 E5 | Bb5:2 G5 D5 | D5:2 C#5:2 | D5 F5 A5:2 | G5:2 E5 C5 | E5:2 G5 A5 | F5:4 | Bb5:2 A5 G5 | G5:2 E5 C5 | A5:2 G5 F5 | E5:2 C#5:2' },
    stand: { bpm: 132, beats: 4, prog: 'Em C D Bm Em C Am B7 C D Bm Em Am D B7 Em',
      mel: 'E4:1.5 B4:.5 E5:2 | G4:1.5 C5:.5 E5:2 | F#5:1.5 E5:.5 D5:2 | B4:4 | E5:1.5 F#5:.5 G5:2 | E5:2 G5:2 | A4 C5 E5:2 | D#5:2 F#5:2 | E5:2 G5:2 | F#5:2 D5:2 | B4:1.5 D5:.5 F#5:2 | E5:4 | E5:1.5 C5:.5 A4:2 | D5:1.5 E5:.5 F#5:2 | F#5:2 D#5:2 | E5:4' },
    tide: { bpm: 92, beats: 4, prog: 'Dm Bb Gm A Dm Bb Eb A7 Dm Bb Gm A Dm Bb Eb A7',
      mel: 'A4:4 | Bb4:2 D5:2 | D5:3 C5 | C#5:4 | F5:2 E5 D5 | D5:2 F5:2 | G5:3 Eb5 | E5:2 C#5:2 | A4:4 | Bb4:2 D5:2 | G5:3 F5 | E5:4 | F5:2 G5 A5 | Bb5:2 F5:2 | G5:3 Bb4 | A4:2 C#5:2' },
  };
  SONG_DEF.stand_a = { ...SONG_DEF.stand, bpm: 144 }; SONG_DEF.stand_b = { ...SONG_DEF.stand, bpm: 138 };   /* round 5: survivors fighting, not an army */
  for (const [k, d] of Object.entries(SONG_DEF)) { MOODS[k] = { bpm: d.bpm, prog: chords(d.prog) }; d.m = tune(d.mel); }
  const SONGS = {   // each gets x: { c, out, t0, beat, root, ch, i (bar in the tune), pass (0 first time through, 1 second), P, PAD, K, F, j }
    meadow(x) {   /* storybook waltz: piano alone, then flute over harp and strings, a glockenspiel sparkle */
      const v = [x.root - 12, x.root - 5, x.ch[1], x.ch[x.ch.length - 1]], m = SONG_DEF.meadow.m[x.i];
      if (x.pass === 0 && x.i < 8) { arp(x, 'piano', v, [0, 1, 2, 3, 2, 1], .5, .1, { ring: 1.6 }); line(x, 'piano', m, .23, { ring: .9, loose: 1 }); }
      else { x.P('piano')(x.t0, x.F(x.root - 12), .16, x.beat * 3, -.1); arp(x, 'harp', v, [0, 1, 2, 3, 2, 1], .5, .13, { oct: 12, wide: .4 }); x.PAD('str', x.t0, [x.F(x.root - 12), x.F(x.ch[1]), x.F(x.ch[x.ch.length - 1])], x.beat * 3 + .25, .03, 900); line(x, 'flu', m, .22, { pan: .1 }); if ([1, 2, 9, 10, 15].includes(x.i)) line(x, 'glk', m, .12, { ring: 1.8, oct: 12, to: 1, pan: .25 }); }
    },
    morning(x) {   /* walking tune: nylon guitar picking, flute; second time strings, glockenspiel and a soft shaker */
      const v = [x.root - 12, x.ch[2] - 12, x.ch[1], x.ch[2], x.root + 12], m = SONG_DEF.morning.m[x.i];
      arp(x, 'nyl', v, [0, 2, 3, 4, 1, 3, 2, 3], .5, .12, { ring: 1.4 });
      line(x, 'flu', m, .2, { pan: .1 });
      if (x.pass) { x.PAD('str', x.t0, [x.F(x.root - 12), x.F(x.ch[1]), x.F(x.ch[2])], x.beat * 4 + .3, .025, 1000); if (x.i % 4 === 0) line(x, 'glk', m, .1, { ring: 1.6, oct: 12, to: 1, pan: .3 }); for (let b = 0; b < 8; b++) x.K(x.t0 + b * x.beat / 2, b % 2 ? 'shaker_up' : 'shaker_dn', .045); }
    },
    fair(x) {   /* village two-step: accordion tune over pizzicato oom-pah; second time a glockenspiel joins */
      const m = SONG_DEF.fair.m[x.i], pz = x.P('pz');
      pz(x.t0, x.F(x.root - 12), .38, .6, -.15); pz(x.t0 + 2 * x.beat, x.F(x.root - 5), .32, .6, -.15);
      [1, 3].forEach((b) => x.ch.slice(0, 3).forEach((s2, k) => pz(x.t0 + b * x.beat + k * .008, x.F(s2 + 12), .16, .4, .2)));
      line(x, 'acc', m, .2, { att: .02, rel: .08 });
      if (x.pass) { if (x.i >= 8) line(x, 'glk', m, .07, { ring: .8, oct: 12, pan: .3 }); [1, 3].forEach((b) => x.K(x.t0 + (b + .5) * x.beat, 'shaker_up', .1)); }
    },
    rain(x) {   /* rain on the roof: slow piano; second time a cello line and soft strings underneath */
      const m = SONG_DEF.rain.m[x.i], c = x.ch, v = [x.root - 12, c[2] - 12, c[1], c[2], x.root];
      arp(x, 'piano', v, [0, 1, 2, 3, 4, 3, 2, 1], .5, .085, { ring: 2.2, wide: .4 });
      line(x, 'piano', m, .21, { ring: 1.4, loose: 1 });
      if (Math.floor(x.j() * 1e4) % 2 === 0) x.P('piano')(x.t0 + (2 + Math.floor((x.j() + .01) * 100) % 4) * x.beat / 2 * 1.5, x.F(c[(x.i) % c.length] + 24), .045, 2, .35);   /* a drop of rain */
      if (x.pass) { const ce = x.P('cello'); ce(x.t0, x.F(c[1] - 12), .14, x.beat * 2 * .97, -.2, .15, .3); ce(x.t0 + 2 * x.beat, x.F(c[2] - 12), .13, x.beat * 2 * .97, -.2, .15, .3); x.PAD('str', x.t0, [x.F(x.root - 12), x.F(c[1])], x.beat * 4 + .3, .02, 700); }
    },
    harvest(x) {   /* 6/8 pastoral: harp and guitar rolling, oboe tune; second time the flute, a held oboe note and strings */
      const m = SONG_DEF.harvest.m[x.i], c = x.ch, v = [x.root - 12, c[2] - 12, c[1], c[2], x.root + 12];
      arp(x, 'harp', v, [0, 1, 2, 3, 2, 4], 1, .12, { ring: 1.4 }); x.P('nyl')(x.t0, x.F(x.root - 12), .14, 1.8, -.2);
      if (!x.pass) line(x, 'obo', m, .2, { pan: .1 });
      else { line(x, 'flu', m, .21, { pan: .1 }); x.P('obo')(x.t0, x.F(c[1]), .07, x.beat * 6 * .97, -.2, .2, .3); x.PAD('str', x.t0, [x.F(x.root - 12), x.F(c[2] - 12)], x.beat * 6 + .3, .025, 800); }
      return x.beat * 6;
    },
    lantern(x) {   /* night: low strings, a slow harp, a celesta tune; second time the flute carries it and a music box twinkles */
      const m = SONG_DEF.lantern.m[x.i], c = x.ch;
      x.PAD('str', x.t0, [x.F(x.root - 12), x.F(x.root - 5)], x.beat * 4 + .3, .04, 450);
      arp(x, 'harp', [x.root - 12, c[1], c[2], c[1] + 12], [0, 1, 2, 3], 1, .08, { ring: 2.4 });
      if (!x.pass) line(x, 'cel', m, .2, { ring: 1.6, loose: 1, pan: .15 });
      else { line(x, 'flu', m, .17, { pan: .1, att: .1 }); line(x, 'cel', m, .06, { ring: 1.6, oct: 12, to: 1, pan: .3 }); if (x.i % 2) x.P('mbox')(x.t0 + 2.5 * x.beat, x.F(c[2] + 24), .07, 2, -.3); }
    },
    stand(x) {   /* the fight: danger with no drums at all. Trembling low strings, a cello creeping a half step up and back, high strings rubbing a half step apart, horns carry the tune */
      const m = SONG_DEF.stand.m[x.i], c = x.ch, s32 = x.beat / 8, ce = x.P('cello');
      for (let k = 0; k < 32; k++) x.P('str')(x.t0 + k * s32, x.F(x.root - 12 + (k >= 16 && x.i % 2 ? 1 : 0)), .026 + (k % 8 === 0 ? .01 : 0), s32 * .95, -.25, .004, .02);
      for (let k = 0; k < 32; k++) x.P('str')(x.t0 + k * s32 + s32 / 2, x.F(c[1]), .016, s32 * .9, .25, .004, .02);
      ce(x.t0, x.F(x.root - 12), .16, x.beat * 2 * .98, -.1, .2, .3); ce(x.t0 + 2 * x.beat, x.F(x.root - 11), .15, x.beat * 2 * .98, -.1, .2, .3);
      x.PAD('str', x.t0, [x.F(c[2] + 12), x.F(c[2] + 13)], x.beat * 4 + .2, .02, 1600);
      if (x.i % 4 === 0) x.P('piano')(x.t0, x.F(x.root - 24), .1, 3, -.2);
      line(x, 'hrn', m, .22, { att: .08 });
      if (x.pass) line(x, 'obo', m, .07, { oct: 12, pan: .2 });
    },
    stand_a(x) {   /* round 5, take A: a scrappy survivors' band. Galloping muted guitar, a bass, the fiddle carries the tune, the accordion joins; knocks on a crate and a pipe instead of drums */
      const m = SONG_DEF.stand.m[x.i], c = x.ch, e = x.beat / 2, g = x.P('gtr'), bs = x.P('bass'), lo = [x.root - 12, x.root - 5];
      [0, 1, 1.5, 2, 3, 3.5].forEach((b, k) => lo.forEach((s2, i) => g(x.t0 + b * x.beat + i * .01, x.F(s2), k % 3 === 0 ? .2 : .12, e * .55, -.2, .003, .04)));
      [0, 2].forEach((b) => [x.root - 12, x.root - 5, x.root, c[1], c[2]].forEach((s2, i) => g(x.t0 + b * x.beat + .3 * e + i * .012, x.F(s2), .09, e * 1.6, .15)));
      bs(x.t0, x.F(x.root - 24), .45, e * 1.8); bs(x.t0 + 1.5 * x.beat, x.F(x.root - 17), .35, e * .9); bs(x.t0 + 2 * x.beat, x.F(x.root - 24), .42, e * 1.8); bs(x.t0 + 3 * x.beat, x.F(c[1] - 24), .32, e * 1.6);
      [0, 2].forEach((b) => sfx(x.c, x.out, x.t0 + b * x.beat, 'woodL' + ((x.i + b) % 3), .35, .9)); [1, 3].forEach((b) => sfx(x.c, x.out, x.t0 + b * x.beat, 'woodH' + ((x.i + b) % 3), .16, 1.1));
      if (x.i % 4 === 3) sfx(x.c, x.out, x.t0 + 3.5 * x.beat, 'metalL' + (x.i % 3), .12, 1.2);
      line(x, 'fid', m, .24, { pan: .1, att: .03, rel: .08 });
      if (x.pass) { line(x, 'acc', m, .09, { oct: -12, pan: -.25, att: .02 }); x.PAD('str', x.t0, [x.F(c[2] + 12)], x.beat * 4 + .2, .012, 1400); }
    },
    stand_b(x) {   /* round 5, take B: lean and tense. Pizzicato strings running in eighths, a muted guitar on the off-beats, a tin whistle tune (the fiddle second time), the cello creeping; one soft crate knock */
      const m = SONG_DEF.stand.m[x.i], c = x.ch, e = x.beat / 2, pz = x.P('pz'), g = x.P('gtr'), ce = x.P('cello');
      [0, 0, 7, 0, 8, 7, 3, 5].forEach((s2, k) => pz(x.t0 + k * e, x.F(x.root - 12 + (s2 === 8 && c[1] - x.root === 4 ? 9 : s2 === 3 && c[1] - x.root === 4 ? 4 : s2)), k % 2 ? .22 : .3, e * .8, k % 2 ? .2 : -.2));
      [.5, 1.5, 2.5, 3.5].forEach((b) => [x.root, c[1], c[2]].forEach((s2, i) => g(x.t0 + b * x.beat + i * .008, x.F(s2), .07, e * .4, .25, .002, .03)));
      ce(x.t0, x.F(x.root - 12), .12, x.beat * 4 * .98, -.1, .3, .4);
      sfx(x.c, x.out, x.t0, 'woodL' + (x.i % 3), .22, .85);
      line(x, x.pass ? 'fid' : 'whis', m, x.pass ? .21 : .18, { pan: .1, att: .03, rel: .08 });
    },
    tide(x) {   /* a horde or a boss: slower and heavier, great drums, a timpani roll, trembling strings, low brass swelling under the horns */
      const m = SONG_DEF.tide.m[x.i], c = x.ch, s16 = x.beat / 4;
      x.K(x.t0, 'kick', .7); [0, 1.5, 2].forEach((b, k) => x.K(x.t0 + b * x.beat, 'tom', k ? .45 : .65, .55));
      if (x.i % 2) for (let k = 0; k < 8; k++) x.P('timp')(x.t0 + 2 * x.beat + k * s16, x.F(x.root - 12), .08 + k * .03, .5);
      else x.P('timp')(x.t0, x.F(x.root - 12), .38, 1.4);
      [x.root - 12, x.root - 5, c[1]].forEach((s2) => x.P('brass')(x.t0, x.F(s2), .1, x.beat * 4 * .97, 0, .5, .4));
      for (let k = 0; k < 16; k++) x.P('str')(x.t0 + k * s16, x.F((k % 2 ? c[2] : x.root) + 12), .045, s16 * .9, k % 2 ? .3 : -.3, .004, .03);
      const ce = x.P('cello'); for (let k = 0; k < 8; k++) ce(x.t0 + k * x.beat / 2, x.F(x.root - 12), k % 2 ? .1 : .16, x.beat / 2 * .9, -.1, .004, .05);
      line(x, 'hrn', m, .28, { att: .08 }); if (x.pass || x.i >= 8) line(x, 'tpt', m, .09, { att: .05, pan: .2 });
    },
  };
  const MVOL = { calm: 2.6, hearth: 2.8, western: 2.3, jig: .75, rag: 4, day: 1.5, travis: 1.6, strum: .8, lounge: .7, porch: .8, night: 1.5, danger: .45, meadow: 4.8, morning: 2.4, fair: 2.25, rain: 6.2, harvest: 3.5, lantern: 5, stand: 4.8, stand_a: 1.3, stand_b: 4.4, tide: 1.05 };   /* 3D.53 even out the moods' loudness */
  function writeBar(c, out0, t0, mood, bar) {   // schedules one bar; returns its length in seconds
    const out = c.createGain(); out.gain.value = MVOL[mood] || 1; out.connect(out0);
    const M = MOODS[mood], beat = 60 / M.bpm, len = beat * 4, [r0, q] = M.prog[bar % M.prog.length], root = fold(r0), ch = Q[q].map((s) => root + s), F = (s) => N(s);
    const phrase = Math.floor(bar / M.prog.length);
    const P = (k) => (t, f, vol, dur = 1.4, pan = 0, att, rel) => samp(c, out, t, k, f, vol, dur, pan, att, rel) || pluck(c, out, t, f, vol * .9, Math.min(2, dur), pan);
    const PAD = (k, t, fs, dur, vol, cut) => { if (!fs.every((f) => samp(c, out, t, k, f, vol, dur, 0, .5, .6))) pad(c, out, t, fs, dur, vol * .25, cut, 1.2); };
    const K = (t, k, vol, rate, alt) => kit(c, out, t, k, vol, rate) || (alt && alt());
    if (SONGS[mood]) { const r = SONGS[mood]({ c, out, t0, beat, root, ch, i: bar % M.prog.length, pass: phrase % 2, bar, P, PAD, K, F, j: () => (mr() - .5) * .018 }); return r || beat * SONG_DEF[mood].beats; }
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
  let mood = 'day', want = 'day', bar = 0, musOut = null, layer = null, danger = false;
  /* Music chat (W102): moods cross-fade. The old tune plays one more bar while it fades out (at most 2.5 s); the new one fades in over 1.2 s */
  function crossfade(c, out, oldLayer, t, oldMood, oldBar) {
    const fade = Math.min(2.5, writeBar(c, oldLayer, t, oldMood, oldBar));
    oldLayer.gain.cancelScheduledValues(t); oldLayer.gain.setValueAtTime(1, t); oldLayer.gain.linearRampToValueAtTime(.0001, t + fade);
    const g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(1, t + 1.2); g.connect(out);
    if (!(window.OfflineAudioContext && c instanceof OfflineAudioContext)) setTimeout(() => { try { oldLayer.disconnect(); } catch (e) { /* gone */ } }, (fade + 4) * 1000);
    return g;
  }
  function scheduler() {
    if (!ctx || mode !== 'all') return; if (!musOut) { musOut = musicGraph(ctx, musBus); layer = ctx.createGain(); layer.connect(musOut); loadBank(ctx); }
    while (nextNote < ctx.currentTime + .6) {
      const t = Math.max(nextNote, ctx.currentTime + .05);
      if (want !== mood) { layer = crossfade(ctx, musOut, layer, t, mood, bar); mood = want; bar = 0; }
      nextNote = t + writeBar(ctx, layer, t, mood, bar++);
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
      for (const [t, n] of events) (n[0] === '+' ? NEWFX[n.slice(1)] : FX[n])(c, g.s, t);
      const md = dark === true ? 'night' : dark || 'day', o = musicSec ? musicGraph(c, g.mu) : null; let tt = .05, i = 0; while (tt < musicSec) tt += writeBar(c, o, tt, md, i++);
      const buf = await c.startRendering(); return buf.getChannelData(0);
    },
    async renderSeq(segs, sec) {   // offline: moods one after another, [[mood, seconds], ...], with the same cross-fade as the game
      const c = new OfflineAudioContext(2, Math.ceil(44100 * sec), 44100), g = build(c); await loadBank(new OfflineAudioContext(1, 1, 44100));
      const o = musicGraph(c, g.mu); let ly = c.createGain(); ly.connect(o); let tt = .05, b = 0, md = segs[0][0], end = 0;
      for (const [m, s2] of segs) { end += s2; if (m !== md) { ly = crossfade(c, o, ly, tt, md, b); md = m; b = 0; } while (tt < Math.min(end, sec - 3)) tt += writeBar(c, ly, tt, md, b++); }
      const buf = await c.startRendering(); return buf.getChannelData(0);
    },
    names: Object.keys(FX),
  };
  window.SND = SND;
})();
