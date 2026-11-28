// tools/qa/notif_check.js — UI chat, 3D.394 (W249, idea 2; owner: "A with C is good"). Three phone sizes, phone look:
//  - the news drops from the top as the phone's banner: under the status strip, inside the screen, dark glass, the app's icon, its name and
//    "now", a bold title (SHOUTED news back to a sentence, names kept), one line; the old toast does not show;
//  - a second piece stacks with "1 more"; the same news again counts up (×2); each goes after about 4 s;
//  - a tap opens the app it came from (People); a swipe up puts them all away; the old look keeps its toast.
// Pictures: runs/ui_samples/notif_built_<size>.png, notif_built_stack.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); require('fs').appendFileSync('/tmp/nf_fail.txt', m + '\n'); } };
const clear = async (p) => { for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(150); } };
const rd = (p, want) => p.evaluate((want) => { document.getAnimations().forEach((a) => { if (a.animationName === 'nfIn') a.finish(); }); const b = document.getElementById('nfBox'); if (!b) return null; const C = [...b.querySelectorAll('.nfC')], f = (want && C.find((c) => c.querySelector('b').innerText.includes(want))) || C[C.length - 1], st = document.getElementById('stStrip');
  if (!f) return { n: 0 }; const r = C[C.length - 1].getBoundingClientRect(), cs = getComputedStyle(f);   /* where: the front card */
  return { n: C.length, app: f.querySelector('.nfH span').innerText, t: f.querySelector('b').innerText, body: (f.querySelector('.nfB') || {}).innerText || '', icon: !!f.querySelector('.nfI .apT svg, .nfI img'), more: (b.querySelector('.nfMore') || {}).innerText || '',
    in: r.left >= 0 && r.right <= innerWidth + .5, below: st ? r.top >= st.getBoundingClientRect().bottom - .5 : true, top: r.top, sb: st ? st.getBoundingClientRect().bottom : null, blur: /blur/.test(cs.backdropFilter || cs.webkitBackdropFilter || ''), rad: parseFloat(cs.borderTopLeftRadius),
    toast: !!document.querySelector('#nTop .toast') }; }, want);
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneXL', 430, 932]]) {
    const p = await Q.page(b, { w, h, look: '', expose: 'BUILD_TAG, banner, NF, nfRender, OPTS, saveOpts, applyLook, closeP' });
    await Q.newGame(p); await clear(p); await p.waitForTimeout(3000);
    if (n === 'phone') ok(+String(await p.evaluate(() => ZH.BUILD_TAG)).split('.')[1] >= 394, 'build before 3D.394');
    const nm = await p.evaluate(() => ZH.S.sv[0].name);
    await p.evaluate((nm) => { ZH.NF.list.length = 0; ZH.banner(`🩸 ${nm.toUpperCase()} IS DOWN · 40 S TO REACH HER`); }, nm); await p.waitForTimeout(500);
    await p.waitForTimeout(400); let r = await rd(p, nm); await p.screenshot({ path: path.join(out, `notif_built_${n}.png`) });
    ok(r && r.n >= 1 && r.app === 'PEOPLE' && r.t === `${nm} is down` && /40 s to reach her/i.test(r.body) && r.icon && r.in && r.below && r.blur && r.rad >= 18 && !r.toast, `${n}: the banner: ${JSON.stringify(r)}`);
    await p.evaluate(() => { ZH.banner('🗺 NEW LEAD: THE GAS STATION'); }); await p.waitForTimeout(600); r = await rd(p);
    ok(r.n >= 2 && r.app === 'EXPLORE' && /New lead/.test(r.t) && /gas station/i.test(r.body) && /^\d more$/.test(r.more), `${n}: a second stacks: ${JSON.stringify(r)}`);
    if (n === 'phone') await p.screenshot({ path: path.join(out, 'notif_built_stack.png') });
    r = await p.evaluate(() => { ZH.banner('🗺 NEW LEAD: THE GAS STATION'); const c = [...document.querySelectorAll('#nfBox .nfC b')].map((x) => x.innerText); return { t: c.join(' | ') }; }); ok(/New lead ×2/.test(r.t), `${n}: the same news did not count up: ${JSON.stringify(r)}`);
    await p.waitForTimeout(6500); r = await rd(p); ok(r && r.n === 0, `${n}: they did not go by themselves: ${JSON.stringify(r)}`);
    if (n === 'phone') {
      await clear(p); await p.evaluate((nm) => { ZH.NF.list.length = 0; ZH.banner(`🩸 ${nm.toUpperCase()} IS DOWN`); }, nm); await p.waitForTimeout(400);
      await p.waitForTimeout(700); const box = await p.evaluate((nm) => { const C = [...document.querySelectorAll('#nfBox .nfC')], c = C.find((x) => x.querySelector('b').innerText.includes(nm)); document.querySelectorAll('#nfBox .nfC').forEach((x) => { if (x !== c) x.remove(); }); const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, nm);
      await p.mouse.click(box.x, box.y); await p.waitForTimeout(500);
      ok(await p.evaluate(() => /People/.test(document.getElementById('it') ? document.getElementById('it').textContent : '') && document.getElementById('infoPanel').offsetParent !== null), 'phone: a tap did not open People');
      await p.evaluate(() => ZH.closeP()); await p.waitForTimeout(300);
      await p.evaluate(() => { ZH.NF.list.length = 0; ZH.banner('🏗 RAIN BARREL BUILT'); ZH.banner('🗺 NEW LEAD: THE MALL'); }); await p.waitForTimeout(300);
      const bx = await p.evaluate(() => { const r = [...document.querySelectorAll('#nfBox .nfC')].pop().getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
      await p.mouse.move(bx.x, bx.y); await p.mouse.down(); await p.mouse.move(bx.x, bx.y - 60, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(300);
      r = await rd(p); ok(r.n === 0, `phone: a swipe up did not put them away: ${JSON.stringify(r)}`);
      await p.evaluate(() => { ZH.OPTS.look = 'glass'; ZH.saveOpts && ZH.saveOpts(); ZH.applyLook && ZH.applyLook(); ZH.banner('🗺 NEW LEAD: THE DOCKS'); }); await p.waitForTimeout(400);
      ok(await p.evaluate(() => !!document.querySelector('#nTop .toast') && !document.querySelector('#nfBox .nfC')), 'phone: the old look lost its toast');
    }
    await p.close();
  }
  await b.close(); console.log(bad ? `notif_check: ${bad} FAIL` : 'notif_check: all passed'); process.exit(bad ? 1 : 0);
})();
