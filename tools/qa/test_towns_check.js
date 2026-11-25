// tools/qa/test_towns_check.js — 3D.379 (W274 step 1): the title screen's Test towns, with real taps.
// Checks: the title has a Test towns button; it lists every town in assets/testtowns/index.json with its level, day, people and buildings;
// with slot 3 holding a town of the player's, the first tap only asks (the town to be replaced is named) and the second loads; the game
// starts in slot 3 at the town's level, named "Test · Level N" and marked as a test town; slot 1 is untouched; the replaced town is kept as
// slot 3's backup; a test town sets no trophy record and leaves no legacy; back on the title, slot 3 loads another test town at once (no
// asking: it is a test town). Pictures runs/features/test_towns_list.png and test_towns_in.png.
// Serve the repo first (python3 -m http.server 8765) or set ZH_NOSERVER=1. Exit 0 ok, 1 a check failed.
const Q = require('./lib'), fs = require('fs'), path = require('path');
(async () => { const idx = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'testtowns', 'index.json'), 'utf8')), b = await Q.launch();
  const p = await Q.page(b, { expose: 'testTown, legacySave, winGame, records' }); const res = {}, bad = [];
  await p.goto(Q.BASE + '/index.html?3d=1'); await p.waitForTimeout(8000);
  /* a town of the player's in slot 1 and in slot 3 */
  const mine = await p.evaluate(() => { const mk = (name, day) => JSON.stringify({ sid: 'x', version: '2.57.0', time: Date.now(), S: { townName: name, day, rank: 2, sv: [] }, sv: [{ id: 1 }], buildings: [], walls: [], roads: [] });
    localStorage.setItem('zombieHavenR1', mk('My Town', 12)); localStorage.setItem('zombieHavenR1_s3', mk('Spare Town', 4)); return localStorage.getItem('zombieHavenR1'); });
  await p.reload(); await p.waitForTimeout(8000);
  res.button = await p.locator('#tTT').isVisible();
  await p.click('#tTT'); await p.waitForTimeout(1500);
  res.rows = await p.$$eval('[data-tt]', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  res.note = await p.$eval('#ttNote', (e) => e.textContent).catch(() => '');
  await Q.shot(p, 'runs/features/test_towns_list.png');
  const L = idx.towns[idx.towns.length - 1];
  await p.click(`[data-tt="${L.lvl}"]`); await p.waitForTimeout(800);
  res.armed = await p.$eval(`[data-tt="${L.lvl}"]`, (e) => e.textContent).catch(() => ''); res.stillTitle = await p.locator('#slots').isVisible();
  await p.click(`[data-tt="${L.lvl}"]`, { noWaitAfter: true });
  await p.waitForFunction(() => window.ZH3D && window.ZH && ZH.S && ZH.S.sv && ZH.S.sv.length && ZH3D.people().size, null, { timeout: 150000 }); await p.waitForTimeout(3000); await Q.clearCards(p);
  res.inGame = await p.evaluate(() => ({ slot: ZH.SLOT, test: ZH.S.testTown, name: ZH.S.townName, lvl: ZH.S.lvl, day: ZH.S.day, pop: ZH.S.sv.length, isTest: ZH.testTown(), slot1: localStorage.getItem('zombieHavenR1'), bak3: (localStorage.getItem('zombieHavenR1_s3_bak') || localStorage.getItem('zombieHavenR1_s3.bak') || Object.keys(localStorage).filter((k) => k.startsWith('zombieHavenR1_s3') && k !== 'zombieHavenR1_s3').map((k) => localStorage.getItem(k)).join('')).includes('Spare Town') }));
  res.slot1Same = res.inGame.slot1 === mine; delete res.inGame.slot1;
  await p.waitForFunction(() => { const e = document.getElementById('worldLoad'); return !e || getComputedStyle(e).display === 'none' || !e.isConnected; }, null, { timeout: 90000 }).catch(() => {}); await p.waitForTimeout(2500); await Q.clearCards(p);
  for (let i = 0; i < 3; i++) { const g = p.locator('button:visible', { hasText: 'No more tips' }); if (await g.count()) await g.first().click().catch(() => {}); await p.waitForTimeout(600); }
  await Q.shot(p, 'runs/features/test_towns_in.png');
  res.noLegacy = await p.evaluate(() => ZH.legacySave() === false);
  res.noRecord = await p.evaluate(() => { const before = JSON.stringify(ZH.records()); try { ZH.winGame(); } catch (e) { return 'err ' + e.message; } return JSON.stringify(ZH.records()) === before; });
  /* back to the title: slot 3 now holds a test town, so another loads at once */
  await p.goto(Q.BASE + '/index.html?3d=1'); await p.waitForTimeout(8000); await p.click('#tTT'); await p.waitForTimeout(1500);
  const L0 = idx.towns[0]; res.note2 = await p.$eval('#ttNote', (e) => e.textContent).catch(() => '');
  await p.click(`[data-tt="${L0.lvl}"]`, { noWaitAfter: true });
  await p.waitForFunction(() => window.ZH && ZH.S && ZH.S.sv && ZH.S.sv.length && ZH.S.testTown, null, { timeout: 150000 });
  res.second = await p.evaluate(() => ({ slot: ZH.SLOT, lvl: ZH.S.testTown.lvl, name: ZH.S.townName }));
  console.log(JSON.stringify(res));
  if (!res.button) bad.push('no Test towns button on the title');
  if (res.rows.length !== idx.towns.length || !idx.towns.every((t, i) => res.rows[i].includes('Level ' + t.lvl) && res.rows[i].includes('Day ' + t.day))) bad.push('the list does not match the towns: ' + JSON.stringify(res.rows));
  if (!/slot 3/.test(res.note) || !/Spare Town/.test(res.note) || !/Slot 1 is never touched/.test(res.note)) bad.push('the note does not name slot 3 and the town it replaces: ' + res.note);
  if (!/Tap again/.test(res.armed) || !res.stillTitle) bad.push('the first tap did not just ask: ' + res.armed);
  const g = res.inGame; if (g.slot !== 3 || !g.test || g.test.lvl !== L.lvl || g.name !== 'Test · Level ' + L.lvl || !g.isTest || g.lvl < L.lvl) bad.push('the test town did not start in slot 3 at its level, named and marked: ' + JSON.stringify(g));
  if (!res.slot1Same) bad.push('slot 1 was changed');
  if (!g.bak3) bad.push("the replaced town was not kept as slot 3's backup");
  if (res.noLegacy !== true) bad.push('a test town left a legacy');
  if (res.noRecord !== true) bad.push('a test town set a trophy record: ' + res.noRecord);
  if (/in place of/.test(res.note2)) bad.push('a test town in slot 3 was treated as the player\'s own: ' + res.note2);
  if (res.second.slot !== 3 || res.second.lvl !== L0.lvl) bad.push('the second test town did not load at once: ' + JSON.stringify(res.second));
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : `ok: the title lists ${idx.towns.length} test towns (levels ${idx.towns.map((t) => t.lvl).join(', ')}); the first tap asks before replacing your slot 3 town, which is kept as its backup; the town starts in slot 3 at level ${g.lvl}, named and marked as a test; slot 1 untouched; no trophy record, no legacy; another test town replaces it with no asking`);
  if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0); })();
