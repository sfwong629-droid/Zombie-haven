/* ---------------- 3D.79 Field Notes (owner, Nov 8): the first time a feature, a zombie type or a profession shows up, a short card
   says what it is and what to do about it. The game pauses while it is open. Every note stays readable in Guide → Field Notes. ---------------- */
const INTRO = {
  // zombies
  'z:walker': ['🧟', 'Walker', 'Weak alone, a problem in a crowd, and they pile up at night. Slow, dim and very, very persistent.', 'Fighters handle them. Close the walls so they have to break through; keep non-fighters inside when a crowd comes.'],
  'z:crawler': ['🧟', 'Crawler', 'The slowest zombie, and easy to miss in the grass. Lost its legs, kept its appetite.', 'Look before sending workers out: it gets the people who think the coast is clear.'],
  'z:runner': ['🏃', 'Runner', 'Fast, fragile, and at the door before you are. Did cardio before the end and never stopped.', 'Guards and Police on watch catch them; walls slow them. Keep workers near a door at night.'],
  'z:bloated': ['🤢', 'Bloated', 'Tough, slow, and hits like a fridge. Ate well before it died.', 'Gang up on it with two fighters. A Gas Mask or Hazmat Suit cuts its damage.'],
  'z:spitter': ['🤮', 'Spitter', 'Spits from a few tiles away. Acid reflux, weaponised.', 'Close in fast or shoot it first. A Gas Mask or Hazmat Suit cuts the acid.'],
  'z:brute': ['💪', 'Brute', 'Breaks walls and buildings fast and hits like a truck. Never skipped arm day.', 'Focus it with your best fighters and guns. Stone walls hold it longer than wood.'],
  'z:thrower': ['🪨', 'Thrower', 'From about four tiles: slow to wind up, hits hard. Throws rubble like it is angry at the rubble.', 'Rush it between throws, or outrange it with rifles. Walls block its line.'],
  'z:sporehead': ['🍄', 'Sporehead', 'Every attack is a three-hit combo: claw, claw, headbutt. Has a mushroom where the brain was.', 'Keep your distance between its combos, or fight it with ranged weapons.'],
  'z:screamer': ['😱', 'Screamer', 'The shriek hurts everyone close and calls more zombies. Knows one note and uses it.', 'Kill it from range before it screams, and don\'t let your people bunch up near it.'],
  'z:riot': ['🛡️', 'Riot Zombie', 'Blades and knives do half damage. Still on duty. Still in riot gear.', 'Use blunt weapons or guns on it.'],
  'z:burnt': ['🔥', 'Burnt Zombie', 'Sets any building it hits on fire. Still smouldering, still cranky.', 'Keep it away from buildings. A Firefighter Coat puts fires out faster, and rain helps.'],
  'z:lasher': ['🪢', 'Lasher', 'Hooks anyone with a gun, bow or crossbow from 2 tiles, drags them in and paralyses them for about 8 seconds. Arms far too long and a grudge against archers.', 'Kill it first. Keep melee fighters near your shooters; Guards often brace and hold their ground.'],
  'z:rotbomb': ['💥', 'Rotbomb', 'It bursts on death and hurts everyone and every wall close by, zombies too. A clown full of rot. Nobody laughs when it pops.', 'Shoot it at range or let it die outside the walls. Gas masks halve the damage.'],
  'z:dog': ['🐕', 'Infected Dog', 'Fast and low; goes for workers out at the trees and rocks. Still a good boy at heart. The heart is not in charge.', 'Gather in pairs, keep a fighter nearby, and walls keep it out.'],
  'z:alpha': ['👑', 'The Alpha', 'Zombies near it move 20% faster. Middle management of the dead.', 'Kill it and the horde breaks. Use Focus the boss on it.'],
  'z:raider': ['🏴', 'Raiders', 'They slip in through the gate, steal supplies, start fires and run. The living, and worse company.', 'Police Officers spot and hit raiders best. Keep fighters near the stores and gate; a beaten raider drops what they took.'],
  'boss:mutant': ['☠', 'Boss: Mutant Zombie', 'While it lives, no other zombies join the night. Huge, ugly and in charge tonight.', 'Kill the boss and the night goes quiet. Traps, a Noise Lure and Focus the boss all help. Scouts warn you at noon on boss days.'],
  'boss:bloater': ['☠', 'Boss: Bloater Queen', 'Slow, enormous and very hard to kill. Royalty, by sheer volume.', 'Wear it down from range; keep fighters spread out.'],
  'boss:stalker': ['☠', 'Boss: Stalker', 'Patient, fast, and fond of anyone walking alone.', 'Keep everyone inside or in groups and bring it down with several fighters at once.'],
  'boss:butcher': ['☠', 'Boss: The Butcher', 'Hits harder than anything else out there, and knows it.', 'Don\'t trade blows with it alone. Traps, walls and guns.'],
  // professions
  'job:Guard': ['🛡️', 'Guard', '20% more HP, 20% less damage taken. Stands in the way for a living.', 'Put Guards on guard posts and at the gate. Every town needs at least two fighters.'],
  'job:Police Officer': ['👮', 'Police Officer', 'Longer range, spots sneaking raiders sooner and hits raiders harder. Still reads raiders their rights. Shoots anyway.', 'Give them a gun, and keep ammo coming.'],
  'job:Scavenger': ['🎒', 'Scavenger', 'Fights a little, brings in scrap and wood, runs the Scrapyard and Lumber Camp. Finds treasure in other people\'s bins.', 'Send them on expeditions and to the wrecks around town.'],
  'job:Medic': ['⚕️', 'Medic', 'Patches people up in the field and gets the downed back on their feet. Has seen worse.', 'Keep one near the fighting. Care is slower without a Medic on staff.'],
  'job:Engineer': ['🔧', 'Engineer', 'Researches at the Workbench and Workshop, digs stone at the Quarry, builds and repairs fastest. Fixes things by looking at them sternly.', 'Staff the Workshop to unlock gear and buildings.'],
  'job:Mechanic': ['⚙️', 'Mechanic', 'Runs the Generator (a quarter less fuel), Fuel Still, Ammo Bench, Factory and Electric Pump. Speaks fluent engine.', 'Without a Mechanic those buildings run at a quarter. One Mechanic per machine building is ideal.'],
  'job:Farmer': ['🌾', 'Farmer', 'Grows food and draws water: Garden Plots, Farms, Rain Collectors, Wells, the Greenhouse. Talks to the plants. The plants are the only ones who listen.', 'Food and water first: a hungry town stops growing and people leave.'],
  'job:Cook': ['🍳', 'Cook', 'Every Canteen meal fills more, so rations go further. Can make beans taste like more beans.', 'One Cook on shift saves a lot of food in a big town.'],
  'job:Civilian': ['🙂', 'Civilian', 'Fills any job a bit below the right worker, and carries twice the load. Very keen, no qualifications.', 'Give them a profession from the survivor panel when the town needs one.'],
  // features
  'f:night': ['🌙', 'Nights', 'At dusk a horde comes in three waves: the big one first, then two smaller pushes. Kill them all and the night goes quiet.', 'Get people inside before dark, keep fighters at the walls, and heal up during the day.'],
  'f:down': ['🩸', 'Downed survivors', 'A survivor knocked to 0 HP is down: they bleed out unless someone carries them to medical care in time.', 'Tap Send rescue on the alert. A medical building and a Medic give them much longer.'],
  'f:boss': ['☠', 'Boss night', 'Scouts saw a boss gathering a horde. It attacks tonight at 21:00.', 'Re-arm the traps, set a Noise Lure, give the gunners ammo and heal the hurt (a Medical Tent: hurt fighters go there before dark). Anyone downed: tap them, then Bandage or Send rescue.'],
  'f:rank': ['🏡', 'Levelling up the Haven', 'The Haven grows through 20 levels. Each needs enough people and buildings; then press Upgrade and wait (3x faster while you play).', 'Each level unlocks buildings and beds, and lets the zombies get tougher too. Upgrade when you are ready.'],
  'f:ceiling': ['☠', 'The threat follows your level', 'Zombies grow with your Haven level, never just because days pass.', 'If the nights feel too hard, hold off on the next upgrade and build up first.'],
  'f:explore': ['🧭', 'Expeditions', 'Send a squad out to scavenge places on the map: food, scrap, medicine, fuel, ammo, and sometimes survivors.', 'Higher risk brings more loot and more danger. Always keep a fighter at home.'],
  'f:power': ['⚡', 'Power', 'Generators burn fuel and each gives 4 power. Powered buildings take it in order: water first, the Ammo Factory last.', 'Keep fuel coming (Gas Station trips, wrecks, a Fuel Still). Food and water never depend on power.'],
  'f:ammo': ['🔸', 'Ammo', 'Guns now use rounds from the town stock (the 🔸 count). Out of ammo, a gunner clubs with the empty gun.', 'A Mechanic at an Ammo Bench makes about 16 rounds a day. Crossbows and melee never need ammo.'],
  'f:traps': ['🔺', 'Traps', 'Spike Strips, Barbed Wire and (rank 3) the Noise Lure go on any open ground, inside or outside the walls: best on the paths zombies come along.', 'They wear out: re-arm them with scrap before the night, especially on boss days.'],
  'f:convoy': ['🚚', 'The comeback convoy', 'When the town is down to its last few people, a convoy sometimes finds it with help and supplies.', 'Use the second chance: food and water first, then beds.'],
  'f:fire': ['🔥', 'Fire', 'A burning building spreads fire and stops working.', 'People rush to put it out; a Firefighter Coat helps. Burnt buildings can be repaired.'],
  'f:trader': ['🛒', 'The trader', 'A travelling trader visits by day with goods to swap.', 'Trade spare food or water for what you lack. They leave at dusk.'],
};
const introOff = () => !!S.introOff || (/[?&]test=/.test(location.search) && !window.ZH_INTRO);
function intro(key) {   /* show a Field Note once per game */ if (ZOO) return;   /* 3D.152 no tips on the test pages */
  S.intro = S.intro || {}; if (S.intro[key]) return false; const d = INTRO[key] || (key.startsWith('b:') && DEFS[key.slice(2)] && [ '🏗️', DEFS[key.slice(2)].name, BDESC[key.slice(2)] || '', 'Tap it to see how it is doing, who works there and what it needs.' ]); if (!d) return false;
  S.intro[key] = S.day || 1; if (introOff()) return true;
  if (!key.startsWith('z:') && !key.startsWith('boss:')) { radio('dj', `${rLine('note')} ${d[1]}. ${String(d[2]).split('. ')[0].replace(/\.$/, '')}.`, { key: 'fn' + key, title: d[1], more: `<div style="text-align:left"><b>What it is</b><br>${d[2]}<br><br><b>What to do</b><br>${d[3]}</div><div class="sm" style="margin-top:8px">Guide → Field Notes keeps every note.</div>` }); return true; }   /* 3D.135 */
  let pic = '';   /* 3D.102: a new zombie gets its picture, seen from the game's iso angle, in the middle of the card */
  if (key.startsWith('z:') || key.startsWith('boss:')) { try { const zi = window.ZH3D && ZH3D.zombieIso, bk = key.startsWith('boss:') && (BOSS_KINDS[key.slice(5)] || BOSS_KINDS.mutant), u = key === 'z:raider' ? (window.ZH3D && ZH3D.raiderIso ? ZH3D.raiderIso((S.z.find((z) => z.type === 'raider' && z.hp > 0 && z.wpn) || {}).wpn) : null) /* 3D.178 bug A5: a raider is a person, not a walker; 3D.187: holding the weapon of the raider that came */ : zi && (bk ? zi(bk.look, true) : zi(key.slice(2))); if (u) pic = `<div style="text-align:center;margin:-4px 0 6px"><img src="${u}" alt="" style="width:170px;height:170px;object-fit:contain;filter:drop-shadow(0 6px 4px rgba(0,0,0,.35))"></div>`; } catch (e) { pic = ''; } }
  showEventPopup({ title: `${d[0]} NEW: ${d[1].toUpperCase()}`, text: `${pic}<div style="text-align:left"><b>What it is</b><br>${d[2]}<br><br><b>What to do</b><br>${d[3]}</div><div class="sm" style="margin-top:8px">Field Notes keeps every note: Guide → Field Notes.</div>`,
    buttons: [{ label: 'Got it' }, { label: 'No more tips', fn: () => { S.introOff = true; say('Tips are off. Turn them back on in Guide → Field Notes.', true); } }] });
  return true;
}
/* 3D.102 the opening cutscene of a new game (owner): four survivors run off the north-east highway with two zombies on their heels,
   lose them, find a broken-down farm (a 5x5 wood fence with gaps) in the middle of the map, see the scrap lying around and put the
   camp up there. The camera follows them zoomed in; the HUD is hidden behind letterbox bars; Skip jumps straight to the built camp. */
const CUT_FENCE = (() => { const o = [], x0 = 12, y0 = 15;   /* around the camp site (STARTS hq 8,11 + OFF = 14,17) */ for (let i = 0; i < 5; i++) { o.push([x0 + i, y0], [x0 + i, y0 + 4]); if (i > 0 && i < 4) o.push([x0, y0 + i], [x0 + 4, y0 + i]); } return o; })();
const CUT_GAP = new Set(['14,15', '15,15', '16,17']);   /* the way in (north, facing the highway) and a section blown out on the east */
const CUT_RUBBLE = new Set(['12,18', '13,19']);   /* fallen panels: rubble anyone can cross */
const CUT_SPOT = [[14.6, 16.4], [13.5, 16.5], [15.6, 16.2], [13.4, 17.6]].map(([x, y]) => ({ x, y }));   /* Marcus, Amy, Lena, Ben: just north of the camp site */
const CUT_LINES = {
  run: [[2, "Don't stop! They're right behind us!", 'shout'], [0, 'Keep moving! We need a place to hide!', 'shout'], [3, "I can't... my legs are done!", 'talk'], [1, "The whole world's turning to shit...", 'talk'], [2, "Off the road! Maybe they hate grass!", 'shout']],
  fight: [[3, "They do NOT hate grass!", 'shout'], [0, "Then we stop running. Lena, with me!", 'shout'], [2, "Finally. I've been wanting to hit something all day.", 'talk']],
  won: [[1, "Is it... dead-dead? Somebody poke it.", 'talk'], [0, "You poke it.", 'talk']],
  farm: [[2, "Look! An old farm. The fence is half down, but it's something.", 'talk'], [0, "A fence, open ground, a road out... we can settle here.", 'talk'], [3, "Soil's still good. I could grow something here.", 'talk'], [1, "And there's scrap lying all over the place. Enough to build a camp.", 'talk'], [0, "Then this is it. Let's build.", 'shout']],
  done: [[1, 'Home. For now.', 'talk'], [0, "Rest while you can. They'll come at night.", 'talk']],
};
function clearDoorways() {   /* 3D.120 owner's video: the old farm fence ran across the Camp's doorway, so tired people walked up, failed to get in, and shuffled in front of it forever. Nothing but a gate may stand on a building's doorway */
  let n = 0; for (const b of world.buildings) { const t = Wd.approachTile(b), k = t.x + ',' + t.y, w = world.walls.get(k); if (w && w.type !== 'gate') { world.walls.delete(k); n++; } } if (n) Wd.bump(world); return n; }
function cutFence() {   /* the broken farm fence: placed on any new game (with or without the cutscene) */
  const door = new Set(world.buildings.map((b) => { const t = Wd.approachTile(b); return t.x + ',' + t.y; }));
  for (const [x, y] of CUT_FENCE) { const k = x + ',' + y; if (CUT_GAP.has(k) || door.has(k) || world.walls.has(k) || Wd.buildingAt(world, x, y)) continue; const def = Wd.WALL_DEFS.wood, h = (x * 7 + y * 13) % 5;
    const hp = CUT_RUBBLE.has(k) ? 0 : Math.round(def.hp * (h < 2 ? .45 : h < 4 ? .7 : 1)); world.walls.set(k, { x, y, type: 'wood', hp, max: def.hp, ...(CUT_RUBBLE.has(k) ? { broken: true } : {}) }); }
  Wd.bump(world); for (const q of S.sv) if (q.w && solidWall(q.w.x, q.w.y)) { const t = Wd.nearestWalkable(world, Math.floor(q.w.x), Math.floor(q.w.y)); if (t) q.w = { x: t.x + .5, y: t.y + .5 }; }   /* 3D.106: nobody starts inside the fence line */
}
const cutZoom = () => Math.max(.7, Math.min(1.1, VW / 430)) * ((1.25));
function cutStart() {
  const C = S.cut = { ph: 'run', t: 0, line: 0, lineT: 0, cx: 0, cy: 0, hq: null, z0: cutZoom() };
  const hi = world.buildings.findIndex((b) => b.type === 'hq'); if (hi >= 0) C.hq = world.buildings.splice(hi, 1)[0]; Wd.bump(world);
  const crew = S.sv.slice(0, 4), y = Wd.HWY_Y + .5;
  crew.forEach((q, i) => { q.w = { x: 33.2 + i * .55, y: y + (i % 2 ? .95 : .15) }; q.mode = 'cutRun'; q.path = null; q.dest = null; q.moving = true; q.cutWp = 0; q.pv = { ...q.w }; });
  C.zs = [[37.2, y + .3, 'runner'], [38.3, y + 1.1, 'runner']].map(([x, yy, t]) => { spawn(x, yy, t); const z = S.z[S.z.length - 1]; z.w = { x, y: yy }; z.mode = 'zchase'; z.stateTicks = 0; z.cut = true; z.siege = false; return z; });
  C.cx = 34.2; C.cy = y + .5; centerOn(C.cx, C.cy, C.z0 * 1.5);
  document.getElementById('app').classList.add('cutMode'); cutUi(true);
}
function cutUi(on) {
  let el = document.getElementById('cutBox');
  if (!on) { if (el) el.remove(); document.getElementById('app').classList.remove('cutMode'); return; }
  if (!document.getElementById('cutCss')) { const st = document.createElement('style'); st.id = 'cutCss'; st.textContent = `#app.cutMode #plaque,#app.cutMode #quest,#app.cutMode #adv,#app.cutMode #lmenu,#app.cutMode #gauge,#app.cutMode #btnHome,#app.cutMode #zoom,#app.cutMode #alerts,#app.cutMode #bottom,#app.cutMode #requestBox,#app.cutMode #nudge{display:none!important}
#cutBox{position:fixed;inset:0;z-index:60;pointer-events:auto;touch-action:none}#cutBox .bar{position:absolute;left:0;right:0;height:11vh;background:#0d0a07;border-radius:0;transition:height .6s}#cutBox .bar.t{top:0}#cutBox .bar.b{bottom:0;height:15vh}
#cutBox .sub{position:absolute;left:0;right:0;bottom:3vh;padding:0 max(16px,env(safe-area-inset-left,0px));text-align:center;font:600 clamp(15px,2.4vw,21px)/1.3 system-ui,sans-serif;color:#f3e6c8;text-shadow:0 2px 0 #000;min-height:2.6em}#cutBox .sub b{color:#f0b84a}
#cutBox .ttl{position:absolute;top:2.6vh;left:0;right:0;text-align:center;font:800 clamp(14px,2vw,18px)/1 system-ui,sans-serif;letter-spacing:.2em;color:#bfae8a;text-transform:uppercase}
#cutBox .skip{position:absolute;right:max(14px,env(safe-area-inset-right,0px));top:calc(11vh + 10px);background:rgba(13,10,7,.75);color:#f3e6c8;border:1.5px solid #6d5a3c;border-radius:8px;padding:7px 14px;font:700 14px system-ui,sans-serif;cursor:pointer}
#cutBox.out .bar{height:0}#cutBox.out .sub,#cutBox.out .ttl,#cutBox.out .skip{opacity:0;transition:opacity .4s}`; document.head.appendChild(st); }
  if (!el) { el = document.createElement('div'); el.id = 'cutBox'; el.innerHTML = `<div class="bar t"></div><div class="bar b"></div><div class="ttl">${esc(S.townName || 'Zombie Haven')} · Day 1</div><div class="sub" id="cutSub"></div><button class="skip" id="cutSkip">Skip ▸▸</button>`; document.body.appendChild(el); el.querySelector('#cutSkip').onclick = (e) => { e.stopPropagation(); cutEnd(true); }; }
}
function cutSay(set) {   /* the next line of this phase, once the last one has had time to be read; returns true when the phase's lines are done */
  const C = S.cut, L = CUT_LINES[set]; if (C.lineT > 0) { C.lineT--; return false; } if (C.line >= L.length) return true;
  const [who, t, st] = L[C.line++], q = S.sv[who]; for (const o of S.sv) if (o.bark && o.bark.pri === 3) o.bark = null; if (q) { const f = Math.min(250, 100 + t.length * 2.5); q.bark = { t: GLASS ? t : t.toUpperCase(), st, f, f0: f, pri: 3 }; q.emo = null; C.lineT = f - 30; const sb = document.getElementById('cutSub'); if (sb) sb.innerHTML = `<b>${esc(q.name)}:</b> ${esc(t)}`; }
  return false;
}
function cutTick() {
  const C = S.cut; C.t++; const crew = S.sv.slice(0, 4);
  for (const q of S.sv) if (q.bark && --q.bark.f <= 0) q.bark = null;
  const rampTop = { x: Wd.HWY_RAMP_X + 1, y: Wd.HWY_Y + 1.5 }, rampBot = { x: Wd.HWY_RAMP_X + .9, y: Wd.HWY_Y + 5.4 };
  if (C.ph === 'run') {
    let home = 0;
    crew.forEach((q, i) => { const wp = [{ x: rampTop.x + (i % 2) * .5 + i * .15, y: rampTop.y - (i % 2) * .7 }, { x: rampBot.x + (i % 2) * .5, y: rampBot.y + i * .2 }, CUT_SPOT[i]];
      if (q.cutWp >= wp.length) { q.moving = false; q.mode = 'cutIdle'; home++; return; }
      const r = q.cutWp < 2 ? (stepToward(q, wp[q.cutWp], .03 - i * .0004) ? 'arrived' : 'moving') : followPath(q, wp[2], .05 - (i === 3 ? .002 : 0));
      if (r === 'arrived' || (q.cutWp < 2 && dist(q.w, wp[q.cutWp]) < .25)) q.cutWp++; else if (r === 'fail') { q.w = { ...wp[2] }; q.cutWp = 3; } });
    const lead = crew.reduce((a, q) => (q.w.x < a.w.x ? a : q), crew[0]), back = crew.reduce((a, q) => (q.w.x > a.w.x ? a : q), crew[0]), off = crew.every((q) => q.cutWp >= 2);
    for (const z of C.zs) { if (z.hp <= 0) continue; if (!off) { z.mode = 'zchase'; z.target = back; stepToward(z, { x: back.w.x + 1.3, y: back.w.y + (z === C.zs[0] ? -.2 : .5) }, .022 + (z === C.zs[0] ? .002 : 0)); } else cutZCome(z, .034); }
    cutSay('run'); if (home === crew.length) { C.ph = 'fight'; C.line = 0; C.lineT = 20; C.t = 0; C.said = false; }
  } else if (C.ph === 'fight') { cutFight(crew);
  } else if (C.ph === 'farm') { crew.forEach((q) => { q.moving = false; }); if (cutSay('farm')) { C.ph = 'build'; C.t = 0; crew.forEach((q, i) => { q.mode = 'hammer'; q.path = null; q.cutGo = i; }); SFX('build'); } }
  else if (C.ph === 'build') {
    const b = C.hq, site = b ? [{ x: b.x - .45, y: b.y + .5 }, { x: b.x + b.w + .45, y: b.y + 1 }, { x: b.x + 1, y: b.y - .45 }, { x: b.x + .3, y: b.y + b.h + .45 }] : CUT_SPOT;
    crew.forEach((q, i) => { const r = followPath(q, site[i], CHASE); if (r !== 'moving') q.moving = false; });
    if (C.t % 50 === 0 && b) floats.push({ w: { x: b.x + 1, y: b.y + 1 }, t: '🔨', col: '#f0d9a0', a: 50 });
    const sb = document.getElementById('cutSub'); if (sb && C.t === 1) sb.innerHTML = '<b>Building the camp…</b>';
    if (C.t >= 330) { cutPlaceHq(); C.ph = 'done'; C.t = 0; C.line = 0; C.lineT = 50; crew.forEach((q) => { q.mode = 'cutIdle'; q.moving = false; q.path = null; }); }
  } else if (C.ph === 'done') { if (cutSay('done') && C.t > 60) { C.ph = 'out'; C.t = 0; const bx = document.getElementById('cutBox'); if (bx) bx.classList.add('out'); } }
  else if (C.ph === 'out') { if (C.t >= 70) return cutEnd(false); }
  /* camera: follows the middle of the group, a little ahead of them; zooms back out at the end */
  const cx = crew.reduce((a, q) => a + q.w.x, 0) / crew.length, cy = crew.reduce((a, q) => a + q.w.y, 0) / crew.length, k = C.ph === 'run' ? .06 : .03;
  const lx = C.ph === 'run' ? -.3 : 0, ly = C.ph === 'run' ? .4 : C.ph === 'fight' ? -.1 : .5; C.cx += (cx + lx - C.cx) * k; C.cy += (cy + ly - C.cy) * k;
  const zt = C.ph === 'out' ? C.z0 : C.ph === 'run' ? C.z0 * 1.5 : C.ph === 'fight' ? C.z0 * 1.75 : C.z0 * 1.9; cam.z += (zt - cam.z) * (C.ph === 'out' ? .08 : .02); centerOn(C.cx, C.cy);
}
/* 3D.134 owner: a short fight in the opening. The two runners follow the crew down to the farm; Marcus and Lena turn and put them down
   (three swings each). It is staged: no damage numbers, no loot, nobody gets hurt. */
const CUT_ZSPOT = [{ x: 14.7, y: 15.8 }, { x: 15.75, y: 15.6 }];
function cutZCome(z, sp) { const i = S.cut.zs.indexOf(z), to = CUT_ZSPOT[i]; if (dist(z.w, to) < .2) { z.moving = false; return true; } const r = followPath(z, to, sp); z.mode = 'zchase'; z.moving = r === 'moving'; if (r === 'fail') { z.w = { ...to }; z.pv = { ...to }; } return r !== 'moving'; }
function cutFight(crew) {
  const C = S.cut, pair = [[crew[0], C.zs[0]], [crew[2], C.zs[1]]]; let alive = 0;
  if (!C.said) C.said = cutSay('fight');
  crew.forEach((q) => { q.moving = false; });
  for (const [q, z] of pair) {
    if (!S.z.includes(z)) { if (q.mode === 'attack') { q.mode = 'cutIdle'; q.target = null; } continue; } alive++;
    const there = cutZCome(z, .04); q.faceW = z.w;
    if (!there || (!C.said && C.line < 2)) { if (there) { z.mode = 'idle'; z.moving = false; } continue; }
    z.mode = 'zattack'; z.target = q; z.moving = false; q.target = z;
    q.cutSw = (q.cutSw || 0) - 1; if (q.cutSw <= 0) { q.cutSw = 46; q.mode = 'attack'; q.stateTicks = 14; q.swingN = (q.swingN || 0) + 1; }
    if (q.mode === 'attack') { q.stateTicks--; if (q.stateTicks === 3) { SFX('hit'); z.cutHits = (z.cutHits || 0) + 1; if (z.cutHits >= 4) { z.hp = 0; const k = S.z.indexOf(z); if (k >= 0) S.z.splice(k, 1); q.target = null; } } if (q.stateTicks <= -8) q.mode = 'cutIdle'; }
  }
  if (!alive) { if (!C.wonT) { C.wonT = 1; C.line = 0; C.lineT = 35; } crew.forEach((q) => { if (q.mode === 'attack') q.mode = 'cutIdle'; q.target = null; q.faceW = null; }); if (cutSay('won')) { C.ph = 'farm'; C.line = 0; C.lineT = 30; C.t = 0; } }
}
function cutPlaceHq() {
  const C = S.cut; if (!C || !C.hq) return; if (!world.buildings.includes(C.hq)) world.buildings.push(C.hq); Wd.bump(world);
  (window.ZH_BURSTS ||= []).push({ x: C.hq.x + C.hq.w / 2, y: C.hq.y + C.hq.h / 2, t: performance.now() }); SFX('reward'); banner('⛺ THE CAMP IS UP'); C.hq = null;
}
function cutEnd(skip) {
  const C = S.cut; if (!C) return; cutPlaceHq(); const crew = S.sv.slice(0, 4);
  crew.forEach((q, i) => { if (skip || !Wd.walkable(world, Math.floor(q.w.x), Math.floor(q.w.y))) q.w = { ...CUT_SPOT[i] }; q.pv = { ...q.w }; q.mode = 'free'; q.moving = false; q.path = null; q.dest = null; q.bark = null; q.cutWp = undefined; q.target = null; q.faceW = null; q.cutSw = undefined; q.stateTicks = 30 + i * 20; });
  for (const z of C.zs || []) if (z.hp > 0) { z.cut = false; z.mode = 'zleave'; z.retreat = true; z.target = null; z.path = null; z.leaveTo = tc(Wd.COLS - 1, Wd.HWY_Y + (z === C.zs[0] ? 0 : 1)); if (skip) z.hp = 0; }
  S.cut = null; cutUi(false); cam.z = C.z0; centerOn(7.5 + OFF, 10 + OFF); updateZoomLabel();
  spawn(5 + OFF, 3 + OFF, 'walker'); spawn(9 + OFF, 3 + OFF, 'crawler'); spawn(12 + OFF, 4 + OFF, 'walker');
  if (!S.mission) beginMission(); say('Day 1. Build up the camp before night falls.'); saveGame(); ui();
}
const INTRO_B = ['generator', 'fuelstill', 'ammobench', 'ammofactory', 'pump', 'greenhouse', 'coldstore', 'radio', 'armory', 'workshop', 'barracks', 'hospital', 'quarry', 'lumber', 'pallet'];
function introTick() {   /* every few seconds: what is new on screen? */
  if (tick % 60) return; S.intro = S.intro || {}; if (tick % 240 === 120) tutTick();
  if (S.day <= 1 && S.hour < 9) for (const q of S.sv) S.intro['job:' + q.job] = S.intro['job:' + q.job] || 1;   /* the starting crew needs no introduction */
  for (const z of S.z) if (z.hp > 0 && !z.zoo && z.mode !== 'appear') { if (z.type === 'boss') { if (intro('boss:' + (z.bk || 'mutant'))) return; } else if (intro('z:' + z.type)) return; }
  for (const q of S.sv) if (intro('job:' + q.job)) return;
  for (const b of world.buildings) if (INTRO_B.includes(b.type) && intro('b:' + b.type)) return;
  if (isNight() && intro('f:night')) return;
  if (S.sv.some((q) => q.mode === 'down') && intro('f:down')) return;
  if (S.day === S.nextBoss && S.hour >= 12 && S.hour < 21 && intro('f:boss')) return;
  if (rankConds() && S.day >= 2 && intro('f:rank')) return;
  if ((S.rank || 1) >= 2 && intro('f:ceiling')) return;
  if (S.day >= 2 && Object.keys(EXP_DEFS).some((k) => !expLocked(k)) && intro('f:explore')) return;
  if (gens().length && intro('f:power')) return;
  if (gunners().length && intro('f:ammo')) return;
  if ((S.rank || 1) >= 2 && intro('f:traps')) return;
  if ((S.convoys || 0) > 0 && intro('f:convoy')) return;
  if (world.buildings.some((b) => b.fire) && intro('f:fire')) return;
  if (S.trader && intro('f:trader')) return;
}
function fieldNotesHtml() {
  const seen = Object.keys(S.intro || {}).filter((k) => INTRO[k] || k.startsWith('b:'));
  const rows = seen.map((k) => { const d = INTRO[k] || ['🏗️', DEFS[k.slice(2)] ? DEFS[k.slice(2)].name : k, BDESC[k.slice(2)] || '', '']; return `<details class="card"><summary style="font-size:19px;color:var(--gold)">${d[0]} ${d[1]}</summary><div style="margin-top:4px">${d[2]}${d[3] ? '<br><b>Tip:</b> ' + d[3] : ''}</div></details>`; }).join('');
  return `<div class="card"><b>📓 Field Notes</b> <span class="sm">${seen.length} found</span><br><button class="act" id="gTips">${S.introOff ? 'Turn tips back on' : 'Turn tips off'}</button></div>` + (rows || '<div class="sm">Nothing yet: notes appear as you meet new zombies, people and buildings.</div>');
}
const GUIDE_TXT = [
  ['Moving around', 'Drag to look around, pinch to zoom. ⌖ jumps back to the town. 1× / 2× / 3× changes the game speed.'],
  ['Building', 'Build → pick a building → Build. Tap the ground where its front corner goes, nudge it with the arrows, ↻ turns it so the entrance faces the other way, then tap Build. Buildings cost wood, scrap and (later) stone, and a little scrap upkeep each day.'],
  ['Food and water', 'Everyone eats a daily ration: half food, half water. Rain Barrels and Collectors make water, Garden Plots make food. Watch the Town panel to see how many days you have left.'],
  ['Workers', 'Buildings with a work slot are staffed automatically by the right job (Farmer, Engineer, Medic, Cook…). A green dot means someone is on shift.'],
  ['Walls', 'Build → Defend: Wood Fence, Log Palisade (Lodge), Stone Wall (Fort) or Gate, then tap tiles around the town. Build a stronger wall on a weaker one to upgrade it. Close every gap to SEAL the perimeter. Broken walls turn to rubble; repair them with scrap. Zombies are bad at doors.'],
  ['Fighting', 'Guards, Police and Scavengers fight; everyone else very sensibly runs inside. A survivor knocked down bleeds out unless someone carries them to a medic in time, or a Medic treats them where they fell.'],
  ['Running the town', 'Beds give people a place to sleep; the Haven\'s level sets how many it can take in, so level up to grow. Hungry or thirsty people work at 70% and hit softer, and after two days with an empty store they start leaving. Newcomers come sooner to a town with spare beds, food and water. Someone down? Tap Send rescue. A boss? Tap Focus the boss (+30% damage). More people, more buildings, fewer zombies inside.'],
  ['Professions', 'Guards hold the line (+20% HP, 20% less damage). Police shoot further and hit raiders harder. Scavengers fetch wood and scrap. Medics patch people up (to 60%). Engineers build fastest. Cooks stretch rations. Farmers grow food and water. Mechanics run the machines. Civilians fill any job and carry twice the load. The wrong job works at 75%. Everyone is good at something.'],
  ['Gear', 'Tap a survivor → Gear to equip weapons, clothes and accessories from the stash. The Armory, crafting, the trader and expeditions bring new gear. Dress for the apocalypse you want.'],
  ['Explore', 'Send a squad from the Explore button; trips run in real time, even with the game closed. Losses are permanent. The world outside is big and rude.'],
  ['Renown and levels', 'Building, goals and victories earn Renown. The Haven grows through 20 levels in four eras (the City from level 16). A level needs enough people and buildings; then press Upgrade and wait (faster while you play). Levels 5→6 and 10→11 also need a Banner: clear a stronghold, beat or ally with a faction, or finish a civic project. Fame, apocalypse edition.'],
  ['The threat follows your level', 'The dead grow with your Haven level: each level brings slightly bigger nights, and new kinds turn up as you climb. Waiting never makes them stronger. Level up when you are ready for it.'],
  ['Power', 'Generators burn fuel (a Mechanic saves a quarter) for 4 power each. Water gets power first, the Ammo Factory last. Food and water never depend on it: a pump without power works by hand. Electricity: the luxury of kings.'],
  ['Ammo', 'They use rounds from the town stock (🔸); crossbows and melee never do. Out of ammo, a gunner clubs with the empty gun. An Ammo Bench with a Mechanic makes about 16 a day, a powered Ammo Factory about 64. Raiders and the Military Checkpoint drop rounds. Guns are hungry.'],
  ['Traps', 'Build → Defend: Spike Strips, Barbed Wire and the Noise Lure go on any open ground, best on the zombies\' paths. They wear out: re-arm with scrap before night. Scouts warn you at noon when a boss is coming. Rude surprises, on purpose.'],
];
function showGuide() {
  endBuildMode(true); closeP();
  $('ib').innerHTML = `<details class="card"><summary style="font-size:21px;color:var(--gold)">📓 Field Notes</summary><div style="margin-top:6px">${fieldNotesHtml()}</div></details>` + GUIDE_TXT.map(([t, x], i) => `<details class="card"${i === 0 ? ' open' : ''}><summary style="font-size:21px;color:var(--gold)">${t}</summary><div style="margin-top:4px">${x}</div></details>`).join('') + `<button class="act" id="gGoals">🎯 Goals</button><button class="act" id="gLog2">📜 Event log</button><div class="sm" style="margin-top:8px">V${VERSION}</div>`;
  showPanel('Guide'); $('gGoals').onclick = showGoals; $('gLog2').onclick = showLog; { const tb = $('gTips'); if (tb) tb.onclick = () => { S.introOff = !S.introOff; showGuide(); }; }
}
/* V2.20 tabbed panels */
let UIM = null; const uiIconCache = {};
/* V2.47 stat and need icons (assets/ui/stats.png, tools/art/build_stat_icons.py): 16-px pixel art; until the sheet exists, short text */
const SI_NAMES = ['str', 'agi', 'int', 'end', 'per', 'cha', 'hunger', 'thirst', 'fatigue'], SI_LABEL = { str: 'Strength', agi: 'Agility', int: 'Intelligence', end: 'Endurance', per: 'Perception', cha: 'Charisma', hunger: 'Hunger', thirst: 'Thirst', fatigue: 'Tired' }, SI_TEXT = { str: 'STR', agi: 'AGI', int: 'INT', end: 'END', per: 'PER', cha: 'CHA', hunger: 'Hunger', thirst: 'Thirst', fatigue: 'Tired' }, siCache = {};
function SI(k) {
  if (GLASS && window.ZHIcons) { const n = { str: 'strong', agi: 'speed', int: 'research', end: 'heart', per: 'search', cha: 'chat', hunger: 'food', thirst: 'water', fatigue: 'sleep' }[k]; if (n) return `<span class="si zi-si" data-si="${k}" title="${SI_LABEL[k]}">${ZHIcons.svg(n, 22)}</span>`; }
  if (siCache[k] !== undefined) return siCache[k]; const im = IMG.statIcons, i = SI_NAMES.indexOf(k); if (i < 0 || !okImg(im)) return `<span class="siT" data-si="${k}">${SI_TEXT[k] || k}</span>`;
  const c = document.createElement('canvas'), Z = 2; c.width = c.height = 16 * Z; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(im, i * 16, 0, 16, 16, 0, 0, 16 * Z, 16 * Z);
  return (siCache[k] = `<img class="pix si" data-si="${k}" src="${c.toDataURL()}" alt="${SI_LABEL[k]}" title="${SI_LABEL[k]}">`);
}
function wireSI(root) { root.querySelectorAll('[data-si]').forEach((e) => { e.onclick = (ev) => { ev.stopPropagation(); say(SI_LABEL[e.dataset.si] || e.dataset.si); }; }); }
function uiIcon(name) {   /* V2.32: DV2-style menu icons (assets/ui/icons.png), 2x crisp */
  if (GLASS && window.ZHIcons) { const n = { living: 'home', care: 'medic', train: 'train', defend: 'shield', road: 'road', demolish: 'demolish', events: 'bang', trader: 'shop', rating: 'star', supplies: 'box', haven: 'town', defense: 'shield', people: 'people', more: 'menu', gear: 'fight' }[name]; if (n) return `<span class="ti zi-ti">${ZHIcons.svg(n, 24)}</span>`; }   /* 3D.28 Glass: sticker icons, no pixel art */
  if (uiIconCache[name] !== undefined) return uiIconCache[name]; const im = IMG.uiIcons, i = UIM ? UIM.icons.indexOf(name) : -1; if (i < 0 || !okImg(im)) return '';
  const n = UIM.n, Z = 2, c = document.createElement('canvas'); c.width = c.height = n * Z; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(im, i * n, 0, n, n, 0, 0, n * Z, n * Z);
  return (uiIconCache[name] = `<img class="pix ti" src="${c.toDataURL()}" alt="">`);
}
function tabBar(list, cur) { return `<div class="tabs">${list.map(([k, l, ic]) => `<button data-tab="${k}" class="${k === cur ? 'on' : ''}">${ic ? uiIcon(ic) : ''}${l}</button>`).join('')}</div>`; }
/* V2.35 building status: one place that says what a building is doing and why, used by its panel and the resource panel */
function staffNote(b) {   // explicit staffing wording, from the real rule: only the listed professions can staff it; without one it runs at base output
  const d = DEFS[b.type], jobs = STAFF_JOBS[d.fam] || []; if (!d.slot || b.staff) return '';
  const have = S.sv.filter((q) => jobs.includes(q.job)), free = have.filter((q) => !q.post && q.hp > 0 && !['down', 'hospital', 'away', 'errand'].includes(q.mode));
  if (!have.length) return `No ${jobs.join(' or ')} in town. It runs at base output; change a survivor's profession (People → survivor → Profession) to staff it.`;
  if (!free.length) return `No ${jobs.join(' or ')} free: ${have.map((q) => esc(q.name) + (q.post ? ' works at the ' + DEFS[q.post.type].name : q.mode === 'away' ? ' is on an expedition' : ' is recovering')).join(', ')}.`;
  return `${esc(free[0].name)} (${free[0].job}) will take it shortly.`;
}
function bOutput(b) {   // expected per-day output and inputs (same formulas as the simulation, with the worker's measured share of the day)
  const d = DEFS[b.type], m = expectedMult(b), o = { out: [], use: [] };
  if (d.fam === 'water') o.out.push(['💧', d.out * m, '']); if (d.fam === 'farm') { o.out.push(['🍖', d.out * m, '']); o.use.push(['💧', d.waterUse, '🌱']); }
  if (d.fam === 'pallet') { const v = d.out * m * palletK(b); o.out.push(['🪵', v, '']); o.use.push(['⚙', v * PALLET_RATE, '']); }
  if (d.fam === 'scrap') o.out.push(['⚙', d.out * m * (researched('salvage') ? 1.25 : 1), '']); if (d.fam === 'research') o.out.push(['🔬', (d.out * workShare(b) + 4 * (1 - workShare(b))) * prodMult(b, false), 'research points']);
  const u = upkeepOf(b); if (u > 0) o.use.push(['⚙', u, '🔧']); return o;
}
function bStatus(b) {
  const d = DEFS[b.type];
  if (b.fire) return { c: '#ff9a3a', t: `On fire (${Math.round(b.fire)}%): no output until it is out` };
  if (b.burnt) return { c: 'var(--bad)', t: 'Burnt down: no output until repaired' };
  if (b.unpaid) return { c: 'var(--bad)', t: 'Half output: yesterday\'s upkeep was not paid' };
  if (d.fam === 'pallet' && b.palletWait) return { c: '#c98a1e', t: `Waiting: scrap is under ${palletFloor()} (it keeps that much for repairs)` };
  if (d.fam === 'farm' && b.dry) return { c: '#ffb36b', t: 'Short of water: the plants are not fully irrigated' };
  if (d.slot && !FAM_ICON[d.fam]) return b.staff ? (isWorking(b) ? { c: 'var(--good)', t: `${esc(b.staff.name)} on duty: ${d.fam === 'medical' ? 'faster, better care' : 'better meals'}` } : { c: 'var(--muted)', t: `Open, no one on duty: ${esc(b.staff.name)} is away (${esc(b.staff.why || b.staff.mode)})` }) : { c: '#ffb36b', t: 'Open, but no one is assigned to work here' };
  if (d.slot && !b.staff) return { c: '#ffb36b', t: 'Base output: no worker assigned' };
  if (d.slot && isWorking(b)) return { c: 'var(--good)', t: `Working: ${esc(b.staff.name)} adds +${Math.round((prodMult(b, true) / prodMult(b, false) - 1) * 100)}% right now` };
  if (d.slot) return { c: 'var(--muted)', t: `Base output right now: ${esc(b.staff.name)} is away (${esc(b.staff.why || b.staff.mode)})` };
  return { c: 'var(--good)', t: 'Open' };
}
function nextTier(b) { const d = DEFS[b.type]; return Object.entries(DEFS).filter(([, n]) => n.fam === d.fam && (n.tier || 1) > (d.tier || 1)).sort((a, z) => (a[1].tier || 1) - (z[1].tier || 1))[0] || null; }
let bTab = 'overview', bTabRef = null;
function showBuildingInfo(b, tab) {
  const d = DEFS[b.type], r = facilityRules[b.type]; selected = { kind: 'building', ref: b }; closeP();
  if (tab) bTab = tab; else if (bTabRef !== b) bTab = 'overview'; bTabRef = b;
  const tabs = [['overview', 'Info'], ['details', 'Details']]; if (isT(b, 'workshop')) tabs.push(['research', 'Research'], ['craft', 'Craft']);
  if (!tabs.some(([k]) => k === bTab)) bTab = 'overview';
  const jobs = STAFF_JOBS[d.fam] || [], cb = combos(b);
  const out = d.fam === 'lumber' || d.fam === 'quarry' ? `${d.fam === 'lumber' ? '🪵' : '🪨'} <b>+${(d.out * prodMult(b)).toFixed(1)}</b> ${d.fam === 'lumber' ? 'wood' : 'stone'} / day` : d.fam === 'scrap' ? `⚙ <b>+${(d.out * prodMult(b) * (researched('salvage') ? 1.25 : 1)).toFixed(1)}</b> scrap / day` : d.fam === 'research' ? `🔬 <b>+${((isWorking(b) ? d.out : 4) * prodMult(b)).toFixed(1)}</b> research / day` : d.train ? `📈 Trains <b>${STAT_NAME[d.train]}</b>` : d.fam === 'water' ? `💧 <b>+${(d.out * prodMult(b)).toFixed(1)}</b> water / day` : d.fam === 'farm' ? `🍖 <b>+${(d.out * prodMult(b)).toFixed(1)}</b> food / day <span class="sm">(💧 −${d.waterUse})</span>` : r ? `🛎 ${r.label}` : '';
  const staff = d.slot ? (b.staff ? `👷 ${esc(b.staff.name)} <span class="sm">${b.staff.job} Lv.${b.staff.l} · ${isWorking(b) ? (fitOf(b, b.staff) === 'wrong' ? '−25% (wrong job)' : '+' + Math.round((fitOf(b, b.staff) === 'civ' ? .25 : workBoost(b.staff)) * 100) + '%') : 'off shift'}</span>` : `👷 <span style="color:var(--bad)">No worker</span> <span class="sm">needs ${jobs.join(' / ')}</span>`) : '';
  let h = tabBar(tabs, bTab);
  if (bTab === 'overview') {
    let status = ''; const st = bStatus(b), io = bOutput(b), sn = staffNote(b);
    if ((!b.burnt)) { const hp = bHp(b); status += `<div class="row" style="gap:8px;align-items:center"><span class="sm">Health</span><div style="flex:1;height:10px;border:2px solid var(--cocoa);border-radius:99px;background:#fff8ec;overflow:hidden"><div style="height:100%;width:${Math.round(hp / b.max * 100)}%;background:${hp / b.max > .5 ? '#7fbf5a' : hp / b.max > .25 ? '#f2b84a' : '#e8584a'}"></div></div><span class="sm">${Math.ceil(hp)}/${b.max}</span></div>`; if (hp < b.max) status += `<button class="act go" id="bFix" ${canPay(fixCost(b)) ? '' : 'disabled'}>Repair now (${costShort(fixCost(b))})</button>`; }
    if (b.burnt) status += `${b.wrecked ? '<div style="color:var(--bad)">Wrecked by zombies</div>' : ''}<button class="act go" id="bRepair" ${canPay(repairCost(b)) ? '' : 'disabled'}>Repair (${costShort(repairCost(b))})</button>`;
    { const at = Wd.approachTile(b), blk = Wd.buildingAt(world, at.x, at.y); if (blk && blk !== b) status += `<div style="color:var(--bad)">🚪 Entrance blocked by the ${esc(DEFS[blk.type].name)}: move one of them</div>`; }   /* V2.34: older towns can still have this */
    if (DEFS[b.type].fam === 'research') status += toolsCard();   /* V3D.26 */
    if (isHousing(b) && !b.burnt) { const rs = (b.res || []).map((id) => S.sv.find((q) => q.id === id)).filter(Boolean), c = cap(b);   /* 3D.30 residents */
      status += `<div class="card"><div class="row"><b class="sp">Residents ${rs.length}/${c}</b>${rs.length < c && unhoused().length ? '<button class="act" id="hFill">Fill beds</button>' : ''}</div><div class="resRow">${rs.map((q) => `<div class="resP" data-rid="${q.id}">${portrait(q)}<span>${esc(q.name)}</span></div>`).join('')}${Array.from({ length: c - rs.length }, () => '<div class="resP empty" data-add="1"><div class="portrait">+</div><span>Empty bed</span></div>').join('')}</div></div>`; }
    if (DEFS[b.type].role === 'hq' && !b.burnt) { const n = unhoused().length, c = campCap(), over = n > c;   /* 3D.30 camp beds */
      status += `<div class="card campBeds${over ? ' over' : ''}"><div class="row"><b class="sp">Sleeping at the ${d.name}</b><b class="cbN">${n}/${c}</b></div><div class="sm">${over ? `${n - c} survivor${n - c > 1 ? 's' : ''} sleep rough (tired and unhappy). Build or upgrade housing and assign residents.` : 'Everyone without housing sleeps here.'}</div>${n ? '<button class="act" id="campHouse">Assign housing</button>' : ''}</div>`; }
    if (d.fam === 'pallet' && !b.burnt) status += `<div class="card"><div class="row" style="gap:8px;align-items:center"><span class="sp"><b>Keep at least ⚙ ${palletFloor()} scrap</b><div class="sm">Below that it stops, so repairs and upkeep come first.</div></span><button class="act" id="pfDn" style="min-width:44px">−</button><button class="act" id="pfUp" style="min-width:44px">+</button></div></div>`;
    if (b.type === 'generator') status += `<div class="card"><b>⚡ ${S.power ? 'Running' : 'Off: no fuel'}</b><div class="sm">${gens().length} generator${gens().length > 1 ? 's' : ''} burn ${(gens().length * 3).toFixed(0)} fuel a day · you have ⛽ ${Math.floor(S.fuel || 0)}${S.power ? ` (about ${Math.floor((S.fuel || 0) / (gens().length * 3))} days)` : ''}.</div></div>`;
    if (b.type === 'radio') status += `<div class="card"><b>📻 ${S.won ? 'The convoy came' : S.finale ? 'Signal on air: hold out!' : radioOk() ? 'Ready to transmit' : 'No power'}</b><div class="sm">${S.won ? '' : S.finale ? `Night ${S.finale.night} of ${FINALE_NIGHTS}.` : `To call the convoy: ★5 (you: ★${S.rank}), ${LEGACY_NEED} legacy goals (${legacyDone()} done) and a running Generator${radioOk() ? ' ✓' : ''}.`}</div>${signalReady() ? '<button class="act go" id="bSignal" style="width:100%">📻 Call for the convoy</button>' : ''}</div>`;
    { const d0 = DEFS[b.type], n = d0.next && DEFS[d0.next];   /* V3D.23 upgrades */
      if (b.upg) { const u = b.upg, m = jobMiss(u); status += `<div class="card"><b>⬆ Upgrading to ${DEFS[u.to].name}</b><div class="sm">${Object.keys(m).length ? 'Waiting for ' + costShort(m) + ': builders bring it from the stockpile, idle survivors gather what is missing.' : 'All materials in: building… ' + Math.round(100 * (1 - u.cons / u.dur)) + '%'}</div><button class="act" id="bUpX">Cancel upgrade</button></div>`; }
      else if (n) { const c = upgradeCheck(b); status += `<div class="card"><b>⬆ ${n.name}</b> <span class="sm">${costShort(bCost(n))}</span><div class="sm">${esc(BDESC[n.key] || '')}</div><button class="act${c.ok ? ' go' : ''}" id="bUp" ${c.ok ? '' : 'disabled'}>${c.ok ? 'Upgrade' + (canPay(bCost(n)) ? '' : ' (start now, gather the rest)') : '🔒 ' + esc(c.why)}</button></div>`; } }
    const worker = d.slot ? (b.staff ? `<div class="row" id="bWorker" style="gap:6px;cursor:pointer"><span>👷</span><span class="sp"><b>${esc(b.staff.name)}</b> <span class="sm">${b.staff.job} Lv.${b.staff.l} · on the job ${Math.round(workShare(b) * 100)}% of the day</span></span><span style="color:var(--gold)">›</span></div>`
      : `<div>👷 <span style="color:var(--bad)">No ${(STAFF_JOBS[d.fam] || []).join(' or ')} assigned</span><div class="sm">${sn}</div></div>`) : '';
    const assignBtn = d.slot ? `<button class="act go" id="bAssign" style="margin-top:6px">👷 ${b.staff ? 'Change worker' : 'Assign a worker'}</button> <button class="act" id="bWp" style="margin-top:6px">All workplaces</button>` : '';
    const fmt = (l, sign) => l.map(([ic, v, what]) => `<div>${ic} <b style="color:${sign > 0 ? 'var(--good)' : '#ffb36b'}">${sign > 0 ? '+' : '−'}${f1(v)}</b> <span class="sm">${what ? what + ' ' : ''}/ day</span></div>`).join('');
    const nt = nextTier(b), pd = (l, sign) => l.map(([ic, v]) => `${ic} ${sign > 0 ? '+' : '−'}${f1(v)}`).join('  ');   /* 3D.134 the same Makes / Uses table as the Build menu: icons, no words */
    h += `<div class="card row"><div style="width:84px;height:76px;display:flex;align-items:flex-end;justify-content:center">${bImg(b.type, 84, 76)}</div><div class="sp"><div style="color:${st.c}">● ${st.t}</div>${io.out.length || io.use.length ? `<div class="perDay" style="margin:4px 0 0"><div><small>Each day</small></div>${io.out.length ? `<div><span>Makes</span><b class="good">${pd(io.out, 1)}</b></div>` : ''}${io.use.length ? `<div><span>Uses</span><b class="bad">${pd(io.use, -1)}</b></div>` : ''}</div>` : ''}${!io.out.length && out ? `<div>${out}</div>` : ''}${cb.names.length ? `<div class="sm">★ ${cb.names.length} neighbour bonus${cb.names.length > 1 ? 'es' : ''}</div>` : ''}</div></div>`
      + (worker ? `<div class="card">${worker}${assignBtn}</div>` : '') + status + (['medic', 'clinic', 'hospital'].includes(b.type) ? patientsHtml(b) : '')
      + (nt ? `<div class="sm">Better in this family: <b>${nt[1].name}</b>${nt[1].out ? ` (${nt[1].out} / day base vs ${d.out || 0})` : ''}${buildLock(nt[0]) ? ' · ' + buildLock(nt[0]).replace(/^Needs/, 'needs') : DEFS[nt[0]].up ? ' · upgrade this building' : ' · available in Build'}</div>` : '');
    if (RUSH_FAMS.includes(d.fam) && !b.burnt) { const rc = rushCheck(b); h += `<button class="act" id="bRush" ${rc.ok ? '' : 'disabled'}>⚡ Rush · ${Math.round(rushRisk(b) * 100)}% fire risk</button>${rc.ok ? '' : `<div class="sm">${esc(rc.why)}</div>`}`; }
    h += `<div><button class="act" id="bMove">Move</button></div>`;
  } else if (bTab === 'details') {
    const users = S.sv.filter((q) => q.facility === b && ['goFacility', 'useFacility'].includes(q.mode)).map((q) => esc(q.name));
    h += `<div class="sm">${BDESC[b.type] || ''}</div><div class="kv card"><div><span>Running cost</span><span>⚙ ${upkeepOf(b).toFixed(1)} / day</span></div><div><span>Capacity</span><span>${facilityUsers(b)}/${cap(b)}</span></div><div><span>Quality</span><span>${b.q}</span></div><div><span>Appeal</span><span>${b.a}</span></div></div>`
      + (users.length ? `<div class="sm">Using it now: ${users.join(', ')}</div>` : '')
      + (cb.names.length ? `<div class="card"><b>Neighbour bonuses</b><br>★ ${cb.names.join('<br>★ ')}</div>` : '<div class="sm">Tip: related buildings next to each other give bonuses.</div>');
  } else if (bTab === 'research') {
    const rs = Object.entries(RESEARCH).map(([k, rr]) => { const done = researched(k), lock = !researched(rr.need), ok = !done && !lock && (S.rp || 0) >= rr.rp && S.mat >= rr.mat;
      return done ? '' : `<div class="card" ${ok ? `data-res="${k}"` : ''} style="${ok ? 'cursor:pointer' : 'opacity:.5'}"><div class="row"><span class="sp">${rr.name}</span><span class="sm">🔬${rr.rp} ⚙${rr.mat}</span></div><div class="sm">${rr.desc}${lock ? ' · needs ' + RESEARCH[rr.need].name : ''}</div></div>`; }).join('');
    const doneL = Object.entries(RESEARCH).filter(([k]) => researched(k)).map(([, rr]) => rr.name);
    h += `<div>🔬 <b>${Math.floor(S.rp || 0)}</b> research <span class="sm">(+${((isWorking(b) ? d.out : 4) * prodMult(b)).toFixed(1)}/day)</span></div>${rs || '<div class="sm">Everything is researched.</div>'}${doneL.length ? `<div class="sm">✔ ${doneL.join(', ')}</div>` : ''}`;
  } else if (bTab === 'craft') {
    const rc = Object.entries(RECIPES).filter(([k]) => researched(k)).flatMap(([, l]) => l).map((id) => `<div class="card row" data-craft="${id}" style="${S.mat >= craftCost(id) ? 'cursor:pointer' : 'opacity:.5'}">${itemIcon(id)}<div class="sp">${ITEMS[id].name}<div class="sm">${itemText(ITEMS[id])}${iQuip(id)}</div></div><span>⚙${craftCost(id)}</span></div>`).join('');
    h += `<div class="sm">Crafted gear goes to the stash.</div>${rc || '<div class="sm">Research Bladesmithing, Firearms, Body Armor or Gadgets to unlock recipes.</div>'}`;
  }
  $('ib').innerHTML = h; showPanel(d.name);
  $('ib').querySelectorAll('[data-tab]').forEach((x) => { x.onclick = () => showBuildingInfo(b, x.dataset.tab); });
  $('ib').querySelectorAll('[data-res]').forEach((x) => { x.onclick = () => { if (doResearch(x.dataset.res)) showBuildingInfo(b); }; });
  $('ib').querySelectorAll('[data-craft]').forEach((x) => { x.onclick = () => { if (craft(x.dataset.craft)) showBuildingInfo(b); }; });
  const rb = $('bRush'); if (rb) rb.onclick = () => { if (rush(b)) showBuildingInfo(b); };
  const rp = $('bRepair'); if (rp) rp.onclick = () => { if (repairBurnt(b)) showBuildingInfo(b); };
  { const fx = $('bFix'); if (fx) fx.onclick = () => { const c = fixCost(b); if (!canPay(c)) return; payCost(c); for (const [k, v] of Object.entries(c)) flow(k, 'Repairs', -v); b.hp = b.max; screenToast('🔨 ' + DEFS[b.type].name.toUpperCase() + ' REPAIRED'); ui(); showBuildingInfo(b); }; }
  $('ib').querySelectorAll('[data-u]').forEach((el) => { const q = S.sv[+el.dataset.u]; if (q) el.onclick = () => unitPanel(q); });
  const ba = $('bAssign'); if (ba) ba.onclick = () => showAssign(b); { const dn = $('pfDn'), up = $('pfUp'); if (dn) dn.onclick = () => { S.palletFloor = Math.max(0, palletFloor() - 5); showBuildingInfo(b); }; if (up) up.onclick = () => { S.palletFloor = Math.min(200, palletFloor() + 5); showBuildingInfo(b); }; } { const w = $('bWp'); if (w) w.onclick = () => showJobs(() => showBuildingInfo(b), 'work'); }
  { const hf = $('hFill'); if (hf) hf.onclick = () => { fillBeds(b); saveGame(); showBuildingInfo(b); }; $('ib').querySelectorAll('.resP').forEach((el) => { el.onclick = () => showResidents(b); });
    const ch = $('campHouse'); if (ch) ch.onclick = () => { const h = world.buildings.find((q) => isHousing(q) && !q.burnt && (q.res || []).length < cap(q)); if (h) showResidents(h); else { say('No empty beds: build or upgrade a Tent'); bCat = 'live'; showBuild(); } }; }
  const bw = $('bWorker'); if (bw && b.staff) bw.onclick = () => { const q = b.staff; closeP(); selected = { kind: 'unit', ref: q }; unitPanel(q); };   /* V2.35: tap the worker to open their panel */
  $('ib').querySelectorAll('[data-ctool]').forEach((x) => { x.onclick = () => { craftTool(x.dataset.ctool); showBuildingInfo(b); }; }); { const sg = $('bSignal'); if (sg) sg.onclick = () => { closeP(); startFinale(); }; }
  { const up = $('bUp'); if (up) up.onclick = () => { upgradeBuilding(b); showBuildingInfo(b); }; const ux = $('bUpX'); if (ux) ux.onclick = () => { cancelUpgrade(b); showBuildingInfo(b); }; }
  const mv = $('bMove'); if (mv) mv.onclick = () => moveBuilding(b); const dm = $('bDem'); if (dm) dm.onclick = () => demolish(b);
}

