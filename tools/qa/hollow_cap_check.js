// tools/qa/hollow_cap_check.js — 3D.290 (overnight branch; owner, 21 Nov, W176): the Hollow's shepherded horde and its alpha's pack keep
// the limit of 60 standing. Before, the shepherd added 3 + level/3 zombies every hour from 22:00 to 02:00 and the alpha 8 + level, whatever
// stood already. The check fills the town to 57 standing, then runs the shepherd's hour and the alpha's night: at most 60 may stand after.
// And with an empty town the shepherd still adds his full group. Serve the repo first (python3 -m http.server 8765). Exit 0 ok, 1 failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = {}; const standing = () => S.z.filter((z) => z.hp > 0 && !z.human).length;
    const fill = (n) => { S.z.length = 0; for (let i = 0; i < n; i++) ZH.spawn(); };
    S.lvl = 16; S.day = 50; S.fac = S.fac || {}; S.fac.hollow = { met: true, att: -50 };
    /* the shepherd's hour */
    fill(57); S.z.push({ type: 'raider', human: true, shep: true, hp: 50, max: 50, w: { x: 1, y: 1 }, fac: 'hollow' }); S.fac.hollow.shepOn = true; S.hour = 22; ZH.facHour(); out.shepFull = standing();
    fill(0); S.z.push({ type: 'raider', human: true, shep: true, hp: 50, max: 50, w: { x: 1, y: 1 }, fac: 'hollow' }); S.fac.hollow.shepOn = true; S.hour = 23; ZH.facHour(); out.shepEmpty = standing();
    /* the alpha's night */
    S.fac.hollow.shepOn = false; fill(57); S.fac.hollow.alphaDay = S.day; S.hour = 21; ZH.facHour(); out.alphaFull = standing();
    return out; });
  console.log(JSON.stringify(r)); const bad = [];
  if (r.shepFull > 60) bad.push('the shepherd took the town to ' + r.shepFull + ' standing');
  if (r.shepEmpty !== 3 + Math.floor(16 / 3)) bad.push('with room, the shepherd added ' + r.shepEmpty + ' (wanted ' + (3 + Math.floor(16 / 3)) + ')');
  if (r.alphaFull > 61) bad.push('the alpha\'s night took the town to ' + r.alphaFull + ' standing (60 and the alpha himself)');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: the Hollow\'s shepherd and alpha keep to the limit of 60, and still bring their full group when there is room'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
