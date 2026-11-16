// tools/qa/sos_skip_check.js — bug A2 (3D.180): a fighter who has just found they cannot get to a zombie must not be
// sent straight back at it by the "building under attack" call (the angry face then flashed above them every half second).
// Puts a zombie bashing a building near a fighter. Control: the fighter answers the call. Then marks the zombie as
// "can't get to it" for that fighter (what the chase does when there is no route) and calls again: they must stay put.
// Exit 0 ok, 1 the fighter is sent back at a zombie they cannot reach, 2 the control did not work.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'answerSOS, isFighter, canFight, sosNow: () => tick' }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, q = S.sv.find((s) => ZH.isFighter(s) && ZH.canFight(s) && s.w); if (!q) return { err: 'no fighter in the starting town' };
    const bld = ZH.world.buildings[0], z = { type: 'walker', w: { x: q.w.x + 3, y: q.w.y + 3 }, hp: 50, max: 50, cool: 40, phase: 0, mode: 'zbash', bldT: bld, bpt: { x: q.w.x + 3, y: q.w.y + 3 }, stateTicks: 9999, target: null, path: null }; S.z.push(z);
    const others = S.sv.filter((s) => s !== q), keep = others.map((s) => [s, s.mode, s.target]);
    const call = () => { q.mode = 'postCombat'; q.target = null; q.errand = null; q.carrying = null; q.rescuing = null; q.emo = null; ZH.answerSOS(); const out = { sent: q.target === z && q.mode === 'chase', emo: q.emo && q.emo.t, why: q.why }; for (const [s, m, t] of keep) { if (s.target === z) { s.mode = m; s.target = t; } } return out; };
    q.skipZ = null; const control = call(); q.skipZ = { z, t: ZH.sosNow() + 600 }; const blocked = call();
    z.hp = 0; S.z.splice(S.z.indexOf(z), 1); q.mode = 'free'; q.target = null; q.stateTicks = 30; q.skipZ = null; return { who: q.name, control, blocked }; });
  console.log(JSON.stringify(r)); if (r.err || !r.control.sent) { console.log('the control did not work: the fighter never answered the call'); await b.close(); process.exit(2); }
  const bad = r.blocked.sent; console.log(bad ? 'FAIL (bug A2): ' + r.who + ' is sent back at a zombie they cannot get to (' + r.blocked.emo + ')' : 'ok: ' + r.who + ' is not sent back at a zombie they cannot get to');
  await b.close(); process.exit(bad ? 1 : 0); })();
