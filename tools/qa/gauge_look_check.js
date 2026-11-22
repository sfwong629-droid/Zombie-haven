// tools/qa/gauge_look_check.js — 3D.270 (owner, 21 Nov: "the renown has a oval around it"). The Renown chip's invisible tap area
// (#gauge::before, 3D.268) picked up a tint and drew a pale ring round the chip. Checks: the tap area draws nothing (no background,
// border or shadow) and still takes taps 44 px tall. On 3D.268 and 3D.269 it fails. Exit 0 ok, 1 failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const g = document.getElementById('gauge'), cs = getComputedStyle(g, '::before'), gr = g.getBoundingClientRect(); const x = gr.left + gr.width / 2; let n = 0;
    for (let y = gr.top - 15; y < gr.bottom + 15; y++) { const h = document.elementFromPoint(x, y); if (h && (h === g || g.contains(h))) n++; }
    return { bg: cs.backgroundColor, img: cs.backgroundImage, border: cs.borderTopStyle !== 'none' && parseFloat(cs.borderTopWidth) > 0, shadow: cs.boxShadow, tall: n, display: cs.display }; });
  console.log(JSON.stringify(r)); const bad = [];
  if (!/rgba\(0, 0, 0, 0\)|transparent/.test(r.bg) || r.img !== 'none') bad.push('the tap area has a background (' + r.bg + ')'); if (r.border) bad.push('the tap area has a border'); if (r.shadow !== 'none') bad.push('the tap area has a shadow');
  if (r.tall < 44) bad.push(`the chip takes taps only ${r.tall} px tall`);
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: the Renown chip draws no ring and takes taps 44 px tall'); await b.close(); process.exit(bad.length ? 1 : 0); })();
