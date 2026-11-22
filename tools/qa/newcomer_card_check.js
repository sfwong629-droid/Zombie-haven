// tools/qa/newcomer_card_check.js — 3D.272 (owner, 21 Nov: "new comer card overlay the main bar... the background should be shade like a
// tip card and put it in the center"). Brings a newcomer's "wants in" card up on a 390x844 and a 320x568 phone. Checks: the card is in the
// middle of the screen (its centre within 10% of the screen's), it does not overlap the bottom bar, the rest of the screen is shaded as
// round other cards, and its buttons still work (Turn away closes it). On 3D.271 it fails. Exit 0 ok, 1 failed, 2 could not set it up.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'guestAsk, mk' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(1000);
  const bad = [];
  for (const [W, H] of [[390, 844], [320, 568]]) { await p.setViewportSize({ width: W, height: H }); await p.waitForTimeout(600); await Q.clearCards(p);
    const up = await p.evaluate(() => { const v = ZH.mk('Noah', 'Guard', 1, 7, 10, 99); v.guest = true; ZH.guestAsk(v); return !!document.querySelector('#eventModal .liveCard'); });
    if (!up) { console.log('the newcomer card did not come up'); await b.close(); process.exit(2); }
    await p.waitForTimeout(500);
    const r = await p.evaluate(() => { const c = document.querySelector('#eventModal .liveCard').getBoundingClientRect(), bar = document.getElementById('lmenu'), br = bar ? bar.getBoundingClientRect() : null;
      return { cx: (c.left + c.right) / 2, cy: (c.top + c.bottom) / 2, top: c.top, bottom: c.bottom, barTop: br ? br.top : null, shade: getComputedStyle(document.querySelector('#eventModal .liveCard')).boxShadow, W: innerWidth, H: innerHeight }; });
    console.log(`${W}x${H}`, JSON.stringify({ cx: Math.round(r.cx), cy: Math.round(r.cy), bottom: Math.round(r.bottom), barTop: r.barTop && Math.round(r.barTop), shade: r.shade.slice(0, 60) }));
    if (Math.abs(r.cy - r.H / 2) > r.H * 0.1 || Math.abs(r.cx - r.W / 2) > r.W * 0.1) bad.push(`${W}x${H}: the card is not in the middle (centre ${Math.round(r.cx)},${Math.round(r.cy)})`);
    if (r.barTop != null && r.bottom > r.barTop + 1) bad.push(`${W}x${H}: the card overlaps the bottom bar`);
    if (!/9999px/.test(r.shade)) bad.push(`${W}x${H}: no shade round the card`);
    const gone = await p.evaluate(() => { const bt = [...document.querySelectorAll('#eventModal .liveCard button')].find((x) => /Turn away/i.test(x.textContent)); if (!bt) return 'no Turn away button'; bt.click(); return !document.querySelector('#eventModal .liveCard') ? true : 'still open'; });
    if (gone !== true) bad.push(`${W}x${H}: Turn away: ${gone}`); }
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: the newcomer card sits in the middle with the shade round it, clear of the bottom bar'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0); })();
