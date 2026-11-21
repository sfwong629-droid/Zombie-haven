/* ---------------- sprites ---------------- */

const EMOJI = { Chopping: '🪓', Mining: '⛏', Salvaging: '🔧', Searching: '🧵', Building: '🔨', Eating: '🍖', Drinking: '💧', Resting: '💤', Treatment: '💊', Shopping: '🛒', 'Getting food': '🥫', Working: '🔧', Firefighting: '🧯' };
const textCache = new Map();
function textImg(txt, font, col) {   /* V2.18: text and emoji are rasterised once and stamped (fillText was ~16% of frame time) */
  const key = txt + '|' + font + '|' + col + '|' + DPR; let c = textCache.get(key); if (c) return c;
  const m = document.createElement('canvas').getContext('2d'); m.font = font; const px = parseFloat(font.match(/(\d+(\.\d+)?)px/)[1]), w = Math.ceil(m.measureText(txt).width) + 4 + Math.ceil(px * .5), h = Math.ceil(px * 1.4) + 4;
  const cv = document.createElement('canvas'); cv.width = Math.ceil(w * DPR); cv.height = Math.ceil(h * DPR); const g = cv.getContext('2d'); g.scale(DPR, DPR); g.font = font; g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; if (/Fredoka/.test(font)) { g.lineJoin = 'round'; g.lineWidth = Math.max(2.5, px * .24); g.strokeStyle = '#3a2a22'; g.strokeText(txt, w / 2, px * 1.1 + 2); }   /* 3D.124 owner: names, timers and counts in the game's rounded font with an ink outline (was the old pixel font) */ g.fillText(txt, w / 2, px * 1.1 + 2);
  if (textCache.size > 300) textCache.clear(); c = { cv, w, h, base: px * 1.1 + 2 }; textCache.set(key, c); return c;
}
function stampText(txt, x, y, font, col) { const c = textImg(txt, font, col); ctx.imageSmoothingEnabled = false; ctx.drawImage(c.cv, Math.round((x - c.w / 2) * DPR) / DPR, Math.round((y - c.base) * DPR) / DPR, c.cv.width / DPR, c.cv.height / DPR); ctx.imageSmoothingEnabled = true; }
const TAGTXT = { Chopping: 'Chopping', Mining: 'Mining', Salvaging: 'Salvaging', Searching: 'Searching', Building: 'Building', Eating: 'Eating', Drinking: 'Drinking', Resting: 'Resting', Treatment: 'Treatment', Shopping: 'Shopping', 'Getting food': 'Foraging', Working: 'Working', Firefighting: 'Firefighting' };
const tagCache = new Map();
function statusTag(x, y, txt, col) {   /* V2.25: DV2-style status plate above a character */
  const fs = Math.round(Math.max(13, 13 * cam.z)), cozy = document.documentElement.classList.contains('cozy'), key = (cozy ? 'z' + hudU() : '') + txt + col + fs + DPR; let c = tagCache.get(key);
  if (!c && cozy) {   /* 3D.61 owner: status tags (Fighting, Working, Sleeping…) use the chat bubble's size and box: white rounded box, soft shadow, the same font; fights are red with white text like fight shouts */
    const u = hudU() * HUD_SMALL, f = Math.round(11 * u), fight = col === '#e8603a', font = `800 ${f}px Manrope, system-ui, sans-serif`, m = document.createElement('canvas').getContext('2d'); m.font = font;
    const padX = 9 * u, padY = 6 * u, dot = fight ? 0 : f * .62, h = Math.round(f * 1.12 + padY * 2), w = Math.ceil(m.measureText(txt).width + padX * 2 + (dot ? dot + 4 * u : 0)), r = h / 2, sh = 8 * u, cv = document.createElement('canvas');
    cv.width = Math.ceil((w + sh * 2) * DPR); cv.height = Math.ceil((h + sh * 2) * DPR);
    const g = cv.getContext('2d'); g.scale(DPR, DPR); g.translate(sh, sh * .6);
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = sh; g.shadowOffsetY = 3 * u; g.beginPath(); g.roundRect(0, 0, w, h, r); g.fillStyle = fight ? '#E5483A' : 'rgba(255,255,255,.97)'; g.fill();
    g.shadowColor = 'transparent'; g.lineWidth = 1.1 * u; g.strokeStyle = fight ? 'rgba(255,255,255,.35)' : 'rgba(30,36,42,.18)'; g.stroke();
    if (dot) { g.beginPath(); g.arc(padX + dot / 2, h / 2, dot / 2, 0, 7); g.fillStyle = col; g.fill(); g.lineWidth = 1; g.strokeStyle = 'rgba(30,36,42,.35)'; g.stroke(); }
    g.font = font; g.fillStyle = fight ? '#FFFFFF' : '#1E2328'; g.textBaseline = 'middle'; g.fillText(txt, padX + (dot ? dot + 4 * u : 0), h / 2 + .5 * u);
    c = { cv, w: w + sh * 2, h: h + sh * 2, smooth: true }; tagCache.set(key, c);
  }
  if (!c) { const font = `600 ${Math.round((fs) * .85)}px Fredoka, Nunito, sans-serif`, m = document.createElement('canvas').getContext('2d'); m.font = font; const w = Math.ceil(m.measureText(txt).width) + 8, h = fs + 5;
    const cv = document.createElement('canvas'); cv.width = Math.ceil(w * DPR); cv.height = Math.ceil(h * DPR); const g = cv.getContext('2d'); g.scale(DPR, DPR);
    g.fillStyle = '#1b2016e6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#6e5638'; g.lineWidth = 1.5; g.strokeRect(.75, .75, w - 1.5, h - 1.5); g.font = font; g.fillStyle = '#000'; g.textAlign = 'center'; g.fillText(txt, w / 2 + 1, fs + 1.5); g.fillStyle = col; g.fillText(txt, w / 2, fs + .5);
    if (tagCache.size > 120) tagCache.clear(); c = { cv, w, h }; tagCache.set(key, c); }
  ctx.imageSmoothingEnabled = !!c.smooth; ctx.drawImage(c.cv, Math.round((x - c.w / 2) * DPR) / DPR, Math.round((y - c.h) * DPR) / DPR, c.cv.width / DPR, c.cv.height / DPR); ctx.imageSmoothingEnabled = true;
}
function bubble(p, txt) { const ic = (window.ZHIcons) && ZHIcons.EMOJI[txt.replace(/\uFE0F/g, '')] , im = ic && ZHIcons.img(ic); if (im && im.complete) { const u = hudU() * HUD_SMALL, r = 10 * u; ctx.save(); ctx.beginPath(); ctx.arc(p.x, p.y - r, r, 0, 7); ctx.fillStyle = '#fff8ec'; ctx.fill(); ctx.lineWidth = 2 * u; ctx.strokeStyle = '#161616'; ctx.stroke(); ctx.drawImage(im, p.x - 7 * u, p.y - r - 7 * u, 14 * u, 14 * u); ctx.restore(); return; } stampText(txt, p.x, p.y, `${Math.round(Math.max(11, 13 * cam.z))}px sans-serif`, '#fff'); }
const FACE = new WeakMap();   // per-unit facing, kept out of save data: { lx, ly, right, up }
function facing(o) {   // screen-space facing from movement (or from the target while fighting)
  let st = FACE.get(o); if (!st) { st = { lx: o.w.x, ly: o.w.y, right: false, up: false }; FACE.set(o, st); }
  const t = (o.mode === 'attack' || o.mode === 'chase') && o.target && o.target.w;
  const sx = t ? (t.x - t.y) - (o.w.x - o.w.y) : (o.w.x - o.w.y) - (st.lx - st.ly);   // screen x grows with (wx - wy)
  const sy = t ? (t.x + t.y) - (o.w.x + o.w.y) : (o.w.x + o.w.y) - (st.lx + st.ly);   // screen y grows with (wx + wy)
  if (Math.abs(sx) > 0.004) st.right = sx > 0;
  if (Math.abs(sy) > 0.004) st.up = sy < 0;
  st.lx = o.w.x; st.ly = o.w.y; return st;
}
const OPEN_AIR = new Set(['water', 'well', 'farm', 'field', 'track', 'range', 'barrel', 'irrig', 'crates', 'bench', 'scrapyard', 'lumber', 'pallet', 'quarry', 'bonfire', 'sparring', 'radio']);   /* 3D.64 balance study: people 'hid' in a Rain Barrel or a Workbench; open structures are no shelter */   // outdoor structures: survivors stay visible while using them
function insideBuilding(s) {   // working, using a facility or in care, standing at an enclosed building's door point = inside
  if (!['work', 'useFacility', 'hospital', 'hiding'].includes(s.mode)) return null;
  const b = s.mode === 'work' ? s.post : s.mode === 'useFacility' ? s.facility : s.mode === 'hiding' ? s.hideAt : world.buildings.find((q) => Iso.footprintContains(q, s.w.x, s.w.y));
  if (!b || OPEN_AIR.has(b.type) || !world.buildings.includes(b)) return null;
  const d = Wd.doorPoint(b); return Math.hypot(s.w.x - d.x, s.w.y - d.y) < .9 ? b : null;   /* 3D.61 owner: sleepers kept off the door by the crowd were left lying outside the Camp (was .3) */
}
/* V3 characters: per-job DV2-style sheets (js/chars.js), animation by state, the equipped weapon drawn in the hand */
const ANIM_T = { idle: 30, walk: 6, carry: 7, punch: 6, blunt: 6, shoot: 6 };
function humanAnim(o, st) {
  const kind = o.eq && o.eq.weapon && ITEMS[o.eq.weapon] ? ITEMS[o.eq.weapon].kind : null;
  if (o.mode === 'down' || o.mode === 'zdown') { st.downT = (st.downT || 0) + 1; return ['collapse', Math.min(3, Math.floor(st.downT / 9))]; } st.downT = 0;
  const atk = o.mode === 'attack' || o.mode === 'recover' || o.mode === 'zattack';
  if (atk) {   /* V2.33: one swing per hit — ready stance, wind-up, the strike exactly when the damage lands, follow-through, back to ready */
    const a = kind === 'gun' || kind === 'bow' ? 'shoot' : kind ? 'blunt' : 'punch';
    if (o.mode === 'attack' || o.mode === 'zattack') { const t = o.stateTicks || 0; return t > 12 ? ['idle', 0] : t > 3 ? [a, 0] : [a, 1]; }
    const el = (o.recDur || 40) - (o.stateTicks || 0); return el < 10 ? [a, 2] : ['idle', 0];
  }
  if (o.mode === 'work' && o.post && OPEN_AIR.has(o.post.type)) { const t = (tick + (o.phase || 0) * 7) % 96; return t < 14 ? ['blunt', 0] : t < 20 ? ['blunt', 1] : t < 30 ? ['blunt', 2] : ['idle', 0]; }   /* V2.36: hoeing / hauling while on shift at an outdoor post */
  if (o.carrying || o.carriedLoot) return ['carry', o.moving === false ? 0 : Math.floor((tick + (o.phase || 0)) / ANIM_T.carry)];
  if (o.moving || o.mode === 'walk' || o.mode === 'rsneak' || o.mode === 'rflee' || o.mode === 'zchase') return ['walk', Math.floor((tick + (o.phase || 0)) / ANIM_T.walk)];
  return ['idle', Math.floor((tick + (o.phase || 0)) / ANIM_T.idle)];
}

function bleedRing(s, p, dy = 0, dx = 0) {   /* the bleed-out timer; while carried it rides above the cart bed */
  const tw = TWs(); p = { x: p.x + dx, y: p.y }; const mx = bleedMax() + (s.bleed > bleedMax() ? s.bleed - bleedMax() : 0), fr = Math.max(0, Math.min(1, s.bleed / mx)), r = 13 * cam.z, cy = p.y - CHAR_H * tw * .45 + dy, carried = beingCarried(s); ctx.lineWidth = 3 * cam.z; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.arc(p.x, cy, r, 0, 7); ctx.stroke(); ctx.strokeStyle = carried ? '#6fc3ff' : fr < .25 ? '#ff3b30' : '#ffb347'; ctx.beginPath(); ctx.arc(p.x, cy, r, -Math.PI / 2, -Math.PI / 2 + fr * Math.PI * 2); ctx.stroke(); stampText(String(Math.ceil(s.bleed / 60)), p.x, cy + 5 * cam.z, `600 ${Math.round(13 * .95 * hudU())}px Fredoka, Nunito, sans-serif`, '#fff'); }
/* V2.37 combat readability: hit sparks on real hits, contextual HP bars, who-attacks-whom for the selected fighter */
function hitSpark(o, p) {
  if (!(o.hitT > 0)) return; const tw = TWs(), k = o.hitT / 9, cy = p.y - CHAR_H * tw * .55, r = (4 + 6 * (1 - k)) * cam.z;
  ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.4); ctx.strokeStyle = o.job !== undefined ? '#ff6e62' : '#fff3b0'; ctx.lineWidth = 2 * cam.z; ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + .3; ctx.moveTo(p.x + Math.cos(a) * r * .4, cy + Math.sin(a) * r * .4); ctx.lineTo(p.x + Math.cos(a) * r, cy + Math.sin(a) * r); }
  ctx.stroke(); ctx.restore(); o.hitT--;
}
const engaged = (z) => z.hp < z.max || (z.target && z.target.job !== undefined && ['zchase', 'zattack', 'zrecover'].includes(z.mode) && dist(z.w, z.target.w) < 3);
const underAttack = (s) => S.z.some((z) => z.hp > 0 && z.target === s && ['zattack', 'zrecover'].includes(z.mode) && dist(z.w, s.w) < 1.6);
function drawCombatFocus() {   // selected fighter: line to the target, ring on it, weapon range (green = in range)
  if (!selected || selected.kind !== 'unit') return; const s = selected.ref; if (!S.sv.includes(s) || insideBuilding(s)) return;
  const tw = TWs(), p = project(s.w.x, s.w.y), w = weaponOf(s), rg = weaponRange(w), t = s.target && s.target.hp > 0 && ['chase', 'attack', 'recover'].includes(s.mode) ? s.target : null, inR = t && dist(s.w, t.w) <= rg + .1;
  ctx.save(); if (t || isFighter(s)) { ctx.strokeStyle = t ? (inR ? 'rgba(127,211,90,.55)' : 'rgba(255,200,90,.45)') : 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(p.x, p.y, rg * tw * .707, rg * tw * .354, 0, 0, 7); ctx.stroke(); }
  if (t) { const q = project(t.w.x, t.w.y); ctx.strokeStyle = inR ? '#7fd35a' : '#ffc85a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y - CHAR_H * tw * .5); ctx.lineTo(q.x, q.y - CHAR_H * tw * .5); ctx.stroke(); ctx.setLineDash([]); spinArrow(q.x, q.y - CHAR_H * tw - HUD_LIFT * hudU() - 14 * hudU(), '#ff5a4a', hudU());
    stampText(inR ? 'IN RANGE' : 'CLOSING IN', q.x, q.y + .3 * tw, `600 ${Math.round(12 * .95 * hudU())}px Fredoka, Nunito, sans-serif`, inR ? '#bff0a0' : '#ffe0a0'); }
  ctx.restore();
}
/* V3D.11 cozy combat HUD (3D mode): clay-pill HP bars with a white trail of recent damage, "cozy pop" numbers,
   and a Dungeon Village 2 style LEVEL UP burst over the head. The 2D look keeps the old flat bars and pixel font. */

const hudU = () => Math.max(.72, Math.min(1.5, cam.z * .82)), HUD_SMALL = .8;   /* V3D.21: HP bars, damage numbers, LEVEL UP and emoji bubbles 20% smaller */
/* 3D.122 owner: no rings anywhere: a small arrow over the head marks who is selected or targeted, and it spins */
function spinArrow(x, y, col, sz = 1) { const t = performance.now() / 1000, c = Math.cos(t * 3.2), w = 7 * sz * Math.max(.12, Math.abs(c)), yy = y - Math.sin(t * 4) * 2.2 * sz, h = 9 * sz;
  ctx.save(); ctx.beginPath(); ctx.moveTo(x - w, yy - h); ctx.lineTo(x + w, yy - h); ctx.lineTo(x, yy); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); if (c < 0) { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill(); }
  ctx.lineWidth = 1.8 * sz; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(40,26,18,.9)'; ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - w * .55, yy - h + 2 * sz); ctx.lineTo(x, yy - 2.5 * sz); ctx.strokeStyle = 'rgba(255,255,255,' + (c > 0 ? .55 : .15) + ')'; ctx.lineWidth = 1.2 * sz; ctx.stroke(); ctx.restore(); }
function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function hudText(t, x, y, font, fill, stroke, lw) { ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round'; if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.strokeText(t, x, y); } ctx.fillStyle = fill; ctx.fillText(t, x, y); }
function hpPill(o, x, y, opt = {}) {   /* returns the bar's top y. opt: { zed, lv, col, w, u } */
  const u = (opt.u || hudU()) * HUD_SMALL, w = (opt.w || 40) * u, h = 8 * u, x0 = x - w / 2, f = Math.max(0, o.hp / o.max);
  if (o._ghost == null || o._ghost < f) { o._ghost = f; o._ghostHold = 0; } else if (o._ghost > f) { if ((o._ghostHold = (o._ghostHold || 0) + 1) > 18) o._ghost = Math.max(f, o._ghost - .012); }
  ctx.save(); rrect(x0, y, w, h, h / 2); ctx.fillStyle = '#f6ead6'; ctx.fill(); ctx.save(); rrect(x0, y, w, h, h / 2); ctx.clip();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x0, y, w * o._ghost, h);
  ctx.fillStyle = opt.col || (opt.zed ? '#e8453c' : '#5ccf5a'); ctx.fillRect(x0, y, w * f, h);   /* 3D.30: colour says who it is (survivors green, zombies red, people against you yellow), not how hurt */
  ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(x0, y + h * .14, w * f, h * .22); ctx.restore();
  rrect(x0, y, w, h, h / 2); ctx.lineWidth = Math.max(1.8, 2 * u); ctx.strokeStyle = '#5a3f31'; ctx.stroke();
  if (opt.lv) { const bx = x0 - 6 * u, r = 7.5 * u; ctx.beginPath(); ctx.arc(bx, y + h / 2, r, 0, 7); ctx.fillStyle = '#ffd45c'; ctx.fill(); ctx.stroke(); hudText(String(opt.lv), bx, y + h / 2 + 3.8 * u, `600 ${Math.round(10.5 * u)}px Fredoka, Nunito, sans-serif`, '#5a3f31'); }
  ctx.restore(); return y;
}
const HUD_LIFT = 10;   /* the bars float this many screen px (x zoom) above the head */
function floatCozy(f, p) {   /* a float's life runs from f.a0 down to 0 (frames) */
  const u = hudU() * HUD_SMALL, k = 1 - f.a / f.a0, num = /^[-+]\d+$/.test(f.t), pop = k < .12 ? 1 + 1.1 * (1 - k / .12) * (k / .12) * 4 : 1;
  const sz = (num ? 21 : f.big ? 16 : 14) * u * pop, x = p.x + (f.dx || 0) * u * k * 14, y = p.y - CHAR_H * TWs() - HUD_LIFT * u - 14 * u - 26 * u * Math.min(1, k * 2.4) - 10 * u * k;
  const fill = f.col === '#ff6e62' ? '#ff9b8a' : num && f.t[0] === '+' ? '#c9f2a6' : num ? '#fff3d6' : f.col;   /* hurt red, heal green, hits cream; other notes keep their colour */
  ctx.save(); ctx.globalAlpha = k > .75 ? (1 - k) / .25 : 1;
  const ic = window.ZHIcons && Object.keys(ZHIcons.EMOJI).find((e) => f.t.includes(e)), im = ic && ZHIcons.img(ZHIcons.EMOJI[ic]);
  if (im && im.complete) {   /* V3D.14: '+1 💧' is drawn as '+1' and the Clay icon */
    const txt = f.t.replace(ic, '').replace(/\s+/g, ' ').trim(), font = `600 ${Math.round(sz)}px Fredoka, Nunito, sans-serif`; ctx.font = font; const tw = txt ? ctx.measureText(txt).width : 0, is = sz * 1.15, gap = txt ? sz * .15 : 0, x0 = x - (tw + gap + is) / 2;
    if (txt) hudText(txt, x0 + tw / 2, y, font, fill, '#5a3f31', Math.max(3, sz * .22)); ctx.drawImage(im, x0 + tw + gap, y - is * .82, is, is);
  } else hudText(f.t, x, y, `600 ${Math.round(sz)}px Fredoka, Nunito, sans-serif`, fill, '#5a3f31', Math.max(3, sz * .22));
  ctx.restore();
}
/* V3D.12 loot bags: a zombie's scrap drop as a bag (it falls and bounces in 3D), the fighter walks over once no
   zombie is close, and the bag pops open with a sparkle burst before the scrap are counted. Bags nobody fetches open
   by themselves after ~3 game hours. */
let bagSeq = 1;
function dropBag(w, amt, killer, extra, rar) {   /* tossed a little away from the fight, so the fighter has to walk over */
  let dx = w.x - (killer ? killer.w.x : w.x - 1), dy = w.y - (killer ? killer.w.y : w.y), L = Math.hypot(dx, dy) || 1; const a = (rnd() - .5) * 1.2, c = Math.cos(a), sn = Math.sin(a); [dx, dy] = [(dx * c - dy * sn) / L, (dx * sn + dy * c) / L];
  let x = w.x + dx * .8, y = w.y + dy * .8; if (!Wd.walkable || Wd.walkable(world, Math.floor(x), Math.floor(y))) { /* ok */ } else { x = w.x; y = w.y; }
  (S.bags ||= []).push({ id: bagSeq++ + '_' + tick, w: { x, y }, amt, t0: tick, extra: extra || null, rar: rar || (extra && Object.keys(extra).some((k) => RES_RAR[k] === 'rare') ? 'rare' : extra ? 'uncommon' : 'common') });
}
function fetchBag(s) {
  const bag = (S.bags || []).filter((b) => !b.opened && dist(b.w, s.w) < 4).sort((a, b) => dist(a.w, s.w) - dist(b.w, s.w))[0];
  if (!bag || threatOf(s) || S.z.some((z) => z.hp > 0 && z.mode !== 'zleave' && dist(z.w, s.w) < 8)) return false;   /* 3D.64 owner: no grabbing bags mid-fight */
  s.mode = 'loot'; s.lootId = bag.id; s.path = null; s.target = null; s.why = 'Grabbing the dropped bag'; return true;
}
function openBag(bag, s) {
  if (bag.opened) return; bag.opened = tick; bag.f = 0; S.mat += bag.amt; if (bag.amt) flow('mat', 'Zombie drops', bag.amt); SFX('reward');
  if (bag.amt) floats.push({ w: { ...bag.w }, t: '+' + bag.amt + ' ⚙', col: '#9fe0ff', a: 80, big: true });
  const ex = { ...(bag.extra || {}) }, item = ex.item; delete ex.item; addLoot(ex, 'Zombie drops'); if (item) stashAdd(item);
  Object.entries(ex).forEach(([k, v], i) => floats.push({ w: { x: bag.w.x, y: bag.w.y - .3 * (i + 1) }, t: '+' + v + ' ' + RES_ICON[k], col: RARITY[RES_RAR[k]].c, a: 90, big: true }));
  if ((bag.rar === 'epic') && !window.ZH_NO_REVEAL) lootReveal({ title: 'BOSS LOOT', sub: 'The big one dropped its stash', entries: lootEntries({ mat: bag.amt, ...ex }, item ? [item] : []) }); else if (item) screenToast('🎁 Found: ' + ITEMS[item].name);
  ui();
}
function bagsTick() {
  if (tick % 60 === 0) for (const b of S.bags || []) {   /* V3D.17: a bag nobody went for gets fetched by the nearest idle survivor */
    if (b.opened || tick - b.t0 < 150 || S.sv.some((q) => q.lootId === b.id && q.mode === 'loot') || zombieNear(b.w, 7)) continue;
    const q = S.sv.filter((q) => ['free', 'wait', 'walk', 'postCombat'].includes(q.mode) && !zombieNear(q.w, 7) && !insideBuilding(q) && q.hp > q.max * .3 && dist(q.w, b.w) < 14 && !threatOf(q)).sort((x, y) => dist(x.w, b.w) - dist(y.w, b.w))[0];
    if (q) { q.mode = 'loot'; q.lootId = b.id; q.path = null; q.target = null; q.dest = null; q.why = 'Picking up a dropped bag'; }
  }
  for (const b of S.bags || []) if (!b.opened && tick - b.t0 > 1500) openBag(b); if (S.bags && S.bags.length) S.bags = S.bags.filter((b) => !b.opened || tick - b.opened < 120); }
function drawBagFx() {   /* glints on waiting bags, a burst of stars when one opens */
  for (const b of S.bags || []) {
    const p = project(b.w.x, b.w.y), u = hudU();
    if (!b.opened) { const k = ((tick + b.id.length * 13) % 70) / 70; if (k < .35) { ctx.save(); ctx.globalAlpha = Math.sin(k / .35 * Math.PI); ctx.fillStyle = '#fff6c2'; hudStar(p.x + 5 * u, p.y - 13 * u, 3.6 * u, k * 4); ctx.fill(); ctx.restore(); } continue; }
    const t = (b.f = (b.f || 0) + 1) / 60; if (t > 1.2) continue;
    ctx.save(); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + .3, r = (6 + 34 * Math.min(1, t * 2.2)) * u, al = Math.max(0, 1 - t / 1.1);
      ctx.globalAlpha = al; ctx.fillStyle = ['#ffd45c', '#fff6c2', '#9be2ff', '#ffb0d0'][i % 4]; hudStar(p.x + Math.cos(a) * r, p.y - 10 * u + Math.sin(a) * r * .6 - t * 12 * u, 4.5 * u * (1 - t * .6), t * 5); ctx.fill(); }
    ctx.globalAlpha = Math.max(0, .6 - t); const gl = ctx.createRadialGradient(p.x, p.y - 8 * u, 0, p.x, p.y - 8 * u, 26 * u); gl.addColorStop(0, 'rgba(255,240,170,.9)'); gl.addColorStop(1, 'rgba(255,240,170,0)'); ctx.fillStyle = gl; ctx.fillRect(p.x - 26 * u, p.y - 34 * u, 52 * u, 52 * u); ctx.restore();
  }
}
const lvBursts = [];
function levelUpFx(s) { s._lvT = 156; lvBursts.push({ s, f: 0, lv: s.l || 1, sp: Array.from({ length: 14 }, () => ({ a: Math.random() * 6.28, r: .4 + Math.random() * .6, v: .6 + Math.random() * .8, c: ['#ffd45c', '#fff6c2', '#9be2ff', '#ffb0d0'][(Math.random() * 4) | 0] })) }); }
function hudStar(x, y, r, rot) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, q = i % 2 ? r * .45 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } ctx.closePath(); }
function drawLevelUps() {
  for (let i = lvBursts.length - 1; i >= 0; i--) {   /* timed in drawn frames (60 a second), like the floats */
    const b = lvBursts[i], t = b.f++ / 60; if (b.s._lvT > 0) b.s._lvT--; if (t > 2.6 || !S.sv.includes(b.s) || !b.s.w) { b.s._lvT = 0; lvBursts.splice(i, 1); continue; }   /* 3D.30: never leave the level-up timer running (stuck cheering) */
    if (insideBuilding(b.s)) continue;
    const u = hudU() * HUD_SMALL, fp = project(b.s.w.x, b.s.w.y), hy = fp.y - CHAR_H * TWs() - HUD_LIFT * u, k = t / 2.6, ring = Math.min(1, t / .35), fade = k > .7 ? (1 - k) / .3 : 1;
    ctx.save(); ctx.globalAlpha = .55 * fade; ctx.strokeStyle = '#ffe58a'; ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.ellipse(fp.x, fp.y, 26 * u * ring, 11 * u * ring, 0, 0, 7); ctx.stroke();
    const pg = ctx.createLinearGradient(0, hy, 0, fp.y); pg.addColorStop(0, 'rgba(255,240,170,0)'); pg.addColorStop(1, 'rgba(255,230,140,.55)');
    ctx.globalAlpha = .7 * fade * Math.min(1, t / .25); ctx.fillStyle = pg; ctx.fillRect(fp.x - 17 * u * ring, hy, 34 * u * ring, fp.y - hy);
    for (const sp of b.sp) { const tt = Math.max(0, t - .1) * sp.v; if (tt > 1.6) continue; ctx.globalAlpha = Math.max(0, 1 - tt / 1.6); ctx.fillStyle = sp.c; hudStar(fp.x + Math.cos(sp.a) * 22 * u * sp.r, fp.y - tt * 64 * u - 8 * u, 4 * u * (1 - tt / 2.2), tt * 3); ctx.fill(); }
    const word = 'LEVEL UP!', sz = 22 * u, font = `${Math.round(sz)}px 'Lilita One', Fredoka, sans-serif`; ctx.font = font;
    const ws = [...word].map((c) => ctx.measureText(c).width), tot = ws.reduce((a, c) => a + c, 0), yb = hy - 30 * u + Math.sin(t * 7) * 2 * u; let x = fp.x - tot / 2;
    ctx.globalAlpha = fade;
    [...word].forEach((c, j) => { const lt = t - (.08 + j * .05); if (lt >= 0) { const hop = lt < .22 ? -Math.sin(lt / .22 * Math.PI) * 13 * u : 0, sq = lt < .22 ? 1 + .25 * Math.sin(lt / .22 * Math.PI) : 1;
      ctx.save(); ctx.translate(x + ws[j] / 2, yb + hop); ctx.scale(1 / sq, sq); const gr = ctx.createLinearGradient(0, -sz, 0, 0); gr.addColorStop(0, '#fffbe0'); gr.addColorStop(.55, '#ffd45c'); gr.addColorStop(1, '#ff9a2a');
      ctx.font = font; ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = sz * .28; ctx.strokeStyle = '#5a3f31'; ctx.strokeText(c, 0, 0); ctx.fillStyle = gr; ctx.fillText(c, 0, 0); ctx.restore(); } x += ws[j]; });
    if (t > .75) { const lt = Math.min(1, (t - .75) / .25), yy = yb + 16 * u - 4 * u * lt, txt = 'Lv ' + (b.lv - 1) + ' ▸ ' + b.lv; ctx.globalAlpha = fade * lt; ctx.font = `600 ${Math.round(12 * u)}px Fredoka, sans-serif`;
      const tw = ctx.measureText(txt).width + 14 * u; rrect(fp.x - tw / 2, yy - 12 * u, tw, 17 * u, 8.5 * u); ctx.fillStyle = '#fff8ec'; ctx.fill(); ctx.lineWidth = 2 * u; ctx.strokeStyle = '#5a3f31'; ctx.stroke(); hudText(txt, fp.x, yy + .5 * u, ctx.font, '#5a3f31'); }
    ctx.restore();
  }
}
function drawHuman(s) {
  if (insideBuilding(s)) return;   // hidden while inside
  const p = project(s.w.x, s.w.y);
  if (s.mode === 'down' && beingCarried(s)) { if (s.bleed != null) bleedRing(s, project(s.rescuer.w.x, s.rescuer.w.y), -CHAR_H * TWs() * .62, TWs() * .45 * (facing(s.rescuer).right ? 1 : -1)); return; }   /* V2.33: drawn lying in the rescuer's cart */
  const tw = TWs(), top = p.y - CHAR_H * tw - 3; hitSpark(s, p);
  const hit0 = underAttack(s);
  let tagY = top - 2; const selU = selected && selected.ref === s, near = cam.z >= 1.7, fighting = ['attack', 'chase', 'recover'].includes(s.mode);   /* V3D.17: fewer markers on people */
  if (!S.cut && (fighting || s.hp < s.max * .7 || selU || (near && s.hp < s.max))) {
    { const u = hudU(); tagY = hpPill(s, p.x + 3 * u, top - HUD_LIFT * u, { lv: s.l || 1 }) - 3 * u; } }
  if (s.dummy && s.tag) { const u = hudU(), fs = Math.round(9 * u), y = top - 9 * u; ctx.save(); ctx.font = `800 ${fs}px Manrope, sans-serif`; const w = ctx.measureText(s.tag).width + 9 * u, h = 13 * u; ctx.fillStyle = 'rgba(16,22,28,.82)'; ctx.beginPath(); ctx.roundRect(p.x - w / 2, y - h / 2, w, h, h / 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.tag, p.x, y + .5); ctx.restore(); }   /* 3D.152 gear test: the item's name over each dummy */
  if (s.mode === 'down' && s.bleed != null) bleedRing(s, p);
  const ic = s.activity ? EMOJI[s.activity] : (s.mode === 'chase' || s.mode === 'attack' ? '⚔️' : s.mode === 'rescueTo' || s.mode === 'rescueCarry' ? '🚑' : s.mode === 'down' ? '💀' : s.mode === 'hospital' ? '💊' : s.purpose === 'patrol' ? '🛡️' : (s.purpose || '').startsWith('scav') ? '🔍' : s.mode === 'wait' && s.idleBubble && (tick + s.phase) % 600 < 130 ? s.idleBubble : '');
  let tagT = s.mode === 'down' ? '' : s.activity ? (TAGTXT[s.activity] || s.activity) : s.mode === 'chase' || s.mode === 'attack' || s.mode === 'recover' ? 'Fighting' : s.mode === 'rescueTo' || s.mode === 'rescueCarry' ? 'Rescue' : s.mode === 'hospital' ? 'In care' : s.mode === 'goFire' ? 'Fire!' : s.purpose === 'patrol' ? 'Patrol' : (s.purpose || '').startsWith('scav') ? 'Scavenging' : '';
  if (S.cut || (!(selU || near || s.mode === 'goFire'))) tagT = '';   /* 3D.134 the opening is staged: no health bars or status tags */
  if ((s.reloadT > 0)) { const u = hudU(), w = weaponOf(s), k = 1 - s.reloadT / Math.max(1, (w.reload || 1) * 60), cx = p.x - 16 * u, cy = (tagT ? tagY - 16 * u * HUD_SMALL : tagY) - 12 * u;   /* V3D.16 reload timer */
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 11 * u, 0, 7); ctx.fillStyle = '#fff8ec'; ctx.fill(); ctx.lineWidth = 2 * u; ctx.strokeStyle = '#5a3f31'; ctx.stroke();
    ctx.lineWidth = 4 * u; ctx.lineCap = 'round'; ctx.strokeStyle = '#f2a33a'; ctx.beginPath(); ctx.arc(cx, cy, 11 * u, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke();
    hudText(String(w.mag || ''), cx, cy + 4 * u, `600 ${Math.round(10 * u)}px Fredoka, sans-serif`, '#5a3f31'); ctx.restore(); }
  if ((s.bark) && !s._lvT) drawBark(s, p, tagT ? tagY - 26 * hudU() * HUD_SMALL : tagY);
  else if ((s.emo) && !s._lvT) drawEmote(s, p, tagT ? tagY - 26 * hudU() * HUD_SMALL : tagY);
  if (s._lvT > 0) { /* the LEVEL UP burst takes the space above the head */ }
  else if (tagT && ((selU) || near || s.mode === 'goFire')) statusTag(p.x, tagY, tagT, s.mode === 'chase' || s.mode === 'attack' || s.mode === 'recover' || s.mode === 'goFire' ? '#e8603a' : '#cfe08a');
  else if (ic && s.mode !== 'down' && !((s.emo || s.bark))) bubble({ x: p.x, y: tagY - 1 }, ic);
  if ((selected && selected.ref === s) || hit0) spinArrow(p.x, tagY - 24 * hudU(), selected && selected.ref === s ? '#ffe145' : '#ff5a4a', hudU() * .9);
  if (selected && selected.ref === s) { stampText(s.name, p.x, p.y + .36 * tw, `600 ${Math.round(15 * .95 * hudU())}px Fredoka, Nunito, sans-serif`, '#fff0b0'); }
}
const ZSCALE = { bloated: 1.2, brute: 1.28, crawler: .5, alpha: 1.6, dog: .55, riot: 1.08, boss: 1.6 };

const corpses = [], shots = [], spits = [];   /* 3D.35 spits: flying mucus globs from spitters */   /* shots: short tracer lines for guns and bows (V2.33) */   /* short death animations (not saved) */

/* 3D.36 attack impact effects: brute / Alpha / boss slam = ground shockwave, dust and debris and a little screen shake;
   bloated = a green belly-splash; claws = three quick slash marks on the target; spitter hits use the spit splat. */
const hitFx = [], SCREAM_R = 2.4, SMASH_R = 1.8, LASH_R = 2, ROT_R = 1.9, ROT_FUSE = 66;   /* 3D.80 Lasher reach, Rotbomb burst radius (tiles) */
/* 3D.37 survivor melee combo: hits in a row on the same enemy (within 2.5 s) chain swing A, swing B, then a two-hand finisher for +60% damage */
/* 3D.58 quick combo: any melee swing can burst into a fast three-hit combo. The chance follows Agility (2.5% per point, so 5 agi = 12.5%,
   10 agi = 25%); the follow-up hits come almost at once and the last one hits 1.5x. */
const comboChance = (s) => Math.min(.4, Math.max(.03, stat(s, 'agi') * .025));
function comboMult(s, z, w) {
  if (w.ranged) { s.comboQ = 0; s.comboStep = 0; s.comboFin = false; return 1; }
  s.comboFin = false;
  if (s.comboQ > 0 && s.comboZ === z) { s.comboQ--; s.comboStep++; if (!s.comboQ) { s.comboFin = true; return 1.5; } return 1.1; }
  s.comboZ = z; s.comboQ = 0; s.comboStep = 0; s.swingN = (s.swingN || 0) + 1;
  if (rnd() < comboChance(s)) { s.comboQ = 2; s.comboStep = 1; floats.push({ w: { x: z.w.x, y: z.w.y - .45 }, t: 'COMBO!', col: '#C6FF4D', a: 60, big: true }); }
  return 1;
}
const zHitDmg = (z, d, t) => Math.max(1, fairRound(d.atk * (z.pw || 1) * (t && t.spec === 'Guard' ? .8 : 1) * (hasSkill(t, 'armored') ? .8 : 1) * (hasSkill(t, 'bulwark') ? .85 : 1) * (atPost(t) ? .8 : 1) * (1 - dmgReduce(t))));
function impactFx(z, w) {
  if (!w || z.type !== 'screamer') return; const k = 'scream';   /* 3D.39 owner: only the Screamer has a hit effect for now (board style B); the others looked wrong, so none */
  hitFx.push({ k, w: { x: w.x, y: w.y }, t0: tick, big: z.type === 'alpha' || z.type === 'boss' ? 1.4 : 1, a: rnd() * 6.28, bits: Array.from({ length: 9 }, () => ({ a: rnd() * 6.28, v: .5 + rnd(), s: rnd() })) });
  if (k === 'slam' && (z.type === 'alpha' || z.type === 'boss')) { const p = project(w.x, w.y); if (p.x > -40 && p.x < VW + 40 && p.y > -40 && p.y < VH + 40) { const el = $('world'); if (el) { el.classList.remove('zhShake'); void el.offsetWidth; el.classList.add('zhShake'); } } }
}
/* 3D.38 toned down (owner: "way too much"); the same drawing runs on the Zombie Animation Board (fxDraw is copied there) */
const FX_STRENGTH = 1;
function fxDraw(g, f, q, p, tw, H, k = FX_STRENGTH) {   /* g: 2D context, f: effect, q: 0..1 progress, p: ground point (px), tw: tile width (px), H: survivor height (px) */
  g.save(); const px = tw / 40;
  if (f.k === 'slam') { const R0 = tw * .4 * f.big * k;
    for (const [d, c, w] of [[0, 'rgba(255,248,230,', 2.4], [.15, 'rgba(170,135,90,', 1.6]]) { const u = Math.max(0, q - d) / (1 - d), e = 1 - (1 - u) * (1 - u); g.globalAlpha = (1 - u) * .7; g.strokeStyle = c + '1)'; g.lineWidth = w * px; g.beginPath(); g.ellipse(p.x, p.y, R0 * e, R0 * e * .5, 0, 0, 7); g.stroke(); }
    for (const b of f.bits.slice(0, 6)) { const r = R0 * .85 * Math.min(1, q * 2) * b.v, x = p.x + Math.cos(b.a) * r, y = p.y + Math.sin(b.a) * r * .5; g.globalAlpha = (1 - q) * .5;
      g.fillStyle = b.s < .55 ? 'rgb(196,170,130)' : 'rgb(150,120,85)'; g.beginPath(); g.arc(x, y - H * .08 * Math.min(1, q * 3) * (1 - q), (2 + 4 * q) * px * k * (b.s < .55 ? 1 : .6), 0, 7); g.fill(); } }
  else if (f.k === 'scream') { fxScreamB(g, f, q, p, tw, H); }
  else if (f.k === 'smash') { fxSmashB(g, f, q, p, tw, H); }
  else if (f.k === 'scream_old') {
    const RX = tw * .7 * (f.r || 2.4); g.globalAlpha = (1 - q) * .12 * k; g.fillStyle = '#c9a8ff'; g.beginPath(); g.ellipse(p.x, p.y, RX, RX * .5, 0, 0, 7); g.fill();
    for (let j = 0; j < 3; j++) { const u = Math.min(1, Math.max(0, q * 1.5 - j * .2)); if (u <= 0 || u >= 1) continue; g.globalAlpha = (1 - u) * .8; g.strokeStyle = j % 2 ? '#FFE14D' : '#c9a8ff'; g.lineWidth = (2.6 - j * .5) * px; g.beginPath(); g.ellipse(p.x, p.y, RX * u, RX * u * .5, 0, 0, 7); g.stroke(); }
    const hx = p.x, hy = p.y - H * .92; g.lineCap = 'round';
    for (let j = 0; j < 3; j++) { const u = (q * 2.2 + j / 3) % 1, r = (8 + u * 26) * px; g.globalAlpha = (1 - u) * (1 - q) * .9; g.strokeStyle = '#FFE14D'; g.lineWidth = 2 * px; for (const sd of [-1, 1]) { g.beginPath(); g.arc(hx, hy, r, sd > 0 ? -1.1 : Math.PI - .5, sd > 0 ? -.4 : Math.PI + .2); g.stroke(); } g.beginPath(); g.arc(hx, hy - r * .2, r, -Math.PI / 2 - .35, -Math.PI / 2 + .35); g.stroke(); } }
  else if (f.k === 'burst') { const R0 = tw * .7 * ROT_R * .62, e = 1 - (1 - q) * (1 - q), cy = p.y - H * .35;   /* 3D.85 Rotbomb explosion */
    if (q < .18) { const u = q / .18; g.globalAlpha = 1 - u; g.fillStyle = '#fff6c8'; g.beginPath(); g.ellipse(p.x, cy, R0 * (.3 + .5 * u), R0 * (.3 + .5 * u) * .8, 0, 0, 7); g.fill(); }   /* white-hot flash */
    { const u = Math.min(1, q / .45), r = R0 * (.25 + .6 * u); g.globalAlpha = (1 - u) * .9;   /* fireball of rot gas: orange core, sickly green rim */
      const gr = g.createRadialGradient(p.x, cy, r * .1, p.x, cy, r); gr.addColorStop(0, '#ffd25a'); gr.addColorStop(.45, '#e0782a'); gr.addColorStop(.8, '#8fae36'); gr.addColorStop(1, 'rgba(110,140,40,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(p.x, cy, r, r * .8, 0, 0, 7); g.fill(); }
    g.globalAlpha = (1 - q) * .9; g.strokeStyle = '#f2e6b0'; g.lineWidth = 2.6 * px; g.beginPath(); g.ellipse(p.x, p.y, R0 * e, R0 * e * .5, 0, 0, 7); g.stroke();   /* shock ring on the ground, to the edge of the blast */
    g.globalAlpha = (1 - q) * .25; g.fillStyle = '#9cc23e'; g.beginPath(); g.ellipse(p.x, p.y, R0 * e, R0 * e * .5, 0, 0, 7); g.fill();
    for (const b of f.bits) { const r = R0 * e * b.v, h = Math.sin(Math.PI * Math.min(1, q * 1.3)) * H * .7 * b.v; g.globalAlpha = Math.min(1, (1 - q) * 1.6);   /* chunks flying out on arcs */
      g.fillStyle = b.s < .4 ? '#7a8f2e' : b.s < .7 ? '#c9b24a' : '#6b3a2e'; g.beginPath(); g.arc(p.x + Math.cos(b.a) * r, p.y + Math.sin(b.a) * r * .5 - h, (2 + 2 * b.s) * px, 0, 7); g.fill(); }
    for (let j = 0; j < 5; j++) { const a = j * 1.26 + .4, r = R0 * .45 * e, u = Math.max(0, q - .25) / .75; if (!u) continue; g.globalAlpha = (1 - u) * .35; g.fillStyle = '#6f7a4a';   /* green-grey smoke that lingers and rises */
      g.beginPath(); g.arc(p.x + Math.cos(a) * r, cy + Math.sin(a) * r * .4 - H * .4 * u, (6 + 10 * u) * px, 0, 7); g.fill(); } }
  else if (f.k === 'lash') { const a = f.zr && f.zr.hp > 0 ? f.zr.w : f.w, b = f.qr && f.qr.w ? f.qr.w : f.to, pa = project(a.x, a.y), pb = project(b.x, b.y), ya = pa.y - H * .62, yb = pb.y - H * .45;   /* 3D.80 the Lasher's arm: a pale sinew line from it to the hooked survivor */
    const out = q < .3 ? q / .3 : 1, mx = pa.x + (pb.x - pa.x) * out, my = ya + (yb - ya) * out; g.globalAlpha = q < .8 ? .9 : (1 - q) * 4.5; g.lineCap = 'round';
    g.strokeStyle = '#3a2f2a'; g.lineWidth = 1.8 * px; g.beginPath(); g.moveTo(pa.x, ya); g.quadraticCurveTo((pa.x + mx) / 2, (ya + my) / 2 - 2.5 * px, mx, my); g.stroke();
    g.strokeStyle = '#e8ddcf'; g.lineWidth = .9 * px; g.stroke(); }
  else if (f.k === 'belly') { const R0 = tw * .34 * k, e = Math.min(1, q * 1.8); g.globalAlpha = (1 - q) * .75; g.strokeStyle = '#b8d65a'; g.lineWidth = 2 * px; g.beginPath(); g.ellipse(p.x, p.y, R0 * e, R0 * e * .5, 0, 0, 7); g.stroke();
    for (const b of f.bits.slice(0, 6)) { const r = R0 * e * b.v; g.fillStyle = b.s < .5 ? '#9cc23e' : '#d6c24a'; g.beginPath(); g.arc(p.x + Math.cos(b.a) * r, p.y + Math.sin(b.a) * r * .5 - H * .18 * Math.sin(Math.PI * e) * b.v, 1.7 * px * k, 0, 7); g.fill(); } }
  else { const cx = p.x, cy = p.y - H * .55, L = tw * .2 * k, e = Math.min(1, q * 3); g.globalAlpha = (q < .5 ? 1 : 2 - q * 2) * .85; g.lineCap = 'round';
    for (let j = -1; j <= 1; j++) { g.save(); g.translate(cx + j * L * .25, cy); g.rotate(f.a * .2 - .6); g.strokeStyle = '#ffffff'; g.lineWidth = 2.2 * px; g.beginPath(); g.moveTo(-L / 2, -L * .2); g.quadraticCurveTo(0, L * .1, -L / 2 + L * e, -L * .2 + L * .4 * e); g.stroke(); g.strokeStyle = '#e8453c'; g.lineWidth = 1 * px; g.stroke(); g.restore(); } }
  g.restore();
}
const FX_DUR = { claw: 12, belly: 32, slam: 34, scream: 60, smash: 56, burst: 56, lash: 50 };
/* 3D.39 Screamer shriek, style B "detailed, painted" from the Zombie Animation Board: wavering sound rings roll out to the edge of the
   AOE (the real SCREAM_R), kicking up soft dust at the front, and jagged shriek lines burst from the open mouth. No ink lines. */
function fxScreamB(g, f, q, p, tw, H) {
  const px = tw / 40 * .18, RX = tw * .7 * (f.r || SCREAM_R), hx = p.x, hy = p.y - H * .92, out = 1 - q;
  if (!f.wob) { f.wob = [0, 1, 2].map(() => ({ ph: rnd() * 6, fq: 5 + ((rnd() * 4) | 0), amp: .04 + rnd() * .04 })); f.dust = Array.from({ length: 6 }, () => ({ a: rnd() * 6.28, s: .6 + rnd() * .7 })); }
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  for (let j = 0; j < 3; j++) { const u = Math.min(1, Math.max(0, q * 1.45 - j * .2)); if (u <= 0 || u >= 1) continue; const w = f.wob[j];
    g.globalAlpha = (1 - u) * .9; g.beginPath(); for (let i = 0; i <= 48; i++) { const an = i / 48 * Math.PI * 2, rr = RX * u * (1 + w.amp * Math.sin(an * w.fq + w.ph + q * 20)), x = p.x + Math.cos(an) * rr, y = p.y + Math.sin(an) * rr * .5; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.lineWidth = (3 - j * .6) * px; g.strokeStyle = j === 1 ? 'rgba(170,140,225,.85)' : 'rgba(236,226,200,.85)'; g.stroke();
    for (const d of f.dust) { const x = p.x + Math.cos(d.a) * RX * u, y = p.y + Math.sin(d.a) * RX * u * .5 - 2 * px, r = (2 + 2 * d.s) * px, gr = g.createRadialGradient(x - r * .3, y - r * .4, r * .1, x, y, r);
      gr.addColorStop(0, '#e6d8bd'); gr.addColorStop(1, '#a8916c'); g.globalAlpha = (1 - u) * .7; g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } }
  for (let j = 0; j < 7; j++) { const u = (q * 2.4 + j / 7) % 1, an = -Math.PI / 2 + (j - 3) * .32, r0 = 6 * px, r1 = r0 + (8 + 18 * u) * px; g.globalAlpha = (1 - u) * out;
    g.beginPath(); for (let i = 0; i <= 4; i++) { const rr = r0 + (r1 - r0) * i / 4, jit = (i % 2 ? 1 : -1) * 1.6 * px; g.lineTo(hx + Math.cos(an) * rr - Math.sin(an) * jit, hy + Math.sin(an) * rr + Math.cos(an) * jit); }
    g.lineWidth = 1.4 * px; g.strokeStyle = '#fff3c4'; g.stroke(); }
  g.restore();
}
/* 3D.89 Stalker hulk smash, same painted style as fxScreamB: a flash and horizontal shock lines burst from the clap at chest
   height, a pale pressure ring spreads at that height, and wavering ground rings (cream and dusty amber) roll out to the edge of
   the AOE (the real SMASH_R), kicking up dust and a few chips. No ink lines. */
function fxSmashB(g, f, q, p, tw, H) {
  const px = tw / 40 * .18, RX = tw * .7 * (f.r || SMASH_R), cx = p.x, cy = p.y - H * .62, out = 1 - q;
  if (!f.wob) { f.wob = [0, 1, 2].map(() => ({ ph: rnd() * 6, fq: 5 + ((rnd() * 4) | 0), amp: .04 + rnd() * .04 })); f.dust = Array.from({ length: 8 }, () => ({ a: rnd() * 6.28, s: .6 + rnd() * .7 })); f.chips = Array.from({ length: 7 }, () => ({ a: rnd() * 6.28, v: .4 + rnd() * .6, s: rnd() })); }
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  if (q < .22) { const u = q / .22, r = (10 + 30 * u) * px, gr = g.createRadialGradient(cx, cy, r * .05, cx, cy, r);   /* the clap flash */
    gr.addColorStop(0, 'rgba(255,250,228,1)'); gr.addColorStop(.5, 'rgba(255,226,160,.55)'); gr.addColorStop(1, 'rgba(255,210,140,0)'); g.globalAlpha = 1 - u; g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); }
  { const u = Math.min(1, q * 1.6); if (u < 1) { g.globalAlpha = (1 - u) * .6; g.strokeStyle = 'rgba(244,236,214,.9)'; g.lineWidth = 2.2 * px; g.beginPath(); g.ellipse(cx, cy, RX * .75 * u, RX * .75 * u * .32, 0, 0, 7); g.stroke(); } }   /* pressure ring at chest height */
  for (let j = 0; j < 8; j++) { const u = (q * 2.2 + j / 8) % 1, sd = j % 2 ? 1 : -1, an = (sd > 0 ? 0 : Math.PI) + ((j >> 1) - 1.5) * .22, r0 = 7 * px, r1 = r0 + (10 + 24 * u) * px; g.globalAlpha = (1 - u) * out;   /* jagged shock lines out of the clap, sideways */
    g.beginPath(); for (let i = 0; i <= 4; i++) { const rr = r0 + (r1 - r0) * i / 4, jit = (i % 2 ? 1 : -1) * 1.6 * px; g.lineTo(cx + Math.cos(an) * rr - Math.sin(an) * jit, cy + Math.sin(an) * rr * .6 + Math.cos(an) * jit); }
    g.lineWidth = 1.5 * px; g.strokeStyle = '#fff3c4'; g.stroke(); }
  for (let j = 0; j < 3; j++) { const u = Math.min(1, Math.max(0, q * 1.5 - j * .18)); if (u <= 0 || u >= 1) continue; const w = f.wob[j];   /* ground rings */
    g.globalAlpha = (1 - u) * .9; g.beginPath(); for (let i = 0; i <= 48; i++) { const an = i / 48 * Math.PI * 2, rr = RX * u * (1 + w.amp * Math.sin(an * w.fq + w.ph + q * 18)), x = p.x + Math.cos(an) * rr, y = p.y + Math.sin(an) * rr * .5; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.lineWidth = (3.2 - j * .6) * px; g.strokeStyle = j === 1 ? 'rgba(214,150,92,.85)' : 'rgba(236,226,200,.85)'; g.stroke();
    for (const d of f.dust) { const x = p.x + Math.cos(d.a) * RX * u, y = p.y + Math.sin(d.a) * RX * u * .5 - 2 * px, r = (2.2 + 2.4 * d.s) * px, gr = g.createRadialGradient(x - r * .3, y - r * .4, r * .1, x, y, r);
      gr.addColorStop(0, '#e6d8bd'); gr.addColorStop(1, '#a8916c'); g.globalAlpha = (1 - u) * .7; g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } }
  for (const c of f.chips) { const e = 1 - (1 - q) * (1 - q), r = RX * .8 * e * c.v, h = Math.sin(Math.PI * Math.min(1, q * 1.4)) * H * .3 * c.v; g.globalAlpha = Math.min(1, out * 1.5) * .9;   /* a few chips of ground flung up */
    g.fillStyle = c.s < .5 ? '#9b8566' : '#6e5d48'; g.beginPath(); g.arc(p.x + Math.cos(c.a) * r, p.y + Math.sin(c.a) * r * .5 - h, (1.4 + 1.2 * c.s) * px, 0, 7); g.fill(); }
  g.restore();
}
function drawHitFx() {
  const tw = TWs(), H = CHAR_H * tw;
  for (let i = hitFx.length - 1; i >= 0; i--) { const f = hitFx[i], q = (tick - f.t0) / FX_DUR[f.k]; if (q > 1) { hitFx.splice(i, 1); continue; } fxDraw(ctx, f, q, project(f.w.x, f.w.y), tw, H); }
}
const SPIT_COL = ['#7cc242', '#8e4fb0', '#6b4a2b', '#a6d94a'], ROCK_COL = ['#8a7f72', '#6e655b', '#a39a8c', '#7a7066'];   /* 3D.126 the Thrower's rubble */   /* green, purple and brown mucus */
function drawSpits() {   /* 3D.35: an arcing glob with a dripping trail; a splat where it lands */
  const tw = TWs() * .55, H = CHAR_H * TWs();
  for (let i = spits.length - 1; i >= 0; i--) {
    const g = spits[i], k = (tick - g.t0) / g.dur, a = project(g.a.x, g.a.y), b = project(g.b.x, g.b.y);
    if (k >= 1) { if (!g.splat) { g.splat = tick; g.drops = Array.from({ length: 7 }, (_, j) => ({ a: rnd() * 6.28, v: .5 + rnd(), c: (g.rock ? ROCK_COL : SPIT_COL)[j % 3] })); } const q = (tick - g.splat) / 40; if (q > 1) { spits.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = 1 - q; ctx.fillStyle = g.rock ? 'rgba(120,105,90,.45)' : 'rgba(110,170,50,.55)'; ctx.beginPath(); ctx.ellipse(b.x, b.y, (8 + 10 * Math.min(1, q * 3)) * tw / 40, (4 + 5 * Math.min(1, q * 3)) * tw / 40, 0, 0, 7); ctx.fill();
      for (const d of g.drops) { const r = Math.min(1, q * 2.5) * 16 * d.v * tw / 40; ctx.fillStyle = d.c; ctx.beginPath(); ctx.arc(b.x + Math.cos(d.a) * r, b.y - H * .35 + Math.sin(d.a) * r * .5 + q * q * H * .4, Math.max(1, 2.6 * tw / 40 * (1 - q * .5)), 0, 7); ctx.fill(); } ctx.restore(); continue; }
    const pt = (u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u - H * (.7 - .38 * u) - Math.sin(Math.PI * u) * H * .45 });   /* 3D.36: from the mouth */
    ctx.save();
    for (let j = 6; j >= 1; j--) { const u = Math.max(0, k - j * .045), p = pt(u); ctx.globalAlpha = .75 - j * .1; ctx.fillStyle = (g.rock ? ROCK_COL : SPIT_COL)[(j + ((g.seed * 4) | 0)) % 3]; ctx.beginPath(); ctx.arc(p.x, p.y + j * .6, Math.max(1, (4.2 - j * .45) * tw / 40), 0, 7); ctx.fill(); }
    const p = pt(k), r = 6 * tw / 40; ctx.globalAlpha = 1; ctx.fillStyle = g.rock ? '#8a7f72' : '#6fb53a'; ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.15, r, Math.atan2(b.y - a.y, b.x - a.x), 0, 7); ctx.fill();
    ctx.fillStyle = '#8e4fb0'; ctx.beginPath(); ctx.arc(p.x - r * .35, p.y + r * .2, r * .45, 0, 7); ctx.fill(); ctx.fillStyle = '#6b4a2b'; ctx.beginPath(); ctx.arc(p.x + r * .4, p.y - r * .25, r * .32, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(p.x - r * .4, p.y - r * .45, r * .22, 0, 7); ctx.fill(); ctx.restore();
  }
}
function drawZombie(zm) {
  const p = project(zm.w.x, zm.w.y), tw = TWs();
  if (zm.type === 'raider') {   /* raiders: the survivor rig in raider gear, with their weapon */
    if (!zm.look) zm.look = { sex: rnd() < .3 ? 'f' : 'm', skin: Math.floor(rnd() * 4), hair: Math.floor(rnd() * 8) };
    if (!zm.wpn) zm.wpn = ['bat', 'knife', 'crowbar', 'pistol', 'machete'][Math.floor(rnd() * 5)];
    zm.eq = { weapon: zm.wpn };
    const top = p.y - CHAR_H * tw - 3; hitSpark(zm, p); hpPill(zm, p.x, top - HUD_LIFT * hudU(), { col: '#f6c445' });
    if (zm.carried) stampText('⚙' + zm.carried, p.x, top - 4, `600 ${Math.round(14 * .95 * hudU())}px Fredoka, Nunito, sans-serif`, '#ffe06b');
    return;
  }
  if (zm.dead != null) return; const top = p.y - CHAR_H * TWs() * (ZSCALE[zm.type] || 1);
  { const u = hudU();   /* 3D.32 new-zombie effects */
    if (zm.type === 'burnt') { ctx.save(); for (let i = 0; i < 5; i++) { const t = ((tick + i * 23 + (zm.phase || 0) * 9) % 70) / 70, x = p.x + Math.sin(i * 2.3 + tick / 20) * 8 * u, y = p.y - t * CHAR_H * TWs() * 1.1; ctx.globalAlpha = 1 - t; ctx.fillStyle = t < .5 ? '#FFB347' : '#FF6A2A'; ctx.beginPath(); ctx.arc(x, y, (2.6 - t * 1.6) * u, 0, 7); ctx.fill(); } ctx.restore(); }
    if (zm.zoo) { const d = zombieTypes[zm.type] || {}, nm = zm.zn ? zm.zn : zm.bk && BOSS_KINDS[zm.bk] ? BOSS_KINDS[zm.bk].name : d.name || zm.type, y = top - (zm.type === 'boss' || zm.type === 'alpha' ? 40 : 28) * u; ctx.save(); ctx.font = `800 ${Math.round(12 * u)}px Manrope, sans-serif`; const tw2 = ctx.measureText(nm).width + 16 * u + (d.isNew ? 34 * u : 0), h = 20 * u;
      ctx.beginPath(); ctx.roundRect(p.x - tw2 / 2, y - h, tw2, h, h / 2); ctx.fillStyle = 'rgba(16,22,28,.78)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(nm, p.x - tw2 / 2 + 8 * u, y - h / 2);
      if (d.isNew) { const bx = p.x + tw2 / 2 - 32 * u; ctx.beginPath(); ctx.roundRect(bx, y - h + 3 * u, 26 * u, h - 6 * u, 7 * u); ctx.fillStyle = '#C6FF4D'; ctx.fill(); ctx.fillStyle = '#14200A'; ctx.font = `800 ${Math.round(9 * u)}px Manrope, sans-serif`; ctx.fillText('NEW', bx + 3.5 * u, y - h / 2); } ctx.restore(); }
  }
  if (zm.type === 'alpha') { const u = hudU(), bt = hpPill(zm, p.x, top - (HUD_LIFT + 6) * u, { col: '#e8453c', w: 70 }); if (!zm.zoo) hudText('ALPHA', p.x, bt - 4 * u, `800 ${Math.round(14 * u)}px Manrope, sans-serif`, '#ffd0c8', '#3a0d08', 3.5 * u); return; }
  if ((zm.zoo)) { hpPill(zm, p.x, top - 3 - HUD_LIFT * hudU(), { zed: true, w: zm.type === 'boss' ? 70 : 34 }); return; }
  if (zm.type === 'boss') {
    { const u = hudU(), bt = hpPill(zm, p.x, top - (HUD_LIFT + 6) * u, { col: '#e8453c', w: 70 }); hudText('BOSS', p.x, bt - 4 * u, `600 ${Math.round(14 * u)}px Fredoka, sans-serif`, '#f2c8ff', '#5a3f31', 3.5 * u); return; }
  }
  hitSpark(zm, p); if (!engaged(zm) || zm.cut) return;   /* V2.37: HP bar only once it is hurt or fighting someone */
  hpPill(zm, p.x, top - 3 - HUD_LIFT * hudU(), { zed: true, w: 34 }); return;
}

/* ---------------- main draw ---------------- */
const TREE_SPOTS = [[0, 2], [2, 2], [4, 3], [7, 2], [10, 3], [13, 2], [15, 4], [0, 7], [1, 11], [0, 15], [1, 18], [4, 19], [7, 19], [10, 19], [13, 18], [15, 16], [15, 11], [14, 7], [1, 4], [13, 4], [1, 17], [14, 18],
  /* V3D.22: choppable trees in the outer land too */ [17, 3], [19, 6], [21, 2], [24, 5], [26, 9], [18, 12], [22, 14], [26, 17], [17, 21], [20, 23], [24, 22], [26, 26], [3, 23], [7, 26], [12, 24], [15, 27], [19, 27], [23, 28], [17, 8], [20, 18]].map(SH);
const CRATE_SPOTS = [[1, 6], [14, 13], [2, 19], [13, 5], [0, 12]].map(SH);
const CAR_SPOTS = [[0, 4], [10, 0]].map(SH);
/* V2.32: wreckage scattered over the land that isn't unlocked yet (assets/map/v7/wreck.png); it clears as the territory grows */
let wreckKey = '', wreckList = [];
function wreckSpots() {
  const k = curMap + Wd.BUILD.x0 + ',' + Wd.BUILD.y0 + ',' + Wd.BUILD.x1 + ',' + Wd.BUILD.y1 + '#' + world.roads.size; if (k === wreckKey) return wreckList;
  const taken = new Set([...TREE_SPOTS, ...CRATE_SPOTS, ...CAR_SPOTS, ...DEBRIS_SPOTS].map(([x, y]) => x + ',' + y)); wreckKey = k; wreckList = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (Wd.inTown(x, y) || Wd.isRoad(world, x, y) || taken.has(x + ',' + y)) continue;
    if (Wd.inTown(x - 1, y) || Wd.inTown(x + 1, y) || Wd.inTown(x, y - 1) || Wd.inTown(x, y + 1)) continue;   // keep a clear strip along the border
    if (hash2(x * 7 + 1, y * 13 + 5) < (MAPS[curMap].wreck ?? .11)) wreckList.push([x, y]);
  }
  return wreckList;
}

const DEBRIS_SPOTS = [[3, 3], [6, 3], [9, 2], [12, 3], [1, 8], [14, 9], [0, 17], [5, 18], [11, 18], [15, 6], [15, 18]].map(SH);
function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, VW, VH); if (window.ZH3D) ZH3D.frame(); if (S.sh && S.sh.view) { shDraw(); return; }
  if ((!(window.ZH3D && ZH3D.ready))) {   /* 3D.76: say the world is still loading (big model files on a phone connection) instead of an empty screen */
    const t0 = draw.t0 || (draw.t0 = performance.now()), sec = Math.round((performance.now() - t0) / 1000);
    ctx.fillStyle = '#10241f'; ctx.fillRect(0, 0, VW, VH); ctx.textAlign = 'center'; ctx.fillStyle = '#e8f0e0'; ctx.font = '600 20px Fredoka, sans-serif';
    if (titleOn) { ctx.fillText('Loading the world…', VW / 2, VH / 2); ctx.font = '500 15px Fredoka, sans-serif'; ctx.fillStyle = '#a9b8a4';
    ctx.fillText(sec < 40 ? `${sec} s` : 'Still loading: check your connection, or close and reopen the game', VW / 2, VH / 2 + 26); } ctx.textAlign = 'start';   /* 3D.250: in a game the loading screen (#worldLoad) says it */
  }
  /* V2.18: the build-zone outline is baked into the ground image (stroking it every frame was ~half the frame time) */
  if (sel && (sel.kind === 'wall' || sel.kind === 'post')) {
    for (let y = Wd.WALLZONE.y0; y <= Wd.WALLZONE.y1; y++) for (let x = Wd.WALLZONE.x0; x <= Wd.WALLZONE.x1; x++) {
      const occ = Wd.buildingAt(world, x, y), road = Wd.isRoad(world, x, y), wl = Wd.wallAt(world, x, y);
      diamond(x, y, wl ? 'rgba(224,180,60,.30)' : occ ? 'rgba(183,90,85,.40)' : road ? 'rgba(113,129,138,.45)' : 'rgba(95,174,97,.22)', wl ? '#ffe38a' : road ? '#b4c2c8' : 'rgba(155,220,133,.35)');
    }
  } else if (sel) {
    for (let y = Wd.BUILD.y0; y <= Wd.BUILD.y1; y++) for (let x = Wd.BUILD.x0; x <= Wd.BUILD.x1; x++) {
      const occ = Wd.buildingAt(world, x, y), road = Wd.isRoad(world, x, y);
      if (sel.kind === 'road') diamond(x, y, road ? 'rgba(113,129,138,.55)' : (occ ? 'rgba(183,90,85,.45)' : 'rgba(95,174,97,.30)'), road ? '#b4c2c8' : 'rgba(155,220,133,.5)');
      else diamond(x, y, road ? 'rgba(113,129,138,.35)' : (occ || Wd.wallAt(world, x, y) ? 'rgba(183,90,85,.40)' : 'rgba(95,174,97,.22)'), 'rgba(155,220,133,.35)');   /* 3D.133 a wall or fence tile is taken (was shown green) */
    }
    if (preview && sel.kind === 'building') for (let yy = 0; yy < preview.h; yy++) for (let xx = 0; xx < preview.w; xx++) diamond(preview.x + xx, preview.y + yy, preview.ok ? 'rgba(114,217,223,.62)' : 'rgba(226,91,85,.62)', preview.ok ? '#d7ffff' : '#ffb0a8');
    if ((preview) && sel.kind === 'building') entranceArrow(preview);
  }
  drawTileConfirm();
  for (const p of S.posts || []) if ((sel && sel.kind === 'post') || (selected && selected.kind === 'post' && selected.ref === p)) drawPostRange(p, !!(selected && selected.ref === p));
  const items = [];
  const box = (x, y, r) => ({ x1: x - r, y1: y - r, x2: x + r, y2: y + r });
  /* V2.36: only what is on screen is drawn and depth-sorted (props and wreckage off screen were ~60% of the frame) */
  const mg = TWs() * 2.6, vis = (wx, wy) => { const p = project(wx, wy); return p.x > -mg && p.x < VW + mg && p.y > -mg * .6 && p.y < VH + mg * 1.6; };
  world.buildings.forEach((b) => vis(b.x + b.w / 2, b.y + b.h / 2) && items.push({ x1: b.x, y1: b.y, x2: b.x + b.w, y2: b.y + b.h, fn: () => {   if (selected && selected.ref === b) selectRing(b); drawStaffBadge(b); } }));
  S.z.forEach((z) => { if (z.hp > 0 && vis(z.w.x, z.w.y)) items.push({ ...box(z.w.x, z.w.y, .12), fn: () => drawZombie(z) }); });
  S.sv.forEach((s) => vis(s.w.x, s.w.y) && items.push({ ...box(s.w.x, s.w.y, .12), fn: () => drawHuman(s) }));
  S.sv.forEach((s) => { if (!s.pet || s.mode === 'away' || insideBuilding(s)) return; const pp = petPos(s); items.push({ ...box(pp.w.x, pp.w.y, .06), fn: () => drawPet(s, pp) }); });
  if (S.trader) items.push({ ...box(S.trader.w.x, S.trader.w.y, .12), fn: drawTrader });
  Iso.sortDrawables(items).forEach((o) => o.fn());
  drawCombatFocus();  drawObjMarks(); drawAlertMarks(); drawOverview();
  for (let i = shots.length - 1; i >= 0; i--) if (--shots[i].t <= 0) shots.splice(i, 1);
  drawSpits(); drawHitFx();
  for (const c of S.crates || []) if (c.grab > 0 && !c.taken) { const p = project(c.w.x, c.w.y), u = hudU(), y = p.y - 40 * u;   /* V3D.17: prying the crate loose */
    ctx.save(); ctx.beginPath(); ctx.arc(p.x, y, 12 * u, 0, 7); ctx.fillStyle = '#fff8ec'; ctx.fill(); ctx.lineWidth = 2 * u; ctx.strokeStyle = '#5a3f31'; ctx.stroke(); ctx.lineWidth = 4 * u; ctx.lineCap = 'round'; ctx.strokeStyle = '#7fbf5a'; ctx.beginPath(); ctx.arc(p.x, y, 12 * u, -Math.PI / 2, -Math.PI / 2 + c.grab * Math.PI * 2); ctx.stroke(); ctx.restore();
    const im = window.ZHIcons && ZHIcons.img && ZHIcons.img('box'); if (im && im.complete) ctx.drawImage(im, p.x - 8 * u, y - 8 * u, 16 * u, 16 * u); }
  drawSites(); drawBagFx(); for (const f of floats) { if (!f.a0) { f.a0 = f.a; f.dx = Math.random() < .5 ? -1 : 1; } floatCozy(f, project(f.w.x, f.w.y)); } drawLevelUps();
  if (floats.length > 80) floats.splice(0, floats.length - 80);   /* a burst of numbers can't pile up */
  for (let i = floats.length - 1; i >= 0; i--) if (--floats[i].a <= 0) floats.splice(i, 1);
  if (debug) drawDebug();
}
/* 3D.104 phone overview mode (approved): zoomed out below ~55%, everyone shrinks to a dot, so icons take over: red dots for zombies, a skull
   for a boss, purple for raiders, green dots for people and a pulsing red cross for anyone down; arrows on the screen edge point to threats off screen */
const OV_Z = .55;
function drawOverview() {
  if (cam.z >= OV_Z || titleOn || S.cut) return; const t = performance.now() / 1000, on = (p) => p.x > 8 && p.x < VW - 8 && p.y > 60 && p.y < VH - 90, off = [];
  ctx.save(); ctx.lineWidth = 1.5;
  for (const q of S.sv) { if (q.hp <= 0 && q.mode !== 'down') continue; if (q.mode === 'away' || insideBuilding(q)) continue; const p = project(q.w.x, q.w.y);
    if (q.mode === 'down') { const r = 8 + 2 * Math.sin(t * 6); if (!on(p)) { off.push({ p, c: '#ff5a4a', ic: '✚' }); continue; } ctx.fillStyle = '#ff5a4a'; ctx.beginPath(); ctx.arc(p.x, p.y - 6, r, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillRect(p.x - 1.5, p.y - 11, 3, 10); ctx.fillRect(p.x - 5, p.y - 7.5, 10, 3); continue; }
    if (!on(p)) continue; ctx.fillStyle = q.hp < q.max * .4 ? '#f0a03a' : '#5fd068'; ctx.beginPath(); ctx.arc(p.x, p.y - 4, 3.6, 0, 7); ctx.fill(); ctx.strokeStyle = '#123'; ctx.stroke(); }
  for (const z of S.z) { if (z.hp <= 0 || z.mode === 'appear' || z.zoo) continue; const p = project(z.w.x, z.w.y), boss = z.type === 'boss', threat = boss || z.human || ['zchase', 'zattack', 'zbash', 'zbreak'].includes(z.mode);
    if (!on(p)) { if (threat) off.push({ p, c: boss ? '#ff3030' : z.human ? '#b07cff' : '#e0503c', ic: boss ? '☠' : z.human ? '⚔' : '!' }); continue; }
    if (boss) { ctx.fillStyle = 'rgba(200,30,30,.9)'; ctx.beginPath(); ctx.arc(p.x, p.y - 8, 11, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = '700 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('☠', p.x, p.y - 3.5); continue; }
    ctx.fillStyle = z.human ? '#a070f0' : '#e0503c'; ctx.beginPath(); ctx.arc(p.x, p.y - 4, z.type === 'brute' ? 4.6 : 3.4, 0, 7); ctx.fill(); ctx.strokeStyle = '#2a0c08'; ctx.stroke(); }
  /* edge arrows: one per screen side bucket, with a count */
  const cx = VW / 2, cy = VH / 2, groups = new Map();
  for (const o of off) { const a = Math.atan2(o.p.y - cy, o.p.x - cx), k = Math.round(a / (Math.PI / 8)); const g = groups.get(k) || { a, n: 0, c: o.c, ic: o.ic }; g.n++; if (o.ic === '☠' || o.ic === '✚') { g.c = o.c; g.ic = o.ic; } groups.set(k, g); }
  for (const g of groups.values()) { const dx = Math.cos(g.a), dy = Math.sin(g.a), sx = (VW / 2 - 26) / Math.abs(dx || 1e-6), sy = (VH / 2 - 100) / Math.abs(dy || 1e-6), d = Math.min(sx, sy), x = cx + dx * d, y = cy + dy * d;
    ctx.save(); ctx.translate(x, y); ctx.rotate(g.a); ctx.fillStyle = g.c; ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-6, -11); ctx.lineTo(-6, 11); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = '700 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(g.ic + (g.n > 1 ? g.n : ''), x - dx * 2, y + 4); }
  ctx.restore(); ctx.textAlign = 'start';
}
/* walls: procedural placeholder art (no sprite sheet yet) — single-tile blocks that join their neighbours */
/* V2.33 day / night: a soft tint over the world — warm morning, clear day, orange dusk, deep blue night */
const LIGHT = [[0, [20, 30, 80, .5]], [4.5, [20, 30, 80, .5]], [6, [255, 170, 110, .16]], [8, [255, 255, 255, 0]], [17, [255, 255, 255, 0]], [19, [255, 120, 60, .2]], [20.5, [40, 40, 110, .42]], [24, [20, 30, 80, .5]]];
function daylight(h) {
  for (let i = 0; i < LIGHT.length - 1; i++) { const [h0, a] = LIGHT[i], [h1, b] = LIGHT[i + 1]; if (h >= h0 && h <= h1) { const t = (h - h0) / (h1 - h0 || 1); return a.map((v, k) => v + (b[k] - v) * t); } }
  return LIGHT[0][1];
}
/* V2.38 night lights: warm window light on occupied buildings, a lantern glow around survivors outdoors, red eye-glints on zombies.
   One cached glow sprite drawn additively: cheap on phones. Fades in with the night tint. */

/* V2.45 guard post pixel art, drawn in code on the 96-px-per-tile art grid: a sandbag ring around a pole, the flag coloured by the watch (blue night, gold day, red both) */
const POST_ART = new Map(), POST_FLAG = { night: ['#4f7fd0', '#2c4f8f'], day: ['#e8b73a', '#9c7418'], all: ['#d0503c', '#7e2a1d'] };
function postArt(sched) {
  let c = POST_ART.get(sched); if (c) return c; c = document.createElement('canvas'); c.width = 64; c.height = 70; const g = c.getContext('2d');
  const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); }, cx = 32, cy = 54, rx = 25, ry = 12, [fl, fd] = POST_FLAG[sched] || POST_FLAG.night;
  for (let y = -ry - 1; y <= ry + 1; y++) for (let x = -rx - 2; x <= rx + 2; x++) if ((x * x) / ((rx + 2) * (rx + 2)) + (y * y) / ((ry + 1) * (ry + 1)) <= 1) px(cx + x, cy + y + 2, 1, 1, 'rgba(0,0,0,.22)');   /* shadow */
  const bag = (bx, by) => { bx = Math.round(bx - 5); by = Math.round(by - 3); px(bx + 1, by, 8, 1, '#3d2e1a'); px(bx, by + 1, 10, 4, '#3d2e1a'); px(bx + 1, by + 5, 8, 1, '#3d2e1a'); px(bx + 1, by + 1, 8, 4, '#b39a62'); px(bx + 1, by + 4, 8, 1, '#8e7646'); px(bx + 2, by + 1, 5, 1, '#d8c48c'); px(bx + 4, by + 2, 1, 2, '#8e7646'); };
  const ring = [], N = 12; for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; ring.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  for (const [bx, by] of ring.filter(([, y]) => y < cy).sort((a, b) => a[1] - b[1])) { bag(bx, by); bag(bx, by - 4); }
  px(31, 8, 3, 46, '#3d2e1a'); px(32, 9, 1, 44, '#7a5532'); px(31, 6, 3, 3, '#3d2e1a'); px(32, 7, 1, 1, '#c9b48a');   /* pole */
  px(34, 9, 15, 10, fd); px(34, 10, 14, 8, fl); px(35, 11, 12, 2, 'rgba(255,255,255,.28)'); px(46, 10, 2, 8, fd); px(40, 14, 4, 2, fd);   /* flag */
  for (const [bx, by] of ring.filter(([, y]) => y >= cy).sort((a, b) => a[1] - b[1])) { bag(bx, by); bag(bx, by - 4); }
  POST_ART.set(sched, c); return c;
}
let postIconUrl = null; const postIcon = () => postIconUrl || (postIconUrl = (() => { const a = postArt('night'), c = document.createElement('canvas'); c.width = a.width * 2; c.height = a.height * 2; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(a, 0, 0, c.width, c.height); return c.toDataURL(); })());

function drawPostRange(p, strong) {   /* the watch radius: zombies inside it go for the holder */
  ctx.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, q = project(p.x + .5 + Math.cos(a) * POST_R, p.y + .5 + Math.sin(a) * POST_R); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }
  ctx.fillStyle = strong ? 'rgba(120,170,255,.10)' : 'rgba(120,170,255,.05)'; ctx.fill(); ctx.setLineDash([6 * cam.z, 5 * cam.z]); ctx.strokeStyle = strong ? 'rgba(160,200,255,.85)' : 'rgba(160,200,255,.45)'; ctx.lineWidth = Math.max(1, 1.5 * cam.z); ctx.stroke(); ctx.setLineDash([]);
}
const FAM_ICON = { water: ['💧', '#6fb3e0'], farm: ['🍖', '#e0b84a'], scrap: ['⚙', '#8fc6d8'], research: ['🔬', '#a993e8'] };
const FAC_ICON = { medical: 'medic', kitchen: 'meal' }, TYPE_ICON = aliasT({ inn: 'bed', house: 'home', gym: 'train', library: 'guide', lounge: 'couple', range: 'train', track: 'train', sparring: 'train', armory: 'shield', storage: 'box', bonfire: 'fire', barracks: 'shield' });
function clayBadge(cx, cy, z, icon, dot, count) {   /* V3D.14 Clay marker: cream disc, cocoa outline, icon, optional status dot and count chip */
  const R2 = 10.5 * z, im = window.ZHIcons && ZHIcons.img(icon);
  ctx.beginPath(); ctx.arc(cx, cy + 2 * z, R2, 0, 7); ctx.fillStyle = 'rgba(79,61,51,.4)'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, R2, 0, 7); ctx.fillStyle = '#fff8ec'; ctx.fill(); ctx.lineWidth = 2.4 * z; ctx.strokeStyle = '#5a3f31'; ctx.stroke();
  if (im && im.complete) ctx.drawImage(im, cx - 7.5 * z, cy - 7.5 * z, 15 * z, 15 * z);
  if (dot) { ctx.beginPath(); ctx.arc(cx + R2 * .8, cy - R2 * .8, 4.2 * z, 0, 7); ctx.fillStyle = dot; ctx.fill(); ctx.lineWidth = 2 * z; ctx.stroke(); }
  if (count) { const tx = String(count), w = (7 + 6 * tx.length) * z, x0 = cx - R2 - w + 3 * z, y0 = cy - 7 * z; ctx.beginPath(); ctx.roundRect(x0, y0, w, 14 * z, 7 * z); ctx.fillStyle = '#fff8ec'; ctx.fill(); ctx.lineWidth = 2 * z; ctx.stroke(); hudText(tx, x0 + w / 2, y0 + 11 * z, `600 ${Math.round(11 * z)}px Fredoka, sans-serif`, '#5a3f31'); }
}
function drawStaffBadge(b) {   /* V2.36 building status: producers get a ring that fills with real output toward the next unit (bright while worked);
   facilities show how many are inside; problems get a marker. Everything comes from the simulation state. */
  const d = DEFS[b.type], r = { anchor: project(b.x + b.w, b.y + b.h) }; if (!d) return;
  if (b.burnt) { if ((r.anchor)) { const z = Math.max(.75, cam.z) * .8, pul = 1 + .1 * Math.sin(tick / 6); clayBadge(r.anchor.x, r.anchor.y - TWs() * (b.w + b.h) * .5 * .62 - 20 * z, z * pul, 'wrench', '#e8584a', 0); } return; }   /* 3D.30: wrecked buildings show a pulsing repair marker */
  const z = Math.max(.75, cam.z) * ((.7)), cx = r.anchor.x, cy = r.anchor.y - TWs() * (b.w + b.h) * .5 * .62, fi = FAM_ICON[d.fam], R = 9 * z;   /* V3D.21: cozy markers 30% smaller */
  {   /* V3D.17 fewer markers: a building shows nothing unless it needs you (under attack, damaged, no worker, dry, unpaid), is selected, or you zoom right in */
    const hp = bHp(b), hit = tick - (b.lastHit || -9999) < 240, sel = selected && selected.ref === b, prob = (d.slot && !b.staff) || (d.fam === 'farm' && b.dry) || b.unpaid;
    if (hit || hp < b.max) { const w = 46 * z, h = 7 * z, y = cy + 2 * z; ctx.save(); ctx.beginPath(); ctx.roundRect(cx - w / 2, y, w, h, h / 2); ctx.fillStyle = '#fff8ec'; ctx.fill(); ctx.lineWidth = 2 * z; ctx.strokeStyle = '#5a3f31'; ctx.stroke();
      const k = hp / b.max; ctx.beginPath(); ctx.roundRect(cx - w / 2 + 1.5 * z, y + 1.5 * z, Math.max(0, (w - 3 * z) * k), h - 3 * z, (h - 3 * z) / 2); ctx.fillStyle = k > .5 ? '#7fbf5a' : k > .25 ? '#f2b84a' : '#e8584a'; ctx.fill(); ctx.restore(); }
    { const inside = S.sv.filter((q) => insideBuilding(q) === b).length, dmg = hp < b.max, by = cy - 27 * z;   /* V3D.21: who is inside, and that it needs repair, at a glance */
      if (inside) clayBadge(cx - (dmg ? 13 : 0) * z, by, z, 'people', null, inside);
      if (dmg) clayBadge(cx + (inside ? 13 : 0) * z, by, z, 'wrench', hp < b.max * .5 ? '#e8584a' : '#f2c14e', 0); }
    if (hit && occupied(b)) { const pulse = 1 + .08 * Math.sin(tick / 5), w = 40 * z * pulse, h = 20 * z * pulse, y = cy - 50 * z; ctx.save(); ctx.beginPath(); ctx.roundRect(cx - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = '#e8584a'; ctx.fill(); ctx.lineWidth = 2.4 * z; ctx.strokeStyle = '#5a3f31'; ctx.stroke(); hudText('SOS', cx, y + 5 * z * pulse, `800 ${Math.round(13 * z * pulse)}px Nunito, sans-serif`, '#fff8ec'); ctx.restore(); return; }
    if ((!hit) && !b.burnt) drawBonus(b, cx, cy, z);   /* 3D.28 tap-to-collect bubble */
    if (hit || (!sel && !prob && cam.z < 1.7)) return;
  }
  ctx.save();
  if ((fi) && window.ZHIcons) {   /* V3D.14 Clay badge: cream disc, cocoa outline, a progress ring in the resource colour, a status dot */
    const on = isWorking(b), R2 = 11 * z, im = ZHIcons.img({ water: 'water', farm: 'food', scrap: 'parts', research: 'research' }[d.fam]);
    ctx.beginPath(); ctx.arc(cx, cy + 2 * z, R2, 0, 7); ctx.fillStyle = 'rgba(79,61,51,.4)'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, R2, 0, 7); ctx.fillStyle = '#fff8ec'; ctx.fill(); ctx.lineWidth = 2.4 * z; ctx.strokeStyle = '#5a3f31'; ctx.stroke();
    ctx.lineCap = 'round'; ctx.lineWidth = 3 * z; ctx.strokeStyle = on ? fi[1] : '#d8c4a6'; ctx.beginPath(); ctx.arc(cx, cy, R2 + 3.2 * z, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(.02, Math.min(1, b.acc || 0))); ctx.stroke(); ctx.lineCap = 'butt';
    if (im && im.complete) ctx.drawImage(im, cx - 8 * z, cy - 8 * z, 16 * z, 16 * z);
    if (d.slot) { ctx.beginPath(); ctx.arc(cx + R2 * .8, cy - R2 * .8, 4.2 * z, 0, 7); ctx.fillStyle = b.staff ? (on ? '#7cc95a' : '#a9c49f') : '#f2c14e'; ctx.fill(); ctx.lineWidth = 2 * z; ctx.strokeStyle = '#5a3f31'; ctx.stroke(); }
    if ((d.fam === 'farm' && b.dry) || b.unpaid) hudText(b.unpaid ? '½' : '!', cx + R2 * 1.9, cy + 5 * z, `600 ${Math.round(14 * z)}px Fredoka, sans-serif`, '#e8574a', '#fff8ec', 3 * z);
  } else if (fi) {
    const on = isWorking(b); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fillStyle = 'rgba(16,24,18,.82)'; ctx.fill();
    ctx.lineWidth = 3 * z; ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.arc(cx, cy, R - 1.5 * z, 0, 7); ctx.stroke();
    ctx.strokeStyle = on ? fi[1] : 'rgba(200,190,160,.55)'; ctx.beginPath(); ctx.arc(cx, cy, R - 1.5 * z, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, b.acc || 0)); ctx.stroke();
    stampText(fi[0], cx, cy + 4.5 * z, `${Math.round(10 * z)}px sans-serif`, '#fff');
    if (d.slot) { ctx.beginPath(); ctx.arc(cx + R * .78, cy - R * .78, 3.6 * z, 0, 7); ctx.fillStyle = b.staff ? (on ? '#4fd36a' : '#2f8f48') : 'rgba(240,176,48,.95)'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#102418'; ctx.stroke(); }
    if ((d.fam === 'farm' && b.dry) || b.unpaid) stampText(b.unpaid ? '½' : '💧✗', cx + R * 1.9, cy + 4 * z, `bold ${Math.round(11 * z)}px sans-serif`, '#ff9a84');
  } else if ((window.ZHIcons) && (d.slot || facilityRules[b.type] || TYPE_ICON[b.type])) {   /* V3D.14: Clay markers for medical, canteen, inn, houses, training */
    const icon = FAC_ICON[d.fam] || TYPE_ICON[b.type] || 'person', n = d.fam === 'medical' ? S.sv.filter((q) => q.mode === 'hospital' && (q.careAt === b || (!q.careAt && medSite() === b))).length : S.sv.filter((q) => q.facility === b && q.mode === 'useFacility').length;
    const sl = (isT(b, 'house') || isT(b, 'inn')) && S.sv.some((q) => q.facility === b && q.sleeping);
    clayBadge(cx, cy, z, sl ? 'sleep' : icon, d.slot ? (b.staff ? (isWorking(b) ? '#7cc95a' : '#a9c49f') : '#f2c14e') : null, n || 0);
    ctx.restore(); return;
  } else if (d.slot) {   // staffed non-producers (medical, kitchen): the old dot
    if (d.fam === 'medical') { const n = S.sv.filter((q) => q.mode === 'hospital' && (q.careAt === b || (!q.careAt && medSite() === b))).length; if (n) stampText(`✚${n}`, cx + 14 * z, cy + 4 * z, `600 ${Math.round((Math.round(12 * z)) * .85)}px Fredoka, Nunito, sans-serif`, '#ff9a9a'); }
    ctx.beginPath(); ctx.arc(cx, cy, 5.5 * z, 0, 7); ctx.fillStyle = b.staff ? (isWorking(b) ? '#4fd36a' : '#2f8f48') : 'rgba(240,176,48,.9)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#102418'; ctx.stroke();
  }
  if (facilityRules[b.type]) { const n = S.sv.filter((q) => q.facility === b && q.mode === 'useFacility').length; if (n > 0) { const sl = isT(b, 'house') && S.sv.some((q) => q.facility === b && q.sleeping); stampText(`${sl ? '💤' : '👤'}${n}`, cx + (fi || d.slot ? -R * 1.9 : 0), cy + 4 * z, `600 ${Math.round((Math.round(11 * z)) * .85)}px Fredoka, Nunito, sans-serif`, '#fff3c4'); } }
  ctx.restore();
}
function selectRing(b) {
  const c = [project(b.x, b.y), project(b.x + b.w, b.y), project(b.x + b.w, b.y + b.h), project(b.x, b.y + b.h)];
  ctx.beginPath(); ctx.moveTo(c[0].x, c[0].y); c.slice(1).forEach((p) => ctx.lineTo(p.x, p.y)); ctx.closePath(); ctx.strokeStyle = '#ffe145'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);
}
function drawDebug() {
  ctx.save(); ctx.lineWidth = 1; ctx.font = '9px monospace'; ctx.textAlign = 'left';
  for (let x = 0; x <= COLS; x++) { const a = project(x, 0), b = project(x, ROWS); ctx.strokeStyle = 'rgba(255,255,255,.10)'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  for (let y = 0; y <= ROWS; y++) { const a = project(0, y), b = project(COLS, y); ctx.strokeStyle = 'rgba(255,255,255,.10)'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  for (const b of world.buildings) {
    const c = [project(b.x, b.y), project(b.x + b.w, b.y), project(b.x + b.w, b.y + b.h), project(b.x, b.y + b.h)];
    ctx.beginPath(); ctx.moveTo(c[0].x, c[0].y); c.slice(1).forEach((p) => ctx.lineTo(p.x, p.y)); ctx.closePath(); ctx.strokeStyle = '#14f5eb'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ffcc3a'; ctx.beginPath(); ctx.arc(c[2].x, c[2].y, 4, 0, 7); ctx.fill();
    const dp = Wd.doorPoint(b), dpp = project(dp.x, dp.y); ctx.fillStyle = '#ff3df2'; ctx.beginPath(); ctx.arc(dpp.x, dpp.y, 3, 0, 7); ctx.fill();
    const dt = Wd.doorTile(b); ctx.save(); tilePath(dt.x, dt.y); ctx.strokeStyle = '#ff3df2'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#fff'; ctx.fillText(`${b.type} (${b.x},${b.y}) ${b.w}x${b.h} S=(${b.x + b.w},${b.y + b.h})`, c[3].x - 6, c[3].y + 11);
  }
  for (const s of S.sv) { const p = project(s.w.x, s.w.y); ctx.fillStyle = '#ff4040'; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); if (s.path && s.path.length) { ctx.strokeStyle = 'rgba(80,255,120,.8)'; ctx.beginPath(); ctx.moveTo(p.x, p.y); for (const q of s.path) { const pp = project(q.x, q.y); ctx.lineTo(pp.x, pp.y); } ctx.stroke(); } }
  for (const z of S.z) { const p = project(z.w.x, z.w.y); ctx.fillStyle = '#ff9040'; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(4, VH - 38, 252, 34); ctx.fillStyle = '#9ff'; ctx.fillText(`DEBUG  TH/TW=${(BASE_TH / BASE_TW).toFixed(4)}  angle=${Iso.ANGLE_DEG.toFixed(3)}°  zoom=${cam.z.toFixed(2)}`, 8, VH - 24);
  ctx.fillStyle = '#ffcc3a'; ctx.fillText('● south anchor', 8, VH - 11); ctx.fillStyle = '#ff3df2'; ctx.fillText('● door', 96, VH - 11); ctx.fillStyle = '#14f5eb'; ctx.fillText('▭ footprint', 140, VH - 11); ctx.fillStyle = '#ff4040'; ctx.fillText('■ feet', 208, VH - 11);
  ctx.restore();
}

