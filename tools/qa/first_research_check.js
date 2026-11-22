// tools/qa/first_research_check.js — 3D.300 (overnight branch, W183 first-30-minute fix 6): a guided first research.
// A new game gets a Workbench: its starter notes must cover the cheapest project and say so on the radio; the first project then needs no
// scrap (it starts with 0 scrap in the stash); the second project costs its usual scrap. Serve the repo first (python3 -m http.server 8765).
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, W = ZH.world, out = {};
    const t = Object.keys(ZH.DEFS).find((k) => k === 'workshop' || ZH.DEFS[k].like === 'workshop'), D = ZH.DEFS[t]; out.type = t;
    W.buildings.push({ type: t, x: 0, y: 0, w: D.w, h: D.h, q: D.q, a: D.a, staff: null }); S.rp = 0; S.res = {}; S.rpGift = false; ZH.rpStarter();
    out.rp = S.rp; out.cheapest = Math.min(...Object.values(ZH.RESEARCH).map((x) => x.rp)); out.radio = JSON.stringify(S.log.slice(-3)).includes('no scrap');
    S.mat = 0; out.free = ZH.resMat('blades'); out.first = ZH.doResearch('blades'); out.mat0 = S.mat;
    S.rp = 100; S.mat = 0; out.second0 = ZH.doResearch('salvage'); S.mat = 20; out.second = ZH.doResearch('salvage'); out.mat2 = S.mat; return out; });
  console.log(JSON.stringify(r)); const bad = [];
  if (r.rp < r.cheapest) bad.push('starter notes ' + r.rp + ' < cheapest project ' + r.cheapest); if (!r.radio) bad.push('the log does not say the first project costs no scrap');
  if (!r.first || r.mat0 !== 0) bad.push('the first project did not start with 0 scrap'); if (r.second0) bad.push('the second project started with no scrap');
  if (!r.second || r.mat2 !== 14) bad.push('the second project did not cost its 6 scrap (' + r.mat2 + ' left of 20)');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: the first workbench covers the cheapest project, the first project costs no scrap, the second costs as before'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
