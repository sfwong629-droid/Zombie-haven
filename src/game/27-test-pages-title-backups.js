/* ---------------- 3D.32 Zombie test page (?zoo): every zombie type lined up on the map, frozen, with name tags and a list.
   Since 3D.183 it shows one at a time (tap a card) with Stand / Walk / Run / Attack played on the spot; "Show all" is the line-up. Nothing is saved. */
const ZOO_ROWS = [['walker', 'crawler', 'runner', 'bloated', 'spitter', 'thrower', 'brute', 'sporehead', 'raider'], ['lasher', 'rotbomb', 'stalker', 'screamer', 'riot', 'burnt', 'dog', 'alpha', 'boss']], ZOO_GRID = [['lasher', 'rotbomb', 'stalker'], ['screamer', 'riot', 'burnt'], ['dog', 'alpha', 'boss'], ['walker', 'crawler', 'runner', 'bloated'], ['spitter', 'brute', 'sporehead', 'raider']];
/* 3D.182 the owner's 11 new models (16 Nov): looks only. Each stands in as a Walker (the Stag as a Dog) wearing the new model (z.mk); what they do in the game is not decided. */
const ZOO_BOSS = ['bloater', 'butcher', 'gatling'];   /* 3D.185 owner: the Bloater Queen, the Butcher and the Gatling Boss were missing from the page (the Mutant and the Stalker are in ZOO_ROWS) */
const zooBoss = (bk, x, y) => ({ type: 'boss', bk, boss: true, pw: 1, w: tc(x, y), hp: 260, max: 260, cool: 40, phase: 0, mode: 'zoo', stateTicks: 0, target: null, path: null, zoo: true });
const ZOO_NEW = [['digger', 'Digger'], ['lineman', 'Lineman'], ['splitter', 'Splitter'], ['stag', 'Stag'], ['bilespewer', 'Bile Spewer'], ['hazmat', 'Hazmat'], ['leaper', 'Leaper'], ['listener', 'Listener'], ['nurse', 'Nurse'], ['soldier_m', 'Soldier'], ['soldier_f', 'Soldier (f)']];
function zooLine() {
  S.z = []; ZOO_GRID.forEach((row, r) => row.forEach((t, i) => {
    const S0 = 11 + r * 2.1, D = -3 + (i - (row.length - 1) / 2) * 2.2, x = (S0 + D) / 2 + OFF, y = (S0 - D) / 2 + OFF;   /* a compact grid that runs across the screen (iso), north of the camp */
    if (t === 'raider') { const d = zombieTypes.raider; S.z.push({ type: 'raider', human: true, w: tc(x, y), home: tc(x, y), pw: 1, hp: d.hp, max: d.hp, cool: 40, phase: rnd() * 100, mode: 'zoo', stateTicks: 0, target: null, path: null, zoo: true }); return; }
    if (t === 'stalker') { S.z.push({ type: 'boss', bk: 'stalker', boss: true, pw: 1, w: tc(x, y), hp: 182, max: 182, cool: 40, phase: 0, mode: 'zoo', stateTicks: 0, target: null, path: null, zoo: true }); return; }   /* 3D.80 */
    if (t === 'boss') { S.z.push({ type: 'boss', boss: true, pw: 1, w: tc(x, y), hp: 260, max: 260, cool: 40, phase: 0, mode: 'zoo', stateTicks: 0, target: null, path: null, zoo: true }); return; }
    spawn(x, y, t); const z = S.z[S.z.length - 1]; z.zoo = true; z.mode = 'zoo'; z.hp = z.max;
  }));
  ZOO_NEW.forEach(([mk, name], n) => { const r = -1 - Math.floor(n / 4), row = Math.min(4, ZOO_NEW.length - Math.floor(n / 4) * 4), i = n % 4, S0 = 11 + r * 2.1, D = -3 + (i - (row - 1) / 2) * 2.2, x = (S0 + D) / 2 + OFF, y = (S0 - D) / 2 + OFF;   /* three more rows behind the others */
    for (const [tx, ty] of [...TREE_SPOTS, ...ROCK_SPOTS]) if (Math.abs(tx - x) < 1.6 && Math.abs(ty - y) < 1.6) { const t = treeNode(tx, ty); if (t.left) { t.left = 0; t.regrow = 1e9; if (window.ZH3D && ZH3D.dirty) ZH3D.dirty(); } }   /* no tree or rock in front of a new model */
    spawn(x, y, mk === 'stag' ? 'dog' : 'walker'); const z = S.z[S.z.length - 1]; z.zoo = true; z.mode = 'zoo'; z.hp = z.max; z.mk = mk; z.zn = name; });
  ZOO_BOSS.forEach((bk, i) => { const S0 = 11 - 4 * 2.1, D = -3 + (i - 1) * 3, x = (S0 + D) / 2 + OFF, y = (S0 - D) / 2 + OFF;   /* the three bosses stand behind everyone, wider apart */
    for (const [tx, ty] of [...TREE_SPOTS, ...ROCK_SPOTS]) if (Math.abs(tx - x) < 2 && Math.abs(ty - y) < 2) { const t = treeNode(tx, ty); if (t.left) { t.left = 0; t.regrow = 1e9; if (window.ZH3D && ZH3D.dirty) ZH3D.dirty(); } }
    S.z.push(zooBoss(bk, x, y)); });
}
/* ---------------- 3D.151 Gear test page (?gear): every weapon, armour, helmet and accessory in ITEMS, worn by a survivor.
   It reads ITEMS, so a new item shows up here by itself. Never saves. */
function gearGallery() {
  if ($('gearPanel')) return; const sp0 = simSpeed; simSpeed = 0; const a3 = (id) => !!(window.ZH3D && ZH3D.armor3d && ZH3D.armor3d(id));
  const TABS = [['armor', 'Armour'], ['head', 'Helmets'], ['weapon', 'Weapons'], ['acc', 'Accessories']], by = (sl) => Object.keys(ITEMS).filter((k) => ITEMS[k].slot === sl).sort((a, b) => (a3(b) ? 1 : 0) - (a3(a) ? 1 : 0) || (ITEMS[a].cost || 0) - (ITEMS[b].cost || 0));
  const fem = (q) => { try { return !!(window.ZHChars && ZHChars.look(q).sex === 'f'); } catch (e) { return false; } }, M = S.sv.find((q) => !fem(q)) || S.sv[0], F = S.sv.find((q) => fem(q)) || S.sv[1] || M;
  const fig = (s, id, pose) => { const it = ITEMS[id], old = s.eq; s.eq = { weapon: null, armor: null, head: null, acc: null, [it.slot]: id }; let u = null; try { u = ZH3D.figure(s, pose); } catch (e) { /* a broken item must not break the page */ } s.eq = old; return u; };
  const d = document.createElement('div'); d.id = 'gearPanel'; d.className = 'gearPanel'; let tab = 'armor', job = 0;
  d.innerHTML = `<div class="gh"><b>Gear test</b><span class="sm" id="gearN"></span><button class="act" id="gearExit">Exit</button></div><div class="gtabs">${TABS.map(([k, n]) => `<button class="gt" data-k="${k}">${n} <small>${by(k).length}</small></button>`).join('')}</div><div class="gbig" id="gearBig"></div><div class="ggrid" id="gearGrid"></div>`;
  document.body.appendChild(d);
  const big = (id) => { const it = ITEMS[id], poses = it.slot === 'weapon' ? [[M, 'ready'], [F, 'ready']] : [[M, 'ready'], [M, 'wave'], [M, 'cheer'], [F, 'ready'], [F, 'cheer']];
    $('gearBig').innerHTML = `<div class="gbf">${poses.map(([s, p]) => { const u = fig(s, id, p); return u ? `<img src="${u}" alt="">` : ''; }).join('')}</div><div class="gbt"><b>${esc(it.name)}</b> ${it.slot === 'armor' ? (a3(id) ? '<i class="g3">3D model</i>' : '<i class="g0">recolour only</i>') : ''}<br>${esc(itemText(it))} · ${it.cost} scrap${iQuip(id)}<br><span class="sm">id: ${id}${it.slot === 'weapon' ? ' · model: ' + (ZH3D.wModel(id) || 'bat') : it.shape ? ' · shape: ' + it.shape : ''}</span></div>`; $('gearBig').scrollIntoView({ block: 'nearest' }); };
  const show = (k) => { tab = k; const my = ++job, ids = by(k); d.querySelectorAll('.gt').forEach((b) => b.classList.toggle('on', b.dataset.k === k)); $('gearN').textContent = `${Object.keys(ITEMS).length} items · tap one to see it in every pose`; $('gearBig').innerHTML = '';
    $('gearGrid').innerHTML = ids.map((id) => `<button class="gc" data-id="${id}"><div class="gi" id="gi_${id}"></div><b>${esc(ITEMS[id].name)}</b>${ITEMS[id].slot === 'armor' && a3(id) ? '<i class="g3">3D</i>' : ''}<small>${esc(itemText(ITEMS[id]))}</small></button>`).join('');
    d.querySelectorAll('.gc').forEach((b) => { b.onclick = () => big(b.dataset.id); });
    let i = 0; const step = () => { if (my !== job) return; for (let n = 0; n < 2 && i < ids.length; n++, i++) { const u = fig(M, ids[i], 'ready'), el = $('gi_' + ids[i]); if (u && el) el.innerHTML = `<img src="${u}" alt="">`; } if (i < ids.length) setTimeout(step, 30); }; step(); };   /* two pictures per frame, so the page stays smooth */
  d.querySelectorAll('.gt').forEach((b) => { b.onclick = () => show(b.dataset.k); });
  $('gearExit').textContent = 'Back to the map'; $('gearExit').onclick = () => { job++; clearInterval(wait); d.remove(); simSpeed = sp0 || 1; };
  $('gearGrid').innerHTML = '<div class="sm" style="padding:20px">Loading the models…</div>';
  const wait = setInterval(() => { if (window.ZH3D && ZH3D.armorsReady() && ZH3D.figure(M, 'ready')) { clearInterval(wait); d.querySelectorAll('.gt small').forEach((e, i) => { e.textContent = by(TABS[i][0]).length; }); show('armor'); } }, 300);
}
/* 3D.152 the gear test on the map: one dummy survivor per item, lined up north of the camp, with a few Walkers to fight.
   Tabs pick the slot; the line-up reads ITEMS, so new gear appears by itself. Never saves. */
const GEAR_TABS = [['armor', 'Armour'], ['head', 'Helmets'], ['weapon', 'Weapons'], ['acc', 'Accessories']];
let gearTab = 'armor';
function gearLine() {
  const a3 = (id) => !!(window.ZH3D && ZH3D.armor3d && ZH3D.armor3d(id)), ids = Object.keys(ITEMS).filter((k) => ITEMS[k].slot === gearTab).sort((a, b) => (a3(b) ? 1 : 0) - (a3(a) ? 1 : 0) || (ITEMS[a].cost || 0) - (ITEMS[b].cost || 0));
  const per = 5, rows = Math.ceil(ids.length / per), S00 = 17.5 - rows * 2.5, spot = (r, i, n) => { const S0 = S00 + r * 2.5, D = -3 + (i - (n - 1) / 2) * 2; return [(S0 + D) / 2 + OFF, (S0 - D) / 2 + OFF]; };   /* four across so the name tags don't overlap; the last row sits just north of the camp */
  S.sv = []; S.z = []; S.inv = {}; S.mat = 0;
  { const pts = []; for (let r = 0; r <= rows + 1; r++) for (let i = 0; i < per; i++) pts.push(spot(r, i, per)); for (const [tx, ty] of [...TREE_SPOTS, ...ROCK_SPOTS]) if (pts.some(([x, y]) => Math.abs(tx - x) < 1.6 && Math.abs(ty - y) < 1.6)) { const n = treeNode(tx, ty); n.left = 0; n.regrow = 1e9; } if (window.ZH3D && ZH3D.dirty) ZH3D.dirty(); }   /* 3D.152 clear the trees and rocks off the line-up so nobody stands inside one */
  ids.forEach((id, k) => { const r = Math.floor(k / per), n = Math.min(per, ids.length - r * per), [x, y] = spot(r, k % per, n), q = mk(FIRST_NAMES[(k * 7 + 3) % FIRST_NAMES.length], 'Guard', 3, x, y, k);
    q.eq = { weapon: null, armor: null, head: null, acc: null, [gearTab]: id }; q.dummy = true; q.tag = ITEMS[id].name; q.gid = id; q.resident = true; q.max = 400; q.hp = 400; S.sv.push(q); });
  for (let i = 0; i < 4; i++) { const [x, y] = spot(rows + .6, i, 4); spawn(x, y, 'walker'); const z = S.z[S.z.length - 1]; z.zoo = true; z.mode = 'zoo'; z.hp = z.max; }   /* four Walkers in front of the line-up */
  if (typeof autoStaff === 'function') try { autoStaff(); } catch (e) { /* no posts for dummies */ }
  { const Sm = S00 + Math.max(0, rows - 1.6) * 2.5, D = -3; centerOn((Sm + D) / 2 + OFF, (Sm - D) / 2 + OFF, Math.max(.85, Math.min(1.2, VW / 360))); }   /* open on the front rows and the Walkers; drag up for the rest */
  const row = $('gearRow'); if (row) { row.innerHTML = ids.map((id) => `<button class="zc" data-id="${id}"><b>${esc(ITEMS[id].name)}</b>${gearTab === 'armor' && a3(id) ? '<i>3D</i>' : ''}<small>${esc(itemText(ITEMS[id])) || '—'}</small></button>`).join('');
    row.querySelectorAll('.zc').forEach((b) => { b.onclick = () => { const id = b.dataset.id, q = S.sv.find((v) => v.gid === id), it = ITEMS[id]; if (q) centerOn(q.w.x, q.w.y, 2.4); $('gearInfo').innerHTML = `<b>${esc(it.name)}</b> · ${esc(itemText(it))} · ${it.cost} scrap${iQuip(id)}`; }; }); }
  document.querySelectorAll('#gearMap .gt').forEach((b) => b.classList.toggle('on', b.dataset.k === gearTab));
  if ($('gearInfo')) $('gearInfo').innerHTML = 'Each dummy wears one item, with its name under the feet. Tap a card to fly to it. Four Walkers stand in front.';
}
function gearStart() {
  S.mission = null; simSpeed = 1;
  const d = document.createElement('div'); d.id = 'gearMap'; d.className = 'zooPanel';
  d.innerHTML = `<div class="zh"><b>Gear test</b><span class="sm">${Object.keys(ITEMS).length} items</span><button class="act" id="gmHide" style="margin-left:auto;min-height:30px;padding:0 12px;font-size:12px">Hide</button></div><div id="gmBody"><div class="gtabs">${GEAR_TABS.map(([k, n]) => `<button class="gt" data-k="${k}">${n}</button>`).join('')}</div><div class="zrow" id="gearRow"></div><div class="zinfo" id="gearInfo"></div><div class="zbtns"><button class="act" id="gmExit">Exit</button><button class="act" id="gmLine">Line up</button><button class="act" id="gmWalk">Walk about</button><button class="act go" id="gmGo">Walkers attack</button></div><div class="zbtns" style="margin-top:6px"><button class="act" id="gmGal">Open the picture gallery</button></div></div>`;
  $('world').appendChild(d);
  d.querySelectorAll('.gt').forEach((b) => { b.onclick = () => { gearTab = b.dataset.k; gearLine(); }; });
  $('gmExit').onclick = () => { const q = new URLSearchParams(location.search); q.delete('gear'); location.search = q.toString(); };
  $('gmLine').onclick = gearLine; $('gmGal').onclick = gearGallery; $('gmHide').onclick = () => { const b = $('gmBody'), h = !b.hidden; b.hidden = h; $('gmHide').textContent = h ? 'Show' : 'Hide'; };   /* fold the panel away to see the whole line-up */
  $('gmWalk').onclick = () => { for (const q of S.sv) if (q.dummy) { q.go = true; q.mode = 'free'; q.stateTicks = 0; } $('gearInfo').innerHTML = 'The dummies are living in the town now: walking, working and resting. "Line up" brings them back.'; };
  $('gmGo').onclick = () => { for (const q of S.sv) if (q.dummy) { q.go = true; q.mode = 'free'; q.stateTicks = 0; } const n = S.z.filter((z) => z.zoo).length; for (const z of S.z) { z.zoo = false; z.mode = 'appear'; z.stateTicks = 0; z.siege = true; } if (!n) for (let i = 0; i < 4; i++) { const q = S.sv[Math.floor(rnd() * S.sv.length)]; if (q) spawn(q.w.x + 3 + i * .6, q.w.y + 3, 'walker'); } $('gearInfo').innerHTML = 'The Walkers are loose and the dummies fight back. Tap again for four more Walkers.'; };
  gearLine(); const wait = setInterval(() => { if (window.ZH3D && ZH3D.armorsReady && ZH3D.armorsReady()) { clearInterval(wait); gearLine(); } }, 400);   /* line up again once every model is in, so the 3D tags and order are right */
}
/* 3D.183 owner: "too many of them in that map and when I let them attack, I can't follow them". The page now shows ONE zombie at a time, big,
   turning on the spot, with a survivor beside it for size (3D.184), and four buttons play it standing, walking, running or attacking in place (z.show; js/render3d.js draws it and the
   simulation still sees a frozen 'zoo' zombie). "Show all" brings the old line-up back; the buttons then work on every zombie in it. */
let zooOne = null, zooAct = 'stand', zooTurn = true;
const ZOO_RUNS = (t) => ['runner', 'dog', 'stag', 'lasher', 'stalker'].includes(t);   /* the kinds that run in the game */
const zooIs = (q, t) => ZOO_NEW.some(([mk]) => mk === t) ? q.mk === t : !q.mk && (t === 'boss' ? q.type === 'boss' && !q.bk : q.type === t || q.bk === t);
const zooName = (t) => { const n = ZOO_NEW.find(([mk]) => mk === t); return n ? n[1] : ZOO_BOSS.includes(t) ? BOSS_KINDS[t].name + ' (boss)' : t === 'stalker' ? 'Stalker (boss)' : (zombieTypes[t] && zombieTypes[t].name) || 'Mutant Boss'; };
function zooApply() {   /* hand the chosen action to every zombie on show, and light the buttons */
  for (const z of S.z) if (z.zoo) z.show = { act: zooAct, turn: zooTurn, yaw: z.show ? z.show.yaw : null };
  const d = $('zooPanel'); if (!d) return;
  d.querySelectorAll('.zact .act[data-a]').forEach((b) => b.classList.toggle('on', b.dataset.a === zooAct)); $('zooTurn').classList.toggle('on', zooTurn); $('zooTurn').textContent = zooTurn ? 'Turning' : 'Turn';
  d.querySelectorAll('.zc').forEach((b) => b.classList.toggle('on', b.dataset.t === zooOne)); $('zooAll').textContent = zooOne ? 'Show all' : 'One at a time'; $('zooGo').textContent = zooOne ? 'Send it to town' : 'Let them attack';
}
function zooInfo(t) {
  const isNew = ZOO_NEW.some(([mk]) => mk === t), bk = ZOO_BOSS.includes(t) ? BOSS_KINDS[t] : null, def = zombieTypes[t] || (t === 'stalker' ? { hp: 182, atk: 15, chase: .009, desc: BOSS_KINDS.stalker.line } : bk ? { hp: Math.round(260 * bk.hp), atk: Math.round(14 * bk.atk), chase: .009 * bk.spd, desc: t === 'gatling' ? 'The one zombie with a weapon: the gun is part of his arm.' : 'One of the bosses that can come instead of the Mutant.' } : null);
  const what = isNew ? `new model, looks only<br>${t === 'stag' ? 'Moves like a Dog for now.' : 'Moves like a Walker for now.'} What it does in the game is not decided.`
    : `HP ${(def && def.hp) || 260} · ATK ${(def && def.atk) || 14} · speed ${def ? Math.round(def.chase * 1000) : 9}<br>${esc((def && def.desc) || (t === 'boss' ? 'The big mutant that comes every few nights.' : t === 'raider' ? 'Human enemy: steals from your stockpile and runs.' : 'A regular in every wave.'))}`;
  $('zooInfo').innerHTML = `<b>${esc(zooName(t))}</b> · ${what}${zooAct === 'run' && !ZOO_RUNS(t) ? '<br>This kind never runs in the game, so it keeps walking.' : ''}`;
}
function zooRef(x, y) {   /* 3D.184 owner: a survivor beside the zombie, for size. He stands still, faces the camera, and nobody fights */
  S.sv = S.sv.filter((q) => !q.zooRef); if (x == null) return;
  const q = mk('Sam', 'Guard', 1, x, y, 0); q.eq = { weapon: null, armor: null, head: null, acc: null }; q.dummy = true; q.zooRef = true; q.tag = 'Survivor'; q.resident = true; q.faceW = { x: q.w.x + 5, y: q.w.y + 5 }; S.sv.push(q);
}
function zooShow(t) {   /* one zombie alone, in the open, close up */
  for (const q of S.z) q.escaped = true;   /* the one before leaves at once, with no death fall */
  zooOne = t; zooLine(); let z = S.z.find((q) => zooIs(q, t)); S.z = [];
  if (!z && ZOO_BOSS.includes(t)) z = zooBoss(t, 0, 0);
  if (!z && zombieTypes[t]) { spawn(0, 0, t); z = S.z[S.z.length - 1]; z.zoo = true; z.mode = 'zoo'; z.hp = z.max; }   /* a kind the line-up has no room for (the Thrower) */
  S.z = z ? [z] : [];
  const S0 = 11 - 2 * 2.1, x = (S0 - 3) / 2 + OFF, y = (S0 + 3) / 2 + OFF; if (z) { z.w = tc(x, y); if (z.home) z.home = tc(x, y); }   /* open ground north of the town, away from the fence */
  for (const [tx, ty] of [...TREE_SPOTS, ...ROCK_SPOTS]) if (Math.abs(tx - x) < 3 && Math.abs(ty - y) < 3) { const n = treeNode(tx, ty); if (n.left) { n.left = 0; n.regrow = 1e9; if (window.ZH3D && ZH3D.dirty) ZH3D.dirty(); } }
  zooRef(x + .5, y - .5);
  centerOn(x + .75, y + .25, ZOOM_MAX); cam.y -= VH * .09; clampCam(); zooApply(); zooInfo(t);   /* the panel covers the lower half: the zombie stands in the upper one */
}
function zooAll() { for (const q of S.z) q.escaped = true; zooRef(); zooOne = null; zooLine(); centerOn(6.3 + OFF, 9.3 + OFF, Math.max(.95, Math.min(1.3, VW / 330))); zooApply(); $('zooInfo').innerHTML = 'Everyone lined up. The buttons work on all of them at once. Tap a card to see one alone.'; }
/* ---------------- 3D.190 Survivor test page (?svt): one survivor in the open, turning, playing whichever animation is tapped (owner, 17 Nov:
   "like the zombie test but for the survivor, where I can click through the animations"). Looks only: nothing here changes a real game. */
const SVT_GROUPS = [
  ['Moving', ['idle', 'walk', 'jog', 'run', 'walk_f', 'limp_walk', 'carry_idle', 'carry_walk', 'rescue', 'pickup']],
  ['Everyday', ['talk', 'wave', 'cheer', 'sit', 'sit_f', 'eat', 'sleep']],
  ['Work', ['work_chop', 'work_hammer', 'work_dig', 'work_tinker', 'work_barricade']],
  ['Melee', ['melee_hold_idle', 'melee_hold_walk', 'melee_hold_jog', 'punch', 'shove', 'melee_swing_a', 'melee_swing_b', 'melee_swing_c', 'melee_combo_1', 'melee_combo_2', 'melee_combo_3', 'melee_combo2h_1', 'melee_combo2h_2', 'melee_combo2h_3']],
  ['Two-handed', ['melee2h_hold_idle', 'melee2h_swing_a', 'melee2h_swing_b', 'melee2h_swing_c', 'spear_hold_idle', 'spear_stab']],
  ['Guns', ['gun_hold_idle', 'gun_hold_walk', 'gun_hold_jog', 'gun_fire', 'pistol_fire', 'gun_reload']],
  ['Hurt', ['hurt', 'melee_hold_hurt', 'gun_hold_hurt', 'grabbed', 'knockdown', 'collapse']]];
const SVT_NAME = { idle: 'Stand', walk: 'Walk', jog: 'Jog', run: 'Run', walk_f: 'Walk (woman, calm)', limp_walk: 'Limp', carry_idle: 'Carry, standing', carry_walk: 'Carry, walking', rescue: 'Pushing the rescue cart', pickup: 'Pick up',
  talk: 'Talk', wave: 'Wave', cheer: 'Cheer', sit: 'Sit', sit_f: 'Sit (woman)', eat: 'Eat', sleep: 'Sleep', work_chop: 'Chop', work_hammer: 'Hammer', work_dig: 'Dig', work_tinker: 'Tinker', work_barricade: 'Board up',
  melee_hold_idle: 'Melee stance', melee_hold_walk: 'Walk with melee weapon', melee_hold_jog: 'Jog with melee weapon', gun_hold_jog: 'Jog with gun', punch: 'Punch', shove: 'Shove', melee_swing_a: 'Swing 1', melee_swing_b: 'Swing 2', melee_swing_c: 'Swing 3 (rising)', melee2h_hold_idle: 'Two-hand stance', melee2h_swing_a: 'Two-hand A (level)', melee2h_swing_b: 'Two-hand B (backhand)', melee2h_swing_c: 'Two-hand C (overhead slam)', spear_hold_idle: 'Spear stance', spear_stab: 'Spear stab',
  melee_combo_1: 'Combo 1', melee_combo_2: 'Combo 2', melee_combo_3: 'Combo 3', melee_combo2h_1: 'Two-hand combo 1', melee_combo2h_2: 'Two-hand combo 2', melee_combo2h_3: 'Two-hand combo 3',
  gun_hold_idle: 'Gun stance', gun_hold_walk: 'Walk with gun', gun_fire: 'Fire rifle', pistol_fire: 'Fire pistol', gun_reload: 'Reload', hurt: 'Hurt', melee_hold_hurt: 'Hurt (melee)', gun_hold_hurt: 'Hurt (gun)', grabbed: 'Grabbed', knockdown: 'Knocked down', collapse: 'Collapse' };
const SVT_REAL = new Set(['run', 'carry_idle', 'talk', 'wave', 'melee_hold_idle', 'gun_hold_idle', 'gun_reload', 'idle', 'walk', 'walk_f', 'jog', 'carry_walk', 'melee_hold_walk', 'melee_hold_jog', 'gun_hold_walk', 'gun_hold_jog']);   /* the clips that are already recordings of real people; add to this as they are replaced (W63) */
const SVT_PART = new Set(['carry_idle', 'talk', 'wave', 'melee_hold_idle', 'gun_hold_idle', 'gun_reload']);   /* recorded body, old arms */
const SVT_TWO = new Set(['melee2h_swing_a', 'melee2h_swing_b', 'melee2h_swing_c', 'spear_stab']);   /* 3D.207 the body from a recording of a real person, both hands on the weapon; 3D.208: A a baseball swing, B the same swing mirrored (the backhand), C (3D.209) a real overhead chop, arms and weapon both from the recording, the stab a boxer's lunge */
const SVT_FIST = new Set(['punch', 'shove', 'hurt', 'melee_hold_hurt', 'gun_hold_hurt', 'grabbed', 'knockdown', 'collapse', 'work_chop', 'work_hammer', 'work_dig', 'work_tinker', 'work_barricade', 'cheer', 'pickup', 'limp_walk', 'rescue', 'sit', 'sit_f', 'eat', 'sleep']);   /* 3D.243 the everyday group too */   /* 3D.242 the work group too */   /* 3D.239 the hurt group too */   /* 3D.237 the old hand-made punch and shove, corrected (owner, 19 Nov: the recorded ones of 3D.236 were not good): feet on the ground; the shove's arms come in, then push out straight */
const SVT_SWING = new Set(['melee_swing_a', 'melee_swing_b', 'melee_swing_c']);   /* 3D.205: Swing 4 (overhead) taken out of the one-handed set (owner, 18 Nov); its clip stays in the model file, unused, for the two-handed set (W84). Swing 3 is a new rising cut. */   /* 3D.201 the old hand-made swings, corrected by tools/art/b3d/fixswing.py (owner, 18 Nov: the recorded swings of 3D.198 looked weak) */
let svtClip = 'walk', svtTurn = true, svtFem = false, svtList = [];
const svtWho = () => S.sv.find((q) => q.svt);
function svtPut() {   /* (re)make the one survivor: a new person object, so the renderer builds the right body */
  const old = svtWho(), yaw = old && old.show ? old.show.yaw : null; S.sv = S.sv.filter((q) => !q.svt); S.z = [];
  const S0 = 11 - 2 * 2.1, x = (S0 - 3) / 2 + OFF + .25, y = (S0 + 3) / 2 + OFF - .25, q = mk(svtFem ? 'Maya' : 'Sam', 'Civilian', 1, x, y, 0);   /* the Zombie test's open spot north of the town */
  for (const [tx, ty] of [...TREE_SPOTS, ...ROCK_SPOTS]) if (Math.abs(tx - x) < 3 && Math.abs(ty - y) < 3) { const n = treeNode(tx, ty); if (n.left) { n.left = 0; n.regrow = 1e9; if (window.ZH3D && ZH3D.dirty) ZH3D.dirty(); } }
  q.look = { sex: svtFem ? 'f' : 'm', skin: 1, hair: 2 }; q.eq = { weapon: null, armor: null, head: null, acc: null }; q.dummy = true; q.svt = true; q.resident = true; q.tag = svtFem ? 'Woman' : 'Man';
  q.show = { clip: svtClip, turn: svtTurn, yaw }; S.sv.push(q); svtAim();
}
/* 3D.200 the survivor stands in the middle of the part of the screen the panel leaves free (owner, 18 Nov: on the phone the menu covered the whole screen and the character could not be seen) */
let svtAimN = 0;
function svtAim() {
  const q = svtWho(), d = $('zooPanel'); if (!q) return; centerOn(q.w.x + .3, q.w.y + .3, ZOOM_MAX * 1.5); if (!d || !(window.ZH3D && ZH3D.screenOf)) return;   /* closer than the game allows: this page is for looking at one person */
  /* where the survivor is on screen is measured (the 3D camera is tilted), then the view is slid until the survivor's middle sits a little below the middle of the free part */
  const my = ++svtAimN, mid = () => { const wr = $('world').getBoundingClientRect(); return (ZH3D.screenOf(q.w.x, q.w.y, 0).y + ZH3D.screenOf(q.w.x, q.w.y, 1.15).y) / 2 * wr.height; };
  const want = () => { const wr = $('world').getBoundingClientRect(); return Math.max(120, d.getBoundingClientRect().top - wr.top) * .55; };
  const wait = (fn) => setTimeout(() => requestAnimationFrame(fn), 280);   /* the camera eases to its place, so each look waits for it to settle */
  wait(() => { if (my !== svtAimN) return; const m0 = mid(); cam.y += 24; wait(() => { if (my !== svtAimN) return; const k = (mid() - m0) / 24; if (Math.abs(k) < .01) return;
    let n = 0; const fix = () => { if (my !== svtAimN) return; const e = want() - mid(); if (Math.abs(e) > 4 && n++ < 5) { cam.y += e / k; wait(fix); } }; fix(); }); });
}
function svtApply(again) {
  const q = svtWho(); if (q) q.show = { clip: svtClip, turn: svtTurn, yaw: q.show ? q.show.yaw : null, again: !!again };
  const d = $('zooPanel'); if (!d) return; const i = svtList.indexOf(svtClip), info = (window.ZH3D && ZH3D.survivorClips ? ZH3D.survivorClips(svtFem) : []).find((c) => c.name === svtClip);
  const g = SVT_GROUPS.findIndex((x) => x[1].includes(svtClip));
  d.querySelectorAll('.zt').forEach((b) => b.classList.toggle('on', +b.dataset.g === g));
  $('svtRow').innerHTML = SVT_GROUPS[g][1].map((c) => `<button class="zc${c === svtClip ? ' on' : ''}" data-c="${c}"><b>${esc(SVT_NAME[c] || c)}</b>${SVT_REAL.has(c) || SVT_TWO.has(c) ? '<i>REAL</i>' : SVT_SWING.has(c) || SVT_FIST.has(c) ? '<i>FIXED</i>' : ''}</button>`).join('');
  $('svtRow').querySelectorAll('.zc').forEach((b) => { b.onclick = () => { svtClip = b.dataset.c; svtApply(true); }; if (b.dataset.c === svtClip) b.scrollIntoView({ block: 'nearest', inline: 'center' }); });
  $('svtTurn').classList.toggle('on', svtTurn); $('svtSex').textContent = svtFem ? 'Woman' : 'Man';
  $('zooInfo').innerHTML = `<b>${esc(SVT_NAME[svtClip] || svtClip)}</b> · ${i + 1} of ${svtList.length}${info ? ' · ' + info.dur.toFixed(1) + ' s' : ''} · ${SVT_TWO.has(svtClip) ? 'new: the body of a real person, both hands on the weapon' : /^melee2h|^spear/.test(svtClip) ? 'new: ready stance, both hands on the weapon' : SVT_FIST.has(svtClip) ? 'the old one, corrected: feet on the ground' : SVT_SWING.has(svtClip) ? 'the old swing, corrected: nothing passes through the head' : SVT_REAL.has(svtClip) ? (SVT_PART.has(svtClip) ? 'new: recorded body, old arms' : 'a real recording') : 'old, still to replace'}`;
}
function svtStart() {
  S.mission = null; simSpeed = 1; zooLine(); S.z = []; svtList = SVT_GROUPS.flatMap((g) => g[1]);
  const d = document.createElement('div'); d.id = 'zooPanel'; d.className = 'zooPanel svt';
  /* 3D.200 a short panel: one row of group tabs, one row with that group's animations, one line of facts, one row of buttons */
  d.innerHTML = `<div class="zh"><b>Survivor test</b><span class="sm">${svtList.length} animations</span><button class="act zs" id="svtSex">Man</button><button class="act zs" id="zooExit">Exit</button></div>` +
    `<div class="zrow ztabs">${SVT_GROUPS.map(([g], k) => `<button class="zt" data-g="${k}">${g}</button>`).join('')}</div><div class="zrow" id="svtRow"></div>` +
    `<div class="zinfo" id="zooInfo"></div><div class="zbtns zact"><button class="act" id="svtPrev">◀ Back</button><button class="act" id="svtNext">Next ▶</button><button class="act" id="svtAgain">Again</button><button class="act" id="svtTurn">Turn</button></div>`;
  $('world').appendChild(d); $('app').classList.add('svtOn');   /* 3D.200 nothing but the survivor and this panel: the game's own bars and buttons are hidden here */
  d.querySelectorAll('.zt').forEach((b) => { b.onclick = () => { svtClip = SVT_GROUPS[+b.dataset.g][1][0]; svtApply(true); }; });
  const step = (k) => { svtClip = svtList[(svtList.indexOf(svtClip) + k + svtList.length) % svtList.length]; svtApply(true); };
  $('svtPrev').onclick = () => step(-1); $('svtNext').onclick = () => step(1); $('svtAgain').onclick = () => svtApply(true);
  $('svtTurn').onclick = () => { svtTurn = !svtTurn; svtApply(); }; $('svtSex').onclick = () => { svtFem = !svtFem; svtPut(); svtApply(); };
  $('zooExit').onclick = () => { const q = new URLSearchParams(location.search); q.delete('svt'); location.search = q.toString(); };
  svtPut(); svtApply(); svtAim(); addEventListener('resize', () => setTimeout(svtAim, 60));
  const clean = () => { if (S.z.length) { for (const z of S.z) z.escaped = true; S.z = []; } requestAnimationFrame(clean); }; clean();   /* no zombies on the stage */
}
function zooStart() {
  S.mission = null; simSpeed = 1;
  const d = document.createElement('div'); d.id = 'zooPanel'; d.className = 'zooPanel';
  const card = (t) => { const z = zombieTypes[t] || (t === 'stalker' ? { name: 'Stalker (boss)', hp: 182, atk: 15, isNew: 1 } : { name: 'Mutant Boss' }); return `<button class="zc" data-t="${t}"><b>${esc(z.name || t)}</b>${z.isNew ? '<i>NEW</i>' : ''}<small>HP ${z.hp || 260} · ATK ${z.atk || 14}</small></button>`; };
  const bcard = (bk) => `<button class="zc" data-t="${bk}"><b>${esc(BOSS_KINDS[bk].name)}</b><small>boss · HP ${Math.round(260 * BOSS_KINDS[bk].hp)} · ATK ${Math.round(14 * BOSS_KINDS[bk].atk)}</small></button>`;
  d.innerHTML = `<div class="zh"><b>Zombie test</b><span class="sm">${ZOO_ROWS.flat().length + ZOO_BOSS.length} types · tap one to see it alone</span></div><div class="zrow">${[...ZOO_ROWS[1], ...ZOO_ROWS[0]].map(card).join('')}${ZOO_BOSS.map(bcard).join('')}</div><div class="zh"><b>New models</b><span class="sm">${ZOO_NEW.length} · looks only, no behaviour yet</span></div><div class="zrow">${ZOO_NEW.map(([mk, name]) => `<button class="zc" data-t="${mk}"><b>${esc(name)}</b><i>NEW</i><small>model only</small></button>`).join('')}</div><div class="zinfo" id="zooInfo"></div><div class="zbtns zact"><button class="act" data-a="stand">Stand</button><button class="act" data-a="walk">Walk</button><button class="act" data-a="run">Run</button><button class="act" data-a="attack">Attack</button><button class="act" id="zooTurn">Turning</button></div><div class="zbtns" style="margin-top:8px"><button class="act" id="zooExit">Exit</button><button class="act" id="zooAll">Show all</button><button class="act go" id="zooGo">Send it to town</button></div>`;
  $('world').appendChild(d);
  d.querySelectorAll('.zc').forEach((b) => { b.onclick = () => zooShow(b.dataset.t); });
  d.querySelectorAll('.zact .act[data-a]').forEach((b) => { b.onclick = () => { zooAct = b.dataset.a; zooApply(); if (zooOne) zooInfo(zooOne); }; });
  $('zooTurn').onclick = () => { zooTurn = !zooTurn; zooApply(); };
  $('zooExit').onclick = () => { const q = new URLSearchParams(location.search); q.delete('zoo'); location.search = q.toString(); };
  $('zooAll').onclick = () => { if (zooOne) zooAll(); else zooShow('walker'); };
  $('zooGo').onclick = () => { zooRef(); for (const z of S.z) { z.zoo = false; z.zooOut = true; z.show = null; z.mode = 'appear'; z.stateTicks = 0; z.siege = true; } $('zooInfo').innerHTML = 'Loose: heading for the town. Tap a card or "Show all" to bring them back.'; };
  zooShow('walker');
  const clean = () => { if (S.z.some((z) => !z.zoo && !z.zooOut)) S.z = S.z.filter((z) => z.zoo || z.zooOut || !(z.escaped = true)); requestAnimationFrame(clean); }; clean();   /* 3D.188 every frame (was every 0.4 s), so a roamer is gone before it is drawn */   /* the game's own zombies (the day's roamers) stay off the test page */
}
/* ---------------- V2.40 title screen and save slots (the DV2-style start flow, original look) ---------------- */
function slotRaw(i) { const k = SLOT_KEYS[i]; return readKey(k) || readKey(BAK(k)) || (i === 0 && (readKey(PREV_KEY) || readKey(OLD_KEY))) || null; }
function slotInfo(i) {   /* V2.42: a damaged slot shows its day backup if there is one */
  const k = SLOT_KEYS[i], main = readKey(k), bak = readKey(BAK(k)), raw = main || (i === 0 && (readKey(PREV_KEY) || readKey(OLD_KEY))) || bak; if (!raw) return null;
  const info = (r) => { try { const d = JSON.parse(r); if (!validSave(d, !d.sv)) return null; const st = d.S || {}; return { name: st.townName || 'Zombie Haven', day: st.day || 1, rank: st.rank || 1, pop: (d.sv || st.sv || []).length, mat: Math.floor(st.mat || 0), time: d.time || 0, ver: d.version || '', diff: st.diff || 'normal', start: st.start || 'camp', won: !!st.won, finale: !!st.finale }; } catch (e) { return null; } };
  const x = info(raw); if (x) return main || raw !== bak ? x : { ...x, fromBak: true };
  const y = bak && raw !== bak && info(bak); return y ? { ...y, fromBak: true } : { broken: true };
}
function clearSlot(i) { try { const k = SLOT_KEYS[i]; [k, BAK(k), BAD(k)].forEach((q) => localStorage.removeItem(q)); if (i === 0) { localStorage.removeItem(PREV_KEY); localStorage.removeItem(OLD_KEY); } } catch (e) { /* ignore */ } }
const ago = (t) => { if (!t) return ''; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
function playSlot(i, newName, opts) {
  try { localStorage.setItem('zhSlot', String(i + 1)); if (newName != null) { clearSlot(i); localStorage.setItem('zhNewName', newName || 'Zombie Haven'); localStorage.setItem('zhNewOpts', JSON.stringify(opts || {})); } } catch (e) { /* storage blocked: play without saving */ }
  location.href = location.pathname + '?play=1' + location.hash;   // V3D.19: keep #v2 (test character) when the game starts
}
function backToTitle() { saveGame(); location.href = location.pathname + location.hash; }
function showTitle() {
  $('title').style.display = 'flex'; $('slots').style.display = 'none';
  const latest = [0, 1, 2].map((i) => [i, slotInfo(i)]).filter(([, x]) => x && !x.broken).sort((a, b) => b[1].time - a[1].time)[0];
  $('tCont').style.display = latest ? 'block' : 'none'; if (latest) { $('tCont').innerHTML = `Continue<small>${esc(latest[1].name)} · Day ${latest[1].day}</small>`; $('tCont').onclick = () => playSlot(latest[0]); }
  if (document.documentElement.classList.contains('cozy')) { const t = document.querySelector('.tLogo .tsub'); if (t) t.textContent = 'a cozy end of the world'; $('tStart').textContent = 'New game'; }
  $('tStart').onclick = showSlots; { const zb = $('tZoo'); if (zb) zb.onclick = () => { const q = new URLSearchParams(location.search); q.set('zoo', '1'); location.search = q.toString(); }; } { const sb = $('tSvt'); if (sb) sb.onclick = () => { const q = new URLSearchParams(location.search); q.set('svt', '1'); location.search = q.toString(); }; } { const gb = $('tGear'); if (gb) gb.onclick = () => { const q = new URLSearchParams(location.search); q.set('gear', '1'); location.search = q.toString(); }; }   /* 3D.151 */   /* 3D.32 */ { const R = Object.entries(records()).sort((a, b) => b[1].score - a[1].score)[0]; $('tVer').textContent = 'ver ' + VERSION + ((' · ' + BUILD_TAG)) + (R ? ` · 🏆 ${R[1].score} (${(STARTS[R[0].split('/')[0]] || STARTS.camp).name}, ${(DIFFS[R[0].split('/')[1]] || DIFFS.normal).name})` : ''); }
}
let slotDel = null;
function showSlots() {
  $('title').style.display = 'none'; const box = $('slots'); box.style.display = 'flex'; box.querySelector('.sHead').textContent = 'Save Slots';
  const rows = [0, 1, 2].map((i) => { const x = slotInfo(i);
    if (!x) return `<div class="slot empty" data-i="${i}"><span class="snum">${i + 1}</span><span class="sinfo"><b>Empty</b><small>Tap to start a new game</small></span></div>`;
    if (x.broken) return `<div class="slot" data-i="${i}"><span class="snum">${i + 1}</span><span class="sinfo"><b>Damaged save</b><small>Tap to start over in this slot</small></span></div>`;
    return `<div class="slot" data-i="${i}" data-full="1"><span class="snum">${i + 1}</span><span class="sinfo"><b>${esc(x.name)}</b><small>${x.won ? '🏆 ' : x.finale ? '📻 ' : ''}Day ${x.day} · ${'★'.repeat(x.rank)} · 👥 ${x.pop} · ${(STARTS[x.start] || STARTS.camp).icon}${(DIFFS[x.diff] || DIFFS.normal).icon}</small><small class="sago">${x.fromBak ? '⚠ Damaged: day backup' : 'Saved ' + ago(x.time)}${x.ver ? ' · V' + esc(x.ver) : ''}</small></span><button class="sdel${slotDel === i ? ' arm' : ''}" data-del="${i}" title="Delete">${slotDel === i ? 'Delete?' : '🗑'}</button></div>`; }).join('');
  box.querySelector('.slist').innerHTML = rows;
  box.querySelectorAll('.slot').forEach((el) => { el.onclick = (e) => { if (e.target.closest('.sdel')) return; const i = +el.dataset.i; if (el.dataset.full) playSlot(i); else newSlot(i); }; });
  box.querySelectorAll('.sdel').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); const i = +b.dataset.del; if (slotDel === i) { clearSlot(i); slotDel = null; } else slotDel = i; showSlots(); }; });
  $('sBack').onclick = () => { slotDel = null; showTitle(); }; $('sBak').style.display = ''; $('sBak').onclick = () => { slotDel = null; showBackups(); };
}
let newOpt = { start: 'camp', diff: 'normal', map: 'road' };
function newSlot(i, keepName) {   /* V2.46: name, starting condition and difficulty */
  const box = $('slots'), nm = keepName ?? 'Zombie Haven', R = records(), rec = R[recKey(newOpt.start, newOpt.diff, newOpt.mods)], mods = modList(newOpt.mods), ms = modScore(mods) * DIFFS[newOpt.diff].score;
  box.querySelector('.slist').innerHTML = `<div class="card newGame" style="color:#2a2a5a;background:#f3f6f9"><b style="font-size:22px">Slot ${i + 1} · New haven</b>
    <div class="sm" style="margin:6px 0 2px;color:#5b6b7a">Name your town</div><input id="sName" maxlength="22" value="${esc(nm)}" style="width:100%;box-sizing:border-box;font:inherit;font-size:22px;padding:6px;border-radius:6px;border:2px solid #7f93a6;background:#f7fafc;color:#1f2a33;text-align:center">
    <div class="sm" style="margin:8px 0 2px;color:#5b6b7a">Land</div><div class="row" style="gap:4px;flex-wrap:wrap">${Object.entries(MAPS).map(([k, v]) => `<button class="act${(newOpt.map || 'road') === k ? ' go' : ''}" data-mp="${k}" style="flex:1 1 40%;margin:0;padding:6px 2px;font-size:16px">${v.icon} ${v.name}</button>`).join('')}</div>
    <div class="sm" style="margin-top:4px;color:#5b6b7a">${MAPS[newOpt.map || 'road'].desc}</div>
    <div class="sm" style="margin:8px 0 2px;color:#5b6b7a">Difficulty</div><div class="row" style="gap:4px">${Object.entries(DIFFS).map(([k, v]) => `<button class="act${newOpt.diff === k ? ' go' : ''}" data-df="${k}" style="flex:1 1 0;margin:0;padding:6px 2px;font-size:17px">${v.icon} ${v.name}</button>`).join('')}</div>
    <div class="sm" style="margin-top:4px;color:#5b6b7a">${DIFFS[newOpt.diff].desc}</div>
    <div class="sm" style="margin:8px 0 2px;color:#5b6b7a">Twists <span style="opacity:.8">(optional, any mix)</span></div><div class="row" style="gap:4px;flex-wrap:wrap">${Object.entries(MODS).map(([k, v]) => `<button class="act${mods.includes(k) ? ' go' : ''}" data-md="${k}" style="flex:1 1 30%;margin:0;padding:5px 2px;font-size:14px">${v.icon} ${v.name}</button>`).join('')}</div>
    <div class="sm" style="margin-top:4px;color:#5b6b7a">${mods.length ? mods.map((k) => MODS[k].desc).join(' ') + ` Score ×${ms.toFixed(2)}.` : 'None picked: the game as designed.'}</div>
    <div class="sm" style="margin-top:4px;color:#2a5ac8">${rec ? `🏆 Best here: ${rec.score} (${esc(rec.name)}, day ${rec.day})` : 'No win yet with this set-up.'}</div>
    ${legacySaved() ? `<button class="act${newOpt.legacy ? ' go' : ''}" id="sLeg" style="margin-top:8px;width:100%">🌳 Legacy start: ${newOpt.legacy ? 'on' : 'off'}<small style="display:block;font-size:13px">${esc(legacySaved().from)} · ${(legacySaved().vets || []).map((v) => esc(v.name)).join(', ')}</small></button>` : ''}
    <div class="row" style="gap:8px;margin-top:10px;justify-content:center"><button class="act" id="sCancel">Cancel</button><button class="act go" id="sGo">Start</button></div></div>`;
  { const lb = $('sLeg'); if (lb) lb.onclick = () => { newOpt.legacy = !newOpt.legacy; newSlot(i, ($('sName').value || '').trim() || 'Zombie Haven'); }; }
  const nmNow = () => ($('sName').value || '').trim() || 'Zombie Haven';
  box.querySelectorAll('[data-st]').forEach((e) => { e.onclick = () => { newOpt.start = e.dataset.st; newSlot(i, nmNow()); }; });
  box.querySelectorAll('[data-df]').forEach((e) => { e.onclick = () => { newOpt.diff = e.dataset.df; newSlot(i, nmNow()); }; });
  box.querySelectorAll('[data-md]').forEach((e) => { e.onclick = () => { const k = e.dataset.md, cur = modList(newOpt.mods), clash = { quiet: 'bandit', bandit: 'quiet', plenty: 'lean', lean: 'plenty' }[k]; newOpt.mods = cur.includes(k) ? cur.filter((q) => q !== k) : cur.filter((q) => q !== clash).concat(k); newSlot(i, nmNow()); }; });   /* opposite twists replace each other */
  box.querySelectorAll('[data-mp]').forEach((e) => { e.onclick = () => { newOpt.map = e.dataset.mp; newSlot(i, nmNow()); }; });
  $('sCancel').onclick = showSlots; $('sGo').onclick = () => playSlot(i, nmNow(), { ...newOpt });
}
/* ---------------- V2.42 backups: export a slot to a file (or the clipboard / share sheet), import one into any slot ---------------- */
const BAK_T = 'zhBackupAt';
function backupText(i) {
  const raw = slotRaw(i); if (!raw) return null; let save = null; try { save = JSON.parse(raw); } catch (e) { /* damaged: keep the text */ }
  const st = (save && save.S) || {}, o = { zhBackup: 1, game: 'Zombie Haven', slot: i + 1, exported: new Date().toISOString(), version: VERSION, name: st.townName || 'Zombie Haven', day: st.day || 1 };
  return JSON.stringify(save ? { ...o, save } : { ...o, rawText: raw });
}
const backupName = (i) => { const x = slotInfo(i) || {}; return `zombie-haven-${String(x.name || 'town').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'town'}-day${x.day || 1}.json`; };
function markExported(i) { try { const m = JSON.parse(localStorage.getItem(BAK_T) || '{}'); m[i] = Date.now(); localStorage.setItem(BAK_T, JSON.stringify(m)); } catch (e) { /* ignore */ } }
function exportedAt(i) { try { return (JSON.parse(localStorage.getItem(BAK_T) || '{}'))[i] || 0; } catch (e) { return 0; } }
async function exportBackup(i, how) {   /* how: 'share' (iPhone share sheet: Files, AirDrop, Notes…), 'file' (download) or 'copy' (clipboard) */
  const text = backupText(i); if (!text) return 'Nothing saved in this slot yet.'; const name = backupName(i);
  try {
    if (how === 'share') { const f = new File([text], name, { type: 'application/json' }); if (!(navigator.canShare && navigator.canShare({ files: [f] }))) return exportBackup(i, 'file'); await navigator.share({ files: [f], title: name }); markExported(i); return 'Backup shared.'; }
    if (how === 'copy') { if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text); else { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); } markExported(i); return 'Backup copied: paste it into Notes or a message to keep it.'; }
    const u = URL.createObjectURL(new Blob([text], { type: 'application/json' })), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000); markExported(i); return 'Backup saved as ' + name;
  } catch (e) { return e && e.name === 'AbortError' ? 'Cancelled.' : 'Could not export (' + ((e && e.message) || e) + '). Try Copy.'; }
}
const verNum = (v) => String(v || '0').split('.').map((n) => +n || 0).reduce((a, n) => a * 1000 + n, 0);
function parseBackup(text) {
  let o; try { o = JSON.parse(String(text || '').trim()); } catch (e) { return { ok: false, why: 'That is not a Zombie Haven backup (it could not be read).' }; }
  const save = o && o.zhBackup ? o.save : o;
  if (!save || !validSave(save, false)) return { ok: false, why: o && o.rawText ? 'That backup holds a damaged save: it cannot be imported.' : 'That file is not a Zombie Haven save.' };
  const newer = verNum(save.version) > verNum(VERSION);
  return { ok: true, save, name: save.S.townName || 'Zombie Haven', day: save.S.day || 1, ver: save.version || '', newer };
}
function importBackup(i, text) {
  const r = parseBackup(text); if (!r.ok) return r; if (r.newer) return { ok: false, why: `That backup is from V${r.ver}, newer than this game (V${VERSION}). Reload the page to update first.` };
  const k = SLOT_KEYS[i], old = readKey(k), data = JSON.stringify({ sid: 'import', ...r.save, sid: 'import', time: Date.now() });   /* sid first: an open tab on this slot sees the change and stops saving */
  if (old) writeKey(BAK(k), old);   /* the town being replaced stays as this slot's day backup until it is played */
  const w = writeKey(k, data); if (w !== true) return { ok: false, why: 'The browser storage is full or blocked.' };
  if (i === 0) { try { localStorage.removeItem(PREV_KEY); localStorage.removeItem(OLD_KEY); } catch (e) { /* ignore */ } }
  return { ok: true, why: `Imported ${r.name} (Day ${r.day}) into slot ${i + 1}.` };
}
const BAK_HINT = 'Safari can clear website data when the game is not opened for 7 days. Add Zombie Haven to your Home Screen, or export a backup now and then.';
function exportRowHtml(i) { return `<button class="act go" data-ex="share" data-i="${i}" style="width:100%;margin:6px 0 0">Export backup</button><div class="row" style="gap:6px;margin-top:6px"><button class="act" data-ex="file" data-i="${i}" style="flex:1 1 0;margin:0;white-space:nowrap">Download</button><button class="act" data-ex="copy" data-i="${i}" style="flex:1 1 0;margin:0;white-space:nowrap">Copy text</button></div>`; }
function wireExport(root, done) { root.querySelectorAll('[data-ex]').forEach((b) => { b.onclick = async () => { const m = await exportBackup(+b.dataset.i, b.dataset.ex); done(m); }; }); }
let bakView = null, bakArm = null;
function showBackups(msg) {   /* title screen → Start → Backups */
  $('sBak').style.display = 'none'; const box = $('slots'), list = box.querySelector('.slist'); box.querySelector('.sHead').textContent = 'Backups';
  if (bakView != null) { importView(bakView, msg); return; }
  list.innerHTML = (msg ? `<div class="card sm" id="bakMsg">${esc(msg)}</div>` : '') + [0, 1, 2].map((i) => { const x = slotInfo(i), t = exportedAt(i);
    return `<div class="card" style="color:#2a2a5a;background:#f3f6f9"><b>Slot ${i + 1} · ${x ? (x.broken ? 'Damaged save' : esc(x.name) + ' · Day ' + x.day) : 'Empty'}</b><div class="sm" style="color:#5b6b7a">${x ? 'Last export: ' + (t ? ago(t) : 'never') : 'Nothing to export'}</div>${x ? exportRowHtml(i) : ''}<button class="act" data-imp="${i}" style="width:100%;margin-top:6px">Import a backup into slot ${i + 1}</button></div>`; }).join('') + `<div class="sm" style="color:#e8e0c8">${BAK_HINT}</div>`;
  wireExport(list, (m) => showBackups(m)); list.querySelectorAll('[data-imp]').forEach((b) => { b.onclick = () => { bakView = +b.dataset.imp; bakArm = null; showBackups(); }; });
  $('sBack').onclick = () => { bakView = null; showSlots(); };
}
function importView(i, msg) {
  const list = $('slots').querySelector('.slist'), x = slotInfo(i);
  list.innerHTML = `<div class="card" style="color:#2a2a5a;background:#f3f6f9"><b>Import into slot ${i + 1}</b>${x && !x.broken ? `<div class="sm" style="color:#b0402a">This replaces ${esc(x.name)} (Day ${x.day}). It is kept as the slot's day backup until you play.</div>` : ''}
    <label class="act" style="display:block;text-align:center;margin:8px 0">Choose a backup file<input type="file" id="impFile" accept=".json,application/json,text/plain" style="display:none"></label>
    <div class="sm" style="color:#5b6b7a">…or paste the backup text:</div><textarea id="impText" rows="4" style="width:100%;box-sizing:border-box;font:14px monospace;border:2px solid #7f93a6;border-radius:6px;background:#f7fafc;color:#1f2a33"></textarea>
    ${msg ? `<div class="sm" id="bakMsg" style="color:#b0402a">${esc(msg)}</div>` : ''}<button class="act go" id="impGo" style="width:100%;margin-top:6px">${bakArm === i ? 'Tap again to replace the town' : 'Import'}</button></div>`;
  const go = (text) => { const r = parseBackup(text); if (!r.ok) { importView(i, r.why); return; } if (x && !x.broken && bakArm !== i) { bakArm = i; $('impText').value = text; importView(i, `Ready: ${r.name}, Day ${r.day}${r.ver ? ' (V' + r.ver + ')' : ''}.`); $('impText').value = text; return; } const w = importBackup(i, text); bakArm = null; if (w.ok) { bakView = null; showBackups(w.why); } else importView(i, w.why); };
  $('impFile').onchange = (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; if (f.size > 4e6) { importView(i, 'That file is too big to be a save.'); return; } const rd = new FileReader(); rd.onload = () => go(String(rd.result)); rd.onerror = () => importView(i, 'Could not read that file.'); rd.readAsText(f); };
  $('impGo').onclick = () => go($('impText').value);
  $('sBack').onclick = () => { bakView = null; bakArm = null; showBackups(); };
}
function showBackup(msg) {   /* in game (event log → Backup): export this town */
  endBuildMode(true); closeP(); saveGame(); $('it').textContent = 'BACKUP'; const i = SLOT - 1, t = exportedAt(i);
  $('ib').innerHTML = `<div class="card"><b>${esc(S.townName || 'Zombie Haven')} · slot ${SLOT}</b><div class="sm">${saveErr ? '⚠ Saving is failing: ' + esc(saveErr) : saveBlocked ? '⚠ This tab is not saving' : 'Saved automatically'} · last export: ${t ? ago(t) : 'never'}</div></div>${exportRowHtml(i)}${msg ? `<div class="card sm">${esc(msg)}</div>` : ''}<div class="sm" style="margin-top:6px">To bring a backup back: main screen (🏠) → Start → Backups → Import.</div><div class="sm" style="margin-top:6px">${BAK_HINT}</div>`;
  wireExport($('ib'), (m) => showBackup(m)); showPanel();
}
// test / debug hook (no effect on gameplay)
window.ZH = { BUILD_TAG, emote, carAlarm: (x, y) => carAlarm(x, y), alarmCands: (x, y) => alarmCands(x, y), facTier: (k) => facTier(k), facGear: (k) => facGear(k),  showGoals: () => showGoals(), showTrophies: () => showTrophies(), DF: () => DF(),  ARRIVE, TUNE,   /* balance knobs (tools/balance/README.md) */ shBot: { act: (c) => shAct(c), move: (at) => shMoveTo(at), call: (k) => shCall(k) },   /* 3D.130 orders without the screen, for the balance bot (tools/balance/sh_probe.py) */ CAMP_PLAN, get SH_ROOMS() { return SH_ROOMS; }, get SH_DOORS() { return SH_DOORS; }, SH_AX, SH_AY, shGridOf: () => shGrid(), shWorldOf: (x, y) => shWorld(x, y), showShPractice, shTap, showLegacy, legSel, crisisDaily, promoteSpec, promoteHyb, hybOptions, specWhy, needsBanner, setExpVeh: (k) => { expSel.veh = k || null; }, vehReady, VEH, vehArrive, vehBuildCart, vehRepair, vehDrive, unitPanel, raiderDown, spawn, spawnRaid, startStronghold, shCall, shEnd, shTick, SH_DEFS, shPower, STORY, fac, boom, upgradeTown, levelUpDone, earnBanner, rankConds, showUpgrade, showTown, supplyCap, matCap, scrapCap, zombieTypes, intro, INTRO, danger, powerTick, powered, gunners, tryTrap, trapAt, trapMap, trapMax, rearmAll, trapsSpent, helpReady, facilityRules, newJob, collectBonus, autoStaff, ECO, supplyCap, rationNeed, radioHelp, triggerTownEvent, foundryHour, allyDaily, threatNow, rollRaider, breatherWatch, graceOn, arriveGap, visitorArrival, firstGift, stageCheck, guideProgress, FIRST_GIFTS, earlyWood, STARTS, finaleTick, finaleHour, crisisTick, CRISES, crisisHour, hordeStart, helpTick, ageOf, newcomer, mk, impactFx, note, downAlert, alertHub, bark, barkSomeone, craftTool, TOOLS, radioOk, lootReveal, lootEntries, showStash, dropBag, openBag, hqTier, canPay, bCost, upgradeBuilding, upgradeCheck, jobList: () => jobList(), newSite: (t, x, y) => { const d = DEFS[t], nb = { type: t, x, y, rot: 0, w: d.w, h: d.h, q: d.q, a: d.a, staff: null }; (S.sites ||= []).push(newJob(nb, bCost(d))); world.sites = S.sites; Wd.bump(world); pushUnitsOut(nb); return nb; }, upgradeTown, holdEvent, showUpgrade, rankConds, TOWN_EVENTS, RANK_REQ, ui, showBuildingInfo, showBuild, showTown, showSurvivors, STORY, bondOf, popCap, popNow, BANDAGE: () => BANDAGE_COST, repairBurnt, traderArrive, traderBuy, traderTrade, givePet, S, world, Wd, cam, project, unproject, insideBuilding, tapAt, unitPanel, doResearch, craft, RESEARCH, researched, upkeepTotal, equip, stat, ITEMS, stashAdd, expandTerritory, spawnRaid, spawnBoss, changeProfession, gainXp, SKILLS, isNight, startTool, updatePreview, centerOn, draw, simTick, step(n) { for (let i = 0; i < n; i++) simTick(); }, spawn, mk, get sel() { return sel; }, get preview() { return preview; }, get selected() { return selected; }, get tick() { return tick; }, serialize, saveGame, closeP, expAutoSquad, startExpedition, tripUpdate, showExpedition, expLocked, EXP_DEFS, showEventPopup, autoStaff, tryWall, killSurvivor, useBandage, upgradeBuilding, upgradeCheck, hourlyProduction, supplyStats, isWorking, supplyCap, DEFS, setDebug(v) { debug = v; }, finaleTest: () => finaleHour(), legacyDone, signalReady, startFinale, scoreOf, tryPost, postMax, encOdds, get saveBlocked() { return saveBlocked; }, get saveErr() { return saveErr; }, get loadedFrom() { return loadedFrom; }, get advShown() { return advShown; }, militia, setPolicy, policy, onShift, wreckSpots, pixelCacheSize: () => pixelCache.size, pixelCacheMB: () => Math.round([...pixelCache.values()].reduce((t, c) => t + c.width * c.height * 4, 0) / 1e5) / 10, econ, showResource, ECO, get objMarks() { return objMarks; }, alerts, note, sendDefender, get simSpeed() { return simSpeed; }, get repairFirst() { return repairFirst; }, demolish, BASE_TW, get groundChunks() { return groundChunks; } };
Object.assign(window.ZH, { rankRoom, bedCount, orderRescue, focusBoss, ai, });   /* 3D.67 test hooks */
Object.assign(window.ZH, { forecastFor, STORY, BOSS_KINDS, quarDaily, quarClean, helixDaily, helixFree, helixStalkerDown, hollowDaily, facHour, foundryDaily });   /* V3D.17 test hooks */
Object.assign(window.ZH, { CLASS_LIST, EXP_ENC, FIELD_CAP, GOALS_DAILY, Iso, MISSION_DEFS, OPTS, SLOT, TILE_PX, TRAITS, TWs, advisorTips, advisorUpdate, alertsTick, assignRescue, atPost, autoRepair, awayCredit, backupText, beginMission, bestDefender, bleedMax, bondsDaily, burnDown, careTicks, claimGoal, comebackConvoy, confirmPreview, currentObjective, dayKey, ecoLast24, encChoose, encDefault, encPopup, encResolve, endBuildMode, engaged, eventQueue, eventSchedule, bossNear, bossGap, expEncounter, expTraitLoot, fieldNotesHtml, findGaps, fitBoost, genFuel, goalsHtml, goalsTick, hDay, hardshipCheck, hitBuilding, hungryPen, importBackup, legacyCheck, lureFire, medicFindPatient, missionProgress, moveBuilding, newPet, newProduce, parseBackup, patrolDest, postsAssign, prodMult, pushUnitsOut, rally, rangeOf, ration, reloadGun, removePost, retreatCheck, retreatPct, rollTrait, rush, rushCheck, showPost, slotInfo, startAid, startFire, townAppeal, traderLeave, traitRange, trapOkTile, tryRoad, wallBroken, weaponOf });   /* test hooks read only by tests/run_tests.py (they had been pruned from the list above; when running tools/dce/prune.js, pass tests/run_tests.py as a user file) */
init();
})();
