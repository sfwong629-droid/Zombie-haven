// tools/qa/phone_town_check.js — UI chat, 3D.342 (W249). Town in the phone look: the four parts as a segmented control, the four bars (Food, Water, Beds,
// Walls; words, never rings or percentages), what would fill them (rows that open the right building), grouped lists on every part, the old controls
// still working (policy, upgrade, auto-throw, retreat, save), and the old tabbed panel with the look off. Usage: node tools/qa/phone_town_check.js [sizes] [tag]
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
const sizes = (process.argv[2] || 'phone:390x844,phoneN:320x568,phoneL:430x932').split(',').map((s) => { const [n, d] = s.split(':'), [w, h] = d.split('x').map(Number); return { n, w, h }; });
const TAG = process.argv[3] || ''; let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
(async () => {
  const b = await Q.launch();
  for (const z of sizes) {
    console.log(z.n, z.w + 'x' + z.h);
    const p = await Q.page(b, { w: z.w, h: z.h, look: '', expose: 'showTown,BUILD_TAG,OPTS,policy,sel,unhoused,campCap' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(2000); await Q.clearCards(p);
    if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
    await p.evaluate(() => { ZH.S.food = 6; ZH.S.water = 3; ZH.showTown('overview'); }); await p.waitForTimeout(700); await Q.clearCards(p);
    const fit = () => p.evaluate(() => { const ip = document.getElementById('infoPanel').getBoundingClientRect(), ib = document.getElementById('ib'); return { sw: ib.scrollWidth - ib.clientWidth, rows: [...ib.querySelectorAll('.phR')].map((e) => e.getBoundingClientRect()).every((q) => q.height >= 44 && q.left >= ip.left && q.right <= ip.right + 1), n: ib.querySelectorAll('.phR').length }; });
    const m = await p.evaluate(() => { const r = (e) => { const q = e.getBoundingClientRect(); return { w: q.width, h: q.height }; };
      return { title: document.getElementById('it').textContent, seg: [...document.querySelectorAll('.phSeg button')].map((e) => ({ ...r(e), on: e.classList.contains('on'), t: e.textContent })), tabs: !!document.querySelector('#ib .tabs'),
        bars: [...document.querySelectorAll('#ib .phCard:first-of-type .phBar, #ib .phTown > .phCard .phBar')].slice(0, 4).map((e) => ({ t: e.querySelector('b').textContent, w: e.querySelector('em').textContent, v: parseFloat(e.querySelector('.phBarT i').style.width) })),
        fills: [...document.querySelectorAll('#ib [data-fill]')].map((e) => e.dataset.fill), secs: [...document.querySelectorAll('#ib .phSec')].map((e) => e.textContent), rough: Math.max(0, ZH.unhoused().length - ZH.campCap()), rings: !!document.querySelector('#ib svg circle[stroke-dasharray]') }; });
    ok(m.title === 'Town' && !m.tabs, 'the Town sheet, no old tab row'); ok(m.seg.length === 4 && m.seg.every((s) => s.h >= 44 && s.w >= 44) && m.seg[0].on && m.seg.map((s) => s.t).join() === 'Haven,Defense,People,More', 'four parts as a segmented control, 44 px+, Haven chosen');
    ok(m.bars.map((x) => x.t).join() === 'Food,Water,Beds,Walls', 'bars: Food, Water, Beds, Walls (' + m.bars.map((x) => x.t) + ')'); ok(m.bars.every((x) => x.w && !/%/.test(x.w) && x.v >= 0 && x.v <= 100) && !m.rings, 'each bar has words, no percentages, no rings (' + m.bars.map((x) => x.w).join(' | ') + ')');
    ok(/day/.test(m.bars[1].w) && m.fills.includes('barrel'), 'water short: the bar says so and Build a Rain Barrel is offered'); ok(m.rough > 0 || /Everyone/.test(m.bars[2].w), 'beds: everyone has one when nobody sleeps rough');
    ok(['What would fill the bars', 'Level', 'Town policy', 'Each day'].every((t) => m.secs.includes(t)), 'sections (' + m.secs + ')');
    let f = await fit(); ok(f.rows && f.sw <= 1 && f.n >= 10, 'Haven: every row 44 px+, inside the sheet, no sideways scroll');
    await p.screenshot({ path: path.join(out, `phone_town_${z.n}_haven.png`) });
    await p.evaluate(() => document.querySelector('#ib [data-pol="defend"]').click()); await p.waitForTimeout(400); ok(await p.evaluate(() => ZH.policy() === 'defend' && !!document.querySelector('#ib [data-pol="defend"] .phTick')), 'a policy row sets the policy and gets the tick'); await p.evaluate(() => document.querySelector('#ib [data-pol="balanced"]').click()); await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelector('#ib [data-fill="barrel"]').click()); await p.waitForTimeout(500); ok(await p.evaluate(() => !!document.getElementById('bdGo') && document.getElementById('it').textContent === 'Rain Barrel'), 'Build a Rain Barrel opens the Rain Barrel\'s page');
    await p.evaluate(() => document.getElementById('pBack').click()); await p.waitForTimeout(500); ok(await p.evaluate(() => document.getElementById('it').textContent === 'Town'), 'back returns to Town');
    await p.evaluate(() => document.getElementById('tUpg').click()); await p.waitForTimeout(500); ok(await p.evaluate(() => document.getElementById('it').textContent !== 'Town' && document.getElementById('infoPanel').classList.contains('show')), 'Upgrade the Haven opens the upgrade screen');
    for (const [t, want] of [['defense', 'Walls'], ['people', 'Pets'], ['more', 'Game']]) {
      await p.evaluate(() => ZH.showTown()); await p.waitForTimeout(300); await Q.clearCards(p); await p.evaluate((t) => document.querySelector('.phSeg [data-tab="' + t + '"]').click(), t); await p.waitForTimeout(500); await Q.clearCards(p);
      const s = await p.evaluate(() => ({ on: document.querySelector('.phSeg .on').dataset.tab, secs: [...document.querySelectorAll('#ib .phSec')].map((e) => e.textContent) })); f = await fit();
      ok(s.on === t && s.secs.includes(want), `${t}: opens, with ${want}`); ok(f.rows && f.sw <= 1, `${t}: every row 44 px+, inside the sheet, no sideways scroll`); await p.screenshot({ path: path.join(out, `phone_town_${z.n}_${t}.png`) });
      if (t === 'defense') { const a0 = await p.evaluate(() => { const e = document.getElementById('tExAuto'), a = e.classList.contains('on'); e.click(); return a; }); await p.waitForTimeout(300); ok(await p.evaluate(() => document.getElementById('tExAuto').classList.contains('on')) === !a0, 'the auto-throw switch switches'); await p.evaluate(() => document.getElementById('tExAuto').click()); await p.waitForTimeout(300);
        ok(await p.evaluate(() => { const r = document.getElementById('retreatR'); r.value = 50; r.oninput({ target: r }); return ZH.S.retreat === 50 && document.getElementById('retreatV').textContent === '50%'; }), 'the retreat slider sets the retreat'); ok(await p.evaluate(() => !!document.getElementById('shPrac')), 'Stronghold practice is still there'); }
      if (t === 'more') ok(await p.evaluate(() => ['tSave', 'tLog', 'tTitle'].every((i) => { const e = document.getElementById(i); return e && e.getBoundingClientRect().height >= 44; })), 'Save now, Event log and Title screen are rows, 44 px+');
    }
    await p.evaluate(() => { ZH.OPTS.look = 'glass'; document.documentElement.classList.remove('phone'); ZH.showTown('overview'); }); await p.waitForTimeout(400); ok(await p.evaluate(() => !!document.querySelector('#ib .tabs') && !document.querySelector('#ib .phTown')), 'look off: the old tabbed panel');
    ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close();
  }
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0);
})();
