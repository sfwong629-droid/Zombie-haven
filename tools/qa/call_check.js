// tools/qa/call_check.js — UI chat, 3D.386 (W249, fun idea 1: an ally's call as the phone's incoming call). At three phone sizes, phone look:
//  - Greenwater's truck offer (helpCall) opens a call: the town dimmed, "Radio call", Sister June, Greenwater, the words in one bubble, the cost,
//    a round coral Decline and a round lime Send the truck side by side at the bottom, 64 px+, the card inside the screen and centred;
//  - Send the truck calls the truck (S.help.coming); Decline leaves "Missed call · Sister June" in Needs you with Call back, and her words
//    in the event log as a voicemail; Call back calls the truck and clears the row; the row goes by itself once the call no longer makes sense;
//  - the favour call at the gate: Pay (grey when stock is short) and Refuse; Pay pays;
//  - the old look keeps the old card. Pictures: runs/ui_samples/call_<size>.png, call_favour.png, call_missed.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
const clear = async (p) => { for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(150); } };
const card = (p) => p.evaluate(() => { const b = document.querySelector('#eventModal .clBox'); if (!b) return null; const r = b.getBoundingClientRect(), w = document.querySelector('.clWash').getBoundingClientRect();
  return { x: r.x, y: r.y, r: r.right, b: r.bottom, vw: innerWidth, vh: innerHeight, wash: w.width >= innerWidth - 1 && w.height >= innerHeight - 1, text: b.innerText,
    rb: [...b.querySelectorAll('.clR')].map((x) => { const q = x.getBoundingClientRect(); return { cls: x.className, w: q.width, h: q.height, y: Math.round(q.y), dis: x.disabled, bg: getComputedStyle(x).backgroundColor, lbl: x.parentNode.innerText.trim() }; }) }; });
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneXL', 430, 932]]) {
    const p = await Q.page(b, { w, h, look: '', expose: 'BUILD_TAG, helpCall, helpTick, helpReady, showEventPopup, alerts, renderAlerts, alertHub, OPTS, saveOpts, applyLook' });
    await Q.newGame(p); await clear(p); await p.waitForTimeout(400);
    if (n === 'phone') ok(+String(await p.evaluate(() => ZH.BUILD_TAG)).split('.')[1] >= 386, 'build before 3D.386');
    ok(await p.evaluate(() => ZH.helpReady()), `${n}: the truck is not ready in a new town (test setup)`);
    await p.evaluate(() => ZH.helpCall(3)); await p.waitForTimeout(600);
    const c = await card(p); ok(!!c, `${n}: no call`); if (!c) { await p.close(); continue; }
    await p.screenshot({ path: path.join(out, `call_${n}.png`) });
    ok(c.wash, `${n}: the town is not dimmed`);
    ok(c.x >= 0 && c.r <= c.vw + .5 && c.y >= 0 && c.b <= c.vh + .5 && Math.abs((c.x + c.r) / 2 - c.vw / 2) < 2, `${n}: the call leaves the screen or is off centre`);
    ok(/Radio call/i.test(c.text) && /Sister June/.test(c.text) && /Greenwater/.test(c.text) && /3 of yours are down/.test(c.text) && /favour in two days/i.test(c.text), `${n}: the words: ${c.text.replace(/\n/g, ' | ').slice(0, 120)}`);
    ok(c.rb.length === 2 && /no/.test(c.rb[0].cls) && /yes/.test(c.rb[1].cls) && c.rb[0].y === c.rb[1].y, `${n}: Decline left and the answer right, side by side`);
    ok(c.rb.every((x) => x.w >= 64 && x.h >= 64), `${n}: the round buttons are under 64 px`);
    ok(c.rb[1].bg === 'rgb(198, 255, 77)' && /Send the truck/.test(c.rb[1].lbl) && /Decline/.test(c.rb[0].lbl), `${n}: the answer is not lime or the labels are wrong`);
    if (n === 'phone') {
      /* Decline: a missed call in Needs you, the voicemail in the log; Call back */
      /* in a quiet test town the last stand is not real, so the row would go at once: the same call, its missed row kept alive for the test */
      await p.click('.clR.no'); await p.waitForTimeout(300); await clear(p);
      await p.evaluate(() => ZH.showEventPopup({ title: 'Greenwater is calling', call: { who: 'Sister June', from: 'Greenwater', icon: '🌿', line: '"3 of yours are down."', missed: { key: 'greenHelp', live: () => true, again: () => ZH.helpCall(3) } }, buttons: [{ label: 'Send the truck' }, { label: 'Decline' }] }));
      await p.waitForTimeout(400); await p.click('.clR.no'); await p.waitForTimeout(400);
      const row = await p.evaluate(() => { const a = ZH.alerts.get('call:greenHelp'); return a ? { text: a.text, acts: a.acts.map((x) => typeof x.label === 'function' ? x.label() : x.label) } : null; });
      ok(!!row && row.text === 'Missed call · Sister June' && row.acts.join() === 'Call back', `phone: the missed call row: ${JSON.stringify(row)}`);
      ok(await p.evaluate(() => (ZH.S.log || []).some((l) => /Voicemail from Sister June/.test(JSON.stringify(l)))), 'phone: no voicemail in the event log');
      await p.evaluate(() => ZH.alertHub()); await p.waitForTimeout(500); await p.screenshot({ path: path.join(out, 'call_missed.png') });
      await p.evaluate(() => ZH.alerts.get('call:greenHelp').acts[0].fn()); await p.waitForTimeout(400);
      ok(await p.evaluate(() => !!document.querySelector('.clBox') && !ZH.alerts.get('call:greenHelp')), 'phone: Call back did not call again or clear the row');
      await p.click('.clR.yes'); await p.waitForTimeout(300); ok(await p.evaluate(() => !!(ZH.S.help || {}).coming), 'phone: answering the call back did not call the truck');
      /* the row goes by itself */
      await p.evaluate(() => { ZH.S.help = {}; ZH.helpCall(2); }); await p.waitForTimeout(400); await p.click('.clR.no'); await p.waitForTimeout(300);
      await p.evaluate(() => ZH.renderAlerts()); await p.waitForTimeout(300);
      ok(await p.evaluate(() => !ZH.alerts.get('call:greenHelp')), 'phone: the missed call stays when the town is no longer in a last stand');
      await clear(p);
      /* answer: the truck comes */
      await p.evaluate(() => { ZH.S.help = {}; ZH.helpCall(2); }); await p.waitForTimeout(400); await p.click('.clR.yes'); await p.waitForTimeout(300);
      ok(await p.evaluate(() => !!(ZH.S.help || {}).coming && !document.querySelector('.clBox')), 'phone: Send the truck did not call the truck');
      await clear(p);
      /* the favour at the gate */
      await p.evaluate(() => { ZH.S.help = { owe: { day: ZH.S.day, food: 15, water: 10 } }; ZH.S.food = 50; ZH.S.water = 50; ZH.helpTick(); }); await p.waitForTimeout(500);
      const f = await card(p); ok(!!f && /at your gate/.test(f.text) && /15/.test(f.text) && f.rb.map((x) => x.lbl).join() === 'Refuse,Pay' && !f.rb[1].dis, `phone: the favour call: ${f && f.text.replace(/\n/g, ' | ')}`);
      await p.screenshot({ path: path.join(out, 'call_favour.png') });
      await p.click('.clR.yes'); await p.waitForTimeout(300); ok(await p.evaluate(() => ZH.S.food === 35 && ZH.S.water === 40), 'phone: Pay did not pay');
      await clear(p);
      await p.evaluate(() => { ZH.S.help = { owe: { day: ZH.S.day, food: 15, water: 10 } }; ZH.S.food = 2; ZH.helpTick(); }); await p.waitForTimeout(400);
      const g = await card(p); ok(!!g && g.rb[1].dis && /not enough/.test(g.text), 'phone: Pay is not grey when stock is short');
      await p.click('.clR.yes', { force: true }); await p.waitForTimeout(200); ok(!!(await card(p)), 'phone: a grey Pay closed the call');
      await p.click('.clR.no'); await p.waitForTimeout(300); await clear(p);
      /* the old look */
      await p.evaluate(() => { ZH.OPTS.look = 'glass'; ZH.saveOpts(); ZH.applyLook(); ZH.S.help = {}; ZH.helpCall(2); }); await p.waitForTimeout(300);
      ok(!(await card(p)), 'look off: the call screen showed (helpCall is phone-only)');
      await p.evaluate(() => { ZH.showEventPopup({ title: 'x', text: 'y', call: { who: 'a', from: 'b', line: 'c' } }); }); await p.waitForTimeout(300);
      ok(!(await card(p)) && await p.evaluate(() => !!document.querySelector('#eventModal .evBox')), 'look off: not the old card');
    }
    ok(!(p.errs || []).length, `${n}: page errors ${JSON.stringify(p.errs || [])}`);
    console.log(`${n} ${w}x${h}: call ${Math.round(c.r - c.x)}x${Math.round(c.b - c.y)}`);
    await p.close(); }
  await b.close(); console.log(bad ? `FAILED: ${bad}` : 'OK: the incoming call at 3 sizes'); process.exit(bad ? 1 : 0); })();
