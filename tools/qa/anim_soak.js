// Animation audit: every frame, compare what each survivor / zombie is doing with the clip that plays.
// tools/qa/anim_soak.js [ms=240000] [speedClicks=0] — animation audit: plays a new game and lists every moment where a
// survivor's or walker's clip does not match what they are doing (sliding, walking in place, feet too fast...), grouped.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 300, h: 520 }); await Q.newGame(p); const errs = p.errs;
  await p.evaluate((spd) => { ZH3D.track.on = true; for (let i = 0; i < spd; i++) document.getElementById('btnSpeed').click(); let k = 0; setInterval(() => { const L = ZH.S.sv.filter(q => !['away', 'hospital'].includes(q.mode)); const m = L[(k++) % Math.max(1, L.length)]; if (m && m.w) ZH.centerOn(m.w.x, m.w.y); }, 6000);
    setInterval(() => { for (let i = 0; i < 8; i++) { const bs = [...document.querySelectorAll('#eventModal button')]; if (!bs.length) break; bs[0].click(); } }, 3000); }, +(process.argv[3] || 0));
  await p.waitForTimeout(+(process.argv[2] || 240000));
  const L = await p.evaluate(() => ZH3D.track.log); const by = {}; for (const e of L) { const k = e.flag + ' | mode=' + e.mode + ' clip=' + e.clip + ' sim=' + e.sim; (by[k] ||= []).push(e); }
  for (const [k, v] of Object.entries(by).sort((a, b) => b[1].length - a[1].length).slice(0, 30)) console.log(String(v.length).padStart(4), k, '\n      e.g.', JSON.stringify(v[0]).slice(0, 300));
  console.log('fps', await p.evaluate(() => ZH3D.fps), 'errors', errs.slice(0, 3)); await b.close(); })();
