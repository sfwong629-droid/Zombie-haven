// tools/qa/phone_sheet_mock.js — UI chat, 23 Nov (W249, W217). MOCKUP ONLY: prototype styles are injected into the running game, nothing in the game changes.
// Owner, 23 Nov 16:31: "Start building of the phone UI type for the whole game. Give me mock up for each and approved before we push" and
// "make the inventory separate from the other food water bar. So that player know you can click on it."
// Pictures (runs/ui_samples/): phoneC_bag_{A,B}.png (the bag as its own button, two ways), phoneC_sheet_{people,build,town,more,person}.png
// (the real menus in the phone sheet: dark glass, floating, round corners, a big title, a round close button).
// Usage: node tools/qa/phone_sheet_mock.js   (game served on :8765)
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
const BAG = {
  A: `html.glass.phone #plaque .res { transform: translateX(-26px); padding-right: 8px; }
      html.glass.phone #plaque .res .bagChip { position: absolute; left: calc(100% + 8px); top: 50%; margin-top: -22px; width: 44px; height: 44px; border-radius: 50%; padding: 0; display: grid; place-items: center; background: var(--pg); -webkit-backdrop-filter: var(--pgBlur); backdrop-filter: var(--pgBlur); box-shadow: var(--pgEdge); }
      html.glass.phone #plaque .res .bagChip i svg, html.glass.phone #plaque .res .bagChip i { width: 28px; height: 28px; }
      html.glass.phone #plaque .res .bagChip b { position: absolute; right: -4px; top: -4px; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 9px; background: #fff; color: #111; font-size: 11px; line-height: 18px; text-align: center; text-shadow: none; box-shadow: 0 1px 3px rgba(0,0,0,.4); }`,
  B: `html.glass.phone #plaque .res { transform: translateX(-36px); padding-right: 8px; }
      html.glass.phone #plaque .res .bagChip { position: absolute; left: calc(100% + 8px); top: 0; height: 100%; border-radius: 999px; padding: 0 22px 0 10px; display: flex; align-items: center; gap: 4px; background: var(--pg); -webkit-backdrop-filter: var(--pgBlur); backdrop-filter: var(--pgBlur); box-shadow: var(--pgEdge); }
      html.glass.phone #plaque .res .bagChip::after { content: '›'; position: absolute; right: 8px; top: 50%; transform: translateY(-54%); font-size: 18px; font-weight: 800; opacity: .8; }`,
};
const SHEET = `
  html.glass.phone #infoPanel { left: 8px; right: 8px; bottom: 8px; width: auto; border: none; border-radius: 34px; background: linear-gradient(180deg, rgba(36, 42, 50, .84), rgba(20, 24, 30, .92)); -webkit-backdrop-filter: blur(22px) saturate(160%); backdrop-filter: blur(22px) saturate(160%); box-shadow: inset 0 1px 0 rgba(255,255,255,.4), inset 0 0 0 1px rgba(255,255,255,.1), 0 18px 50px rgba(0,0,0,.5); }
  /* no handle: the sheet cannot be dragged, and the Paused pill already sits on its top edge */
  html.glass.phone #infoPanel .ph { padding: 22px 16px 6px 20px; background: none; border: none; }
  html.glass.phone #infoPanel .ph h3 { font-size: 28px; font-weight: 800; letter-spacing: -.4px; text-align: left; flex: 1; text-shadow: none; }
  html.glass.phone #infoPanel #closeInfo, html.glass.phone #infoPanel #pBack { width: 36px; height: 36px; min-width: 36px; border-radius: 50%; border: none; background: rgba(255,255,255,.14); box-shadow: inset 0 1px 0 rgba(255,255,255,.35); color: #fff; }
  html.glass.phone #infoPanel .card, html.glass.phone #infoPanel .setRow { border: none; border-radius: 18px; background: rgba(255,255,255,.075); box-shadow: inset 0 1px 0 rgba(255,255,255,.1); }
  html.glass.phone #infoPanel .tabs, html.glass.phone #infoPanel .pfSeg { border-radius: 999px; background: rgba(255,255,255,.08); border: none; box-shadow: inset 0 1px 0 rgba(255,255,255,.14); padding: 3px; }
  html.glass.phone #infoPanel .tabs button, html.glass.phone #infoPanel .pfSeg button, html.glass.phone #infoPanel .pfSort { border-radius: 999px; border: none; }
  html.glass.phone #infoPanel .portrait { border-radius: 50%; }
  html.glass.phone #paused, html.glass.phone .pausePill { border-radius: 999px; }`;
(async () => {
  const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, look: '', expose: 'closeP, endBuildMode' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(1500); await Q.clearCards(p);
  const css = (t) => p.evaluate((t) => { let s = document.getElementById('mockCss'); if (!s) { s = document.createElement('style'); s.id = 'mockCss'; document.head.appendChild(s); } s.textContent = t; }, t);
  for (const k of ['A', 'B']) { await css(BAG[k]); await p.waitForTimeout(300); await Q.clearCards(p); await p.screenshot({ path: path.join(out, `phoneC_bag_${k}.png`) }); console.log('shot bag', k); }
  await css(BAG.A + SHEET);
  for (const [id, n] of [['mSurv', 'people'], ['mBuild', 'build'], ['mTown', 'town'], ['mGuide', 'more']]) { await Q.clearCards(p); await p.waitForTimeout(400); await Q.clearCards(p); await p.click('#' + id); await p.waitForTimeout(600); if (await p.evaluate(() => !!document.querySelector('.evPop.show, #evPop.show, .tipCard.show'))) { await Q.clearCards(p); await p.click('#' + id); await p.waitForTimeout(500); } await p.screenshot({ path: path.join(out, `phoneC_sheet_${n}.png`) }); console.log('shot', n); await p.evaluate(() => { ZH.closeP(); ZH.endBuildMode(true); }); await p.waitForTimeout(250); }
  await Q.clearCards(p); await p.click('#mSurv'); await p.waitForTimeout(500); await p.click('#ib .card[data-sv]'); await p.waitForTimeout(700); await p.screenshot({ path: path.join(out, 'phoneC_sheet_person.png') }); console.log('shot person');
  await b.close();
})();
