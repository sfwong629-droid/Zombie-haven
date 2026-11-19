// tools/qa/radio_stay_check.js [sizes] — 3D.224 (owner, 19 Nov, W126): a radio message stays on screen until it is tapped away.
// At six phone sizes: shows a radio message, waits until it has finished typing and then 12 more seconds (it used to close itself after
// 3 to 9 s) and checks it is still on screen; checks its ✕ is at least 44 px (in the HUD's own size, before it is scaled to the phone) and inside the screen; taps the ✕ and checks the card closes
// without opening the full message, and that the next queued message then shows. Exit 0 ok, 1 a check failed, 2 no card could be shown.
const Q = require('./lib');
const SIZES = (process.argv[2] || 'phone:390x844,phoneS:360x640,phoneM:375x667,phoneXL:430x932,phoneN:320x568,phoneT:412x915').split(',').map((s) => { const [n, d] = s.split(':'); const [w, h] = d.split('x'); return [n, +w, +h]; });
(async () => { const b = await Q.launch(); const p = await Q.page(b, { expose: 'radio' }); await Q.newGame(p); await Q.clearCards(p); let bad = 0, none = 0;
  const card = () => p.evaluate(() => { const el = document.getElementById('radioCard'), x = el && el.querySelector('.rcX'); if (!el) return null; const r = x ? x.getBoundingClientRect() : null;
    return { open: el.classList.contains('in'), talk: el.classList.contains('talk'), text: el.textContent, x: r && { w: x.offsetWidth, h: x.offsetHeight, l: r.left, r: r.right, t: r.top, b: r.bottom, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }, vw: innerWidth, vh: innerHeight }; });
  const popup = () => p.evaluate(() => [...document.querySelectorAll('#eventModal .evBox')].some((e) => /Test one/.test(e.textContent)));
  for (const [nm, w, h] of SIZES) { await p.setViewportSize({ width: w, height: h }); const out = [];
    // let the game's own radio lines play out of the way, then queue two of ours
    for (let i = 0; i < 30; i++) { const c = await card(); if (!c || !c.open) break; await p.evaluate(() => (document.querySelector('#radioCard .rcX') || document.getElementById('radioCard')).click()); await p.waitForTimeout(500); }
    await p.evaluate((nm) => { for (const bn of document.querySelectorAll('#eventModal .evBox:not(.liveCard) button')) bn.click(); ZH.radio('dj', 'Test one, ' + nm + '. Stay with me.', { key: 'qa1' + nm }); ZH.radio('dj', 'Test two, ' + nm + '. Still here.', { key: 'qa2' + nm }); }, nm);
    let c = null; for (let i = 0; i < 100; i++) { await p.waitForTimeout(300); c = await card(); if (c && c.open && !c.talk && /Test one/.test(c.text)) break; if (c && c.open && !c.talk && !/Test /.test(c.text)) await p.evaluate(() => (document.querySelector('#radioCard .rcX') || document.getElementById('radioCard')).click()); }   /* the game's own radio lines (the tutorial) are tapped away */
    if (!c || !c.open || !/Test one/.test(c.text)) { none++; console.log(`NO CARD ${nm}`, c && c.text); continue; }
    await p.waitForTimeout(12000); c = await card();
    if (!c.open || !/Test one/.test(c.text)) out.push('the message closed by itself');
    if (!c.x) out.push('no ✕ on the card'); else { if (c.x.w < 44 || c.x.h < 44) out.push(`the ✕ is ${Math.round(c.x.w)}x${Math.round(c.x.h)} px`); if (c.x.l < 0 || c.x.r > c.vw || c.x.b > c.vh) out.push('the ✕ runs off the screen'); }
    await Q.clearCards(p); if (c.x) { await p.mouse.click(c.x.cx, c.x.cy); await p.waitForTimeout(500); const a = await card(); if (a.open && /Test one/.test(a.text)) out.push('the ✕ did not close the message'); if (await popup()) out.push('the ✕ opened the full message'); }
    let n = null; for (let i = 0; i < 60; i++) { await p.waitForTimeout(300); if (i % 5 === 4) await Q.clearCards(p); n = await card(); if (n && n.open && /Test two/.test(n.text)) break; if (n && n.open && !n.talk && !/Test /.test(n.text)) await p.evaluate(() => (document.querySelector('#radioCard .rcX') || document.getElementById('radioCard')).click()); }
    if (!n || !n.open || !/Test two/.test(n.text)) out.push('the next message did not show after the ✕'); else { await p.evaluate(() => (document.querySelector('#radioCard .rcX') || document.getElementById('radioCard')).click()); await p.waitForTimeout(400); }
    if (out.length) bad++; console.log(`${out.length ? 'FAIL' : 'PASS'} ${nm} ${w}x${h}${out.length ? '\n   ' + out.join('; ') : ''}`); }
  if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad ? 1 : none ? 2 : 0); })();
