// tools/qa/valley_map_check.js [tag] — UI chat, 3D.362 (W249; the valley map, W245 and W247; step 1 of 4). In the phone look the Explore button
// opens the map of the valley: the Haven and every place the game knows as pins on the screen (met faction towns only), each pin's tap area 44 px+;
// a lead shows "Lead"; a locked place is greyed; a tap opens its card (one line, what it brings, one button); a lead's "Plan a trip ›" opens the
// planner with a back link to the map, and the back link returns to the map; a faction's card shows the five mood faces with theirs lit.
// The leads chip steps through the leads. With the look off, the old trip list.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples'); const TAG = process.argv[2] || ''; let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneL', 430, 932]]) { console.log(n);
    const p = await Q.page(b, { w, h, look: '', expose: 'showExplore,nowH' }); await Q.newGame(p);
    for (let i = 0; i < 6; i++) { await p.evaluate(() => { const x = [...document.querySelectorAll('#eventModal button')].find((b) => /no more tips/i.test(b.textContent)); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(500); }
    if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
    await p.evaluate(() => { const S = ZH.S, h = ZH.nowH(); S.leads = [{ id: 'tl1', dest: 'lumberyard', risk: 'low', text: 'Scouts saw stacked timber.', untilH: h + 8 }, { id: 'tl2', dest: 'houses', risk: 'low', text: 'Lights in a window.', untilH: h + 8 }];
      S.fac = S.fac || {}; S.fac.green = Object.assign(S.fac.green || {}, { met: true, att: 30 }); S.fac.toll = Object.assign(S.fac.toll || {}, { met: true, att: -30 }); document.getElementById('mExp').click(); });
    await p.waitForTimeout(800);
    const m = await p.evaluate(() => { const ib = document.getElementById('ib'), r = (e) => e.getBoundingClientRect(), mp = ib.querySelector('.vmMap'), M = mp && r(mp);
      return { map: !!mp, title: document.getElementById('it').textContent, pins: [...ib.querySelectorAll('[data-vm]')].map((e) => { const d = r(e.querySelector('.vmDot')), cs = getComputedStyle(e, '::before'); return { id: e.dataset.vm, tag: (e.querySelector('.vmTag') || {}).textContent || '', dim: e.classList.contains('dim'), in: d.left >= M.left - 2 && d.right <= M.right + 2 && d.top >= M.top - 2 && d.bottom <= M.bottom + 2, tap: parseFloat(cs.width) }; }), home: !!ib.querySelector('.vmPin.home') }; });
    console.log('   pins', m.pins.map((x) => x.id + (x.tag ? ':' + x.tag : '')).join(' '));
    ok(m.map && m.home, 'Explore opens on the map with the Haven'); ok(m.pins.length >= 10 && m.pins.every((x) => x.in), 'the places are pins inside the map (' + m.pins.length + ')');
    ok(m.pins.every((x) => x.tap >= 44), 'every pin takes taps 44 px+'); ok(m.pins.filter((x) => x.tag === 'Lead').map((x) => x.id).sort().join() === 'houses,lumberyard', 'the two leads say Lead');
    ok(m.pins.some((x) => x.dim), 'locked places are greyed'); ok(m.pins.some((x) => x.id === 'raid_green') && m.pins.some((x) => x.id === 'raid_toll') && !m.pins.some((x) => x.id === 'raid_helix'), 'met faction towns only');
    await p.screenshot({ path: path.join(out, `valley_map_${n}.png`) });
    await p.evaluate(() => document.querySelector('[data-vm=lumberyard]').click()); await p.waitForTimeout(400);
    const c = await p.evaluate(() => { const cd = document.querySelector('.vmCard'), r = (e) => e.getBoundingClientRect(); return cd && { name: cd.querySelector('.vmCT b').textContent, line: cd.querySelector('.vmCT small').textContent, go: !!cd.querySelector('#vmGo.go'), brings: cd.querySelectorAll('.vmRes').length, b: r(cd).bottom, mb: r(document.querySelector('.vmMap')).bottom, H: innerHeight }; });
    ok(c && /Lumber/.test(c.name) && /Lead/.test(c.line) && c.go && c.brings > 0, 'a lead\'s card: name, one line, what it brings, lime Plan a trip');
    await p.screenshot({ path: path.join(out, `valley_card_${n}.png`) });
    await p.evaluate(() => document.getElementById('vmGo').click()); await p.waitForTimeout(500);
    const pl = await p.evaluate(() => ({ map: !!document.querySelector('#ib .vmMap'), go: !!document.getElementById('expGo'), back: document.getElementById('pBack').style.display === 'block' && document.getElementById('pBack').dataset.t === 'Map', dest: ZH.S && document.getElementById('ib').textContent.includes('Lumber') }));
    ok(!pl.map && pl.go && pl.back, 'Plan a trip opens the planner with a back link to the map');
    await p.evaluate(() => document.getElementById('pBack').click()); await p.waitForTimeout(400); ok(await p.evaluate(() => !!document.querySelector('#ib .vmMap')), 'Back returns to the map');
    await p.evaluate(() => document.querySelector('[data-vm=raid_toll]').click()); await p.waitForTimeout(400);
    const f = await p.evaluate(() => { const cd = document.querySelector('.vmCard'); return cd && { faces: cd.querySelectorAll('.vmMood > span').length, on: (cd.querySelector('.vmMood > span.on small') || {}).textContent }; });
    ok(f && f.faces === 5 && f.on === 'Wary', 'a faction card: five mood faces, Wary lit (' + JSON.stringify(f) + ')');
    await p.screenshot({ path: path.join(out, `valley_fac_${n}.png`) });
    await p.evaluate(() => document.getElementById('vmX').click()); await p.waitForTimeout(300); ok(await p.evaluate(() => !document.querySelector('.vmCard')), 'the card closes');
    await p.evaluate(() => document.getElementById('vmLeads').click()); await p.waitForTimeout(300); ok(await p.evaluate(() => /Lumber|Abandoned/.test((document.querySelector('.vmCT b') || {}).textContent || '')), 'the leads chip opens a lead');
    if (n === 'phone') { await p.evaluate(() => { ZH.OPTS.look = 'glass'; document.documentElement.classList.remove('phone'); ZH.showExplore(); }); await p.waitForTimeout(400); ok(await p.evaluate(() => !document.querySelector('#ib .vmMap') && !!document.getElementById('expGo')), 'look off: the old trip list'); }
    ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close(); }
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0); })();
