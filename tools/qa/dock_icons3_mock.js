// tools/qa/dock_icons3_mock.js — UI chat, 25 Nov (W249; owner: "Maybe use chatgpt to generate something?", "you can go to chatgpt directly",
// "the icon shouldn't be too complex, this is a phone icon"). Dock A with the five icons made in ChatGPT in the simple style
// (assets/ui/dock/*.webp, 168 px; sources in assets/ui/dock/src/). Picture only; nothing in the game changes.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
const ICON = { mExp: 'explore', mSurv: 'people', mTown: 'town', mGuide: 'more', mBuild: 'build' }, DIR = process.env.DOCK_DIR || 'assets/ui/dock', TAG = process.env.DOCK_TAG || '';
const css = `
html.glass.phone #lmenu.dk { left: 12px; right: 12px; height: auto; padding: 10px 10px 8px; border-radius: 32px; justify-content: space-around; align-items: flex-start; gap: 0; }
html.glass.phone #lmenu.dk .lm, html.glass.phone #lmenu.dk #mBuild { position: static; flex: 0 0 auto; width: 62px; height: auto; margin: 0; padding: 0; border: 0; border-radius: 0; background: none !important; box-shadow: none; display: flex; flex-direction: column; align-items: center; gap: 4px; font: 700 11px Manrope, system-ui, sans-serif; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,.6); opacity: 1 !important; filter: none !important; }
html.glass.phone #lmenu.dk #mBuild { order: 9; }
html.glass.phone #lmenu.dk .lm i { width: 56px; height: 56px; border-radius: 13px; overflow: hidden; display: block; box-shadow: 0 3px 8px rgba(0,0,0,.3); }
html.glass.phone #lmenu.dk .lm i img { width: 100%; height: 100%; display: block; }
html.glass.phone #lmenu.dk .lm i { position: relative; } html.glass.phone #lmenu.dk .lm i::after { content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: linear-gradient(180deg, rgba(255,255,255,.2), rgba(255,255,255,0) 45%, rgba(0,0,0,0) 70%, rgba(0,0,0,.14)); box-shadow: inset 0 1px 0 rgba(255,255,255,.35), inset 0 -2px 3px rgba(0,0,0,.15); }
`;
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568]]) {
    const p = await Q.page(b, { w, h, look: '' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(1500);
    for (let i = 0; i < 8; i++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(300); }
    await p.evaluate(([css, I, DIR]) => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); document.getElementById('lmenu').classList.add('dk'); for (const [id, f] of Object.entries(I)) { const i = document.querySelector('#' + id + ' i'); if (i) i.innerHTML = `<img src="${DIR}/${f}.webp" alt="">`; } }, [css, ICON, DIR]);
    await p.waitForTimeout(800); await p.screenshot({ path: path.join(out, `dockicons3${TAG}_${n}.png`) }); await p.close(); }
  await b.close(); })();
