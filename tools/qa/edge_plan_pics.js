// tools/qa/edge_plan_pics.js — 3D.361 (W269, owner: "place down and then finalize it with a confirm button"): pictures for the owner:
// a ring of fence planned round the town (ghosts on the lines, the bar with its cost and Confirm), then the same ring after Confirm.
// Writes runs/features/edge_plan_ghosts.png and edge_plan_built.png.
const Q = require('./lib'), path = require('path');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { expose: 'startTool, endBuildMode, centerOn, cam, edgeDraftAt, edgeDraftToPlan, edgePlanBar' }); await Q.newGame(p); await Q.clearCards(p);
  const kill = () => p.evaluate(() => { document.querySelectorAll('#eventModal button').forEach((x) => x.click()); const e = document.getElementById('eventModal'); if (e) e.style.display = 'none'; });
  await p.evaluate(() => { const S = ZH.S, W = window.ZHWorld, world = ZH.world; ZH.ARRIVE.low = ZH.ARRIVE.high = 1e9; S.z.length = 0; S.hour = 12; S.edgeWalls = true; world.walls = new Map(); world.edges = new Map(); W.bump(world); S.wood = 60; S.stone = 100; S.mat = 100;
    const B = W.BUILD; ZH.startTool({ kind: 'wall', wtype: 'wood' });
    const run = (a, z) => { ZH.edgeDraftAt(a, z); ZH.edgeDraftToPlan(); };
    run({ x: B.x0, y: B.y0 }, { x: B.x1 + 1, y: B.y0 }); run({ x: B.x0, y: B.y0 }, { x: B.x0, y: B.y1 + 1 }); run({ x: B.x1 + 1, y: B.y0 }, { x: B.x1 + 1, y: B.y1 + 1 }); run({ x: B.x0, y: B.y1 + 1 }, { x: B.x1 + 1, y: B.y1 + 1 });
    ZH.cam.z = .62; ZH.centerOn((B.x0 + B.x1) / 2 + 1.5, (B.y0 + B.y1) / 2 + 2); });
  await kill(); await p.waitForTimeout(2500); await kill(); await Q.shot(p, path.join(__dirname, '../../runs/features/edge_plan_ghosts.png'));
  await p.click('#yesBuild'); await p.evaluate(() => ZH.endBuildMode()); await kill(); await p.waitForTimeout(2500); await kill(); await Q.shot(p, path.join(__dirname, '../../runs/features/edge_plan_built.png'));
  console.log(await p.evaluate(() => [ZH.world.edges.size, window.ZHWorld.perimeter(ZH.world).sealed]), p.errs.slice(0, 2)); await b.close(); })();
