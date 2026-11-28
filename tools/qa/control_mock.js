// tools/qa/control_mock.js — UI chat, 28 Nov (idea 4, Control Center; "many mock up for approval"). Mockup only, over the real town.
// Pulled down from the right of the status strip; quick switches for what is now buried in Settings or the old bottom bar:
// pause, game speed, the day music (what plays, skip), music and sound on/off with their volume, night lights, advisor tips, survivor pictures, save.
// A: the phone's own Control Center (dark blur over everything, rounded tiles, two tall sliders); B: a half-height sheet from the top with a row of
// round switches and the speed as a segmented control; C: like A with a big music player on top; D: Android-style quick settings (a row of round
// switches, a volume bar, a strip you pull further for more). Pictures: runs/ui_samples/cc_<A..D>.png, cc_sheet.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
const I = {
  pause: '<rect x="6.5" y="5" width="3.6" height="14" rx="1" fill="#fff" stroke="none"/><rect x="13.9" y="5" width="3.6" height="14" rx="1" fill="#fff" stroke="none"/>',
  speed: '<path d="M4 6l7 6-7 6z M12 6l7 6-7 6z" fill="#fff" stroke="none"/>',
  music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="#fff"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" fill="#fff"/>',
  tips: '<path d="M9 15.6c-1.8-1.3-3-3.4-3-5.7a6 6 0 0 1 12 0c0 2.3-1.2 4.4-3 5.7v1.8H9z"/><path d="M9.6 19.6h4.8"/>',
  pics: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.6-3.6 3.4-5.6 7-5.6s6.4 2 7 5.6"/>',
  save: '<path d="M12 4v10M7.5 10l4.5 4.5 4.5-4.5"/><path d="M5 17v2.5h14V17"/>',
  prev: '<path d="M18 6l-8 6 8 6z M8 6v12" fill="#fff"/>', next: '<path d="M6 6l8 6-8 6z M16 6v12" fill="#fff"/>', play: '<path d="M8 5l11 7-11 7z" fill="#fff" stroke="none"/>' };
const ic = (k, px = 24) => `<svg viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${I[k]}</svg>`;
const CSS = `.ccW{position:fixed;inset:0;z-index:9999;font-family:-apple-system,"SF Pro Text",system-ui,sans-serif;color:#fff}
.ccDim{position:absolute;inset:0;background:rgba(0,0,0,.38);-webkit-backdrop-filter:blur(22px) saturate(1.2);backdrop-filter:blur(22px) saturate(1.2)}
.ccG{position:absolute;left:22px;right:22px;top:72px;display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.t{background:rgba(255,255,255,.16);border-radius:22px;display:flex;align-items:center;justify-content:center;aspect-ratio:1}
.t.on{background:#fff}.t.on svg *{stroke:#1c1c1e!important;fill:#1c1c1e}.t.on svg [fill="none"]{fill:none}
.t2{grid-column:span 2;grid-row:span 2;aspect-ratio:auto;flex-direction:column;align-items:stretch;justify-content:space-between;padding:14px}
.rnd{border-radius:50%}.lab{font-size:11px;color:rgba(255,255,255,.75);text-align:center;margin-top:4px}
.sl{grid-row:span 2;aspect-ratio:auto;border-radius:22px;background:rgba(255,255,255,.16);position:relative;overflow:hidden;display:flex;align-items:flex-end;justify-content:center;padding-bottom:12px}
.sl i{position:absolute;left:0;right:0;bottom:0;background:#fff}.sl svg{position:relative;z-index:1}.sl svg *{stroke:#555!important;fill:#555}
.np b{font-size:14px;font-weight:600;display:block}.np small{font-size:12px;color:rgba(255,255,255,.6)}.np .ctl{display:flex;justify-content:space-around;align-items:center}
.seg{display:flex;background:rgba(255,255,255,.14);border-radius:10px;padding:2px}.seg span{flex:1;text-align:center;padding:6px 0;border-radius:8px;font-size:13px;font-weight:600}.seg span.on{background:rgba(255,255,255,.9);color:#111}
.ccS{position:absolute;left:0;right:0;top:0;padding:40px 16px 16px;background:rgba(28,28,30,.86);-webkit-backdrop-filter:blur(26px);backdrop-filter:blur(26px);border-radius:0 0 28px 28px;box-shadow:0 10px 30px rgba(0,0,0,.45)}
.row{display:flex;justify-content:space-between;margin:12px 4px}.rb{display:flex;flex-direction:column;align-items:center;width:62px}.rb .c{width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center}.rb .c.on{background:#0a84ff}
.hd{display:flex;align-items:center;justify-content:space-between;font-size:13px;color:rgba(255,255,255,.6)}.vb{height:30px;border-radius:15px;background:rgba(255,255,255,.14);position:relative;overflow:hidden;margin-top:12px;display:flex;align-items:center;padding-left:10px}.vb i{position:absolute;left:0;top:0;bottom:0;width:62%;background:rgba(255,255,255,.88)}.vb svg{position:relative;z-index:1}.vb svg *{stroke:#555!important;fill:#555}
.grab{width:40px;height:5px;border-radius:3px;background:rgba(255,255,255,.4);margin:14px auto 0}`;
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, look: '' }); await Q.newGame(p);
  for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(150); }
  await p.waitForTimeout(5500); await p.addStyleTag({ content: CSS + '#nfBox{display:none!important}' });
  const np = (big) => `<div class="t t2 np"${big ? ' style="grid-column:span 4;grid-row:span 1;padding:16px"' : ''}><div style="display:flex;gap:10px;align-items:center"><span class="t" style="width:44px;height:44px;border-radius:10px;background:linear-gradient(180deg,#cf9a3d,#7d5a1c);flex:none">${ic('music', 22)}</span><span><b>Meadow</b><small>Day music · Haven Radio</small></span></div>${big ? '<div class="seg" style="margin-top:12px;background:rgba(255,255,255,.1)"><span>Meadow</span><span class="on">Lanterns</span><span>Harvest</span><span>Rain</span></div>' : ''}<div class="ctl" style="margin-top:${big ? 10 : 0}px">${ic('prev', 22)}${ic('play', 30)}${ic('next', 22)}</div></div>`;
  const V = {
    A: `<div class="ccW"><div class="ccDim"></div><div class="ccG">
      <div class="t t2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px"><div class="t rnd on" style="aspect-ratio:1">${ic('pause', 26)}</div><div class="t rnd" style="aspect-ratio:1;flex-direction:column;font-weight:700;font-size:15px">2×</div><div class="t rnd on" style="aspect-ratio:1">${ic('music', 24)}</div><div class="t rnd on" style="aspect-ratio:1">${ic('sound', 24)}</div></div>
      ${np(false)}
      <div class="t">${ic('moon', 26)}</div><div class="t on">${ic('tips', 26)}</div><div class="sl" style=""><i style="height:62%"></i>${ic('music', 22)}</div><div class="sl"><i style="height:80%"></i>${ic('sound', 22)}</div>
      <div class="t on">${ic('pics', 26)}</div><div class="t">${ic('save', 26)}</div></div></div>`,
    B: `<div class="ccW"><div class="ccDim" style="background:rgba(0,0,0,.25)"></div><div class="ccS"><div class="hd"><span>Day 1 · 08:00</span><span>Haven</span></div>
      <div class="row">${[['pause', 'Pause', 0], ['music', 'Music', 1], ['sound', 'Sound', 1], ['moon', 'Night lights', 0], ['tips', 'Tips', 1]].map(([k, l, on]) => `<span class="rb"><span class="c${on ? ' on' : ''}">${ic(k, 22)}</span><span class="lab">${l}</span></span>`).join('')}</div>
      <div class="seg"><span>1×</span><span class="on">2×</span><span>3×</span></div><div class="vb"><i></i>${ic('music', 18)}</div><div class="grab"></div></div></div>`,
    C: `<div class="ccW"><div class="ccDim"></div><div class="ccG">${np(true)}
      <div class="t rnd on">${ic('pause', 26)}</div><div class="t rnd" style="font-weight:700;font-size:17px">2×</div><div class="t rnd on">${ic('music', 24)}</div><div class="t rnd on">${ic('sound', 24)}</div>
      <div class="t">${ic('moon', 26)}</div><div class="t on">${ic('tips', 26)}</div><div class="t on">${ic('pics', 26)}</div><div class="t">${ic('save', 26)}</div></div></div>`,
    D: `<div class="ccW"><div class="ccDim" style="background:rgba(0,0,0,.25);backdrop-filter:none"></div><div class="ccS" style="border-radius:0 0 24px 24px;background:rgba(32,33,36,.94)"><div class="hd"><span>08:00 · Day 1</span><span>✎</span></div>
      <div class="row" style="flex-wrap:wrap;gap:12px 0">${[['pause', 'Paused', 1], ['speed', 'Speed 2×', 1], ['music', 'Music', 1], ['sound', 'Sound', 1], ['moon', 'Night lights', 0], ['tips', 'Tips', 1], ['pics', 'Pictures', 1], ['save', 'Save', 0]].map(([k, l, on]) => `<span class="rb" style="width:25%"><span class="c${on ? ' on' : ''}" style="${on ? 'background:#8ab4f8' : ''}">${ic(k, 22)}</span><span class="lab">${l}</span></span>`).join('')}</div>
      <div class="vb" style="border-radius:8px"><i style="background:#8ab4f8"></i>${ic('sound', 18)}</div><div class="grab"></div></div></div>` };
  for (const [k, h] of Object.entries(V)) { await p.evaluate((h) => { document.querySelectorAll('.ccW').forEach((x) => x.remove()); document.body.insertAdjacentHTML('beforeend', h); }, h); await p.waitForTimeout(250); await p.screenshot({ path: path.join(out, `cc_${k}.png`) }); }
  await b.close(); console.log('ok');
})();
