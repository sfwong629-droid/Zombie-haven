// tools/qa/hold_mock.js — UI chat, 28 Nov (idea 8, press and hold a dock icon for shortcuts; owner: "Do the press and hold shortcut first").
// Mockup only, over the real town. Held: People (Find the hurt · 2, Rescue Marcus, Everyone) and Build (the last three built, Repair damaged).
// A: the phone's own menu: the town dims and blurs, the icon lifts, a rounded list of shortcuts above it, a sign on the right of each row;
// B: a row of round labelled buttons above the icon; C: A with a small preview on top (who is hurt, with pictures);
// D: a ring of round buttons around the icon. Pictures: runs/ui_samples/hold_<A..D>.png, hold_sheet.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
const SG = {
  find: '<circle cx="11" cy="11" r="6"/><path d="M15.5 15.5L20 20"/>', aid: '<path d="M12 5v14M5 12h14"/>', all: '<circle cx="9" cy="9" r="3"/><circle cx="16" cy="10" r="2.5"/><path d="M3.5 19c.5-3 2.7-4.6 5.5-4.6s5 1.6 5.5 4.6M14.5 14.6c2.6-.3 4.7 1 5.2 4"/>',
  repair: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3.6 17.1a1.8 1.8 0 0 0 2.6 2.6l5.7-5.7a4 4 0 0 0 5.1-5.4l-2.4 2.4-2.3-.6-.6-2.3z"/>', drop: '<path d="M12 4c3 4 5 6.6 5 9.5a5 5 0 0 1-10 0C7 10.6 9 8 12 4z"/>', tent: '<path d="M3 19L12 5l9 14z"/><path d="M12 19l-2.5-5M12 19l2.5-5"/>', wall: '<rect x="3" y="7" width="18" height="11" rx="1"/><path d="M3 12.5h18M9 7v5.5M15 12.5V18"/>' };
const sv = (k, px = 20, c = '#fff') => `<svg viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" stroke="${c}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${SG[k]}</svg>`;
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, look: '', expose: 'pplFace' }); await Q.newGame(p);
  for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(150); }
  await p.waitForTimeout(5000);
  const info = await p.evaluate(() => { const r = (id) => { const e = document.querySelector('#' + id + ' .dkI').getBoundingClientRect(); return { x: e.left, y: e.top, w: e.width }; };
    return { surv: r('mSurv'), build: r('mBuild'), html: { surv: document.querySelector('#mSurv .dkI').innerHTML, build: document.querySelector('#mBuild .dkI').innerHTML }, nm: ZH.S.sv[0].name, f1: ZH.pplFace(ZH.S.sv[0]), f2: ZH.pplFace(ZH.S.sv[1]), n2: ZH.S.sv[1].name }; });
  await p.addStyleTag({ content: `#nfBox,#lpIsl{display:none!important}.hW{position:fixed;inset:0;z-index:9999;font-family:-apple-system,"SF Pro Text",system-ui,sans-serif;color:#fff}
    .hDim{position:absolute;inset:0;background:rgba(0,0,0,.28);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
    .hIc{position:absolute;width:50px;height:50px;border-radius:12px;overflow:hidden;transform:scale(1.12);box-shadow:0 10px 26px rgba(0,0,0,.5)}.hIc .apT{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
    .hM{position:absolute;width:250px;border-radius:14px;overflow:hidden;background:rgba(40,40,44,.82);-webkit-backdrop-filter:blur(30px) saturate(1.5);backdrop-filter:blur(30px) saturate(1.5);box-shadow:0 10px 30px rgba(0,0,0,.4)}
    .hM div{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;font-size:16.5px;border-bottom:1px solid rgba(255,255,255,.1)}.hM div:last-child{border:0}.hM div small{display:block;font-size:12.5px;color:rgba(255,255,255,.55);margin-top:1px}
    .hM div.red{color:#ff6961}.hM div.red svg *{stroke:#ff6961}
    .hP{position:absolute;width:250px;border-radius:14px;padding:12px 14px;background:rgba(40,40,44,.82);-webkit-backdrop-filter:blur(30px);backdrop-filter:blur(30px)}.hP b{font-size:13px;color:rgba(255,255,255,.6);font-weight:600;text-transform:uppercase}.hP .r{display:flex;align-items:center;gap:10px;margin-top:8px;font-size:15px}.hP .phFace{width:34px;height:34px;border-radius:50%}.hP .bar{flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.15);position:relative}.hP .bar i{position:absolute;left:0;top:0;bottom:0;border-radius:3px}
    .hRow{position:absolute;display:flex;gap:10px;padding:10px 12px;border-radius:24px;background:rgba(40,40,44,.82);-webkit-backdrop-filter:blur(30px);backdrop-filter:blur(30px)}.hRow span,.hRing span{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px;width:62px;text-align:center;line-height:1.15}.hRow span i,.hRing span i{width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center}.hRow span i.red,.hRing span i.red{background:#ff453a}
    .hRing span{position:absolute}` });
  const ic = (r, h) => `<div class="hIc" style="left:${r.x}px;top:${r.y}px">${h}</div>`;
  const S = info.surv, B = info.build;
  const people = [['find', 'Find the hurt', '2 hurt', 'red'], ['aid', `Rescue ${info.nm}`, 'Down · 40 s', ''], ['all', 'Everyone', '4 people', '']];
  const builds = [['drop', 'Rain Barrel', 'Built last', ''], ['tent', 'Tent', '', ''], ['wall', 'Wooden wall', '', ''], ['repair', 'Repair damaged', '1 building', '']];
  const menu = (r, rows, w = 250) => `<div class="hM" style="left:${Math.min(390 - w - 10, Math.max(10, r.x - 20))}px;bottom:${844 - r.y + 14}px;width:${w}px">${rows.map(([k, t, s, c]) => `<div class="${c}"><span>${t}${s ? `<small>${s}</small>` : ''}</span>${sv(k)}</div>`).join('')}</div>`;
  const V = {
    A: `<div class="hW"><div class="hDim"></div>${menu(S, people)}${ic(S, info.html.surv)}</div>`,
    A2: `<div class="hW"><div class="hDim"></div>${menu(B, builds)}${ic(B, info.html.build)}</div>`,
    B: `<div class="hW"><div class="hDim"></div><div class="hRow" style="left:${S.x - 50}px;bottom:${844 - S.y + 14}px">${people.map(([k, t, s, c]) => `<span><i class="${c}">${sv(k, 22)}</i>${t}</span>`).join('')}</div>${ic(S, info.html.surv)}</div>`,
    C: `<div class="hW"><div class="hDim"></div><div class="hP" style="left:${Math.max(10, S.x - 20)}px;bottom:${844 - S.y + 14 + 3 * 62 + 10}px"><b>Hurt</b><div class="r">${info.f1}<span style="width:70px">${info.nm}</span><span class="bar"><i style="width:8%;background:#ff453a"></i></span></div><div class="r">${info.f2}<span style="width:70px">${info.n2}</span><span class="bar"><i style="width:35%;background:#ff9f0a"></i></span></div></div>${menu(S, people)}${ic(S, info.html.surv)}</div>`,
    D: `<div class="hW"><div class="hDim"></div><div class="hRing">${people.map(([k, t, s, c], i) => { const a = Math.PI * (1.15 + i * .35), R = 92; return `<span style="left:${S.x + 25 + R * Math.cos(a) - 31}px;top:${S.y + 25 + R * Math.sin(a) - 24}px"><i class="${c}">${sv(k, 22)}</i>${t}</span>`; }).join('')}</div>${ic(S, info.html.surv)}</div>` };
  for (const [k, h] of Object.entries(V)) { await p.evaluate((h) => { document.querySelectorAll('.hW').forEach((x) => x.remove()); document.body.insertAdjacentHTML('beforeend', h); }, h); await p.waitForTimeout(250); await p.screenshot({ path: path.join(out, `hold_${k}.png`) }); }
  await b.close(); console.log('ok');
})();
