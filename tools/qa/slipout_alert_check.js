// tools/qa/slipout_alert_check.js — 3D.233 (owner, 19 Nov): "X slipped out of the Lodge before it fell" rows in the Needs you list
// could not be closed and piled up (no ✕, nothing ever removed them). The row now stays only while the person is on the way to
// the other shelter. Makes one survivor slip out of a building and checks: the row appears; it is still there while they run;
// it is gone once they are inside the other shelter; and it is gone if they go down on the way.
// Exit 0 ok, 1 a check failed, 2 could not set it up.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'slipOut, alerts, alertsTick, world, ENCLOSED' }); await Q.newGame(p); await Q.clearCards(p);
  const setup = () => p.evaluate((who) => { const S = ZH.S; let bs = ZH.world.buildings.filter((o) => ZH.ENCLOSED(o) && !o.burnt); if (bs.length === 1) { ZH.world.buildings.push({ ...bs[0], x: bs[0].x + 5 }); bs = ZH.world.buildings.filter((o) => ZH.ENCLOSED(o) && !o.burnt); }   /* a new game has one shelter: copy it 5 tiles over so there is somewhere to slip to */ if (bs.length < 2) return null;
    const q = S.sv[who]; ZH.slipOut(q, bs[0]); const k = [...ZH.alerts.keys()].find((x) => /slipped out/.test(x) && x.startsWith(q.name)); return { name: q.name, k, mode: q.mode, n: bs.length }; }, 0);
  const has = (k) => p.evaluate((k) => { ZH.alertsTick(); return ZH.alerts.has(k); }, k);
  const bad = [];
  const a = await setup(); console.log('slip 1:', JSON.stringify(a)); if (!a || !a.k || a.mode !== 'hide') { console.log('could not make a survivor slip out (needs two shelters)'); await b.close(); process.exit(2); }
  if (!(await has(a.k))) bad.push('the row did not stay while they were on the way');
  await p.evaluate(() => { const q = ZH.S.sv[0]; q.mode = 'hiding'; }); if (await has(a.k)) bad.push('the row stayed after they reached the shelter');
  const c = await p.evaluate(() => { const S = ZH.S, q = S.sv[1], bs = ZH.world.buildings.filter((o) => ZH.ENCLOSED(o) && !o.burnt); ZH.slipOut(q, bs[0]); const k = [...ZH.alerts.keys()].find((x) => /slipped out/.test(x) && x.startsWith(q.name)); q.hp = 0; q.mode = 'down'; return k; });
  if (!c) bad.push('second slip made no row'); else if (await has(c)) bad.push('the row stayed after they went down');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: slip-out rows go once the person is in the other shelter'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0); })();
