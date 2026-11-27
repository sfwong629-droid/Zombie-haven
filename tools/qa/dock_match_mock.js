// tools/qa/dock_match_mock.js — UI chat, 27 Nov (owner: "The more town and people and building icon is not similar to the one inside more.
// Give me a mark up of what it would look like to match what is inside more"). Mockup only, nothing in the game changes.
// Now: the dock's painted icons and More's app icons. A: the dock drawn like More (white line sign on a coloured gradient tile), More's colours.
// B: the same, both in the dock's calmer colours (the cool scheme). Pictures: runs/ui_samples/dockmatch_*.png, dockmatch_sheet.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
const SG = {
  explore: '<path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  people: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5"/><circle cx="16.5" cy="9" r="2.6"/><path d="M15.6 14.1c2.6-.2 4.5 1.3 5.1 4.4"/>',
  town: '<path d="M3.5 11L12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>',
  more: '<circle cx="6" cy="12" r="1.7" fill="#fff" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="#fff" stroke="none"/><circle cx="18" cy="12" r="1.7" fill="#fff" stroke="none"/>',
  build: '<path d="M13 5.5l2-2 5.5 5.5-2 2"/><path d="M11.5 7l5.5 5.5"/><path d="M14.2 9.8L5.6 18.4a1.6 1.6 0 0 1-2.3-2.3l8.6-8.6"/>' };
const A = { explore: ['#5d9be0', '#3369b0'], people: ['#df7f9c', '#b04f6e'], town: ['#e0b04f', '#b5832a'], more: ['#9a8ad0', '#6b5aa6'], build: ['#e3955a', '#b8642c'] };
const cool = (h, k) => { const n = parseInt(h.slice(1), 16), f = (c) => Math.max(0, Math.min(255, Math.round(c * k))); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, '0')).join(''); };
const CB = { explore: '#7593a3', people: '#ad8478', town: '#bea883', more: '#8885a2', build: '#86946c' };
const B = Object.fromEntries(Object.entries(CB).map(([k, c]) => [k, [cool(c, 1.12), cool(c, .8)]]));
const MB = { moMsg: '#86946c', moFm: '#bea883', moJobs: '#ad8478', moGuide: '#7593a3', moLog: '#8885a2', moSet: '#8d8f93' };
(async () => { const b = await Q.launch(); const shots = [];
  const p = await Q.page(b, { w: 390, h: 844, look: '', expose: 'showMore, closeP' }); await Q.newGame(p);
  for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(150); }
  const snap = async (tag, dock, more) => {
    await p.evaluate(([SG, dock, more]) => {
      [['mExp', 'explore'], ['mSurv', 'people'], ['mTown', 'town'], ['mGuide', 'more'], ['mBuild', 'build']].forEach(([id, k]) => { const s = document.querySelector('#' + id + ' .dkI'); if (!s) return; if (!s.dataset.orig) s.dataset.orig = s.innerHTML;
        s.innerHTML = dock ? `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,${dock[k][0]},${dock[k][1]})"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${SG[k]}</svg></span>` : s.dataset.orig; });
      ZH.closeP(); ZH.showMore();
      if (more) Object.entries(more).forEach(([id, c]) => { const t = document.querySelector('#' + id + ' .moTile'); if (t) { t.style.setProperty('--a1', c[0]); t.style.setProperty('--a2', c[1]); } });
    }, [SG, dock, more]); await p.waitForTimeout(700);
    const f = path.join(out, `dockmatch_${tag}_more.png`); await p.screenshot({ path: f }); shots.push(f);
    await p.evaluate(() => ZH.closeP()); await p.waitForTimeout(600); const g = path.join(out, `dockmatch_${tag}_dock.png`); await p.screenshot({ path: g }); shots.push(g); };
  await snap('now', null, null);
  await snap('A', A, null);
  await snap('B', B, Object.fromEntries(Object.entries(MB).map(([k, c]) => [k, [cool(c, 1.12), cool(c, .8)]])));
  await b.close(); console.log(shots.join('\n'));
})();
