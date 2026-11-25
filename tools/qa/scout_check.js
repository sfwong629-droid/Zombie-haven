// tools/qa/scout_check.js [tag] — UI chat, 3D.363 (W245 "Yes on hide places"; the valley map's step 2). A new town's map shows only the Haven, the
// places a lead points to and met faction towns, under fog with "no data"; a lead's place stays on the map after the lead is gone; a place a
// squad went to stays too; the fog clears as places become known; a town from before this build (day 5, no list yet) sees every place it could go to.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples'); const TAG = process.argv[2] || ''; let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
const pins = (p) => p.evaluate(() => ({ ids: [...document.querySelectorAll('#ib [data-vm]')].map((e) => e.dataset.vm).sort(), fog: !!document.querySelector('#ib #vmFog'), words: /NO DATA/.test(document.querySelector('#ib .vmMap svg').innerHTML) }));
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568]]) { console.log(n);
    const p = await Q.page(b, { w, h, look: '', expose: 'showExplore,nowH,leadsHour,startExpedition,EXP_DEFS' }); await Q.newGame(p);
    for (let i = 0; i < 6; i++) { await p.evaluate(() => { const x = [...document.querySelectorAll('#eventModal button')].find((b) => /no more tips/i.test(b.textContent)); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(500); }
    if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
    await p.evaluate(() => { const S = ZH.S; S.day = 1; S.known = {}; S.lastTrip = null; S.leads = [{ id: 'tl1', dest: 'lumberyard', risk: 'low', text: 'x', untilH: ZH.nowH() + 8 }]; S.fac = {}; ZH.showExplore(); });
    await p.waitForTimeout(500); let m = await pins(p); console.log('   new town', m.ids.join(' '));
    ok(m.ids.join() === 'lumberyard', 'a new town shows only the lead\'s place'); ok(m.fog && m.words, 'the unscouted valley is fogged, "no data"');
    await p.screenshot({ path: path.join(out, `scout_new_${n}.png`) });
    await p.evaluate(() => { const S = ZH.S; S.leads = []; S.known.lumberyard = 1; S.known.houses = 1; ZH.showExplore(); }); await p.waitForTimeout(300); m = await pins(p);
    ok(m.ids.join() === 'houses,lumberyard', 'places once known stay after the lead is gone (' + m.ids + ')');
    const r1 = await p.evaluate(() => document.querySelector('#vmFog').getAttribute('r'));
    await p.evaluate(() => { const S = ZH.S; for (const k of ['pharmacy', 'gasstation', 'quarrysite', 'clinic']) S.known[k] = 1; S.fac.green = { met: true, att: 20 }; ZH.showExplore(); }); await p.waitForTimeout(300); m = await pins(p);
    const r2 = await p.evaluate(() => document.querySelector('#vmFog').getAttribute('r'));
    ok(parseFloat(r2) > parseFloat(r1), 'the fog clears as places become known (' + r1 + ' → ' + r2 + ')'); ok(m.ids.includes('raid_green'), 'a met faction town shows');
    await p.screenshot({ path: path.join(out, `scout_more_${n}.png`) });
    const went = await p.evaluate(() => { const S = ZH.S; delete S.known.houses; S.leads = [{ id: 'tl2', dest: 'houses', risk: 'low', text: 'x', untilH: ZH.nowH() + 8 }]; const r = ZH.startExpedition('houses', 'low', S.sv.slice(0, 1).map((q) => q.id)); return { ok: r.ok, why: r.why, known: !!S.known.houses }; });
    ok(went.known, 'a place a squad went to is known (' + JSON.stringify(went) + ')');
    await p.evaluate(() => { const S = ZH.S; S.trip = null; S.leads = []; delete S.known; S.day = 5; ZH.showExplore(); }); await p.waitForTimeout(300); m = await pins(p);
    const want = await p.evaluate(() => ['houses','pharmacy','lumberyard','gasstation','military','quarrysite','clinic','mall','prison','warehouse','sh_spring','sh_summer','sh_autumn','sh_winter'].filter((k) => !ZH.EXP_DEFS[k].lock()).sort().join());
    ok(m.ids.filter((k) => !k.startsWith('raid_')).join() === want && want.length > 0, 'a town from before this build sees every place it could go to (' + m.ids + ' / ' + want + ')');
    ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close(); }
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0); })();
