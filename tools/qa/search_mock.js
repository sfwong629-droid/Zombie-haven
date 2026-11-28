// tools/qa/search_mock.js — UI chat, 28 Nov (idea 10, Search like the phone's Spotlight; owner: "Do search"). Mockup only, over the real town.
// What it finds: people (picture, job, health count), buildings in town, items in the stash, Guide pages, messages, places on the map.
// A: the phone's Spotlight: pull down on the town, the town blurs, the search field on top with the keyboard, a Top hit, then results by kind;
// B: a search field on top of More's app grid, results in the sheet; C: before typing: Suggestions (apps, who needs you, recent searches);
// D: a small "Search" pill above the dock, like the phone's home screen, a tap opens A.
// Pictures: runs/ui_samples/search_<A..D>.png, search_sheet.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, look: '', expose: 'pplFace, appTile, showMore, closeP, DEFS, ITEMS, GUIDE, world, FACTIONS' }); await Q.newGame(p);
  for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(150); }
  await p.waitForTimeout(4500);
  const D = await p.evaluate(() => { const S = ZH.S; S.sv[0].hp = Math.round(S.sv[0].maxHp * .4 || 40);
    const q = S.sv[0].name.slice(0, 2).toLowerCase();
    const hp = (s) => `${Math.round(s.hp)}/${Math.round(s.maxHp || 100)}`;
    const ppl = S.sv.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 2).map((s) => ({ face: ZH.pplFace(s), name: s.name, sub: s.job + ' · ' + hp(s) }));
    const bld = [...new Set(ZH.world.buildings.map((b) => b.type))].map((t) => ZH.DEFS[t] && ZH.DEFS[t].name).filter(Boolean);
    const items = Object.keys(S.inv || {}).filter((id) => ZH.ITEMS[id]).map((id) => ZH.ITEMS[id].name);
    const guide = (ZH.GUIDE || []).map((g) => g.t || g.title || g.name || (Array.isArray(g) ? g[0] : '')).filter((x) => typeof x === 'string' && x);
    const gm = (ZH.GUIDE || []).map((g) => g.t || g.title || g.name || '').find((t) => typeof t === 'string' && t.toLowerCase().includes(q));
    return { gm, q, ppl, bld, items, guide, hurt: ZH.pplFace(S.sv[0]), hurtN: S.sv[0].name, hurtHp: hp(S.sv[0]),
      tiles: Object.fromEntries(['people', 'town', 'build', 'explore', 'moMsg', 'moGuide', 'moJobs', 'moFm'].map((k) => [k, ZH.appTile(k, 26)])) }; });
  console.log(JSON.stringify({ q: D.q, bld: D.bld, items: D.items.slice(0, 6), guide: D.guide.slice(0, 6) }));
  await p.addStyleTag({ content: `#nfBox,#lpIsl{display:none!important}.sW{position:fixed;inset:0;z-index:9999;font-family:-apple-system,"SF Pro Text",system-ui,sans-serif;color:#fff}
    .sDim{position:absolute;inset:0;background:rgba(10,12,16,.45);-webkit-backdrop-filter:blur(22px) saturate(1.3);backdrop-filter:blur(22px) saturate(1.3)}
    .sIn{position:absolute;left:12px;right:12px;top:54px;bottom:0;overflow:hidden}
    .sF{display:flex;align-items:center;gap:8px;height:40px;border-radius:12px;background:rgba(255,255,255,.14);padding:0 12px;font-size:17px}.sF i{opacity:.6;font-style:normal}.sF .cur{width:2px;height:20px;background:#5aa0ff;margin-left:-6px}.sF .x{margin-left:auto;opacity:.55}
    .sTop{display:flex;align-items:center}.sTop .sF{flex:1}.sTop span{margin-left:12px;color:#5aa0ff;font-size:17px}
    .sH{font-size:13px;font-weight:600;color:rgba(255,255,255,.6);margin:16px 6px 6px;text-transform:uppercase;display:flex;justify-content:space-between}.sH em{font-style:normal;text-transform:none;color:#5aa0ff}
    .sC{border-radius:14px;background:rgba(255,255,255,.1);overflow:hidden}.sR{display:flex;align-items:center;gap:12px;padding:9px 12px;min-height:44px;border-bottom:1px solid rgba(255,255,255,.08)}.sR:last-child{border:0}
    .sR .t{flex:1;min-width:0}.sR b{display:block;font-size:16px;font-weight:600}.sR small{display:block;font-size:13px;color:rgba(255,255,255,.6)}.sR .ic{width:36px;height:36px;border-radius:9px;overflow:hidden;flex:none;position:relative;display:flex;align-items:center;justify-content:center}.sR .ic .apT{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
    .sR .face{width:36px;height:36px;flex:none}.sR .face > *{width:36px!important;height:36px!important}.sR .go{font-size:14px;color:#c9f26b;font-weight:600}
    .sBig{display:flex;align-items:center;gap:14px;padding:14px}.sBig .face,.sBig .face > *{width:56px!important;height:56px!important}.sBig b{font-size:20px}
    .kb{position:absolute;left:0;right:0;bottom:0;height:291px;background:rgba(40,42,46,.94);padding:8px 3px 0}.kb div{display:flex;justify-content:center;gap:6px;margin-bottom:11px}.kb span{height:42px;min-width:32px;border-radius:5px;background:rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;font-size:21px}.kb .w{min-width:180px;font-size:15px}.kb .g{background:rgba(255,255,255,.14);min-width:44px;font-size:15px}.kb .go{background:#5aa0ff;min-width:88px;font-size:15px}
    .sug{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:12px 4px}.sug span{display:flex;flex-direction:column;align-items:center;gap:5px;font-size:12px}.sug .ic{width:56px;height:56px;border-radius:13px;overflow:hidden;position:relative}.sug .ic .apT{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
    .pill{position:absolute;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:16px;background:rgba(60,62,66,.55);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);font-family:-apple-system,system-ui,sans-serif;font-size:14px;color:#fff;font-weight:500;z-index:9999;box-shadow:0 2px 10px rgba(0,0,0,.25)}` });
  const mag = (c = '#fff', z = 16) => `<svg viewBox="0 0 24 24" width="${z}" height="${z}" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20 20"/></svg>`;
  const field = (t, cur = true) => `<div class="sF">${mag('rgba(255,255,255,.6)')}${t ? `<span>${t}</span>` : '<i>Search the Haven</i>'}${cur ? '<span class="cur"></span>' : ''}${t ? '<span class="x">ⓧ</span>' : ''}</div>`;
  const kb = `<div class="kb"><div>${'qwertyuiop'.split('').map((c) => `<span>${c}</span>`).join('')}</div><div>${'asdfghjkl'.split('').map((c) => `<span>${c}</span>`).join('')}</div><div><span class="g">⇧</span>${'zxcvbnm'.split('').map((c) => `<span>${c}</span>`).join('')}<span class="g">⌫</span></div><div><span class="g">123</span><span class="w">space</span><span class="go">search</span></div></div>`;
  const row = (ic, t, s, go = '') => `<div class="sR">${ic}<span class="t"><b>${t}</b><small>${s}</small></span>${go ? `<span class="go">${go}</span>` : ''}</div>`;
  const tic = (k) => `<span class="ic">${D.tiles[k]}</span>`, face = (f) => `<span class="face">${f}</span>`;
  const Q1 = D.q[0].toUpperCase() + D.q[1];
  const hi = (s) => s.replace(new RegExp('(' + D.q + ')', 'i'), '<u style="text-decoration:none;color:#fff;font-weight:700">$1</u>');
  const P = D.ppl[0];
  const results = `<div class="sH">Top hit</div><div class="sC"><div class="sR sBig">${face(P.face)}<span class="t"><b>${P.name}</b><small>${P.sub} · hurt</small></span><span class="go">Open</span></div></div>
    <div class="sH">People <em>Show all</em></div><div class="sC">${D.ppl.slice(1).map((x) => row(face(x.face), x.name, x.sub)).join('') || row(tic('people'), 'Everyone named “' + Q1 + '…”', 'People')}</div>
    <div class="sH">In town</div><div class="sC">${row(tic('town'), 'Camp', 'Building · ' + P.name + ' works here', '')}${row(tic('explore'), 'The Map', 'Explore · the valley')}</div>
    <div class="sH">Guide</div><div class="sC">${row(tic('moGuide'), D.gm || 'Making friends', 'Guide')}</div>`;
  const V = {
    A: `<div class="sW"><div class="sDim"></div><div class="sIn"><div class="sTop">${field(Q1)}<span>Cancel</span></div>${results}</div>${kb}</div>`,
    B: null,
    C: `<div class="sW"><div class="sDim"></div><div class="sIn"><div class="sTop">${field('')}<span>Cancel</span></div>
      <div class="sH">Suggestions</div><div class="sug">${[['people', 'People'], ['build', 'Build'], ['moMsg', 'Messages'], ['explore', 'Explore']].map(([k, t]) => `<span><span class="ic">${D.tiles[k].replace('class="apT"', 'class="apT" ')}</span>${t}</span>`).join('')}</div>
      <div class="sH">Needs you</div><div class="sC">${row(face(D.hurt), D.hurtN + ' is hurt', 'Health ' + D.hurtHp + ' · at the Camp', 'Find')}${row(tic('build'), 'Build a Rain Barrel', 'Your mission', 'Go')}</div>
      <div class="sH">Recent <em>Clear</em></div><div class="sC">${row(`<span class="ic">${mag('rgba(255,255,255,.7)', 20)}</span>`, 'Crowbar', '')}${row(`<span class="ic">${mag('rgba(255,255,255,.7)', 20)}</span>`, 'Greenwater', '')}</div></div>${kb}</div>`,
    D: `<div class="pill" id="pillX">${mag('#fff', 14)} Search</div>` };
  // A
  for (const k of ['A', 'C']) { await p.evaluate((h) => { document.querySelectorAll('.sW,.pill').forEach((e) => e.remove()); document.body.insertAdjacentHTML('beforeend', h); }, V[k]); await p.waitForTimeout(300); await p.screenshot({ path: path.join(out, `search_${k}.png`) }); }
  // B: in More, a field over the grid, results under it
  await p.evaluate((h) => { document.querySelectorAll('.sW,.pill').forEach((e) => e.remove()); ZH.closeP(); ZH.showMore(); const ib = document.getElementById('ib'); ib.insertAdjacentHTML('afterbegin', `<div class="sW" style="position:static;z-index:auto;margin:2px 2px 4px">${h}</div>`); }, field(Q1));
  await p.evaluate((r) => { const g = document.querySelector('#ib .moGrid'); g.style.display = 'none'; document.querySelector('#ib .sW').insertAdjacentHTML('beforeend', r); }, results);
  await p.waitForTimeout(300); await p.screenshot({ path: path.join(out, 'search_B.png') });
  // D: the pill above the dock
  await p.evaluate((h) => { ZH.closeP(); document.querySelectorAll('.sW,.pill').forEach((e) => e.remove()); document.body.insertAdjacentHTML('beforeend', h); const d = document.querySelector('#mSurv .dkI').getBoundingClientRect(); document.getElementById('pillX').style.top = (d.top - 52) + 'px'; }, V.D);
  await p.waitForTimeout(300); await p.screenshot({ path: path.join(out, 'search_D.png') });
  await b.close(); console.log('ok');
})();
