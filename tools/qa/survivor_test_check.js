// tools/qa/survivor_test_check.js — 3D.190 Survivor test page (?svt): every animation button plays its clip, the survivor turns, man and woman both work.
const Q = require('./lib');
const tap = (p, sel) => p.evaluate((sel) => document.querySelector(sel).click(), sel);   // a plain click: Playwright's own waits for the picture to settle, which is slow without a graphics card
(async () => { const b = await Q.launch(); const p = await Q.page(b); let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
  await p.goto(Q.BASE + '/index.html?3d=1&svt=1'); await p.waitForFunction(() => window.ZH3D && window.ZH && ZH.S && document.getElementById('svtNext') && ZH.S.sv.some((q) => q.svt) && ZH3D.pClip(ZH.S.sv.find((q) => q.svt)), null, { timeout: 250000 }); await p.waitForTimeout(3000);
  const st = () => p.evaluate(() => { const q = ZH.S.sv.find((x) => x.svt), c = ZH3D.pClip(q); return { clip: c && c.clip, fem: c && c.fem, rate: c && c.rate, yaw: q.show.yaw, want: q.show.clip, z: ZH.S.z.length, n: ZH.S.sv.filter((x) => x.svt).length }; });
  const cards = await p.evaluate(() => [...document.querySelectorAll('#zooPanel .zc')].map((b) => b.dataset.c)), have = await p.evaluate(() => ZH3D.survivorClips(false).map((c) => c.name));
  ok(cards.length === 49, cards.length + ' animation buttons (49 expected)'); ok(cards.every((c) => have.includes(c)), 'every button names a clip the model has');
  const a = await st(); ok(a.clip === 'walk' && Math.abs(a.rate - 1) < .05, 'it opens on the walk, played at its natural pace'); await p.waitForTimeout(2500); const a2 = await st(); ok(a2.yaw > a.yaw + .05, 'the survivor is turning');
  let wrong = []; for (let i = 0; i < cards.length; i++) { await tap(p, '#svtNext'); await p.waitForTimeout(450); const s = await st(); if (s.clip !== s.want) wrong.push(s.want + '→' + s.clip); }
  ok(!wrong.length, 'Next goes through all ' + cards.length + ' and each one plays' + (wrong.length ? ' (wrong: ' + wrong.join(', ') + ')' : ''));
  for (const c of ['melee_hold_walk', 'melee_hold_jog', 'gun_hold_walk', 'gun_hold_jog', 'carry_walk']) { await tap(p, '.zc[data-c="' + c + '"]'); await p.waitForTimeout(900); const h = await st(); ok(h.clip === c && Math.abs(h.rate - 1) < .05, c + ' plays at its natural pace'); }
  await tap(p, '.zc[data-c="jog"]'); await p.waitForTimeout(1200); const j = await st(); ok(j.clip === 'jog' && Math.abs(j.rate - 1) < .05, 'tapping Jog plays the jog at its natural pace');
  await tap(p, '#svtTurn'); await p.waitForTimeout(600); const t1 = await st(); await p.waitForTimeout(1500); const t2 = await st(); ok(Math.abs(t2.yaw - t1.yaw) < .01, 'the Turn button stops the turning');
  await tap(p, '#svtSex'); await p.waitForTimeout(6000); const f = await st(); ok(f.fem === true && f.clip === 'jog' && f.n === 1, 'the woman replaces the man and keeps the animation'); ok(f.z === 0, 'no zombies on the page');
  ok(!p.errs.length, 'no page errors' + (p.errs.length ? ': ' + p.errs[0] : '')); await b.close(); console.log(bad ? bad + ' FAILED' : 'ALL OK'); process.exit(bad ? 1 : 0); })();
