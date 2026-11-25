// tools/qa/insets_check.js [tag] [--name before] — UI chat, 3D.373 (W277). The owner's iPhone (Home Screen copy, status bar black-translucent) has a
// notch inset of 59 px at the top and a home bar inset of 34 px at the bottom, and iOS there gives 100dvh as the screen less the status bar. A
// desktop browser has no insets, so this check fakes them: env(safe-area-inset-top) becomes 59px, -bottom 34px, and 100dvh becomes 100dvh - 59px
// (the iOS quirk), in the page and every stylesheet. Then on a 393x852 phone: the game fills the whole screen (no band at the top or bottom),
// the resource bar sits just under the status bar (59 to 75 px from the top), the tab bar's bottom sits on the home bar's line (no more than 40 px
// from the bottom, never under 20), and the opening scene fills the screen too.
const Q = require('./lib'); const path = require('path'); const fs = require('fs'); const out = path.join(__dirname, '../../runs/ui_samples');
const args = process.argv.slice(2), TAG = args[0] && !args[0].startsWith('--') ? args[0] : '', NAME = (args[args.indexOf('--name') + 1] || 'after'); let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
const fake = (t) => t.replace(/env\(\s*safe-area-inset-top\s*(,[^)]*)?\)/g, '59px').replace(/env\(\s*safe-area-inset-bottom\s*(,[^)]*)?\)/g, '34px').replace(/env\(\s*safe-area-inset-(left|right)\s*(,[^)]*)?\)/g, '0px').replace(/100dvh/g, 'calc(100dvh - 59px)');
(async () => { const b = await Q.launch(); const W = 393, H = 852;
  const p = await Q.page(b, { w: W, h: H, look: '' });
  await p.route(/\.css(\?|$)/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, body: fake(await res.text()) }); });
  await p.route(/js\/game\.js/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, body: fake(await res.text()) }); });
  await p.route(/index\.html|\/(\?|$)/, async (r) => { const res = await r.fetch(); const t = await res.text(); r.fulfill({ response: res, body: fake(t) }); });
  await Q.newGame(p);
  await p.evaluate(() => { ZH.S.introOff = true; }); for (let i = 0; i < 6; i++) { await p.evaluate(() => { const x = [...document.querySelectorAll('#eventModal button')].find((b) => /no more tips|got it/i.test(b.textContent)); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(400); }
  if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
  const m = await p.evaluate(() => { const r = (id) => { const e = document.getElementById(id); if (!e) return null; const q = e.getBoundingClientRect(); return { t: Math.round(q.top), b: Math.round(q.bottom) }; };
    return { app: r('app'), world: r('world'), res: (() => { const q = document.querySelector('#plaque .res').getBoundingClientRect(); return { t: Math.round(q.top), b: Math.round(q.bottom) }; })(), lmenu: r('lmenu'), H: innerHeight }; });
  console.log('  ', NAME, JSON.stringify(m));
  ok(m.app.t === 0 && m.app.b === m.H, 'the game fills the screen, top to bottom'); ok(m.world.t === 0 && m.world.b === m.H, 'the scene runs under the status bar and the home bar');
  ok(m.res.t >= 59 && m.res.t <= 75, 'the resource bar sits just under the status bar'); ok(m.H - m.lmenu.b >= 20 && m.H - m.lmenu.b <= 40, 'the tab bar sits on the home bar line');
  await p.screenshot({ path: path.join(out, `insets_${NAME}.png`) });
  ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close();
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0); })();
