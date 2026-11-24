// tools/qa/phone_bpage_check.js — UI chat, 3D.344 (W249). A building's own page in the phone look: the picture, the note, grouped lists (To build with Cost
// and Size, Each day, What it does), one wide Build button that starts placing; a locked building says what it needs and has no button; the old page
// with the look off. Usage: node tools/qa/phone_bpage_check.js [sizes] [tag]
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
const sizes = (process.argv[2] || 'phone:390x844,phoneN:320x568,phoneL:430x932').split(',').map((s) => { const [n, d] = s.split(':'), [w, h] = d.split('x').map(Number); return { n, w, h }; });
const TAG = process.argv[3] || ''; let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
(async () => {
  const b = await Q.launch();
  for (const z of sizes) {
    console.log(z.n, z.w + 'x' + z.h);
    const p = await Q.page(b, { w: z.w, h: z.h, look: '', expose: 'showBuildPhone,buildDetail,BUILD_TAG,OPTS,sel' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(2000); await Q.clearCards(p);
    if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
    const read = () => p.evaluate(() => { const r = (e) => { const q = e.getBoundingClientRect(); return { x: q.left, r: q.right, w: q.width, h: q.height }; }, ip = r(document.getElementById('infoPanel')), ib = document.getElementById('ib'), go = document.getElementById('bdGo');
      return { title: document.getElementById('it').textContent, hero: !!ib.querySelector('.phHero img'), note: (ib.querySelector('.phNote') || {}).textContent || '', secs: [...ib.querySelectorAll('.phSec')].map((e) => e.textContent), rows: [...ib.querySelectorAll('.phR')].map((e) => ({ ...r(e), t: e.textContent })), ip, go: go && { ...r(go), t: go.textContent }, lock: (ib.querySelector('.phLock') || {}).textContent || '', sw: ib.scrollWidth - ib.clientWidth, old: !!ib.querySelector('.bdetail') }; });
    await p.evaluate(() => { ZH.showBuildPhone('food'); document.querySelector('#bMain [data-b="farm"]').click(); }); await p.waitForTimeout(600); await Q.clearCards(p);
    let m = await read(); ok(m.title === 'Garden Plot' && m.hero && m.note.length > 10 && !m.old, 'Garden Plot: the picture and the note, not the old page');
    ok(['To build', 'Each day', 'What it does'].every((t) => m.secs.includes(t)), 'sections To build, Each day, What it does (' + m.secs + ')'); ok(m.rows.some((x) => /^Cost/.test(x.t)) && m.rows.some((x) => /^Size/.test(x.t)) && m.rows.some((x) => /^Makes/.test(x.t)), 'rows for Cost, Size and Makes');
    ok(m.rows.every((x) => x.h >= 44 && x.x >= m.ip.x && x.r <= m.ip.r + 1) && m.sw <= 1, 'every row 44 px+ and inside the sheet'); ok(m.go && m.go.h >= 44 && m.go.w > m.ip.w * .7 && /Build|Place site/.test(m.go.t), 'one wide Build button');
    await p.screenshot({ path: path.join(out, `phone_bpage_${z.n}_farm.png`) });
    await p.evaluate(() => document.getElementById('pBack').click()); await p.waitForTimeout(400); ok(await p.evaluate(() => document.getElementById('it').textContent === 'Build'), 'back returns to Build');
    await p.evaluate(() => document.querySelector('#bMain [data-b="farm"]').click()); await p.waitForTimeout(400); await p.evaluate(() => document.getElementById('bdGo').click()); await p.waitForTimeout(500);
    ok(await p.evaluate(() => !document.getElementById('infoPanel').classList.contains('show') && !!(ZH.sel && (ZH.sel.type || ZH.sel.kind))), 'Build starts placing');
    await p.evaluate(() => { ZH.showBuildPhone('food'); document.querySelector('#bMain [data-b="greenhouse"]').click(); }); await p.waitForTimeout(600); await Q.clearCards(p);
    m = await read(); ok(!m.go && /^Needs /.test(m.lock) && !/Needs Needs/.test(m.lock), 'a locked building says what it needs and has no Build button (' + m.lock + ')'); await p.screenshot({ path: path.join(out, `phone_bpage_${z.n}_locked.png`) });
    await p.evaluate(() => { ZH.OPTS.look = 'glass'; document.documentElement.classList.remove('phone'); ZH.buildDetail('farm'); }); await p.waitForTimeout(400); m = await read(); ok(m.old && !m.hero, 'look off: the old page');
    ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close();
  }
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0);
})();
