// Renders a full level-15 town in the real game (3D) and saves screenshots. Serve the repo on :8799, run from a folder with three@0.160.0 in node_modules:
//   node mapshot.js 390 844 phone 3
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '../mapstudy'); const VW = +process.argv[2] || 390, VH = +process.argv[3] || 844, TAG = process.argv[4] || 'phone', TERR = +(process.argv[5] ?? 3);
(async () => { const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', r => { const f = path.join(__dirname, 'node_modules/three', r.request().url().split('three@0.160.0/')[1].split('?')[0]); r.fulfill({ body: fs.readFileSync(f), contentType: 'application/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto('http://localhost:8799/index.html?3d=1&play&test=fullmap2'); await p.waitForTimeout(16000);
  const info = await p.evaluate((TERR) => {
    let x = 7; const rnd = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
    const S = ZH.S, W = ZH.world, Wd = ZH.Wd; S.terr = TERR; Wd.setTerritory(TERR); S.rank = 5;
    const B = Wd.BUILD; W.buildings = W.buildings.filter((q) => q.type.startsWith('hq')); W.sites = []; S.sites = [];
    if (W.buildings[0]) W.buildings[0].type = 'hq3';
    W.roads = new Set(); S.nodes = S.nodes || {};
    for (let y = 0; y < Wd.ROWS; y++) for (let xx = 0; xx < Wd.COLS; xx++) if (xx >= B.x0 && xx <= B.x1 && y >= B.y0 && y <= B.y1) S.nodes[xx + ',' + y] = { left: 0 };
    const list = { stonehouse: 9, cabin: 3, irrig: 4, field: 2, well: 3, mess: 1, canteen: 1, hospital: 1, clinic: 1, warehouse: 2, storage: 1, workshop: 2, scrapyard: 2, lumber: 2, quarry: 2, generator: 2, radio: 1, gym: 1, library: 1, lounge: 1, range: 1, track: 1, sparring: 1, armory: 1, barracks: 1, bonfire: 2 };
    const all = []; for (const [t, n] of Object.entries(list)) for (let i = 0; i < n; i++) all.push(t);
    all.sort((a, b) => Wd.DEFS[b].w * Wd.DEFS[b].h - Wd.DEFS[a].w * Wd.DEFS[a].h);
    const cx = (B.x0 + B.x1) / 2, cy = (B.y0 + B.y1) / 2; let placed = 0, miss = [];
    // a player's town: buildings grow out from the centre with a tile of room around most of them
    const spots = []; for (let y = B.y0; y <= B.y1; y++) for (let xx = B.x0; xx <= B.x1; xx++) spots.push([xx, y, Math.hypot(xx - cx, (y - cy) * 1.1) + rnd() * 2.5]);
    spots.sort((a, b) => a[2] - b[2]);
    const free = (xx, y, D) => { for (let yy = y - 1; yy <= y + D.h; yy++) for (let x2 = xx - 1; x2 <= xx + D.w; x2++) if (Wd.buildingAt(W, x2, yy)) return false; return true; };
    for (const t of all) { const D = Wd.DEFS[t]; let ok = false;
      for (const pass of [0, 1]) { for (const [xx, y] of spots) if (Wd.placementCheck(W, xx, y, D, null).ok && (pass || free(xx, y, D))) { W.buildings.push({ type: t, x: xx, y, rot: (rnd() * 2) | 0 ? 0 : 1, w: D.w, h: D.h, q: D.q, a: D.a, staff: null }); Wd.bump(W); ok = true; placed++; break; } if (ok) break; }
      if (!ok) miss.push(t); }
    const Z = Wd.WALLZONE; W.walls = new Map(); let wn = 0; const gx = Math.round((Z.x0 + Z.x1) / 2);
    for (let xx = Z.x0; xx <= Z.x1; xx++) for (const y of [Z.y0, Z.y1]) { W.walls.set(xx + ',' + y, { x: xx, y, type: xx === gx ? 'gate' : 'metal', hp: 240, max: 240 }); wn++; }
    for (let y = Z.y0 + 1; y < Z.y1; y++) for (const xx of [Z.x0, Z.x1]) { W.walls.set(xx + ',' + y, { x: xx, y, type: 'metal', hp: 240, max: 240 }); wn++; }
    Wd.bump(W); let fp = 0, minx = 99, maxx = 0, miny = 99, maxy = 0; for (const q of W.buildings) { fp += q.w * q.h; minx = Math.min(minx, q.x); maxx = Math.max(maxx, q.x + q.w - 1); miny = Math.min(miny, q.y); maxy = Math.max(maxy, q.y + q.h - 1); }
    S.hour = 13; document.querySelectorAll('#eventModal,.modal').forEach((e) => e.style.display = 'none');
    return { placed, miss, fp, used: [minx, miny, maxx, maxy], walls: wn, terr: [B.x0, B.y0, B.x1, B.y1], zone: [Z.x0, Z.y0, Z.x1, Z.y1], map: [Wd.COLS, Wd.ROWS], outside: { west: Z.x0, north: Z.y0, east: Wd.COLS - 1 - Z.x1, south: Wd.ROWS - 1 - Z.y1 } };
  }, TERR);
  console.log(JSON.stringify(info));
  const shot = async (name, z, wx, wy) => { await p.evaluate(([z, wx, wy]) => { document.querySelectorAll('#eventModal,.modal').forEach((e) => e.style.display = 'none'); ZH.centerOn(wx, wy, z); }, [z, wx, wy]); await p.waitForTimeout(6000); await p.screenshot({ path: path.join(OUT, `${TAG}_${name}.png`), timeout: 240000 }); };
  const c = [(info.zone[0] + info.zone[2]) / 2, (info.zone[1] + info.zone[3]) / 2];
  await p.waitForTimeout(8000);
  await shot('day_035', .35, c[0], c[1]);
  if (TAG === 'phone') await shot('day_070', .7, c[0], c[1]);
  await p.evaluate(() => { const S = ZH.S; S.hour = 22; S.z = []; ZH.spawnBoss(); for (let i = 0; i < 30; i++) ZH.spawn(); for (let k = 0; k < 600; k += 60) ZH.step(60); });
  const zs = await p.evaluate(() => ZH.S.z.map((z) => [Math.round(z.w.x * 10) / 10, Math.round(z.w.y * 10) / 10, z.type]));
  console.log('zombies', zs.length, JSON.stringify(zs.filter((z) => z[2] === 'boss')));
  await shot('night_035', .35, c[0], c[1]);
  const bz = zs.find((z) => z[2] === 'boss'); if (bz && TAG === 'phone') await shot('night_boss_100', 1.0, bz[0], bz[1]);
  console.log(errs.slice(0, 5)); await b.close(); })();
