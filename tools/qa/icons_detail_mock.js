// tools/qa/icons_detail_mock.js — UI chat, 27 Nov (owner: "Can we keep those similar simple line style but a little more detailed").
// Mockup only. The dock's five and More's six app icons as white line signs, a little more detail each, on the calm colours (B) and More's colours (A).
// Pictures: runs/ui_samples/icondet_*.png, icondet_sheet.png, icondet_big.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
const gear = (() => { let d = ''; const n = 8; for (let i = 0; i < n * 4; i++) { const a = (i / (n * 4)) * Math.PI * 2 - Math.PI / 2, r = (i % 4 < 2) ? 8.6 : 6.6; d += (i ? 'L' : 'M') + (12 + r * Math.cos(a + Math.PI / (n * 4))).toFixed(2) + ' ' + (12 + r * Math.sin(a + Math.PI / (n * 4))).toFixed(2); } return `<path d="${d}z"/><circle cx="12" cy="12" r="2.8"/>`; })();
const SIMPLE = {
  explore: '<path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  people: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5"/><circle cx="16.5" cy="9" r="2.6"/><path d="M15.6 14.1c2.6-.2 4.5 1.3 5.1 4.4"/>',
  town: '<path d="M3.5 11L12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>',
  more: '<circle cx="6" cy="12" r="1.7" fill="#fff" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="#fff" stroke="none"/><circle cx="18" cy="12" r="1.7" fill="#fff" stroke="none"/>',
  build: '<path d="M13 5.5l2-2 5.5 5.5-2 2"/><path d="M11.5 7l5.5 5.5"/><path d="M14.2 9.8L5.6 18.4a1.6 1.6 0 0 1-2.3-2.3l8.6-8.6"/>' };
const DOT = (x, y, r = 1) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="none"/>`;
const DET = {
  explore: '<path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/><path d="M4.8 16.2c1.6-.4 2.6-1.4 3.8-1.2s2 1 3.2.4" stroke-dasharray="1.1 1.5"/><path d="M17.6 7.2a2.1 2.1 0 0 1 2.1 2.1c0 1.6-2.1 3.4-2.1 3.4s-2.1-1.8-2.1-3.4a2.1 2.1 0 0 1 2.1-2.1z"/>' + DOT(17.6, 9.3, .7),
  people: '<circle cx="9.5" cy="8.2" r="3.3"/><path d="M6.4 7.4c1.1-1.7 3.9-2.3 6.3-.6"/><path d="M3.5 20v-.8c0-3.1 2.6-5.2 6-5.2s6 2.1 6 5.2v.8"/><path d="M8 14.2l1.5 1.9 1.5-1.9"/><circle cx="17.2" cy="7.6" r="2.5"/><path d="M16.4 12.3c2.7-.3 4.9 1.4 4.9 4.3v.9"/>',
  town: '<path d="M2.8 11.6L12 4l9.2 7.6"/><path d="M16 6.4V4.2h2.2v4"/><path d="M5 10.2v9.3h14v-9.3"/><path d="M7.5 19.5v-5.2h3.6v5.2"/>' + DOT(10.1, 17, .6) + '<rect x="13.2" y="12" width="3.8" height="3.3" rx=".5"/><path d="M15.1 12v3.3M13.2 13.65h3.8"/><path d="M2 19.5h20"/>',
  more: '<rect x="2.8" y="8.2" width="18.4" height="7.6" rx="3.8"/>' + DOT(7.5, 12, 1.25) + DOT(12, 12, 1.25) + DOT(16.5, 12, 1.25),
  build: '<g transform="rotate(38 12 12)"><path d="M9.2 3.2h8.6a1 1 0 0 1 1 1v2.4a1 1 0 0 1-1 1H9.2z"/><path d="M9.2 3.9C6.8 3.4 4.9 4.1 3.8 5.9c1.7-.4 3.6-.1 5.4.9"/><path d="M12.4 7.6h3v12a1.5 1.5 0 0 1-3 0z"/><path d="M12.4 15.2h3M12.4 17.4h3"/></g>',
  moMsg: '<path d="M4 4.8h16a1.6 1.6 0 0 1 1.6 1.6v9a1.6 1.6 0 0 1-1.6 1.6H10.2l-4.7 3.6V17H4a1.6 1.6 0 0 1-1.6-1.6v-9A1.6 1.6 0 0 1 4 4.8z"/>' + DOT(8, 10.9, 1.1) + DOT(12, 10.9, 1.1) + DOT(16, 10.9, 1.1),
  moFm: '<rect x="2.8" y="8" width="18.4" height="12" rx="2.5"/><path d="M7 8l9.5-4.6"/><circle cx="8.6" cy="14" r="3.2"/>' + DOT(8.6, 14, 1) + '<path d="M14.2 11.8h4.3M14.2 14.2h4.3M14.2 16.6h2.6"/>',
  moJobs: '<rect x="2.8" y="7.5" width="18.4" height="12.2" rx="2.5"/><path d="M9 7.5V5.6A1.6 1.6 0 0 1 10.6 4h2.8A1.6 1.6 0 0 1 15 5.6v1.9"/><path d="M2.8 12.6h7.6M13.6 12.6h7.6"/><rect x="10.4" y="11" width="3.2" height="3.2" rx=".6"/>',
  moGuide: '<path d="M12 6.6C10 5 7 4.5 3.2 5v13.4c3.8-.5 6.8 0 8.8 1.6 2-1.6 5-2.1 8.8-1.6V5C17 4.5 14 5 12 6.6z"/><path d="M12 6.6V20"/><path d="M5.8 9.2h3.6M5.8 11.8h3.6M14.6 9.2h3.6M14.6 11.8h3.6M14.6 14.4h2.4"/>',
  moLog: '<rect x="4.6" y="3" width="14.8" height="18" rx="2.5"/><path d="M9.5 3v-.2M14.5 3v-.2"/>' + DOT(8.4, 8.4, .95) + DOT(8.4, 12.2, .95) + DOT(8.4, 16, .95) + '<path d="M11 8.4h5.2M11 12.2h5.2M11 16h3.6"/>',
  moSet: gear };
const B = { explore: '#7593a3', people: '#ad8478', town: '#bea883', more: '#8885a2', build: '#86946c', moMsg: '#86946c', moFm: '#bea883', moJobs: '#ad8478', moGuide: '#7593a3', moLog: '#8885a2', moSet: '#8d8f93' };
const A = { explore: '#4a82c8', people: '#c75f80', town: '#cf9a3d', more: '#8373bd', build: '#cb7a42', moMsg: '#4f9c5e', moFm: '#cf9a3d', moJobs: '#cb7a42', moGuide: '#4a82c8', moLog: '#8373bd', moSet: '#777f87' };
const sh = (h, k) => { const n = parseInt(h.slice(1), 16), f = (c) => Math.max(0, Math.min(255, Math.round(c * k))); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, '0')).join(''); };
const tile = (k, sg, pal, px, sw) => `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,${sh(pal[k], 1.12)},${sh(pal[k], .8)})"><svg viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" stroke="#fff" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${sg[k]}</svg></span>`;
(async () => { const b = await Q.launch();
  /* big tiles, to see the drawing */
  const big = await b.newPage({ viewport: { width: 1060, height: 560 } });
  const row = (sg, pal, lab) => `<div style="display:flex;gap:18px;align-items:center;margin:10px 0"><div style="width:120px;color:#ddd;font:700 16px sans-serif">${lab}</div>${Object.keys(DET).map((k) => `<div style="position:relative;width:64px;height:64px;border-radius:15px;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 3px 8px rgba(0,0,0,.35);${sg[k] ? '' : 'visibility:hidden'}">${sg[k] ? tile(k, sg, pal, 36, 1.6) : ''}</div>`).join('')}</div>`;
  await big.setContent(`<body style="margin:0;padding:18px;background:#1e2125">${row(SIMPLE, B, 'Simple')}${row(DET, B, 'Detailed, B')}${row(DET, A, 'Detailed, A')}<div style="display:flex;gap:18px;margin-left:138px;color:#aaa;font:600 12px sans-serif">${['Explore', 'People', 'Town', 'More', 'Build', 'Messages', 'Moth FM', 'Jobs', 'Guide', 'Event log', 'Settings'].map((t) => `<div style="width:64px;text-align:center">${t}</div>`).join('')}</div></body>`);
  await big.screenshot({ path: path.join(out, 'icondet_big.png'), clip: { x: 0, y: 0, width: 1060, height: 330 } });
  /* in the game */
  const p = await Q.page(b, { w: 390, h: 844, look: '', expose: 'showMore, closeP' }); await Q.newGame(p);
  for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(150); }
  for (const [tag, pal] of [['B', B], ['A', A]]) {
    await p.evaluate(([dock, more]) => {
      [['mExp', 'explore'], ['mSurv', 'people'], ['mTown', 'town'], ['mGuide', 'more'], ['mBuild', 'build']].forEach(([id, k]) => { const s = document.querySelector('#' + id + ' .dkI'); if (s) s.innerHTML = dock[k]; });
      ZH.closeP(); ZH.showMore(); Object.entries(more).forEach(([id, h]) => { const t = document.querySelector('#' + id + ' .moTile'); if (t) { const bd = t.querySelector('.moBdg'); t.innerHTML = h + (bd ? bd.outerHTML : ''); t.style.overflow = 'visible'; t.firstChild.style.borderRadius = '14px'; } });
    }, [Object.fromEntries(['explore', 'people', 'town', 'more', 'build'].map((k) => [k, tile(k, DET, pal, 30, 1.7)])), Object.fromEntries(['moMsg', 'moFm', 'moJobs', 'moGuide', 'moLog', 'moSet'].map((k) => [k, tile(k, DET, pal, 34, 1.6)]))]);
    await p.waitForTimeout(600); await p.screenshot({ path: path.join(out, `icondet_${tag}_more.png`) });
    await p.evaluate(() => ZH.closeP()); await p.waitForTimeout(500); await p.screenshot({ path: path.join(out, `icondet_${tag}_dock.png`) });
  }
  await b.close(); console.log('ok');
})();
