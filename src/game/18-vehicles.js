/* ---- 3D.109 Vehicles (owner 11 Nov: "Do all three"). From the Explosives and Vehicles study: the Hand Cart is built from the
   start; the Pickup Truck and the Armored Van are found as wrecks on trips, towed home and restored in a Garage (one motor
   vehicle per Garage). A trip can take one vehicle: it costs fuel, wears it, and a worn one can break down on the road (the
   squad walks home). A Mechanic repairs them. Loot bonuses stay small (+20% at most) so vehicles don't rush the late game. ---- */
const VEH = {
  cart:   { name: 'Hand Cart',    icon: '🛒', fuel: 0, loot: 1.1, speed: 1,   seats: 0, safe: 1,   wear: 6,  build: { wood: 6, mat: 2 }, desc: 'No fuel; +10% loot. Runs on complaints.' },
  pickup: { name: 'Pickup Truck', icon: '🛻', fuel: 2, loot: 1.2, speed: .6,  seats: 1, safe: .85, wear: 12, restore: { mat: 12, fuel: 2 }, days: 3, desc: '2 fuel a trip: trips 40% shorter, one more seat, +20% loot. Still smells of somebody\'s dog.' },
  van:    { name: 'Armored Van',  icon: '🚐', fuel: 4, loot: 1.2, speed: .75, seats: 1, safe: .5,  wear: 10, restore: { mat: 20, stone: 6, fuel: 3 }, days: 4, desc: '4 fuel a trip: half the injuries, one more seat, +20% loot. The family car of the apocalypse.' },
};
const VEH_FIND = { pickup: ['gasstation', 'warehouse', 'houses', 'mall', 'military'], van: ['military', 'mall', 'warehouse'] };
const vehOf = (k) => (S.veh || {})[k];
const vehReady = (k) => { const v = vehOf(k); return !!(v && !v.broken && !(v.restoring > 0) && !v.waiting && (S.fuel || 0) >= VEH[k].fuel); };
const vehWhyNot = (k) => { const v = vehOf(k); if (!v) return 'Not found yet'; if (v.waiting) return 'Waiting at the gate: needs a free Garage' + (v.need ? ' and ' + v.need : ''); if (v.restoring > 0) return `Being restored: ${v.restoring} day${v.restoring > 1 ? 's' : ''} left`; if (v.broken) return 'Broken down: needs a repair'; if ((S.fuel || 0) < VEH[k].fuel) return `Needs ${VEH[k].fuel} fuel`; return ''; };
const garageRoom = () => bOf('garage').filter((b) => !b.unpaid).length - Object.keys(VEH).filter((k) => k !== 'cart' && vehOf(k) && !vehOf(k).waiting).length;
const vehSeats = () => (expSel.veh && VEH[expSel.veh] && vehReady(expSel.veh) && !(EXP_DEFS[expSel.dest] || {}).stronghold ? VEH[expSel.veh].seats : 0);
const expMax = () => ((EXP_DEFS[expSel.dest] || {}).stronghold) ? shCap(!!EXP_DEFS[expSel.dest].raid) : EXP_MAX_SQUAD + vehSeats();   /* 3D.114 strongholds up to 6, raids up to 8 */
const vehLoot = (t) => (t.veh && !t.vehBroke ? VEH[t.veh].loot : 1);
const vehSafe = (t) => (t.veh && !t.vehBroke ? VEH[t.veh].safe : 1);
function vehBuildCart() { if (vehOf('cart')) return false; const c = VEH.cart.build; if ((S.wood || 0) < c.wood || S.mat < c.mat) { say(`A Hand Cart needs ${c.wood} wood and ${c.mat} scrap.`); return false; } S.wood -= c.wood; S.mat -= c.mat; S.veh = S.veh || {}; S.veh.cart = { wear: 0 }; say('🛒 The Hand Cart is ready for trips.', true); ui(); return true; }
function vehRepair(k) { const v = vehOf(k); if (!v || !v.broken) return false; const cost = k === 'cart' ? 2 : k === 'pickup' ? 6 : 10; if (!S.sv.some((q) => q.job === 'Mechanic' && q.hp > 0) && k !== 'cart') { say('Repairs need a Mechanic in the Haven.'); return false; } if (S.mat < cost) { say(`The repair needs ${cost} scrap.`); return false; } S.mat -= cost; v.broken = false; v.wear = 20; say(`🔧 The ${VEH[k].name} is running again.`, true); ui(); return true; }
function vehDepart(t, k) {   /* called when a trip leaves */
  if (!k || !VEH[k] || !vehReady(k) || (EXP_DEFS[t.dest] || {}).stronghold) return; t.veh = k; S.fuel -= VEH[k].fuel; t.dur = Math.round(t.dur * VEH[k].speed);
  t.log.push(`They took the ${VEH[k].name}.`); if (k !== 'cart') vehDrive(k, false);
}
function vehStage(t) {   /* each stage a worn vehicle may break down */
  if (!t.veh || t.vehBroke) return; const v = vehOf(t.veh); if (!v) return; const ch = Math.max(0, (v.wear - 50) / 400);
  if (rnd() < ch) { t.vehBroke = true; v.broken = true; t.dur = Math.round(t.dur / VEH[t.veh].speed); t.log.push(`Stage ${t.stage}: the ${VEH[t.veh].name} broke down. The squad leaves it and walks; someone will tow it home.`); }
}
function vehFind(t) {   /* last stage of a trip: a wreck that might run again */
  if (t.found) return; for (const k of ['van', 'pickup']) { if (vehOf(k) || !(VEH_FIND[k] || []).includes(t.dest)) continue; const ch = k === 'pickup' ? ((S.lvl || 1) >= 3 ? .22 : 0) : ((S.lvl || 1) >= 6 ? (t.dest === 'military' ? .3 : .12) : 0);
    if (rnd() < ch) { t.found = k; t.log.push(`They found a ${VEH[k].name} that might run again, and towed it home.`); return; } }
}
function vehArrive(k, why) {   /* a found vehicle reaches the Haven: restored in a free Garage, or it waits at the gate */
  S.veh = S.veh || {}; S.veh[k] = { wear: 30, waiting: true }; vehStartRestore(k); const v = S.veh[k];
  note('important', `${VEH[k].icon} ${why}: a ${VEH[k].name}! ` + (v.waiting ? `It waits at the gate until there is a free Garage${v.need ? ' and ' + v.need : ''}.` : `A Garage is restoring it (${v.restoring} days).`), { icon: VEH[k].icon });
}
function vehStartRestore(k) { const v = vehOf(k); if (!v || !v.waiting) return; if (garageRoom() <= 0) { v.need = ''; return; }
  const c = VEH[k].restore, miss = Object.entries(c).filter(([r, n]) => (r === 'mat' ? S.mat : S[r] || 0) < n); if (miss.length) { v.need = miss.map(([r, n]) => `${n} ${RES_NAME[r] || r}`).join(', '); return; }
  for (const [r, n] of Object.entries(c)) { if (r === 'mat') S.mat -= n; else S[r] -= n; } v.waiting = false; v.need = ''; v.restoring = VEH[k].days; }
function vehDaily() { for (const k of Object.keys(VEH)) { const v = vehOf(k); if (!v) continue; if (v.waiting) vehStartRestore(k);
    else if (v.restoring > 0) { v.restoring -= S.sv.some((q) => q.job === 'Mechanic' && q.hp > 0) ? 2 : 1; if (v.restoring <= 0) { v.restoring = 0; note('important', `${VEH[k].icon} The ${VEH[k].name} is restored and ready for trips.`, { icon: VEH[k].icon }); } } } }
function vehReturn(t) {
  if (t.veh) { const v = vehOf(t.veh); if (v) { v.wear = Math.min(100, (v.wear || 0) + VEH[t.veh].wear * (t.dest === 'military' ? 1.5 : 1)); if (v.wear >= 100) v.broken = true; } if (!t.vehBroke && t.veh !== 'cart') vehDrive(t.veh, true); }
  if (t.found) setTimeout(() => vehArrive(t.found, 'The squad brought home'), 1200);
}
function vehDrive(k, back) {   /* the vehicle drives between its Garage and the highway (the renderer shows it) */
  const g = bOf('garage')[0]; if (!g) return; const at = Wd.approachTile(g), end = { x: COLS - 1, y: Wd.HWY_Y }, p = Wd.findPath(world, at, end); if (!p || !p.length) return;
  const path = [at, ...p].map((q) => ({ x: q.x + .5, y: q.y + .5 })); S.drive = { k, path: back ? path.reverse() : path, i: 0 };
}
function driveTick() { const d = S.drive; if (!d) return; d.i += .055; if (d.i >= d.path.length - 1) S.drive = null; }
function vehCard() {   /* the Explore screen: pick a vehicle for the trip, build the cart, repair */
  const d = EXP_DEFS[expSel.dest] || {}; if (d.stronghold) return '';
  const own = Object.keys(VEH).filter((k) => vehOf(k)); if (expSel.veh && !vehReady(expSel.veh)) expSel.veh = null;
  const btn = (k) => { const ok = vehReady(k), why = vehWhyNot(k), v = vehOf(k); return `<button class="vehB ${expSel.veh === k ? 'on' : ''}" data-veh="${k}" ${ok ? '' : 'disabled'} title="${esc(why || VEH[k].desc)}">${VEH[k].icon} ${VEH[k].name}<small>${ok ? (VEH[k].fuel ? VEH[k].fuel + ' fuel · ' : '') + 'wear ' + Math.round(v.wear || 0) + '%' : esc(why)}</small></button>`; };
  const extra = []; if (!vehOf('cart')) extra.push(`<button class="vehB" data-vbuild="cart">🛒 Build a Hand Cart<small>${VEH.cart.build.wood} wood · ${VEH.cart.build.mat} scrap</small></button>`);
  for (const k of own) if (vehOf(k).broken) extra.push(`<button class="vehB" data-vfix="${k}">🔧 Repair the ${VEH[k].name}<small>${k === 'cart' ? 2 : k === 'pickup' ? 6 : 10} scrap${k === 'cart' ? '' : ' · needs a Mechanic'}</small></button>`);
  return `<div class="etLine vehLine"><span class="etK">Vehicle</span><button class="vehB ${!expSel.veh ? 'on' : ''}" data-veh="">🚶 On foot</button>${own.map(btn).join('')}${extra.join('')}</div>${expSel.veh ? `<div class="sm">${esc(VEH[expSel.veh].desc)}</div>` : ''}`;
}
