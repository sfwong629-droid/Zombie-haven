// tools/qa/truck_words_check.js — 3D.308 (W129 part 3): the radio call, the notes, the arrival card and the favour card speak of
// Greenwater's truck, its horn and its medics, not the old faceless "rescue team". Plays one call for help from start to the favour.
// Serve the repo first (python3 -m http.server 8765) or set ZH_NOSERVER=1. Exit 0 ok, 1 a check failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { expose: 'lastStandNote, radioHelp, helpReady' }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, camp = ZH.world.buildings[0], cards = [], modal = () => document.getElementById('eventModal');
    const grab = (click) => { const m = modal(); if (m && m.innerText.trim()) { cards.push(m.innerText.replace(/\s+/g, ' ').trim()); const bs = [...m.querySelectorAll('button')]; const pick = bs.find((x) => click && x.innerText.includes(click)) || bs[0]; if (pick) pick.click(); } };
    ZH.ARRIVE.low = ZH.ARRIVE.high = 1e9; S.z.length = 0; S.help = {}; S.food = 500; S.water = 500;
    S.sv.forEach((q, i) => { if (i < 3) { q.hp = 0; q.mode = 'down'; q.w = { x: camp.x + 5 + i, y: camp.y + 5 }; } });
    const ready = ZH.helpReady(); ZH.lastStandNote(); grab('Call them');   /* the call card, then press "Call them" */
    for (let k = 0; k < 900 && !(S.help && S.help.owe); k++) { S.hour = 12; ZH.step(10); grab(); }
    for (let k = 0; k < 900 && S.truck; k++) { S.hour = 12; ZH.step(10); grab(); }
    if (S.help && S.help.owe) { S.help.owe.day = S.day; for (let k = 0; k < 40; k++) { ZH.step(60); grab('Pay'); } }
    for (let k = 0; k < 10; k++) { ZH.step(10); grab(); }
    return { ready, cards, log: (S.log || []).map((e) => e.t).filter((t) => /Greenwater|rescue|truck|radio|favour/i.test(t)) }; });
  console.log(JSON.stringify(r, null, 1)); const bad = [], all = r.cards.join(' | ') + ' | ' + r.log.join(' | ');
  const need = [['the call card names Greenwater, the truck and its medics', (t) => /Greenwater is on the radio.*truck.*medics/.test(t)],
    ['the "on its way" note names the truck', (t) => /Greenwater's truck is coming down the highway/.test(t)],
    ['the arrival card names the truck, the horn and the medics', (t) => /GREENWATER'S TRUCK ARRIVED.*medics/.test(t)],
    ['the departure note names the truck', (t) => /Greenwater's truck is gone down the highway/.test(t)],
    ['the favour card names Greenwater', (t) => /GREENWATER CAME FOR THE FAVOUR/.test(t)],
    ['paying gives the squared-away card', (t) => /SQUARED AWAY/.test(t)]];
  if (!r.ready) bad.push('the radio was not ready at the start');
  for (const [what, ok] of need) if (!ok(all)) bad.push('missing: ' + what);
  if (/rescue team|The group that saved/i.test(all)) bad.push('an old faceless "rescue team" text is still showing');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: every card and note of the call names Greenwater, the truck and its medics'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0); })();
