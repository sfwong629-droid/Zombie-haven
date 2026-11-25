/* ---------------- V2.45 guard posts: sandbagged spots the player places. The holder stands watch there (engages from 25% farther, spots raiders
   sooner, takes 20% less damage behind the sandbags) and zombies within 4 tiles go for the holder first. Fighters without a post patrol between posts. ---------------- */
const POST_COST = 3, POST_R = 4, POST_SCHED = { night: { name: 'Night watch', icon: '🌙', on: () => isNight() }, day: { name: 'Day watch', icon: '☀️', on: () => !isNight() }, all: { name: 'Day and night', icon: '⏰', on: () => true } };
const postMax = () => 1 + (S.rank || 1);
const postPt = (p) => ({ x: p.x + .5, y: p.y + .5 });
const postAt = (x, y) => (S.posts || []).find((p) => p.x === x && p.y === y) || null;
const postName = (p) => { const c = townCentre(), dx = p.x + .5 - c.x, dy = p.y + .5 - c.y, sx = dx - dy, sy = dx + dy; return (Math.abs(sx) > Math.abs(sy) * 1.5 ? (sx > 0 ? 'east' : 'west') : Math.abs(sy) > Math.abs(sx) * 1.5 ? (sy > 0 ? 'south' : 'north') : (sy > 0 ? 'south' : 'north') + (sx > 0 ? '-east' : '-west')) + ' post'; };   /* screen directions */
const canHold = (q) => q && q.hp > 0 && isFighter(q) && !['down', 'hospital', 'away', 'errand'].includes(q.mode) && S.sv.includes(q);
function postsAssign() {   /* manual holders first; 'auto' (and a manual post whose holder is away) gets the best free fighter: Guards and Police first, then the healthiest */
  const P = S.posts || [], used = new Set();
  for (const p of P) { const q = typeof p.holder === 'number' ? S.sv.find((x) => x.id === p.holder) : null; p.cur = canHold(q) ? q.id : null; if (p.cur) used.add(p.cur); }
  const pool = S.sv.filter((q) => canHold(q) && !used.has(q.id) && !q.post).sort((a, b) => (['Guard', 'Police Officer'].includes(b.job) - ['Guard', 'Police Officer'].includes(a.job)) || (b.l - a.l) || (b.hp - a.hp));
  for (const p of P) if (!p.cur && p.holder !== null && pool.length) { const q = pool.shift(); p.cur = q.id; used.add(q.id); }
}
const myPost = (s) => (S.posts || []).find((p) => p.cur === s.id) || null;
const postActive = (p) => !!p && (POST_SCHED[p.sched] || POST_SCHED.night).on();
const atPost = (s) => { const p = myPost(s); return p && postActive(p) && dist(s.w, postPt(p)) < .8 ? p : null; };
function postLure(z) {   /* a manned post draws zombies within POST_R to its holder */
  let best = null, bd = POST_R; for (const p of S.posts || []) { if (!p.cur) continue; const h = S.sv.find((q) => q.id === p.cur); if (!h || !atPost(h)) continue; const d = dist(z.w, postPt(p)); if (d < bd) { bd = d; best = h; } }
  return best;
}
function tryPost(x, y) {
  S.posts = S.posts || []; const ex = postAt(x, y);
  if (ex) { showPost(ex); return { ok: false, why: 'open' }; }
  if (!Wd.inWallZone(x, y) && !(x >= Wd.BUILD.x0 && x <= Wd.BUILD.x1 && y >= Wd.BUILD.y0 && y <= Wd.BUILD.y1)) { say('Guard posts go in or around the town, inside the glowing area.'); return { ok: false, why: 'zone' }; }
  if (Wd.buildingAt(world, x, y)) { say('A building is in the way.'); return { ok: false, why: 'building' }; }
  if (Wd.wallAt(world, x, y)) { say('A wall is in the way: put the post just inside it.'); return { ok: false, why: 'wall' }; }
  if (S.posts.length >= postMax()) { say(`At most ${postMax()} guard posts at this rank.`); return { ok: false, why: 'max' }; }
  if (S.posts.length && S.posts.some((p) => Math.abs(p.x - x) + Math.abs(p.y - y) < 3)) { say('Too close to another post: spread them out.'); return { ok: false, why: 'close' }; }
  if (S.mat < POST_COST) { say(`A guard post costs ${POST_COST} scrap.`); return { ok: false, why: 'parts' }; }
  S.mat -= POST_COST; flow('mat', 'Guard posts', -POST_COST); const p = { x, y, holder: 'auto', sched: 'night', cur: null }; S.posts.push(p); postsAssign(); SFX('build');
  const h = p.cur && S.sv.find((q) => q.id === p.cur); say(`Guard post placed (night watch)${h ? ': ' + h.name + ' will hold it' : ': no free fighter yet'}. Tap it to set who and when.`, true); updatePostBar(); saveGame(); return { ok: true, post: p };
}
function removePost(p) { S.posts = (S.posts || []).filter((q) => q !== p); S.mat += 1; for (const q of S.sv) if (q.purpose === 'post' || q.purpose === 'post-hold') { if (!myPost(q)) { q.purpose = null; if (q.mode === 'wait') q.stateTicks = 0; } } postsAssign(); saveGame(); }
function updatePostBar() { if (sel && sel.kind === 'post') { defPlanBar(); return; } if (0) $('confirmName').textContent = `GUARD POST · ⚙${POST_COST} · ${(S.posts || []).length}/${postMax()} placed · tap a tile to place, tap a post to set it up`; }
function showPost(p) {
  endBuildMode(true); closeP(); postsAssign(); const h = p.cur && S.sv.find((q) => q.id === p.cur), manual = typeof p.holder === 'number' ? S.sv.find((q) => q.id === p.holder) : null;
  const fighters = S.sv.filter((q) => isFighter(q)), sc = POST_SCHED[p.sched] || POST_SCHED.night;
  const opt = (v, label, sub, on) => `<div class="card" data-ph="${v}" style="${on ? 'border-color:var(--good)' : ''}"><div class="sp">${label}<div class="sm">${sub}</div></div>${on ? '<b style="color:var(--good)">✔</b>' : ''}</div>`;
  $('ib').innerHTML = `<div class="card"><b>🛡 ${postName(p)[0].toUpperCase() + postName(p).slice(1)}</b> <span class="sm">${sc.icon} ${sc.name} · ${postActive(p) ? 'on watch now' : 'off watch now'}</span>
    <div class="sm">${h ? `Held by <b>${esc(h.name)}</b> ${traitIcon(h)}${atPost(h) ? ' (at the post)' : postActive(p) ? ' (on the way or taking a break)' : ' (off watch: free time)'}` : 'Nobody holds it right now'}${manual && !canHold(manual) ? ` · ${esc(manual.name)} is away or hurt, so auto fills in` : ''}</div>
    <div class="sm">The holder engages from 25% farther, spots raiders sooner and takes 20% less damage behind the sandbags. Zombies within ${POST_R} tiles go for the holder first. Fighters without a post patrol between posts.</div></div>
    <div class="sm">When</div><div class="tabs" style="position:static">${Object.entries(POST_SCHED).map(([k, v]) => `<button data-ps="${k}" class="${p.sched === k ? 'on' : ''}">${v.icon} ${v.name}</button>`).join('')}</div>
    <div class="sm">${p.sched === 'all' ? 'Day and night: the holder only leaves when exhausted, hungry or hurt, so they tire fast.' : p.sched === 'day' ? 'Day watch protects the workers. At night the holder sleeps.' : 'Night watch guards the town while it sleeps. By day the holder is free.'}</div>
    <div class="sm">Who</div><div class="lst">${opt('auto', 'Auto', 'The best free fighter (Guards and Police first)', p.holder === 'auto')}${fighters.map((q) => opt(q.id, `${esc(q.name)} ${traitIcon(q)} <span class="sm">${q.job} Lv.${q.l}</span>`, canHold(q) ? `HP ${Math.ceil(q.hp)}/${q.max}${q.post ? ' · leaves the ' + DEFS[q.post.type].name + ' while on watch' : ''}${myPost(q) && myPost(q) !== p ? ' · now holds the ' + postName(myPost(q)) : ''}` : 'away or hurt', p.holder === q.id)).join('')}${opt('none', 'Nobody', 'Keep it as a patrol point only', p.holder === null)}</div>
    <button class="act danger" id="pRemove" style="width:100%">Remove post (+1 scrap back)</button>`;
  $('ib').querySelectorAll('[data-ps]').forEach((b) => { b.onclick = () => { p.sched = b.dataset.ps; for (const q of S.sv) if (q.purpose === 'post-hold' && myPost(q) === p) q.stateTicks = 0; saveGame(); showPost(p); }; });
  $('ib').querySelectorAll('[data-ph]').forEach((b) => { b.onclick = () => { const v = b.dataset.ph; if (v === 'auto') p.holder = 'auto'; else if (v === 'none') p.holder = null; else { const id = +v; for (const o of S.posts) if (o !== p && o.holder === id) o.holder = 'auto'; p.holder = id; } postsAssign(); for (const q of S.sv) if (q.purpose === 'post-hold' || q.purpose === 'post') { q.stateTicks = 0; if (q.mode === 'walk') q.mode = 'free'; } saveGame(); showPost(p); }; });
  $('pRemove').onclick = () => { removePost(p); closeP(); say('Guard post removed.'); };
  selected = { kind: 'post', ref: p }; showPanel('Guard Post');
}
function patrolDest() { if ((S.posts || []).length) { const p = S.posts[Math.floor(rnd() * S.posts.length)], a = rnd() * 6.283; return { x: p.x + .5 + Math.cos(a) * .9, y: p.y + .5 + Math.sin(a) * .9 }; } let x0 = 99, y0 = 99, x1 = 0, y1 = 0; for (const b of world.buildings) { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w - 1); y1 = Math.max(y1, b.y + b.h - 1); }   /* 3D.64: walk the edge of the settlement (there are no roads to patrol now) */
  x0 = Math.max(Wd.BUILD.x0, x0 - 2); y0 = Math.max(Wd.BUILD.y0, y0 - 2); x1 = Math.min(Wd.BUILD.x1, x1 + 2); y1 = Math.min(Wd.BUILD.y1, y1 + 2);
  for (let k = 0; k < 20; k++) { const side = Math.floor(rnd() * 4), t = rnd(), x = Math.round(side < 2 ? x0 + t * (x1 - x0) : side === 2 ? x0 : x1), y = Math.round(side >= 2 ? y0 + t * (y1 - y0) : side === 0 ? y0 : y1); if (Wd.walkable(world, x, y) && !Wd.buildingAt(world, x, y)) return tc(x, y); } return tc(7, 7); }
function roamDest(s) { const o = s ? tileOf(s.w) : { x: 7 + OFF, y: 10 + OFF }; for (let k = 0; k < 12; k++) { const x = o.x + Math.round((rnd() - .5) * 10), y = o.y + Math.round((rnd() - .5) * 10); if (Wd.inMap(x, y) && Wd.walkable(world, x, y) && !Wd.buildingAt(world, x, y) && Wd.inTown(x, y)) return tc(x, y); } return tc(o.x, o.y); }   /* 3D.63: a short stroll nearby (with no roads everyone walked to the same spot) */

/* ======================= V3D.14 "life": emotions, chatter and smarter choices (all offline, no network) =======================
   emote(s, icon): a little speech bubble with an emoji over a survivor (drawn by drawEmote; the 3D face follows the mood).
   Free time: pairs stop to chat in emoji (Dungeon Village 2 style) and grow closer; evenings around the Bonfire;
   when food or water is short, free hands pitch in at the producer. Before night, the hurt patch up and the hungry eat.
   In combat: the attacked shout for help, ranged fighters step back to keep distance, fighters finish off weak zombies.
   Tracked in docs/AI_BEHAVIOUR.md. */
const EMO_FACE = { '😊': 'happy', '😂': 'happy', '🥳': 'happy', '😋': 'happy', '❤️': 'happy', '🎶': 'happy', '😌': 'happy', '👍': 'happy', '🙏': 'happy', '😎': 'happy',
  '😤': 'angry', '💪': 'angry', '😠': 'angry', '😣': 'hurt', '😱': 'hurt', '😰': 'hurt', '🆘': 'hurt', '😢': 'hurt', '😟': 'hurt', '🥱': 'ko', '😴': 'ko' };
/* 3D.265 the emoji rule (owner, bug B24: "reduce some of the emoji"; `02-DECISIONS.md`, UI). Counted in game steps (60 = a second at normal speed):
   the same emoji on one person at most once every 10 s; a person shows a new emoji at most every 3 s; the fight faces count as one,
   once per 10 s; the mood faces that come by themselves at most every 20 s (emoTick); the hurt face only when a hit takes someone past
   a quarter of their health (zombie hits). Always shown: needs rescue, thanks, reloading, grief, and the back-and-forth of a chat. */
const EMO_ALWAYS = new Set(['🆘', '🙏', '🔄', '😢']), EMO_FIGHT = new Set(['❗', '😤', '💪', '😎', '😱', '😰', '😵', '😖', '😣']);
function emote(s, icon, f = 110, force = false, chat = false) {
  if ((!s) || !s.w) return; if (!force && s.emo && s.emo.f > 30 && s.emo.pri) return;
  if (!chat && !EMO_ALWAYS.has(icon)) { const m = s.emoT || (s.emoT = {}); if (tick - (m[icon] ?? -1e9) < 600 || tick - (s.emoAny ?? -1e9) < 180 || (EMO_FIGHT.has(icon) && tick - (s.emoFight ?? -1e9) < 600)) return; m[icon] = tick; if (EMO_FIGHT.has(icon)) s.emoFight = tick; }
  s.emoAny = tick; s.emo = { t: icon, f, f0: f, face: EMO_FACE[icon] || null, pri: force };
}
function emoTick(s) {
  if (tick % 600 === ((s.id || 0) * 13) % 600 && s.hp > 0 && s.hp < s.max && gearFx(s, 'regen') && !['chase', 'attack', 'recover', 'down'].includes(s.mode)) s.hp = Math.min(s.max, s.hp + Math.max(1, Math.round(s.max * .02)));   /* 3D.28 Medic Pouch */
  if (s.bark && --s.bark.f <= 0) s.bark = null;
  if (s.emo && --s.emo.f <= 0) s.emo = null;
  if (s.emo || s.bark || tick % 40 !== (s.i * 7) % 40 || rnd() > .16) return;   /* now and then, a mood shows by itself */
  const busy = ['chase', 'attack', 'recover', 'down', 'hospital', 'away'].includes(s.mode); if (busy) return;
  const grief = (S.griefUntil || 0) > nowH(), rain = !!S.weather, out = !insideBuilding(s);
  const pick = grief ? '😢' : s.hp < s.max * .4 ? '😣' : s.hunger > 70 ? (S.food < 1 ? '😟' : '🍖') : s.thirst > 70 ? '💧' : s.fatigue > 75 ? '🥱'
    : rain && out && !gearFx(s, 'rain') ? '☔' : isNight() && out && activeZ() > 0 ? '😰' : (s.sat || 0) > 70 ? ['😊', '🎶', '😌'][Math.floor(rnd() * 3)] : (s.sat || 0) < 25 ? '😞' : null;
  const say = { '😢': 'sad', '😣': 'hurt', '😟': 'hungry', '🍖': 'hungry', '💧': 'thirsty', '🥱': 'tired', '☔': 'rain', '😰': 'scared', '😊': 'happy', '🎶': 'happy', '😌': 'happy', '😞': 'sad' }[pick];
  if (pick && say && rnd() < .35 && bark(s, say)) return;   /* 3D.27: sometimes they say it out loud */
  if (!pick && rnd() < .07 && bark(s, isNight() ? 'scared' : 'idle')) return;
  if (pick && tick - (s.emoAny ?? -1e9) >= 1200) emote(s, pick, 100);   /* 3D.265 emoji rule: a mood face by itself at most every 20 s */
}
function drawEmote(s, p, y) {   /* cream speech bubble with a tail; pops in, bobs, fades */
  const e = s.emo; if (!e) return; if (p.x < -10 || p.x > VW + 10 || p.y < 0 || p.y > VH + 40) return; const u = hudU() * HUD_SMALL, k = 1 - e.f / e.f0, pop = k < .1 ? .5 + k * 6 : 1, al = e.f < 15 ? e.f / 15 : 1;
  const parts = window.ZHIcons ? ZHIcons.split(e.t).filter((q) => q.i || q.t.trim()) : [{ t: e.t }], np = Math.max(1, parts.length);
  const r = 13 * u * pop, x = p.x + 14 * u, cy = y - r - 4 * u + Math.sin(tick / 12) * 1.5 * u, rx = r * (np > 1 ? 1.15 + .55 * (np - 1) : 1.15);
  ctx.save(); ctx.globalAlpha = al; ctx.lineWidth = (GLASS ? 1.1 : 2.2) * u; ctx.strokeStyle = GLASS ? 'rgba(0,0,0,.12)' : '#161616'; ctx.lineJoin = 'round';
  const blob = (ox) => { ctx.beginPath(); ctx.ellipse(x + ox, cy + ox, rx, r, 0, 0, 7); ctx.moveTo(x - r * .5 + ox, cy + r * .75 + ox); ctx.lineTo(x - r * .95 + ox, cy + r * 1.45 + ox); ctx.lineTo(x - r * .05 + ox, cy + r * .92 + ox); };
  const bf = GLASS ? 'rgba(255,255,255,.96)' : '#FFFDF4';   /* emoji bubbles stay white so the sticker icons read */ if (!GLASS) { ctx.fillStyle = '#161616'; blob(2 * u); ctx.fill(); } else { ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 7 * u; ctx.shadowOffsetY = 2 * u; }
  ctx.fillStyle = bf; blob(0); ctx.fill(); ctx.shadowColor = 'transparent'; ctx.stroke();
  if (!GLASS) { ctx.beginPath(); ctx.ellipse(x, cy, rx - 1.4 * u, r - 1.4 * u, 0, 0, 7); ctx.fill(); }
  const sz = r * 1.35, gap = sz * 1.02, x1 = x - gap * (np - 1) / 2;
  parts.forEach((q, i) => { const im = q.i && ZHIcons.img(q.i); if (im && im.complete) ctx.drawImage(im, x1 + i * gap - sz / 2, cy - sz / 2, sz, sz);
    else { ctx.fillStyle = '#161616'; ctx.font = `${Math.round(r * 1.15)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(q.t || '', x1 + i * gap, cy + 1 * u); } });
  ctx.restore();
}
/* ======================= 3D.27 barks: survivors say things out loud (lines in js/barks.js), in Bunker Comic bubbles =======================
   bark(s, key, vars, {pri}) shows one line over a survivor. pri 0 = chatter (rate limited, max 2 on screen), 1 = event, 2 = urgent.
   barkSomeone() picks a free survivor (nearest to a point when given). barkWatch() spots zombies and hordes; barkHour() covers the clock. */
const BARK_LAST = {}; let barkGlobalT = 0, barkSquad = null;
const GLASS = typeof document !== 'undefined' && document.documentElement.classList.contains('glass');   /* 3D.28 Glass UI: bubbles are dark frosted glass */
const SWEAR_RE = /\b(fuck(?:ing|er|ed)?|shit(?:ty)?|bitch|bastards?|asshole|ass|damn(?:ed)?|hell|bloody|dumbass)\b/gi, unswear = (t) => (OPTS.swear === false ? t.replace(SWEAR_RE, (w) => w[0] + '*'.repeat(Math.max(1, w.length - 2)) + w[w.length - 1]) : t);   /* 3D.41 Settings > Swearing in chat */
const barkFill = (t, v) => unswear(t.replace(/\{(\w+)\}/g, (m, k) => (v && v[k] != null ? v[k] : k === 'n' ? '' : k === 'b' ? 'building' : k === 'r' ? 'supplies' : k === 'dest' ? 'ruins' : 'friend')));
function barkLine(key, v, s) {
  const B = window.ZH_BARKS && ZH_BARKS[key]; const L0 = B && B.lines; if (!L0 || !L0.length) return null;
  const L = L0.filter((l) => { const [t] = lineTag(l); return !t || (s && voiceOk(s, t)); }); if (!L.length) return null;   /* 3D.44 only lines that fit the speaker's voice */
  let i = Math.floor(rnd() * L.length); if (L.length > 1 && i === BARK_LAST[key]) i = (i + 1) % L.length; BARK_LAST[key] = i; return { t: barkFill(lineTag(L[i])[1], v), st: B.style || 'talk' };
}
const barkable = (q) => q && q.hp > 0 && q.w && !['away', 'down', 'hospital'].includes(q.mode) && !q.sleeping && !insideBuilding(q);
function bark(s, key, v = {}, o = {}) {
  if ((!barkable(s))) return false; const pri = o.pri || 0;
  if (s.bark && s.bark.f > 20 && s.bark.pri >= pri) return false;
  if (!pri && ((s.barkNext || 0) > tick || barkGlobalT > tick || S.sv.filter((q) => q.bark).length >= 2)) return false;
  const L = o.line ? { t: barkFill(o.line, v), st: o.style || 'talk' } : barkLine(key, v, s); if (!L) return false;
  const f = o.f || Math.min(330, 150 + L.t.length * 4);
  s.bark = { t: GLASS ? L.t : L.t.toUpperCase(), st: o.style || L.st, f, f0: f, pri }; s.emo = null;
  s.barkNext = tick + 1800 + Math.floor(rnd() * 1200); barkGlobalT = tick + (pri ? 60 : 260); return true;
}
function barkSomeone(key, v, o = {}, near, not) {
  const c = S.sv.filter((q) => barkable(q) && q !== not && !(q.bark && q.bark.pri >= (o.pri || 0) && q.bark.f > 20)); if (!c.length) return null;
  const q = near ? c.sort((a, b) => dist(a.w, near) - dist(b.w, near))[0] : c[Math.floor(rnd() * c.length)];
  return bark(q, key, v, o) ? q : null;
}
function barkWatch() {   /* every half second: zombies spotted, a horde arriving, all clear, the squad back home */
  if ((tick % 30)) return;
  if (barkSquad && tick >= barkSquad.at) { const back = S.sv.filter((q) => barkSquad.ids.includes(q.id)), lead = back.find(barkable);
    if (lead) { bark(lead, barkSquad.lost || lead.hp < lead.max * .5 ? 'returnHurt' : 'return', {}, { pri: 2 }); barkSomeone('greetSquad', {}, { pri: 1 }, lead.w, lead); } barkSquad = null; }
  const az = S.z.filter((z) => z.hp > 0 && !z.human && z.mode !== 'zleave'), n = az.length, was = S.barkZ || 0; S.barkZ = n;
  if (n >= 5 && was < 5) { barkSomeone(az.some((z) => z.type === 'boss') ? 'boss' : 'horde', {}, { pri: 2 }, az[0].w); S.barkFought = S.day; return; }
  if (n === 0 && was >= 2) { barkSomeone('calm', {}, { pri: 1 }); return; }
  if ((S.barkSpotT || 0) > tick) return;
  for (const z of az) { if (z.spotted) continue; const q = S.sv.find((q) => barkable(q) && dist(q.w, z.w) < 7); if (q) { z.spotted = 1; bark(q, z.type === 'boss' ? 'boss' : 'spot', {}, { pri: 2 }); S.barkSpotT = tick + 900; break; } }
}
function barkHour() {   /* once a game hour */
   const h = S.hour % 24;
  if (h === 6) barkSomeone(S.barkFought === S.day - 1 || S.barkFought === S.day ? 'dawn' : 'morning', { n: S.day }, { pri: 1 });
  else if (h === 19) barkSomeone('dusk', {}, { pri: 1 });
  else if (h === 22 && activeZ() === 0) barkSomeone('night', {}, {});
  if (h % 6 === 3 && S.sv.length) { const r = rationNeed(); if (S.food < r.f * 1.2) barkSomeone('lowFood', {}, { pri: 1 }); else if (S.water < r.w * 1.2) barkSomeone('lowWater', {}, { pri: 1 }); }
}
function drawBark(s, p, y) {   /* Bunker Comic speech bubble: cream + hard ink, jagged yellow for shouts, cloud for thoughts, dashed for whispers */
  const e = s.bark; if (!e) return; if (p.x < -10 || p.x > W_() + 10 || p.y < 0 || p.y > VH + 40) return;   /* 3D.30: no bubble pinned to the screen edge for someone off screen */
  const u = hudU() * HUD_SMALL, k = 1 - e.f / e.f0, pop = k < .06 ? .6 + k / .06 * .4 : 1, al = e.f < 15 ? e.f / 15 : 1, st = e.st;
  const fs = (GLASS ? 11 : 11.5) * u, font = GLASS ? `${st === 'think' ? 'italic ' : ''}800 ${Math.round(fs)}px Manrope, system-ui, sans-serif` : `${st === 'think' ? 'italic ' : ''}700 ${Math.round(fs)}px 'Comic Neue', 'Comic Sans MS', sans-serif`; ctx.save(); ctx.font = font;
  const maxW = 128 * u, words = e.t.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur);
  const tw = Math.max(...lines.map((l) => ctx.measureText(l).width)), lh = fs * 1.12, padX = (st === 'shout' ? 13 : 9) * u, padY = (st === 'shout' ? 9 : 6) * u;
  const bw = tw + padX * 2, bh = lines.length * lh + padY * 2, cx = Math.max(bw / 2 + 4, Math.min(W_() - bw / 2 - 4, p.x)), by = y - bh - 12 * u + Math.sin(tick / 14) * u;
  ctx.globalAlpha = al; ctx.translate(cx, by + bh / 2); ctx.scale(pop, pop); ctx.translate(-cx, -(by + bh / 2));
  const x0 = cx - bw / 2, ink = GLASS ? (st === 'shout' ? 'rgba(255,255,255,.35)' : 'rgba(30,36,42,.18)') : '#161616', fill = GLASS ? (st === 'shout' ? '#E5483A' : 'rgba(255,255,255,.97)') : st === 'shout' ? '#F2B533' : '#FFFDF4', lw = (GLASS ? 1.1 : 2.4) * u   /* 3D.41 owner: speech boxes are white; 3D.45 fight shouts are red with white text again */, tx = Math.max(x0 + 10 * u, Math.min(x0 + bw - 10 * u, p.x));
  const shape = (ox, oy) => { ctx.beginPath();
    if (st === 'shout' && !GLASS) { const n = Math.max(10, Math.round((bw + bh) / (9 * u))), rx = bw / 2 + 4 * u, ry = bh / 2 + 4 * u, mx = cx + ox, my = by + bh / 2 + oy;
      for (let i = 0; i <= n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, r = i % 2 ? .86 : 1.06; ctx.lineTo(mx + Math.cos(a) * rx * r, my + Math.sin(a) * ry * r); } ctx.closePath(); return; }
    const r = Math.min(st === 'think' || GLASS ? bh / 2 : 9 * u, bh / 2); ctx.roundRect(x0 + ox, by + oy, bw, bh, r);
    if (st !== 'think') { ctx.moveTo(tx - 6 * u + ox, by + bh - 1 + oy); ctx.lineTo(tx - 2 * u + ox, by + bh + 10 * u + oy); ctx.lineTo(tx + 6 * u + ox, by + bh - 1 + oy); } };
  if (GLASS) { ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 8 * u; ctx.shadowOffsetY = 3 * u; } else { ctx.fillStyle = ink; shape(2.6 * u, 2.6 * u); ctx.fill(); }   /* hard drop shadow (comic) / soft shadow (glass) */
  shape(0, 0); ctx.fillStyle = fill; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.lineWidth = lw; ctx.strokeStyle = ink; ctx.lineJoin = 'round'; if (st === 'whisper') ctx.setLineDash([4 * u, 3 * u]); ctx.stroke(); ctx.setLineDash([]);
  if (st !== 'think' && st !== 'shout' && !GLASS) { ctx.fillStyle = fill; ctx.fillRect(tx - 4.6 * u, by + bh - lw * 1.2, 9.4 * u, lw * 1.4); }
  if (st === 'think') for (const [dx, dy, r] of [[-2, 6, 3.4], [-6, 12, 2.2]]) { ctx.beginPath(); ctx.arc(tx + dx * u, by + bh + dy * u, r * u, 0, 7); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 1.8 * u; ctx.stroke(); }
  ctx.fillStyle = GLASS ? (st === 'whisper' ? '#6B7480' : st === 'shout' ? '#FFFFFF' : '#1E2328') : st === 'whisper' ? '#5b5045' : ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, cx, by + padY + lh * (i + .5) + 1 * u)); ctx.restore();
}
const W_ = () => VW;
/* chatter: a topic is a short emoji exchange; the topic follows what is going on in town */
function chatTopic(a, b) {
  const T = [], bond = bondOf(a, b);
  if ((S.griefUntil || 0) > nowH()) T.push(['😢', '🕯', '🫂']);
  if (S.food < rationNeed().f * 1.5) T.push(['🍖❓', '😟', '🌱💪']); if (S.water < rationNeed().w * 1.5) T.push(['💧❓', '😟', '☔🙏']);
  if (S.weather) T.push(['☔', '😅', '💧👍']);
  if ((S.kills || 0) > (a._lastKills || 0)) T.push(['🧟💥', '😎', '💪']);
  if (isNight()) T.push(['🌙', '😰', '🔥🙂']);
  if (bond > 40) T.push(['😂', '😂', '❤️'], ['🎶', '😊', '🎶']);
  if (bond < 10) T.push(['👋', '🙂', '🤝']);
  T.push(['💬', '😄', '👍'], ['🍲', '😋', '👍'], ['🧟', '😨', '🛡️'], ['🔧', '🤔', '💡']);
  a._lastKills = S.kills || 0; return T[Math.floor(rnd() * T.length)];
}
function chatText(a, b) {   /* 3D.27: a spoken two-line exchange (js/barks.js), picked by what is going on */
  const B = window.ZH_BARKS; if (!B) return null; const bond = bondOf(a, b);
  const key = (S.griefUntil || 0) > nowH() ? 'chatGrief' : S.food < rationNeed().f * 1.5 ? 'chatHungry' : S.water < rationNeed().w * 1.5 ? 'chatThirsty' : S.weather ? 'chatRain'
    : isNight() ? 'chatNight' : (S.barkFought === S.day && rnd() < .5) ? 'chatFight' : bond > 40 && rnd() < .5 ? 'chatFriends' : bond < 10 && rnd() < .5 ? 'chatNew' : 'chat';
  const T = B[key] || B.chat, ok = T.pairs.filter(([x, y]) => { const [t1] = lineTag(x), [t2] = lineTag(y); return (!t1 || voiceOk(a, t1)) && (!t2 || voiceOk(b, t2)); }); if (!ok.length) return null;
  let pr = ok[Math.floor(rnd() * ok.length)].map((l) => (key === 'chatGrief' ? lineTag(l)[1] : lineTag(l)[1].replace('{other}', a.name)));   /* 3D.44 each line fits its speaker */
  if (key === 'chatGrief') { const f = (S.fallen || []).slice(-1)[0]; pr = pr.map((l) => l.replace('{other}', f ? f.name : 'them')); }
  return { pair: pr.map(unswear), st: T.style || 'talk' };
}
const chatBuilding = () => { const l = world.buildings.filter((b) => !b.burnt && DEFS[b.type]); return l.length ? DEFS[l[Math.floor(rnd() * l.length)].type].name : 'wall'; };
function chatSpot(a, p) { const ok = (x, y) => Wd.walkable(world, Math.floor(x), Math.floor(y)) && !Wd.buildingAt(world, Math.floor(x), Math.floor(y)); return ok(p.x, p.y) ? p : { x: a.w.x, y: a.w.y }; }   /* 3D.59 never chat on a building footprint */
function startChat(s) {
  if (urgentNeed(s)) return false;   /* 3D.63: no chatting while starving */
  if (((s.chatNext || 0) > tick) || isNight() && !bOf('bonfire').length && rnd() < .6) return false;   /* V3D.17: a pause between chats */
  const pals = S.sv.filter((q) => q !== s && q.hp > 0 && ['free', 'wait'].includes(q.mode) && !q.purpose && !q.sleeping && !q.chatWith && (q.chatNext || 0) <= tick && !insideBuilding(q) && dist(q.w, s.w) < 5)
    .sort((x, y) => (bondOf(s, y) - bondOf(s, x)) * .05 + dist(x.w, s.w) - dist(y.w, s.w) + (Math.abs(ageOf(s) - ageOf(x)) - Math.abs(ageOf(s) - ageOf(y))) * .05);   /* 3D.44 people their own age first */
  const q = pals[0]; if (!q || hasT(s, 'loner') && rnd() < .6) return false;
  const mid = { x: (s.w.x + q.w.x) / 2, y: (s.w.y + q.w.y) / 2 }, txt = rnd() < .7 ? chatText(s, q) : null, lines = txt ? txt.pair : chatTopic(s, q);
  for (const [a, b, side] of [[s, q, -1], [q, s, 1]]) { a.mode = 'chat'; a.chatWith = b; a.chatLines = lines; a.chatTxt = txt ? txt.st : null; a.chatStep = side < 0 ? 0 : 1; a.chatT = side < 0 ? 30 : 75; a.dest = chatSpot(a, { x: mid.x + side * .32, y: mid.y + side * .12 }); a.path = null; a.stateTicks = 900; a.why = `Chatting with ${b.name}`; a.purpose = null; }
  return true;
}
function chatTick(s) {
  const q = s.chatWith; if (!q || q.chatWith !== s || q.hp <= 0 || threatOf(s)) { endChat(s); return; }
  const r = followPath(s, s.dest, WALK); if (r === 'moving') return; s.moving = false; s.faceW = q.w;
  if (--s.chatT > 0) return; const L = s.chatLines; if (s.chatStep >= L.length) { endChat(s); return; }
  if (s.chatTxt) { bark(s, null, { other: q.name, b: chatBuilding() }, { line: L[s.chatStep], style: s.chatTxt, pri: 1, f: 170 }); s.chatStep += 2; s.chatT = 150; }
  else { emote(s, L[s.chatStep], 80, true, true); s.chatStep += 2; s.chatT = 90; }
  if (s.chatStep >= L.length && q.chatStep >= L.length) { addBond(s, q, 3); s.sat = Math.min(100, (s.sat || 0) + 1); q.sat = Math.min(100, (q.sat || 0) + 1); moodAdd(s, 1, 'chats'); moodAdd(q, 1, 'chats'); }
}
function endChat(s) { const q = s.chatWith; s.chatNext = tick + 1500 + rnd() * 1000; if (q) q.chatNext = s.chatNext; s.chatWith = null; s.faceW = null; enterFree(s, 40 + rnd() * 60); if (q && q.chatWith === s) { q.chatWith = null; q.faceW = null; enterFree(q, 40 + rnd() * 60); } }
/* evenings at the Bonfire: people who aren't tired stand around it, chat and cheer up */
function goCampfire(s) {
  if ((S.hour < 19) || S.hour > 23 || s.fatigue > 60) return false; const f = bOf('bonfire').filter((b) => !b.burnt)[0]; if (!f) return false;
  const n = S.sv.filter((q) => q.mode === 'campfire').length; if (n >= 8) return false;
  const a = (s.id * 2.399) % 6.283, c = { x: f.x + .5, y: f.y + .5 };
  s.mode = 'campfire'; s.fire = f; s.dest = { x: c.x + Math.cos(a) * 1.05, y: c.y + Math.sin(a) * 1.05 }; s.path = null; s.stateTicks = 1400 + rnd() * 900; s.why = 'Warming up at the bonfire';
  return true;
}
/* 3D.63 study: chats only happened between two idle people, so with full days the town barely spoke (about one chat per person every 4 days).
   Now people also talk where they sit: round the bonfire, and over food or water at an outdoor spot. */
const talkOk = (q) => !!q.talkBy && q.talkBy.talk && q.talkBy.talk.q === q;
function sitTalk(s, same) {
  const t = s.talk;
  if (t) { if (!S.sv.includes(t.q) || !same(t.q) || threatOf(s)) { s.talk = null; return; } if (--t.T > 0) return;
    if (t.k >= t.L.length) { s.talk = null; addBond(s, t.q, 3); s.sat = Math.min(100, (s.sat || 0) + 1); t.q.sat = Math.min(100, (t.q.sat || 0) + 1); moodAdd(s, 1, 'chats'); moodAdd(t.q, 1, 'chats'); return; }
    const sp = t.k % 2 === 0 ? s : t.q; bark(sp, null, { other: (sp === s ? t.q : s).name, b: chatBuilding() }, { line: t.L[t.k], style: t.st, pri: 1, f: 170 }); t.k++; t.T = 160; return; }
  if (talkOk(s) || (s.talkNext || 0) > tick || rnd() > 1 / 300 || urgentNeed(s)) return;
  const q = S.sv.find((o) => o !== s && same(o) && !o.talk && !talkOk(o) && dist(o.w, s.w) < 2.8 && (o.talkNext || 0) <= tick); if (!q) return;
  const txt = chatText(s, q); if (!txt) return; s.talk = { q, L: txt.pair, st: txt.st, k: 0, T: 15 }; q.talkBy = s; s.talkNext = q.talkNext = tick + 1500 + rnd() * 1200;
}
function campfireTick(s) {
  const f = s.fire; if (!f || !world.buildings.includes(f) || s.fatigue > 75 || S.hour >= 24 || (S.hour < 19 && S.hour > 5) || threatOf(s)) { s.fire = null; s.faceW = null; enterFree(s, 20); return; }
  const r = followPath(s, s.dest, WALK); if (r === 'moving') return; s.moving = false; s.faceW = { x: f.x + .5, y: f.y + .5 }; sitTalk(s, (o) => o.mode === 'campfire' && o.fire === f && !o.moving);
  if (tick % 900 === (s.i * 97) % 900 && rnd() < .25) { const o = S.sv.find((q) => q !== s && q.mode === 'campfire'); bark(s, 'bonfire', { other: o ? o.name : 'someone' }); }
  if (tick % 120 === (s.i * 17) % 120) { s.sat = Math.min(100, (s.sat || 0) + .6); moodAdd(s, .6, 'the campfire'); const nb = S.sv.find((q) => q !== s && q.mode === 'campfire' && dist(q.w, s.w) < 2.2); if (nb) addBond(s, nb, 1); if (rnd() < .5) emote(s, ['🎶', '🔥', '😊', '😂', '☕'][Math.floor(rnd() * 5)], 90); }
  if (--s.stateTicks <= 0) { s.fire = null; s.faceW = null; enterFree(s, 20); }
}
/* pitching in: when food or water will run out within a day and a half, free hands help at the producer (+35% each, two at most) */
function pitchIn(s) {
  if ((isFighter(s) && activeZ() > 0) || urgentNeed(s)) return false; const R = rationNeed(), need = S.food < R.f * 1.5 ? 'food' : S.water < R.w * 1.5 ? 'water' : null; if (!need) return false;
  const fam = need === 'food' ? 'farm' : 'water', b = world.buildings.filter((x) => DEFS[x.type] && DEFS[x.type].fam === fam && !x.burnt && !x.fire && (x.helpers = (x.helpers || []).filter((id) => S.sv.some((q) => q.id === id && q.mode === 'pitch'))).length < 2).sort((x, y) => dist(Wd.doorPoint(x), s.w) - dist(Wd.doorPoint(y), s.w))[0];
  if (!b || zombieNear(Wd.doorPoint(b), 5) || (s.wary || 0) > tick) return false; (b.helpers ||= []).push(s.id); s.mode = 'pitch'; s.helpAt = b; s.dest = Wd.approachPoint(b); s.path = null; s.stateTicks = 1000; s.why = `Pitching in at the ${DEFS[b.type].name} (${need === 'food' ? '🍖' : '💧'} running low)`; emote(s, need === 'food' ? '🌱💪' : '💧💪', 110, true); return true;
}
function pitchTick(s) {
  const b = s.helpAt; if (!b || !world.buildings.includes(b) || b.fire) { endPitch(s); return; }
  if (threatOf(s)) { endPitch(s); return; } const r = followPath(s, s.dest, WALK); if (r === 'moving') return; s.moving = false; s.activity = 'Working';
  if (--s.stateTicks <= 0) { gainXp(s, 1); endPitch(s); }
}
function endPitch(s) { const b = s.helpAt; if (b && b.helpers) b.helpers = b.helpers.filter((id) => id !== s.id); s.helpAt = null; s.activity = null; enterFree(s, 30); }
const helpMult = (b) => 1 + .35 * ((b.helpers || []).filter((id) => S.sv.some((q) => q.id === id && q.mode === 'pitch' && !q.moving)).length);
/* before night: the hurt patch up, the hungry and thirsty eat and drink */
function nightPrep(s) {
  if (S.hour < 18 || S.hour >= 20) return false; let need = null;
  if (isFighter(s) && s.hp < s.max * .75 && medSite() && facilityUsers(medSite()) < cap(medSite())) need = medSite();
  else if (s.hunger > 35 && S.food >= 1) need = chooseFacility(s, false, 'hunger');   /* 3D.63: the nearest safe one, not the first built */
  else if (s.thirst > 35 && S.water >= 1) need = chooseFacility(s, false, 'thirst');
  if (!need || need === s.lastFacility) return false;
  s.facility = need; s.mode = 'goFacility'; s.stateTicks = 9999; s.dest = null; s.path = null; s.why = `Getting ready for the night → ${DEFS[need.type].name}`; return true;
}
/* combat: a survivor under attack shouts for help; the two nearest free fighters come */
let helpEmoT = 0;
function callHelp(s, z) {
  if ((s.helpT || 0) > tick) return; s.helpT = tick + 240; if (!bark(s, isFighter(s) ? 'engage' : 'help', {}, { pri: 2 }) && (s.helpEmoT || 0) < tick && helpEmoT < tick) { s.helpEmoT = tick + 1500; helpEmoT = tick + 240; emote(s, isFighter(s) ? '😤' : '🆘', 90, true); }   /* 3D.100 owner: a spam of angry faces in long fights (every fighter every 4 s); now one face per person per 25 s, one every 4 s town-wide */
  S.sv.filter((q) => q !== s && isFighter(q) && canFight(q) && !(q.carriedLoot && q.carryAmt) && !['chase', 'attack', 'recover', 'down', 'hospital', 'away', 'errand', 'rescueTo', 'rescueCarry'].includes(q.mode) && dist(q.w, s.w) < (gearFx(s, 'radio') || gearFx(q, 'radio') ? 18 : 9))
    .sort((a, b) => dist(a.w, s.w) - dist(b.w, s.w)).slice(0, 2).forEach((q) => { engage(q, z); q.why = `Answering ${s.name}'s call for help`; if (!(rnd() < .6 && bark(q, 'answer', { other: s.name }, { pri: 2 })) && helpEmoT - 200 < tick) emote(q, '💪', 80, true); });
}
function chooseLifePurpose(s) {
  if (downedUnassigned().length) { assignRescue(); if (s.mode === 'rescueTo') return; }
  const cfg = jobAI[s.job] || jobAI.Civilian;
  if (acquireEnemy(s)) return;   // a zombie in sight comes before any errand
  { const gp = myPost(s); if (gp && postActive(gp)) {   /* V2.45: on watch at a guard post (needs still come first) */
    const u = urgentNeed(s), b = u && chooseFacility(s, true, URGENT_FOR[u]);
    if (b) { s.facility = b; s.mode = 'goFacility'; s.stateTicks = 9999; s.dest = null; s.path = null; s.why = `${u}: a quick break, then back to the ${postName(gp)}`; return; }
    s.dest = postPt(gp); s.mode = 'walk'; s.purpose = 'post'; s.path = null; s.stateTicks = 900; s.why = `Heading to the ${postName(gp)} (${(POST_SCHED[gp.sched] || POST_SCHED.night).name.toLowerCase()})`; return; } }
  if (onShift(s)) {   /* V2.36: on shift → back to work unless something urgent comes first */
    const u = urgentNeed(s), b = u && chooseFacility(s, true, URGENT_FOR[u]);
    if (b) { s.facility = b; s.mode = 'goFacility'; s.stateTicks = 9999; s.dest = null; s.path = null; s.why = `${u}: quick break at the ${DEFS[b.type].name}, then back to work`; s.returnToWork = true; return; }
    if (!u && s.chop === true && rnd() < .3 && tryGather(s)) { s.why = 'Gathering for a while, then back to the ' + DEFS[s.post.type].name; return; }   /* 3D.30: Gather on = part of the shift goes to gathering */
    s.mode = 'goWork'; s.dest = null; s.path = null; s.stateTicks = 9999; s.why = `Shift at the ${DEFS[s.post.type].name} (until ${shifts().find(([a, z]) => S.hour >= a && S.hour < z)[1]}:00)`; return;
  }
  if (goCare(s)) return;   /* 3D.285: hurt and the town is quiet → the medical building first */
  if (isNight() && s.fatigue > (hasT(s, 'owl') ? 60 : 35) - (S.hour >= 22 || S.hour < 5 ? 30 : 0) + (s.id * 7) % 12) {   /* V2.43: Night Owls stay up */   /* V2.36: nights are for sleep: a bed if one is free, otherwise sleep rough (half the rest) */
    { const nd = s.thirst >= 85 && S.water >= 1 ? 'thirst' : s.hunger >= 85 && S.food >= 1 ? 'hunger' : null, fb = nd && chooseFacility(s, false, nd); if (fb) { s.facility = fb; s.mode = 'goFacility'; s.stateTicks = 9999; s.dest = null; s.path = null; s.why = `${nd === 'thirst' ? 'A drink' : 'A bite'} before bed → ${DEFS[fb.type].name}`; return; } }   /* 3D.63: woke up parched → drink first, then back to bed */
    const bed = bedFor(s);
    if (bed) { s.facility = bed; s.mode = 'goFacility'; s.stateTicks = 9999; s.dest = null; s.path = null; s.why = `Going to bed at the ${DEFS[bed.type].name}`; return; }
    s.mode = 'wait'; s.dest = null; s.path = null; s.moving = false; s.sleeping = 'rough'; s.stateTicks = Math.min(9500, ((S.hour >= 20 ? 30 : 6) - S.hour) * 1000 - (tick % 1000) + wakeOff(s)); s.why = 'Sleeping rough: no free bed (build a Shelter)'; s.idleBubble = '💤'; return;
  }
  if (nightPrep(s)) return;
  if (pitchIn(s)) return;
  if (goCampfire(s)) return;
  if (!urgentNeed(s) && (tryHaul(s) || tryHammer(s) || (chopOn(s) && tryGather(s)))) return;   /* V3D.22/23: deliver, build, gather */
  if (rnd() < Math.min(.94, .58 * cfg.town) && chooseTownAction(s)) return;
  if (chooseTownAction(s)) return;
  if (rnd() < .38 && startChat(s)) return;
  const r = rnd();
  if (s.job === 'Guard' || (s.job === 'Police Officer' && r < (policy() === 'defend' ? .6 : .35))) { s.dest = patrolDest(); s.mode = 'walk'; s.purpose = 'patrol'; s.why = (S.posts || []).length ? 'Patrolling between the guard posts' : 'Patrolling the edge of town'; s.stateTicks = 700; return; }
  if ((S.food < 1 || S.water < 1) && activeZ() <= 2 && !isNight() && (s.hunger > 50 || s.thirst > 50 || s.job === 'Scavenger') && rnd() < .7) {   /* V3D.15: nothing in stock → go out and look for some */
    s.forage = S.food < 1 ? 'food' : 'water'; s.dest = tc(2 + OFF + Math.floor(rnd() * 11), 2 + OFF + Math.floor(rnd() * 3)); s.mode = 'walk'; s.purpose = 'scav-out'; s.why = `Out looking for ${s.forage === 'food' ? '🍖' : '💧'}`; s.stateTicks = 900; emote(s, s.forage === 'food' ? '🍖❓' : '💧❓', 100, true); return; }
  if (s.job === 'Scavenger' && r < .30 && activeZ() <= 3) { s.dest = tc(2 + OFF + Math.floor(rnd() * 11), 2 + OFF + Math.floor(rnd() * 3)); s.mode = 'walk'; s.purpose = 'scav-out'; s.why = 'Scavenging outside the walls'; s.stateTicks = 900; return; }
  if (r < .66) { settlePause(s); return; }
  s.dest = roamDest(s); s.mode = 'walk'; s.purpose = 'roam'; s.why = 'Strolling through town'; s.stateTicks = 600;
}
const activeZ = () => S.z.filter((z) => z.hp > 0 && !z.human).length;
function gearUpgrade(s) { if (s.dummy) return null;   /* best improvement for any slot: free from the stash first, else buy basic gear at the Armory with scrap */
  let best = null, gain = 0; const JOBFX = { cook: 'Cook', medic: 'Medic', fix: 'Mechanic', farm: 'Farmer', hivis: 'Engineer' }, sco = (it) => itemScore(it) + (it && JOBFX[it.fx] === s.job ? 6 : 0);   /* 3D.155 a survivor prefers the gear of their own profession */
  for (const slot of SLOTS) {
    const cur = sco(itemOf(s, slot)), opts = [];
    for (const id of Object.keys(S.inv || {})) if (ITEMS[id] && ITEMS[id].slot === slot) opts.push({ id, buy: false });
    const reserve = 10 + upkeepTotal() * 2 + jobList().reduce((a, { j }) => a + Math.max(0, (j.need.mat || 0) - (j.got.mat || 0)), 0);   /* V2.15: never spend the scrap the town needs for upkeep and building (V3D.26: and for building work under way) */
    for (const id of (ARMORY_STOCK[slot] || [])) if (ITEMS[id].cost + reserve <= S.mat) opts.push({ id, buy: true });
    for (const o of opts) { const sc = sco(ITEMS[o.id]) - cur - (o.buy ? ITEMS[o.id].cost * .5 : 0); if (sco(ITEMS[o.id]) > cur * 1.12 + 1 && sc > gain) { gain = sc; best = { ...o, slot }; } }
  }
  return best;
}
function finishFacility(s) {
  const b = s.facility; if (!b) { s.activity = null; enterFree(s, 110); return; } const r = facilityRules[b.type]; if (!r) { s.facility = null; enterFree(s, 110); return; }
  { const dv = (r.sat + combos(b).sat) * Math.max(.6, sMod(s, 'cha', .05)); s.sat += dv; moodAdd(s, dv, 'the ' + DEFS[b.type].name); } floats.push({ w: { ...s.w }, t: '♥+' + r.sat, col: '#ff9fbd', a: 70 });
  if (r.need === 'hunger') { if (S.food >= .5) s.hunger = Math.max(0, s.hunger - r.benefit * (hasSkill(s, 'fieldRations') ? 1.25 : 1) * (b && isWorking(b) && b.staff.job === 'Cook' ? 1.5 : 1) * (b && isWorking(b) && gearFx(b.staff, 'cook') ? 1.25 : 1) * (b && isWorking(b) && hasSkill(b.staff, 'headChef') ? 1.3 : 1) * (b && isWorking(b) ? Math.max(.8, sMod(b.staff, 'cha', .03)) : 1) * (1 + combos(b).meal) * (b.unpaid ? .5 : 1)); else floats.push({ w: { ...s.w }, t: 'No 🍖', col: '#ff8a7a', a: 70 }); }
  if (r.need === 'thirst') { if (S.water >= .5) s.thirst = Math.max(0, s.thirst - r.benefit * (hasSkill(s, 'fieldRations') ? 1.25 : 1)); else floats.push({ w: { ...s.w }, t: 'No 💧', col: '#ff8a7a', a: 70 }); }
  if (rnd() < .2 && bark(s, { hunger: 'eat', thirst: 'drink', fatigue: 'sleep' }[r.need] || 'happy')) {} else
  if (r.need === 'hunger' && rnd() < .6) emote(s, '😋', 80); if (r.need === 'thirst' && rnd() < .5) emote(s, '😌', 80); if (r.need === 'fatigue' && rnd() < .4) emote(s, '🥱', 70);
  if (r.need === 'fatigue' && !s.sleeping && s.hp > 0 && s.hp < s.max * .75) { const h = Math.max(1, Math.round(s.max * (.05 + r.benefit / 600))); s.hp = Math.min(Math.round(s.max * .75), s.hp + h); floats.push({ w: { ...s.w }, t: '+' + h + ' HP', col: '#7fd35a', a: 60 }); }   /* 3D.47 owner: sleep heals, up to 75% (beds that rest better heal more; a doctor gets you the rest) */
  if (r.need === 'fatigue') { s.fatigue = Math.max(0, s.fatigue - r.benefit); if (b && isT(b, 'house') && b.owner === s.id) { s.fatigue = Math.max(0, s.fatigue - r.benefit * .5); s.sat = Math.min(100, (s.sat || 0) + 2); moodAdd(s, 2, 'own home'); } }   /* own home: rests 50% better, +2 ♥ */
  if (r.need === 'injury' && s.wounded) { s.wounded = false; floats.push({ w: { ...s.w }, t: 'Wound treated', col: '#7fd35a', a: 70 }); }   /* 3D.67: only a medical building treats a field wound */
  if (r.need === 'injury') { const med = (S.meds || 0) >= .25; if (med) { S.meds -= .25; flow('meds', 'Treatment', -.25); } s.hp = Math.min(s.max, s.hp + r.benefit * (med ? 1.6 : 1)); if (med && rnd() < .3) floats.push({ w: { ...s.w }, t: '💊', col: '#ff9fbd', a: 60 }); }   /* V3D.25: medicine in stock heals 60% more */   // no medicine stock: care is limited by the building's tier, beds and the time it takes
  if (isT(b, 'armory')) { for (let n = 0; n < 2; n++) { const g = gearUpgrade(s); if (!g) break; if (g.buy) { S.mat -= Math.max(1, ITEMS[g.id].cost - (combos(b).arsenal ? 1 : 0)); stashAdd(g.id); } equip(s, g.id); s.sat += 2; note('routine', s.name + (g.buy ? ' bought a ' : ' took a ') + ITEMS[g.id].name + ' at the Armory' + (g.buy ? ' (−' + ITEMS[g.id].cost + ' scrap).' : '.'), { at: s.w, float: '🛡 ' + ITEMS[g.id].name.toUpperCase(), col: '#b6f0ff' }); } }
  if (r.need === 'train') {   /* each visit fills a stat's training bar; 100 = +1 permanent point */
    if (s.trainDay !== S.day) { s.trainDay = S.day; s.trainN = 0; } s.trainN++;
    if (isT(b, 'library')) S.rp = (S.rp || 0) + 1;   /* V2.18: study sessions feed the research effort */
    s.tp = s.tp || {}; s.st = s.st || rollStats(s.job, s.l); const k = r.stat, gainT = r.benefit * (b.q || 10) / 10 * Math.max(.7, sMod(s, 'int', .02)) * (1 + combos(b).train) * (b.unpaid ? .5 : 1);
    s.tp[k] = (s.tp[k] || 0) + gainT; s.fatigue = Math.min(100, s.fatigue + 6);
    while (s.tp[k] >= 100 && s.st[k] < STAT_CAP) { s.tp[k] -= 100; s.st[k]++; S.trainPts = (S.trainPts || 0) + 1; if (k === 'end') setMaxHp(s); note('routine', `${s.name}'s ${STAT_NAME[k]} rose to ${s.st[k]}.`); }
    floats.push({ w: { ...s.w }, t: '+' + STAT_NAME[k].slice(0, 3).toUpperCase(), col: '#b6f0ff', a: 60 });
  }
  gainXp(s, .5);   /* using town buildings teaches a little */
  if (isWorking(b) && b.staff !== s) gainXp(b.staff, r.need === 'injury' ? 3 : 1);   /* the staff member (medic, cook, farmer, engineer) learns from every visitor served */
  if (!s.resident && s.sat >= 35 && !s.requested) { s.requested = true; queueResidentRequest(s); }
  if (s.sleeping) { s.fatigue = 0; s.sleeping = false; }
  /* V3D.15: one longer stay instead of in-and-out trips: keep resting / being treated while it is still needed (up to 3 extra rounds) */
  if (!onShift(s) && !threatOf(s) && (s.stays || 0) < (r.need === 'injury' && !zInTown() ? TENT_STAYS : 3) && ((r.need === 'fatigue' && s.fatigue > 30) || (r.need === 'injury' && s.hp < s.max * (zInTown() ? .7 : 1) && s.hunger < 100 && s.thirst < 100)))   /* 3D.285: with no zombie in town a patient stays until fully healed */ { s.stays = (s.stays || 0) + 1; s.stateTicks = r.use; s.mode = 'useFacility'; s.activity = r.label; return; }
  s.stays = 0;
  { s.visits = (s.visits || []).filter((v) => tick - v[1] < 1500); s.visits.push([b.type, tick]); if (s.visits.filter((v) => v[0] === b.type).length >= 3) { (s.avoid ||= {})[b.type] = tick + 2500; s.visits = []; emote(s, '😩', 90); } }
  s.lastFacility = b; s.facility = null; s.activity = null; s.mode = 'free'; s.stateTicks = onShift(s) ? 8 : 120 + s.i * 28; s.cool = 0; s.why = onShift(s) ? 'Back to work' : 'Feeling better'; ui();
}
const isFem = (q) => { try { return !!(window.ZHChars && ZHChars.look(q).sex === 'f'); } catch (e) { return false; } };   /* 3D.357: a woman's or a man's grunt when they go down */
function ai(s) {
  if (s.dummy && !s.go) { s.moving = false; s.mode = 'wait'; s.stateTicks = 99; s.hunger = s.thirst = s.fatigue = 0; return; }   /* 3D.152 gear test: the line-up stands still until released */
  if (s.para > 0 && s.hp > 0 && !['down', 'hospital', 'away'].includes(s.mode)) { s.para--; s.moving = false; if (s.para % 120 === 0) emote(s, '😵', 60); return; }   /* 3D.83 paralysed by a Lasher: cannot move, shoot or fight */
  if (s.cool > 0) s.cool--; if (s.stateTicks > 0) s.stateTicks--; emoTick(s); if (s.reloadT > 0 && !['attack', 'recover'].includes(s.mode) && --s.reloadT <= 0) reloadGun(s);   /* reloads finish out of combat too */
  if (tick % 90 === (s.i * 17) % 90 && !['down', 'hospital', 'away'].includes(s.mode)) { { const ns = (hasSkill(s, 'ironStomach') ? .8 : 1) * Math.max(.6, 1 - (stat(s, 'end') - 5) * .02); s.hunger = Math.min(100, s.hunger + .3 * ns); s.thirst = Math.min(100, s.thirst + .36 * ns); } /* V2.11.1: ~3.3 hunger / ~4 thirst per game hour (was ~17 / ~20, which pinned everyone at 100) */ if (!s.sleeping) s.fatigue = Math.min(100, s.fatigue + .45 * (hasT(s, 'diligent') ? 1.2 : 1)); pantry(s); starve(s); }   /* 3D.63 study: fatigue rose ~11/hour (3x hunger), so everyone was 'Exhausted' by 13:00, napped through lunch and skipped the bonfire; now ~5/hour, and it doesn't rise while asleep (rough sleepers woke exhausted) */
  if (s.fleeT > 0) s.fleeT--;
  if (s.sleeping && !(s.mode === 'useFacility' || (s.mode === 'wait' && s.sleeping === 'rough'))) s.sleeping = false;   /* 3D.66 overnight soak: someone woken by a fight, an SOS or a rescue kept the 'asleep' flag (shown asleep at midday, tired never rose) */
  if (hasSkill(s, 'firstAid') && tick % (hasSkill(s, 'miracleWorker') ? 100 : 300) === (s.i * 31) % (hasSkill(s, 'miracleWorker') ? 100 : 300) && s.hp > 0 && s.hp < s.max && !['chase', 'attack', 'recover', 'down'].includes(s.mode)) s.hp = Math.min(s.max, s.hp + 1);
  /* 3D.284 healing, part 1 (owner, 20 Nov, W130): "a slow mend with no zombie about". Once a game hour everyone on their feet in town gets MEND_PCT of
     their health back while no zombie is inside the town. Not while starving or dying of thirst; a field wound still stops at its limit (below). */
  if (tick % 1000 === (s.i * 53) % 1000 && s.hp > 0 && s.hp < s.max && !['down', 'hospital', 'away', 'errand'].includes(s.mode) && s.hunger < 100 && s.thirst < 100 && !zInTown()) s.hp = Math.min(s.max, s.hp + Math.max(1, Math.round(s.max * MEND_PCT)));
  if (s.hp <= 0 && s.mode !== 'down') { s.bark = null; barkSomeone('help', {}, { pri: 2, line: s.name + ' is down! Help!', style: 'shout' }, s.w, s); s.hp = 0; s.mode = 'down'; s.target = null; s.dest = null; s.path = null; s.facility = null; s.activity = null; s.moving = false; s.rescuer = null; s.rescuing = null; s.carrying = null; s.why = 'Collapsed — needs rescue'; s.stable = false; s.ordered = false; if (s.downD !== S.day) { s.downD = S.day; s.downN = 0; } s.downN = (s.downN || 0) + 1; endAid(s); if (s.aidBy) { const m = s.aidBy; if (m.aidTo === s && m.aidKind === 'patch') { endAid(m); enterFree(m, 30); } } SFX(isFem(s) ? 'down_f' : 'down_m'); s.bleed = bleedMax(); s.warned = false; downAlert(s); return; }
  if (s.mode === 'down') { s.moving = false; if (tick % 60 === s.i % 60) { const gx = Math.floor(s.w.x), gy = Math.floor(s.w.y); if (!Wd.walkable(world, gx, gy)) { const t = Wd.nearestWalkable(world, gx, gy); if (t) { s.w = { x: t.x + .5, y: t.y + .5 }; s.path = null; } } }   /* 3D.169 round 2 (Lena down for 70 h): someone who went down inside a building that fell, or on a wall tile, lay where no rescuer can walk. They are dragged to the nearest open tile */
    bleedTick(s); return; }
  if (s.wounded && s.mode !== 'hospital' && !(s.mode === 'useFacility' && injuryTrip(s)) && s.hp > Math.round(s.max * FIELD_CAP)) s.hp = Math.round(s.max * FIELD_CAP);   /* 3D.67: a field wound heals no further until treated */
  if (s.aidBy && s.aidBy.mode === 'fieldAid' && s.aidBy.aidTo === s && s.aidBy.aidT > 0 && ['free', 'walk', 'wait'].includes(s.mode) && !s.carrying && !threatOf(s)) { s.moving = false; s.why = 'Being patched up by ' + s.aidBy.name; return; }
  if (s.haul && s.purpose !== 'haul-get' && s.purpose !== 'haul-put') cancelHaul(s);   /* V3D.23: an interrupted delivery goes back to the stockpile */
  if (s.carriedLoot && !s.haul && s.purpose !== 'gath-back') dropWood(s);   /* V3D.22: interrupted on the way home: the load still counts */
  if (s.gatherAt && s.purpose !== 'gath-out' && s.mode !== 'gather') s.gatherAt = null;
  if (s.hammerJob != null && s.purpose !== 'build-go' && s.mode !== 'hammer') endHammer(s);
  if (s.errand && (s.mode === 'errand' || s.mode === 'away')) { errandAi(s); return; }   /* V3D.17 */
  if (s.mode === 'fix') { fixTick(s); return; }
  if (['goFacility', 'useFacility', 'goWork', 'work', 'walk', 'wait', 'free', 'goFire', 'fightFire', 'postCombat', 'loot', 'chat', 'campfire', 'pitch', 'gather', 'hammer'].includes(s.mode) && tick % 6 === s.i % 6 && !insideBuilding(s)) { const th = threatOf(s); const busyCarry = (s.carriedLoot && s.carryAmt && s.purpose === 'gath-back') || (s.haul && s.purpose === 'haul-put'); if (th && busyCarry && !(th.target === s && dist(th.w, s.w) < 1.3)) { /* 3D.28: carriers deliver first, fight only when cornered */ } else if (th) { if (s.mode === 'chat') endChat(s); if (s.mode === 'gather') { s.gatherAt = null; s.activity = null; } if (s.mode === 'pitch') endPitch(s); s.fire = null; s.faceW = null; if (isFighter(s) || (th.human && s.hp >= s.max * .5)) { engage(s, th); emote(s, '😤', 70); } else { startHide(s, th); emote(s, '😱', 90, true); } return; } }
  if (s.mode === 'loot') {   /* V3D.12: walking over to a zombie's dropped bag */
    const bag = (S.bags || []).find((b) => b.id === s.lootId && !b.opened); if (!bag) { s.lootId = null; enterPost(s); return; }
    if (tick - bag.t0 < 45) { s.moving = false; return; }   /* let it land first */
    const r = followPath(s, bag.w, CHASE); if (r === 'arrived') { openBag(bag, s); s.lootId = null; enterPost(s); } else if (r === 'fail') { openBag(bag, s); s.lootId = null; enterPost(s); } return;
  }
  if (s.mode === 'chat') { chatTick(s); return; }
  if (s.mode === 'campfire') { campfireTick(s); return; }
  if (s.mode === 'pitch') { pitchTick(s); return; }
  if (s.mode === 'gather') { gatherTick(s); return; }
  if (s.mode === 'hammer') { hammerTick(s); return; }
  if (s.mode === 'hide') {   /* running for cover */
    const b = s.hideAt; if (!b || !world.buildings.includes(b)) { s.hideAt = null; enterFree(s, 30); return; }
    const r = followPath(s, Wd.doorPoint(b), CHASE); if (r === 'arrived') { s.w = { ...Wd.doorPoint(b) }; s.mode = 'hiding';   /* 3D.64 balance study: 'arrived' near the door (blocked by the crowd) left them 'hiding' outside, where the zombies ate them; in through the door */ s.stateTicks = 160; s.path = null; s.why = 'Hiding in ' + DEFS[b.type].name; } else if (r === 'fail') { const th = threatOf(s); s.hideAt = null; if (th) { engage(s, th); s.why = 'Cornered — fighting back'; } else enterFree(s, 40); } return;
  }
  if (s.mode === 'hiding') {   /* inside: hidden and safe; come out once the area is clear */
    s.moving = false; const b = s.hideAt; if (!b || !world.buildings.includes(b)) { s.hideAt = null; enterFree(s, 30); return; }
    if (tick % 90 === (s.i * 13) % 90) {   /* V2.18: sheltering indoors they eat, drink and rest from the town stores, and call for the guards */
      if (S.water >= .05) { S.water -= .005; s.thirst = Math.max(0, s.thirst - .7); } if (S.food >= .05) { S.food -= .005; s.hunger = Math.max(0, s.hunger - .6); } s.fatigue = Math.max(0, s.fatigue - 1.5); if (s.hp < s.max) s.hp = Math.min(s.max, s.hp + 1); S.alert = Math.max(S.alert, 200); }   /* V2.37: sheltering also patches you up slowly */
    if (s.stateTicks <= 0) { const dn = isFighter(s) && canFight(s) && S.sv.some((q) => q.mode === 'down' && !q.rescuer);   /* 3D.64 balance study: 'hiding' was the commonest state just before going down: non-fighters came out early to help someone who was down and were caught 3 tiles from the door; now only fit fighters come out early */ if (zombieNear(Wd.doorPoint(b), lastStand() ? 8 : dn ? 3.2 : 6.5) ||   /* 3D.66: in a last stand they stay in until nothing is within 8 tiles (they popped out, saw a zombie further off, and ran back in) */ (dn && S.z.some((z) => z.hp > 0 && !z.zoo && ['zchase', 'zattack', 'zrecover'].includes(z.mode) && dist(z.w, Wd.doorPoint(b)) < 7))) s.stateTicks = 120;   /* 3D.48: someone is down: come out as soon as nothing is right outside or hunting */ else { s.hideAt = null; s.wary = tick + 900; enterFree(s, 30); s.why = 'Coming out — area clear'; } } return;
  }   // being attacked beats lunch
  if (s.mode === 'hospital') { s.moving = false; if (s.stateTicks <= 0 && isNight() && S.z.some((z) => z.hp > 0 && !z.human && Wd.inTown(Math.floor(z.w.x), Math.floor(z.w.y)))) { s.stateTicks = 120; s.why = 'Well again: staying in bed until the walkers are gone'; return; }   /* 3D.172 round 3: discharged at 02:00 into a town full of walkers, down again within the hour (Lena 10 times) */
    if (s.stateTicks <= 0) { const cb = s.careAt; s.wounded = false; s.stable = false; s.hp = Math.round(s.max * (isCamp(cb) || !cb ? .55 : cb.type === 'hospital' ? 1 : cb.type === 'clinic' ? .85 : .7)); s.fatigue = Math.max(0, s.fatigue - 35); enterFree(s, 420); s.why = 'Recovered'; note('routine', s.name + ' recovered and returned.'); } return; }
  if (s.mode === 'rescueTo') {
    const q = s.rescuing; if (!q || q.mode !== 'down') { s.rescuing = null; enterPost(s); return; }
    if (tick % 15 === s.i % 15) { const zb = S.z.find((z) => z.hp > 0 && !z.human && dist(z.w, q.w) < 2.2); if (zb && dist(s.w, q.w) < 4 && isFighter(s) && s.hp > s.max * .4) { q.rescuer = null; s.rescuing = null; engage(s, zb); s.why = `Clearing the way to ${q.name}`; return; } }   /* V2.37: clear first, then pick up */
    if (q.ordered && !isFighter(s)) { const crowd = S.z.filter((z) => z.hp > 0 && !z.zoo && z.mode !== 'zleave' && dist(z.w, q.w) < 2.5).length;   /* 3D.75 skill study: a sent rescuer waits a few steps back until the escorts have thinned the crowd (it used to walk straight in: the expert lost 8 a town) */
      if (crowd >= 2 && dist(s.w, q.w) < 6) { s.moving = false; s.path = null; s.why = `Waiting for the way to ${q.name} to clear`; if (tick % 120 === 0) orderEscorts(q); return; } }
    { /* 3D.163 play-test (three testers, 9-15 deaths each): a rescuer who cannot move (trapped by a doorway onto a fence, or wedged) stood in
         'rescueTo' for hours while the downed person bled out, and nobody else was sent. No progress for 3 seconds: step out to open ground,
         hand the rescue to someone else, and keep out of rescues for a while. */
      const pr = s.rsProg; if (!pr || dist(pr.w, s.w) > .3) s.rsProg = { w: { ...s.w }, t: tick }; else if (tick - pr.t > 180) { s.rsProg = null; unwedge(s); q.rescuer = null; s.rescuing = null; s.noRescueT = tick + 1800; s.why = `Couldn't reach ${q.name}`; enterPost(s); assignRescue(); return; } }
    const r = followPath(s, q.w, .02); if (r === 'arrived' && s.job === 'Medic' && !s.aidTo && !zNear(q.w, 3) && patchSupply(true)) { startAid(s, q, 'revive'); return; } if (r === 'arrived') { s.carrying = q; q.w = { x: s.w.x, y: s.w.y }; s.mode = 'rescueCarry'; s.path = null; s.careTo = careDest(); s.why = `Carrying ${q.name} to ${s.careTo ? 'the ' + DEFS[s.careTo.type].name : 'safety'}`; note('routine', `${s.name} picked up ${q.name}.`); } else if (r === 'fail') { q.rescuer = null; s.rescuing = null; enterPost(s); } return;
  }
  if (s.mode === 'rescueCarry') {
    const q = s.carrying; if (!q) { enterPost(s); return; }
    if (!s.careTo || !world.buildings.includes(s.careTo)) s.careTo = careDest(); const dB = s.careTo;
    const r = followPath(s, sitePoint(dB), CARRY); q.w = { x: s.w.x - .12, y: s.w.y - .05 };
    if (r === 'fail' && dist(s.w, sitePoint(dB)) > 1.5 && (s.carryFail = (s.carryFail || 0) + 1) < 6) { s.path = null; return; }   /* 3D.63: a blocked path is retried, not teleported through */
    if (r === 'arrived' || r === 'fail') { s.carryFail = 0; q.w = { ...sitePoint(dB) }; s.careTo = null; addBond(s, q, 8); q.mode = 'hospital'; q.hp = 1; q.stable = false; statAdd('saved'); emote(q, '🙏', 120, true); if (!bark(s, 'rescuer', { other: q.name }, { pri: 1 })) emote(s, '❤️', 100, true); q.bleed = null; q.stateTicks = Math.round(careTicks(dB) * (hasSkill(s, 'steadyHands') || (medSite() && medSite().staff && hasSkill(medSite().staff, 'steadyHands')) ? .7 : 1)); gainXp(s, 4); if (hasSkill(s, 'miracleWorker')) q.stateTicks = Math.round(q.stateTicks * .7); q.rescuer = null; q.why = 'Recovering in care'; SFX('rescued'); q.careTotal = q.stateTicks; q.careAt = dB; q.path = null; s.carrying = null; s.rescuing = null; enterPost(s); note('routine', q.name + ' reached ' + (dB ? 'the ' + DEFS[dB.type].name : 'safety') + (isCamp(dB) ? ' (no medical bed free: slower care)' : '') + '.'); } return;
  }
  if (s.mode === 'fieldAid') { fieldAidAI(s); return; }
  if (s.mode === 'goFire' || s.mode === 'fightFire') { fireAI(s); return; }
  if (s.mode === 'goWork') {
    if (!s.post || !world.buildings.includes(s.post) || s.post.staff !== s) { s.post = null; enterFree(s, 30); return; }
    if (acquireEnemy(s)) return;   /* 3D.63: any fighter who picked a fight stops heading to work this tick */
    const r = followPath(s, Wd.doorPoint(s.post), WALK * 1.1);
    if (r === 'arrived') { if (!OPEN_AIR.has(s.post.type)) s.w = { ...Wd.doorPoint(s.post) }; s.mode = 'work'; s.activity = 'Working'; s.stateTicks = shiftLeft() || 600; s.path = null; s.returnToWork = false; s.why = `Working at the ${DEFS[s.post.type].name}` + (shiftLeft() ? ` until ${shifts().find(([a, z]) => S.hour >= a && S.hour < z)[1]}:00` : ''); }
    else if (r === 'fail') { enterFree(s, 120); s.why = "Couldn't reach work — trying later"; } return;
  }
  if (s.mode === 'work') {
    s.moving = false; if (!s.post || !world.buildings.includes(s.post) || s.post.staff !== s) { s.post = null; s.activity = null; enterFree(s, 30); return; }
    if (downedUnassigned().length && tick % 30 === 0) { assignRescue(); if (s.mode === 'rescueTo') { s.activity = null; return; } }
    if (tick % 20 === s.i % 20 && acquireEnemy(s)) { s.activity = null; return; }
    if (tick % 1000 === (s.i * 37) % 1000) gainXp(s, 2);   /* every game hour on shift */
    if (tick % 120 === (s.i * 7) % 120) { const u = urgentNeed(s, true); if (u && chooseFacility(s, true, URGENT_FOR[u])) { s.activity = null; enterFree(s, 5); s.why = `${u}: taking a break`; return; } }   /* 3D.63: only walk off the job when there's somewhere to go (it flickered work ↔ break every 2 s) */   /* V2.36: only urgent needs end a shift early */
    if (s.job === 'Medic' && tick % 60 === (s.i * 11) % 60) { const q = medicFindPatient(s); if (q) { s.activity = null; startAid(s, q, 'patch'); s.why = `On a round: patching up ${q.name}`; return; } }   /* 3D.287: the building is empty → the Medic on shift does rounds */
    if (s.stateTicks <= 0 || !onShift(s)) { s.activity = null; gainXp(s, 1); enterFree(s, 20); s.why = 'Shift over'; } return;
  }
  if (s.mode === 'goFacility') {
    if (!s.facility || !world.buildings.includes(s.facility)) { s.facility = null; enterFree(s, 25); return; }
    const r = followPath(s, Wd.doorPoint(s.facility), WALK * 1.15);
    if (r === 'arrived') { const ru = facilityRules[s.facility.type]; if (!OPEN_AIR.has(s.facility.type)) s.w = { ...Wd.doorPoint(s.facility) }; s.mode = 'useFacility';   /* 3D.61: in through the door */ s.activity = ru.label; s.stateTicks = ru.use + (ru.need === 'injury' ? Math.round(900 * (1 - s.hp / s.max)) : 0); s.path = null; s.why = ru.label + ' at ' + DEFS[s.facility.type].name;
      if (ru.need === 'fatigue' && isNight()) { s.sleeping = true; s.activity = 'Sleeping'; s.stateTicks = Math.min(9500, ((S.hour >= 20 ? 30 : 6) - S.hour) * 1000 - (tick % 1000) + wakeOff(s)); s.why = `Sleeping at the ${DEFS[s.facility.type].name} until 6:00`; } }   /* V2.36: a bed for the night = fully rested */
    else if (r === 'fail') { s.noReach = { b: s.facility, t: tick + 3000 }; s.facility = null; enterFree(s, 90); s.why = "Couldn't reach it — trying later"; } return;
  }
  if (s.mode === 'useFacility') { s.moving = false; if (!s.facility || !world.buildings.includes(s.facility)) { s.facility = null; s.activity = null; enterFree(s, 40); return; }
    if ((s.talk || talkOk(s)) && s.stateTicks < 25) s.stateTicks = 25;   /* finish the sentence before leaving */
    if (!s.sleeping && OPEN_AIR.has(s.facility.type)) { const fb = s.facility; sitTalk(s, (o) => o.mode === 'useFacility' && o.facility && (o.facility === fb || (OPEN_AIR.has(o.facility.type) && dist(o.w, s.w) < 2.8)) && !o.sleeping); }
    if (s.sleeping && ((s.thirst >= 92 && S.water >= 1) || (s.hunger >= 92 && S.food >= 1))) { const th = s.thirst >= 92; s.sleeping = false; s.facility = null; s.activity = null; enterFree(s, 0); s.why = th ? 'Woke up parched' : 'Woke up starving'; return; }   /* 3D.63 study: people slept on while dying of thirst */
    if (s.sleeping && tick % 250 === (s.i * 17) % 250 && s.hp > 0 && s.hp < s.max * .75) { const fr = facilityRules[s.facility.type], h = Math.max(1, Math.round(s.max * (.015 + (fr ? fr.benefit : 26) / 2600))); s.hp = Math.min(Math.round(s.max * .75), s.hp + h); }   /* 3D.47 a night in bed heals (to 75%): about +2.5% every 15 min of game time, more in better beds */ if (s.stateTicks <= 0) { finishFacility(s); if (s.mode === 'free' && !onShift(s)) s.stateTicks = 50 + (s.i % 8) * 9; } return; }   /* 3D.63: the pause after a facility no longer overwrites 'keep resting' rounds or the quick return to work */
  if (['chase', 'attack', 'recover'].includes(s.mode)) {
    if (!s.target || s.target.hp <= 0) { enterPost(s); return; }
    if (retreatCheck(s)) return;
    { const t = s.target, tt = tileOf(t.w);   /* 3D.64 owner: no chasing a zombie that is leaving, or out past the edge of town */
      if (t.mode === 'zleave' || (s.mode === 'chase' && !t.human && !nearTown(t.w) && dist(s.w, t.w) > 1.5 && !(t.target && S.sv.includes(t.target)))) { s.skipZ = { z: t, t: tick + 600 }; s.target = null; s.why = 'Let it go'; enterPost(s); return; } }
    if (tick % 30 === s.i % 30 && !(s.target.mode === 'zattack' && s.target.target && S.sv.includes(s.target.target))) {   /* 3D.64 owner: break off to save someone being eaten close by */
      const z2 = S.z.filter((z) => z.hp > 0 && !z.human && z !== s.target && z.mode === 'zattack' && z.target && z.target !== s && S.sv.includes(z.target) && dist(z.w, s.w) < 4).sort((a, b) => dist(a.w, s.w) - dist(b.w, s.w))[0];
      if (z2) { s.target = z2; s.mode = 'chase'; s.path = null; s.comboQ = 0; s.why = 'Helping ' + z2.target.name; if (rnd() < .4) emote(s, '❗', 60, true); return; } }
    if (s.mode === 'chase') { const d = dist(s.w, s.target.w), rng = rangeOf(s) - (weaponOf(s).ranged ? .3 : 0); if (d > rng) {
      /* V3D.21: close in on a target others are already fighting through your own spot around it (evenly spaced round the
         target from the first fighter's side), instead of queuing behind the one who is swinging */
      const mates = d < 2.4 ? S.sv.filter((q) => q.target === s.target && q.hp > 0 && (q.mode === 'chase' || q.mode === 'attack')).sort((a, b) => a.id - b.id) : [];
      if (mates.length > 1) { const t = s.target.w, f = mates[0] === s ? mates[1] : mates[0], base = Math.atan2(f.w.y - t.y, f.w.x - t.x), k = mates.indexOf(s), n = mates.length, a = base + (k * 2 * Math.PI) / n, rr = Math.max(.35, Math.min(rng * .8, .6));
        const slot = { x: t.x + Math.cos(a) * rr, y: t.y + Math.sin(a) * rr }, bx = s.w.x, by = s.w.y; moveSlide(s, slot, CHASE); s.moving = true;
        if (Math.hypot(s.w.x - bx, s.w.y - by) > CHASE * TUNE.move * .2) return; }
      const r = followPath(s, s.target.w, CHASE); if (r === 'fail') { s.skipZ = { z: s.target, t: tick + 600 }; s.target = null; s.why = "Can't get to it"; enterPost(s); } }   /* 3D.124 owner's video: a zombie behind the fence was picked, dropped and picked again every second ('Fighting' flashing) */ else { s.moving = false; s.mode = 'attack'; s.path = null; s.stateTicks = Math.round((32 + s.i * 8) * (weaponOf(s).rate || 1)); } return; }
    if (s.mode === 'attack' && dist(s.w, s.target.w) > rangeOf(s) + (weaponOf(s).ranged ? .6 : .2)) { s.mode = 'chase'; return; }   /* 3D.64 owner: melee swings landed from about a tile away (reach + .6); now reach + .2 */   /* target slipped out of reach: follow, don't swing at air */
    if ((s.mode === 'attack' || s.mode === 'recover') && weaponOf(s).ranged) {   /* V3D.14: shooters step back from a zombie that gets in close (3D.64: between shots too) */
      const near = S.z.find((z) => z.hp > 0 && !z.human && z.target === s && dist(z.w, s.w) < .75);
      if (near) { const dx = s.w.x - near.w.x, dy = s.w.y - near.w.y, l = Math.hypot(dx, dy) || 1; moveSlide(s, { x: s.w.x + dx / l, y: s.w.y + dy / l }, CHASE * .9); s.moving = true; if (rnd() < .02) emote(s, '😰', 50); return; }
    }
    if (s.reloadT > 0) { s.moving = false; if (--s.reloadT <= 0) { reloadGun(s); if (!s.dry) emote(s, '👌', 50); } return; }   /* V3D.16: reloading: can't shoot (zombies still can) */
    if (s.mode === 'attack') { s.moving = false; if (s.stateTicks <= 0 && !weaponOf(s).ranged && dist(s.w, s.target.w) > rangeOf(s) + .25) { s.mode = 'chase'; return; } if (s.stateTicks <= 0) { const z = s.target, w = weaponOf(s), bonus = (professions[s.job]?.combat || 0) + skillDmg(s), dmg = Math.round((4 + w.atk * .55 + (w.ranged ? stat(s, 'per') : stat(s, 'str')) * .6 + bonus) * (w.ranged && hasSkill(s, 'marksman') ? 1.25 : 1) * friendBoost(s) * (isFighter(s) ? 1 : TUNE.nfDmg) * (z.type === 'riot' && w.kind === 'blade' ? .5 : 1) * comboMult(s, z, w) * (z.type === 'raider' && s.job === 'Police Officer' ? 1.5 : 1) * (s.spec && (hasSpec(s, 'swat') || hasSpec(s, 'marksman')) ? 1.2 : 1) * (hungryPen(s) < 1 ? .8 : 1) * (z.type === 'boss' && s.focusUntil > tick ? 1.3 : 1)); z.hp -= dmg; if (gearFx(s, 'charge') && !w.ranged && z.hp > 0 && z.type !== 'boss' && z.type !== 'brute' && rnd() < .25 && z.mode !== 'zrecover') { z.mode = 'zrecover'; z.stateTicks = z.recDur = 50; emote(z, '💫', 50); }   /* 3D.148 Football Pads: a shoulder charge knocks the zombie off balance */ if (z.type === 'boss' && z.hp > 0 && ['zmarch', 'zbash', 'zwall', 'zbreak', 'idle'].includes(z.mode) && !insideBuilding(s)) { z.target = s; z.mode = 'zchase'; z.path = null; z.blocked = 0; }   /* 3D.100 owner: the boss walked about while being shot; it now turns on whoever hits it */ if (s.comboFin) { if (!w.ranged) impactFx({ type: w.kind === 'blunt' ? 'brute' : 'walker' }, z.w); } z.hitT = 9; SFX(hitSfx(w)); if (w.mag) { s.ammo = (s.ammo == null ? w.mag : s.ammo) - (hasSpec(s, 'marksman') && rnd() < .33 ? 0 : 1); if (usesAmmo(w)) { S.stat = S.stat || {}; S.stat.shots = (S.stat.shots || 0) + 1; } if (s.ammo <= 0) { s.reloadT = Math.round(w.reload * 60); s.ammo = 0; emote(s, '🔄', Math.max(60, s.reloadT), true); } } floats.push({ w: { ...z.w }, t: '-' + dmg, col: '#ffe06b', a: 55 }); gainXp(s, .5); if (w.ranged) shots.push({ a: { ...s.w }, b: { ...z.w }, t: 6, bow: w.kind === 'bow' });
      if (z.hp <= 0) { S.kills++; SFX('kill'); gainXp(s, 2); if (z.type === 'boss') bark(s, 'bossKill', {}, { pri: 2 }); else if (rnd() < .3) bark(s, 'kill', {}, { pri: 1 }); else if (rnd() < .5) emote(s, rnd() < .5 ? '💪' : '😎', 80, true); raiderDown(z); if (z.type === 'boss' && z.helix) helixStalkerDown(); if (z.type === 'boss' && z.alpha) { const F = fac('hollow'); F.goneUntil = S.day + 60; F.alphaDay = 0; F.int = 0; setTimeout(() => earnBanner('faction', 'The Alpha fell. The Hollow have lost their flock.'), 900); } if (z.type === 'boss') { { const pool = ['katana', 'kevlar', 'shotgun', 'rifle', 'military', 'riot', 'crossbow', 'dogtags'], it = pool[Math.floor(rnd() * pool.length)]; dropBag(z.w, 15, s, { meds: 2, fuel: 2, cloth: 2, ...(rnd() < .7 ? { item: it } : {}) }, 'epic'); } S.bossKills = (S.bossKills || 0) + 1; screenToast('☠ BOSS DEFEATED'); SFX('reward'); } const zd = zombieTypes[z.type] || zombieTypes.walker, pd = PART_DROP[z.type] || PART_DROP.walker; const zx = {}; for (const [ch, k, n] of ZDROP[z.type] || []) if (rnd() < ch) zx[k] = (zx[k] || 0) + n; if (rnd() < pd[0] || Object.keys(zx).length) { dropBag(z.w, rnd() < pd[0] ? pd[1] : 0, s, Object.keys(zx).length ? zx : null); }
        if (z.type === 'boss' || z.human) { renownGain(zd.ren, zd.name + ' defeated'); say(s.name + ' defeated a ' + zd.name + '!'); } else { S.ren += zd.ren; floats.push({ w: { x: z.w.x, y: z.w.y - .3 }, t: '+' + zd.ren + '★', col: '#ffd56b', a: 50 }); ui(); }   /* V2.33: no pop-up or log line for every ordinary zombie */ stageCheck(); if (!fetchBag(s)) enterPost(s); return; }
      s.mode = 'recover'; s.stateTicks = s.recDur = s.comboQ > 0 ? 14 : Math.round((48 + s.i * 9) * Math.max(.6, 1 - (stat(s, 'agi') - 5) * .02) * (w.rate || 1)); } return; }   /* 3D.58 combo follow-ups come fast */
    if (s.mode === 'recover') { s.moving = false; if (s.stateTicks <= 0) { const z = s.target; if (s.comboQ > 0 && z && z.hp > 0 && dist(s.w, z.w) < rangeOf(s) + .25) { s.mode = 'attack'; s.stateTicks = 0; return; } s.comboQ = 0; s.mode = 'chase'; s.stateTicks = Math.round(32 * (weaponOf(s).rate || 1)); } } return;
  }
  if (s.mode === 'postCombat') { s.moving = false; if (downedUnassigned().length) { assignRescue(); if (s.mode === 'rescueTo') return; }
    if (s.hp < s.max * .5 && medSite() && facilityUsers(medSite()) < cap(medSite())) { const m = medSite(); s.facility = m; s.mode = 'goFacility'; s.stateTicks = 9999; s.path = null; s.why = 'Hurt after the fight → ' + DEFS[m.type].name; return; }   /* V2.18: patch up before the next one */ if (s.stateTicks <= 0) enterFree(s, 20); return; }
  if (s.mode === 'wait' && s.purpose === 'post-hold') { s.moving = false; const gp = myPost(s); if (!gp || !postActive(gp)) { s.purpose = null; enterFree(s, 20); return; } if (downedUnassigned().length && tick % 30 === 0) { assignRescue(); if (s.mode === 'rescueTo') return; } if (tick % 15 === s.i % 15 && acquireEnemy(s)) { s.purpose = null; return; } if (s.stateTicks <= 0) { s.purpose = null; s.mode = 'free'; s.stateTicks = 0; } return; }
  if (s.mode === 'wait') { s.moving = false; if (s.sleeping === 'rough' && ((s.thirst >= 92 && S.water >= 1) || (s.hunger >= 92 && S.food >= 1))) s.stateTicks = 0; if (s.stateTicks <= 0) { if (s.sleeping === 'rough') { const mt = gearFx(s, 'rest'); s.fatigue = mt ? 0 : Math.max(0, s.fatigue - 50); s.sleeping = false; s.why = mt ? 'Slept on the Mattress Vest. Fully rested' : 'Woke up stiff (slept rough)'; }   /* 3D.149 Mattress Vest */ s.mode = 'free'; s.stateTicks = 0; scavWait(s); } return; }
  if (s.mode === 'walk') {
    if (acquireEnemy(s)) return;
    const r = s.dest ? followPath(s, s.dest, WALK) : 'arrived';
    if (r === 'moving' && s.stateTicks > 0) return;
    if (s.purpose === 'post' && (r === 'arrived' || dist(s.w, s.dest || s.w) < .5)) { s.mode = 'wait'; s.purpose = 'post-hold'; s.stateTicks = 360; s.dest = null; s.path = null; s.idleBubble = '🛡️'; const gp = myPost(s); s.why = gp ? `On guard at the ${postName(gp)}` : 'On guard'; return; }
    if (s.purpose === 'scav-out' && r === 'arrived') { s.mode = 'wait'; s.stateTicks = 160; s.purpose = 'scav-search'; s.why = 'Searching for supplies'; s.dest = null; s.path = null; return; }
    if (s.purpose === 'scav-back' && r === 'arrived') { lootFind(s); gainXp(s, 2); ui(); }
    if (s.purpose === 'gath-out') { if (r === 'arrived' || dist(s.w, s.dest || s.w) < .35) { s.mode = 'gather'; s.purpose = null; s.dest = null; s.path = null; const K = NODE[s.gatherK || 'tree']; s.activity = K.act; s.stateTicks = Math.round(K.ticks / TUNE.work / TOOL_SPEED[toolLvl(s.gatherK || 'tree', false)]); s.why = { tree: 'Chopping a tree', rock: 'Breaking a rock', wreck: 'Stripping a wreck for scrap', bin: 'Rummaging through a clothes bin' }[s.gatherK || 'tree']; return; } if (r === 'fail') s.gatherAt = null; }
    if (s.purpose === 'gath-back' && (r === 'arrived' || r === 'fail' || s.stateTicks <= 0)) { if (!canDeliver(s)) return; dropWood(s); s.purpose = null; }
    if (s.purpose === 'haul-get' && (r === 'arrived' || r === 'fail' || s.stateTicks <= 0)) { const x = s.haul && jobById(s.haul.id); if (!x) { cancelHaul(s); s.purpose = null; } else { s.carriedLoot = s.haul.r; s.carryAmt = s.haul.n; s.purpose = 'haul-put'; s.dest = jobPt(x); s.path = null; s.stateTicks = 2400; s.mode = 'walk'; s.why = `Bringing ${RES_ICON[s.haul.r]} to the ${jobName(x)}`; return; } }
    if (s.purpose === 'haul-put' && (r === 'arrived' || r === 'fail' || s.stateTicks <= 0)) { if (!canDeliver(s)) return; const h = s.haul, x = h && jobById(h.id); s.haul = null; s.carriedLoot = null; s.carryAmt = 0; s.purpose = null;
      if (h && x) { x.j.inb[h.r] = Math.max(0, (x.j.inb[h.r] || 0) - h.n); const add = Math.min(h.n, Math.max(0, (x.j.need[h.r] || 0) - (x.j.got[h.r] || 0))); x.j.got[h.r] = (x.j.got[h.r] || 0) + add; if (h.n > add) S[h.r] += h.n - add; if (add) jobDelivered(x, h.r, add, s); gainXp(s, 1); } else if (h) S[h.r] += h.n; }
    if (s.purpose === 'build-go') { if (r === 'arrived' || dist(s.w, s.dest || s.w) < .4) { s.mode = 'hammer'; s.purpose = null; s.dest = null; s.path = null; s.stateTicks = Math.round(600 / TUNE.work); return; } if (r === 'fail' || s.stateTicks <= 0) { endHammer(s); s.purpose = null; } }
    s.dest = null; s.path = null; settlePause(s, 100, 220); return;
  }
  if (s.mode === 'wait' || s.purpose === 'scav-search') return;
  if (s.mode === 'free') { if (s.stateTicks > 0) { s.moving = false; return; } if (s.carriedLoot && s.carryAmt) { s.dest = depotPt(s); s.mode = 'walk'; s.purpose = 'gath-back'; s.path = null; s.stateTicks = 2400; s.why = 'Taking the load home first'; return; } { const q = medicFindPatient(s); if (q) { startAid(s, q, 'patch'); return; } } chooseLifePurpose(s); }   /* 3D.28: a load in hand goes home before anything else */
}
// scavenger leaves 'wait' after searching → head home
function lootFind(s) {
  const r = s.forage ? (s.forage === 'food' ? .45 + rnd() * .26 : .72 + rnd() * .28) : rnd(); s.forage = null; const _r = r;
  const r2 = _r, bonus = (professions[s.job]?.scav > 2 ? 1 : 0) + (hasSkill(s, 'lootSense') ? 1 : 0), f = (t, col) => floats.push({ w: { ...s.w }, t, col, a: 70 });
  if (r2 < .42) { const n = 1 + bonus; S.mat += n; f('+' + n + ' ⚙', '#9fe0ff'); }
  else if (r2 < .71) { const n = 1 + bonus; S.food += n; S.produced += n; dayLog.foodIn += n; f('+' + n + ' 🍖', '#ffe06b'); }
  else { const n = 1 + bonus; S.water += n; S.produced += n; dayLog.waterIn += n; f('+' + n + ' 💧', '#8fd8ff'); }
}
function scavWait(s) { if (s.purpose === 'scav-search' && s.mode === 'free') { s.mode = 'walk'; s.purpose = 'scav-back'; s.dest = tc(7 + OFF, 9 + OFF); s.why = 'Returning with supplies'; s.stateTicks = 900; } }

