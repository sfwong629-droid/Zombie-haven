// tools/qa/dock_icons2_mock.js — UI chat, 25 Nov (W249; owner: "the explore with the map is good, but it should be more detailed like apple icon.
// People should be 2, Town to use 1, More to use 1, Build to use 2. But they should all be more detail. The color is poping out too bright too.").
// Dock A with the chosen signs drawn with more detail (shading, layers, a soft shadow) and calmer colours. Picture only; nothing in the game changes.
// Pictures: runs/ui_samples/dockicons2_<size>.png, dockicons2_sheet.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
const BG = { mExp: ['#5d8fcf', '#33639f'], mSurv: ['#c9739a', '#994666'], mTown: ['#d8a25c', '#ab7434'], mGuide: ['#8f7fcf', '#5d4f9f'], mBuild: ['#b5d266', '#7d9d38'] };
const S = (d) => `<svg viewBox="0 0 48 48" width="44" height="44">${d}</svg>`;
const ICONS = {
  // Explore: a folded paper map, three panels shaded, a road, a river, a red pin with its shadow
  mExp: S(`<defs><linearGradient id="mp1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e4e9ef"/></linearGradient>
    <linearGradient id="mp2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9eef4"/><stop offset="1" stop-color="#cfd7e1"/></linearGradient>
    <linearGradient id="pin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7a6b"/><stop offset="1" stop-color="#d13c30"/></linearGradient></defs>
    <path d="M7 13l11-4 12 4 11-4v26l-11 4-12-4-11 4z" fill="rgba(0,0,0,.22)" transform="translate(0 1.6)"/>
    <path d="M7 13l11-4v26l-11 4z" fill="url(#mp1)"/><path d="M18 9l12 4v26l-12-4z" fill="url(#mp2)"/><path d="M30 13l11-4v26l-11 4z" fill="url(#mp1)"/>
    <path d="M9 30c4-1 6-5 10-5s6 4 11 3 8-6 10-7" fill="none" stroke="#f2c14e" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M8 21c3 1 6-1 9 0s5 3 8 2" fill="none" stroke="#7cc2f0" stroke-width="1.8" stroke-linecap="round"/>
    <ellipse cx="31" cy="27.5" rx="3.2" ry="1.2" fill="rgba(0,0,0,.25)"/>
    <path d="M31 27c-3-4.6-5.6-7.6-5.6-10.6a5.6 5.6 0 0 1 11.2 0c0 3-2.6 6-5.6 10.6z" fill="url(#pin)"/><circle cx="31" cy="16.6" r="2.1" fill="#fff"/>`),
  // People: two people, the back one in grey, soft gradient and shadow
  mSurv: S(`<defs><linearGradient id="pp1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e6e2ea"/></linearGradient>
    <linearGradient id="pp2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efe3ea"/><stop offset="1" stop-color="#c9b7c3"/></linearGradient></defs>
    <g fill="rgba(0,0,0,.2)" transform="translate(0 1.5)"><circle cx="18" cy="17" r="6.6"/><path d="M6 39c.8-8 5.6-12.6 12-12.6S29.2 31 30 39z"/></g>
    <circle cx="31" cy="16" r="5.6" fill="url(#pp2)"/><path d="M22 37c.7-7.2 4.4-11 9-11s8.3 3.8 9 11z" fill="url(#pp2)"/>
    <circle cx="18" cy="17" r="6.6" fill="url(#pp1)"/><path d="M6 39c.8-8 5.6-12.6 12-12.6S29.2 31 30 39z" fill="url(#pp1)"/>`),
  // Town: a house with a shaded roof, chimney, a lit window and a door
  mTown: S(`<defs><linearGradient id="rf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e9dfd2"/></linearGradient>
    <linearGradient id="wl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf6ef"/><stop offset="1" stop-color="#e3d6c4"/></linearGradient></defs>
    <path d="M24 8 6 23h4v17h28V23h4z" fill="rgba(0,0,0,.2)" transform="translate(0 1.6)"/>
    <rect x="30" y="10" width="4.4" height="8" rx="1" fill="#efe6da"/>
    <rect x="11" y="22" width="26" height="18" rx="1.5" fill="url(#wl)"/>
    <path d="M24 7.5 5.5 23.5a1.6 1.6 0 0 0 2.2 2.3L24 11.8l16.3 14a1.6 1.6 0 0 0 2.2-2.3z" fill="url(#rf)"/>
    <rect x="15" y="27" width="7" height="6" rx="1" fill="#f6c25a"/><path d="M18.5 27v6M15 30h7" stroke="#d99a2b" stroke-width="1"/>
    <path d="M26 40V30.5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5V40z" fill="#b5844a"/><circle cx="31.4" cy="35" r=".9" fill="#f3d9a6"/>`),
  // More: three raised dots with light and shadow
  mGuide: S(`<defs><radialGradient id="dt" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ddd6f2"/></radialGradient></defs>
    <g fill="rgba(0,0,0,.22)"><circle cx="12" cy="25.6" r="4.6"/><circle cx="24" cy="25.6" r="4.6"/><circle cx="36" cy="25.6" r="4.6"/></g>
    <circle cx="12" cy="24" r="4.6" fill="url(#dt)"/><circle cx="24" cy="24" r="4.6" fill="url(#dt)"/><circle cx="36" cy="24" r="4.6" fill="url(#dt)"/>`),
  // Build: a wooden-handled hammer and a steel wrench crossed
  mBuild: S(`<defs><linearGradient id="st" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f4f6f8"/><stop offset=".5" stop-color="#c9d0d8"/><stop offset="1" stop-color="#9aa4b0"/></linearGradient>
    <linearGradient id="wd" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e0a76a"/><stop offset="1" stop-color="#a8692f"/></linearGradient>
    <linearGradient id="hd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef1f4"/><stop offset="1" stop-color="#9ea8b3"/></linearGradient></defs>
    <g transform="translate(0 1.6)" fill="rgba(0,0,0,.22)"><g transform="rotate(-45 24 24)"><rect x="21.6" y="15" width="4.8" height="27" rx="2.4"/><circle cx="24" cy="11.5" r="7.4"/></g><g transform="rotate(45 24 24)"><rect x="21.5" y="13" width="5" height="29" rx="2.5"/><rect x="13" y="5.5" width="22" height="9" rx="2.4"/></g></g>
    <g transform="rotate(-45 24 24)"><rect x="21.6" y="15" width="4.8" height="27" rx="2.4" fill="url(#st)"/><circle cx="24" cy="11.5" r="7.4" fill="url(#st)"/><path d="M21.8 3.5h4.4v8.4h-4.4z" fill="#7d9d38"/><circle cx="24" cy="38" r="1.5" fill="#8b95a1"/></g>
    <g transform="rotate(45 24 24)"><rect x="21.5" y="13" width="5" height="29" rx="2.5" fill="url(#wd)"/><path d="M22.6 20v19" stroke="#f0c48f" stroke-width="1" opacity=".7"/><rect x="13" y="5.5" width="22" height="9" rx="2.4" fill="url(#hd)"/><rect x="13" y="5.5" width="22" height="2.6" rx="1.3" fill="#ffffff" opacity=".6"/></g>`),
};
const css = `
html.glass.phone #lmenu.dk { left: 12px; right: 12px; height: auto; padding: 10px 10px 8px; border-radius: 32px; justify-content: space-around; align-items: flex-start; gap: 0; }
html.glass.phone #lmenu.dk .lm, html.glass.phone #lmenu.dk #mBuild { position: static; flex: 0 0 auto; width: 62px; height: auto; margin: 0; padding: 0; border: 0; border-radius: 0; background: none !important; box-shadow: none; display: flex; flex-direction: column; align-items: center; gap: 4px; font: 700 11px Manrope, system-ui, sans-serif; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,.6); opacity: 1 !important; filter: none !important; }
html.glass.phone #lmenu.dk #mBuild { order: 9; }
html.glass.phone #lmenu.dk .lm i { position: relative; width: 56px; height: 56px; border-radius: 14px; display: grid; place-items: center; overflow: hidden; box-shadow: inset 0 0 0 .5px rgba(255,255,255,.35), 0 3px 8px rgba(0,0,0,.3); }
html.glass.phone #lmenu.dk .lm i::after { content: ''; position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,0) 48%); pointer-events: none; }
html.glass.phone #lmenu.dk .lm i svg { width: 44px !important; height: 44px !important; filter: none !important; }
` + Object.entries(BG).map(([id, [a, b]]) => `html.glass.phone #lmenu.dk #${id} i { background: linear-gradient(180deg, ${a}, ${b}); }`).join('\n');
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568]]) {
    const p = await Q.page(b, { w, h, look: '' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(1500);
    for (let i = 0; i < 8; i++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(300); }
    await p.evaluate(([css, I]) => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); document.getElementById('lmenu').classList.add('dk'); for (const [id, svg] of Object.entries(I)) { const i = document.querySelector('#' + id + ' i'); if (i) i.innerHTML = svg; } }, [css, ICONS]);
    await p.waitForTimeout(500); await p.screenshot({ path: path.join(out, `dockicons2_${n}.png`) }); await p.close(); }
  await b.close(); })();
