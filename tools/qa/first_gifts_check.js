// tools/qa/first_gifts_check.js — 3D.290 (overnight branch; owner, 21 Nov, W183): each of the first goals hands over a gift.
// The check: putting down the third walker (stage 1 to 2) puts a Baseball Bat in the stash; finishing "Grow Food" (a Garden Plot placed)
// gives a Straw Hat; each gift comes once only; every gift named in FIRST_GIFTS is a real item. Serve the repo first. Exit 0 ok, 1 failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = {}; const inv = (id) => (S.inv || {})[id] || 0; S.gifts = {};
    S.stage = 1; S.kills = 3; const bat0 = inv('bat'); ZH.stageCheck(); out.bat = inv('bat') - bat0;
    const W = ZH.world, D = ZH.Wd.DEFS.farm, B = ZH.Wd.BUILD; let placed = false; for (let y = B.y0; y <= B.y1 && !placed; y++) for (let x = B.x0; x <= B.x1 && !placed; x++) if (ZH.Wd.placementCheck(W, x, y, D, null).ok) { W.buildings.push({ type: 'farm', x, y, w: D.w, h: D.h, q: D.q, a: D.a, staff: null }); ZH.Wd.bump(W); placed = true; }
    S.guide = 0; const hat0 = inv('strawhat'); ZH.guideProgress(); out.hat = inv('strawhat') - hat0; out.guide = S.guide;
    const again = inv('bat'); ZH.firstGift('walkers'); out.twice = inv('bat') - again;
    out.badItems = Object.values(ZH.FIRST_GIFTS).filter((g) => g.item && !ZH.ITEMS[g.item]).map((g) => g.item); return out; });
  console.log(JSON.stringify(r)); const bad = [];
  if (r.bat !== 1) bad.push('no Baseball Bat for the first three walkers'); if (r.hat !== 1 || r.guide !== 1) bad.push('no Straw Hat for Grow Food (' + JSON.stringify(r) + ')');
  if (r.twice !== 0) bad.push('a gift came twice'); if (r.badItems.length) bad.push('gifts that are not items: ' + r.badItems.join(', '));
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: the first goals hand over their gifts, once each'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
