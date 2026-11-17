// tools/qa/zoo_show_check.js [shot.png] — 3D.183, 3D.184 (a survivor beside it for size): the Zombie test page shows one zombie at a time, playing on the spot.
// Checks: one zombie on the map at the start and after tapping a card; Stand / Walk / Run / Attack each play the right clip
// while the zombie stays where it is; Turn on turns it and Turn off holds it still; a kind that never runs keeps walking;
// the Walker, Lasher and Leaper are drawn at the sizes the owner asked for and the three other bosses have cards (3D.185);
// "Show all" lines everyone up and the buttons reach all of them; no page errors. Exit 0 ok, 1 something is wrong.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); let bad = 0;
  const ok = (c, m) => { if (!c) bad++; console.log((c ? 'ok   ' : 'FAIL ') + m); };
  await p.goto(Q.BASE + '/index.html?3d=1&zoo=1'); await p.waitForFunction(() => window.ZH3D && window.ZH && ZH.S && ZH.S.z && ZH.S.z.length && document.getElementById('zooPanel'), null, { timeout: 200000 });
  const pick = async (card) => { await p.evaluate((c) => document.querySelector('.zc[data-t="' + c + '"]').click(), card);
    for (let i = 0; i < 90; i++) { if (await p.evaluate(() => !!ZH3D.zClip(ZH.S.z[0]) && (!ZH.S.z[0].mk || ZH3D.zWorn(ZH.S.z[0]) === ZH.S.z[0].mk))) break; await p.waitForTimeout(500); } };
  const act = async (a) => { await p.evaluate((a) => document.querySelector('.zact .act[data-a="' + a + '"]').click(), a); await p.waitForTimeout(1500); return p.evaluate(() => ZH3D.zClip(ZH.S.z[0])); };
  const turn = async (on) => p.evaluate((on) => { const t = document.getElementById('zooTurn'); if (t.classList.contains('on') !== on) t.click(); }, on);
  await p.waitForTimeout(1500); ok(await p.evaluate(() => ZH.S.z.length) === 1, 'the page opens on one zombie');
  for (const [card, want] of [['walker', { stand: /^idle$/, walk: /^zombie_walk$/, run: /^zombie_walk$/, attack: /attack/ }], ['runner', { run: /^zombie_run$/ }], ['thrower', { walk: /walk/, attack: /./ }], ['leaper', { stand: /^idle$/, walk: /^zombie_walk$/, attack: /attack/ }], ['stag', { walk: /^zombie_walk$/, run: /^zombie_run$/, attack: /attack/ }]]) {
    await pick(card); ok(await p.evaluate(() => ZH.S.z.length) === 1, card + ': alone on the map'); await turn(false);
    { const r = await p.evaluate(() => { const z = ZH.S.z[0], q = ZH.S.sv.filter((s) => s.zooRef); return { n: q.length, d: q[0] ? Math.hypot(q[0].w.x - z.w.x, q[0].w.y - z.w.y) : 9, still: q[0] && !q[0].moving }; }); ok(r.n === 1 && r.d < 1.5 && r.still, card + ': one survivor stands beside it for size (' + r.d.toFixed(2) + ' tiles away)'); }   /* 3D.184 */
    for (const [a, re] of Object.entries(want)) { const c0 = await act(a); await p.waitForTimeout(1200); const c1 = await p.evaluate(() => ZH3D.zClip(ZH.S.z[0]));
      ok(c1 && re.test(c1.clip), card + ' ' + a + ': plays ' + (c1 && c1.clip)); ok(c0 && c1 && Math.hypot(c1.x - c0.x, c1.z - c0.z) < .01 && Math.abs(c1.yaw - c0.yaw) < .01, card + ' ' + a + ': stays on the spot, not turning'); }
    await turn(true); const y0 = (await p.evaluate(() => ZH3D.zClip(ZH.S.z[0]))).yaw; await p.waitForTimeout(1500); const y1 = (await p.evaluate(() => ZH3D.zClip(ZH.S.z[0]))).yaw; ok(y1 - y0 > .03, card + ': Turn turns it'); }
  // 3D.185: sizes beside the survivor, and the three bosses that were missing from the page
  for (const [card, want] of [['walker', 1.156], ['lasher', 1.6], ['leaper', 1.2], ['digger', 1]]) { await pick(card); await p.waitForTimeout(800); const c = await p.evaluate(() => ZH3D.zClip(ZH.S.z[0])); ok(c && Math.abs(c.sc - want) < .01, card + ': drawn at ' + (c && c.sc.toFixed(3)) + ' (want ' + want + ')'); }
  for (const bk of ['bloater', 'butcher', 'gatling']) { await pick(bk); await p.waitForTimeout(800); const r = await p.evaluate(() => ({ n: ZH.S.z.length, bk: ZH.S.z[0] && ZH.S.z[0].bk, c: ZH3D.zClip(ZH.S.z[0]) })); ok(r.n === 1 && r.bk === bk && r.c && r.c.clip, bk + ': on the page as a boss, playing ' + (r.c && r.c.clip)); }
  if (process.argv[2]) { await pick('digger'); await turn(false); await act('walk'); await Q.shot(p, process.argv[2]); }
  await p.evaluate(() => document.getElementById('zooAll').click()); await p.waitForTimeout(2500);
  const all = await p.evaluate(() => ({ n: ZH.S.z.length, show: ZH.S.z.every((z) => z.show && z.show.act) })); ok(all.n === 31 && all.show && !(await p.evaluate(() => ZH.S.sv.some((s) => s.zooRef))), '"Show all": ' + all.n + ' zombies lined up, all taking the buttons');
  ok(!p.errs.length, 'no page errors' + (p.errs.length ? ': ' + p.errs.slice(0, 3).join(' | ') : ''));
  console.log(bad ? 'FAIL: ' + bad + ' problem(s)' : 'ok: the Zombie test shows one zombie at a time, playing on the spot'); await b.close(); process.exit(bad ? 1 : 0); })();
