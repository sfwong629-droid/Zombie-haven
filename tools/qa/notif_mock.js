// tools/qa/notif_mock.js — UI chat, 28 Nov (owner: "Do it one at a time, many mock up for approval"; idea 2, notifications from the top).
// Mockup only, over the real town. Now: today's news toast and the line at the bottom. A: the phone's own notification banner, dark glass
// (the app's icon, its name, "now", a bold title, one line); B: a small pill under the status strip that grows to one line; C: like A,
// several stacked with "+2 more"; D: like A in light glass, dark words. A tap goes where it says, a swipe up puts it away.
// Pictures: runs/ui_samples/notif_<now|A|B|C|D>.png, notif_sheet.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
const N = [{ k: 'people', app: 'People', t: 'Rosa is down', b: '40 s to reach her, by the east gate.', red: 1 },
  { k: 'explore', app: 'Explore', t: 'New lead: the gas station', b: 'Fuel and tools. Low risk. Gone in 8 h.' },
  { k: 'build', app: 'Build', t: 'Rain Barrel built', b: 'Water +6 a day.' }];
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, look: '', expose: 'appTile, banner, say' }); await Q.newGame(p);
  for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(150); }
  await p.evaluate(() => { ZH.banner('🩸 ROSA IS DOWN · 40 S TO REACH HER'); ZH.say('A new lead: the gas station. Fuel and tools.'); }); await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(out, 'notif_now.png') });
  await p.waitForTimeout(5000);
  await p.addStyleTag({ content: `
    .nf{position:fixed;left:8px;right:8px;top:calc(34px + env(safe-area-inset-top));z-index:9999;display:flex;gap:11px;align-items:center;padding:11px 13px;border-radius:22px;font-family:-apple-system,"SF Pro Text",system-ui,sans-serif;
      background:rgba(28,28,30,.72);-webkit-backdrop-filter:blur(26px) saturate(1.6);backdrop-filter:blur(26px) saturate(1.6);box-shadow:0 8px 30px rgba(0,0,0,.35);color:#fff}
    .nf .ic{position:relative;flex:none;width:38px;height:38px;border-radius:9px;overflow:hidden}.nf .ic .apT svg{width:26px;height:26px}
    .nf .tx{flex:1;min-width:0}.nf .hd{display:flex;justify-content:space-between;font-size:12.5px;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.02em}
    .nf .tt{font-weight:600;font-size:15px;margin-top:1px}.nf .bd{font-size:14.5px;color:rgba(255,255,255,.88);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .nf.lt{background:rgba(246,246,248,.78);color:#111}.nf.lt .hd{color:rgba(0,0,0,.5)}.nf.lt .bd{color:rgba(0,0,0,.8)}
    .nf .rd{position:absolute;right:-1px;top:-1px;width:10px;height:10px;border-radius:50%;background:#ff3b30;box-shadow:0 0 0 2px rgba(28,28,30,.9)}
    .nf.bk{transform:translateY(12px) scale(.94);transform-origin:50% 100%;opacity:.8;z-index:9998}.nf.bk2{transform:translateY(23px) scale(.88);transform-origin:50% 100%;opacity:.55;z-index:9997}
    .nfMore{position:fixed;left:0;right:0;top:calc(34px + 104px + env(safe-area-inset-top));text-align:center;z-index:9999;font:600 12.5px -apple-system,system-ui,sans-serif;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.6)}
    .nfP{position:fixed;left:50%;transform:translateX(-50%);top:calc(32px + env(safe-area-inset-top));z-index:9999;display:flex;align-items:center;gap:9px;height:40px;padding:0 14px 0 6px;border-radius:20px;background:#000;color:#fff;font:600 14px -apple-system,system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.4);white-space:nowrap;max-width:92%}
    .nfP .ic{position:relative;width:28px;height:28px;border-radius:14px;overflow:hidden;flex:none}.nfP .ic .apT svg{width:19px;height:19px}.nfP small{color:rgba(255,255,255,.6);font-weight:500;margin-left:4px}` });
  const tiles = await p.evaluate((N) => Object.fromEntries(N.map((n) => [n.k, ZH.appTile(n.k, 26)])), N);
  const mk = (n, cls = '') => `<div class="nf ${cls}"><span class="ic">${tiles[n.k]}</span><div class="tx"><div class="hd"><span>${n.app}</span><span>now</span></div><div class="tt">${n.t}</div><div class="bd">${n.b}</div></div></div>`;
  const V = { A: mk(N[0]), B: `<div class="nfP"><span class="ic">${tiles.people}</span>Rosa is down<small>40 s</small></div>`, C: mk(N[2], 'bk2') + mk(N[1], 'bk') + mk(N[0]) + '<div class="nfMore">2 more</div>', D: mk(N[0], 'lt') };
  for (const [k, h] of Object.entries(V)) { await p.evaluate((h) => { document.querySelectorAll('.nfW').forEach((x) => x.remove()); const d = document.createElement('div'); d.className = 'nfW'; d.innerHTML = h; document.body.appendChild(d); }, h); await p.waitForTimeout(250); await p.screenshot({ path: path.join(out, `notif_${k}.png`) }); }
  await b.close(); console.log('ok');
})();
