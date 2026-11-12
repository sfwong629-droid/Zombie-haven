// Auto-player: a sensible player's decisions, run once per game hour. Installed as window.AP.
(() => {
  const Z = window.ZH, S = Z.S, W = Z.world, Wd = Z.Wd, D = Wd.DEFS;
  const AP = window.AP = { log: [], built: [], events: [], off: new Set() }; window.ZH_NO_REVEAL = true;
  const on = (k) => !AP.off.has(k) && !AP.off.has('all');   /* skill study: switch single player habits off ('all' = an idle player who only answers popups and move-in requests) */
  const cnt = (t) => W.buildings.filter((b) => b.type === t).length;
  const fam = (f) => W.buildings.filter((b) => D[b.type].fam === f).length;
  const ok = (t) => { const d = D[t]; return d && S.rank >= (d.rank || 1) && (d.role === 'hq' || (d.tier || 1) <= Z.hqTier()) && Z.researched(d.res); };
  /* V3D.23: tiers. have(t) = a building of t's family at t's tier or higher; get(t) places a tier-1 site or upgrades the family's best building */
  const have = (t) => { const d = D[t]; return W.buildings.filter((b) => b.type === t || (!!d.fam && d.fam !== 'hq' && D[b.type].fam === d.fam && (D[b.type].tier || 1) >= (d.tier || 1)) || (d.role === 'hq' && D[b.type].role === 'hq' && D[b.type].tier >= d.tier)).length; };
  const busy = () => (S.sites || []).length + W.buildings.filter((b) => b.upg).length;
  function place(t) {
    const d = D[t]; if (!ok(t) || busy() >= 2 || (S.sites || []).some((q) => q.type === t) || W.buildings.some((q) => q.upg && q.upg.to === t)) return false;
    if (d.up) {   // upgrade the lowest building of the family that leads here
      const prev = Object.keys(D).find((k) => D[k].next === t); const b = prev && W.buildings.find((q) => q.type === prev && !q.upg && !q.burnt);
      if (!b || !Z.canPay(Z.bCost(d)) || !Z.upgradeCheck(b).ok) return false; Z.upgradeBuilding(b); AP.built.push('^' + t + '@d' + S.day); return true;
    }
    if (!Z.canPay(Z.bCost(d))) return false;
    const B = Wd.BUILD, cx = (B.x0 + B.x1) / 2, cy = (B.y0 + B.y1) / 2; let best = null, bd = 1e9;
    for (let y = B.y0; y <= B.y1 - d.h + 1; y++) for (let x = B.x0; x <= B.x1 - d.w + 1; x++) {
      if (!Wd.placementCheck(W, x, y, d, null).ok) continue; const dd = Math.hypot(x + d.w / 2 - cx, y + d.h / 2 - cy); if (dd < bd) { bd = dd; best = { x, y }; } }
    if (!best) { AP.full = true; return false; }
    Z.newSite(t, best.x, best.y); AP.built.push(t + '@d' + S.day); return true;
  }
  const PLAN = ['barrel', 'farm', 'tent', 'medic', 'bench', 'hq2', 'scrapyard', 'water', 'tent', 'lumber', 'crates', 'farm', 'quarry', 'armory', 'gym', 'cabin', 'library', 'storage', 'field', 'clinic', 'workshop'];
  const LATE = ['garage', 'kennel', 'tradepost', 'school', 'turbine', 'solar', 'hq3', 'well', 'generator', 'stonehouse', 'irrig', 'fuelstill', 'radio', 'greenhouse', 'barracks', 'hospital', 'pump', 'mess', 'warehouse', 'ammofactory', 'coldstore', 'track', 'range', 'sparring', 'lounge', 'tent', 'cabin', 'scrapyard'];   /* 3D.77 power for growth, fuel and ammo */
  const RES = ['blades', 'salvage', 'walls', 'medicine', 'gadgets', 'bodyArmor', 'firearms', 'stockpile'];
  function ring() {   /* wood ring on the WALLZONE border, gates next to roads */
    const Zn = Wd.WALLZONE, out = [];
    for (let x = Zn.x0; x <= Zn.x1; x++) out.push([x, Zn.y0], [x, Zn.y1]);
    for (let y = Zn.y0 + 1; y < Zn.y1; y++) out.push([Zn.x0, y], [Zn.x1, y]);
    return out;
  }
  function walls(reserve) {
    let n = 0; const r = ring(), set = new Set(r.map(([x, y]) => x + ',' + y));
    if ((S.wood || 0) >= 30 && [...W.walls.values()].some((wl) => !set.has(wl.x + ',' + wl.y))) {   /* 3D.128: only once the new ring can be afforded (a player would not tear the fence down with nothing to replace it) */ for (const wl of [...W.walls.values()]) if (!set.has(wl.x + ',' + wl.y)) W.walls.delete(wl.x + ',' + wl.y); Wd.bump(W); AP.ringDone = false; }   /* old inner ring after expanding: removed */
    r.sort((a, b) => a[1] - b[1]);   /* north side first: most zombies come from the north */
    for (const [x, y] of r) {
      if (S.mat < reserve || (S.wood || 0) < 4 + Math.min(10, AP.saveW || 0)) break;   /* V3D.23: walls cost wood now; keep wood for the build plan */ const ex = Wd.wallAt(W, x, y); if (ex && ex.type !== 'wood') continue;
      const gate = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => Wd.isRoad(W, x + dx, y + dy));
      if (!ex) { const m0 = S.mat + (S.wood || 0); Z.tryWall(x, y, gate ? 'gate' : 'wood'); if (S.mat + (S.wood || 0) < m0) n++; }
      else if (S.rank >= 2 && S.mat > reserve + 20) { const m0 = S.mat; Z.tryWall(x, y, 'metal'); if (S.mat < m0) n++; }
    }
    return n;
  }
  /* skill study: an attentive player's live decisions, checked every tick the auto-player runs */
  function expertTick() {
    const hurt = S.sv.filter((q) => q.hp < q.max * .5 && !['away', 'errand'].includes(q.mode)).length, night = Z.isNight(), zin = S.z.filter((z) => z.hp > 0 && !z.human && Wd.inTown(Math.floor(z.w.x), Math.floor(z.w.y))).length;
    const want = hurt >= 2 && !zin ? 'recover' : night || zin ? 'defend' : 'produce';   /* defend at night or under attack, heal when people are hurt, push production on quiet days */
    const xo = AP.xoff || new Set();
    if (!xo.has('policy') && Z.policy() !== want && (S.polT || 0) + 600 < Z.tick) { Z.setPolicy(want); S.polT = Z.tick; }
    AP.xt = (AP.xt || 0) + 1;
    if (!xo.has('breach')) for (const wl of W.walls.values()) if (wl.broken && S.z.some((z) => z.hp > 0 && !z.human && Math.hypot(z.w.x - wl.x - .5, z.w.y - wl.y - .5) < 6) && !(wl.sentT > Z.tick - 900)) { if (Z.sendDefender({ x: wl.x + .5, y: wl.y + .5 })) wl.sentT = Z.tick; }   /* answers every breach alert */
    if (!xo.has('rescue') && Z.orderRescue) for (const q of S.sv) if (q.mode === 'down' && !q.ordered && !q.rescuer) Z.orderRescue(q);   /* taps Send rescue on every down alert */
    if (!xo.has('focus') && Z.focusBoss && S.z.some((z) => z.type === 'boss' && z.hp > 0) && !(S.focusT > Z.tick)) Z.focusBoss();   /* taps Focus the boss */
    if (!xo.has('militia') && Z.militia && AP.xt % 2 === 0 && S.sv.some((q) => q.mode === 'down')) Z.militia();
  }
  AP.deaths = []; AP.nf = 0; AP.downs = []; const last = new Map();
  AP.tick = function () {
    if (AP.expert) expertTick();
    if (S.sh && on('stronghold')) { const H = S.sh, D = Z.SH_DEFS[H.dest]; if (H.woke && H.woke.B && !H.focus) Z.shCall('focus'); const low = H.units.find((q) => q.hp > 0 && q.hp < q.max * .3) || H.units.find((q) => q.hp <= 0); if (low && (S.meds || 0) > 0 && !(AP.medT > Z.tick)) { Z.shCall('med'); AP.medT = Z.tick + 300; }
      if (!AP.shSeen) { AP.shSeen = true; } } else if (AP.shSeen) { AP.shSeen = false; AP.events.push((S.shCleared && Object.values(S.shCleared).reduce((a, b) => a + b, 0) > (AP.shWins || 0) ? 'stronghold WON' : 'stronghold lost') + '@d' + S.day); AP.shWins = S.shCleared ? Object.values(S.shCleared).reduce((a, b) => a + b, 0) : 0; }
    if (on('radio') && Z.radioHelp && Z.helpReady && AP.radio !== false && S.sv.filter((q) => q.mode === 'down').length >= 2 && Z.helpReady()) { Z.radioHelp(); AP.events.push('radio@d' + S.day); }   /* 3D.64: a player radios for help when two are down */
    for (const s of S.sv) { const prev = last.get(s);
      if (s.mode === 'down' && prev && prev.mode !== 'down') { let zt = null, zd = 9; for (const z of S.z) if (z.hp > 0) { const d = Math.hypot(z.w.x - s.w.x, z.w.y - s.w.y); if (d < zd) { zd = d; zt = z.type + (z.human ? '' : '') ; } }
        const B = Wd.BUILD; AP.downs.push({ d: S.day, h: S.hour, who: s.job + ' L' + s.l, was: prev.mode + (prev.purpose ? '/' + prev.purpose : '') + (prev.why ? ' (' + prev.why + ')' : ''), inTown: s.w.x >= B.x0 && s.w.x <= B.x1 + 1 && s.w.y >= B.y0 && s.w.y <= B.y1 + 1, by: zt, broken: [...W.walls.values()].filter((w) => w.broken).length, walls: W.walls.size }); }
      last.set(s, { mode: s.mode, purpose: s.purpose, why: s.why }); }
  };
  AP.hour = function () {
    if (on('trays') && Z.collectBonus && S.hour % 2 === 0) for (const b of W.buildings) if (b.bonus) Z.collectBonus(b);   /* 3D.58: production waits in trays until collected, as a player taps them */
    // V2.33: hold a town event at noon when it is affordable, and upgrade the town when the rating conditions are met
    if (on('events') && Z.holdEvent && S.hour === 12 && Z.RANK_REQ[S.rank] && (S.eventsHeld || 0) < Z.RANK_REQ[S.rank].events) {   /* only as many events as the next star needs */ for (const k of ['bonfire', 'sports', 'market']) { const e = Z.TOWN_EVENTS[k], c = e.cost; if (Object.entries(c).every(([r, v]) => S[r] >= v + 6)) { if (Z.holdEvent(k)) break; } } }
    if (on('events') && Z.holdEvent && S.hour === 13 && S.rank >= 3 && (S.lastEventDay ?? -1) < S.day && S.food > Z.supplyCap() * .75 && S.water > Z.supplyCap() * .7) Z.holdEvent('caravan');   /* V2.38: trade a full pantry for parts */
    if (on('rank') && Z.upgradeTown) Z.upgradeTown();
    if (on('finale') && Z.signalReady && AP.finale !== false && S.hour === 8 && Z.signalReady()) { Z.startFinale(); AP.events.push('signal@d' + S.day); }   // V2.46: call the convoy as soon as it is possible
    // V2.45: guard posts once the town has two stars: one night watch north of the centre, one day watch south, as a player would put them by the gates
    if (on('posts') && Z.tryPost && AP.posts !== false && S.rank >= 2 && S.hour === 9 && (S.posts || []).length < Math.min(2, Z.postMax()) && S.mat > 20) {
      const B = Wd.BUILD, cx = Math.round((B.x0 + B.x1) / 2), cand = (S.posts || []).length ? [[cx, B.y1], [cx - 1, B.y1], [cx + 1, B.y1], [cx, B.y1 - 1], [cx - 2, B.y1 - 1]] : [[cx, B.y0], [cx - 1, B.y0], [cx + 1, B.y0], [cx, B.y0 + 1], [cx + 2, B.y0 + 1]];
      for (const [x, y] of cand) { const r = Z.tryPost(x, y); if (r.ok) { if (S.posts.length === 2) r.post.sched = 'day'; AP.events.push('post ' + x + ',' + y + '@d' + S.day); break; } }
    }
    // answer story popups with a random choice (and close plain ones)
    for (let i = 0; i < 8; i++) { const bs = [...document.querySelectorAll('#eventModal button')]; if (!bs.length) break; bs[Math.floor(Math.random() * bs.length)].click(); }
    if ((S.fallen || []).length > AP.nf) { const zs = S.z.filter((z) => z.hp > 0); const ty = {}; zs.forEach((z) => ty[z.type] = (ty[z.type] || 0) + 1);
      for (const f of S.fallen.slice(AP.nf)) AP.deaths.push({ d: S.day, h: S.hour, who: f.job + ' L' + f.l, trait: f.trait, z: ty, broken: [...W.walls.values()].filter((w) => w.broken).length, down: S.sv.filter((q) => q.mode === 'down').length, med: S.sv.filter((q) => q.mode === 'hospital').length });
      AP.nf = S.fallen.length; }
    // accept move-in requests (a player would)
    let g = 0; while (S.requests.length && document.getElementById('acceptReq') && g++ < 10) document.getElementById('acceptReq').click();
    // expeditions: one squad out at a time
    if (on('exp') && AP.exp && !S.trip && S.sv.length >= 5 && S.food > 12 && S.water > 12) {
      const sq = Z.expAutoSquad(3).map((q) => q.id), lvl = S.sv.reduce((a, q) => a + q.l, 0) / S.sv.length;
      const jn = (r) => Z.jobList().some((x) => (x.j.need[r] || 0) > (x.j.got[r] || 0)) && (S[r] || 0) < 3;
      const dest = jn('meds') && !Z.expLocked('pharmacy') ? 'pharmacy' : jn('fuel') && !Z.expLocked('gasstation') ? 'gasstation' : (S.wood || 0) < 15 && !Z.expLocked('lumberyard') ? 'lumberyard' : Z.hqTier() >= 2 && (S.stone || 0) < 15 && !Z.expLocked('quarrysite') ? 'quarrysite' : !Z.expLocked('warehouse') ? 'warehouse' : !Z.expLocked('pharmacy') ? 'pharmacy' : 'houses', risk = dest === 'warehouse' || dest === 'quarrysite' || dest === 'gasstation' ? 'medium' : lvl >= 4 && dest === 'pharmacy' ? 'medium' : 'low';
      if (sq.length >= 2) { const r = Z.startExpedition(dest, risk, sq); if (r.ok) AP.events.push('exp ' + dest + '/' + risk + '@d' + S.day); }
    }
    /* 3D.110 the newer systems, as a sensible player uses them */
    if (on('veh') && Z.VEH) { if (!(S.veh || {}).cart && (S.wood || 0) > 20 && S.mat > 12) Z.vehBuildCart(); for (const k of ['pickup', 'van', 'cart']) if ((S.veh || {})[k] && S.veh[k].broken && S.mat > 25) Z.vehRepair(k);
      const vk = ['van', 'pickup', 'cart'].find((k) => Z.vehReady(k) && (k === 'cart' || (S.fuel || 0) >= Z.VEH[k].fuel + 4)); Z.setExpVeh(vk || null); }
    if (on('class') && Z.promoteSpec && S.hour === 11) { for (const q of S.sv) if (!q.spec && !Z.specWhy(q)) Z.promoteSpec(q); if (Z.hybOptions) for (const q of S.sv) if (q.spec && !q.hyb) { const o = Z.hybOptions(q)[0]; if (o) Z.promoteHyb(q, o.k); } }
    if (on('stronghold') && Z.startStronghold && !S.sh && !S.trip && S.hour === 10 && Z.needsBanner() && !(S.banners || []).some((b) => !b.used)) {
      const dest = (S.lvl || 1) >= 10 ? 'prison' : 'clinic', sq = Z.expAutoSquad(4); if (sq.length >= 3 && S.sv.length - sq.length >= 2 && !Z.expLocked(dest) && (S.shTryDay || {})[dest] !== S.day - 1) { const pw = Z.shPower(sq), rec = Z.SH_DEFS[dest].rec;
        if (pw >= rec * .9 || S.day > (AP.shWait || 0) + 6) { const r = Z.startStronghold(dest, sq.map((q) => q.id)); if (r.ok) { AP.events.push('stronghold ' + dest + ' p' + pw + '@d' + S.day); AP.shWait = S.day; } } } }
    // bandage the downed
    if (on('bandage')) for (const s of S.sv) if (s.mode === 'down' && ((S.cloth || 0) >= 1 || S.mat >= Z.BANDAGE() * 2) && s.bleed < 900 && !s.bandaged) { if (Z.useBandage(s)) s.bandaged = 1; }
    for (const s of S.sv) if (s.mode !== 'down') s.bandaged = 0;
    // repair burnt buildings
    if (on('repair')) for (const b of W.buildings) if (b.burnt) Z.repairBurnt(b);   /* 3D.61: repairBurnt checks the wood / stone / scrap it needs */
    // keep at least 2 fighters: retrain the best unassigned survivor as a Guard
    const FIGHT = ['Guard', 'Police Officer', 'Scavenger'];
    if (AP.lockJobs) { for (const q of S.sv) if (AP.lockJobs.includes(q.job) && Z.changeProfession) Z.changeProfession(q, 'Civilian'); }   /* profession study: keep the roster as set, and keep the removed job out */
    else if (on('jobs') && S.hour === 8 && S.sv.filter((q) => FIGHT.includes(q.job) && q.hp > 0).length < 2) { const c = S.sv.filter((q) => !FIGHT.includes(q.job) && !q.post && q.hp > q.max * .5 && !['down', 'hospital', 'away'].includes(q.mode)).sort((a, b) => b.l - a.l)[0]; if (c && Z.changeProfession(c, 'Guard')) AP.events.push('guard ' + c.name + '@d' + S.day); }
    // give civilians (grown-up children, newcomers) a useful job
    if (on('jobs') && S.hour === 9 && !AP.lockJobs) for (const c of S.sv.filter((q) => q.job === 'Civilian' && q.hp > q.max * .5 && !['down', 'hospital', 'away'].includes(q.mode))) { const fighters = S.sv.filter((q) => FIGHT.includes(q.job)).length; Z.changeProfession(c, fighters < 3 ? 'Guard' : !S.sv.some((q) => q.job === 'Farmer') ? 'Farmer' : !S.sv.some((q) => q.job === 'Engineer') ? 'Engineer' : 'Scavenger'); }
    // beds: a sensible player makes room before the town is full (newcomers only come with a free bed)
    if (on('plan') && S.hour === 10 && Z.popNow() >= Z.popCap() - 1 && Z.bedCount() <= Z.rankRoom()) { if (!place('cabin')) place('tent'); }
    // research
    { const nx = Z.RANK_REQ[S.rank], want = nx && Z.DEFS[nx.build] && Z.DEFS[nx.build].res; let goal = null;   /* V2.38: research toward the next star's building first (its chain), then the usual order */
      if (want && !Z.researched(want)) { let r = want; while (r && !Z.researched(Z.RESEARCH[r].need)) r = Z.RESEARCH[r].need; goal = r; }
      const order = goal ? [goal, ...RES.filter((k) => k !== goal)] : RES;
      if (on('research') && S.mat > 30 + (AP.saving || 0)) for (const k of order) if (!Z.researched(k)) { if (Z.doResearch(k)) AP.events.push('res ' + k + '@d' + S.day); break; } }   /* V3D.26: research only from spare scrap */
    // V3D.26 tools: steel first, then power tools once there is fuel to spare
    if (on('tools') && Z.hqTier() >= 2) for (const k of ['axe', 'bar', 'pick']) { const cur = (S.tools || {})[k] || 0, nx = Z.TOOLS[k].tiers[cur + 1]; if (nx && (nx.cost.fuel || 0) <= Math.max(0, (S.fuel || 0) - 4) && (S.mat - (nx.cost.mat || 0)) >= 12 + (AP.saving || 0) && (S.wood || 0) - (nx.cost.wood || 0) >= (AP.saveW || 0) && Z.canPay(nx.cost)) { if (Z.craftTool(k)) AP.events.push('tool ' + nx.n + '@d' + S.day); break; } }
    // food / water emergencies first
    const st = Z.supplyStats(); const reserve = 6 + 2 * Z.upkeepTotal();
    if (S.hour === 12) { AP.wTrend = S.water - (AP.w12 ?? S.water); AP.fTrend = S.food - (AP.f12 ?? S.food); AP.w12 = S.water; AP.f12 = S.food; }
    const needW = st.wNet < .5 || (S.water < 25 && (AP.wTrend || 0) < 0), needF = st.fNet < .5 || (S.food < 25 && (AP.fTrend || 0) < 0);
    const famN = (f) => W.buildings.filter((b) => D[b.type].fam === f).length + (S.sites || []).filter((q) => D[q.type].fam === f).length;
    if (on('supply') && needW) { if (!place('well') && !place('water') && famN('water') < 3 + Math.floor(S.sv.length / 4)) place('barrel'); }   /* 3D.110: water grows with the town, as a player would build it */
    if (on('supply') && needF) { if (!place('irrig') && !place('field') && famN('farm') < 4) place('farm'); }
    if (on('supply') && needW && S.water < 8 && S.trader && S.trader.mode === 'stay') Z.traderTrade(3);
    // the building the next town star needs (Upgrade Town "Build X" condition)
    if (on('rank')) { const rq = Z.RANK_REQ && Z.RANK_REQ[S.rank]; if (rq && !have(rq.build) && ok(rq.build) && S.mat - D[rq.build].mat >= reserve * .5) place(rq.build); }
    // build plan
    let next = null; const want = {}; if (on('plan')) for (const t of (AP.plan || PLAN)) { want[t] = (want[t] || 0) + 1; if (have(t) < want[t]) { next = t; if (S.mat - D[t].mat >= reserve * .5) { place(t); next = null; } break; } }
    AP.saving = next ? D[next].mat + reserve * .5 : 0; AP.saveW = next ? D[next].wood || 0 : 0; AP.core = ['barrel', 'farm', 'tent', 'bench'].every((t) => have(t) > 0);
    if (on('plan') && PLAN.every((t, i) => !ok(t) || have(t) >= PLAN.slice(0, i + 1).filter((q) => q === t).length)) for (const t of LATE) if (ok(t) && have(t) < (t === 'tent' ? 5 : t === 'cabin' ? 3 : t === 'scrapyard' ? 2 : 1)) { if (S.mat - D[t].mat >= reserve) place(t); break; }
    // walls from day 2
    if (on('walls') && S.day >= 2 && AP.core && Z.hqTier() >= 2 && !AP.nowalls)   /* V3D.26: walls once the Lodge stands (before that, wood goes to buildings) */ walls(Math.max(reserve + 6, AP.saving));   /* V3D.26: walls once the Lodge stands */   /* economy first; walls only from spare parts */
    // territory
    const n = Wd.TERRITORY[(S.terr || 0) + 1]; if (on('territory') && n && S.ren >= n.ren && S.mat >= n.mat + (AP.full ? 4 : reserve + 15)) { if (Z.expandTerritory()) { AP.full = false; AP.ringDone = false; } if (S.terr && !AP.events.includes('expand ' + S.terr)) AP.events.push('expand ' + S.terr + '@d' + S.day); }
    // 3D.77 ammo: gunners need rounds: an Ammo Bench and a Mechanic to run it (a second bench when ammo runs low)
    if (on('ammo') && Z.gunners) { const g = Z.gunners().length, nb = have('ammobench') + (S.sites || []).filter((q) => q.type === 'ammobench').length;
      if (g && ok('ammobench') && (nb === 0 || (nb < 2 && (S.ammo || 0) < 6 * g && S.hour === 14)) && S.mat - D.ammobench.mat >= reserve * .5) place('ammobench');
      const needM = W.buildings.filter((b) => ['ammobench', 'ammofactory', 'fuelstill', 'generator', 'pump'].includes(b.type)).length;
      if (S.hour === 9 && Z.changeProfession && S.sv.filter((q) => q.job === 'Mechanic').length < Math.min(2, needM)) { const c = S.sv.filter((q) => (q.job === 'Civilian' || q.job === 'Cook') && q.hp > q.max * .5 && !['down', 'hospital', 'away'].includes(q.mode))[0]; if (c) Z.changeProfession(c, 'Mechanic'); } }
    // 3D.76 traps (an attentive player): spikes and wire on the north side, re-armed and a lure set on boss days
    if (on('traps') && AP.expert && Z.tryTrap && S.rank >= 2 && S.hour === 16) { const Zn = Wd.WALLZONE, cx = Math.round((Zn.x0 + Zn.x1) / 2); let n = Z.trapMap().size;
      for (let dx = -3; dx <= 3 && n < Math.floor(Z.trapMax() * .7) && S.mat > 24; dx++) for (const [t, dy] of [['spikes', 2], ['wire', 1]]) { if (n >= Math.floor(Z.trapMax() * .7)) break; const r = Z.tryTrap(cx + dx, Zn.y0 - dy, t); if (r.ok) n++; }
      if (S.day === S.nextBoss && S.rank >= 3 && Z.tryTrap) Z.tryTrap(cx, Math.max(0, Zn.y0 - 4), 'lure');
      if (Z.rearmAll && Z.trapsSpent().length && S.mat > 16) Z.rearmAll(); }
    // crafting: weapons for fighters with only a pipe
    // trader
    if (on('trader') && S.trader && S.trader.mode === 'stay') {
      const pi = S.trader.stock.findIndex((o) => o.k === 'pet' && !o.sold); if (pi >= 0 && S.food > 18 && S.water > 18) { if (Z.traderBuy(pi)) AP.events.push('pet@d' + S.day); }
      const owner = S.sv.find((q) => !q.pet); if ((S.pets || []).length && owner) Z.givePet(owner, 0);
      if (S.food > Z.supplyCap() * .8) Z.traderTrade(0); if (S.water > Z.supplyCap() * .8) Z.traderTrade(1);
    }
  };
  AP.seen = new Set(S.sv); AP.joins = {};
  AP.snap = function () {
    for (const q of S.sv) if (!AP.seen.has(q)) { AP.seen.add(q); { const k = q.src || 'other'; AP.joins[k] = (AP.joins[k] || 0) + 1; } }
    const sv = S.sv, per = Wd.perimeter(W), wl = [...W.walls.values()];
    return { d: S.day, sv: sv.length, fallen: (S.fallen || []).length, down: sv.filter((q) => q.mode === 'down' || q.mode === 'hospital').length,
      food: Math.round(S.food), water: Math.round(S.water), sup: Z.supplyCap ? Z.supplyCap() : null, need: Z.rationNeed ? Z.rationNeed() : null, ffam: W.buildings.filter((b) => D[b.type].fam === 'food' && !b.burnt).map((b) => b.type).join('+'), wfam: W.buildings.filter((b) => D[b.type].fam === 'water' && !b.burnt).map((b) => b.type).join('+'), mat: Math.round(S.mat), wood: Math.round(S.wood || 0), stumps: Object.values(S.nodes || {}).filter((n) => n.left <= 0).length, rp: Math.round(S.rp || 0), ren: S.ren, rank: S.rank, terr: S.terr || 0,
      leg: Z.legacyDone ? Z.legacyDone() : 0, fin: S.finale ? S.finale.night : null, won: S.won ? S.won.day : null, score: S.won ? S.won.score : null,
      kills: S.kills, cap: Z.popCap(), joins: { ...AP.joins }, nb: W.buildings.length, walls: wl.length, sealed: per.sealed, wallHp: wl.length ? Math.round(100 * wl.reduce((a, w) => a + w.hp / w.max, 0) / wl.length) : 0,
      inc: S.incidents || 0, burnt: W.buildings.filter((b) => b.burnt).length, boss: S.bossKills || 0, unpaid: W.buildings.filter((b) => b.unpaid).length, upkeep: +Z.upkeepTotal().toFixed(1),
      lvl: +(sv.reduce((a, q) => a + q.l, 0) / Math.max(1, sv.length)).toFixed(1), sat: Math.round(sv.reduce((a, q) => a + (q.sat || 0), 0) / Math.max(1, sv.length)),
      hpAvg: Math.round(100 * sv.reduce((a, q) => a + q.hp / q.max, 0) / Math.max(1, sv.length)), z: S.z.filter((z) => z.hp > 0).length, res: Object.keys(S.res || {}).length,
      grade: S.lastReview ? S.lastReview.grade + S.lastReview.total : '', hl: S.lvl || 0, lvUp: S.lvUp ? Math.round(S.lvUp.left / 1000) : null, ban: (S.banners || []).map((b) => b.route[0] + (b.used ? '·' : '')).join(''), fac: S.fac ? Object.entries(S.fac).map(([k, f]) => k[0] + Math.round(f.att || 0) + (f.ally ? 'A' : '') + (f.beaten ? 'B' + f.beaten : '')).join(' ') : '', ex: S.ex ? Object.values(S.ex).reduce((a, b) => a + b, 0) : 0, spec: S.sv.filter((q) => q.spec).length, hyb: S.sv.filter((q) => q.hyb).length, veh: Object.keys(S.veh || {}).join('+'), fuel: Math.round(S.fuel || 0), dogs: (S.pets || []).length, stone: Math.round(S.stone || 0), meds: Math.round(S.meds || 0), ammo: Math.round(S.ammo || 0),
      friends: (() => { let f = 0, c = 0; for (const a of sv) for (const [id, v] of Object.entries(a.rel || {})) if (+id > a.id) { if (v >= 80) c++; else if (v >= 50) f++; } return f + '/' + c; })(), couples: sv.filter((q) => q.partner).length / 2 | 0, kids: (S.kids || []).length, born: S.born || 0, pop: sv.length + (S.kids || []).length + '/' + Z.popCap() };
  };
})();
