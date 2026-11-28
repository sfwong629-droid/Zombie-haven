// tools/qa/livepill_mock.js — UI chat, 28 Nov (idea 3, the live pill, like the iPhone's Dynamic Island; "many mock up for approval").
// Mockup only, over the real town (3D.394 build): what counts down right now: the squad out (back in 2 h 10 m), the level-up (1 h 05 m),
// tonight's horde (in 6 h). A: a black pill in the middle of the status strip, the sign on the left and the time on the right;
// B: a capsule under the resource bar with words, the time and a thin progress bar; C: A grown into a card when it matters or when tapped
// (the squad's faces, where they are, a progress bar, Show me); D: two at once, the island split into a pill and a circle.
// Pictures: runs/ui_samples/pill_<A..D>.png, pill_sheet.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, look: '', expose: 'appTile, pplFace' }); await Q.newGame(p);
  for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(150); }
  await p.waitForTimeout(6000);
  await p.addStyleTag({ content: `
    .lp{position:fixed;z-index:9999;font-family:-apple-system,"SF Pro Text",system-ui,sans-serif;color:#fff}
    .lpA{left:calc(50% + 14px);transform:translateX(-50%);top:calc(2px + env(safe-area-inset-top));height:22px;min-width:96px;padding:0 10px 0 4px;border-radius:11px;background:#000;display:flex;align-items:center;justify-content:space-between;gap:20px;box-shadow:0 0 0 1px rgba(255,255,255,.08)}
    .lpA .ic{position:relative;width:16px;height:16px;border-radius:8px;overflow:hidden}.lpA .ic .apT svg{width:11px;height:11px}.lpA b{font-weight:600;font-size:13px;color:#7cc4ff;font-variant-numeric:tabular-nums}
    .lpB{left:50%;transform:translateX(-50%);top:calc(136px + env(safe-area-inset-top));height:34px;padding:0 14px 0 5px;border-radius:17px;background:rgba(10,10,12,.82);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);display:flex;align-items:center;gap:9px;font-size:14px;font-weight:600;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.35);white-space:nowrap}
    .lpB .ic{position:relative;width:26px;height:26px;border-radius:13px;overflow:hidden}.lpB .ic .apT svg{width:16px;height:16px}.lpB small{color:rgba(255,255,255,.65);font-weight:500}.lpB b{color:#7cc4ff;font-variant-numeric:tabular-nums}
    .lpB i{position:absolute;left:0;bottom:0;height:3px;width:62%;background:#7cc4ff;border-radius:2px}
    .lpC{left:8px;right:8px;top:calc(2px + env(safe-area-inset-top));border-radius:28px;background:#000;padding:14px 16px 14px;box-shadow:0 10px 30px rgba(0,0,0,.45)}
    .lpC .r1{display:flex;align-items:center;gap:10px}.lpC .ic{position:relative;width:34px;height:34px;border-radius:9px;overflow:hidden}.lpC .ic .apT svg{width:22px;height:22px}
    .lpC .t{flex:1}.lpC .t b{display:block;font-size:16px;font-weight:600}.lpC .t small{color:rgba(255,255,255,.6);font-size:13px}.lpC .tm{font-size:24px;font-weight:600;color:#7cc4ff;font-variant-numeric:tabular-nums}
    .lpC .fc{display:flex;margin:12px 0 10px}.lpC .fc .phFace{width:30px;height:30px;margin-right:-8px;box-shadow:0 0 0 2px #000;border-radius:50%}
    .lpC .bar{position:relative;height:6px;border-radius:3px;background:rgba(255,255,255,.16)}.lpC .bar i{position:absolute;left:0;top:0;bottom:0;width:62%;border-radius:3px;background:#7cc4ff}
    .lpC .bar u{position:absolute;top:-5px;left:calc(62% - 8px);width:16px;height:16px;border-radius:8px;background:#fff;text-decoration:none}
    .lpC .ends{display:flex;justify-content:space-between;font-size:12px;color:rgba(255,255,255,.55);margin-top:6px}
    .lpD{top:calc(2px + env(safe-area-inset-top));height:22px;background:#000;border-radius:11px;display:flex;align-items:center;box-shadow:0 0 0 1px rgba(255,255,255,.08)}
    .lpD.m{left:calc(50% - 50px);padding:0 9px 0 4px;gap:12px;min-width:84px;justify-content:space-between}.lpD.s{left:calc(50% + 42px);width:22px;justify-content:center}
    .lpD .ic{position:relative;width:16px;height:16px;border-radius:8px;overflow:hidden}.lpD .ic .apT svg{width:11px;height:11px}.lpD b{font-weight:600;font-size:13px;color:#7cc4ff;font-variant-numeric:tabular-nums}.lpD b.am{color:#ffb340}` });
  const H = await p.evaluate(() => ({ ex: ZH.appTile('explore', 11), exB: ZH.appTile('explore', 16), exC: ZH.appTile('explore', 22), town: ZH.appTile('town', 11), faces: ZH.S.sv.slice(0, 3).map((q) => ZH.pplFace(q)).join('') }));
  const V = {
    A: `<div class="lp lpA"><span class="ic">${H.ex}</span><b>2:10</b></div>`,
    B: `<div class="lp lpB"><span class="ic">${H.exB}</span>Squad<small>· Gas station</small><b>2 h 10 m</b><i></i></div>`,
    C: `<div class="lp lpC"><div class="r1"><span class="ic">${H.exC}</span><span class="t"><b>Squad coming home</b><small>From the gas station · 3 people</small></span><span class="tm">2:10</span></div><div class="fc">${H.faces}</div><div class="bar"><i></i><u></u></div><div class="ends"><span>Gas station</span><span>Haven</span></div></div>`,
    D: `<div class="lp lpD m"><span class="ic">${H.ex}</span><b>2:10</b></div><div class="lp lpD s"><span class="ic">${H.town}</span></div>` };
  await p.addStyleTag({ content: '#nfBox{display:none!important}' });
  for (const [k, h] of Object.entries(V)) { await p.evaluate((h) => { document.querySelectorAll('.lpW').forEach((x) => x.remove()); const d = document.createElement('div'); d.className = 'lpW'; d.innerHTML = h; document.body.appendChild(d); }, h); await p.waitForTimeout(250); await p.screenshot({ path: path.join(out, `pill_${k}.png`) }); }
  await b.close(); console.log('ok');
})();
