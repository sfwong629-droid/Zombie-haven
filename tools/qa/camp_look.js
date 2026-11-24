// tools/qa/camp_look.js CAMP [LEVEL] [OUT.png] [ZOOM] [PAN] — pictures of a raid camp with the screen's buttons hidden, for judging how it looks
// (Strongholds chat). Three shots are taken, the camp's middle and PAN tiles to the left and right of it on the screen (default 7), and written
// as OUT_0.png, OUT_1.png, OUT_2.png. No server needed.
const Q = require('./sh_lib'); const path = require('path');
(async () => { const [map, lv, out, zoom, pan] = [process.argv[2] || 'raid_toll', +(process.argv[3] || 10), process.argv[4] || path.join(__dirname, '..', '..', 'runs', 'strongholds', `look_${process.argv[2] || 'raid_toll'}.png`), +(process.argv[5] || .75), +(process.argv[6] || 7)];
  const b = await Q.launch(); const p = await Q.open(b); await p.setViewportSize({ width: 1500, height: 950 }); await Q.newGame(p); const r = await Q.practice(p, map, lv, 6, true); if (!r.ok) { console.log('could not start:', r.why); process.exit(1); }
  await p.waitForTimeout(800); await Q.clearCards(p); await p.evaluate(() => { for (const e of document.querySelectorAll('#eventModal')) e.style.display = 'none'; });
  await p.evaluate(() => { const cv = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0]; for (const e of document.querySelectorAll('body *')) if (e !== cv && !e.contains(cv) && e.tagName !== 'CANVAS') e.style.visibility = 'hidden'; });
  for (const i of [0, 1, 2]) { await p.evaluate(([zoom, d]) => { const H = ZH.S.sh, G = H.cg; for (const z of H.zs) z.hid = false; H.cx = ZH.SH_AX + (G.x0 + G.x1) / 2 + .5 + d; H.cy = ZH.SH_AY + (G.y0 + G.y1) / 2 + 1 - d; H.cz = zoom; H.free = true; H.view = true; }, [zoom, (i - 1) * pan]);
    await p.waitForTimeout(i ? 1500 : 3500); const f = out.replace(/\.png$/, '') + '_' + i + '.png'; await Q.shot(p, f); console.log('wrote', f); }
  await b.close(); })();
