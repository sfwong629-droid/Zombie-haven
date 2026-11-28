// tools/qa/wallet_mock.js — UI chat, 28 Nov (idea 11, Wallet; owner: "then do the wallet"). Mockup only, in the real menu sheet.
// The town's trophies (trophyList: each faction leader beaten, the four seasonal strongholds, Mutant Bosses, crises, Banners, the Convoy) as cards
// like the phone's Wallet: a coloured card each, the sign, the name, the count, how it was earned; not yet earned ones dark and locked.
// A: the Wallet stack (cards overlapping, the top strip of each showing, the newest open at the bottom); B: a two-wide grid of cards like an album;
// C: one big card at a time, swiped sideways, dots under it; D: a card opened: the front with the day it was won, the back's story under it.
// Pictures: runs/ui_samples/wallet_<A..D>.png, wallet_sheet.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, look: '', expose: 'showMore, closeP, trophyList, RADIO_V' }); await Q.newGame(p);
  for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(150); }
  await p.waitForTimeout(4000);
  const T = await p.evaluate(() => { const S = ZH.S; S.fac = S.fac || {}; (S.fac.toll = S.fac.toll || {}).beaten = 1; S.fac.toll.met = true; (S.fac.green = S.fac.green || {}).met = true; S.trophies = [{ k: 'sh_autumn', day: 21 }]; S.bossKills = 2; S.medals = 3; S.banners = [{ route: 'stronghold', day: 9 }, { route: 'ally', day: 14 }];
    return ZH.trophyList().map((t) => ({ ...t })); });
  const COL = ['#b8862b', '#4f9c5e', '#8a5a3b', '#5a6a7a', '#6b5aa6', '#3d3d48', '#7aa35a', '#d0a038', '#c46a2e', '#5f86b8', '#b0303a', '#d9922b', '#4a82c8', '#3fa39a'];
  await p.addStyleTag({ content: `#nfBox{display:none!important}.wl{font-family:-apple-system,"SF Pro Text",system-ui,sans-serif;color:#fff}
    .pass{position:relative;border-radius:16px;padding:14px 16px;box-shadow:0 -2px 8px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.25);overflow:hidden}
    .pass .top{display:flex;align-items:center;gap:10px}.pass .ic{font-size:22px;width:34px;height:34px;border-radius:9px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center}
    .pass .nm{flex:1;font-weight:700;font-size:16px}.pass .nm small{display:block;font-weight:500;font-size:12px;opacity:.75}.pass .n{font-size:22px;font-weight:700}.pass .n small{display:block;font-size:10px;font-weight:600;opacity:.75;text-align:right}
    .pass.lock{background:#2a2b30!important;color:rgba(255,255,255,.45)}.pass.lock .ic{filter:grayscale(1);opacity:.4}
    .pass .how{font-size:13px;opacity:.85;margin-top:14px}.pass .tex{position:absolute;inset:0;background:radial-gradient(120% 80% at 100% 0,rgba(255,255,255,.22),transparent 60%);pointer-events:none}
    .stack .pass{margin-top:-62px}.stack .pass .n{font-size:17px;line-height:34px}.stack .pass:first-child{margin-top:0}.stack .pass.open{margin-top:-40px;padding-bottom:60px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.grid .pass{padding:12px;min-height:120px;display:flex;flex-direction:column;justify-content:space-between}.grid .pass .nm{font-size:14px}
    .big{height:420px;border-radius:20px;padding:22px;display:flex;flex-direction:column}.big .ic{width:64px;height:64px;font-size:40px;border-radius:16px}.big .nm{font-size:24px;margin-top:16px}.big .n{font-size:64px;margin-top:auto}
    .dots{display:flex;gap:6px;justify-content:center;margin-top:12px}.dots i{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.3)}.dots i.on{background:#fff}
    .back{margin-top:12px;border-radius:16px;background:rgba(255,255,255,.08);padding:14px 16px;font-size:14px;line-height:1.45;color:rgba(255,255,255,.85)}.back b{display:block;font-size:12px;text-transform:uppercase;opacity:.6;margin-bottom:4px}` });
  const pass = (t, i, extra = '') => `<div class="pass${t.n ? '' : ' lock'} ${extra}" style="background:linear-gradient(160deg,${COL[i % COL.length]},${COL[i % COL.length]}cc)"><div class="tex"></div><div class="top"><span class="ic">${t.icon}</span><span class="nm">${t.name}<small>${t.sub}</small></span><span class="n">${t.n ? '×' + t.n : '🔒'}</span></div><div class="how">${t.how}</div></div>`;
  const got = T.map((t, i) => [t, i]).filter(([t]) => t.n), all = T.map((t, i) => [t, i]);
  const V = {
    A: `<div class="wl stack">${all.filter(([t]) => t.n).concat(all.filter(([t]) => !t.n).slice(0, 4)).map(([t, i], j, a) => pass(t, i, j === a.length - 1 ? 'open' : '')).join('')}</div>`,
    B: `<div class="wl grid">${all.map(([t, i]) => pass(t, i)).join('')}</div>`,
    C: `<div class="wl">${(() => { const [t, i] = got[0]; return `<div class="pass big" style="background:linear-gradient(160deg,${COL[i]},${COL[i]}aa)"><div class="tex"></div><span class="ic">${t.icon}</span><div class="nm">${t.name}<small style="display:block;font-size:14px;opacity:.75;font-weight:500">${t.sub}</small></div><div style="font-size:14px;opacity:.85;margin-top:12px">${t.how}</div><div class="n">×${t.n}</div><div style="font-size:13px;opacity:.75">First won on day 9</div></div>`; })()}<div class="dots">${got.map((_, j) => `<i class="${j ? '' : 'on'}"></i>`).join('')}${all.filter(([t]) => !t.n).map(() => '<i style="opacity:.4"></i>').join('')}</div></div>`,
    D: `<div class="wl">${(() => { const [t, i] = got[0]; return pass(t, i).replace('<div class="how">', '<div class="how" style="margin-top:22px;font-size:15px">') + `<div class="back"><b>The story</b>The Collector rode his tollbooth-on-wheels up to our gate on day 9 and asked for scrap. We gave him a fight instead. His crown of road signs hangs over the Camp now. Nobody has paid a toll since.</div><div class="back"><b>Won</b>Day 9 · 6 fighters · Marcus got the last hit</div>`; })()}</div>` };
  for (const [k, h] of Object.entries(V)) { await p.evaluate((h) => { ZH.closeP(); ZH.showMore(); document.getElementById('it').textContent = 'Wallet'; document.getElementById('ib').innerHTML = h; }, h); await p.waitForTimeout(400); await p.screenshot({ path: path.join(out, `wallet_${k}.png`) }); }
  await b.close(); console.log('ok');
})();
