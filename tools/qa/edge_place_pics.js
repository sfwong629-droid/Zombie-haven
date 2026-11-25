// tools/qa/edge_place_pics.js — 3D.358 (W269 step 2): pictures for the owner: a fence being dragged along a line (green ghost) next to
// pieces already built, and the finished ring with its gate. Writes runs/features/edge_place_drag.png and edge_place_ring.png.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { expose: 'startTool, endBuildMode, centerOn, cam, edgeDraftAt, edgeDraftPlace' }); await Q.newGame(p); await Q.clearCards(p);
  const kill = () => p.evaluate(() => { document.querySelectorAll('#eventModal button').forEach((x) => x.click()); for (const id of ['eventModal']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; } });
  await p.evaluate(() => { const S = ZH.S, W = window.ZHWorld, world = ZH.world; ZH.ARRIVE.low = ZH.ARRIVE.high = 1e9; S.z.length = 0; S.hour = 12; S.edgeWalls = true; world.walls = new Map(); world.edges = new Map(); W.bump(world); S.wood = 400; S.stone = 100; S.mat = 100; S.seen = S.seen || {};
    const B = W.BUILD; ZH.startTool({ kind: 'wall', wtype: 'wood' });
    const run = (a, z) => { ZH.edgeDraftAt(a, z); ZH.edgeDraftPlace(); };
    run({ x: B.x0, y: B.y0 }, { x: B.x1 + 1, y: B.y0 }); run({ x: B.x0, y: B.y0 }, { x: B.x0, y: B.y1 + 1 }); run({ x: B.x1 + 1, y: B.y0 }, { x: B.x1 + 1, y: B.y1 + 1 });
    /* the bottom side half built, the rest is the drag being drawn */
    run({ x: B.x0, y: B.y1 + 1 }, { x: B.x0 + 4, y: B.y1 + 1 });
    ZH.startTool({ kind: 'wall', wtype: 'gate' }); run({ x: B.x0 + 6, y: B.y1 + 1 }, { x: B.x0 + 7, y: B.y1 + 1 }); ZH.startTool({ kind: 'wall', wtype: 'wood' });
    ZH.edgeDraftAt({ x: B.x0 + 7, y: B.y1 + 1 }, { x: B.x1 + 1, y: B.y1 + 1 });
    ZH.cam.z = 1.0; ZH.centerOn(B.x0 + 7, B.y1 - 1); });
  await kill(); await p.waitForTimeout(2500); await kill(); await Q.shot(p, require('path').join(__dirname, '../../runs/features/edge_place_drag.png'));
  await p.evaluate(() => { const B = window.ZHWorld.BUILD; ZH.edgeDraftPlace(); ZH.startTool({ kind: 'wall', wtype: 'wood' }); ZH.edgeDraftAt({ x: B.x0 + 4, y: B.y1 + 1 }, { x: B.x0 + 6, y: B.y1 + 1 }); ZH.edgeDraftPlace(); ZH.endBuildMode(); ZH.cam.z = .75; ZH.centerOn((B.x0 + B.x1) / 2 + 2, B.y1 - 2); });
  await kill(); await p.waitForTimeout(2500); await kill(); await Q.shot(p, require('path').join(__dirname, '../../runs/features/edge_place_ring.png'));
  console.log(await p.evaluate(() => [ZH.world.edges.size, window.ZHWorld.perimeter(ZH.world).sealed]), p.errs.slice(0, 2)); await b.close(); })();
