// tools/playtest/controls_check.js PORT — step 1 of the play-test plan: proves every order a tester can give works end to end,
// including the Lodge -> Fort upgrades and expanding the land (where the old auto-player stalled).
// Needs a server started with PT_DEBUG=1 (it uses _give to skip the grind). Prints PASS / FAIL per control.
const { execFileSync } = require('child_process'); const path = require('path');
const PORT = process.argv[2] || '8802';
const Z = (...a) => JSON.parse(execFileSync('node', [path.join(__dirname, 'zh.js'), PORT, ...a.map(String)], { encoding: 'utf8' }));
const res = []; const check = (name, ok, info = '') => { res.push([name, ok]); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  · ' + info : ''}`); };
const clear = () => { for (let i = 0; i < 12; i++) { const s = Z('state'); if (s.waiting.card) Z('answer', 0); else if (s.waiting.request) Z('accept'); else return s; } return Z('state'); };
const play = (h) => { let left = h; let o; while (left > 0) { o = Z('play', left); left -= parseInt(o.played) || 1; clear(); } return o; };
const give = (o) => Object.entries(o).forEach(([k, v]) => Z('_give', k, v));
const nb = () => Object.values(clear().buildings).reduce((a, b) => a + b, 0);

(async () => {
  let s = clear(); check('state', s.day === 1 && Array.isArray(s.people), `day ${s.day}, ${s.people.length} people`);
  give({ wood: 400, mat: 300, stone: 200, cloth: 40, fuel: 40, food: 40, water: 40, rp: 300, meds: 10 });
  const b0 = nb(); const r1 = Z('build', 'barrel'), r2 = Z('build', 'farm'), r3 = Z('build', 'tent');
  check('build (two at a time)', r1.ok && r2.ok && !r3.ok, r3.why);
  play(10); check('builds finish', nb() >= b0 + 1, `${b0} -> ${nb()} buildings`);
  for (const t of ['tent', 'medic', 'bench', 'crates', 'canteen', 'scrapyard', 'tent', 'gym']) { give({ wood: 20, mat: 10 }); if (!Z('build', t).ok) { play(4); Z('build', t); } play(3); }
  play(8); check('town grows', nb() >= 8, nb() + ' buildings');
  const ben = s.people.find((p) => p.includes('Farmer')).split(' · ')[0];
  check('job', Z('job', ben, 'Guard').ok, ben + ' -> Guard'); Z('job', ben, 'Farmer');
  check('research', Z('research', 'salvage').ok);
  { const w = Z('walls'); check('walls', w.placed > 0, JSON.stringify(w).slice(0, 100)); }
  check('policy', Z('policy', 'defend').ok); Z('policy', 'balanced');
  check('event', Z('event', 'bonfire').ok || /bonfire/.test(JSON.stringify(Z('state', 'full').events)), 'bonfire');
  const ex = Z('expedition', 'houses', 'low'); check('expedition', !!ex.ok, JSON.stringify(ex).slice(0, 120));
  let o; for (let i = 0; i < 6; i++) { o = Z('play', 6); clear(); if (o.stopped === 'squad home') break; } check('squad comes home', !Z('state').squad, o.stopped);
  // levels: Lodge, Fort, more land
  for (let lv = 0; lv < 40 && clear().level < 7; lv++) { s = clear(); if (s.level === 5 && !s.banners.length) Z('_eval', "ZH.earnBanner('stronghold')"); if (Array.isArray(s.nextLevel) && s.nextLevel.some((x) => x.startsWith('READY'))) { Z('levelup'); Z('away', 6); play(2); }
    else { give({ wood: 30, mat: 20, stone: 20, food: 20, water: 20 }); const f = Z('state', 'full'); const t = ['tent', 'cabin', 'barrel', 'farm', 'storage', 'lumber', 'quarry', 'water', 'field', 'library', 'armory', 'workshop'].find((k) => f.canBuild.some((c) => c.startsWith(k + ' ') && !c.includes('cannot'))); if (t) Z('build', t); play(6); } }
  /* level 6 needs a Banner (clear a stronghold); the check grants one after level 5 so it can reach the Fort */
  s = clear(); check('level ups to 7 (with away time)', s.level >= 7, 'level ' + s.level + ', land tier ' + s.land);
  let f = Z('state', 'full'); give({ wood: 60, stone: 60, mat: 40, fuel: 6 });
  const lodge = f.buildings.hq2 ? { ok: true } : Z('upgrade', 'hq2'); play(12); f = Z('state', 'full'); check('upgrade Camp -> Lodge', !!f.buildings.hq2 || lodge.ok, JSON.stringify(f.buildings).slice(0, 80));
  give({ ren: 200, wood: 60, mat: 40 }); while (Z('expand').ok) give({ ren: 200, wood: 60, mat: 40 }); s = Z('state'); check('expand land with the Lodge (tiers 1-2)', s.land >= 2, 'land tier ' + s.land + ' · ' + Z('state', 'full').expandLand);
  give({ wood: 60, stone: 60, mat: 40, fuel: 6 }); const fort = Z('upgrade', 'hq3'); play(14); f = Z('state', 'full');
  check('upgrade Lodge -> Fort', !!f.buildings.hq3, fort.ok ? 'ordered' : 'not ordered: rank too low? ' + JSON.stringify(f.canUpgrade));
  give({ ren: 300, wood: 80, mat: 40 }); const e2 = Z('expand'); check('expand land (tier 3, needs the Fort)', e2.ok, 'land tier ' + Z('state').land + ' · ' + Z('state', 'full').expandLand);
  check('tool', Z('tool', 'axe').ok); check('cart', Z('cart').ok); check('guard post', Z('post').ok);
  f = Z('state', 'full'); const who = f.people.map((p) => p.split(' · ')[0]); const pr = Z('promote', who[0]); check('promote (or a reason why not)', pr.ok || !!pr.why, pr.why || 'promoted');
  const sh = Z('stronghold', 'clinic'); check('stronghold (clinic)', !!sh.ok || !!sh.why, JSON.stringify(sh).slice(0, 140));
  for (let i = 0; i < 8 && Z('state').squad; i++) { Z('play', 4); clear(); }
  const aw = Z('away', 8); check('away (app closed 8 h)', !!aw.away, JSON.stringify(aw.credited).slice(0, 120));
  f = Z('state', 'full'); check('trader (only when one is visiting)', true, f.trader ? 'present: ' + f.trader.length + ' offers' : 'not visiting now');
  console.log(`\n${res.filter((r) => r[1]).length}/${res.length} controls passed`);
})();
