// node sh_probe.js OUT.json MAP:LV:N:TIME:STRAT:MEDS[:TRIALS] ...
// Plays strongholds and faction camps in practice mode with a simple bot, many times, and writes one JSON line per run.
//   MAP   clinic | prison | sh_spring | sh_summer | sh_autumn | sh_winter | raid_toll | raid_green
//   TIME  day | night (camps only)      STRAT  strongholds: auto      camps: outer | mid | deep | all, or sneakouter | sneakall (in through the fence far from the guards)      MEDS  medkits the bot may use
// The bot: strongholds are left to the squad's own advance; in a camp it sends everyone at the nearest building on its list, has one person loot each
// building that falls, uses a medkit on anyone under 30% health, and calls everyone out when the list is done, half the squad is down, or 8 minutes pass.
const { chromium } = require('playwright'); const fs = require('fs');
const BOT = `window.BOT = (map, lv, n, night, strat, meds, seed, plan) => { for (const k in (plan || {})) Object.assign(ZH.CAMP_PLAN[k], plan[k]);   /* ZH_PLAN='{"toll":{"tough":1.5}}' tries other camp settings */ let x = seed; Math.random = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
  if (ZH.S.sh) return { err: 'busy' }; ZH.S.shCoached = true; ZH.showShPractice(); const cl = (q) => { const e = document.querySelector(q); if (e) e.click(); };
  cl('[data-pm="' + map + '"]'); cl('[data-pn="' + n + '"]'); cl('[data-pl="' + lv + '"]'); cl('[data-pt="' + (night ? 1 : 0) + '"]'); cl('#prGo'); const H = ZH.S.sh; if (!H) return { err: 'no start' };
  const D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), P = ZH.CAMP_PLAN[H.raid] || {}, ni = (P.inner || []).length, nm = (P.mid || []).length;
  const ring = (b) => b.i < ni ? 'inner' : b.i < ni + nm ? 'mid' : 'outer', want = (b) => !b.fence && (strat === 'all' || (strat === 'deep' ? ring(b) === 'inner' : strat === 'mid' ? ring(b) !== 'inner' : ring(b) === 'outer')) && (Object.values(b.loot || {}).some((v) => v > 0) || (b.items || []).length);
  const kk = String(strat).split('@'); strat = kk[0]; const sneak = /^sneak/.test(strat); if (sneak) strat = strat.slice(5) || 'outer';   /* sneakouter, sneakall: first break the fence section farthest from any guard, then work the list from there */ const kh = +(kk[1] || 1), ka = +(kk[2] || kk[1] || 1); if (kh !== 1 || ka !== 1) for (const z of H.zs) { z.hp *= kh; z.max *= kh; z.atk *= ka; }   /* STRAT@hp[@atk]: a what-if multiplier on every enemy */
  let used = 0, alarmT = null, power = H.power, guards0 = H.zs.length;
  for (let t = 0; t < 60 * 480 && ZH.S.sh === H; t += 20) { ZH.step(20); if (ZH.S.sh !== H) break; if (H.alarm && alarmT == null) alarmT = H.t;
    const live = H.units.filter((u) => u.hp > 0); if (!live.length) continue;
    for (const u of live) if (used < meds && u.hp < u.max * .3) { ZH.shBot.call('med:' + u.id); used++; }
    if (!H.camp || H.back) continue;
    if (sneak && !H.way) {   /* walk round the outside to the side fence farthest from any guard, break one section, go in there */
      const gs = H.zs.filter((z) => z.hp > 0 && !z.worker), o = ZH.shWorldOf(0, 0), gx = (w) => w.x - o.x, gy = (w) => w.y - o.y, far = (f) => Math.min(...gs.map((g) => D(g.w, f.w)));
      if (!H.wayF) { const fs = Object.values(H.fence || {}).filter((f) => !f.dead && f.w && (gx(f.w) < 4.5 || gx(f.w) > 22.5) && gy(f.w) > 6 && gy(f.w) < 21); H.wayF = fs.sort((a, b) => far(b) - far(a))[0]; H.wayX = gx(H.wayF.w) < 12 ? 1.2 : 25.8; H.wayS = 0; }
      const F = H.wayF, at = H.wayS === 0 ? ZH.shWorldOf(H.wayX, 26.6) : ZH.shWorldOf(H.wayX, gy(F.w));
      if (H.alarm || F.dead) { H.way = true; for (const u of live) u.moveTo = null; }
      else if (H.wayS < 2) { if (live.every((u) => D(u.w, at) < 1.8)) H.wayS++; else if (live.some((u) => !u.moveTo) && t - (H.wayT || -999) >= 120) { H.wayT = t; H.sel = live.map((u) => u.id); ZH.shBot.move(at); H.sel = []; } if (t > 60 * 90) H.way = true; H.fx.length = 0; continue; }
      else { const idle = live.filter((u) => u.order !== F); if (idle.length) { H.sel = idle.map((u) => u.id); ZH.shBot.act({ k: 'b', o: F }); H.sel = []; } continue; } }
    const list = H.blds.filter(want), todo = list.filter((b) => !b.looted);
    if (!todo.length || live.length <= Math.floor(H.units.length / 2)) { ZH.shBot.call('back'); continue; }
    const c = { x: live.reduce((a, u) => a + u.w.x, 0) / live.length, y: live.reduce((a, u) => a + u.w.y, 0) / live.length };
    for (const b of todo.filter((b) => b.dead)) if (!live.some((u) => u.loot === b.i)) { H.sel = []; ZH.shBot.act({ k: 'b', o: b }); }
    const tgt = todo.filter((b) => !b.dead).sort((a, b) => D(a.w, c) - D(b.w, c))[0]; if (!tgt) continue;
    const idle = live.filter((u) => u.loot == null && (!u.order || u.order.dead || u.order.hp <= 0)); if (idle.length) { H.sel = idle.map((u) => u.id); ZH.shBot.act({ k: 'b', o: tgt }); H.sel = []; } }
  const boss = H.zs.find((z) => z.boss), out = ZH.S.sh !== H;
  if (!out) ZH.S.sh = null;
  return { map, lv, n, night: !!night, strat: (sneak ? 'sneak-' : '') + strat, kh, ka, meds, seed, power, t: Math.round(H.t / 60), ended: out, won: H.camp ? null : !!(boss && boss.hp <= 0), alive: H.units.filter((u) => u.hp > 0).length, downs: H.units.filter((u) => u.hp <= 0).length, hp: Math.round(100 * H.units.reduce((a, u) => a + Math.max(0, u.hp) / u.max, 0) / H.units.length),
    kills: H.kills, foes: guards0, medsUsed: used, alarmT: alarmT == null ? null : Math.round(alarmT / 60), rein: H.reinN || 0, loot: H.loot, items: (H.items || []).length, down: H.camp ? H.blds.filter((b) => b.dead && !b.fence).length : null, looted: H.camp ? H.blds.filter((b) => b.looted).length : null, rooms: H.camp ? null : Object.keys(H.rev).length }; };`;
(async () => { const [, , OUT, ...specs] = process.argv; const b = await chromium.launch(); const f = fs.openSync(OUT, 'w'); let seed = 1;
  for (const spec of specs) { const [map, lv, n, time, strat, meds, trials] = spec.split(':'); const pg = await b.newPage({ viewport: { width: 420, height: 860 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.goto('http://localhost:8765/index.html?nocut=1&shtest=1&s=' + seed); await pg.waitForTimeout(3500);
    await pg.evaluate((bot) => { window.requestAnimationFrame = () => 0; document.querySelectorAll('#eventModal button').forEach((q) => q.click()); eval(bot); }, BOT);
    for (let i = 0; i < +(trials || 10); i++) { const r = await pg.evaluate(([map, lv, n, night, strat, meds, seed, plan]) => { const r = BOT(map, lv, n, night, strat, meds, seed, plan); document.querySelectorAll('#eventModal button').forEach((q) => { if (/DONE/.test(q.textContent)) q.click(); }); return r; }, [map, +lv, +n, time === 'night', strat, +meds, seed++, JSON.parse(process.env.ZH_PLAN || '{}')]);
      r.err2 = errs.length; fs.writeSync(f, JSON.stringify(r) + '\n'); }
    if (errs.length) console.log(spec, 'errors', errs.slice(0, 3)); await pg.close(); }
  fs.closeSync(f); await b.close(); })();
