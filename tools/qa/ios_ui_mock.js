// tools/qa/ios_ui_mock.js — UI chat, 23 Nov (owner: "Can we come up with some sample to make the UI like an iphone ... Give me some
// sample mock up"). MOCKUP ONLY: three iPhone-like looks drawn over the real game scene (the game's own HUD is hidden for the picture),
// each as the town screen and the People menu. Nothing in the game changes. Pictures: runs/ui_samples/ios_*.png
// No Apple fonts or SF Symbols are used (their licences don't allow it in this game): the type is the game's Manrope, the line icons
// are drawn here, the item icons are the game's own sticker icons.
// Usage: node tools/qa/ios_ui_mock.js   (needs the game served on :8765)
const Q = require('./lib');

const MOCK = function ({ look, screen }) {
  const ic = (n, s) => ZHIcons.svg(n, s);
  const L = {   /* line icons, drawn for this mockup */
    explore: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5 L13 13 L8.5 15.5 L11 11 Z" fill="currentColor"/>',
    people: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><circle cx="16.5" cy="9" r="2.6"/><path d="M16 14.2c2.8 0 4.8 1.9 4.8 4.8"/>',
    build: '<path d="M13.5 4.5l6 6-2.2 2.2-6-6z"/><path d="M12.4 8.6L4.8 16.2a1.8 1.8 0 0 0 2.6 2.6l7.6-7.6"/>',
    town: '<path d="M3.5 11L12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
    more: '<circle cx="6" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="18" cy="12" r="1.7" fill="currentColor"/>',
    target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>',
    chev: '<path d="M9 5l7 7-7 7"/>', search: '<circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  };
  const li = (n, s = 24, w = 1.9) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${L[n]}</svg>`;
  const RES = [['food', 14], ['water', 14], ['wood', 20], ['parts', 16], ['stash', 4]];
  const PEOPLE = [
    ['On duty', [['Marcus', 'Guard', 'North wall post', 1, '#e8734a'], ['Amy', 'Medic', 'At the Medical Tent', .82, '#d95f8f'], ['Ben', 'Farmer', 'Garden Plot', .95, '#7fae4e'], ['Rosa', 'Builder', 'Building a Rain Barrel', .6, '#d9a441']]],
    ['Out on a trip', [['Lena', 'Scavenger', 'Lumber Yard · back soon', .74, '#4f8fd9']]],
    ['Resting', [['Theo', 'Fighter', 'Asleep in the Tent', .35, '#8a6fd1'], ['Ada', 'Mechanic', 'Free time · campfire', 1, '#3cb0a0']]],
  ];
  const JOBIC = { Guard: 'shield', Medic: 'medic', Farmer: 'sprout', Builder: 'hammer', Scavenger: 'search', Fighter: 'fight', Mechanic: 'parts' };
  /* hide the game's HUD; keep the 3D scene */
  let hs = document.getElementById('iosHide'); if (!hs) { hs = document.createElement('style'); hs.id = 'iosHide'; document.head.appendChild(hs); }
  hs.textContent = '#world > *:not(canvas), #bottom, .nStack { visibility: hidden !important; }';
  document.querySelectorAll('.iosMock').forEach((e) => e.remove());
  const root = document.createElement('div'); root.className = 'iosMock ios_' + look; document.body.appendChild(root);
  const tabs = [['explore', 'Explore'], ['people', 'People'], ['build', 'Build'], ['town', 'Town'], ['more', 'More']];
  const sel = screen === 'people' ? 'people' : '';
  let h = '';
  if (look === 'classic' || look === 'glass') {
    h += `<div class="topRes">${RES.map(([n, v]) => `<span>${ic(n, 20)}<b>${v}</b></span>`).join('')}</div>
      <div class="mission"><small>MISSION</small><b>Build a Rain Barrel</b><i>${li('chev', 16, 2.4)}</i></div>
      <div class="clock">${ic('leaf', 18)}<b>Day 1 · 08:00</b></div><div class="renown">${ic('star', 18)}<b>Renown</b><span>0</span></div>
      <div class="side"><button><b>1×</b></button><button>${li('target', 22)}</button></div>
      <div class="tip">Day 1. Build up the camp before night falls.</div>`;
    if (look === 'classic') h += `<div class="tabbar">${tabs.map(([k, t]) => `<div class="tab${k === sel ? ' on' : ''}${k === 'build' ? ' build' : ''}"><span>${li(k, 26)}</span><small>${t}</small></div>`).join('')}<i class="homebar"></i></div>`;
    else h += `<div class="tabcap">${tabs.filter(([k]) => k !== 'build').map(([k, t]) => `<div class="tab${k === sel ? ' on' : ''}"><span>${li(k, 24)}</span><small>${t}</small></div>`).join('')}</div><div class="buildBtn">${li('build', 28, 2.2)}</div><i class="homebar"></i>`;
  } else {   /* widgets: Dynamic Island, widgets, notifications, a dock */
    h += `<div class="island"><span class="zl">${ic('zombie', 20)}</span><b>Herd on Route 9</b><span class="zr">2 days</span></div>
      <div class="widgets"><div class="wg stock"><small>STOCK</small><div class="g">${RES.slice(0, 4).map(([n, v]) => `<span>${ic(n, 22)}<b>${v}</b></span>`).join('')}</div></div>
      <div class="wg mis"><small>MISSION</small><b>Build a Rain Barrel</b><div class="ringrow"><svg viewBox="0 0 36 36" width="40" height="40"><circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="4"/><circle cx="18" cy="18" r="14" fill="none" stroke="#c6ff4d" stroke-width="4" stroke-linecap="round" stroke-dasharray="${0.6 * 88} 88" transform="rotate(-90 18 18)"/></svg><span>Day 1<br><b>08:00</b></span></div></div></div>
      <div class="notif"><div class="nh">${ic('radio', 18)}<small>RADIO · DJ MOTH</small><em>now</em></div><b>Whoever's out there:</b> a herd is walking down Route 9. Two days, maybe less.</div>
      <div class="side"><button><b>1×</b></button><button>${li('target', 22)}</button></div>
      <div class="dock">${[['explore', 'map', '#3d8bfd,#1f5fd1'], ['people', 'people', '#4cc38a,#2a9466'], ['build', 'hammer', '#d4ff6a,#9fd12a'], ['town', 'home', '#ffb454,#e8862a'], ['more', 'menu', '#9aa3ad,#6b7480']].map(([k, n, g]) => `<div class="app${k === sel ? ' on' : ''}"><span style="background:linear-gradient(160deg,${g.split(',')[0]},${g.split(',')[1]})">${ic(n, 34)}</span><small>${tabs.find((t) => t[0] === k)[1]}</small></div>`).join('')}</div><i class="homebar"></i>`;
  }
  if (screen === 'people') {
    const total = PEOPLE.reduce((a, [, r]) => a + r.length, 0);
    const row = ([n, job, what, hp, col]) => look === 'widgets'
      ? `<div class="row"><span class="sq" style="background:${col}">${ic(JOBIC[job] || 'person', 22)}</span><div class="nm"><b>${n}</b><small>${job}</small></div><span class="val">${what}</span><i>${li('chev', 15, 2.4)}</i></div>`
      : `<div class="row"><span class="av" style="background:${col}">${n[0]}</span><div class="nm"><b>${n}</b><small>${job} · ${what}</small></div><span class="hp"><i style="width:${hp * 100}%;background:${hp < .5 ? '#ff6b4a' : hp < .8 ? '#f0b33a' : look === 'classic' ? '#34c759' : '#c6ff4d'}"></i></span><i class="ch">${li('chev', 15, 2.4)}</i></div>`;
    h += `<div class="sheet"><i class="grab"></i><div class="sh"><h1>People</h1><button class="done">${look === 'classic' ? 'Done' : li('x', 18, 2.4)}</button></div>
      <div class="searchf">${li('search', 17, 2.2)}<span>Search</span></div>
      <div class="seg"><span class="on">All ${total}</span><span>Fighters 2</span><span>Workers 5</span></div>
      ${PEOPLE.map(([t, rows]) => `<div class="sec">${t.toUpperCase()}</div><div class="grp">${rows.map(row).join('')}</div>`).join('')}</div>`;
  }
  root.innerHTML = h;
  let st = document.getElementById('iosStyle'); if (!st) { st = document.createElement('style'); st.id = 'iosStyle'; document.head.appendChild(st); }
  st.textContent = `
  .iosMock { position: fixed; inset: 0; z-index: 9000; pointer-events: none; font-family: Manrope, Nunito, sans-serif; -webkit-font-smoothing: antialiased; }
  .iosMock .homebar { position: absolute; left: 50%; bottom: 8px; width: 134px; height: 5px; margin-left: -67px; border-radius: 3px; background: rgba(0,0,0,.85); z-index: 5; }
  .ios_glass .homebar, .ios_widgets .homebar { background: rgba(255,255,255,.9); }
  /* ---------- A: classic iOS, light ---------- */
  .ios_classic { color: #111; }
  .ios_classic .topRes, .ios_classic .mission, .ios_classic .clock, .ios_classic .renown, .ios_classic .tip, .ios_classic .side button { background: rgba(250,250,252,.82); -webkit-backdrop-filter: blur(20px) saturate(180%); backdrop-filter: blur(20px) saturate(180%); box-shadow: 0 2px 10px rgba(0,0,0,.18); }
  .iosMock .topRes { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); display: flex; gap: 12px; padding: 7px 14px; border-radius: 999px; }
  .iosMock .topRes span { display: flex; align-items: center; gap: 4px; } .iosMock .topRes b { font-size: 15px; font-weight: 800; }
  .iosMock .mission { position: absolute; top: 60px; left: 12px; padding: 9px 34px 9px 14px; border-radius: 16px; } .iosMock .mission small { display: block; font-size: 10.5px; font-weight: 800; letter-spacing: .06em; opacity: .55; } .iosMock .mission b { font-size: 15px; font-weight: 800; } .iosMock .mission i { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); opacity: .45; display: flex; }
  .iosMock .clock, .iosMock .renown { position: absolute; right: 12px; display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 999px; } .iosMock .clock { top: 60px; } .iosMock .renown { top: 106px; }
  .iosMock .clock b, .iosMock .renown b { font-size: 14px; font-weight: 800; } .iosMock .renown span { font-weight: 800; font-size: 14px; margin-left: 6px; }
  .iosMock .side { position: absolute; right: 12px; top: 410px; display: flex; flex-direction: column; gap: 0; border-radius: 14px; overflow: hidden; }
  .iosMock .side button { width: 48px; height: 48px; border: 0; display: grid; place-items: center; color: inherit; font: inherit; } .iosMock .side b { font-size: 15px; font-weight: 800; }
  .ios_classic .side button + button { border-top: 1px solid rgba(60,60,67,.22); }
  .iosMock .tip { position: absolute; left: 50%; transform: translateX(-50%); bottom: 112px; white-space: nowrap; padding: 9px 16px; border-radius: 999px; font-size: 14px; font-weight: 700; }
  .ios_classic .tabbar { position: absolute; left: 0; right: 0; bottom: 0; height: 88px; display: flex; justify-content: space-around; padding-top: 7px; background: rgba(249,249,249,.9); -webkit-backdrop-filter: blur(20px) saturate(180%); backdrop-filter: blur(20px) saturate(180%); border-top: .5px solid rgba(60,60,67,.3); }
  .ios_classic .tab { display: flex; flex-direction: column; align-items: center; gap: 3px; width: 64px; color: #8e8e93; } .ios_classic .tab small { font-size: 10.5px; font-weight: 700; } .ios_classic .tab.on { color: #0a84ff; }
  .ios_classic .tab.build span { display: grid; place-items: center; width: 44px; height: 30px; border-radius: 9px; background: #0a84ff; color: #fff; } .ios_classic .tab.build { color: #0a84ff; }
  .ios_classic .sheet { position: absolute; left: 0; right: 0; top: 64px; bottom: 0; background: #f2f2f7; border-radius: 12px 12px 0 0; padding: 6px 16px 0; box-shadow: 0 -2px 20px rgba(0,0,0,.25); z-index: 4; }
  .iosMock .grab { display: block; width: 36px; height: 5px; border-radius: 3px; margin: 0 auto 8px; background: rgba(60,60,67,.3); }
  .iosMock .sh { display: flex; align-items: center; justify-content: space-between; } .iosMock h1 { margin: 2px 0 8px; font-size: 32px; font-weight: 800; letter-spacing: -.01em; }
  .ios_classic .done { border: 0; background: none; color: #0a84ff; font: 700 17px Manrope, sans-serif; }
  .iosMock .searchf { display: flex; align-items: center; gap: 6px; height: 36px; padding: 0 9px; border-radius: 10px; font-size: 16px; } .ios_classic .searchf { background: rgba(118,118,128,.12); color: #8e8e93; }
  .iosMock .seg { display: flex; margin: 10px 0 4px; padding: 2px; border-radius: 9px; } .iosMock .seg span { flex: 1; text-align: center; padding: 6px 0; font-size: 13px; font-weight: 700; border-radius: 7px; }
  .ios_classic .seg { background: rgba(118,118,128,.12); } .ios_classic .seg span.on { background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.15); }
  .iosMock .sec { margin: 16px 16px 6px; font-size: 13px; font-weight: 700; letter-spacing: .02em; } .ios_classic .sec { color: #6d6d72; }
  .iosMock .grp { border-radius: 12px; overflow: hidden; } .ios_classic .grp { background: #fff; }
  .iosMock .row { position: relative; display: flex; align-items: center; gap: 12px; min-height: 58px; padding: 0 14px; }
  .ios_classic .row + .row::before { content: ''; position: absolute; left: 66px; right: 0; top: 0; border-top: .5px solid rgba(60,60,67,.29); }
  .iosMock .av { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; color: #fff; font-weight: 800; font-size: 17px; flex: none; }
  .iosMock .nm { flex: 1; min-width: 0; } .iosMock .nm b { display: block; font-size: 16px; font-weight: 800; } .iosMock .nm small { display: block; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ios_classic .nm small { color: #8a8a8e; }
  .iosMock .hp { width: 38px; height: 6px; border-radius: 3px; flex: none; } .iosMock .hp i { display: block; height: 6px; border-radius: 3px; } .ios_classic .hp { background: rgba(118,118,128,.18); }
  .iosMock .ch, .iosMock .row > i { display: flex; opacity: .35; }
  /* ---------- B: Liquid Glass, dark ---------- */
  .ios_glass, .ios_widgets { color: #fff; }
  .ios_glass .topRes, .ios_glass .mission, .ios_glass .clock, .ios_glass .renown, .ios_glass .tip, .ios_glass .side button, .ios_glass .tabcap, .ios_glass .buildBtn {
    background: linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,.08)); -webkit-backdrop-filter: blur(10px) saturate(170%) brightness(1.05); backdrop-filter: blur(10px) saturate(170%) brightness(1.05);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.65), inset 0 -1px 1px rgba(255,255,255,.18), inset 1px 0 0 rgba(255,255,255,.2), inset -1px 0 0 rgba(255,255,255,.2), 0 8px 24px rgba(0,0,0,.28); text-shadow: 0 1px 2px rgba(0,0,0,.45); }
  .ios_glass .side { gap: 10px; overflow: visible; } .ios_glass .side button { border-radius: 50%; }
  .ios_glass .tabcap { position: absolute; left: 14px; bottom: 26px; right: 88px; height: 62px; border-radius: 999px; display: flex; justify-content: space-around; align-items: center; padding: 0 6px; }
  .ios_glass .tab { display: flex; flex-direction: column; align-items: center; gap: 2px; width: 25%; padding: 6px 0; border-radius: 999px; color: rgba(255,255,255,.92); } .ios_glass .tab small { font-size: 10.5px; font-weight: 800; }
  .ios_glass .tab.on { background: rgba(255,255,255,.2); box-shadow: inset 0 1px 0 rgba(255,255,255,.5); color: #c6ff4d; }
  .ios_glass .buildBtn { position: absolute; right: 14px; bottom: 26px; width: 62px; height: 62px; border-radius: 50%; display: grid; place-items: center; color: #1a2208; background: linear-gradient(180deg, rgba(214,255,120,.95), rgba(176,232,52,.85)); box-shadow: inset 0 1px 0 rgba(255,255,255,.9), inset 0 -2px 4px rgba(80,110,0,.35), 0 8px 24px rgba(0,0,0,.3); text-shadow: none; }
  .ios_glass .tip { bottom: 104px; }
  .ios_glass .sheet { position: absolute; left: 8px; right: 8px; top: 64px; bottom: 8px; border-radius: 38px; padding: 8px 16px 0; z-index: 4; background: linear-gradient(180deg, rgba(40,48,54,.62), rgba(24,30,34,.72)); -webkit-backdrop-filter: blur(22px) saturate(160%); backdrop-filter: blur(22px) saturate(160%); box-shadow: inset 0 1px 0 rgba(255,255,255,.45), inset 0 0 0 1px rgba(255,255,255,.12), 0 20px 50px rgba(0,0,0,.5); }
  .ios_glass .grab, .ios_widgets .grab { background: rgba(255,255,255,.35); }
  .ios_glass .done, .ios_widgets .done { width: 36px; height: 36px; border-radius: 50%; border: 0; display: grid; place-items: center; color: #fff; background: rgba(255,255,255,.14); box-shadow: inset 0 1px 0 rgba(255,255,255,.4); }
  .ios_glass .searchf { background: rgba(255,255,255,.1); color: rgba(255,255,255,.6); border-radius: 999px; box-shadow: inset 0 1px 0 rgba(255,255,255,.18); }
  .ios_glass .seg { background: rgba(255,255,255,.08); border-radius: 999px; box-shadow: inset 0 1px 0 rgba(255,255,255,.15); } .ios_glass .seg span { border-radius: 999px; color: rgba(255,255,255,.8); } .ios_glass .seg span.on { background: rgba(255,255,255,.22); color: #fff; box-shadow: inset 0 1px 0 rgba(255,255,255,.5); }
  .ios_glass .sec, .ios_widgets .sec { color: rgba(255,255,255,.55); }
  .ios_glass .grp { background: rgba(255,255,255,.07); border-radius: 24px; box-shadow: inset 0 1px 0 rgba(255,255,255,.12); }
  .ios_glass .row + .row::before, .ios_widgets .row + .row::before { content: ''; position: absolute; left: 66px; right: 0; top: 0; border-top: .5px solid rgba(255,255,255,.12); }
  .ios_glass .nm small, .ios_widgets .nm small { color: rgba(255,255,255,.6); } .ios_glass .hp { background: rgba(255,255,255,.14); }
  /* ---------- C: widgets, Dynamic Island, a dock ---------- */
  .ios_widgets .island { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); width: 250px; height: 40px; border-radius: 22px; background: #000; display: flex; align-items: center; gap: 8px; padding: 0 14px 0 8px; box-shadow: 0 4px 14px rgba(0,0,0,.35); }
  .ios_widgets .island .zl { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: rgba(255,122,89,.25); } .ios_widgets .island b { flex: 1; font-size: 14px; font-weight: 800; } .ios_widgets .island .zr { color: #ff9a6a; font-weight: 800; font-size: 14px; }
  .ios_widgets .widgets { position: absolute; top: 62px; left: 12px; right: 12px; display: flex; gap: 10px; }
  .ios_widgets .wg, .ios_widgets .notif, .ios_widgets .side button, .ios_widgets .dock { background: rgba(28,32,36,.55); -webkit-backdrop-filter: blur(24px) saturate(180%); backdrop-filter: blur(24px) saturate(180%); box-shadow: inset 0 0 0 .5px rgba(255,255,255,.18), 0 6px 18px rgba(0,0,0,.25); }
  .ios_widgets .wg { flex: 1; height: 150px; border-radius: 24px; padding: 12px 14px; } .ios_widgets .wg small { display: block; font-size: 10.5px; font-weight: 800; letter-spacing: .08em; opacity: .6; margin-bottom: 8px; }
  .ios_widgets .stock .g { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 6px; } .ios_widgets .stock .g span { display: flex; align-items: center; gap: 6px; } .ios_widgets .stock b { font-size: 20px; font-weight: 800; }
  .ios_widgets .mis > b { display: block; font-size: 16px; font-weight: 800; line-height: 1.2; } .ios_widgets .ringrow { display: flex; align-items: center; gap: 10px; margin-top: 14px; } .ios_widgets .ringrow span { font-size: 12px; opacity: .8; line-height: 1.25; } .ios_widgets .ringrow span b { font-size: 16px; opacity: 1; }
  .ios_widgets .notif { position: absolute; top: 224px; left: 12px; right: 12px; border-radius: 22px; padding: 11px 14px 12px; font-size: 14px; line-height: 1.35; }
  .ios_widgets .nh { display: flex; align-items: center; gap: 7px; margin-bottom: 4px; } .ios_widgets .nh small { flex: 1; font-size: 11.5px; font-weight: 800; letter-spacing: .04em; opacity: .65; } .ios_widgets .nh em { font-style: normal; font-size: 12px; opacity: .55; }
  .ios_widgets .side { gap: 10px; overflow: visible; top: 470px; } .ios_widgets .side button { border-radius: 50%; }
  .ios_widgets .dock { position: absolute; left: 10px; right: 10px; bottom: 22px; height: 98px; border-radius: 32px; display: flex; justify-content: space-around; align-items: center; padding: 0 6px; }
  .ios_widgets .app { display: flex; flex-direction: column; align-items: center; gap: 4px; } .ios_widgets .app span { display: grid; place-items: center; width: 58px; height: 58px; border-radius: 15px; box-shadow: inset 0 1px 0 rgba(255,255,255,.35), 0 3px 8px rgba(0,0,0,.3); }
  .ios_widgets .app small { font-size: 10.5px; font-weight: 700; opacity: .9; } .ios_widgets .app.on small { color: #c6ff4d; }
  .ios_widgets .sheet { position: absolute; left: 0; right: 0; top: 64px; bottom: 0; border-radius: 14px 14px 0 0; padding: 6px 16px 0; z-index: 4; background: #1c1c1e; }
  .ios_widgets .searchf { background: rgba(118,118,128,.24); color: rgba(235,235,245,.6); } .ios_widgets .seg { background: rgba(118,118,128,.24); } .ios_widgets .seg span.on { background: #636366; }
  .ios_widgets .grp { background: #2c2c2e; }
  .ios_widgets .sq { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 9px; flex: none; }
  .ios_widgets .row + .row::before { left: 60px; } .ios_widgets .val { font-size: 13.5px; color: rgba(235,235,245,.6); max-width: 120px; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  `;
};

(async () => {
  const fs = require('fs'); const out = require('path').join(__dirname, '../../runs/ui_samples'); fs.mkdirSync(out, { recursive: true });
  const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(2500); await Q.clearCards(p); await p.waitForTimeout(500); await Q.clearCards(p);
  for (const look of ['classic', 'glass', 'widgets']) for (const screen of ['town', 'people']) {
    await p.evaluate(MOCK, { look, screen }); await p.waitForTimeout(400);
    const f = `${out}/ios_${look}_${screen}.png`; await p.screenshot({ path: f }); console.log('shot', f);
  }
  await b.close();
})();
