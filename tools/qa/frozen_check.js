// tools/qa/frozen_check.js [ms=240000] [speedClicks=2] — bug A1 (sliding survivors) check.
// 1. Self-test: stops one survivor's animation on purpose and makes sure the tracker flags FROZEN within a few seconds
//    (so the check can't silently stop working), then lets them go and makes sure the flag clears.
// 1b. Bug A1 itself: rebuilds every survivor's figure while the camera looks away and checks they all still animate.
// 2. Soak: plays a new game with the camera hopping between survivors, menus opening and closing, the speed button
//    being pressed, and fails if anyone is flagged FROZEN (bones not moving while on their feet).
// Exit code 0 = no frozen survivors, 1 = at least one (each printed with what its clip was doing), 2 = the self-test failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 300, h: 520 }); await Q.newGame(p);
  const ms = +(process.argv[2] || 240000), spd = +(process.argv[3] ?? 2);
  const frozen = () => p.evaluate(() => ZH3D.track.log.filter((e) => /FROZEN/.test(e.flag)));
  // ---- 1. self-test
  const who = await p.evaluate(() => { ZH3D.track.on = true; ZH3D.track.log.length = 0; for (const [s, a] of ZH3D.people()) if (a.o.visible && s.mode !== 'down' && a.mixer) { a._upd = a.mixer.update; a.mixer.update = () => {}; window.__fz = a; ZH.centerOn(s.w.x, s.w.y); return s.name; } return null; });
  if (!who) { console.log('SELF-TEST: no visible survivor to freeze'); await b.close(); process.exit(2); }
  let hit = []; for (let i = 0; i < 20 && !hit.length; i++) { await p.waitForTimeout(1500); await Q.clearCards(p); hit = (await frozen()).filter((e) => e.name === who); }
  await p.evaluate(() => { const a = window.__fz; a.mixer.update = a._upd; ZH3D.track.log.length = 0; }); await p.waitForTimeout(6000);
  if (!hit.length) { console.log('SELF-TEST FAILED: ' + who + ' was frozen on purpose and the check did not notice'); await b.close(); process.exit(2); }
  console.log('self-test ok: ' + who + ' frozen on purpose was flagged (' + JSON.stringify(hit[0]).slice(0, 220) + ')');
  await p.evaluate(() => { ZH3D.track.log.length = 0; for (const a of ZH3D.people().values()) { a.fzSig = undefined; } });
  // ---- 1b. bug A1 itself (3D.176). The accessory list on a figure used the same name as its animation clock, so the clock
  // stopped for good for (i) anyone wearing an accessory and (ii) anyone whose figure was made while off screen.
  const clocks = () => p.evaluate(() => [...ZH3D.people()].filter(([s, a]) => a.o.visible && s.mode !== 'down').map(([s, a]) => ({ n: s.name, type: typeof a.acc, ok: typeof a.acc === 'number' && isFinite(a.acc), mt: a.mixer.time || 0 })));
  const running = async (label, only) => { await Q.clearCards(p); await p.waitForTimeout(1500); const c0 = await clocks(); let c1 = c0; for (let i = 0; i < 4; i++) { await p.waitForTimeout(2000); await Q.clearCards(p); c1 = await clocks(); }
    const bad = c1.filter((c) => (!only || c.n === only) && (() => { const b0 = c0.find((q) => q.n === c.n); return !c.ok || (b0 && !(c.mt > b0.mt)); })());
    if (bad.length || !c1.length) { console.log('FAIL (bug A1, ' + label + '): not animating: ' + JSON.stringify(bad.length ? bad : 'nobody visible')); await b.close(); process.exit(1); } return c1.length; };
  // (i) put a School Backpack on the survivor from the self-test
  await p.evaluate((who) => { const s = ZH.S.sv.find((q) => q.name === who); s.eq = s.eq || {}; window.__acc0 = s.eq.acc; s.eq.acc = 'backpack'; ZH.centerOn(s.w.x, s.w.y); }, who);
  await running('wearing an accessory', who); await p.evaluate((who) => { const s = ZH.S.sv.find((q) => q.name === who); s.eq.acc = window.__acc0; }, who);
  console.log('accessory check ok: ' + who + ' animates with a backpack on');
  // (ii) look away, rebuild every figure, and watch the clocks while they are off screen, then look back
  await p.evaluate(() => { ZH.centerOn(-200, -200); }); await p.waitForTimeout(1500); await Q.clearCards(p);
  await p.evaluate(() => { const P = ZH3D.people(); for (const [s, a] of [...P]) { if (a.cart) a.cart.visible = false; a.dispose(); P.delete(s); } });
  let offBad = [], wasOff = false; for (let i = 0; i < 12; i++) { await p.waitForTimeout(400); await Q.clearCards(p); const st = await p.evaluate(() => [...ZH3D.people()].map(([s, a]) => ({ n: s.name, acc: a.acc, type: typeof a.acc }))); for (const c of st) { if (c.type !== 'number' || !isFinite(c.acc)) offBad.push(c); else if (c.acc > 0) wasOff = true; } }
  if (offBad.length) { console.log('FAIL (bug A1, figures made off screen): the animation clock is not a number: ' + JSON.stringify(offBad.slice(0, 3))); await b.close(); process.exit(1); }
  await p.evaluate(() => { const s0 = ZH.S.sv.find((q) => q.w && !['away', 'hospital'].includes(q.mode)); ZH.centerOn(s0.w.x, s0.w.y); });
  const nOk = await running('figures made off screen'); console.log('off-screen check ok: ' + nOk + ' survivors rebuilt ' + (wasOff ? 'off screen' : '(WARNING: the camera could not get them off screen, so this part proved little)') + ' all animate');
  await p.evaluate(() => { ZH3D.track.log.length = 0; for (const a of ZH3D.people().values()) { a.fzSig = undefined; } });
  // ---- 2. soak
  await p.evaluate((spd) => { for (let i = 0; i < spd; i++) document.getElementById('btnSpeed').click(); let k = 0;
    setInterval(() => { const L = ZH.S.sv.filter((q) => !['away', 'hospital'].includes(q.mode)); const m = L[(k++) % Math.max(1, L.length)]; if (m && m.w) ZH.centerOn(m.w.x, m.w.y); }, 6000);
    setInterval(() => { for (let i = 0; i < 8; i++) { const bs = [...document.querySelectorAll('#eventModal button')]; if (!bs.length) break; bs[0].click(); } }, 3000);
    setInterval(() => { if (Math.random() < .5) document.getElementById('btnSpeed').click(); }, 17000); }, spd);
  const t0 = Date.now(); let seen = [];
  while (Date.now() - t0 < ms) { await p.waitForTimeout(10000); seen = await frozen(); if (seen.length >= 5) break; }
  const by = {}; for (const e of seen) (by[e.name + ' | mode=' + e.mode + ' clip=' + e.clip] ||= []).push(e);
  for (const [k, v] of Object.entries(by)) console.log('FROZEN', String(v.length).padStart(3), k, '\n      ', JSON.stringify(v[0]));
  console.log(seen.length ? 'FAIL: ' + seen.length + ' frozen-pose flags' : 'ok: nobody froze in ' + Math.round((Date.now() - t0) / 1000) + ' s', '| fps', Math.round(await p.evaluate(() => ZH3D.fps)), '| errors', p.errs.slice(0, 3));
  await b.close(); process.exit(seen.length ? 1 : 0); })();
