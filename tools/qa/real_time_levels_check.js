// tools/qa/real_time_levels_check.js — 3D.303 (owner, 22 Nov, Q1: "Yes to your number about time"; rule 1, one pace for everyone):
// the level timer counts real time, the same with the game open or closed. Checks: the table (L2 3 min, L3 10, L4 60, L5 6 h, L6-10 a day,
// L11-15 1.5 days, L16-20 2.5 days); open play, 3 minutes of ticks finish level 2 and 2:50 do not; away, 10 real minutes finish level 3;
// a save from before (game hours) keeps its share of the wait; renown takes 2 hours off for 25. Serve the repo first (python3 -m http.server 8765).
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = {};
    out.mins = [2, 3, 4, 5, 6, 10, 11, 15, 16, 20].map((l) => ZH.LV_MIN[l]);
    const open = (sec) => { for (let i = 0; i < sec * 60; i++) ZH.lvTick(1000 / 60); };
    S.lvl = 1; S.lvUp = { to: 2, left: ZH.lvMs(2), total: ZH.lvMs(2), rt: true }; open(170); out.at250 = !!S.lvUp; open(15); out.at305 = S.lvl;
    S.lvUp = { to: 3, left: ZH.lvMs(3), total: ZH.lvMs(3), rt: true }; ZH.awayCredit(9 * 60000); out.away9 = !!S.lvUp; ZH.awayCredit(61000); out.away10 = S.lvl;
    S.lvUp = { to: 6, left: 36, total: 72, gh: true }; ZH.lvTick(0); out.oldLeft = S.lvUp ? S.lvUp.left / 3600000 : null;
    S.ren = 100; const before = S.lvUp.left; ZH.lvRush(false); out.rushOff = (before - S.lvUp.left) / 3600000; out.renLeft = S.ren; out.text = ZH.rtText(S.lvUp.left); S.lvUp = null; return out; });
  console.log(JSON.stringify(r)); const bad = [];
  if (r.mins.join() !== '3,10,60,360,1440,1440,2160,2160,3600,3600') bad.push('table ' + r.mins);
  if (!r.at250 || r.at305 !== 2) bad.push('open play: level 2 did not come at 3 minutes');
  if (!r.away9 || r.away10 !== 3) bad.push('away: level 3 did not come after 10 minutes away');
  if (Math.abs(r.oldLeft - 12) > .01) bad.push('an old save half done had ' + r.oldLeft + ' h left of a 24 h wait (wanted 12)');
  if (Math.abs(r.rushOff - 2) > .01 || r.renLeft !== 75) bad.push('renown: ' + r.rushOff + ' h off, ' + r.renLeft + ' renown left (wanted 2 h for 25)');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: level timers run on real time, open or away (level 2 in 3 min, 3 in 10); old saves keep their share; 25 renown = 2 h off (' + r.text + ' left)'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
