// tools/qa/defence_plan_check.js — 3D.366: traps and guard posts planned, then built on Confirm (owner, 24 Nov: "yes those too"), with real
// taps on the game's canvas. With the trap tool: taps only plan (ghosts, nothing paid, Confirm shown); Confirm builds them; a tap on a
// planned one unplans it; a tap on a built one marks it and Confirm takes it up (half back); a spent one is re-armed at once; with too
// little stock Confirm builds what it can and the rest stays planned; the trap cap counts planned ones. With the post tool: taps plan
// posts (the spacing rule counts planned ones), Confirm builds them and a fighter takes one; a tap on a built post with nothing planned
// opens its setup; Cancel throws a plan away, leaving the tool too. Writes runs/features/defence_plan_traps.png and defence_plan_posts.png (plans as ghosts).
// Serve the repo first (python3 -m http.server 8765) or set ZH_NOSERVER=1. Exit 0 ok, 1 a check failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { expose: 'startTool, endBuildMode, closeP, project, centerOn, cam, trapMax, postMax' }); await Q.newGame(p); await Q.clearCards(p);
  const setup = await p.evaluate(() => { const S = ZH.S, W = window.ZHWorld, world = ZH.world; ZH.ARRIVE.low = ZH.ARRIVE.high = 1e9; S.z.length = 0; S.rank = 3; world.traps = new Map(); S.posts = []; W.bump(world); S.wood = 100; S.stone = 50; S.mat = 100; S.fuel = 10;
    const B = W.BUILD; ZH.cam.z = .5; ZH.centerOn((B.x0 + B.x1 + 1) / 2, B.y1 + 2); document.querySelectorAll('#eventModal button').forEach((x) => x.click());
    const open = []; for (let y = B.y1 - 5; y <= B.y1 + 4; y++) for (let x = B.x0; x <= B.x1; x++) if (ZH.trapOkTile(x, y) && W.inWallZone(x, y) && !W.isRoad(world, x, y)) open.push({ x, y }); return { B, open, tmax: ZH.trapMax(), pmax: ZH.postMax() }; });
  await p.waitForTimeout(400);
  const rect = await p.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.left, y: r.top }; });
  const tap = async (x, y) => { const q = await p.evaluate(([x, y]) => ZH.project(x + .5, y + .5), [x, y]); await p.mouse.click(rect.x + q.x, rect.y + q.y); await p.waitForTimeout(60); };
  const confirm = async () => { await p.click('#yesBuild'); await p.waitForTimeout(80); }, cancel = async () => { await p.click('#noBuild'); await p.waitForTimeout(80); };
  const st = () => p.evaluate(() => ({ traps: ZH.world.traps.size, posts: (ZH.S.posts || []).length, mat: ZH.S.mat, wood: ZH.S.wood, plan: (window.ZHG.defGhost() || []).map((q) => q.st).join(','), yes: document.getElementById('yesBuild').textContent, yesShown: getComputedStyle(document.getElementById('yesBuild')).display !== 'none', no: document.getElementById('noBuild').textContent, panel: document.getElementById('infoPanel').classList.contains('show') }));
  const vis = await p.evaluate((o) => { const r = document.querySelector('canvas').getBoundingClientRect(); return o.filter((t) => { const q = ZH.project(t.x + .5, t.y + .5); return q.x > r.width * .1 && q.x < r.width * .8 && q.y > r.height * .22 && q.y < r.height * .62; }); }, setup.open);
  const open = vis, out = {}, bad = []; const T = []; for (const t of open) if (T.every((u) => Math.abs(u.x - t.x) + Math.abs(u.y - t.y) >= 3)) T.push(t); out.nT = T.length;   /* spread out, so posts can use them too */   /* spread out, so posts can use them too */
  /* traps */
  await p.evaluate(() => ZH.startTool({ kind: 'trap', ttype: 'spikes' })); const s0 = await st();
  await tap(T[0].x, T[0].y); await tap(T[1].x, T[1].y); await tap(T[2].x, T[2].y); out.planned = await st();
  await tap(T[2].x, T[2].y); out.unplanned = await st();
  await confirm(); out.built = await st(); out.paid = { mat: s0.mat - out.built.mat, wood: s0.wood - out.built.wood };
  await tap(T[0].x, T[0].y); out.marked = await st(); await confirm(); out.up = await st();
  await p.evaluate(([x, y]) => { ZH.world.traps.get(x + ',' + y).ch = 0; }, [T[1].x, T[1].y]); const m0 = (await st()).mat; await tap(T[1].x, T[1].y);
  out.rearm = { ch: await p.evaluate(([x, y]) => ZH.world.traps.get(x + ',' + y).ch, [T[1].x, T[1].y]), mat: m0 - (await st()).mat, plan: (await st()).plan };
  await p.evaluate(() => { ZH.S.mat = 4; ZH.S.wood = 100; }); for (const t of T.slice(2, 5)) await tap(t.x, t.y); out.shortPlan = await st(); await confirm(); out.short = await st();
  await p.evaluate(() => { ZH.S.mat = 100; ZH.world.traps = new Map(); ZH.startTool({ kind: 'trap', ttype: 'spikes' }); }); for (const t of open.slice(0, setup.tmax + 2)) await tap(t.x, t.y); out.cap = await st();
  await cancel(); out.cancel = await st();
  /* the picture: a mixed plan of traps, and posts */
  await p.evaluate(() => { ZH.S.mat = 9; ZH.startTool({ kind: 'trap', ttype: 'wire' }); }); for (const t of T.slice(0, 4)) await tap(t.x, t.y); await p.evaluate(() => { ZH.S.mat = 100; ZH.startTool({ kind: 'trap', ttype: 'spikes' }); }); await tap(T[1].x, T[1].y); await confirm(); await p.evaluate(() => { ZH.S.mat = 3; ZH.startTool({ kind: 'trap', ttype: 'spikes' }); }); for (const t of T.slice(0, 4)) await tap(t.x, t.y);
  out.trapPic = await st(); await p.evaluate((t) => { ZH.cam.z = 1.1; ZH.centerOn(t.x + 1, t.y + 1); }, T[1]); await p.waitForTimeout(700); await Q.shot(p, 'runs/features/defence_plan_traps.png'); await p.evaluate((B) => { ZH.cam.z = .5; ZH.centerOn((B.x0 + B.x1 + 1) / 2, B.y1 + 2); }, setup.B); await p.waitForTimeout(300); await p.evaluate(() => { ZH.world.traps = new Map(); ZH.S.mat = 100; });
  await p.evaluate(() => ZH.startTool({ kind: 'post' })); const P = [T[0], open.find((t) => Math.abs(t.x - T[0].x) + Math.abs(t.y - T[0].y) >= 4 && Math.abs(t.x - T[0].x) + Math.abs(t.y - T[0].y) <= 7)];
  await tap(P[0].x, P[0].y); const near = open.find((t) => Math.abs(t.x - P[0].x) + Math.abs(t.y - P[0].y) === 1); await tap(near.x, near.y); out.tooClose = await st(); await tap(P[1].x, P[1].y); out.postPlan = await st();
  await p.waitForTimeout(500); await Q.shot(p, 'runs/features/defence_plan_posts.png');
  await confirm(); out.posts = await st(); out.holder = await p.evaluate(() => (ZH.S.posts || []).some((q) => q.cur));
  await tap(P[0].x, P[0].y); out.setup = await st(); await p.evaluate((B) => { ZH.closeP(); ZH.endBuildMode(); ZH.cam.z = .5; ZH.centerOn((B.x0 + B.x1 + 1) / 2, B.y1 + 2); }, setup.B); await p.waitForTimeout(300);
  await Q.clearCards(p); await p.evaluate(() => ZH.startTool({ kind: 'post' })); const far = open.find((t) => (ZH_P => ZH_P.every((q) => Math.abs(q.x - t.x) + Math.abs(q.y - t.y) >= 3))(P)); await tap(far.x, far.y); const pl = (await st()).plan; await p.evaluate(() => ZH.endBuildMode()); out.leave = { before: pl, after: await p.evaluate(() => window.ZHG.defGhost()) };
  console.log(JSON.stringify(out));
  if (out.nT < 5) bad.push('too few open tiles for the check: ' + out.nT);
  if (out.trapPic.plan.split(',').length !== 4 || !out.trapPic.plan.includes('short') || !out.trapPic.plan.includes('del')) bad.push('the picture plan should show to build, short and to take away: ' + out.trapPic.plan);
  if (out.planned.traps || out.planned.plan !== 'new,new,new' || out.planned.mat !== s0.mat || out.planned.yes !== 'Confirm' || !out.planned.yesShown || out.planned.no !== 'Cancel') bad.push('trap taps did not just plan (ghosts, nothing paid, Confirm and Cancel shown): ' + JSON.stringify(out.planned));
  if (out.unplanned.plan !== 'new,new') bad.push('a tap on a planned trap did not take it off the plan');
  if (out.built.traps !== 2 || out.built.plan || out.paid.mat !== 4 || out.paid.wood !== 4 || out.built.no !== 'Done') bad.push('Confirm did not build 2 Spike Strips for 4 scrap and 4 wood: ' + JSON.stringify([out.built, out.paid]));
  if (out.marked.plan !== 'del' || out.marked.traps !== 2 || out.up.traps !== 1 || out.up.mat - out.built.mat !== 1) bad.push('a built trap was not marked, or Confirm did not take it up with half back: ' + JSON.stringify([out.marked, out.up]));
  if (out.rearm.ch !== 5 || out.rearm.mat !== 2 || out.rearm.plan) bad.push('a spent trap was not re-armed at once: ' + JSON.stringify(out.rearm));
  if (out.shortPlan.plan !== 'new,new,short' || out.short.traps !== 3 || out.short.plan !== 'short') bad.push('with scrap for 2, a plan of 3 did not build 2 and keep 1 planned: ' + JSON.stringify([out.shortPlan, out.short]));
  if (out.cap.plan.split(',').length !== setup.tmax) bad.push(`the trap cap did not count planned traps (cap ${setup.tmax}): ` + out.cap.plan);
  if (out.cancel.plan || out.cancel.traps || out.cancel.no !== 'Done') bad.push('Cancel did not throw the trap plan away: ' + JSON.stringify(out.cancel));
  if (out.tooClose.plan !== 'new') bad.push('a post planned next to a planned post was allowed: ' + out.tooClose.plan);
  if (out.postPlan.posts || out.postPlan.plan !== 'new,new') bad.push('post taps did not just plan: ' + JSON.stringify(out.postPlan));
  if (out.posts.posts !== 2 || out.posts.mat !== out.postPlan.mat - 6 || !out.holder) bad.push('Confirm did not build the 2 posts for 6 scrap with a holder: ' + JSON.stringify([out.posts, out.holder]));
  if (!out.setup.panel) bad.push('a tap on a built post did not open its setup');
  if (out.leave.before !== 'new' || out.leave.after) bad.push('leaving the post tool did not throw the plan away: ' + JSON.stringify(out.leave));
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : `ok: trap and post taps only plan (ghosts, nothing paid) and Confirm builds them; a tap unplans a planned one; a built trap marked comes up with half back; a spent trap re-arms at once; short of stock, Confirm builds what it can and keeps the rest; the trap cap (${setup.tmax}) and post spacing count planned ones; a built post opens its setup; Cancel and leaving the tool throw the plan away`);
  if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0); })();
