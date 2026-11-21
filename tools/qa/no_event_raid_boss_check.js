// tools/qa/no_event_raid_boss_check.js — 3D.252 (owner, 21 Nov, W172): never a raid on a boss day or the day before.
// 3D.245 held back the ordinary raid. This check covers the raids that come from events: the Toll Kings' demand (refusing it starts a raid),
// the Toll Collector's visit, a faction's revenge, and the Foundry's war raid. Near a boss night none may fire; on a free day each still does.
// Serve the repo first (python3 -m http.server 8765). Exit 0 ok, 1 a check failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = {}; const humans = () => S.z.filter((z) => z.human).length, clear = () => { S.z = S.z.filter((z) => !z.human); };
    S.fac = S.fac || {}; S.grace = 0; S.graceUntil = 0;
    const at = (day, boss) => { S.day = day; S.nextBoss = boss; S.bossDay = 0; S.bossOn = null; };
    /* 1. the Toll Kings' demand */
    S.fac.toll = { att: 0, next: 0 }; at(10, 11); out.tollNear = !!ZH.STORY.toll1.cond(); at(11, 11); out.tollBossDay = !!ZH.STORY.toll1.cond(); at(12, 14); out.tollFree = !!ZH.STORY.toll1.cond();
    /* 2. a faction's revenge */
    S.fac.toll = { att: -50, revenge: 9, met: true }; at(10, 11); clear(); ZH.allyDaily(); out.revNear = humans(); out.revKept = S.fac.toll.revenge; at(12, 14); ZH.allyDaily(); out.revFree = humans(); clear();
    /* 3. the Foundry's war raid */
    S.fac.foundry = { met: true, war: true, att: -80, raidAt: 11, warN: 1 }; at(11, 11); S.hour = 20; ZH.foundryHour(); out.fNear = humans(); out.fMoved = S.fac.foundry.raidAt; at(12, 14); S.hour = 20; ZH.foundryHour(); out.fFree = humans(); clear();
    /* 4. the Toll Collector (a chain step) */
    S.fac.toll = { att: -50, met: true }; S.storyQ = [{ id: 'toll3', day: 9 }]; at(10, 11); ZH.triggerTownEvent(); out.t3Near = humans(); out.t3Kept = S.storyQ.some((q) => q.id === 'toll3'); clear();
    return out; });
  console.log(JSON.stringify(r)); const bad = [];
  if (r.tollNear || r.tollBossDay) bad.push('the Toll Kings can demand a toll on a boss day or the day before'); if (!r.tollFree) bad.push('the Toll Kings never come on a free day');
  if (r.revNear) bad.push('a revenge raid came the day before a boss night'); if (!r.revKept) bad.push('the held revenge raid was lost'); if (!r.revFree) bad.push('the revenge raid did not come on the free day');
  if (r.fNear) bad.push('the Foundry raided on a boss day'); if (r.fMoved !== 12) bad.push('the Foundry raid did not move to the next day'); if (!r.fFree) bad.push('the Foundry raid did not come on the free day');
  if (r.t3Near) bad.push('the Toll Collector came the day before a boss night'); if (!r.t3Kept) bad.push('the Toll Collector\'s visit was lost');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: event raids keep off the boss day and the day before, and still come on a free day'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
