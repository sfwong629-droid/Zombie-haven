/* ZH_EVAL="$(cat boost.js)" python3 run.py SEED DAYS OUT : grow a test town to Haven level 15 quickly, then play on with no help.
   While boosting: level timers end at once, a free Banner waits at each gate, the stores are kept full and newcomers arrive every two hours.
   At level 15 the help stops (AP.boostOff = that day), so the days after it show how a level-15 town copes: weekly crises, the City. */
AP.boost = true;
/* the auto-player's own list ends at about 31 buildings; level 15 needs 40, so the test town gets a longer one */
AP.plan = ['barrel', 'farm', 'tent', 'medic', 'bench', 'hq2', 'scrapyard', 'water', 'tent', 'lumber', 'crates', 'farm', 'quarry', 'armory', 'gym', 'cabin', 'library', 'storage', 'field', 'clinic', 'workshop',
  'cabin', 'farm', 'water', 'cabin', 'field', 'crates', 'tent', 'storage', 'cabin', 'farm', 'water', 'scrapyard', 'lumber', 'cabin', 'field', 'crates', 'quarry', 'cabin', 'farm', 'water', 'storage', 'cabin', 'field', 'cabin', 'farm']; ZH.ARRIVE.low = 2000; ZH.ARRIVE.high = 2000;
{ const h0 = AP.hour; AP.hour = () => { const S = ZH.S; if (window.ZHG && ZHG.shots) ZHG.shots.length = 0;
    if (AP.boost) { if (S.lvUp) S.lvUp.left = 0; S.banners = S.banners || []; if (!S.banners.some((b) => !b.used)) S.banners.push({ route: 'stronghold', day: S.day, used: false });
      for (const k of ['wood', 'stone', 'mat']) S[k] = Math.max(S[k] || 0, 250); for (const k of ['food', 'water']) S[k] = Math.max(S[k] || 0, 60); for (const k of ['cloth', 'meds', 'fuel']) S[k] = Math.max(S[k] || 0, 20); S.ren = Math.max(S.ren || 0, 900);
      if ((S.lvl || 1) >= 15) { AP.boost = false; AP.boostOff = S.day; ZH.ARRIVE.low = 8000; ZH.ARRIVE.high = 14000; } }
    h0(); };
  const s0 = AP.snap; AP.snap = () => { const r = s0(), S = ZH.S; r.boost = AP.boost ? 1 : 0; r.boostOff = AP.boostOff || 0; r.crisis = S.crisis ? S.crisis.k : ''; r.medals = S.medals || 0; r.clog = (S.crisisLog || []).map((c) => c.k + ':' + c.how + '@' + c.day).join(' '); return r; }; }
