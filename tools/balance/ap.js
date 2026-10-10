// Auto-player: a sensible player's decisions, run once per game hour. Installed as window.AP.
(() => {
  const Z = window.ZH, S = Z.S, W = Z.world, Wd = Z.Wd, D = Wd.DEFS;
  const AP = window.AP = { log: [], built: [], events: [] };
  const cnt = (t) => W.buildings.filter((b) => b.type === t).length;
  const fam = (f) => W.buildings.filter((b) => D[b.type].fam === f).length;
  const ok = (t) => { const d = D[t]; return d && S.rank >= (d.rank || 1) && Z.researched(d.res); };
  function place(t) {
    const d = D[t]; if (!ok(t) || S.mat < d.mat) return false;
    const B = Wd.BUILD, cx = (B.x0 + B.x1) / 2, cy = (B.y0 + B.y1) / 2; let best = null, bd = 1e9;
    for (let y = B.y0; y <= B.y1 - d.h + 1; y++) for (let x = B.x0; x <= B.x1 - d.w + 1; x++) {
      if (!Wd.placementCheck(W, x, y, d, null).ok) continue; const dd = Math.hypot(x + d.w / 2 - cx, y + d.h / 2 - cy); if (dd < bd) { bd = dd; best = { x, y }; } }
    if (!best) { AP.full = true; return false; }
    S.mat -= d.mat; S.builtCount++; const nb = { type: t, x: best.x, y: best.y, w: d.w, h: d.h, q: d.q, a: d.a, staff: null }; W.buildings.push(nb); Wd.bump(W); Z.pushUnitsOut(nb); Z.autoStaff();
    S.ren += 1; if (t === 'water' && S.stage === 0) { S.stage = 1; S.ren += 5; } AP.built.push(t + '@d' + S.day); return true;
  }
  const PLAN = ['water', 'farm', 'house', 'scrapyard', 'workshop', 'water', 'farm', 'armory', 'gym', 'house', 'library', 'lounge', 'house'];
  const LATE = ['well', 'field', 'clinic', 'track', 'range', 'sparring', 'storage', 'barracks', 'hospital', 'house', 'scrapyard'];
  const RES = ['deepWells', 'irrigation', 'blades', 'salvage', 'fieldSurgery', 'walls', 'medicine', 'gadgets', 'fitness', 'bodyArmor', 'firearms', 'stockpile', 'traumaCare'];
  function ring() {   /* wood ring on the WALLZONE border, gates next to roads */
    const Zn = Wd.WALLZONE, out = [];
    for (let x = Zn.x0; x <= Zn.x1; x++) out.push([x, Zn.y0], [x, Zn.y1]);
    for (let y = Zn.y0 + 1; y < Zn.y1; y++) out.push([Zn.x0, y], [Zn.x1, y]);
    return out;
  }
  function walls(reserve) {
    let n = 0; const r = ring(), set = new Set(r.map(([x, y]) => x + ',' + y));
    if ([...W.walls.values()].some((wl) => !set.has(wl.x + ',' + wl.y))) { for (const wl of [...W.walls.values()]) if (!set.has(wl.x + ',' + wl.y)) W.walls.delete(wl.x + ',' + wl.y); Wd.bump(W); AP.ringDone = false; }   /* old inner ring after expanding: removed */
    r.sort((a, b) => a[1] - b[1]);   /* north side first: most zombies come from the north */
    for (const [x, y] of r) {
      if (S.mat < reserve) break; const ex = Wd.wallAt(W, x, y); if (ex && ex.type !== 'wood') continue;
      const gate = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => Wd.isRoad(W, x + dx, y + dy));
      if (!ex) { const m0 = S.mat; Z.tryWall(x, y, gate ? 'gate' : 'wood'); if (S.mat < m0) n++; }
      else if (S.rank >= 2 && S.mat > reserve + 20) { const m0 = S.mat; Z.tryWall(x, y, 'metal'); if (S.mat < m0) n++; }
    }
    return n;
  }
  AP.deaths = []; AP.nf = 0; AP.downs = []; const last = new Map();
  AP.tick = function () {
    for (const s of S.sv) { const prev = last.get(s);
      if (s.mode === 'down' && prev && prev.mode !== 'down') { let zt = null, zd = 9; for (const z of S.z) if (z.hp > 0) { const d = Math.hypot(z.w.x - s.w.x, z.w.y - s.w.y); if (d < zd) { zd = d; zt = z.type + (z.human ? '' : '') ; } }
        const B = Wd.BUILD; AP.downs.push({ d: S.day, h: S.hour, who: s.job + ' L' + s.l, was: prev.mode + (prev.purpose ? '/' + prev.purpose : '') + (prev.why ? ' (' + prev.why + ')' : ''), inTown: s.w.x >= B.x0 && s.w.x <= B.x1 + 1 && s.w.y >= B.y0 && s.w.y <= B.y1 + 1, by: zt, broken: [...W.walls.values()].filter((w) => w.broken).length, walls: W.walls.size }); }
      last.set(s, { mode: s.mode, purpose: s.purpose, why: s.why }); }
  };
  AP.hour = function () {
    if ((S.fallen || []).length > AP.nf) { const zs = S.z.filter((z) => z.hp > 0); const ty = {}; zs.forEach((z) => ty[z.type] = (ty[z.type] || 0) + 1);
      for (const f of S.fallen.slice(AP.nf)) AP.deaths.push({ d: S.day, h: S.hour, who: f.job + ' L' + f.l, z: ty, broken: [...W.walls.values()].filter((w) => w.broken).length, down: S.sv.filter((q) => q.mode === 'down').length, med: S.sv.filter((q) => q.mode === 'hospital').length });
      AP.nf = S.fallen.length; }
    // accept move-in requests (a player would)
    let g = 0; while (S.requests.length && document.getElementById('acceptReq') && g++ < 10) document.getElementById('acceptReq').click();
    // expeditions: one squad out at a time
    if (AP.exp && !S.trip && S.sv.length >= 5 && S.food > 12 && S.water > 12) {
      const sq = Z.expAutoSquad(3).map((q) => q.id), lvl = S.sv.reduce((a, q) => a + q.l, 0) / S.sv.length;
      const dest = !Z.expLocked('warehouse') ? 'warehouse' : !Z.expLocked('pharmacy') ? 'pharmacy' : 'houses', risk = dest === 'warehouse' ? 'medium' : lvl >= 4 && dest === 'pharmacy' ? 'medium' : 'low';
      if (sq.length >= 2) { const r = Z.startExpedition(dest, risk, sq); if (r.ok) AP.events.push('exp ' + dest + '/' + risk + '@d' + S.day); }
    }
    // bandage the downed
    for (const s of S.sv) if (s.mode === 'down' && S.mat >= Z.BANDAGE() && s.bleed < 900 && !s.bandaged) { if (Z.useBandage(s)) s.bandaged = 1; }
    for (const s of S.sv) if (s.mode !== 'down') s.bandaged = 0;
    // repair burnt buildings
    for (const b of W.buildings) if (b.burnt && S.mat >= Math.ceil(D[b.type].mat * .25) + 2) Z.repairBurnt(b);
    // keep at least 2 fighters: retrain the best unassigned survivor as a Guard
    const FIGHT = ['Guard', 'Police Officer', 'Scavenger', 'SWAT'];
    if (S.hour === 8 && S.sv.filter((q) => FIGHT.includes(q.job) && q.hp > 0).length < 2) { const c = S.sv.filter((q) => !FIGHT.includes(q.job) && !q.post && q.hp > q.max * .5 && !['down', 'hospital', 'away'].includes(q.mode)).sort((a, b) => b.l - a.l)[0]; if (c && Z.changeProfession(c, 'Guard')) AP.events.push('guard ' + c.name + '@d' + S.day); }
    // research
    for (const k of RES) if (!Z.researched(k)) { if (Z.doResearch(k)) AP.events.push('res ' + k + '@d' + S.day); break; }
    // food / water emergencies first
    const st = Z.supplyStats(); const reserve = 6 + 2 * Z.upkeepTotal();
    if (S.hour === 12) { AP.wTrend = S.water - (AP.w12 ?? S.water); AP.fTrend = S.food - (AP.f12 ?? S.food); AP.w12 = S.water; AP.f12 = S.food; }
    const needW = st.wNet < .5 || (S.water < 25 && (AP.wTrend || 0) < 0), needF = st.fNet < .5 || (S.food < 25 && (AP.fTrend || 0) < 0);
    if (needW && S.mat >= 4) { if (!place('well')) place('water'); }
    if (needF && S.mat >= 5) { if (!place('field')) place('farm'); }
    if (needW && S.water < 8 && S.trader && S.trader.mode === 'stay') Z.traderTrade(3);
    // build plan
    let next = null; const want = {}; for (const t of PLAN) { want[t] = (want[t] || 0) + 1; if (cnt(t) < want[t]) { next = t; if (S.mat - D[t].mat >= reserve * .5) { place(t); next = null; } break; } }
    AP.saving = next ? D[next].mat + reserve * .5 : 0; AP.core = ['water', 'farm', 'house', 'scrapyard', 'workshop'].every((t) => cnt(t) > 0);
    if (PLAN.every((t, i) => cnt(t) >= PLAN.slice(0, i + 1).filter((q) => q === t).length)) for (const t of LATE) if (ok(t) && cnt(t) < (t === 'house' ? 4 : t === 'scrapyard' ? 2 : 1)) { if (S.mat - D[t].mat >= reserve) place(t); break; }
    // walls from day 2
    if (S.day >= 2 && AP.core && !AP.nowalls) walls(Math.max(reserve + 6, AP.saving));   /* economy first; walls only from spare parts */
    // territory
    const n = Wd.TERRITORY[(S.terr || 0) + 1]; if (n && S.ren >= n.ren && S.mat >= n.mat + (AP.full ? 4 : reserve + 15)) { if (Z.expandTerritory()) { AP.full = false; AP.ringDone = false; } if (S.terr && !AP.events.includes('expand ' + S.terr)) AP.events.push('expand ' + S.terr + '@d' + S.day); }
    // crafting: weapons for fighters with only a pipe
    // trader
    if (S.trader && S.trader.mode === 'stay') {
      const pi = S.trader.stock.findIndex((o) => o.k === 'pet' && !o.sold); if (pi >= 0 && S.food > 18 && S.water > 18) { if (Z.traderBuy(pi)) AP.events.push('pet@d' + S.day); }
      const owner = S.sv.find((q) => !q.pet); if ((S.pets || []).length && owner) Z.givePet(owner, 0);
      if (S.food > Z.supplyCap() * .8) Z.traderTrade(0); if (S.water > Z.supplyCap() * .8) Z.traderTrade(1);
    }
  };
  AP.snap = function () {
    const sv = S.sv, per = Wd.perimeter(W), wl = [...W.walls.values()];
    return { d: S.day, sv: sv.length, fallen: (S.fallen || []).length, down: sv.filter((q) => q.mode === 'down' || q.mode === 'hospital').length,
      food: Math.round(S.food), water: Math.round(S.water), mat: Math.round(S.mat), rp: Math.round(S.rp || 0), ren: S.ren, rank: S.rank, terr: S.terr || 0,
      kills: S.kills, nb: W.buildings.length, walls: wl.length, sealed: per.sealed, wallHp: wl.length ? Math.round(100 * wl.reduce((a, w) => a + w.hp / w.max, 0) / wl.length) : 0,
      inc: S.incidents || 0, burnt: W.buildings.filter((b) => b.burnt).length, boss: S.bossKills || 0, unpaid: W.buildings.filter((b) => b.unpaid).length, upkeep: +Z.upkeepTotal().toFixed(1),
      lvl: +(sv.reduce((a, q) => a + q.l, 0) / Math.max(1, sv.length)).toFixed(1), sat: Math.round(sv.reduce((a, q) => a + (q.sat || 0), 0) / Math.max(1, sv.length)),
      hpAvg: Math.round(100 * sv.reduce((a, q) => a + q.hp / q.max, 0) / Math.max(1, sv.length)), z: S.z.filter((z) => z.hp > 0).length, res: Object.keys(S.res || {}).length,
      grade: S.lastReview ? S.lastReview.grade + S.lastReview.total : '' };
  };
})();
