// tools/qa/ink_check.js [ids=mattress,hawaii] — close-ups of armour on the gear test page with the ink outline on and off
// (3D.157: speckle on gear came from the ink pass). Writes ink1_<id>.png and ink0_<id>.png.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const ids = (process.argv[2] || 'mattress,hawaii').split(',');
  for (const ink of ['1', '0']) { const p = await Q.page(b, { w: 420, h: 860 });
    await p.goto(Q.BASE + '/index.html?gear=1&ink=' + ink + '&v=' + Date.now()); await p.waitForSelector('#gearRow .zc', { timeout: 120000 }); await p.waitForTimeout(30000);
    await p.evaluate(() => document.querySelector('#gmHide').click());
    for (const id of ids) { await p.evaluate((id) => document.querySelector('#gearRow .zc[data-id="' + id + '"]').click(), id); await p.waitForTimeout(5000); await p.screenshot({ path: `ink${ink}_${id}.png`, clip: { x: 110, y: 230, width: 200, height: 260 }, timeout: 180000 }); }
    await p.close(); }
  await b.close(); })();
