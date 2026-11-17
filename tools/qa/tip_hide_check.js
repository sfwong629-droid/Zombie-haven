// tools/qa/tip_hide_check.js — 3D.186 (W40): a tip in the Needs you list can be hidden until the next day.
// The old tip line had a ✕ for this; the list that replaced it had none. Makes three tips appear in a new game, opens the list and checks:
// every tip row has a hide button with a 44px tap area; tapping it removes that tip only and keeps it away for the rest of the day;
// the tip is back the next day. Optional: a file name to save a picture of the list.
// Exit 0 ok, 1 a check failed, 2 the list could not be opened.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'alertHub' }); await Q.newGame(p); await Q.clearCards(p);
  await p.evaluate(() => { const S = ZH.S; S.stage = 3; S.rankReady = true; S.mat = 0; S.wood = 0; });
  const rows = () => p.evaluate(() => [...document.querySelectorAll('#alertPop .apRow')].map((r) => { const m = r.querySelector('.apM'), bx = m && m.getBoundingClientRect(); return { text: r.querySelector('.apT').textContent, hide: !!m, w: bx ? Math.round(bx.width) : 0, h: bx ? Math.round(bx.height) : 0 }; }));
  const open = async () => { await p.waitForTimeout(2500); await Q.clearCards(p).catch(() => {}); await p.evaluate(() => { const m = document.getElementById('eventModal'); if (m) m.style.display = 'none'; ZH.alertHub();   /* the button is only refreshed when an alert changes; with tips alone it can lag, so refresh it here */ if (!document.getElementById('alertPop')) { const a = document.getElementById('alertBtn'); if (a && a.style.display !== 'none') a.click(); } }); await p.waitForTimeout(700); return rows(); };
  const before = await open(); console.log('list:', JSON.stringify(before)); if (before.length < 2) { console.log('could not open the Needs you list with two or more tips'); await b.close(); process.exit(2); }
  if (process.argv[2]) await Q.shot(p, process.argv[2]);
  const bad = []; if (!before.every((r) => r.hide)) bad.push('a tip has no hide button'); if (before.some((r) => r.hide && (r.w < 44 || r.h < 44))) bad.push('the hide button is under 44px');
  const first = before[0].text; await p.evaluate(() => { const m = document.querySelector('#alertPop .apM'); if (m) m.click(); }); await p.waitForTimeout(600);
  const after = await rows(); console.log('after hide:', JSON.stringify(after.map((r) => r.text)));
  if (after.some((r) => r.text === first)) bad.push('the hidden tip is still in the list'); if (after.length !== before.length - 1) bad.push('hiding one tip changed ' + (before.length - after.length) + ' rows');
  await p.waitForTimeout(3000); if ((await rows()).some((r) => r.text === first)) bad.push('the hidden tip came back the same day');
  await p.evaluate(() => { ZH.S.day += 1; }); await p.evaluate(() => { const x = document.querySelector('#alertPop .apX'); if (x) x.click(); }); const next = await open();
  console.log('next day:', JSON.stringify(next.map((r) => r.text))); if (!next.some((r) => r.text === first)) bad.push('the tip did not come back the next day');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: tips can be hidden until tomorrow'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0); })();
