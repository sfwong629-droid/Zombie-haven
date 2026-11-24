// tools/qa/heat_check.js [BACKUP.json] [seconds=5] — how hard the game works the phone (Bugs chat, bug A14, 24 Nov 2026).
// Plays a town in the real 3D game (the phone look) and measures, for: playing, a menu open (People), paused (an event card), playing again:
//   frames drawn a second and render passes a second on a pretend 60 Hz and 120 Hz screen (the browser's frame clock is driven by hand;
//   the drawing is counted, not done, because the cloud has no graphics card and draws only ~2 frames a second), the pixel ratio the
//   auto-quality settles on, and from one real frame: render passes and draw calls per frame. Heat follows the work done per second.
// Checks: at most 30 frames a second while playing (3D.347), at most 5 while a menu or card is open (3D.348), the game clock keeps time.
// Serve the repo first (python3 -m http.server 8765). ZH_QS='&fps=60' lifts the cap, for a before/after on the same build.
const Q = require('./lib'); const fs = require('fs');
const BAK = process.argv[2] && fs.existsSync(process.argv[2]) ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) : null, secs = +(process.argv[3] || 5);
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, look: '', expose: 'showPeoplePhone, menuPaused, showEventPopup' });
  if (BAK) { const save = JSON.stringify({ ...(BAK.save || BAK), sid: 'import', time: (BAK.save || BAK).time || Date.now() });
    await p.addInitScript((s) => { try { if (!sessionStorage.getItem('zhPut')) { localStorage.setItem('zombieHavenR1', s); localStorage.setItem('zhSlot', '1'); sessionStorage.setItem('zhPut', '1'); } } catch (e) { /* */ } }, save);
    await p.goto(Q.BASE + '/index.html?3d=1&play=1' + (process.env.ZH_QS || ''));
    await p.waitForFunction(() => window.ZH3D && window.ZH && ZH.S && ZH.S.sv.length && ZH3D.people().size, null, { timeout: 240000 }); await p.waitForTimeout(4000);
    await p.evaluate(() => { const k = document.getElementById('cutSkip'); if (k) k.click(); }); }
  else await Q.newGame(p);
  await Q.clearCards(p);
  const info = await p.evaluate(() => ({ build: ZH.BUILD_TAG, day: ZH.S.day, people: ZH.S.sv.length, buildings: ZH.world.buildings.length, zombies: ZH.S.z.filter((z) => z.hp > 0).length }));
  console.log('town', JSON.stringify(info));
  /* one real frame: render passes (ink outlines draw the scene more than once) and draw calls */
  const per = await p.evaluate(() => new Promise((res) => { const R = ZH3D.renderer, r0 = R.render; let passes = 0; R.info.autoReset = false; R.info.reset();
    R.render = function () { passes++; return r0.apply(this, arguments); }; const f0 = ZH3D.frame;
    ZH3D.frame = function () { passes = 0; R.info.reset(); f0.apply(this, arguments); ZH3D.frame = f0; R.render = r0; R.info.autoReset = true; res({ passes, drawCalls: R.info.render.calls, pixelRatio: R.getPixelRatio() }); }; }));
  console.log('one real frame', JSON.stringify(per));
  /* the pretend screen */
  await p.evaluate(() => { const R = ZH3D.renderer, pn = performance.now.bind(performance); window.__VT = { q: [], t: pn() };
    window.requestAnimationFrame = (cb) => { __VT.q.push(cb); return __VT.q.length; }; performance.now = () => __VT.t;
    window.__H = { fr: 0, passes: 0 }; R.render = function () { __H.passes++; };
    const f0 = ZH3D.frame; ZH3D.frame = function () { f0.apply(this, arguments); __H.fr++; };
    window.__run = (hz, s) => { for (const k in __H) __H[k] = 0; const n = Math.round(hz * s); for (let i = 0; i < n; i++) { __VT.t += 1000 / hz; const q = __VT.q; __VT.q = []; for (const cb of q) cb(__VT.t); } return { ...__H, dpr: R.getPixelRatio() }; }; });
  const measure = async (name) => { const r = { moment: name };
    for (const hz of [60, 120]) { const h = await p.evaluate(([hz, s]) => __run(hz, s), [hz, secs]); r['frames/s @' + hz + 'Hz'] = +(h.fr / secs).toFixed(1); r['passes/s @' + hz + 'Hz'] = +(h.passes / secs).toFixed(1); r['pixelRatio @' + hz + 'Hz'] = h.dpr; }
    r.paused = await p.evaluate(() => ZH.menuPaused() || !!document.querySelector('#eventModal .evBox')); console.log(JSON.stringify(r)); return r; };
  const out = [await measure('playing')];
  await p.evaluate(() => { ZH.showPeoplePhone(); __run(60, .3); }); out.push(await measure('menu open (People)'));
  await p.evaluate(() => { document.getElementById('infoPanel').classList.remove('show'); __run(60, .3); });
  await p.evaluate(() => { ZH.showEventPopup({ title: 'Heat check', text: 'The game waits for you.', buttons: [{ label: 'OK' }] }); __run(60, .3); }); out.push(await measure('paused (an event card)'));
  await p.evaluate(() => { for (const b of document.querySelectorAll('#eventModal button')) { if (/OK/.test(b.textContent)) { b.click(); break; } } __run(60, .3); }); out.push(await measure('playing again'));
  /* the checks (bug A14): at most 30 frames a second while playing, on a 60 Hz and a 120 Hz screen; the game still keeps time */
  const fails = []; const capOn = !/fps=/.test(process.env.ZH_QS || '');
  for (const r of out.filter((o) => o.paused)) for (const hz of [60, 120]) if (r['frames/s @' + hz + 'Hz'] > 5.5) fails.push(`${r.moment}: ${r['frames/s @' + hz + 'Hz']} frames a second on a ${hz} Hz screen while paused (at most 5)`);   /* 3D.348 */
  if (capOn) for (const r of out.filter((o) => !o.paused)) for (const hz of [60, 120]) if (r['frames/s @' + hz + 'Hz'] > 31) fails.push(`${r.moment}: ${r['frames/s @' + hz + 'Hz']} frames a second on a ${hz} Hz screen (at most 30)`);
  const clock = await p.evaluate(() => { let ticks = 0, open = 0; for (let i = 0; i < 600; i++) { const pz = ZH.menuPaused() || !!document.querySelector('#eventModal .evBox'), t0 = ZH.tick; __VT.t += 1000 / 60; const q = __VT.q; __VT.q = []; for (const cb of q) cb(__VT.t); if (pz) open++; else ticks += ZH.tick - t0; } return { ticks: Math.round(ticks * 600 / Math.max(1, 600 - open)), framesWithACardOpen: open }; });   /* steps per 10 s, counting only frames with no card or menu open (they pause the game) */
  if (Math.abs(clock.ticks - 600) > 30) fails.push(`the game ran ${clock.ticks} steps in 10 pretend seconds (600 expected): the clock must not slow with the drawing ${JSON.stringify(clock)}`);
  console.log(fails.length ? 'FAIL\n  ' + fails.join('\n  ') : 'PASS heat_check: ' + (capOn ? 'drawing capped at 30 a second; ' : '') + '5 a second with a menu or card open; ' + 'game clock keeps time (' + clock.ticks + ' steps in 10 s)');
  fs.writeFileSync(process.env.ZH_OUT || '/tmp/heat_check.json', JSON.stringify({ info, per, out }, null, 1));
  await b.close(); process.exit(fails.length ? 1 : 0); })();
