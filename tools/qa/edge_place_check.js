// tools/qa/edge_place_check.js — 3D.359 (W269 step 2): placing walls and gates on the lines between tiles, with real taps and drags on
// the game's canvas. In a town on lines with the wall tool: a tap puts a piece on the nearest line, a second and third tap take it away
// (half back); a one-finger drag along the build zone's edge draws a straight run (a ghost while dragging) and builds it on release, and
// the view does not move; four drags close a ring round the town; a building's doorway is skipped by a wall run; a Gate tapped on a piece
// swaps in; with too little wood a run builds what it can; a line outside the build zone is refused; the Demolish tool takes a piece away.
// Pictures for the owner are made by tools/qa/edge_place_pics.js (a drag's ghost, the ring built).
// Serve the repo first (python3 -m http.server 8765) or set ZH_NOSERVER=1. Exit 0 ok, 1 a check failed.
const Q = require('./lib'), path = require('path');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { expose: 'startTool, endBuildMode, project, unproject, centerOn, cam, edgeOn, wallCount' }); await Q.newGame(p); await Q.clearCards(p);
  const setup = await p.evaluate(() => { const S = ZH.S, W = window.ZHWorld, world = ZH.world; ZH.ARRIVE.low = ZH.ARRIVE.high = 1e9; S.z.length = 0; S.edgeWalls = true; world.walls = new Map(); world.edges = new Map(); W.bump(world); S.wood = 400; S.stone = 100; S.mat = 100;
    const B = W.BUILD; ZH.cam.z = .36; ZH.centerOn((B.x0 + B.x1 + 1) / 2, (B.y0 + B.y1 + 1) / 2 + .5); document.querySelectorAll('#eventModal button').forEach((x) => x.click());
    const hq = world.buildings[0], t = W.approachTile(hq); return { B, door: { x: t.x, y: t.y }, hq: { x: hq.x, y: hq.y, w: hq.w, h: hq.h } }; });
  await p.waitForTimeout(400);
  const rect = await p.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.left, y: r.top }; });
  const scr = (wx, wy) => p.evaluate(([x, y]) => ZH.project(x, y), [wx, wy]).then((q) => ({ x: rect.x + q.x, y: rect.y + q.y }));
  const tap = async (wx, wy) => { const s = await scr(wx, wy); await p.mouse.click(s.x, s.y); await p.waitForTimeout(60); };
  const drag = async (a, z, shot) => { const s = await scr(a.x, a.y), e = await scr(z.x, z.y); await p.mouse.move(s.x, s.y); await p.mouse.down(); for (let k = 1; k <= 12; k++) { await p.mouse.move(s.x + (e.x - s.x) * k / 12, s.y + (e.y - s.y) * k / 12); await p.waitForTimeout(15); }
    const mid = await p.evaluate(() => { const d = ZH.ZHG ? null : window.ZHG.edgeDraft(); return d ? d.list.map((q) => q.st) : null; }); if (shot) { await p.waitForTimeout(500); await Q.shot(p, shot); } await p.mouse.up(); await p.waitForTimeout(80); return mid; };
  const st = () => p.evaluate(() => ({ n: ZH.world.edges.size, wood: ZH.S.wood, cam: [Math.round(ZH.cam.x), Math.round(ZH.cam.y)], sealed: window.ZHWorld.perimeter(ZH.world).sealed, msg: (document.querySelector('#toast, .toast, #say') || {}).textContent || '' }));
  const has = (s, x, y) => p.evaluate(([s, x, y]) => { const e = ZH.world.edges.get(s + x + ',' + y); return e ? e.type : null; }, [s, x, y]);
  const { B, door, hq } = setup, out = {}, bad = [];
  out.corners = [await scr(B.x0, B.y0), await scr(B.x1 + 1, B.y0), await scr(B.x1 + 1, B.y1 + 1), await scr(B.x0, B.y1 + 1)].map((q) => [Math.round(q.x), Math.round(q.y)]);
  await p.evaluate(() => ZH.startTool({ kind: 'wall', wtype: 'wood' }));
  const confirm = async () => { await p.click('#yesBuild'); await p.waitForTimeout(80); }, cancel = async () => { await p.click('#noBuild'); await p.waitForTimeout(80); };
  const planN = () => p.evaluate(() => { const g = window.ZHG.edgeDraft(); return g ? g.list.length : 0; });
  const bar = () => p.evaluate(() => ({ yes: getComputedStyle(document.getElementById('yesBuild')).display !== 'none' && document.getElementById('yesBuild').textContent, no: document.getElementById('noBuild').textContent }));
  /* a tap just inside the top edge of the build zone plans a piece on that line; nothing is paid until Confirm */
  const tx = B.x0 + 3; const w0 = (await st()).wood; await tap(tx + .5, B.y0 + .1);
  out.planned = { piece: await has('h', tx, B.y0), plan: await planN(), wood: w0 - (await st()).wood, bar: await bar() };
  await confirm(); out.tap = { piece: await has('h', tx, B.y0), wood: w0 - (await st()).wood, plan: await planN() };
  /* tapping the built piece marks it to come down; Confirm takes it away */
  await tap(tx + .5, B.y0 + .1); out.marked = { piece: await has('h', tx, B.y0), plan: await planN() }; await confirm(); out.removed = await has('h', tx, B.y0);
  /* a tap on a planned piece takes it off the plan; Cancel throws a plan away */
  await tap(tx + 1.5, B.y0 + .1); await tap(tx + 1.5, B.y0 + .1); out.untapped = await planN();
  await tap(tx + 1.5, B.y0 + .1); await tap(tx + 2.5, B.y0 + .1); const nb = await bar(); await cancel(); out.cancel = { before: nb.no, plan: await planN(), pieces: (await st()).n, bar: await bar() };
  /* a line far outside the build zone */
  await tap(B.x0 - 4 + .5, B.y0 - 3 + .05); out.outside = await planN();
  /* four drags round the build zone's edge plan a ring; nothing is built until Confirm */
  const cam0 = (await st()).cam;
  out.midTop = await drag({ x: B.x0, y: B.y0 }, { x: B.x1 + 1, y: B.y0 });
  out.camMoved = JSON.stringify((await st()).cam) !== JSON.stringify(cam0);
  await drag({ x: B.x1 + 1, y: B.y1 + 1 }, { x: B.x1 + 1, y: B.y0 }); await drag({ x: B.x1 + 1, y: B.y1 + 1 }, { x: B.x0, y: B.y1 + 1 }); await drag({ x: B.x0, y: B.y1 + 1 }, { x: B.x0, y: B.y0 });   /* the right side drawn from its bottom corner: the top-right corner sits under the side buttons */
  out.ringPlan = { plan: await planN(), built: (await st()).n };
  await confirm();
  out.sides = await p.evaluate((B) => { const E = ZH.world.edges, c = (f) => [...E.values()].filter(f).length; return { top: c((e) => e.s === 'h' && e.y === B.y0), bottom: c((e) => e.s === 'h' && e.y === B.y1 + 1), left: c((e) => e.s === 'v' && e.x === B.x0), right: c((e) => e.s === 'v' && e.x === B.x1 + 1) }; }, B);
  const ring = await st(); out.ring = { n: ring.n, expect: 2 * (B.x1 - B.x0 + 1) + 2 * (B.y1 - B.y0 + 1), sealed: ring.sealed, plan: await planN() };
  /* a run across the HQ's doorway line leaves the doorway out */
  const dl = await p.evaluate(() => { const W = window.ZHWorld, b = ZH.world.buildings[0], t = W.approachTile(b), i = { x: Math.max(b.x, Math.min(b.x + b.w - 1, t.x)), y: Math.max(b.y, Math.min(b.y + b.h - 1, t.y)) }; return W.edgeOf(i.x, i.y, t.x, t.y); });
  if (dl.s === 'h') await drag({ x: dl.x - 1, y: dl.y }, { x: dl.x + 2, y: dl.y }); else await drag({ x: dl.x, y: dl.y - 1 }, { x: dl.x, y: dl.y + 2 });
  await confirm(); out.door = { line: dl, piece: await has(dl.s, dl.x, dl.y), beside: dl.s === 'h' ? await has('h', dl.x + 1, dl.y) : await has('v', dl.x, dl.y + 1) };
  /* a Gate planned on a bottom piece swaps in on Confirm */
  await p.evaluate(() => ZH.startTool({ kind: 'wall', wtype: 'gate' })); const gx = Math.floor((B.x0 + B.x1) / 2); await tap(gx + .5, B.y1 + .9); out.gatePlanned = await has('h', gx, B.y1 + 1); await confirm(); out.gate = await has('h', gx, B.y1 + 1);
  out.sealedWithGate = (await st()).sealed;
  /* Demolish takes a piece away (two taps) */
  await p.evaluate(() => ZH.startTool({ kind: 'demolish' })); await tap(B.x0 + 3.5, B.y1 + .9); await tap(B.x0 + 3.5, B.y1 + .9); out.demolished = await has('h', B.x0 + 3, B.y1 + 1);
  /* too little wood: a run of 6 planned with wood for 2 builds 2 on Confirm, 4 stay planned; leaving the tool throws them away */
  await p.evaluate(() => { ZH.S.wood = 2.4; ZH.startTool({ kind: 'wall', wtype: 'wood' }); }); const n0 = (await st()).n; await drag({ x: B.x0 + 1, y: B.y0 + 3 }, { x: B.x0 + 7, y: B.y0 + 3 }); await confirm();
  out.short = { built: (await st()).n - n0, left: await planN() }; await p.evaluate(() => ZH.endBuildMode()); out.short.afterLeave = await planN();
  console.log(JSON.stringify(out));
  if (out.planned.piece || out.planned.plan !== 1 || out.planned.wood || out.planned.bar.yes !== 'Confirm') bad.push('a tap did not just plan a piece (nothing built, nothing paid, Confirm shown): ' + JSON.stringify(out.planned));
  if (out.tap.piece !== 'wood' || Math.abs(out.tap.wood - 1) > .01 || out.tap.plan) bad.push('Confirm did not build the planned Wood Fence for 1 wood: ' + JSON.stringify(out.tap));
  if (out.marked.piece !== 'wood' || out.marked.plan !== 1 || out.removed) bad.push('tapping a built piece did not mark it, or Confirm did not take it down: ' + JSON.stringify([out.marked, out.removed]));
  if (out.untapped) bad.push('tapping a planned piece again did not take it off the plan');
  if (out.cancel.before !== 'Cancel' || out.cancel.plan || out.cancel.pieces || out.cancel.bar.no !== 'Done') bad.push('Cancel did not throw the plan away: ' + JSON.stringify(out.cancel));
  if (out.outside) bad.push('a line outside the build zone was planned');
  if (!out.midTop || !out.midTop.length || out.midTop.some((q) => q !== 'new' && q !== 'bad')) bad.push('the ghost while dragging was wrong: ' + JSON.stringify(out.midTop));
  if (out.camMoved) bad.push('the view moved while drawing a wall');
  if (out.ringPlan.built || out.ringPlan.plan < out.ring.expect - 2) bad.push('four drags did not plan a ring without building it: ' + JSON.stringify(out.ringPlan));
  if (out.ring.n < out.ring.expect - 2 || !out.ring.sealed || out.ring.plan) bad.push('Confirm did not build the ring and seal the town: ' + JSON.stringify([out.ring, out.sides]));
  if (out.door.piece) bad.push('a wall run built across the HQ doorway');
  if (out.gatePlanned !== 'wood' || out.gate !== 'gate' || !out.sealedWithGate) bad.push('a planned Gate did not swap in on Confirm (or the ring opened): ' + JSON.stringify([out.gatePlanned, out.gate]));
  if (out.demolished) bad.push('the Demolish tool did not take the piece away');
  if (out.short.built !== 2 || out.short.left !== 4 || out.short.afterLeave) bad.push('with wood for 2, a planned run of 6 did not build 2 and keep 4 planned, or leaving did not clear it: ' + JSON.stringify(out.short));
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : `ok: taps and drags only plan (ghosts, nothing paid) and Confirm builds: a piece, a piece taken down, a ring of ${out.ring.n} that seals the town, a Gate swapped in; a tap on a planned piece unplans it; Cancel and leaving the tool throw the plan away; the doorway is left out; a plan builds what the wood allows and keeps the rest; Demolish works; nothing outside the build zone`);
  if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0); })();
