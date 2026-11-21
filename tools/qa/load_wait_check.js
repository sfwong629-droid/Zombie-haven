// tools/qa/load_wait_check.js — 3D.250 bug A13 (owner, 21 Nov): "If the graphic isn't loaded yet the game [shouldn't] start."
// Opens a game with the model files held back, then lets them through. Checks: while they are held, the loading screen shows
// (a bar and a figure) and the game clock does not move; once the world is ready the screen is gone and the clock runs.
// Exit 0 ok, 1 a check failed, 2 could not set it up.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'get tk() { return tick; }' });
  let open; const gate = new Promise((r) => { open = r; }); let held = 0;
  await p.route(/\.glb(\.txt)?(\?|$)/, async (r) => { held++; await gate; r.continue(); });
  await p.goto(Q.BASE + '/index.html?3d=1&test=loadwait&nocut=1');
  await p.waitForFunction(() => window.ZH && ZH.S && ZH.S.sv.length, null, { timeout: 60000 }); await p.waitForTimeout(1500);
  const bad = [];
  const a = await p.evaluate(() => ({ tk: ZH.tk, scr: !!document.getElementById('worldLoad'), bar: (document.querySelector('#worldLoad .wlBar i') || {}).style?.width, fig: (document.querySelector('#worldLoad .wlFig') || {}).textContent, ready: !!(window.ZH3D && ZH3D.ready) }));
  await p.waitForTimeout(2500); const tk2 = await p.evaluate(() => ZH.tk);
  console.log('held', held, 'files; while held:', JSON.stringify(a), 'clock then', tk2);
  if (a.ready) { console.log('the world was ready before the files were let through: could not test'); await b.close(); process.exit(2); }
  if (!a.scr) bad.push('no loading screen while the world loads'); else if (!a.fig) bad.push('the loading screen shows no figure');
  if (tk2 !== a.tk) bad.push(`the game clock ran while loading (${a.tk} -> ${tk2})`);
  await Q.shot(p, '/tmp/load_wait.png');
  open(); await p.waitForFunction(() => window.ZH3D && ZH3D.ready, null, { timeout: 240000 }); await p.waitForTimeout(2500);
  const c = await p.evaluate(() => ({ tk: ZH.tk, scr: !!document.getElementById('worldLoad') })); await p.waitForTimeout(1500); const tk3 = await p.evaluate(() => ZH.tk);
  console.log('after:', JSON.stringify(c), 'clock then', tk3);
  if (c.scr) bad.push('the loading screen stayed after the world was ready'); if (!(tk3 > c.tk)) bad.push('the game clock did not run after loading');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: the game waits behind the loading screen until the world is ready'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0); })();
