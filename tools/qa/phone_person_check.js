// tools/qa/phone_person_check.js — UI chat, 3D.340 (W249). A survivor's page in the phone look: poster header, text back link, small close,
// four action tiles, grouped lists (Needs, Today, Orders; Gear slots; Job; About). Usage: node tools/qa/phone_person_check.js [sizes] [tag]
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
const sizes = (process.argv[2] || 'phone:390x844,phoneN:320x568,phoneL:430x932').split(',').map((s) => { const [n, d] = s.split(':'), [w, h] = d.split('x').map(Number); return { n, w, h }; });
const TAG = process.argv[3] || '';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
(async () => {
  const b = await Q.launch();
  for (const z of sizes) {
    console.log(z.n, z.w + 'x' + z.h);
    const p = await Q.page(b, { w: z.w, h: z.h, look: '', expose: 'showSurvivors,unitPanel,OPTS,BUILD_TAG' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(2000); await Q.clearCards(p);
    if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
    await p.evaluate(() => ZH.showSurvivors()); await p.waitForTimeout(400); await Q.clearCards(p);
    await p.evaluate(() => { const s = ZH.S.sv[1]; document.querySelector('#ib [data-sv="' + s.id + '"]').click(); }); await p.waitForTimeout(700); await Q.clearCards(p);
    const tab = async (t) => { await p.evaluate((t) => document.querySelector('#unitExtra [data-tab="' + t + '"]').click(), t); await p.waitForTimeout(350); await Q.clearCards(p); };
    const m = await p.evaluate(() => { const r = (e) => { const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height, r: q.right, b: q.bottom }; }, ip = document.getElementById('infoPanel'), po = document.querySelector('.phPoster'), s = ZH.S.sv[1];
      return { cls: ip.classList.contains('phPerson'), ip: r(ip), po: po && r(po), img: !!(po && po.querySelector('img')), name: po && po.querySelector('h2').textContent, want: s.name, nameSz: po && parseFloat(getComputedStyle(po.querySelector('h2')).fontSize),
        back: r(document.getElementById('pBack')), backT: getComputedStyle(document.getElementById('pBack'), '::after').content, backShown: getComputedStyle(document.getElementById('pBack')).display !== 'none', x: r(document.getElementById('closeInfo')), h3: getComputedStyle(document.getElementById('it')).display,
        tiles: [...document.querySelectorAll('.phActs button')].map((e) => ({ ...r(e), on: e.classList.contains('on'), t: e.textContent })), secs: [...document.querySelectorAll('#unitExtra .phSec')].map((e) => e.textContent),
        bars: [...document.querySelectorAll('#unitExtra .phBar')].map((e) => ({ t: e.querySelector('b').textContent, w: e.querySelector('em').textContent, h: r(e).h })), rows: [...document.querySelectorAll('#unitExtra .phR')].map((e) => r(e)), hp: Math.ceil(s.hp) + '/' + s.max, vw: innerWidth, vh: innerHeight }; });
    ok(m.cls && m.po, 'the page is the phone page with a poster');
    ok(m.po && Math.abs(m.po.x - m.ip.x) <= 3 && Math.abs(m.po.r - m.ip.r) <= 3 && m.po.y - m.ip.y >= 0 && m.po.y - m.ip.y <= 12, 'the poster runs edge to edge, right under the handle ' + [m.po.x - m.ip.x, m.ip.r - m.po.r, m.po.y - m.ip.y].map((v) => v.toFixed(1)));
    ok(m.img, 'the poster shows the picture'); ok(m.name && m.name.includes(m.want), 'the name is on the poster'); ok(m.nameSz >= 26, 'the name is large (' + m.nameSz + ')'); ok(m.h3 === 'none', 'no second title');
    ok(m.backShown && /People/.test(m.backT), 'the back link says People (' + m.backT + ')'); ok(m.back.w >= 44 && m.back.h >= 44 && m.x.w >= 44 && m.x.h >= 44, 'back and close are 44 px+');
    ok(m.back.y >= m.ip.y && m.back.b <= m.po.b && m.x.r <= m.ip.r + 1, 'back and close sit over the poster');
    ok(m.tiles.length === 4 && m.tiles.every((t) => t.h >= 44 && t.w >= 44 && t.x >= 0 && t.r <= m.vw), 'four tiles, 44 px+, on screen'); ok(m.tiles.filter((t) => t.on).length === 1 && m.tiles[0].on, 'Status is the chosen tile');
    ok(['Needs', 'Today', 'Orders'].every((t) => m.secs.includes(t)), 'sections Needs, Today, Orders (' + m.secs + ')');
    ok(m.bars.map((x) => x.t).join() === 'Health,Food,Water,Rest,Mood', 'bars: Health, Food, Water, Rest, Mood'); ok(m.bars[0] && m.bars[0].w === m.hp && !/%/.test(m.bars.map((x) => x.w).join()), 'health is a count, no percentages');
    ok(m.rows.every((q) => q.h >= 44 && q.x >= m.ip.x && q.r <= m.ip.r + 1), 'every row is 44 px+ and inside the sheet');
    ok(!(await p.evaluate(() => document.querySelector('#unitExtra svg circle[stroke-dasharray]'))), 'no rings');
    await p.screenshot({ path: path.join(out, `phone_person_${z.n}_status.png`) });
    const g0 = await p.evaluate(() => { const c = document.getElementById('uChop'), a = c.classList.contains('on'); c.click(); return a; }); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.getElementById('uChop').classList.contains('on')) === !g0, 'the Gather switch switches'); await p.evaluate(() => document.getElementById('uChop').click()); await p.waitForTimeout(300);
    ok(await p.evaluate(() => getComputedStyle(document.getElementById('pBack')).display !== 'none' && /People/.test(getComputedStyle(document.getElementById('pBack'), '::after').content)), 'the back link is still there after the switch');
    await tab('gear'); const g = await p.evaluate(() => ({ slots: [...document.querySelectorAll('#unitExtra [data-slot]')].map((e) => ({ h: e.getBoundingClientRect().h || e.getBoundingClientRect().height, th: !!e.querySelector('.th'), ch: !!e.querySelector('.phChv') })), secs: [...document.querySelectorAll('#unitExtra .phSec')].map((e) => e.textContent) }));
    ok(g.slots.length === 4 && g.slots.every((s) => s.h >= 44 && s.th && s.ch), 'Gear: four slots as rows with a thumbnail and a chevron'); ok(['Wearing', 'Carrying', 'Pet'].every((t) => g.secs.includes(t)), 'Gear sections (' + g.secs + ')');
    await p.screenshot({ path: path.join(out, `phone_person_${z.n}_gear.png`) });
    await p.evaluate(() => document.querySelector('#unitExtra [data-slot="weapon"]').click()); await p.waitForTimeout(300); ok(await p.evaluate(() => !!document.querySelector('#unitExtra [data-gearcancel]')), 'a slot opens its list'); await p.evaluate(() => document.querySelector('#unitExtra [data-gearcancel]').click()); await p.waitForTimeout(300);
    await tab('skills'); ok(await p.evaluate(() => !!document.getElementById('chgJob') && !!document.getElementById('uJobs')), 'Job: the job row and All jobs'); await p.screenshot({ path: path.join(out, `phone_person_${z.n}_job.png`) });
    await p.evaluate(() => document.getElementById('chgJob').click()); await p.waitForTimeout(300); ok(await p.evaluate(() => document.querySelectorAll('#unitExtra [data-job]').length >= 5 && [...document.querySelectorAll('#unitExtra [data-job]')].every((e) => e.getBoundingClientRect().height >= 44)), 'Change job lists the jobs, 44 px+'); await p.evaluate(() => document.getElementById('chgCancel').click()); await p.waitForTimeout(300);
    await tab('about'); ok(await p.evaluate(() => document.querySelectorAll('#unitExtra .statC').length === 6), 'About: the six stats'); await p.screenshot({ path: path.join(out, `phone_person_${z.n}_about.png`) });
    await tab('stats');
    await p.evaluate(() => { ZH.OPTS.pics = false; ZH.unitPanel(ZH.S.sv[1]); }); await p.waitForTimeout(400); ok(await p.evaluate(() => { const po = document.querySelector('.phPoster'); return !po.querySelector('img') && po.querySelector('b').textContent === ZH.S.sv[1].name[0].toUpperCase(); }), 'pictures off: the first letter'); await p.screenshot({ path: path.join(out, `phone_person_${z.n}_letter.png`) });
    await p.evaluate(() => { ZH.OPTS.pics = true; ZH.showSurvivors(); }); await p.waitForTimeout(400);
    ok(await p.evaluate(() => !document.getElementById('infoPanel').classList.contains('phPerson') && getComputedStyle(document.getElementById('it')).display !== 'none' && document.getElementById('it').textContent === 'People'), 'back on People the sheet has its title again');
    await p.evaluate(() => { document.querySelector('#ib [data-sv]').click(); }); await p.waitForTimeout(500); await p.evaluate(() => document.getElementById('pBack').click()); await p.waitForTimeout(400); ok(await p.evaluate(() => !!document.querySelector('#ib .phList')), 'the back link returns to People');
    await p.evaluate(() => { document.querySelector('#ib [data-sv]').click(); }); await p.waitForTimeout(400); await p.evaluate(() => document.getElementById('closeInfo').click()); await p.waitForTimeout(300); ok(await p.evaluate(() => !document.getElementById('infoPanel').classList.contains('show')), 'close closes the sheet');
    await p.evaluate(() => { ZH.OPTS.look = 'glass'; }); const old = await p.evaluate(() => { document.documentElement.classList.remove('phone'); ZH.unitPanel(ZH.S.sv[1]); return !document.querySelector('.phPoster') && !!document.querySelector('#unitExtra .tabs'); }); ok(old, 'look off: the old page');
    ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close();
  }
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0);
})();
