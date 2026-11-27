// tools/qa/fm_check.js — UI chat, 3D.387 (W249, fun idea 4: Moth FM's old broadcasts). At three phone sizes, phone look:
//  - every radio message is kept (S.fm, the last 60, saved with the town);
//  - opening a message (radioOpen, as the radio button and the capsule do) opens the Moth FM sheet: Now playing with the station and who speaks,
//    the words sentence by sentence (all shown after a few seconds), Show me when the message has a place;
//  - earlier broadcasts below, grouped Today / Yesterday, newest first, one line each with the time, rows 44 px+ inside the sheet;
//  - a tap on a row plays it again in the Now playing card; More → Moth FM opens it with a back link to More;
//  - the old look keeps the old card. Pictures: runs/ui_samples/fm_<size>.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
const clear = async (p) => { for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(150); } };
const read = (p) => p.evaluate(() => { const ip = document.getElementById('infoPanel'), r = ip.getBoundingClientRect(), now = document.querySelector('.fmNow');
  return { open: ip.classList.contains('show'), title: document.getElementById('it').textContent, now: now ? now.innerText : '', words: [...document.querySelectorAll('.fmWords p')].map((x) => +getComputedStyle(x).opacity),
    secs: [...document.querySelectorAll('#ib .phSec')].map((x) => x.textContent), rows: [...document.querySelectorAll('.fmRow')].map((x) => { const q = x.getBoundingClientRect(); return { t: x.innerText.replace(/\n/g, ' | '), h: q.height, l: q.left, r: q.right }; }),
    go: !!document.getElementById('fmGo'), back: getComputedStyle(document.getElementById('pBack')).display !== 'none', sheet: { l: r.left, r: r.right } }; });
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneXL', 430, 932]]) {
    const p = await Q.page(b, { w, h, look: '', expose: 'BUILD_TAG, radio, radioOpen, showMore, OPTS, saveOpts, applyLook, closeP, saveGame' });
    await Q.newGame(p); await clear(p); await p.waitForTimeout(300);
    if (n === 'phone') ok(+String(await p.evaluate(() => ZH.BUILD_TAG)).split('.')[1] >= 387, 'build before 3D.387');
    await p.evaluate(() => { const S = ZH.S; S.day = 3; S.hour = 8; ZH.radio('dj', 'Morning, Haven. Day three and the coffee is still a rumour.');
      S.day = 4; S.hour = 19; ZH.radio('green', 'Greenwater here. We left food at your gate. Don\'t thank us.');
      S.hour = 21; ZH.radio('dj', 'Lock the doors, Haven. Dinner guests are on the way. They did not RSVP.'); });
    const fm = await p.evaluate(() => (ZH.S.fm || []).length); ok(fm >= 3, `${n}: S.fm holds ${fm}`);
    await clear(p); await p.evaluate(() => ZH.radioOpen({ voice: 'dj', text: 'Lock the doors, Haven. Dinner guests are on the way. They did not RSVP.', act: () => {} })); await p.waitForTimeout(3600);
    const o = await read(p); await p.screenshot({ path: path.join(out, `fm_${n}.png`) });
    ok(o.open && o.title === 'Moth FM', `${n}: the sheet is "${o.title}", open ${o.open}`);
    ok(/Now playing/i.test(o.now) && /DJ Moth/.test(o.now), `${n}: Now playing: ${o.now.slice(0, 60)}`);
    ok(o.words.length === 3 && o.words.every((x) => x > .95), `${n}: the words come in ${o.words.length} sentences, shown ${o.words}`);
    ok(o.go, `${n}: no Show me for a message with a place`);
    ok(o.secs[0] === 'Today' && o.secs.includes('Day 3') || o.secs[0] === 'Today' && o.secs.includes('Yesterday'), `${n}: groups ${o.secs}`);
    ok(o.rows.length >= 2 && /Sister June/.test(o.rows[0].t) && /19:00/.test(o.rows[0].t), `${n}: rows ${JSON.stringify(o.rows.map((x) => x.t))}`);
    ok(o.rows.every((x) => x.h >= 43.5 && x.l >= o.sheet.l - .5 && x.r <= o.sheet.r + .5), `${n}: rows under 44 px or outside the sheet`);
    await p.click('.fmRow'); await p.waitForTimeout(3000); const o2 = await read(p);
    ok(/Sister June/.test(o2.now) && /food at your gate/.test(o2.now) && !o2.go, `${n}: a row did not play again: ${o2.now.slice(0, 60)}`);
    if (n === 'phone') {
      await p.evaluate(() => { ZH.closeP(); ZH.showMore(); }); await p.waitForTimeout(400); await p.click('#moFm'); await p.waitForTimeout(600); const o3 = await read(p);
      ok(o3.title === 'Moth FM' && o3.back, 'phone: More → Moth FM, with a back link');
      ok(await p.evaluate(() => { ZH.saveGame(); const k = Object.keys(localStorage).find((x) => /haven/i.test(x) && /fm/.test(localStorage[x])); return !!k; }), 'phone: S.fm is not saved');
      await p.evaluate(() => { ZH.closeP(); ZH.OPTS.look = 'glass'; ZH.saveOpts(); ZH.applyLook(); ZH.radioOpen({ voice: 'dj', text: 'Old look.' }); }); await p.waitForTimeout(400);
      ok(await p.evaluate(() => !document.getElementById('infoPanel').classList.contains('show') && !!document.querySelector('#eventModal .evBox')), 'look off: not the old card');
    }
    ok(!(p.errs || []).length, `${n}: page errors ${JSON.stringify(p.errs || [])}`);
    console.log(`${n} ${w}x${h}: ${o.rows.length} earlier, ${o.words.length} sentences`);
    await p.close(); }
  await b.close(); console.log(bad ? `FAILED: ${bad}` : 'OK: Moth FM at 3 sizes'); process.exit(bad ? 1 : 0); })();
