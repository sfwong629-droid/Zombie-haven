// tools/qa/ui_check.js [sizes] [tag] — 3D.159 layout check: fires every kind of message at once at each screen size and FAILS on
// overlaps, anything off screen, or a button under 44 px. Writes <tag>_<size>.png.  Default sizes: six phones/tablets/computers.
//   node tools/qa/ui_check.js                      node tools/qa/ui_check.js "phone:390x844,phoneL:844x390" before
const Q = require('./lib');
const SIZES = (process.argv[2] || 'phone:390x844,phoneS:360x640,phoneL:844x390,tablet:820x1180,laptop:1366x768,desk:1920x1080').split(',').map((s) => { const [n, d] = s.split(':'); const [w, h] = d.split('x'); return [n, +w, +h]; });
const TAG = process.argv[3] || 'ui';
(async () => { const b = await Q.launch(); const p = await Q.page(b, { expose: 'radio, say, banner, showEventPopup' }); await Q.newGame(p); let bad = 0;
  await p.evaluate(() => document.head.insertAdjacentHTML('beforeend', '<style>#nTop .toast,.critStrip.in{animation:none!important;opacity:1!important} #say{opacity:1!important;transition:none!important} .radioCard{transition:none!important}</style>'));
  const fire = () => p.evaluate(() => { ZH.S.hour = 18; ZH.radio('dj', 'Morning, new folks. This is Dusk Radio. First thing: water. Tap Build, pick a Rain Barrel, and put it down inside the fence.');
    ZH.banner('📣 Marcus found 3 scrap at the wreck'); ZH.banner('📣 Marcus found 5 scrap at the wreck'); ZH.banner('★ Renown +5 · first barrel');
    ZH.note('critical', 'Walkers at the north fence', { key: 'qa1' + Math.random(), icon: '🧟' }); ZH.note('critical', 'Ben is badly hurt', { key: 'qa2' + Math.random(), icon: '🩸' }); ZH.say('Hold on, I am coming!'); });
  for (const [nm, w, h] of SIZES) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(1500); await Q.clearCards(p); await fire(); await p.waitForTimeout(600);
    const r = await p.evaluate(() => { const vis = (e) => { const cs = getComputedStyle(e), b = e.getBoundingClientRect(); return b.width > 2 && b.height > 2 && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > .2; };
      const pick = { res: '#plaque .res', mission: '#quest #qt', clock: '#quest #clock', renown: '#gauge', dock: '#bottom', tabs: '#lmenu', alert: '#alertBtn', radioBtn: '#radioBtn', say: '#say', radio: '#nBot .radioCard.in', strip: '.critStrip.in', news: '#nTop .toast', skip: '#skipDawn' };
      const L = []; for (const [k, sel] of Object.entries(pick)) document.querySelectorAll(sel).forEach((e) => { if (vis(e)) L.push([k, e.getBoundingClientRect()]); });
      const app = document.getElementById('app').getBoundingClientRect(), out = [];
      for (let a = 0; a < L.length; a++) { const A = L[a][1]; if (A.left < app.left - 1 || A.right > app.right + 1 || A.top < app.top - 1 || A.bottom > app.bottom + 1) out.push(L[a][0] + ' off-screen');
        for (let c = a + 1; c < L.length; c++) { const B = L[c][1], ox = Math.min(A.right, B.right) - Math.max(A.left, B.left), oy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top); if (ox > 2 && oy > 2) out.push(L[a][0] + ' x ' + L[c][0] + ' ' + Math.round(ox) + 'x' + Math.round(oy)); } }
      const small = [...document.querySelectorAll('#lmenu button, #bottom button, #alertBtn, #radioBtn, #skipDawn')].filter(vis).map((e) => [e.id || e.textContent.trim().slice(0, 8), e.getBoundingClientRect()]).filter(([, r]) => r.width < 43.5 || r.height < 43.5).map(([k, r]) => k + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      return { u: getComputedStyle(document.documentElement).getPropertyValue('--u'), shown: L.map((q) => q[0]), out, small }; });
    const ok = !r.out.length && !r.small.length; if (!ok) bad++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${nm} ${w}x${h} u=${r.u} shown: ${r.shown.join(',')}${r.out.length ? '\n   overlaps: ' + r.out.join('; ') : ''}${r.small.length ? '\n   small taps: ' + r.small.join('; ') : ''}`);
    await Q.shot(p, `${TAG}_${nm}.png`); }
  if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad ? 1 : 0); })();
