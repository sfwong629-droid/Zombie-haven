// tools/qa/dock_mock.js — UI chat, 25 Nov (W249; owner: "Can we add to change the bottom bar and build to be similar to an iphone app icon? Give me a
// couple mock up for it."). Three mockups on the real town screen, styles put in for the picture only (nothing in the game changes):
//  A  a frosted dock, coloured app icons with the game's stickers and a label under each, Build the lime icon at the end;
//  B  a frosted dock like the iPhone's own, white app icons with the game's coloured stickers, no labels;
//  C  no dock: coloured app icons with the game's stickers floating over the town, labels under, like a home screen row.
// Pictures: runs/ui_samples/dock_<A|B|C>_<size>.png and dock_sheet.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
const COL = { mExp: ['#5aa9ff', '#1f63d6'], mSurv: ['#ff7fae', '#d93d76'], mTown: ['#ffc25a', '#ee8618'], mGuide: ['#a68bff', '#6847dc'], mBuild: ['#dcff7e', '#9fd626'] };
const base = `
html.glass.phone #lmenu.dk { left: 12px; right: 12px; height: auto; padding: 10px 10px 8px; border-radius: 32px; justify-content: space-around; align-items: flex-start; gap: 0; }
html.glass.phone #lmenu.dk .lm, html.glass.phone #lmenu.dk #mBuild { position: static; flex: 0 0 auto; order: 0; width: 62px; height: auto; margin: 0; padding: 0; border: 0; border-radius: 0; background: none !important; box-shadow: none; display: flex; flex-direction: column; align-items: center; gap: 4px; font: 700 11px Manrope, system-ui, sans-serif; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,.6); }
html.glass.phone #lmenu.dk #mBuild { order: 9; }
html.glass.phone #lmenu.dk .lm i { width: 56px; height: 56px; border-radius: 14px; display: grid; place-items: center; box-shadow: inset 0 1px 0 rgba(255,255,255,.55), inset 0 -2px 3px rgba(0,0,0,.18), 0 4px 10px rgba(0,0,0,.28); }
html.glass.phone #lmenu.dk .lm i svg, html.glass.phone #lmenu.dk .lm .zi { width: 36px !important; height: 36px !important; }
html.glass.phone #lmenu.dk .lm.dim, html.glass.phone #lmenu.dk .lm.dim i, html.glass.phone #lmenu.dk .lm.dim svg { opacity: 1 !important; filter: none !important; }
`;
const col = (white) => Object.entries(COL).map(([id, [a, b]]) => `html.glass.phone #lmenu.dk #${id} i { background: ${white && id !== 'mBuild' ? 'linear-gradient(180deg,#ffffff,#e9edf2)' : `linear-gradient(180deg, ${a}, ${b})`}; }`).join('\n');
const V = {
  A: base + col(false) + `html.glass.phone #lmenu.dk .lm i svg { filter: drop-shadow(0 1px 2px rgba(0,0,0,.35)) !important; }`,
  B: base + col(true) + `html.glass.phone #lmenu.dk { padding: 12px 10px; border-radius: 34px; } html.glass.phone #lmenu.dk .lm, html.glass.phone #lmenu.dk #mBuild { font-size: 0; gap: 0; } html.glass.phone #lmenu.dk .lm i { width: 60px; height: 60px; border-radius: 15px; } html.glass.phone #lmenu.dk .lm i svg { width: 42px !important; height: 42px !important; }`,
  C: base + col(false) + `html.glass.phone #lmenu.dk { background: none !important; box-shadow: none !important; border: 0 !important; -webkit-backdrop-filter: none !important; backdrop-filter: none !important; padding: 0 4px; } html.glass.phone #lmenu.dk::before, html.glass.phone #lmenu.dk::after { display: none !important; } html.glass.phone #lmenu.dk .lm i svg { filter: drop-shadow(0 1px 2px rgba(0,0,0,.35)); }`,
};
(async () => { const b = await Q.launch(); const shots = [];
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568]]) {
    const p = await Q.page(b, { w, h, look: '' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(1500);
    for (let i = 0; i < 5; i++) { await p.evaluate(() => { const x = [...document.querySelectorAll('#eventModal button')].find((b) => /no more tips/i.test(b.textContent)); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(300); }
    for (let i = 0; i < 6; i++) { await p.evaluate(() => { try { window.ZH && ZH.S && (ZH.S.introOff = true); } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await p.waitForTimeout(300); }
    await p.screenshot({ path: path.join(out, `dock_now_${n}.png`) }); shots.push([`now_${n}`]);
    for (const [k, css] of Object.entries(V)) {
      await p.evaluate(([css]) => { let s = document.getElementById('dockMock'); if (!s) { s = document.createElement('style'); s.id = 'dockMock'; document.head.appendChild(s); } s.textContent = css; document.getElementById('lmenu').classList.add('dk'); }, [css]); await p.waitForTimeout(400);
      const m = await p.evaluate(() => [...document.querySelectorAll('#lmenu .lm')].map((e) => { const r = e.getBoundingClientRect(); return [e.id, Math.round(r.left), Math.round(r.right), Math.round(r.width), Math.round(r.height)]; }));
      console.log(n, k, JSON.stringify(m));
      await p.screenshot({ path: path.join(out, `dock_${k}_${n}.png`) }); }
    await p.close(); }
  await b.close(); })();
