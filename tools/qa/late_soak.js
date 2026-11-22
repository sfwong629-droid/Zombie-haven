// tools/qa/late_soak.js BACKUP.json [ms=180000] — the real 3D game on a saved (late) town (Bugs chat, 21 Nov 2026, the whole-game bug sweep).
// Loads the backup, turns on the frozen-pose tracker, plays at speed with the camera hopping between people and zombies, and reports:
// page errors, frozen-pose flags (bug A1), people whose figure is missing, frames per second. Serve the repo first (python3 -m http.server 8765).
const Q = require('./lib'); const fs = require('fs');
const BAK = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), ms = +(process.argv[3] || 180000);
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 });
  const save = JSON.stringify({ ...(BAK.save || BAK), sid: 'import', time: (BAK.save || BAK).time || Date.now() });
  await p.addInitScript((s) => { try { if (!sessionStorage.getItem('zhPut')) { localStorage.setItem('zombieHavenR1', s); localStorage.setItem('zhSlot', '1'); sessionStorage.setItem('zhPut', '1'); } } catch (e) { /* */ } }, save);
  await p.goto(Q.BASE + '/index.html?3d=1&play=1');
  await p.waitForFunction(() => window.ZH3D && window.ZH && ZH.S && ZH.S.sv.length && ZH3D.people().size, null, { timeout: 240000 }); await p.waitForTimeout(4000);
  await p.evaluate(() => { const k = document.getElementById('cutSkip'); if (k) k.click(); }); await Q.clearCards(p);
  const info = await p.evaluate(() => ({ day: ZH.S.day, lvl: ZH.S.lvl, people: ZH.S.sv.length, buildings: ZH.world.buildings.length }));
  console.log('town', JSON.stringify(info));
  await p.evaluate(() => { ZH3D.track.on = true; ZH3D.track.log.length = 0; let k = 0; document.getElementById('btnSpeed').click(); document.getElementById('btnSpeed').click();
    setInterval(() => { const L = [...ZH.S.sv.filter((q) => !['away', 'hospital'].includes(q.mode)), ...ZH.S.z.filter((z) => z.hp > 0)]; const m = L[(k++) % Math.max(1, L.length)]; if (m && m.w) ZH.centerOn(m.w.x, m.w.y); }, 5000);
    setInterval(() => { for (let i = 0; i < 8; i++) { const bs = [...document.querySelectorAll('#eventModal button')]; if (!bs.length) break; bs[0].click(); } const a = document.getElementById('acceptReq'); if (a) a.click(); }, 3000); });
  const t0 = Date.now(), fps = []; let h0 = await p.evaluate(() => ZH.S.day * 24 + ZH.S.hour), missing = [];
  while (Date.now() - t0 < ms) { await p.waitForTimeout(10000); await Q.clearCards(p);
    const r = await p.evaluate(() => { const P = ZH3D.people(); const miss = ZH.S.sv.filter((q) => !['away', 'hospital', 'errand'].includes(q.mode) && !P.has(q)).map((q) => q.name + ' ' + q.mode); return { fps: ZH3D.fps, miss, z: ZH.S.z.filter((z) => z.hp > 0).length }; });
    fps.push(Math.round(r.fps)); if (r.miss.length) missing.push(r.miss.join(', ')); }
  const frozen = await p.evaluate(() => ZH3D.track.log.filter((e) => /FROZEN/.test(e.flag)).slice(0, 20));
  const h1 = await p.evaluate(() => ZH.S.day * 24 + ZH.S.hour);
  const by = {}; for (const e of frozen) (by[e.name + ' | mode=' + e.mode + ' clip=' + e.clip] ||= 0), by[e.name + ' | mode=' + e.mode + ' clip=' + e.clip]++;
  console.log(JSON.stringify({ gameHours: h1 - h0, fps, errors: p.errs.slice(0, 5), frozen: by, missingFigures: [...new Set(missing)].slice(0, 5) }));
  await b.close(); })();
