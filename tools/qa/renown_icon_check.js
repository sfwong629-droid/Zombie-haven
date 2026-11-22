// tools/qa/renown_icon_check.js — 3D.275 (owner, 22 Nov, W209: "Do star for renown"). Checks on three phone sizes: a star icon sits
// inside the Renown chip, left of the word, drawn 22 px; the chip stays on the screen and clear of the clock and the round
// side buttons; a tap on the star counts as a tap on the chip. On 3D.274 it fails (no star). Exit 0 ok, 1 failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const bad = [];
  for (const [w, h] of [[320, 568], [390, 844], [430, 932]]) { const p = await Q.page(b, { w, h }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(1500); await Q.clearCards(p);
    const r = await p.evaluate(() => { const g = document.getElementById('gauge'), s = g && g.querySelector('.rIco'), l = g && g.querySelector('.glabel'); if (!s) return { none: true };
      const R = (e) => { const q = e.getBoundingClientRect(); return { l: q.left, r: q.right, t: q.top, b: q.bottom, w: q.width, h: q.height }; }, gr = R(g), sr = R(s), lr = R(l), svg = s.querySelector('svg');
      const hits = []; for (const id of ['clock', 'quest', 'btnHome', 'zoom', 'alertBtn', 'radioBtn']) { const e = document.getElementById(id); if (!e || !e.offsetParent) continue; const q = R(e); if (q.w && q.h && !(q.r <= gr.l || q.l >= gr.r || q.b <= gr.t || q.t >= gr.b)) hits.push(id); }
      const cx = sr.l + sr.w / 2, cy = sr.t + sr.h / 2, top = document.elementFromPoint(cx, cy);
      return { gr, sr, svg: !!svg, left: sr.r <= lr.l + 1, hits, onChip: !!(top && (top === g || g.contains(top))), vw: innerWidth, vh: innerHeight }; });
    const tag = `${w}x${h}`; console.log(tag, JSON.stringify(r));
    if (r.none) { bad.push(tag + ': no star in the Renown chip'); await p.close(); continue; }
    if (!r.svg) bad.push(tag + ': the star is not drawn as an icon'); if (r.sr.w < 12 || r.sr.h < 12) bad.push(tag + ': the star is drawn too small');
    if (!r.left) bad.push(tag + ': the star is not left of the word Renown');
    if (r.gr.l < 0 || r.gr.r > r.vw || r.gr.t < 0 || r.gr.b > r.vh) bad.push(tag + ': the Renown chip runs off the screen');
    if (r.sr.l < r.gr.l - 1 || r.sr.r > r.gr.r + 1) bad.push(tag + ': the star sticks out of the chip');
    if (r.hits.length) bad.push(tag + ': the chip overlaps ' + r.hits.join(', ')); if (!r.onChip) bad.push(tag + ': a tap on the star does not reach the chip');
    await p.close(); }
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: a star sits in the Renown chip on all three sizes, on screen and clear of the HUD'); await b.close(); process.exit(bad.length ? 1 : 0); })();
