// tools/qa/memories_check.js — UI chat, 3D.392 (W249, fun idea 11: Memories). At three phone sizes, phone look:
//  - the morning keeps the night's moments (S.memN, joined in S.mem) and the first of each new building;
//  - on the morning of day 8 the week plays after the report: full screen, a bar per slide, a cover "Week 1", one slide per moment with the
//    person's picture or a big sign, the longest night, the week in numbers with a joke; it moves on by itself; tap right for next, left for back;
//    Done on the last slide and ✕ close it; it plays once;
//  - More → Memories lists the week and plays it again; the old look plays nothing.
// Pictures: runs/ui_samples/mem_<slide>.png, mem_list.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
const clear = async (p) => { for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb):not(.mmX):not(.mmL):not(.mmR):not(.mmDone)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(150); } };
const st = (p) => p.evaluate(() => { const b = document.querySelector('#eventModal .mmBox'); if (!b) return null; const s = b.querySelector('.mmS'), r = b.getBoundingClientRect();
  return { full: r.width >= innerWidth - 1 && r.bottom >= innerHeight - 1 && r.top <= 26 + 60 && (document.getElementById('stStrip') ? r.top >= document.getElementById('stStrip').getBoundingClientRect().bottom - 1 : true), bars: b.querySelectorAll('.mmBars i').length, on: b.querySelectorAll('.mmBars i.on').length, k: s.className.replace(/.*mmS_/, ''), t: (s.querySelector('.mmT') || {}).innerText, sub: (s.querySelector('.mmSub') || {}).innerText || '', d: (s.querySelector('.mmD') || {}).innerText, pic: !!s.querySelector('.mmPic img, .mmPic .phFace, .mmPic .apT, .mmPic .mmSign'), done: getComputedStyle(b.querySelector('.mmDone')).display !== 'none', x: b.querySelector('.mmX').getBoundingClientRect().height, rows: s.querySelectorAll('.mmRows div').length, joke: !!s.querySelector('.mmJoke') }; });
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneXL', 430, 932]]) {
    const p = await Q.page(b, { w, h, look: '', expose: 'BUILD_TAG, memAdd, memWeek, memMorning, nightStart, morningCard, showMore, closeP, OPTS, saveOpts, applyLook' });
    await Q.newGame(p); await clear(p); await p.waitForTimeout(300);
    if (n === 'phone') ok(+String(await p.evaluate(() => ZH.BUILD_TAG)).split('.')[1] >= 392, 'build before 3D.392');
    /* a real morning keeps the night */
    const m0 = await p.evaluate(() => { ZH.nightStart(); ZH.S.kills = (ZH.S.kills || 0) + 9; ZH.S.nightLog.by = { [ZH.S.sv[0].id]: 6, [ZH.S.sv[1].id]: 3 }; ZH.morningCard(); return { n: (ZH.S.memN || []).slice(-1)[0], kinds: (ZH.S.memKinds || []).length }; });
    ok(m0.n && m0.n.k === 9 && m0.n.n === 6 && m0.kinds > 0, `${n}: the morning did not keep the night: ${JSON.stringify(m0)}`);
    await clear(p);
    /* a week of moments, then the morning of day 8 */
    await p.evaluate(() => { const S = ZH.S, sv = S.sv; S.memN = [{ d: 2, k: 14, id: sv[0].id, n: 8 }, { d: 5, k: 31, id: sv[1].id, n: 12 }];
      const at = (d, f) => { const o = S.day; S.day = d; f(); S.day = o; };
      at(2, () => ZH.memAdd('build', 'First Rain Barrel', '', { b: 'barrel' })); at(3, () => ZH.memAdd('joined', `${sv[2].name} joined`, sv[2].job, { id: sv[2].id }));
      at(4, () => ZH.memAdd('level', 'Haven level 2', '')); at(6, () => ZH.memAdd('ally', 'New friends', 'The Haven and Greenwater Commune are allies.'));
      S.day = 8; S.memShown = 0; ZH.memWeek(); });
    await p.waitForTimeout(400); let s = await st(p); await p.screenshot({ path: path.join(out, `mem_cover_${n}.png`) });
    ok(s && s.full && s.k === 'cover' && s.t === 'Week 1' && /Day 1 to 7/.test(s.sub) && s.bars === 7 && s.x >= 44 && !s.done, `${n}: the cover: ${JSON.stringify(s)}`);
    if (!s) { await p.close(); continue; }
    const moved = await p.waitForFunction(() => document.querySelectorAll('.mmBars i.on').length >= 1, null, { timeout: 9000 }).then(() => true).catch(() => false);
    ok(moved, `${n}: it did not move on by itself`);
    await p.evaluate(() => { document.querySelector('.mmBox').dataset.hold = 1; for (let k = 0; k < 9; k++) document.querySelector('.mmL').click(); document.querySelector('.mmR').click(); });   /* hold, back to the start, one on */
    await p.waitForTimeout(200); s = await st(p); ok(s.k === 'build' && /First Rain Barrel/.test(s.t), `${n}: the first moment: ${JSON.stringify(s)}`);
    if (n === 'phone') await p.screenshot({ path: path.join(out, 'mem_build.png') });
    await p.click('.mmR'); await p.waitForTimeout(250); s = await st(p); ok(s.k === 'joined' && s.pic && /joined/.test(s.t) && s.d === 'DAY 3', `${n}: next (joined, with a picture): ${JSON.stringify(s)}`);
    if (n === 'phone') await p.screenshot({ path: path.join(out, 'mem_joined.png') });
    await p.click('.mmL'); await p.waitForTimeout(250); s = await st(p); ok(s.k === 'build', `${n}: back: ${s.k}`);
    for (let k = 0; k < 4; k++) { await p.evaluate(() => document.querySelector('.mmR').click()); await p.waitForTimeout(120); }
    s = await st(p); ok(s.k === 'night' && /31 put down/.test(s.t) && /got 12/.test(s.sub), `${n}: the longest night: ${JSON.stringify(s)}`);
    if (n === 'phone') await p.screenshot({ path: path.join(out, 'mem_night.png') });
    await p.click('.mmR'); await p.waitForTimeout(250); s = await st(p); ok(s.k === 'end' && s.rows === 4 && s.joke && s.done, `${n}: the end: ${JSON.stringify(s)}`);
    if (n === 'phone') await p.screenshot({ path: path.join(out, 'mem_end.png') });
    await p.click('.mmDone'); await p.waitForTimeout(300); ok(await p.evaluate(() => !document.querySelector('.mmBox')), `${n}: Done did not close`);
    await p.evaluate(() => ZH.memWeek()); await p.waitForTimeout(300); ok(await p.evaluate(() => !document.querySelector('.mmBox')), `${n}: it played twice`);
    if (n === 'phone') {
      await clear(p); await p.evaluate(() => { ZH.closeP(); ZH.showMore(); }); await p.waitForTimeout(400);
      ok(await p.evaluate(() => !!document.querySelector('#moMem .apT svg')), 'phone: no Memories app in More');
      await p.click('#moMem'); await p.waitForTimeout(400); await p.screenshot({ path: path.join(out, 'mem_list.png') });
      const L = await p.evaluate(() => ({ t: document.getElementById('it').textContent, rows: [...document.querySelectorAll('#ib .mmRow')].map((r) => r.innerText.replace(/\n/g, ' | ')) }));
      ok(L.t === 'Memories' && L.rows.length === 1 && /Week 1/.test(L.rows[0]) && /5 moments/.test(L.rows[0]), `phone: the list: ${JSON.stringify(L)}`);
      await p.click('.mmRow'); await p.waitForTimeout(400); s = await st(p); ok(s && s.k === 'cover', 'phone: the list did not play the week');
      await p.click('.mmX'); await p.waitForTimeout(300); ok(await p.evaluate(() => !document.querySelector('.mmBox')), 'phone: ✕ did not close');
      await p.evaluate(() => { ZH.OPTS.look = 'glass'; ZH.saveOpts && ZH.saveOpts(); ZH.applyLook && ZH.applyLook(); ZH.S.day = 15; ZH.S.memShown = 0; ZH.memWeek(); }); await p.waitForTimeout(300);
      ok(await p.evaluate(() => !document.querySelector('.mmBox')), 'phone: the old look played Memories');
    }
    await p.close();
  }
  await b.close(); console.log(bad ? `memories_check: ${bad} FAIL` : 'memories_check: all passed'); process.exit(bad ? 1 : 0);
})();
