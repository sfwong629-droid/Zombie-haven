// Behaviour probe: installs window.PR. PR.setup(opts), PR.run(days, opts) -> stats
(() => {
  const Z = window.ZH, S = Z.S, W = Z.world, Wd = Z.Wd;
  const cat = (s) => {
    const m = s.mode, p = s.purpose || '';
    if (m === 'away' || m === 'errand') return 'away';
    if (m === 'down' || m === 'hospital') return 'down/care';
    if (s.sleeping === 'rough') return 'sleep rough';
    if (s.sleeping) return 'sleep';
    if (['chase', 'attack', 'recover'].includes(m)) return 'fight';
    if (m === 'postCombat') return 'after fight';
    if (m === 'hide' || m === 'hiding') return 'hide';
    if (m === 'rescueTo' || m === 'rescueCarry') return 'rescue';
    if (m === 'work') return 'work';
    if (m === 'goWork') return 'to work';
    if (m === 'goFacility' || m === 'useFacility') { const r = s.facility && Z.facilityRules ? Z.facilityRules[s.facility.type] : null; return 'need:' + ((r && r.need) || '?'); }
    if (m === 'gather' || p.startsWith('gath')) return 'gather';
    if (p.startsWith('haul')) return 'haul';
    if (m === 'hammer' || p === 'build-go' || m === 'fix' || m === 'pitch') return 'build/repair';
    if (m === 'chat') return 'chat';
    if (m === 'campfire') return 'campfire';
    if (m === 'loot') return 'loot';
    if (m === 'goFire' || m === 'fightFire') return 'firefight';
    if (p === 'patrol') return 'patrol';
    if (m === 'free' || m === 'wait' || (m === 'walk' && (p === 'roam' || !p))) return 'idle';
    return 'other:' + m + (p ? '/' + p : '');
  };
  const PR = window.PR = {};
  PR.run = function (days, o = {}) {
    const st = { byJob: {}, byHour: {}, perSv: {}, flips: {}, churn: {}, chats: {}, why: {}, needAtWork: 0, starvingIdle: [], nightWork: 0, dayRough: 0, stuck: {}, fights: [], samples: 0 };
    const last = {}, hist = {}, posT = {};
    const T = days * 24000;
    for (let t = 0; t < T; t++) {
      if (o.noZ) S.z.length = 0;
      if (o.keepFed && t % 600 === 0) { S.food = Math.max(S.food, 25); S.water = Math.max(S.water, 25); }
      Z.simTick();
      if (t % 2000 === 0) { for (const b of W.buildings) if (b.bonus) Z.collectBonus(b); }
      if (t % 1000 === 999 && window.__answer) window.__answer();
      if (t % 30) continue; st.samples++;
      const h = S.hour;
      for (const s of S.sv) {
        const c = cat(s), id = s.name + ' (' + s.job + ')';
        (st.byJob[s.job] ||= {})[c] = (st.byJob[s.job][c] || 0) + 1;
        (st.byHour[h] ||= {})[c] = (st.byHour[h][c] || 0) + 1;
        (st.perSv[id] ||= {})[c] = (st.perSv[id][c] || 0) + 1;
        const k = s.why ? s.why.replace(/[0-9]+/g, '#').slice(0, 46) : '-'; st.why[c + ' | ' + k] = (st.why[c + ' | ' + k] || 0) + 1;
        if (c === 'work' && (s.hunger > 80 || s.thirst > 80)) st.needAtWork++;
        if ((c === 'idle' || c === 'chat') && (s.hunger > 85 || s.thirst > 85) && (S.food > 2 && S.water > 2)) st.starvingIdle.push([S.day, h, s.name, c, Math.round(s.hunger), Math.round(s.thirst), s.why]);
        if (c === 'work' && (h >= 22 || h < 5)) st.nightWork++;
        if (c === 'sleep' && h >= 9 && h <= 17) st.dayRough++;
        // churn: category changes
        const L = last[s.id]; if (L && L.c !== c) { st.churn[id] = (st.churn[id] || 0) + 1; const H = hist[s.id] ||= []; H.push([t, L.c, c]); if (H.length > 3) H.shift();
          if (H.length >= 2) { const [a, b2] = H.slice(-2); if (b2[2] === a[1] && b2[0] - a[0] < 240) { const kk = a[1] + ' -> ' + a[2] + ' -> ' + a[1]; st.flips[kk] = (st.flips[kk] || 0) + 1; } } }
        if (s.why && s.why.startsWith("Couldn't reach") && L && L.fac) { const k2 = L.fac + ' from ' + L.pos + ' last=' + L.c; (st.cant ||= {})[k2] = ((st.cant || {})[k2] || 0) + 1; }
        last[s.id] = { c, fac: s.facility ? s.facility.type + '@' + s.facility.x + ',' + s.facility.y : (s.post && s.mode === 'goWork' ? 'post:' + s.post.type : null), pos: s.w.x.toFixed(1) + ',' + s.w.y.toFixed(1) };
        // stuck: same position & same non-rest category moving=true for long
        const P = posT[s.id]; if (P && Math.hypot(P.x - s.w.x, P.y - s.w.y) < .05 && s.moving) { P.n++; if (P.n === 40) st.stuck[c + ' | ' + (s.why || '').slice(0, 40)] = (st.stuck[c + ' | ' + (s.why || '').slice(0, 40)] || 0) + 1; } else posT[s.id] = { x: s.w.x, y: s.w.y, n: 0 };
        if (s.talk && s.talk.k === 1 && s.talk !== s._lt) { s._lt = s.talk; const pk = [s.name, s.talk.q.name].sort().join(' & '); (st.talks ||= {})[pk] = ((st.talks || {})[pk] || 0) + 1; }
        if (s.chatWith && c === 'chat' && s.chatWith.id > s.id && (!s._cs || s._cs !== s.chatWith.id + ':' + (s.chatNext || 0))) { s._cs = s.chatWith.id + ':' + (s.chatNext || 0); const pk = [s.name, s.chatWith.name].sort().join(' & '); st.chats[pk] = (st.chats[pk] || 0) + 1; }
      }
    }
    st.sv = S.sv.map((s) => ({ name: s.name, job: s.job, age: Z.ageOf ? Z.ageOf(s) : null, trait: s.trait, hp: Math.round(s.hp), max: s.max, l: s.l })); st.fallen = (S.fallen || []).length; st.day = S.day;
    st.bonds = []; for (const a of S.sv) for (const b of S.sv) if (a.id < b.id && Z.bondOf) { const v = Z.bondOf(a, b); if (v) st.bonds.push([a.name, b.name, Math.round(v)]); }
    return st;
  };
})();
