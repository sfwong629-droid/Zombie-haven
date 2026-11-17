// tools/qa/new_zombies_check.js [shot.png] — 3D.182: the 11 new zombie models on the Zombie test page (?zoo).
// Each must be lined up (one zombie with z.mk = its key), its model file must load, and the figure on screen must be
// that model and not a stand-in. Also fails if the page throws an error. Exit 0 ok, 1 a model is missing or wrong.
const Q = require('./lib');
const KEYS = ['digger', 'lineman', 'splitter', 'stag', 'bilespewer', 'hazmat', 'leaper', 'listener', 'nurse', 'soldier_m', 'soldier_f'];
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 });
  await p.goto(Q.BASE + '/index.html?3d=1&zoo=1'); await p.waitForFunction(() => window.ZH3D && window.ZH && ZH.S && ZH.S.z && ZH.S.z.some((z) => z.mk), null, { timeout: 200000 });
  for (let i = 0; i < 90; i++) { if (await p.evaluate((K) => K.every((k) => ZH3D.zReady(k) || ZH3D.zFail(k)), KEYS)) break; await p.waitForTimeout(1000); }
  await p.waitForTimeout(4000);
  const r = await p.evaluate((K) => K.map((k) => { const z = ZH.S.z.filter((q) => q.mk === k); return { k, lined: z.length, ready: ZH3D.zReady(k), fail: ZH3D.zFail(k), worn: z.length && ZH3D.zWorn ? ZH3D.zWorn(z[0]) : null }; }), KEYS);
  let bad = 0; for (const x of r) { const ok = x.lined === 1 && x.ready && !x.fail && x.worn === x.k; if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + x.k + ': lined up ' + x.lined + ', file loaded ' + x.ready + ', wearing ' + x.worn); }
  if (p.errs.length) { bad++; console.log('page errors:', p.errs.slice(0, 5).join(' | ')); }
  if (process.argv[2]) await Q.shot(p, process.argv[2]);
  console.log(bad ? 'FAIL: ' + bad + ' problem(s)' : 'ok: all 11 new models are on the Zombie test page wearing their own model'); await b.close(); process.exit(bad ? 1 : 0); })();
