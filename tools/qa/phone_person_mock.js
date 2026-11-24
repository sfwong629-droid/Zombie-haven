// tools/qa/phone_person_mock.js — UI chat, 23 Nov (W249). MOCKUP ONLY: a hand-built page drawn inside the real menu sheet of the running game.
// Owner on the survivor's page built on the work branch: "how to make it more like iPhone?" This draws the same page the iPhone way:
// a poster header (the person's colour edge to edge, the picture standing in it, the name large over it), "‹ People" as a text back link and a
// small grey close button, four action tiles with plain white line signs, grouped lists with small grey section titles, a label on the left,
// the value on the right and a chevron, and Gear as the same kind of list with a thumbnail per slot.
// Pictures: runs/ui_samples/phoneG_person_{status,gear}.png. Usage: node tools/qa/phone_person_mock.js   (game served on :8765)
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
const DRAW = function (tab) {
  const u = ZH.S.sv[1], c = ['#f0a24a', '#ff8fb8', '#b79bff', '#7fd6a8', '#4cc3ff', '#ff7a59', '#e6d36a'][(u.id || 0) % 7];
  const pic = ZH3D.snap(u, { key: 'kneesup', W: 208, H: 256, half: .54, dy: .67 }) || '';
  const g = (d, s = 22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const G = { status: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.600-7 10-7 10z"/>', gear: '<path d="M12 3l7 3v6c0 4.500-3 7.500-7 9-4-1.500-7-4.500-7-9V6z"/>', job: '<rect x="3.500" y="7.500" width="17" height="12" rx="2.500"/><path d="M9 7.500V5.500a1.500 1.500 0 0 1 1.500-1.500h3A1.500 1.500 0 0 1 15 5.500v2M3.500 13h17"/>', about: '<circle cx="12" cy="12" r="8.500"/><path d="M12 11v5.500M12 7.700v.1"/>', ch: '<path d="M9 5l7 7-7 7"/>', back: '<path d="M15 5l-7 7 7 7"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>' };
  const I = (n) => ZHIcons.svg(n, 20), ch = `<i class="ch">${g(G.ch, 14)}</i>`;
  const bar = (ic, t, v, col, w) => `<div class="r"><span class="ic">${I(ic)}</span><b>${t}</b><span class="bt"><i style="width:${v}%;background:${col}"></i></span><em>${w}</em></div>`;
  const row = (k, v, go) => `<div class="r"><span class="k">${k}</span><span class="v">${v}</span>${go ? ch : ''}</div>`;
  const slot = (ic, t, v) => `<div class="r tall"><span class="th">${ZHIcons.svg(ic, 26)}</span><span class="tx"><b>${t}</b><small>${v}</small></span>${ch}</div>`;
  const body = tab === 'gear'
    ? `<div class="sec">Wearing</div><div class="grp">${slot('shield', 'Armour', 'Riot Vest · blocks 22%')}${slot('worker', 'Hat', 'Empty')}${slot('boot', 'Accessory', 'Empty')}</div><div class="sec">Carrying</div><div class="grp">${slot('fight', 'Weapon', 'Pistol · 11 damage a shot')}</div><div class="sec">Pet</div><div class="grp">${slot('pet', 'No pet', 'The trader sometimes brings dogs and cats')}</div>`
    : `<div class="sec">Needs</div><div class="grp">${bar('heart', 'Health', 82, '#ff5b6b', '57/70')}${bar('food', 'Food', 45, '#f0a24a', 'Getting hungry')}${bar('water', 'Water', 80, '#5db4ff', 'Fine')}${bar('bed', 'Rest', 70, '#7fd6a8', 'Rested')}${bar('happy', 'Mood', 30, '#b79bff', 'Low')}</div>
       <div class="sec">Today</div><div class="grp">${row('Now', 'Free time · chopping wood')}${row('Works at', 'Medical Tent · on shift 8–18', 1)}${row('Lives in', 'Tent 2, with Ben', 1)}</div>
       <div class="sec">Orders</div><div class="grp"><div class="r"><span class="k" style="color:#fff">Gather when free</span><span class="v"></span><span class="sw on"><i></i></span></div></div>`;
  document.getElementById('it').textContent = '';
  document.getElementById('ib').innerHTML = `<div class="ip"><div class="poster" style="--c:${c}"><img src="${pic}"><div class="pn"><h2>${u.name} ${u.last || ''}</h2><small>${u.job} · Level ${u.l}</small></div></div>
    <div class="acts">${[['status', 'Status'], ['gear', 'Gear'], ['job', 'Job'], ['about', 'About']].map(([k, t]) => `<button class="${k === tab ? 'on' : ''}">${g(G[k])}<span>${t}</span></button>`).join('')}</div>${body}</div>`;
  let nav = document.getElementById('ipNav'); if (!nav) { nav = document.createElement('div'); nav.id = 'ipNav'; document.getElementById('infoPanel').appendChild(nav); }
  nav.innerHTML = `<span class="bk">${g(G.back, 18)}People</span><span class="xx">${g(G.x, 14)}</span>`;
  let st = document.getElementById('ipCss'); if (!st) { st = document.createElement('style'); st.id = 'ipCss'; document.head.appendChild(st); }
  st.textContent = `
  #infoPanel .ph, #infoPanel::before { display: none !important; } #infoPanel #ib { position: static; padding: 0 !important; margin: 0 !important; border-radius: 34px; max-height: none !important; height: 744px; overflow: hidden; }
  #ipNav { position: absolute; left: 0; right: 0; top: 0; height: 52px; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; z-index: 5; font: 600 16px Manrope, sans-serif; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,.4); }
  #ipNav .bk { display: flex; align-items: center; gap: 1px; } #ipNav .xx { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: rgba(40,44,52,.45); backdrop-filter: blur(10px); color: rgba(255,255,255,.85); }
  #ipNav::before { content: ''; position: absolute; left: 50%; top: 7px; width: 36px; height: 5px; margin-left: -18px; border-radius: 3px; background: rgba(255,255,255,.55); }
  .ip { font-family: Manrope, sans-serif; color: #fff; padding-bottom: 16px; }
  .ip .poster { position: relative; height: 236px; background: radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--c) 82%, #fff), color-mix(in srgb, var(--c) 62%, #000)); overflow: hidden; display: flex; justify-content: center; }
  .ip .poster img { height: 205px; margin-top: 36px; filter: drop-shadow(0 6px 10px rgba(0,0,0,.3)); }
  .ip .pn { position: absolute; left: 0; right: 0; bottom: 0; padding: 46px 16px 10px; text-align: center; background: linear-gradient(180deg, transparent, rgba(18,22,28,.82)); }
  .ip .pn h2 { margin: 0; font-size: 30px; font-weight: 800; letter-spacing: -.5px; } .ip .pn small { font-size: 13px; font-weight: 600; opacity: .8; }
  .ip .acts { display: flex; gap: 8px; padding: 12px 16px 2px; } .ip .acts button { flex: 1; height: 58px; border: 0; border-radius: 14px; background: rgba(255,255,255,.1); box-shadow: inset 0 1px 0 rgba(255,255,255,.14); color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; font: 600 11px Manrope, sans-serif; }
  .ip .acts button.on { background: rgba(255,255,255,.92); color: #14181e; }
  .ip .sec { margin: 16px 32px 6px; font-size: 12px; font-weight: 700; letter-spacing: .4px; text-transform: uppercase; color: rgba(255,255,255,.52); }
  .ip .grp { margin: 0 16px; border-radius: 14px; background: rgba(255,255,255,.08); box-shadow: inset 0 1px 0 rgba(255,255,255,.1); }
  .ip .r { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 14px; position: relative; font-size: 15px; } .ip .r.tall { min-height: 60px; }
  .ip .r + .r::before { content: ''; position: absolute; left: 14px; right: 0; top: 0; height: 1px; background: rgba(255,255,255,.1); } .ip .r.tall + .r.tall::before { left: 62px; }
  .ip .r b { font-weight: 600; width: 56px; } .ip .r .ic { display: flex; } .ip .bt { flex: 1; height: 6px; border-radius: 3px; background: rgba(255,255,255,.14); } .ip .bt i { display: block; height: 6px; border-radius: 3px; } .ip .r em { width: 104px; text-align: right; font-style: normal; font-size: 14px; color: rgba(255,255,255,.62); white-space: nowrap; }
  .ip .k { flex: none; } .ip .v { flex: 1; text-align: right; color: rgba(255,255,255,.62); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .ip .ch { color: rgba(255,255,255,.35); display: flex; margin-right: -4px; }
  .ip .th { width: 38px; height: 38px; border-radius: 9px; background: rgba(255,255,255,.1); display: grid; place-items: center; flex: none; } .ip .tx { flex: 1; display: flex; flex-direction: column; } .ip .tx b { width: auto; font-size: 15px; } .ip .tx small { font-size: 13px; color: rgba(255,255,255,.6); }
  .ip .sw { width: 51px; height: 31px; border-radius: 16px; background: #c6ff4d; position: relative; flex: none; } .ip .sw i { position: absolute; right: 2px; top: 2px; width: 27px; height: 27px; border-radius: 50%; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,.3); }`;
};
(async () => {
  const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, look: '', expose: 'showSurvivors' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(2500); await Q.clearCards(p);
  for (const t of ['status', 'gear']) { await Q.clearCards(p); await p.waitForTimeout(600); await Q.clearCards(p); await p.evaluate(() => ZH.showSurvivors()); await p.waitForTimeout(400); await p.evaluate(DRAW, t); await p.waitForTimeout(500); await p.evaluate(DRAW, t); await p.waitForTimeout(300); await p.screenshot({ path: path.join(out, `phoneG_person_${t}.png`) }); console.log('shot', t); }
  await b.close();
})();
