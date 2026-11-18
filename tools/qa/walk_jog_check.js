// tools/qa/walk_jog_check.js — 3D.189: survivors walk (a recorded real walk) on strolls and short trips and jog (a recorded real jog) to work.
// Checks: both models have the jog clip; the rule picks walking and jogging as decided; nobody skates (the steps match the ground covered).
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { expose: 'strolling, STROLL, WALK' }); let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
  await Q.newGame(p); await Q.clearCards(p);
  const clips = await p.evaluate(() => ZH3D.clipNames()); ok(clips.includes('jog') && clips.includes('walk'), 'the survivor model has walk and jog clips (' + clips.length + ' clips)');
  const rule = await p.evaluate(() => { const z = ZH.S.z; ZH.S.z = []; const r = [ZH.strolling({ mode: 'walk', purpose: 'roam', tripLen: 12 }), ZH.strolling({ mode: 'goFacility', tripLen: 12 }), ZH.strolling({ mode: 'chat', tripLen: 9 }), ZH.strolling({ mode: 'goWork', tripLen: 2 }),
    ZH.strolling({ mode: 'goWork', tripLen: 9 }), ZH.strolling({ mode: 'walk', purpose: 'gath-back', tripLen: 9 }), ZH.strolling({ mode: 'walk', purpose: 'roam', carrying: {} })]; ZH.S.z = z; return r; });
  ok(rule.slice(0, 4).every(Boolean), 'a stroll, a trip to a facility, a chat and a 2-tile trip are walked'); ok(!rule[4] && !rule[5] && !rule[6], 'a long trip to work, a gathering trip and carrying are not slowed');
  ok(await p.evaluate(() => Math.abs(ZH.STROLL - .63) < .001), 'walking pace is 63% of the old pace');
  // watch the town: send one person on a long stroll and one on a long work-style trip, sample everyone
  await p.evaluate(() => { const sv = ZH.S.sv.filter((s) => s.hp > 0); const far = (s) => ({ x: s.w.x + (s.w.x > 30 ? -9 : 9), y: s.w.y }); if (sv[0]) Object.assign(sv[0], { mode: 'walk', purpose: 'roam', dest: far(sv[0]), path: null, pathGoal: null, stateTicks: 3000 }); if (sv[1]) Object.assign(sv[1], { mode: 'walk', purpose: 'post', dest: far(sv[1]), path: null, pathGoal: null, stateTicks: 3000 }); });
  const S = []; for (let i = 0; i < 70; i++) { await p.waitForTimeout(700); S.push(...await p.evaluate(() => ZH.S.sv.map((s, i) => { const c = ZH3D.pClip(s); return c && { i, mode: s.mode, pur: s.purpose, ...c }; }).filter(Boolean))); }
  const mv = S.filter((x) => /^(walk|walk_f|jog|(melee|gun)_hold_(walk|jog))$/.test(x.clip) && x.spd > .3), w = mv.filter((x) => !/jog/.test(x.clip)), j = mv.filter((x) => /jog/.test(x.clip));
  console.log('samples', S.length, 'moving', mv.length, 'walking', w.length, 'jogging', j.length);
  ok(w.length > 3, 'someone was seen walking'); ok(j.length > 3, 'someone was seen jogging');
  const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1] || 0;
  ok(med(w.map((x) => x.spd)) < 1.22, 'walkers cover ' + med(w.map((x) => x.spd)).toFixed(2) + ' units a second (under 1.22)'); ok(med(j.map((x) => x.spd)) > 1.1, 'joggers cover ' + med(j.map((x) => x.spd)).toFixed(2) + ' units a second (over 1.1)');
  const slide = mv.map((x) => Math.abs(x.spd - x.st * x.rate)), okN = slide.filter((d) => d < .3).length; ok(okN >= mv.length * .85, 'no skating: in ' + okN + ' of ' + mv.length + ' samples the steps match the ground covered (median gap ' + med(slide).toFixed(2) + ')');
  ok(med(w.map((x) => x.rate)) > .8 && med(w.map((x) => x.rate)) < 1.25 && med(j.map((x) => x.rate)) > .8 && med(j.map((x) => x.rate)) < 1.25, 'the clips play near their recorded speed (walk x' + med(w.map((x) => x.rate)).toFixed(2) + ', jog x' + med(j.map((x) => x.rate)).toFixed(2) + ')');
  { const cr = S.filter((x) => x.clip === 'carry_walk' && x.spd > .3); if (cr.length) { const g = cr.map((x) => Math.abs(x.spd - x.st * x.rate)); ok(med(g) < .3 && med(cr.map((x) => x.rate)) < 1.4, '3D.191 carriers: ' + cr.length + ' samples, steps match the ground (gap ' + med(g).toFixed(2) + '), played x' + med(cr.map((x) => x.rate)).toFixed(2)); } else console.log('note  nobody carried anything during the watch'); }
  // 3D.191 the renderer's pace for each recorded clip must be the ground the recording covers in a second (ground per cycle / clip length, from retarget.py), or the feet slide
  { const mw = .798 / .875, mj = 1.209 / .775, fw = .767 / .875, fj = 1.162 / .775, WANT = { m: { walk: mw, jog: mj, carry_walk: 1.029 / .7417, melee_hold_walk: mw, gun_hold_walk: mw, melee_hold_jog: mj, gun_hold_jog: mj }, f: { walk: fw, walk_f: fw, jog: fj, carry_walk: .989 / .7417, melee_hold_walk: fw, gun_hold_walk: fw, melee_hold_jog: fj, gun_hold_jog: fj } }, seen = {};
    for (const x of S) { const w = WANT[x.fem ? 'f' : 'm'][x.clip]; if (w && x.st) seen[(x.fem ? 'woman ' : 'man ') + x.clip] = Math.abs(x.st / w - 1); }
    const k = Object.keys(seen), worst = Math.max(0, ...Object.values(seen)); ok(k.length >= 2 && worst < .03, 'the pace set for each recorded clip matches the recording (' + k.join(', ') + '; worst ' + (worst * 100).toFixed(1) + '% off)'); }
  ok(!p.errs.length, 'no page errors' + (p.errs.length ? ': ' + p.errs[0] : '')); await Q.shot(p, '/tmp/walk_jog.png'); await b.close(); console.log(bad ? bad + ' FAILED' : 'ALL OK'); process.exit(bad ? 1 : 0); })();
