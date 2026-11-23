// tools/qa/build_away_check.js — 3D.305 (owner, 22 Nov, Q1): building carries on while away at the same speed as with the game open.
// A Tent site is placed with its materials in stock and nobody carrying: after 2 real hours away it is built and the stock paid for it.
// A site whose materials the stock does not hold stays a site. A short absence (less than the site's work) leaves it part done.
// Serve the repo first (python3 -m http.server 8765). Exit 0 ok, 1 failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, W = ZH.world, out = {}; S.sites = S.sites || [];
    const mk = (id, need, cons) => { const D = ZH.DEFS.tent; const st = { id, type: 'tent', x: 1, y: 1, w: D.w, h: D.h, q: D.q, a: D.a, need, got: {}, inb: {}, cons, dur: cons }; S.sites.push(st); return st; };
    const n0 = W.buildings.filter((x) => x.type === 'tent').length; S.wood = 50; S.mat = 50; S.stone = 0;
    const a = mk(9001, { wood: 6, mat: 2 }, 3000), c = mk(9002, { stone: 20 }, 3000), d = mk(9003, { wood: 4 }, 600000);
    const ret = ZH.awayCredit(2 * 3600000);
    out.aBuilt = !S.sites.includes(a); out.tents = W.buildings.filter((x) => x.type === 'tent').length - n0; out.wood = S.wood; out.mat = S.mat;
    out.cWaits = S.sites.includes(c); out.dLeft = S.sites.includes(d) ? d.cons : null; out.built = ret && ret.built;
    S.sites = S.sites.filter((x) => x !== c && x !== d); return out; });
  console.log(JSON.stringify(r)); const bad = [];
  if (!r.aBuilt || r.tents !== 1) bad.push('the stocked site was not built while away'); if (r.wood !== 40 || r.mat !== 48) bad.push('stock after: wood ' + r.wood + ', scrap ' + r.mat + ' (wanted 40 and 48)');
  if (!r.cWaits) bad.push('a site with no stone in stock was built anyway'); if (!(r.dLeft > 0 && r.dLeft < 600000)) bad.push('a long site did not count down by the time away (' + r.dLeft + ')');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: building sites are fed from the stock and built while away, at the open-game pace; without materials they wait'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
