// tools/qa/edge_place_check.js — 3D.358 (W269 step 2): placing walls and gates on the lines between tiles, with real taps and drags on
// the game's canvas. In a town on lines with the wall tool: a tap puts a piece on the nearest line, a second and third tap take it away
// (half back); a one-finger drag along the build zone's edge draws a straight run (a ghost while dragging) and builds it on release, and
// the view does not move; four drags close a ring round the town; a building's doorway is skipped by a wall run; a Gate tapped on a piece
// swaps in; with too little wood a run builds what it can; a line outside the build zone is refused; the Demolish tool takes a piece away.
// Pictures: runs/features/edge_place_drag.png (mid-drag) and edge_place_ring.png (the ring built).
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
  /* a tap just inside the top edge of the build zone, a third of the way along: the line on the edge */
  const tx = B.x0 + 3; const w0 = (await st()).wood; await tap(tx + .5, B.y0 + .1);
  out.tap = { piece: await has('h', tx, B.y0), wood: w0 - (await st()).wood };
  await tap(tx + .5, B.y0 + .1); out.firstAgain = await has('h', tx, B.y0); await tap(tx + .5, B.y0 + .1); out.removed = await has('h', tx, B.y0); out.refund = (await st()).wood - (w0 - out.tap.wood);
  /* a line far outside the build zone */
  await tap(B.x0 - 4 + .5, B.y0 - 3 + .05); out.outside = (await st()).n;
  /* four drags round the build zone's edge: top, right, bottom, left (the top one photographed mid-drag) */
  const cam0 = (await st()).cam;
  out.midTop = await drag({ x: B.x0, y: B.y0 }, { x: B.x1 + 1, y: B.y0 }, path.join(__dirname, '../../runs/features/edge_place_drag.png'));
  out.camMoved = JSON.stringify((await st()).cam) !== JSON.stringify(cam0);
  await drag({ x: B.x1 + 1, y: B.y1 + 1 }, { x: B.x1 + 1, y: B.y0 }); await drag({ x: B.x1 + 1, y: B.y1 + 1 }, { x: B.x0, y: B.y1 + 1 });   /* the right side drawn from its bottom corner: the top-right corner sits under the side buttons */ await drag({ x: B.x0, y: B.y1 + 1 }, { x: B.x0, y: B.y0 });
  out.sides = await p.evaluate((B) => { const E = ZH.world.edges, c = (f) => [...E.values()].filter(f).length; return { top: c((e) => e.s === 'h' && e.y === B.y0), bottom: c((e) => e.s === 'h' && e.y === B.y1 + 1), left: c((e) => e.s === 'v' && e.x === B.x0), right: c((e) => e.s === 'v' && e.x === B.x1 + 1) }; }, B);
  const elAt = await p.evaluate(([a, b]) => [document.elementFromPoint(a[0], a[1]), document.elementFromPoint(b[0], b[1])].map((e) => e && (e.id || e.className || e.tagName)), [out.corners[2], out.corners[3]]); out.elAt = elAt;
  const ring = await st(); out.ring = { n: ring.n, expect: 2 * (B.x1 - B.x0 + 1) + 2 * (B.y1 - B.y0 + 1), sealed: ring.sealed };
  /* a run across the HQ's doorway line skips it */
  const dl = await p.evaluate((h) => { const W = window.ZHWorld, b = ZH.world.buildings[0], t = W.approachTile(b), i = { x: Math.max(b.x, Math.min(b.x + b.w - 1, t.x)), y: Math.max(b.y, Math.min(b.y + b.h - 1, t.y)) }; return W.edgeOf(i.x, i.y, t.x, t.y); }, hq);
  if (dl.s === 'h') await drag({ x: dl.x - 1, y: dl.y }, { x: dl.x + 2, y: dl.y }); else await drag({ x: dl.x, y: dl.y - 1 }, { x: dl.x, y: dl.y + 2 });
  out.door = { line: dl, piece: await has(dl.s, dl.x, dl.y), beside: dl.s === 'h' ? await has('h', dl.x + 1, dl.y) : await has('v', dl.x, dl.y + 1) };
  /* a Gate tapped on a bottom piece swaps in */
  await p.evaluate(() => ZH.startTool({ kind: 'wall', wtype: 'gate' })); const gx = Math.floor((B.x0 + B.x1) / 2); await tap(gx + .5, B.y1 + .9); out.gate = await has('h', gx, B.y1 + 1);
  out.sealedWithGate = (await st()).sealed;
  /* Demolish takes a piece away (two taps) */
  await p.evaluate(() => ZH.startTool({ kind: 'demolish' })); await tap(B.x0 + 3.5, B.y1 + .9); await tap(B.x0 + 3.5, B.y1 + .9); out.demolished = await has('h', B.x0 + 3, B.y1 + 1);
  /* too little wood: a run of 6 with wood for 2 */
  await p.evaluate(() => { ZH.S.wood = 2.4; ZH.startTool({ kind: 'wall', wtype: 'wood' }); }); const n0 = (await st()).n; await drag({ x: B.x0 + 1, y: B.y0 + 3 }, { x: B.x0 + 7, y: B.y0 + 3 }); out.short = (await st()).n - n0;
  /* the ring photographed with the wall tool closed */
  await p.evaluate(() => { ZH.S.wood = 400; ZH.endBuildMode(); }); await p.waitForTimeout(800); await Q.shot(p, path.join(__dirname, '../../runs/features/edge_place_ring.png'));
  console.log(JSON.stringify(out));
  if (out.tap.piece !== 'wood' || Math.abs(out.tap.wood - 1) > .01) bad.push('a tap did not put a Wood Fence on the line (1 wood): ' + JSON.stringify(out.tap));
  if (out.firstAgain !== 'wood' || out.removed) bad.push('tapping the piece again did not ask first and then take it away');
  if (out.refund < -.01 || out.refund > .51) bad.push('removing it gave back the wrong amount: ' + out.refund);   /* half of 1 wood rounds down, as for wall tiles */
  if (out.outside) bad.push('a wall was put on a line outside the build zone');
  if (!out.midTop || !out.midTop.length || out.midTop.some((s) => s !== 'new' && s !== 'bad')) bad.push('the ghost while dragging was wrong: ' + JSON.stringify(out.midTop));
  if (out.camMoved) bad.push('the view moved while drawing a wall');
  if (out.ring.n < out.ring.expect - 2 || !out.ring.sealed) bad.push('four drags did not close a ring round the town: ' + JSON.stringify(out.ring));
  if (out.door.piece) bad.push('a wall run built across the HQ doorway');
  if (out.gate !== 'gate' || !out.sealedWithGate) bad.push('a Gate tapped on a piece did not swap in (or the ring opened): ' + out.gate);
  if (out.demolished) bad.push('the Demolish tool did not take the piece away');
  if (out.short !== 2) bad.push('with wood for 2, a run of 6 built ' + out.short);
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : `ok: a tap puts a piece on the nearest line and taps again take it away (half back); drags draw straight runs with a ghost and the view stays still; four drags closed a ring of ${out.ring.n} pieces; the doorway is skipped; a Gate swaps in; Demolish works; a run stops when the wood runs out; nothing outside the build zone`);
  if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0); })();
