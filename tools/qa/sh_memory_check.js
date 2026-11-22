// tools/qa/sh_memory_check.js — 3D.302 (Strongholds chat, the rework: "killed is killed"). A sealed place remembers between visits.
// A real (not practice) squad goes into the Clinic: it is built at the Clinic's own size whatever the town's level; they kill some of the dead,
// open a locked door and empty the pharmacy locker, then leave. Second visit: the dead they killed are gone, the door is still open, the locker
// is still empty, and the rest are still there. Then they win: the Clinic is Secured, locked on the trip list and cannot be entered again.
// A practice run never touches the memory. A seasonal place does not remember. No server needed. Exit 0 ok, 1 a check failed.
const Q = require('./sh_lib');
(async () => { const b = await Q.launch(); const p = await Q.open(b); await Q.newGame(p); const bad = [], ok = (c, m) => { if (!c) bad.push(m); };
  const go = (dest) => p.evaluate((dest) => { const S = ZH.S; S.lvl = 12; S.food = 99; S.water = 99; for (const q of S.sv) { q.max = q.hp = 99999; } S.shTryDay = {}; const r = ZH.startStronghold(dest, S.sv.slice(0, 4).map((q) => q.id), { quiet: true }); return r; }, dest);
  let r = await go('clinic'); ok(r.ok, 'could not start the Clinic: ' + r.why);
  const v1 = await p.evaluate(() => { const H = ZH.S.sh, n0 = H.zs.length, wards = Object.keys(H.plan.rooms).filter((k) => /^w[ns]/.test(k)).length;
    const kill = H.zs.filter((z) => !z.boss).slice(0, 6); for (const z of kill) z.hp = 0; const di = H.doors.findIndex((d) => d.locked); H.doors[di].open = true; H.doors[di].locked = false; H.doors[di].broken = true;
    const t = H.things.find((q) => q.task === 'locker'); t.done = true; ZH.step(30); ZH.shEnd(false, true); return { n0, wards, lvl: H.lvl, di, mem: !!ZH.S.shMem.clinic, dead: ZH.S.shMem.clinic.dead.length, home: ZH.S.sv.length }; });
  console.log('visit 1:', JSON.stringify(v1)); ok(v1.lvl === 6 && v1.wards === 6, `the Clinic was not built at its own size (level ${v1.lvl}, ${v1.wards} wards)`); ok(v1.mem && v1.dead === 6, 'the first visit was not remembered');
  await Q.clearCards(p); r = await go('clinic'); ok(r.ok, 'could not go back in: ' + r.why);
  const v2 = await p.evaluate((v1) => { const H = ZH.S.sh; const out = { n: H.zs.length, door: H.doors[v1.di].open && !H.doors[v1.di].locked, locker: H.things.find((q) => q.task === 'locker').done, again: !!H.again, side: H.tasks.find((T) => T.opt).done };
    ZH.step(30); for (const z of H.zs) z.hp = 0; H.bossDown = true; ZH.step(120); if (ZH.S.sh) ZH.shEnd(true, false); return { ...out, secured: ZH.shSecured('clinic'), lock: ZH.expLocked('clinic') }; }, v1);
  console.log('visit 2:', JSON.stringify(v2)); ok(v2.n === v1.n0 - 6, `the dead came back: ${v2.n} inside, expected ${v1.n0 - 6}`); ok(v2.door, 'the opened door was shut again'); ok(v2.locker && v2.side, 'the locker was full again'); ok(v2.secured && /Secured/.test(v2.lock), 'a won Clinic is not Secured');
  await Q.clearCards(p); r = await go('clinic'); ok(!r.ok && /secured/.test(r.why), 'a Secured place could be entered again');
  const v3 = await p.evaluate(() => { const S = ZH.S; const before = JSON.stringify(S.shMem); const sq = S.sv.slice(0, 3).map((q) => q.id); const r = ZH.startStronghold('prison', sq, { practice: true, lv: 5, quiet: true }); for (const z of S.sh.zs) z.hp = 0; ZH.shEnd(false, true); return { ok: r.ok, same: JSON.stringify(S.shMem) === before }; });
  ok(v3.ok && v3.same, 'a practice run changed the memory'); await Q.clearCards(p);
  r = await go('sh_spring'); const v4 = await p.evaluate(() => { const H = ZH.S.sh; if (!H) return { ran: false }; for (const z of H.zs.slice(0, 3)) z.hp = 0; ZH.shEnd(false, true); return { ran: true, mem: !!(ZH.S.shMem || {}).sh_spring }; });
  ok(v4.ran && !v4.mem, 'a seasonal place remembered (it should not)');
  if (p.errs.length) { console.log('page errors:', p.errs.slice(0, 5)); bad.push('page errors'); }
  console.log(bad.length ? 'FAIL:\n  ' + bad.join('\n  ') : 'ok: a sealed place remembers what was killed, opened and taken; a won one is Secured; practice and seasons are untouched'); await b.close(); process.exit(bad.length ? 1 : 0);
})();
