// Capture survivor gear frames from the real game renderer (ZH3D.snap) for the weapon & armor animation board.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const OUT = process.argv[2], DUR = JSON.parse(process.argv[3]);
(async () => { const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 400, height: 400 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', r => { const f = path.join(__dirname, 'node_modules/three', r.request().url().split('three@0.160.0/')[1].split('?')[0]); r.fulfill({ body: fs.readFileSync(f), contentType: 'application/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto('http://localhost:8811/index.html'); await p.waitForFunction(() => window.ZH3D && ZH3D.ready && window.ZHG && ZHG.ITEMS, null, { timeout: 120000 });
  const items = await p.evaluate(() => Object.entries(ZHG.ITEMS).filter(([k, v]) => ['weapon', 'armor', 'head'].includes(v.slot)).map(([k, v]) => [k, v.name, v.slot, v.kind || '']));
  fs.writeFileSync(path.join(OUT, 'items.json'), JSON.stringify(items));
  const WM = { pipe: 'bat', bat: 'bat', crowbar: 'bat', nailbat: 'bat', sledge: 'bat', spear: 'bat', knife: 'axe', machete: 'axe', axe: 'axe', katana: 'axe', pistol: 'pistol', revolver: 'pistol', shotgun: 'rifle', rifle: 'rifle', bow: 'rifle', crossbow: 'rifle', smg: 'ak47', assault: 'ak47', golf: 'bat', shovel: 'bat', roadsign: 'bat', spiked: 'bat', hatchet: 'axe', cleaver: 'axe', magnum: 'pistol' };
  const CL = { bat: 'melee', axe: 'melee', pistol: 'pistol', rifle: 'gun', ak47: 'gun' };
  const jobs = [];   // [cellId, eq, clip]
  const wl = [['fists', 'Fists', 'weapon', '']].concat(items.filter((x) => x[2] === 'weapon'));
  for (const [id] of wl) { const m = WM[id], c = m ? CL[m] : null, hold = c === 'gun' ? 'gun' : c ? 'melee' : null, eq = { weapon: id === 'fists' ? null : id };
    const clips = !c ? ['idle', 'walk', 'run', 'punch'] : c === 'melee' ? ['melee_hold_idle', 'melee_hold_walk', 'melee_swing_a', 'melee_swing_b', 'melee_swing_d'] : [hold + '_hold_idle', hold + '_hold_walk', c === 'pistol' ? 'pistol_fire' : 'gun_fire'];
    for (const cl of clips) jobs.push(['w_' + id + '_' + cl, eq, cl]); }
  for (const [id] of items.filter((x) => x[2] === 'armor')) for (const cl of ['walk', 'melee_swing_a']) jobs.push(['a_' + id + '_' + cl, { armor: id, weapon: cl === 'walk' ? null : 'bat' }, cl]);
  for (const [id] of items.filter((x) => x[2] === 'head')) for (const cl of ['idle', 'walk']) jobs.push(['h_' + id + '_' + cl, { head: id }, cl]);
  fs.writeFileSync(path.join(OUT, 'jobs.json'), JSON.stringify(jobs));
  let n = 0;
  const ONLY = process.argv[4] ? new RegExp(process.argv[4]) : null;
  for (const [cid, eq, cl] of jobs) { if (ONLY && !ONLY.test(cid)) continue;
    const d = DUR[cl] || 1, N = /walk|run/.test(cl) ? 10 : /idle/.test(cl) ? 8 : 14;
    const urls = await p.evaluate(([eq, cl, d, N]) => { const s = { id: 3, name: 'Board', job: 'Guard', eq: { weapon: null, armor: null, head: null, acc: null, ...eq } };
      return ZH3D.snapSeq(s, { frames: Array.from({ length: N }, (_, i) => [cl, d * i / N * .999 + .0001]), half: .78, dy: .74, yaw: -.62, W: 180, H: 216 }); }, [eq, cl, d, N]);
    urls.forEach((u, i) => fs.writeFileSync(path.join(OUT, `${cid}__${String(i).padStart(2, '0')}.png`), Buffer.from(u.split(',')[1], 'base64')));
    if (++n % 20 === 0) console.log(n, '/', jobs.length);
  }
  console.log('done', jobs.length, errs.slice(0, 3)); await b.close(); })();
