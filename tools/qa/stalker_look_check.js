// tools/qa/stalker_look_check.js — bug A7 (3D.179): the Stalker must wear its own skin.
// Asks for the Stalker's Field Note picture before its model file has loaded (the game then draws a stand-in Runner),
// waits for the file, asks again, and checks the second picture (i) is no longer the stand-in and (ii) has none of the
// Runner's red hoodie on it. Exit 0 ok, 1 the Stalker is wearing the wrong skin or the stand-in picture stuck.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p);
  const pic = () => p.evaluate(async () => { const u = ZH3D.zombieIso('stalker', true); if (!u) return null; const im = new Image(); im.src = u; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0, red = 0; for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 200) continue; n++; if (d[i] > 140 && d[i + 1] < 90 && d[i + 2] < 90) red++; } return { len: u.length, sum: u.slice(-400), solid: n, red: +(red / Math.max(1, n)).toFixed(3) }; });
  const early = await p.evaluate(() => !ZH3D.zReady('stalker')); const p1 = await pic();
  for (let i = 0; i < 40 && !(await p.evaluate(() => ZH3D.zReady('stalker'))); i++) await p.waitForTimeout(1000);
  if (!(await p.evaluate(() => ZH3D.zReady('stalker')))) { console.log('the Stalker model never loaded'); await b.close(); process.exit(2); }
  const p2 = await pic(); const stuck = early && p1 && p2 && p1.len === p2.len && p1.sum === p2.sum;
  console.log('asked before the model loaded:', early, '| first picture red share', p1 && p1.red, '| picture after loading red share', p2 && p2.red, '| same picture as the stand-in:', !!stuck);
  const bad = !p2 || stuck || p2.red > .03; console.log(bad ? 'FAIL (bug A7): the Stalker picture is ' + (stuck ? 'still the stand-in Runner' : 'wearing the wrong skin') : 'ok: the Stalker wears its own skin');
  await b.close(); process.exit(bad ? 1 : 0); })();
