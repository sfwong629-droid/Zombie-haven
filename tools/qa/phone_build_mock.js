// tools/qa/phone_build_mock.js — UI chat, 23 Nov (W249). MOCKUP ONLY. Owner on the Build menu built on the work branch (A, folders): "give me a couple more to choose from".
// Three more ways to lay out the same buildings, drawn inside the real sheet from the game's own data (bItem, BFOLD on the branch phone-build-wip):
// B a grid with category chips (every building one tap away), C one long grouped list (all categories in one scroll, with a jump row), D shelves (one sideways row of big cards per category).
// Pictures: runs/ui_samples/phoneJ_build_{B,C,D}.png. Usage: node tools/qa/phone_build_mock.js   (game served on :8765)
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
const DRAW = function (v) {
  const F = ZH.BFOLD, it = (k) => ZH.bItem(k), all = (ks) => ks.map(it).filter(Boolean), ch = '<i class="phChv"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></i>';
  const search = '<label class="phSearch"><span class="phMag"></span><input type="search" placeholder="Build something"></label>';
  const row = (x) => `<div class="phR tall${x.lock ? ' lock' : ''}"><span class="th">${x.pic}</span><span class="tx"><b>${x.name}</b><small>${x.lock ? 'Needs ' + x.lock : x.cost}</small></span>${ch}</div>`;
  let h = '';
  if (v === 'B') { const cur = 'food', xs = all(F.find((f) => f[0] === cur)[2]);
    h = search + `<div class="mChips">${[['sug', 'For you']].concat(F.map((f) => [f[0], f[1]])).map(([k, t]) => `<span class="${k === cur ? 'on' : ''}">${t}</span>`).join('')}</div>`
      + `<div class="mGrid">${xs.map((x) => `<span class="${x.lock ? 'lock' : ''}"><span class="phApp big">${x.pic}</span><b>${x.name}</b><small>${x.lock ? '🔒 ' + x.lock : x.cost}</small></span>`).join('')}</div>`; }
  if (v === 'C') h = search + `<div class="mChips">${F.map((f, i) => `<span class="${i ? '' : 'on'}">${f[1]}</span>`).join('')}</div>`
    + F.slice(0, 3).map((f) => { const xs = all(f[2]); return `<div class="phSec">${f[1]}</div><div class="phCard">${xs.filter((x) => !x.lock).map(row).join('')}${xs.some((x) => x.lock) ? `<div class="phR"><span class="k" style="color:rgba(255,255,255,.55)">${xs.filter((x) => x.lock).length} locked</span><span class="v"></span>${ch}</div>` : ''}</div>`; }).join('');
  if (v === 'D') h = search + [['For your mission', ['barrel', 'tent', 'bonfire', 'medic']]].concat(F.map((f) => [f[1], f[2]])).slice(0, 4).map(([t, ks], i) => `<div class="mShelfT"><b>${t}</b><span>See all</span></div><div class="mShelf">${all(ks).sort((a, b) => !!a.lock - !!b.lock).map((x, j) => `<span class="${x.lock ? 'lock' : ''}${!i && !j ? ' rec' : ''}"><span class="pic">${x.pic}</span><b>${x.name}</b><small>${x.lock ? '🔒 ' + x.lock : x.cost}</small></span>`).join('')}</div>`).join('');
  document.getElementById('ib').innerHTML = `<div class="phBuild mock">${h}</div>`;
  let st = document.getElementById('mCss'); if (!st) { st = document.createElement('style'); st.id = 'mCss'; document.head.appendChild(st); }
  st.textContent = `
  .mChips { display: flex; gap: 6px; margin: 10px -2px 4px; overflow: hidden; } .mChips span { flex: none; height: 36px; padding: 0 14px; border-radius: 18px; display: flex; align-items: center; background: rgba(255,255,255,.1); box-shadow: inset 0 1px 0 rgba(255,255,255,.14); font: 600 13px Manrope, sans-serif; color: rgba(255,255,255,.85); white-space: nowrap; } .mChips span.on { background: rgba(255,255,255,.92); color: #14181e; }
  .mGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px 8px; margin-top: 14px; } .mGrid > span { display: flex; flex-direction: column; align-items: center; gap: 3px; text-align: center; min-width: 0; } .mGrid b { font: 600 13px/1.2 Manrope, sans-serif; margin-top: 4px; } .mGrid small { font: 500 12px Manrope, sans-serif; color: rgba(255,255,255,.62); } .mGrid .lock .phApp, .mGrid .lock b { opacity: .45; }
  html.phone .phApp.big { width: 100px; height: 84px; border-radius: 22px; } html.phone .phApp.big img { width: 92px; height: 72px; }
  .mShelfT { display: flex; justify-content: space-between; align-items: baseline; margin: 18px 4px 8px; } .mShelfT b { font: 800 19px Manrope, sans-serif; letter-spacing: -.2px; } .mShelfT span { font: 600 13px Manrope, sans-serif; color: rgba(255,255,255,.6); }
  .mShelf { display: flex; gap: 10px; margin-right: -14px; overflow: hidden; } .mShelf > span { flex: none; width: 124px; padding: 8px 8px 10px; border-radius: 18px; background: rgba(255,255,255,.09); box-shadow: inset 0 1px 0 rgba(255,255,255,.14); display: flex; flex-direction: column; gap: 2px; }
  .mShelf .pic { height: 78px; display: grid; place-items: center; font-size: 34px; } .mShelf .pic img { width: 104px; height: 78px; object-fit: contain; } .mShelf b { font: 700 14px/1.2 Manrope, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .mShelf small { font: 500 12px Manrope, sans-serif; color: rgba(255,255,255,.62); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mShelf .lock .pic, .mShelf .lock b { opacity: .45; } .mShelf .rec { box-shadow: 0 0 0 2.5px #c6ff4d, inset 0 1px 0 rgba(255,255,255,.14); }`;
};
(async () => {
  const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, look: '', expose: 'showBuild,BFOLD,bItem' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(2500); await Q.clearCards(p);
  for (const v of ['B', 'C', 'D']) { await Q.clearCards(p); await p.evaluate(() => ZH.showBuild()); await p.waitForTimeout(600); await Q.clearCards(p); await p.evaluate(DRAW, v); await p.waitForTimeout(500); await p.screenshot({ path: path.join(out, `phoneJ_build_${v}.png`) }); console.log('shot', v); }
  await b.close();
})();
