// tools/qa/dock_icons_mock.js — UI chat, 25 Nov (W249; owner: "A is ok, can we do some different icon picture for them?"). Dock A (the frosted dock,
// coloured app icons, a label under each) with three sets of new signs, drawn here in SVG for the picture only (nothing in the game changes):
//  1 Line: thin white outlines like the phone's own app signs (compass, two people, house, three dots, hammer);
//  2 Solid: bold white shapes (folded map, two people, a fort with a gate, a gear, hammer and wrench crossed);
//  3 Survival: white shapes from the game's world (binoculars, three survivors, a watchtower with a flag, the field journal, a brick wall).
// Pictures: runs/ui_samples/dockicons_<1|2|3>_phone.png, dockicons_sheet.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
const COL = { mExp: ['#5aa9ff', '#1f63d6', '#174fae'], mSurv: ['#ff7fae', '#d93d76', '#b52d5f'], mTown: ['#ffc25a', '#ee8618', '#c86c0c'], mGuide: ['#a68bff', '#6847dc', '#5233bd'], mBuild: ['#dcff7e', '#9fd626', '#6f9c12'] };
const L = (d) => `<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const F = (d) => `<svg viewBox="0 0 24 24" width="36" height="36" fill="#fff">${d}</svg>`;
const SETS = {
  1: { mExp: L('<circle cx="12" cy="12" r="9"/><path d="M15.6 8.4 13.4 13.4 8.4 15.6 10.6 10.6z" fill="#fff"/>'),
       mSurv: L('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5c.6-3.3 2.8-5.2 5.5-5.2s4.9 1.9 5.5 5.2"/><circle cx="16.8" cy="9" r="2.5"/><path d="M15.8 14.3c2.6-.3 4.5 1.4 4.9 4.4"/>'),
       mTown: L('<path d="M3.5 11.5 12 4l8.5 7.5"/><path d="M6 10v9.5h12V10"/><path d="M10 19.5V14h4v5.5"/>'),
       mGuide: L('<circle cx="6" cy="12" r="1.3" fill="#fff"/><circle cx="12" cy="12" r="1.3" fill="#fff"/><circle cx="18" cy="12" r="1.3" fill="#fff"/>'),
       mBuild: L('<path d="M13.5 9.5 4.6 18.4a1.5 1.5 0 0 0 2.1 2.1l8.9-8.9"/><path d="M11 6.5 14.5 3l6.5 6.5-3.5 3.5-2-2-1.5 1.5-2.5-2.5 1.5-1.5z"/>') },
  2: { mExp: F('<path d="M3 6.2 8.8 4l6.4 2.2L21 4v13.8L15.2 20l-6.4-2.2L3 20z"/><path d="M8.8 4v13.8M15.2 6.2V20" stroke="var(--cut)" stroke-width="1.4"/><circle cx="15" cy="10" r="2.6" fill="var(--cut)"/>'),
       mSurv: F('<circle cx="16.5" cy="8" r="2.7" opacity=".7"/><path d="M12.5 19c.4-3.3 2-5.4 4-5.4s3.6 2.1 4 5.4z" opacity=".7"/><circle cx="9" cy="7.5" r="3.4"/><path d="M2.8 20c.5-4 3-6.6 6.2-6.6s5.7 2.6 6.2 6.6z"/>'),
       mTown: F('<path d="M3 21V8h2.5v2H8V8h2.5v2h3V8H16v2h2.5V8H21v13z"/><path d="M9.5 21v-4.2a2.5 2.5 0 0 1 5 0V21z" fill="var(--cut)"/>'),
       mGuide: F('<circle cx="12" cy="12" r="7.6" fill="none" stroke="#fff" stroke-width="3.4" stroke-dasharray="3 2.95"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2.4" fill="var(--cut)"/>'),
       mBuild: F('<g transform="rotate(-45 12 12)"><rect x="10.9" y="8" width="2.2" height="13.5" rx="1.1"/><circle cx="12" cy="6.2" r="3.6"/><rect x="11" y="1.8" width="2" height="4.6" fill="var(--cut)"/></g><g transform="rotate(45 12 12)"><rect x="10.8" y="7" width="2.4" height="14.5" rx="1.2"/><rect x="6.6" y="3" width="10.8" height="4.6" rx="1.3"/></g>') },
  3: { mExp: F('<rect x="3.5" y="7" width="6" height="7" rx="1.5"/><rect x="14.5" y="7" width="6" height="7" rx="1.5"/><rect x="9" y="9" width="6" height="4"/><circle cx="6.8" cy="15.5" r="4.3"/><circle cx="17.2" cy="15.5" r="4.3"/><circle cx="6.8" cy="15.5" r="2.2" fill="var(--cut)"/><circle cx="17.2" cy="15.5" r="2.2" fill="var(--cut)"/>'),
       mSurv: F('<circle cx="5.5" cy="10" r="2.3" opacity=".75"/><path d="M1.6 19.5c.3-3 1.8-5 3.9-5s3.6 2 3.9 5z" opacity=".75"/><circle cx="18.5" cy="10" r="2.3" opacity=".75"/><path d="M14.6 19.5c.3-3 1.8-5 3.9-5s3.6 2 3.9 5z" opacity=".75"/><circle cx="12" cy="8" r="3"/><path d="M6.8 20.5c.4-4 2.5-6.5 5.2-6.5s4.8 2.5 5.2 6.5z"/><path d="M9.1 7.2c.6-2.2 5.2-2.2 5.8 0z" fill="var(--cut)"/>'),
       mTown: F('<path d="M5.5 9 12 3.5 18.5 9z"/><rect x="7" y="9" width="10" height="5" rx=".6"/><rect x="9.6" y="10.3" width="4.8" height="2.4" fill="var(--cut)"/><path d="M8 14 6 21.5M16 14l2 7.5M8.6 16.5l7.1 3.6M15.4 16.5l-7.1 3.6" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><path d="M12 3.5V1" stroke="#fff" stroke-width="1.3"/><path d="M12 1h4l-1.2 1.2L16 3.4h-4z"/>'),
       mGuide: F('<rect x="5" y="3" width="14" height="18.5" rx="2"/><rect x="5" y="3" width="3" height="18.5" rx="1" fill="var(--cut)" opacity=".55"/><path d="M14 3v7l1.8-1.4L17.6 10V3z" fill="var(--cut)"/><rect x="10" y="12.5" width="6.5" height="1.6" rx=".8" fill="var(--cut)" opacity=".6"/><rect x="10" y="15.5" width="5" height="1.6" rx=".8" fill="var(--cut)" opacity=".6"/>'),
       mBuild: F('<rect x="2.5" y="15.5" width="9" height="5" rx=".8"/><rect x="12.5" y="15.5" width="9" height="5" rx=".8"/><rect x="7.5" y="9.5" width="9" height="5" rx=".8"/><rect x="2.5" y="9.5" width="4" height="5" rx=".8"/><rect x="17.5" y="9.5" width="4" height="5" rx=".8"/><rect x="2.5" y="3.5" width="9" height="5" rx=".8" opacity=".55"/><rect x="12.5" y="3.5" width="9" height="5" rx=".8"/>') },
};
const css = `
html.glass.phone #lmenu.dk { left: 12px; right: 12px; height: auto; padding: 10px 10px 8px; border-radius: 32px; justify-content: space-around; align-items: flex-start; gap: 0; }
html.glass.phone #lmenu.dk .lm, html.glass.phone #lmenu.dk #mBuild { position: static; flex: 0 0 auto; width: 62px; height: auto; margin: 0; padding: 0; border: 0; border-radius: 0; background: none !important; box-shadow: none; display: flex; flex-direction: column; align-items: center; gap: 4px; font: 700 11px Manrope, system-ui, sans-serif; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,.6); opacity: 1 !important; filter: none !important; }
html.glass.phone #lmenu.dk #mBuild { order: 9; }
html.glass.phone #lmenu.dk .lm i { width: 56px; height: 56px; border-radius: 14px; display: grid; place-items: center; box-shadow: inset 0 1px 0 rgba(255,255,255,.55), inset 0 -2px 3px rgba(0,0,0,.18), 0 4px 10px rgba(0,0,0,.28); }
html.glass.phone #lmenu.dk .lm i svg { width: 34px !important; height: 34px !important; filter: drop-shadow(0 1px 1px rgba(0,0,0,.2)); }
` + Object.entries(COL).map(([id, [a, b, c]]) => `html.glass.phone #lmenu.dk #${id} i { background: linear-gradient(180deg, ${a}, ${b}); --cut: ${c}; }`).join('\n');
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568]]) {
    const p = await Q.page(b, { w, h, look: '' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(1500);
    for (let i = 0; i < 8; i++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(300); }
    await p.evaluate((css) => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); document.getElementById('lmenu').classList.add('dk'); }, css);
    for (const [k, set] of Object.entries(SETS)) {
      await p.evaluate((set) => { for (const [id, svg] of Object.entries(set)) { const i = document.querySelector('#' + id + ' i'); if (i) i.innerHTML = svg; } }, set); await p.waitForTimeout(400);
      await p.screenshot({ path: path.join(out, `dockicons_${k}_${n}.png`) }); }
    await p.close(); }
  await b.close(); })();
