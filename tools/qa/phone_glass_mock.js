// tools/qa/phone_glass_mock.js — UI chat, 23 Nov (W249). MOCKUP ONLY: trial styles injected into the running game.
// Owner on the People sheet of 3D.335: "Yes it is right. but can we do glass?" Three strengths of glass for the menu sheet, on the real People list:
// A frosted glass (dark tint, the town shows through softly), B clear glass (like the bars at the top, light tint), C smoked glass (between the two).
// Pictures: runs/ui_samples/phoneE_glass_{A,B,C}.png. Usage: node tools/qa/phone_glass_mock.js   (game served on :8765)
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
const edge = 'inset 0 1px 0 rgba(255,255,255,.6), inset 0 -1px 1px rgba(255,255,255,.16), inset 1px 0 0 rgba(255,255,255,.2), inset -1px 0 0 rgba(255,255,255,.2), 0 18px 50px rgba(0,0,0,.45)';
const V = {
  A: `html.glass.phone #infoPanel { background: linear-gradient(180deg, rgba(40,48,58,.5), rgba(18,22,28,.62)); -webkit-backdrop-filter: blur(26px) saturate(180%); backdrop-filter: blur(26px) saturate(180%); box-shadow: ${edge}; }`,
  B: `html.glass.phone #infoPanel { background: linear-gradient(180deg, rgba(255,255,255,.24), rgba(255,255,255,.1)); -webkit-backdrop-filter: blur(18px) saturate(180%); backdrop-filter: blur(18px) saturate(180%); box-shadow: ${edge}; }
      html.phone #infoPanel .phCard, html.phone #infoPanel .phSearch, html.phone #infoPanel .phSeg { background: rgba(20,26,32,.28); } html.phone #infoPanel, html.phone #infoPanel .phTx small, html.phone #infoPanel .phSec { text-shadow: 0 1px 2px rgba(0,0,0,.5); } html.phone #infoPanel .phTx small { color: rgba(255,255,255,.85); } html.phone #infoPanel .phSec { color: rgba(255,255,255,.8); }`,
  C: `html.glass.phone #infoPanel { background: linear-gradient(180deg, rgba(60,70,82,.36), rgba(20,24,30,.48)); -webkit-backdrop-filter: blur(20px) saturate(180%); backdrop-filter: blur(20px) saturate(180%); box-shadow: ${edge}; }
      html.phone #infoPanel .phCard, html.phone #infoPanel .phSearch, html.phone #infoPanel .phSeg { background: rgba(255,255,255,.1); } html.phone #infoPanel { text-shadow: 0 1px 2px rgba(0,0,0,.4); }`,
};
(async () => {
  const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, look: '', expose: 'showSurvivors' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(1500); await Q.clearCards(p);
  for (const k of Object.keys(V)) { await p.evaluate((t) => { let s = document.getElementById('mockCss'); if (!s) { s = document.createElement('style'); s.id = 'mockCss'; document.head.appendChild(s); } s.textContent = t; }, V[k]);
    await Q.clearCards(p); await p.waitForTimeout(1200); await Q.clearCards(p); await p.evaluate(() => ZH.showSurvivors()); await p.waitForTimeout(600); await Q.clearCards(p); await p.evaluate(() => ZH.showSurvivors()); await p.waitForTimeout(500); await p.screenshot({ path: path.join(out, `phoneE_glass_${k}.png`) }); console.log('shot', k); }
  await b.close();
})();
