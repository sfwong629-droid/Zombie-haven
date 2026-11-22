// tools/qa/trip_place_check.js — 3D.271 (owner, 21 Nov: "exploration timer overlap when i am building something"). Sends a squad out,
// then starts placing a Rain Barrel. Checks, for the trip bar and for its small timer (hidden-bar form): while placing it is not shown and
// nothing of it overlaps the placing bar; after Cancel it is back. On 3D.270 it fails. Exit 0 ok, 1 failed, 2 could not set it up.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'startExpedition, expAutoSquad, startTool, mk, expBar, updatePreview' }); await Q.newGame(p); await Q.clearCards(p);
  const ok = await p.evaluate(() => { const S = ZH.S; S.food = S.water = 60; for (const q of S.sv) { q.hp = q.max; q.mode = 'free'; } while (S.sv.length < 5) S.sv.push(ZH.mk('X' + S.sv.length, 'Civilian', 1, 7, 10, S.sv.length)); const ids = ZH.expAutoSquad(3).map((q) => q.id); const r = ZH.startExpedition('houses', 'low', ids); ZH.closeP(); ZH.expBar(); return r.ok; });
  if (!ok) { console.log('could not send a squad out'); await b.close(); process.exit(2); }
  const bad = [];
  const look = () => p.evaluate(() => { const e = document.getElementById('expBar'), c = document.getElementById('confirmBar'); const vis = (x) => x && getComputedStyle(x).display !== 'none' && x.getBoundingClientRect().height > 0; const er = e && e.getBoundingClientRect(), cr = c && c.getBoundingClientRect();
    const over = vis(e) && vis(c) && er.left < cr.right && er.right > cr.left && er.top < cr.bottom && er.bottom > cr.top; return { bar: vis(e), placing: vis(c), over }; });
  for (const mini of [false, true]) { await p.evaluate((m) => { ZH.S.expMini = m; const e = document.getElementById('expBar'); if (e) { e.dataset.k = ''; } ZH.expBar(); }, mini); await p.waitForTimeout(300);
    const a = await look(); await p.evaluate(() => { ZH.startTool({ kind: 'building', type: 'barrel' }); const B = ZH.Wd.BUILD; for (let y = B.y0; y <= B.y1; y++) for (let x = B.x0; x <= B.x1; x++) { ZH.updatePreview(x, y); if (getComputedStyle(document.getElementById('confirmBar')).display !== 'none') return; } });   /* the placing bar opens once a tile is picked */ await p.waitForTimeout(500); const b2 = await look();
    await p.evaluate(() => document.getElementById('noBuild').click()); await p.waitForTimeout(500); const c = await look();
    console.log(mini ? 'small timer' : 'trip bar', JSON.stringify({ before: a, placing: b2, after: c }));
    if (!a.bar) bad.push(`${mini ? 'small timer' : 'trip bar'} not shown before placing`); if (!b2.placing) bad.push('the placing bar did not open');
    if (b2.bar || b2.over) bad.push(`${mini ? 'small timer' : 'trip bar'} still shown while placing${b2.over ? ', over the placing bar' : ''}`); if (!c.bar) bad.push(`${mini ? 'small timer' : 'trip bar'} not back after Cancel`); }
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: the trip bar steps aside while placing and comes back after'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0); })();
