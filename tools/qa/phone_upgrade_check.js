// tools/qa/phone_upgrade_check.js — UI chat, 3D.346 (W249). The Upgrade screen in the phone look: Upgrade / Events as a segmented control; the town's
// name, level and level steps; To reach level N with a tick or a cross per row and "have of need"; What it brings; a wide Start button (greyed until
// every row is done); while upgrading a bar with the time left and the renown buttons; Events as one list whose buttons hold the event; rows and
// buttons 44 px+ inside the sheet; the old screen with the look off. Usage: node tools/qa/phone_upgrade_check.js [sizes] [tag]
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
const sizes = (process.argv[2] || 'phone:390x844,phoneN:320x568,phoneL:430x932').split(',').map((s) => { const [n, d] = s.split(':'), [w, h] = d.split('x').map(Number); return { n, w, h }; });
const TAG = process.argv[3] || ''; let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
(async () => {
  const b = await Q.launch();
  for (const z of sizes) {
    console.log(z.n, z.w + 'x' + z.h);
    const p = await Q.page(b, { w: z.w, h: z.h, look: '', expose: 'showUpgrade,BUILD_TAG,OPTS,S,rankConds' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(2000); await Q.clearCards(p);
    if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
    const read = () => p.evaluate(() => { const r = (e) => { const q = e.getBoundingClientRect(); return { x: q.left, r: q.right, w: q.width, h: q.height }; }, ip = r(document.getElementById('infoPanel')), ib = document.getElementById('ib');
      return { up: !!ib.querySelector('.phUp'), head: (ib.querySelector('.phLvHead') || {}).textContent || '', steps: ib.querySelectorAll('.phLvSteps i').length, on: ib.querySelectorAll('.phLvSteps i.on').length, seg: [...ib.querySelectorAll('.phSeg button')].map((e) => ({ ...r(e), t: e.dataset.tab, on: e.classList.contains('on') })),
        secs: [...ib.querySelectorAll('.phSec')].map((e) => e.textContent), rows: [...ib.querySelectorAll('.phR')].map((e) => ({ ...r(e), t: e.textContent })), ticks: ib.querySelectorAll('.phOk').length, bar: (ib.querySelector('.phBar') || {}).textContent || '',
        btns: [...ib.querySelectorAll('button')].filter((e) => e.offsetParent).map((e) => ({ ...r(e), t: e.textContent, id: e.id, dis: e.disabled, ev: e.dataset.ev || '' })), ip, sw: ib.scrollWidth - ib.clientWidth, old: !!ib.querySelector('.tabs'), title: document.getElementById('it').textContent }; });
    const fits = (m, what) => ok(m.rows.every((x) => x.h >= 44 && x.x >= m.ip.x && x.r <= m.ip.r + 1) && m.btns.every((x) => x.h >= 44 && x.r <= m.ip.r + 1) && m.sw <= 1, what + ': rows and buttons 44 px+ inside the sheet ' + JSON.stringify(m.btns.filter((x) => x.h < 44 || x.r > m.ip.r + 1).map((x) => x.t + ' ' + Math.round(x.h))));
    await p.evaluate(() => ZH.showUpgrade('rank')); await p.waitForTimeout(500); await Q.clearCards(p); let m = await read();
    const L = await p.evaluate(() => ZH.S.lvl || 1), nc = await p.evaluate(() => (ZH.rankConds() || []).length);
    ok(m.up && !m.old && m.title === 'Upgrade Town', 'the phone Upgrade screen, no old tab bar'); ok(m.seg.length === 2 && m.seg[0].on && m.seg.every((x) => x.h >= 44), 'Upgrade / Events as a segmented control');
    ok(new RegExp('Level ' + L).test(m.head) && /Era/.test(m.head) && m.steps >= 10 && m.on === L, 'the head says the level and era, one lit step per level (' + m.on + ' of ' + m.steps + ')');
    ok(m.secs.some((t) => t.startsWith('To reach level ' + (L + 1))) && m.secs.includes('Level ' + (L + 1) + ' brings'), 'sections To reach and brings (' + m.secs + ')'); ok(m.ticks === nc, 'a tick or cross for every condition (' + m.ticks + ' of ' + nc + ')');
    const go = m.btns.find((x) => x.id === 'uDo'); ok(go && go.w > m.ip.w * .7 && /Start upgrading/.test(go.t), 'one wide Start button'); fits(m, 'Upgrade');
    await p.screenshot({ path: path.join(out, `phone_upgrade_${z.n}_rank.png`) }); await p.evaluate(() => document.getElementById('ib').scrollTo(0, 9999)); await p.waitForTimeout(200); await p.screenshot({ path: path.join(out, `phone_upgrade_${z.n}_rank2.png`) });
    await p.evaluate(() => { ZH.S.lvUp = { to: (ZH.S.lvl || 1) + 1, total: 3600e3, left: 2400e3 }; ZH.S.ren = 999; ZH.showUpgrade('rank'); }); await p.waitForTimeout(400); m = await read();
    ok(m.secs.some((t) => /^Upgrading to level/.test(t)) && /left/.test(m.bar) && !/%/.test(m.bar), 'while upgrading: a bar with the time left, no percentage (' + m.bar + ')'); ok(m.btns.some((x) => x.id === 'uRushAll' && !x.dis) && !m.btns.some((x) => x.id === 'uDo'), 'Finish now, no Start'); fits(m, 'Upgrading');
    await p.screenshot({ path: path.join(out, `phone_upgrade_${z.n}_going.png`) });
    await p.evaluate(() => document.getElementById('uRushAll').click()); await p.waitForTimeout(400); ok(await p.evaluate(() => !ZH.S.lvUp), 'Finish now finishes the upgrade');
    await p.evaluate(() => { const S = ZH.S; S.lastEventDay = -1; S.food = 99; S.water = 99; S.mat = 99; document.querySelector('#ib .phSeg [data-tab="events"]').click(); }); await p.waitForTimeout(400); await Q.clearCards(p); m = await read();
    ok(m.seg[1].on && m.secs.includes('Events') && m.btns.filter((x) => x.ev).length >= 5, 'Events opens with an event list'); fits(m, 'Events'); await p.screenshot({ path: path.join(out, `phone_upgrade_${z.n}_events.png`) });
    const held0 = await p.evaluate(() => ZH.S.eventsHeld || 0); await p.evaluate(() => document.querySelector('#ib [data-ev="bonfire"]').click()); await p.waitForTimeout(400);
    ok(await p.evaluate((h) => (ZH.S.eventsHeld || 0) === h + 1 && document.querySelector('#ib [data-ev="market"]').disabled, held0), 'a tap holds the event, the others grey out for the day');
    await p.evaluate(() => { ZH.OPTS.look = 'glass'; document.documentElement.classList.remove('phone'); ZH.showUpgrade('rank'); }); await p.waitForTimeout(400); m = await read(); ok(m.old && !m.up, 'look off: the old screen');
    ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close();
  }
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0);
})();
