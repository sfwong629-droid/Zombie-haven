// tools/playtest/town.js — runs inside the game page (installed by server.js). window.PT.run(cmd, args) is every order a
// tester can give, plus the plain town summary it reads. Orders go through the same functions the game's buttons call.
(() => {
  const Z = window.ZH, S = Z.S, Wd = Z.Wd, D = Z.DEFS, Wo = () => Z.world;
  const r1 = (v) => Math.round((v || 0) * 10) / 10;
  const who = (n) => S.sv.find((q) => q.name.toLowerCase() === String(n).toLowerCase() || q.name.split(' ')[0].toLowerCase() === String(n).toLowerCase());
  const ok = (t) => { const d = D[t]; return d && !d.hidden && S.rank >= (d.rank || 1) && (d.role === 'hq' || (d.tier || 1) <= Z.hqTier()) && Z.researched(d.res); };
  const cost = (d) => Object.entries(Z.bCost(d)).filter(([, v]) => v).map(([k, v]) => v + ' ' + k).join(', ');
  let logLast = (S.log || [])[(S.log || []).length - 1] || null;   /* the log is capped and trimmed from the front, so remember the last ENTRY, not a count */
  const newLog = () => { const A = S.log || [], i = logLast ? A.lastIndexOf(logLast) : -1, L = A.slice(i + 1); logLast = A[A.length - 1] || logLast; return L.map((e) => (e.d ? 'D' + e.d + ' ' : '') + (e.h !== undefined ? String(e.h).padStart(2, '0') + ':00 ' : '') + e.t).slice(-40); };
  const popup = () => { const m = document.getElementById('eventModal'); const bs = m ? [...m.querySelectorAll('button')] : []; if (!bs.length) return null;
    return { text: m.innerText.replace(/\s+\n/g, '\n').replace(/\n{2,}/g, '\n').trim().slice(0, 900), buttons: bs.map((b, i) => i + ': ' + b.innerText.replace(/\s+/g, ' ').trim()) }; };
  const INFO = /^(\d+: )?(got it|ok|okay|good morning|close|nice|great|continue|no more tips|let's go|back)\b/i;
  const infoOnly = (c) => c.buttons.every((b) => INFO.test(b));
  const request = () => { const b = document.getElementById('requestBox'); return S.requests && S.requests.length ? { text: b ? b.innerText.replace(/\s+/g, ' ').trim() : '', who: S.requests[0].name, job: S.requests[0].job, beds: Z.popNow() + '/' + Z.popCap(), note: 'accept or decline' } : null; };

  function state(full) {
    const W = Wo(), cnt = {}; for (const b of W.buildings) cnt[b.type] = (cnt[b.type] || 0) + 1;
    const st = Z.supplyStats ? Z.supplyStats() : {}, conds = Z.rankConds ? Z.rankConds() : null;
    const out = {
      day: S.day, hour: S.hour, night: Z.isNight(), level: S.lvl || 1, renown: Math.round(S.ren || 0),
      nextLevel: S.lvUp ? { upgrading: true, to: S.lvUp.to, minutesLeft: Math.round(S.lvUp.left / 60000) } : conds ? conds.map((c) => `${c.name}: ${c.have}/${c.need}${c.ok ? ' ✓' : c.sub ? ' (' + c.sub + ')' : ''}`).concat(S.rankReady ? ['READY: order levelup'] : []) : 'max',
      supplies: { food: r1(S.food), water: r1(S.water), cap: Z.supplyCap(), foodPerDay: r1(st.fNet), waterPerDay: r1(st.wNet), foodDaysLeft: r1(st.fDays), waterDaysLeft: r1(st.wDays) },
      materials: { scrap: Math.round(S.mat), wood: Math.round(S.wood || 0), stone: Math.round(S.stone || 0), cloth: S.cloth || 0, meds: S.meds || 0, fuel: Math.round(S.fuel || 0), ammo: S.ammo || 0, research: Math.round(S.rp || 0) },
      people: S.sv.map((q) => `${q.name} · ${q.job} L${q.l} · ${Math.round(100 * q.hp / q.max)}% · ${q.mode}${q.mode === 'down' ? ` (bleeds out in ${Math.max(0, Math.round((q.bleed || 0) / 1000))} game h; ${q.rescuer ? q.rescuer.name + ' is coming' : 'NO rescuer'})` : ''}${q.trait ? ' · ' + q.trait : ''}`),
      emergencyHelp: { radioHelpReady: !!(Z.helpReady && Z.helpReady()), note: 'when people are down: rescue NAME, bandage NAME, radiohelp, militia, defend' },
      beds: `${Z.popNow()}/${Z.popCap()}`,
      buildings: cnt, building: (S.sites || []).map((q) => q.type + ' (site)').concat(W.buildings.filter((b) => b.upg).map((b) => b.type + '→' + b.upg.to)),
      walls: W.walls.size, brokenWalls: [...W.walls.values()].filter((w) => w.broken).length, land: S.terr || 0,
      walkers: S.z.filter((z) => z.hp > 0 && !z.human).length, raiders: S.z.filter((z) => z.hp > 0 && z.human).length,
      squad: S.trip ? { dest: S.trip.dest, back: S.trip.back ? 'returning' : 'out' } : S.sh ? { stronghold: S.sh.dest } : null,
      trader: S.trader && S.trader.mode === 'stay' ? { buy: S.trader.stock.map((o, i) => `buy ${i}: ` + JSON.stringify(o).slice(0, 160)), trade: [...document.querySelectorAll('#infoPanel button, #eventModal button')].map((b) => b.innerText.trim()).filter((t) => /trade|for/i.test(t)).slice(0, 8) } : null,
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
      { const e = Z.expandInfo && Z.expandInfo(); out.expandLand = !e ? 'all land claimed' : e.ok ? 'can expand now' : (S.terr || 0) + 1 >= 4 ? 'City Limits come with Haven level 16' : !e.hqOk && (S.terr || 0) + 1 === 3 && S.rank < 3 ? `needs the Fort (HQ tier 3); the Fort unlocks at town rank 3 (rank now ${S.rank})` : !e.hqOk ? `needs a bigger HQ (land tier ${(S.terr || 0) + 1} needs HQ tier ${(S.terr || 0) + 1}; HQ is tier ${Z.hqTier()})` : `needs ${e.n.ren} renown + ${cost(e.n)}`; }
      out.jobs = Z.professions ? Z.professions() : null;
      out.events = Object.keys(Z.TOWN_EVENTS || {});
    }
    return out;
  }

  // run the game for up to h hours; stop early when a card or a request needs an answer, a squad is home, or an emergency starts
  /* a stronghold is a real-time fight: the tester watches it in slices and gives calls */
  const shView = () => { const H = S.sh; if (!H) return { fightOver: true }; const boss = (H.zs || []).find((z) => z.boss);
    return { fight: (Z.EXP_DEFS[H.dest] || {}).name || H.dest, seconds: Math.round((H.t || 0) / 60), squad: H.units.map((u) => `${u.name} ${Math.max(0, Math.round(100 * u.hp / u.max))}%${u.hp <= 0 ? ' DOWN' : ''}`), enemiesLeft: (H.zs || []).filter((z) => z.hp > 0).length, kills: H.kills || 0, boss: boss ? (boss.hp > 0 ? `${Math.round(100 * boss.hp / boss.max)}%` + (H.woke && H.woke.B ? ' (awake)' : '') : 'dead') : 'none seen', focusOnBoss: !!H.focus, retreating: !!H.back, meds: S.meds || 0, calls: 'sh focus | sh med | sh back' }; };
  let shLast = null;
  function fight(sec) { if (!S.sh) return { ok: false, why: 'no stronghold fight is running' }; const H = S.sh, m0 = { ren: S.ren, mat: S.mat, meds: S.meds, food: S.food, n: S.sv.length };
    for (let t = 0; t < sec * 60 && S.sh === H; t += 20) Z.step(20);
    if (S.sh === H) return shView();
    const c = popup(); shLast = { fightOver: true, lasted: Math.round((H.t || 0) / 60) + ' s', squadAfter: H.units.map((u) => `${u.name} ${Math.max(0, Math.round(100 * u.hp / u.max))}%`), kills: H.kills || 0, bossKilled: !!((H.zs || []).find((z) => z.boss && z.hp <= 0)), changes: { renown: Math.round(S.ren - m0.ren), scrap: Math.round(S.mat - m0.mat), meds: (S.meds || 0) - (m0.meds || 0), people: S.sv.length - m0.n }, card: c }; return shLast; }
  function play(h, stopMorning) { if (S.sh) return { played: '0 h', stopped: 'a stronghold fight is running: use `fight SECONDS` (and sh focus | sh med | sh back) until it is over', fight: shView() };
    const t0 = { day: S.day, hour: S.hour, sv: S.sv.length, fallen: (S.fallen || []).length, trip: !!S.trip };
    let why = 'time', hours = 0; const read = []; const crit0 = new Set([...Z.alerts.values()].filter((a) => a.level === 'critical').map((a) => a.key));
    for (; hours < h; hours++) {
      let cut = false; for (let k = 0; k < 1000; k += 60) { Z.step(60); Z.tripUpdate(); AP.tick(); const c = popup(); if (c && !infoOnly(c)) { cut = true; break; } }   /* a card that needs a decision stops play at once: trip choices run out */
      if (cut) { why = 'card'; hours++; break; }
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
    help: () => ({ commands: ['state [full]', 'play H [morning]  (run the game H hours; stops early for cards, requests, squads home, emergencies)', 'away H  (the app is closed for H real hours: the town is frozen, nobody heals and nothing attacks; trays fill and a level upgrade keeps counting)',
      'build TYPE', 'upgrade TYPE (the type it becomes)', 'walls [N]  (fence up to N free tiles of the wall line, default 8, north first; gates at roads; each tile costs wood)', 'job NAME JOB', 'promote NAME', 'research KEY', 'event KEY', 'expand', 'levelup',
      'expedition DEST RISK [NAME,NAME..]', 'stronghold DEST [NAME,NAME..]', 'answer N  (button N on the card)', 'accept | decline  (move-in request)', 'buy N | trade N  (trader)',
      'policy produce|defend|recover', 'post  (a guard post by the north gate)', 'tool axe|bar|pick', 'cart',
      'EMERGENCIES: rescue NAME | bandage NAME | radiohelp | militia | defend',
      'GEAR: stash (what is in the stash, who wears what, what can be crafted) | equip NAME ITEM | unequip NAME SLOT | craft ITEM | power NAME,NAME,.. (power of a squad you pick)',
      'STRONGHOLD FIGHT: after `stronghold DEST NAMES` use `fight SECONDS` to watch it in slices; calls: sh focus | sh med | sh back'] }),
    state: (a) => state(a[0] === 'full'),
    play: (a) => play(Math.min(48, +a[0] || 1), a[1] === 'morning'),
    away: (a) => { const ms = (+a[0] || 1) * 3600e3; window.__away += ms; const got = Z.awayCredit(ms); return { away: a[0] + ' h', credited: got || 'nothing' }; },
    build: (a) => { const why = !D[a[0]] ? 'unknown type' : !ok(a[0]) ? 'not unlocked yet' : !Z.canPay(Z.bCost(D[a[0]])) ? 'cannot afford: ' + cost(D[a[0]]) : (S.sites || []).length + Wo().buildings.filter((b) => b.upg).length >= 2 ? 'two builds already running (the limit)' : ''; if (why) return { ok: false, why }; const r = AP.place(a[0]); if (r) return { ok: true, why: '' };
      /* say what the game itself says: the most common reason over the build area */
      const d = D[a[0]], B = Wd.BUILD, why2 = {}; for (let y = B.y0; y <= B.y1 - d.h + 1; y++) for (let x = B.x0; x <= B.x1 - d.w + 1; x++) { const c = Wd.placementCheck(Wo(), x, y, d, null); if (!c.ok) why2[c.why] = (why2[c.why] || 0) + 1; }
      const top = Object.entries(why2).sort((p, q) => q[1] - p[1]).slice(0, 3).map(([k, v]) => `"${k}" on ${v} spots`).join(', ');
      return { ok: false, why: 'no spot in the build area will take it. The game says: ' + (top || 'nothing') }; },
    upgrade: (a) => { const d = D[a[0]]; if (!d || !d.up) return { ok: false, why: 'give the type it BECOMES (see canUpgrade), e.g. upgrade hq2' }; const prev = Object.keys(D).find((k) => D[k].next === a[0]); if (!Wo().buildings.some((b) => b.type === prev && !b.upg)) return { ok: false, why: `no ${prev} to upgrade` }; if (!ok(a[0])) return { ok: false, why: 'not unlocked yet' }; if (!Z.canPay(Z.bCost(d))) return { ok: false, why: 'cannot afford: ' + cost(d) }; const b = Wo().buildings.find((q) => q.type === prev && !q.upg), c = Z.upgradeCheck(b); if (!c.ok) return { ok: false, why: c.why || 'the game refuses this upgrade' }; return { ok: !!AP.place(a[0]) }; },
    walls: (a) => {   /* fence every free tile of the wall line (north side first), gates where a road crosses; never removes a wall */
      const Zn = Wd.WALLZONE, W = Wo(), T = []; for (let x = Zn.x0; x <= Zn.x1; x++) T.push([x, Zn.y0], [x, Zn.y1]); for (let y = Zn.y0 + 1; y < Zn.y1; y++) T.push([Zn.x0, y], [Zn.x1, y]);
      T.sort((p, q) => p[1] - q[1]); let n = 0; const max = +a[0] || 8;
      { const cx = Math.round((Zn.x0 + Zn.x1) / 2), cy = Math.round((Zn.y0 + Zn.y1) / 2); for (const [x, y] of [[cx, Zn.y1], [cx, Zn.y0], [Zn.x0, cy], [Zn.x1, cy]]) { const ex = Wd.wallAt(W, x, y); if (!ex || ex.type !== 'gate') { const m0 = S.mat + (S.wood || 0); Z.tryWall(x, y, 'gate'); if (S.mat + (S.wood || 0) < m0) n++; } } }   /* a gate in the middle of each side first: a fence with no gate locks your own people out */
      for (const [x, y] of T) { if (n >= max) break; if (Wd.wallAt(W, x, y)) continue; const gate = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => Wd.isRoad(W, x + dx, y + dy)); const m0 = S.mat + (S.wood || 0); Z.tryWall(x, y, gate ? 'gate' : 'wood'); if (S.mat + (S.wood || 0) < m0) n++; else if (!Z.canPay({ wood: 4 })) break; }
      const per = Wd.perimeter(W); return { placed: n, sealed: !!per.sealed, wallTiles: W.walls.size }; },
    job: (a) => { const q = who(a[0]); return { ok: !!(q && Z.changeProfession(q, a.slice(1).join(' '))) }; },
    promote: (a) => { const q = who(a[0]); if (!q) return { ok: false, why: 'no such person' }; const w = Z.specWhy(q); return w ? { ok: false, why: w } : { ok: !!Z.promoteSpec(q) }; },
    research: (a) => { const r = Z.RESEARCH[a[0]]; if (!r) return { ok: false, why: 'unknown research' }; const ok2 = !!Z.doResearch(a[0]); return { ok: ok2, why: ok2 ? '' : `needs ${r.rp} research points (have ${Math.round(S.rp || 0)}) and ${r.mat} scrap (have ${Math.round(S.mat)})` }; },
    event: (a) => ({ ok: !!Z.holdEvent(a[0]) }),
    expand: () => { const ok2 = !!Z.expandTerritory(); return { ok: ok2, why: ok2 ? '' : state(true).expandLand }; },
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
    rescue: (a) => { const q = who(a[0]); if (!q || q.mode !== 'down') return { ok: false, why: 'that person is not down' }; return { ok: !!Z.orderRescueX(q) || true, note: 'rescue ordered: escorts clear the way and a rescuer goes in' }; },
    bandage: (a) => { const q = who(a[0]); if (!q || q.mode !== 'down') return { ok: false, why: 'that person is not down' }; const ok2 = !!Z.useBandage(q); return { ok: ok2, why: ok2 ? '' : 'needs 1 cloth (or scrap)' }; },
    radiohelp: () => { if (!Z.helpReady()) return { ok: false, why: 'radio help is not ready (already called, a favour is owed, or it is recharging)' }; Z.radioHelp(); return { ok: true }; },
    militia: () => ({ ok: !!Z.militia(), note: 'healthy civilians band together when no fighter is left' }),
    defend: () => { const z = S.z.filter((q) => q.hp > 0 && !q.human)[0]; if (!z) return { ok: false, why: 'no walkers' }; return { ok: !!Z.sendDefender({ x: z.w.x, y: z.w.y }) }; },
    stash: () => ({ stash: Object.entries(S.inv || {}).filter(([, n]) => n > 0).map(([id, n]) => `${id} (${(Z.ITEMS[id] || {}).name || id}, ${(Z.ITEMS[id] || {}).slot || '?'}${(Z.ITEMS[id] || {}).atk ? ', atk ' + Z.ITEMS[id].atk : ''}${(Z.ITEMS[id] || {}).def ? ', def ' + Z.ITEMS[id].def : ''}) ×${n}`), wearing: S.sv.map((q) => `${q.name}: ` + Object.entries(q.eq || {}).filter(([, v]) => v).map(([sl, v]) => `${sl}=${v}`).join(', ')), craftable: Object.entries(Z.RECIPESX || {}).filter(([k]) => Z.researched(k)).flatMap(([, l]) => l).map((id) => `${id} (${(Z.ITEMS[id] || {}).name || id}): ${Z.craftCostX(id)} scrap`), craftNeeds: 'a Workshop and the research (blades / firearms / bodyArmor / gadgets)' }),
    equip: (a) => { const q = who(a[0]); if (!q) return { ok: false, why: 'no such person' }; const ok2 = !!Z.equip(q, a[1]); return { ok: ok2, why: ok2 ? '' : 'not in the stash (see stash)' }; },
    unequip: (a) => { const q = who(a[0]); if (!q) return { ok: false, why: 'no such person' }; const ok2 = !!Z.unequipX(q, a[1]); return { ok: ok2, why: ok2 ? '' : 'slot is one of: weapon, armor, head, tool (see stash → wearing)' }; },
    craft: (a) => { const ok2 = !!Z.craft(a[0]); return { ok: ok2, why: ok2 ? '' : 'needs a Workshop, the research, and ' + Z.craftCostX(a[0]) + ' scrap' }; },
    power: (a) => { const ids = (a[0] || '').split(',').map((n) => who(n)).filter(Boolean); return { squad: ids.map((q) => q.name), power: Z.shPower(ids), note: 'compare with the recommended power in state full → strongholds' }; },
    fight: (a) => fight(Math.min(120, +a[0] || 10)),
    sh: (a) => { if (!S.sh) return { ok: false, why: 'no stronghold fight is running' }; if (!['focus', 'med', 'back'].includes(a[0])) return { ok: false, why: 'sh focus (everyone on the boss, toggles) | sh med (medkit on the worst hurt, costs 1 meds) | sh back (retreat)' }; Z.shCall(a[0]); return { ok: true, ...shView() }; },
    _give: (a) => { if (!window.PT_DEBUG) return { error: 'debug only' }; S[a[0]] = (S[a[0]] || 0) + (+a[1] || 0); return { [a[0]]: S[a[0]] }; },
    _eval: (a) => { if (!window.PT_DEBUG) return { error: 'debug only' }; return { result: JSON.stringify(eval(a.join(' '))) }; },
  };
  window.PT = { run(cmd, args) { const f = ACT[cmd]; if (!f) return { error: 'unknown command ' + cmd, ...ACT.help() }; const r = f(args || []); const o = typeof r === 'object' && r ? r : { result: r };
    if (cmd !== 'state' && cmd !== 'help') { o.day = S.day; o.hour = S.hour; const c = popup(), q = request(); if (c) o.card = c; if (q) o.request = q; if (cmd === 'play') o.news = newLog(); }
    else { o.day = o.day ?? S.day; o.hour = o.hour ?? S.hour; } return o; } };
})();
