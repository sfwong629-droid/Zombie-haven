// tools/qa/movein_buttons_check.js [sizes] [tag] — 3D.223 (owner, 19 Nov; U38, W125): the move-in card's buttons.
// At six phone sizes, puts a move-in card ("Wants to stay for good") on screen and checks: "Accept" is lime (go), "Not yet" is a plain
// glass button (not coral, the danger colour, and not lime), both are at least 44 px tall (in the HUD's own size, before it is scaled to the phone, as the other layout checks) and inside the screen. Then taps "Not yet"
// and checks it still works: the card goes and the survivor stays a guest. Optional tag: save pictures as <tag>_<size>.png.
// Exit 0 ok, 1 a check failed, 2 the card could not be made.
const Q = require('./lib');
const SIZES = (process.argv[2] || 'phone:390x844,phoneS:360x640,phoneM:375x667,phoneXL:430x932,phoneN:320x568,phoneT:412x915').split(',').map((s) => { const [n, d] = s.split(':'); const [w, h] = d.split('x'); return [n, +w, +h]; });
const TAG = process.argv[3] || '';
(async () => { const b = await Q.launch(); const p = await Q.page(b, { expose: 'queueResidentRequest' }); await Q.newGame(p); await Q.clearCards(p); let bad = 0, none = 0;
  for (const [nm, w, h] of SIZES) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(500);
    const who = await p.evaluate(() => { const S = ZH.S, s = S.sv.find((q) => !q.resident && !q.requested) || S.sv[1] || S.sv[0]; if (!S.requests.length) ZH.queueResidentRequest(s); return S.requests.length ? S.requests[0].s.name : ''; });
    let ok = false; for (let i = 0; i < 20 && !ok; i++) { await p.waitForTimeout(300); ok = await p.evaluate(() => !!document.getElementById('declineReq')); }
    if (!ok) { none++; console.log(`NO CARD ${nm}`); continue; }
    if (TAG) await Q.shot(p, `${TAG}_${nm}.png`);
    const r = await p.evaluate(() => { const out = [], rgb = (c) => (c.match(/\d+(\.\d+)?/g) || []).map(Number);
      const isLime = (c) => { const [r, g, b2, a = 1] = rgb(c); return a > .5 && r > 170 && g > 230 && b2 < 140; }, isCoral = (cs) => /255, 1[0-4]\d, \d{1,2}\b/.test(cs.backgroundImage) || (() => { const [r, g, b2, a = 1] = rgb(cs.backgroundColor); return a > .5 && r > 200 && g < 160 && b2 < 130; })();
      const A = document.getElementById('acceptReq'), N = document.getElementById('declineReq'), ca = getComputedStyle(A), cn = getComputedStyle(N);
      if (!isLime(ca.backgroundColor)) out.push('"Accept" is not lime (' + ca.backgroundColor + ')');
      if (N.classList.contains('danger') || isCoral(cn)) out.push('"Not yet" is coral, the danger colour (' + cn.backgroundColor + ' ' + cn.backgroundImage.slice(0, 60) + ')');
      if (isLime(cn.backgroundColor)) out.push('"Not yet" is lime');
      { const [r, g, b2, a = 1] = rgb(cn.backgroundColor); if (!(r > 200 && g > 200 && b2 > 200 && a > .05 && a < .5)) out.push('"Not yet" is not a plain glass button (' + cn.backgroundColor + ')'); }
      for (const x of [A, N]) { const q = x.getBoundingClientRect(); if (x.offsetHeight < 44) out.push(`"${x.textContent}" is ${x.offsetHeight} px tall`); if (q.left < 0 || q.right > innerWidth || q.bottom > innerHeight) out.push(`"${x.textContent}" runs off the screen`); }
      return out; });
    const after = await p.evaluate((who) => { document.getElementById('declineReq').click(); const S = ZH.S, s = S.sv.find((q) => q.name === who); return { gone: !S.requests.some((q) => q.s.name === who), guest: !!s && !s.resident }; }, who);
    if (!after.gone) r.push('"Not yet" did not take the card away'); if (!after.guest) r.push('"Not yet" made the survivor a resident');
    if (r.length) bad++; console.log(`${r.length ? 'FAIL' : 'PASS'} ${nm} ${w}x${h} (${who})${r.length ? '\n   ' + r.join('; ') : ''}`); }
  if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad ? 1 : none ? 2 : 0); })();
