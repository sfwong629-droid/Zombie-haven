// tools/qa/radio_tap_check.js — bug A4 (3D.177): a radio card that has closed must not take taps.
// The closed card is invisible but stays in the bottom message stack; it used to keep catching taps there (on the People
// list, for example) and re-open its old message. Shows a radio message, checks the open card can be tapped, lets it close,
// then checks that a tap at the same spot no longer lands on it. Exit 0 ok, 1 the closed card still takes taps.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'radio' }); await Q.newGame(p); await Q.clearCards(p);
  const probe = () => p.evaluate(() => { const el = document.getElementById('radioCard'); if (!el) return null; const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { open: el.classList.contains('in'), pe: getComputedStyle(el).pointerEvents, hit: !!hit && (hit === el || el.contains(hit)) }; });
  let open = null; for (let i = 0; i < 20 && !(open && open.open); i++) { await p.evaluate(() => { for (const bn of document.querySelectorAll('#eventModal .evBox:not(.liveCard) button')) bn.click(); ZH.radio('dj', 'Check, check. This is a test of the radio card.', { key: 'qa' + Math.random(), more: 'More words.' }); }); await p.waitForTimeout(1500); open = await probe(); }
  if (!open || !open.open) { console.log('could not get a radio card on screen', open); await b.close(); process.exit(2); }
  await p.evaluate(() => document.getElementById('radioCard').classList.remove('in')); await p.waitForTimeout(600); const shut = await probe();
  console.log('open card:', JSON.stringify(open), '| closed card:', JSON.stringify(shut));
  const bad = shut.pe !== 'none' || shut.hit; console.log(bad ? 'FAIL (bug A4): the closed radio card still takes taps' : 'ok: the closed radio card lets taps through');
  await b.close(); process.exit(bad ? 1 : 0); })();
