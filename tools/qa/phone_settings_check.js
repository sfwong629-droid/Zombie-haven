// tools/qa/phone_settings_check.js — UI chat, 3D.343 (W249). More and Settings in the phone look: grouped lists with a coloured sign per row, switches that
// switch (and a tap on the words flips them), Day music cycles, Save saves, the rows open what they did before, back and Resume work, and the old lists
// with the look off. Usage: node tools/qa/phone_settings_check.js [sizes] [tag]
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
const sizes = (process.argv[2] || 'phone:390x844,phoneN:320x568,phoneL:430x932').split(',').map((s) => { const [n, d] = s.split(':'), [w, h] = d.split('x').map(Number); return { n, w, h }; });
const TAG = process.argv[3] || ''; let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
(async () => {
  const b = await Q.launch();
  for (const z of sizes) {
    console.log(z.n, z.w + 'x' + z.h);
    const p = await Q.page(b, { w: z.w, h: z.h, look: '', expose: 'showMore,showSettings,BUILD_TAG,OPTS' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(2000); await Q.clearCards(p);
    if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
    const fit = () => p.evaluate(() => { const ip = document.getElementById('infoPanel').getBoundingClientRect(), ib = document.getElementById('ib'), rs = [...ib.querySelectorAll('.phR')]; return { n: rs.length, ok: rs.map((e) => e.getBoundingClientRect()).every((q) => q.height >= 44 && q.left >= ip.left && q.right <= ip.right + 1), sw: ib.scrollWidth - ib.clientWidth, ic: rs.every((e) => !!e.querySelector('.phIc')), chv: [...ib.querySelectorAll('.phChv')].every((e) => ip.right - e.getBoundingClientRect().right < 40) }; });
    const title = () => p.evaluate(() => document.getElementById('it').textContent);
    await p.evaluate(() => ZH.showMore()); await p.waitForTimeout(500); await Q.clearCards(p);
    /* 3D.389: More is a home screen of app icons (Messages, Moth FM, Jobs, Guide, Event log, Settings), four to a row */
    const g = await p.evaluate(() => { const ip = document.getElementById('infoPanel').getBoundingClientRect(), A = [...document.querySelectorAll('#ib .moApp')];
      return { ids: A.map((a) => a.id).join(), lb: A.map((a) => a.innerText.trim()).join(), ok: A.every((a) => { const q = a.getBoundingClientRect(), t = a.querySelector('.moTile').getBoundingClientRect(); return q.height >= 44 && q.width >= 44 && q.left >= ip.left && q.right <= ip.right + 1 && Math.abs(t.width - t.height) < 1 && t.width >= 56; }),
        row: new Set(A.slice(0, 4).map((a) => Math.round(a.getBoundingClientRect().top))).size, sw: document.getElementById('ib').scrollWidth - document.getElementById('ib').clientWidth }; });
    ok(await title() === 'More' && g.ids === 'moMsg,moFm,moJobs,moGuide,moMem,moLog,moSet' && g.lb === 'Messages,Moth FM,Jobs,Guide,Memories,Event log,Settings' && g.ok && g.row === 1 && g.sw <= 1, 'More: seven app icons (Memories from 3D.392), four to a row, square, 44 px+, inside the sheet: ' + JSON.stringify(g)); ok(!(await p.evaluate(() => !!document.querySelector('#ib .moreRow'))), 'no old rows');
    await p.screenshot({ path: path.join(out, `phone_settings_${z.n}_more.png`) });
    await p.evaluate(() => document.getElementById('moSet').click()); await p.waitForTimeout(500); await Q.clearCards(p);
    f = await fit(); const secs = await p.evaluate(() => [...document.querySelectorAll('#ib .phSec')].map((e) => e.textContent));
    ok(await title() === 'Settings' && ['Sound', 'Game', 'Look', 'Help'].every((t) => secs.includes(t)), 'Settings opens with Sound, Game, Look, Help (' + secs + ')'); ok(f.n >= 12 && f.ok && f.ic && f.chv && f.sw <= 1, 'Settings: every row has a sign, is 44 px+ and inside the sheet; chevrons at the right');
    ok(await p.evaluate(() => [...document.querySelectorAll('#ib .tgl')].every((e) => { const q = e.getBoundingClientRect(); return q.width >= 44 && q.height >= 28; }) && document.getElementById('stSave').getBoundingClientRect().height >= 44), 'switches and Save are easy to hit');
    await p.screenshot({ path: path.join(out, `phone_settings_${z.n}_settings.png`) });
    const flip = async (id, read) => { const a = await p.evaluate(read); await p.evaluate((id) => document.getElementById(id).click(), id); await p.waitForTimeout(300); const b2 = await p.evaluate(read); await p.evaluate((id) => document.getElementById(id).click(), id); await p.waitForTimeout(300); return a !== b2 && (await p.evaluate(read)) === a; };
    ok(await flip('stAdv', () => !!ZH.OPTS.advisor), 'Advisor tips switches and switches back'); ok(await flip('stSwear', () => ZH.OPTS.swear !== false), 'Swearing switches and switches back'); ok(await flip('stPics', () => ZH.OPTS.pics !== false), 'Survivor pictures switches and switches back');
    const a0 = await p.evaluate(() => !!ZH.OPTS.autoSlow); await p.evaluate(() => document.getElementById('stSlow').closest('.phR').querySelector('b').click()); await p.waitForTimeout(300); ok(await p.evaluate(() => !!ZH.OPTS.autoSlow) === !a0, 'a tap on a setting\'s words flips its switch'); await p.evaluate(() => document.getElementById('stSlow').click()); await p.waitForTimeout(300);
    const d0 = await p.evaluate(() => document.querySelector('#stDayMus .v').textContent); await p.evaluate(() => document.getElementById('stDayMus').click()); await p.waitForTimeout(300); ok(await p.evaluate(() => document.querySelector('#stDayMus .v').textContent) !== d0, 'Day music moves to the next tune');
    await p.evaluate(() => document.getElementById('stSave').click()); await p.waitForTimeout(400); ok(await p.evaluate(() => /just now/.test(document.querySelector('#ib .phR .tx small').textContent)), 'Save saves');
    await p.evaluate(() => document.getElementById('ib').scrollTop = 9999); await p.waitForTimeout(200); await p.screenshot({ path: path.join(out, `phone_settings_${z.n}_settings2.png`) });
    await p.evaluate(() => document.getElementById('stLog').click()); await p.waitForTimeout(400); ok((await title()) !== 'Settings' && await p.evaluate(() => getComputedStyle(document.getElementById('pBack')).display !== 'none'), 'Event log opens, with a way back'); await p.evaluate(() => document.getElementById('pBack').click()); await p.waitForTimeout(400); ok(await title() === 'Settings', 'back returns to Settings');
    await p.evaluate(() => document.getElementById('stHow').click()); await p.waitForTimeout(400); ok((await title()) !== 'Settings', 'How to play opens'); await p.evaluate(() => document.getElementById('pBack').click()); await p.waitForTimeout(400);
    await p.evaluate(() => document.getElementById('pBack').click()); await p.waitForTimeout(400); ok(await title() === 'More', 'back from Settings returns to More');
    await p.evaluate(() => document.getElementById('moJobs').click()); await p.waitForTimeout(400); ok((await title()) !== 'More', 'Jobs opens'); await p.evaluate(() => ZH.showSettings(ZH.showMore)); await p.waitForTimeout(300);
    await p.evaluate(() => document.getElementById('stResume').click()); await p.waitForTimeout(300); ok(await p.evaluate(() => !document.getElementById('infoPanel').classList.contains('show')), 'Resume closes the sheet');
    await p.evaluate(() => ZH.showSettings(ZH.showMore)); await p.waitForTimeout(300); await p.evaluate(() => document.getElementById('stLook').click()); await p.waitForTimeout(500);
    ok(await p.evaluate(() => ZH.OPTS.look === 'glass' && !document.documentElement.classList.contains('phone') && !!document.querySelector('#ib .setRow') && !document.querySelector('#ib .phSet')), 'Phone look off: the old Settings list'); await p.evaluate(() => ZH.showMore()); await p.waitForTimeout(300); ok(await p.evaluate(() => !!document.querySelector('#ib .moreRow')), 'and the old More list');
    await p.evaluate(() => { ZH.showSettings(ZH.showMore); document.getElementById('stLook').click(); }); await p.waitForTimeout(500); ok(await p.evaluate(() => ZH.OPTS.look !== 'glass' && !!document.querySelector('#ib .phSet')), 'Phone look on again: the new list');
    ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close();
  }
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0);
})();
