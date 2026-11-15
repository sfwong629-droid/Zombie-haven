// tools/playtest/town.js — runs inside the game page (installed by server.js). window.PT.run(cmd, args) is every order a
// tester can give, plus the plain town summary it reads. Orders go through the same functions the game's buttons call.
(() => {
  const Z = window.ZH, S = Z.S, Wd = Z.Wd, D = Z.DEFS, Wo = () => Z.world;
  const r1 = (v) => Math.round((v || 0) * 10) / 10;
  const who = (n) => S.sv.find((q) => q.name.toLowerCase() === String(n).toLowerCase() || q.name.split(' ')[0].toLowerCase() === String(n).toLowerCase());
  const ok = (t) => { const d = D[t]; return d && !d.hidden && S.rank >= (d.rank || 1) && (d.role === 'hq' || (d.tier || 1) <= Z.hqTier()) && Z.researched(d.res); };
  const cost = (d) => Object.entries(Z.bCost(d)).filter(([, v]) => v).map(([k, v]) => v + ' ' + k).join(', ');
  let logSeen = (S.log || []).length;
  const newLog = () => { const L = (S.log || []).slice(logSeen); logSeen = (S.log || []).length; return L.map((e) => (e.d ? 'D' + e.d + ' ' : '') + (e.h !== undefined ? String(e.h).padStart(2, '0') + ':00 ' : '') + e.t).slice(-40); };
  const popup = () => { const m = document.getElementById('eventModal'); const bs = m ? [...m.querySelectorAll('button')] : []; if (!bs.length) return null;
    return { text: m.innerText.replace(/\s+\n/g, '\n').replace(/\n{2,}/g, '\n').trim().slice(0, 900), buttons: bs.map((b, i) => i + ': ' + b.innerText.replace(/\s+/g, ' ').trim()) }; };
  const INFO = /^(\d+: )?(got it|ok|okay|good morning|close|nice|great|continue|no more tips|let's go|back)\b/i;
  const infoOnly = (c) => c.buttons.every((b) => INFO.test(b));
  const request = () => S.requests && S.requests.length ? { who: S.requests[0].name, job: S.requests[0].job, note: 'accept or decline' } : null;

  function state(full) {
    const W = Wo(), cnt = {}; for (const b of W.buildings) cnt[b.type] = (cnt[b.type] || 0) + 1;
    const st = Z.supplyStats ? Z.supplyStats() : {}, conds = Z.rankConds ? Z.rankConds() : null;
    const out = {
      day: S.day, hour: S.hour, night: Z.isNight(), level: S.lvl || 1, renown: Math.round(S.ren || 0),
      nextLevel: S.lvUp ? { upgrading: true, to: S.lvUp.to, minutesLeft: Math.round(S.lvUp.left / 60000) } : conds ? conds.map((c) => `${c.name}: ${c.have}/${c.need}${c.ok ? ' ✓' : ''}`).concat(S.rankReady ? ['READY: order levelup'] : []) : 'max',
      supplies: { food: r1(S.food), water: r1(S.water), cap: Z.supplyCap(), foodPerDay: r1(st.fNet), waterPerDay: r1(st.wNet), foodDaysLeft: r1(st.fDays), waterDaysLeft: r1(st.wDays) },
      materials: { scrap: Math.round(S.mat), wood: Math.round(S.wood || 0), stone: Math.round(S.stone || 0), cloth: S.cloth || 0, meds: S.meds || 0, fuel: Math.round(S.fuel || 0), ammo: S.ammo || 0, research: Math.round(S.rp || 0) },
      people: S.sv.map((q) => `${q.name} · ${q.job} L${q.l} · ${Math.round(100 * q.hp / q.max)}% · ${q.mode}${q.trait ? ' · ' + q.trait : ''}`),
      beds: `${Z.popNow()}/${Z.popCap()}`,
      buildings: cnt, building: (S.sites || []).map((q) => q.type + ' (site)').concat(W.buildings.filter((b) => b.upg).map((b) => b.type + '→' + b.upg.to)),
      walls: W.walls.size, brokenWalls: [...W.walls.values()].filter((w) => w.broken).length, land: S.terr || 0,
      walkers: S.z.filter((z) => z.hp > 0 && !z.human).length, raiders: S.z.filter((z) => z.hp > 0 && z.human).length,
      squad: S.trip ? { dest: S.trip.dest, back: S.trip.back ? 'returning' : 'out' } : S.sh ? { stronghold: S.sh.dest } : null,
      trader: S.trader && S.trader.mode === 'stay' ? S.trader.stock.map((o, i) => i + ': ' + (o.name || o.k) + (o.sold ? ' (sold)' : '')) : null,
      banners: (S.banners || []).map((b) => b.route + (b.used ? ' (used)' : '')), policy: Z.policy && Z.policy(),
      waiting: { card: popup(), request: request() },
      news: newLog(),
    };
    if (full) {
      out.canBuild = Object.keys(D).filter((t) => ok(t) && !D[t].up && !D[t].fake).map((t) => `${t} (${D[t].name}): ${cost(D[t])}${Z.canPay(Z.bCost(D[t])) ? '' : ' · cannot afford'}`);
      out.canUpgrade = Object.keys(D).filter((t) => D[t].up && ok(t)).map((t) => { const prev = Object.keys(D).find((k) => D[k].next === t); const b = prev && W.buildings.find((q) => q.type === prev && !q.upg); return b ? `${prev}→${t}: ${cost(D[t])}${Z.canPay(Z.bCost(D[t])) ? '' : ' · cannot afford'}` : null; }).filter(Boolean);
      out.research = Object.entries(Z.RESEARCH).filter(([k, r]) => !Z.researched(k) && Z.researched(r.need)).map(([k, r]) => `${k} (${r.name}): ${r.rp} research + ${r.mat} scrap`);
      out.expeditions = Object.entries(Z.EXP_DEFS).map(([k, d]) => `${k} (${d.name}) risks ${d.risks.join('/')}${Z.expLocked(k) ? ' · LOCKED: ' + Z.expLocked(k) : ''}`);
      out.strongholds = Object.entries(Z.SH_DEFS).map(([k, d]) => `${k} (${(Z.EXP_DEFS[k] || d).name}) recommended power ${d.rec}${Z.expLocked && Z.EXP_DEFS[k] && Z.expLocked(k) ? ' · locked' : ''}`);
      out.squadPower = Z.shPower ? Z.shPower(Z.expAutoSquad(4)) : null;
      { const e = Z.expandInfo && Z.expandInfo(); out.expandLand = !e ? 'all land claimed' : e.ok ? 'can expand now' : (S.terr || 0) + 1 >= 4 ? 'City Limits come with Haven level 16' : !e.hqOk ? `needs a bigger HQ (land tier ${(S.terr || 0) + 1} needs HQ tier ${(S.terr || 0) + 1}; HQ is tier ${Z.hqTier()})` : `needs ${e.n.ren} renown + ${cost(e.n)}`; }
      out.jobs = Z.professions ? Z.professions() : null;
      out.events = Object.keys(Z.TOWN_EVENTS || {});
    }
    return out;
  }

  // run the game for up to h hours; stop early when a card or a request needs an answer, a squad is home, or an emergency starts
  function play(h, stopMorning) {
    const t0 = { day: S.day, hour: S.hour, sv: S.sv.length, fallen: (S.fallen || []).length, trip: !!S.trip };
    let why = 'time', hours = 0; const read = []; const crit0 = new Set([...Z.alerts.values()].filter((a) => a.level === 'critical').map((a) => a.key));
    for (; hours < h; hours++) {
      for (let k = 0; k < 1000; k += 60) { Z.step(60); Z.tripUpdate(); AP.tick(); }
      AP.hour();
      for (let g = 0; g < 6; g++) { const c = popup(); if (!c || !infoOnly(c)) break; read.push(`D${S.day} ${String(S.hour).padStart(2, '0')}:00 [card] ` + c.text.split('\n').slice(0, 8).join(' / ').slice(0, 400)); document.querySelector('#eventModal button').click(); }   /* plain info cards (only OK-type buttons): read them out, close them */
      if (popup()) { why = 'card'; hours++; break; }
      if (request()) { why = 'request'; hours++; break; }
      if (t0.trip && !S.trip) { why = 'squad home'; hours++; break; }
      const crit = [...Z.alerts.values()].filter((a) => a.level === 'critical' && !crit0.has(a.key)); if (crit.length) { why = 'emergency: ' + crit.map((a) => a.text).join(' / '); hours++; break; }
      if (stopMorning && S.hour === 7) { why = 'morning'; hours++; break; }
      if (!S.sv.length) { why = 'everyone is gone'; break; }
    }
    return { played: hours + ' h', stopped: why, lost: (S.fallen || []).length - t0.fallen, cardsRead: read };
  }

  const ACT = {
    help: () => ({ commands: ['state [full]', 'play H [morning]  (run the game H hours; stops early for cards, requests, squads home, emergencies)', 'away H  (the app is closed for H real hours)',
      'build TYPE', 'upgrade TYPE (the type it becomes)', 'walls [N]  (fence up to N free tiles of the wall line, north first; gates at roads)', 'job NAME JOB', 'promote NAME', 'research KEY', 'event KEY', 'expand', 'levelup',
      'expedition DEST RISK [NAME,NAME..]', 'stronghold DEST [NAME,NAME..]', 'answer N  (button N on the card)', 'accept | decline  (move-in request)', 'buy N | trade N  (trader)',
      'policy produce|defend|recover', 'post  (a guard post by the north gate)', 'tool axe|bar|pick', 'cart'] }),
    state: (a) => state(a[0] === 'full'),
    play: (a) => play(Math.min(48, +a[0] || 1), a[1] === 'morning'),
    away: (a) => { const ms = (+a[0] || 1) * 3600e3; window.__away += ms; const got = Z.awayCredit(ms); return { away: a[0] + ' h', credited: got || 'nothing' }; },
    build: (a) => { const why = !D[a[0]] ? 'unknown type' : !ok(a[0]) ? 'not unlocked yet' : !Z.canPay(Z.bCost(D[a[0]])) ? 'cannot afford: ' + cost(D[a[0]]) : (S.sites || []).length + Wo().buildings.filter((b) => b.upg).length >= 2 ? 'two builds already running (the limit)' : ''; if (why) return { ok: false, why }; const r = AP.place(a[0]); return { ok: !!r, why: r ? '' : AP.full ? 'no free land: expand' : 'could not place' }; },
    upgrade: (a) => ({ ok: AP.place(a[0]) || false }),
    walls: (a) => {   /* fence every free tile of the wall line (north side first), gates where a road crosses; never removes a wall */
      const Zn = Wd.WALLZONE, W = Wo(), T = []; for (let x = Zn.x0; x <= Zn.x1; x++) T.push([x, Zn.y0], [x, Zn.y1]); for (let y = Zn.y0 + 1; y < Zn.y1; y++) T.push([Zn.x0, y], [Zn.x1, y]);
      T.sort((p, q) => p[1] - q[1]); let n = 0; const max = +a[0] || 999;
      for (const [x, y] of T) { if (n >= max) break; if (Wd.wallAt(W, x, y)) continue; const gate = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => Wd.isRoad(W, x + dx, y + dy)); const m0 = S.mat + (S.wood || 0); Z.tryWall(x, y, gate ? 'gate' : 'wood'); if (S.mat + (S.wood || 0) < m0) n++; else if (!Z.canPay({ wood: 4 })) break; }
      const per = Wd.perimeter(W); return { placed: n, sealed: !!per.sealed, wallTiles: W.walls.size }; },
    job: (a) => { const q = who(a[0]); return { ok: !!(q && Z.changeProfession(q, a.slice(1).join(' '))) }; },
    promote: (a) => { const q = who(a[0]); if (!q) return { ok: false, why: 'no such person' }; const w = Z.specWhy(q); return w ? { ok: false, why: w } : { ok: !!Z.promoteSpec(q) }; },
    research: (a) => ({ ok: !!Z.doResearch(a[0]) }),
    event: (a) => ({ ok: !!Z.holdEvent(a[0]) }),
    expand: () => ({ ok: !!Z.expandTerritory() }),
    levelup: () => ({ ok: Z.upgradeTown() !== false, upgrading: !!S.lvUp }),
    expedition: (a) => { const ids = a[2] ? a[2].split(',').map((n) => who(n)).filter(Boolean).map((q) => q.id) : Z.expAutoSquad(3).map((q) => q.id); return Z.startExpedition(a[0], a[1] || 'low', ids); },
    stronghold: (a) => { const ids = a[1] ? a[1].split(',').map((n) => who(n)).filter(Boolean).map((q) => q.id) : Z.expAutoSquad(4).map((q) => q.id); return Z.startStronghold(a[0], ids); },
    answer: (a) => { const bs = [...document.querySelectorAll('#eventModal button')]; const b = bs[+a[0]]; if (!b) return { ok: false, why: 'no such button' }; const t = b.innerText.trim(); b.click(); return { ok: true, pressed: t, next: popup() }; },
    accept: () => { const b = document.getElementById('acceptReq'); if (b) b.click(); return { ok: !!b }; },
    decline: () => { const b = document.getElementById('declineReq'); if (b) b.click(); return { ok: !!b }; },
    buy: (a) => ({ ok: !!Z.traderBuy(+a[0]) }), trade: (a) => ({ ok: !!Z.traderTrade(+a[0]) }),
    policy: (a) => { Z.setPolicy(a[0]); return { ok: Z.policy() === a[0] }; },
    post: () => { const B = Wd.BUILD, cx = Math.round((B.x0 + B.x1) / 2); for (const [x, y] of [[cx, B.y0], [cx - 1, B.y0], [cx + 1, B.y0], [cx, B.y0 + 1]]) { const r = Z.tryPost(x, y); if (r.ok) return { ok: true }; } return { ok: false }; },
    tool: (a) => ({ ok: !!Z.craftTool(a[0]) }), cart: () => ({ ok: !!Z.vehBuildCart() }),
    _give: (a) => { if (!window.PT_DEBUG) return { error: 'debug only' }; S[a[0]] = (S[a[0]] || 0) + (+a[1] || 0); return { [a[0]]: S[a[0]] }; },
    _eval: (a) => { if (!window.PT_DEBUG) return { error: 'debug only' }; return { result: JSON.stringify(eval(a.join(' '))) }; },
  };
  window.PT = { run(cmd, args) { const f = ACT[cmd]; if (!f) return { error: 'unknown command ' + cmd, ...ACT.help() }; const r = f(args || []); const o = typeof r === 'object' && r ? r : { result: r };
    if (cmd !== 'state' && cmd !== 'help') { o.day = S.day; o.hour = S.hour; const c = popup(), q = request(); if (c) o.card = c; if (q) o.request = q; if (cmd === 'play') o.news = newLog(); }
    else { o.day = o.day ?? S.day; o.hour = o.hour ?? S.hour; } return o; } };
})();
