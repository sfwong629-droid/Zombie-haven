const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'); const OUT = process.argv[2];
(async () => { const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 400, height: 400 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  await p.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', r => { const f = path.join(__dirname, 'node_modules/three', r.request().url().split('three@0.160.0/')[1].split('?')[0]); r.fulfill({ body: fs.readFileSync(f), contentType: 'application/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto('http://localhost:8811/index.html'); await p.waitForFunction(() => window.ZH3D && ZH3D.ready, null, { timeout: 120000 });
  const DUR = { walk: .833, melee_swing_a: 1.067 };
  for (const id of JSON.parse(process.argv[3])) for (const mode of ['', 'rigid', 'shell']) for (const cl of ['walk', 'melee_swing_a']) {
    const N = cl === 'walk' ? 10 : 14, urls = await p.evaluate(([id, mode, cl, d, N]) => ZH3D.snapSeq({ id: 3, name: 'B', job: 'Guard', eq: { armor: id, weapon: cl === 'walk' ? null : 'bat' } }, { cloth: mode, frames: Array.from({ length: N }, (_, i) => [cl, d * i / N * .999 + .0001]), half: .78, dy: .74, yaw: -.62, W: 180, H: 216 }), [id, mode, cl, DUR[cl], N]);
    urls.forEach((u, i) => fs.writeFileSync(path.join(OUT, `c_${id}_${mode || 'now'}_${cl}__${String(i).padStart(2, '0')}.png`), Buffer.from(u.split(',')[1], 'base64'))); }
  console.log('done', errs.slice(0, 5)); await b.close(); })();
