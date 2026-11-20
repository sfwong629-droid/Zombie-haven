// tools/qa/alarm_close_check.js — 3D.240 (owner, 19 Nov): the Car alarm card had no way out (only "Set it off" and "Mark for salvage").
// Taps a wreck with a zombie beside it and checks: the card shows a ✕ at least 44 px; tapping it closes the card; no alarm went off
// and the wreck was not marked; the same wreck can be tapped again and the card comes back.
// Exit 0 ok, 1 a check failed, 2 could not set it up.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'tapTree, nodeList, alarmCands, nodeKey' }); await Q.newGame(p); await Q.clearCards(p);
  const w = await p.evaluate(() => { const S = ZH.S; const ws = ZH.nodeList().filter((n) => n.k === 'wreck'); if (!ws.length) return null; let z = S.z.find((o) => o.hp > 0 && !o.human && o.type !== 'boss');
    if (!z) return { err: 'no zombie on the map' }; const n = ws[0]; z.w.x = n.x + 1.2; z.w.y = n.y + .5; if (z.mode === 'appear') z.mode = 'wander'; z.zoo = false; z.lure = null; return { x: n.x, y: n.y, c: ZH.alarmCands(n.x, n.y).length, zm: z.mode, zw: z.w, nz: S.z.length }; });
  console.log('wreck:', JSON.stringify(w)); if (!w || w.err || !w.c) { console.log('could not set up a wreck with a zombie near it'); await b.close(); process.exit(2); }
  await p.waitForTimeout(600); await Q.clearCards(p);   /* field notes ("New: Walker") pop up when a zombie comes near: clear them first */
  const bad = [];
  const tap = async () => { await p.evaluate(({ x, y }) => { ZH.tapTree(x, y); }, w); for (let i = 0; i < 8; i++) { await p.waitForTimeout(150); const t = await p.evaluate(() => (document.querySelector('#eventModal .evBox:not(.liveCard) .evTitle') || {}).textContent || ''); if (!t || /CAR ALARM/.test(t)) break; await Q.clearCards(p); } };   /* a field note queued ahead of it ("New: Walker") is tapped away first */
  await tap(); await p.waitForTimeout(300);
  const card = await p.evaluate(() => { const x = document.querySelector('#eventModal .evX'), t = document.querySelector('#eventModal .evTitle'); return { title: t && t.textContent, x: !!x, h: x ? x.offsetHeight : 0, wd: x ? x.offsetWidth : 0 }; });
  console.log('card:', JSON.stringify(card));
  if (!/CAR ALARM/.test(card.title || '')) bad.push('the Car alarm card did not open'); else if (!card.x) bad.push('no ✕ on the card'); else if (card.h < 44 || card.wd < 44) bad.push(`✕ is ${card.wd}x${card.h} px, under 44`);
  if (card.x) { await p.click('#eventModal .evX'); await p.waitForTimeout(200);
    const after = await p.evaluate(({ x, y }) => { const S = ZH.S, n = (S.nodes || {})[ZH.nodeKey(x, y)]; return { open: /CAR ALARM/.test((document.querySelector('#eventModal .evTitle') || {}).textContent || ''), t: (document.querySelector('#eventModal .evTitle') || {}).textContent, alarm: !!(n && n.alarm === S.day), lure: S.z.some((z) => z.lure), marked: !!(n && n.mark) }; }, w);
    console.log('after ✕:', JSON.stringify(after));
    if (after.open) bad.push('the card stayed open'); if (after.alarm || after.lure) bad.push('the ✕ set the alarm off'); if (after.marked) bad.push('the ✕ marked the wreck');
    await p.waitForTimeout(500); await Q.clearCards(p); await tap(); await p.waitForTimeout(300);
    if (!(await p.evaluate(() => /CAR ALARM/.test((document.querySelector('#eventModal .evTitle') || {}).textContent || '')))) bad.push('tapping the wreck again did not bring the card back'); }
  await Q.shot(p, '/tmp/alarm_close.png');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: the Car alarm card closes with its ✕ and does nothing'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0); })();
