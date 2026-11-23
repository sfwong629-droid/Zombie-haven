/* ---- UI ---- */
let expOpen = false; const expSel = { dest: 'houses', risk: 'low', ids: null };
const mmss = (ms) => { { const gm = Math.max(0, Math.ceil(ms / EXP_HMS * 60)); return Math.floor(gm / 60) + 'h ' + String(gm % 60).padStart(2, '0') + 'm'; }  };
function expTripLeft(t, now = (expNow())) { return t.phase === 'back' ? t.backAt - now : t.t0 + t.dur - now; }
/* V3D.18 the exploration bar (DV2 style): the squad walks a little path along the bottom of the screen, stopping at three
   points where they search (loot pops) or run into trouble (a zombie shakes), then walks home */
let expBarT = null;
function expBar() {
  const t = S.trip; let el = $('expBar');
  if ((!t)) { if (el) el.remove(); if (expBarT) { clearInterval(expBarT); expBarT = null; } return; }
  if (!el) { el = document.createElement('div'); el.id = 'expBar'; el.className = 'expBar'; document.body.appendChild(el); el.onclick = () => showExpedition(); }
  const d = EXP_DEFS[t.dest], key = t.dest + '|' + t.members.map((m) => m.id).join(',');
  if (el.dataset.k !== key) {
    el.dataset.k = key; el.classList.toggle('mini', !!S.expMini);
    const figs = t.members.slice(0, 4).map((m, i) => { const a = window.ZH3D && ZH3D.figure ? ZH3D.figure(m, 'walkA') : null, b = window.ZH3D && ZH3D.figure ? ZH3D.figure(m, 'walkB') : null; return `<div class="ebF" style="--i:${i}">${a ? `<img class="fa" src="${a}" alt=""><img class="fb" src="${b}" alt="">` : '🙂'}</div>`; }).join('');
    el.innerHTML = `<button class="ebHide" aria-label="Hide">${window.ZHIcons ? ZHIcons.svg('cross', 16) : '✕'}</button><div class="ebMini">${window.ZHIcons ? ZHIcons.svg('explore', 26) : '🧭'}<span class="ebMT"></span></div><div class="ebPath"></div><div class="ebEnd home">${window.ZHIcons ? ZHIcons.svg('home', 24) : '🏠'}</div>${[1, 2].map((k) => `<div class="ebStop" style="left:${8 + 82 * k / 3}%" data-k="${k}"></div>`).join('')}<div class="ebEnd dest">${d.icon}</div><div class="ebSquad">${figs}</div><div class="ebFx"></div><div class="ebTime"></div>`;
  }
  const now = expNow(), out = t.phase === 'out', pos = out ? Math.min(1, (now - t.t0) / t.dur) : (t.backPos ?? 1) * Math.max(0, (t.backAt - now) / Math.max(1, t.backAt - (t.backFrom ?? t.backAt - 1)));
  const sq = el.querySelector('.ebSquad'); sq.style.left = (8 + 82 * pos) + '%'; sq.classList.toggle('back', !out); sq.classList.toggle('stop', !!t.enc || modalOpen || (window.ZHG && ZHG.paused && ZHG.paused()));
  el.querySelectorAll('.ebStop').forEach((st) => st.classList.toggle('done', t.stage >= +st.dataset.k));
  el.querySelector('.ebTime').textContent = (out ? '' : '↩ ') + mmss(expTripLeft(t)); { const mt = el.querySelector('.ebMT'); if (mt) mt.textContent = (out ? '' : '↩ ') + mmss(expTripLeft(t)); }
  { const hb = el.querySelector('.ebHide'); if (hb && !hb.onclick) hb.onclick = (e) => { e.stopPropagation(); S.expMini = true; el.classList.add('mini'); }; }   /* 3D.30: tuck the trip bar away into a small chip */
  el.onclick = () => { if (el.classList.contains('mini')) { S.expMini = false; el.classList.remove('mini'); } else showExpedition(); };
  if (t.fx && t.fx.shown !== t.fx.at) { t.fx.shown = t.fx.at; const fx = el.querySelector('.ebFx'), x = 8 + 82 * Math.min(1, t.fx.stage / 3);
    fx.innerHTML = `<div class="ebPop ${t.fx.bad ? 'bad' : 'good'}" style="left:${x}%">${t.fx.bad ? (window.ZHIcons ? ZHIcons.svg('zombie', 26) : '🧟') : (window.ZHIcons ? ZHIcons.svg('box', 26) : '📦')}<span>${t.fx.bad ? 'Trouble!' : esc((t.fx.got || []).map((g) => '+' + g).join(' '))}</span></div>`; }
  if (!expBarT) expBarT = setInterval(expBar, 120);
}
function expTick() {   // called every second: chip on the HUD and the live numbers in the panel
  expBar();
  const t = S.trip, chip = $('tripChip'); if (chip) { chip.style.display = ('none'); if (t) $('tripTime').textContent = (t.phase === 'back' ? '↩ ' : '') + mmss(expTripLeft(t)); }
  if (expOpen && t && $('expTime')) { $('expTime').textContent = mmss(expTripLeft(t)); const st = $('expStage'); if (st) st.textContent = t.phase === 'back' ? 'Walking home' : `Stage ${Math.min(EXP_STAGES, t.stage + 1)} of ${EXP_STAGES}`; }
}
function expPreWhy(ids) {   /* 3D.30: say up front why the squad can't leave, instead of a button that silently does nothing */
  if (expMsg.t && performance.now() - expMsg.at < 5000) return expMsg.t;
  if (S.trip) return 'A squad is already out';
  if (!S.sv.some(expEligible)) return 'Nobody is ready: everyone is hurt, hungry, thirsty or busy';
  if (!ids.length) return 'Tap a survivor to add them to the squad';
  if (S.sv.length - ids.length < EXP_HOME_MIN) return `Keep at least ${EXP_HOME_MIN} survivors at home`;
  return '';
}
function expMsg(t) { expMsg.t = t; expMsg.at = performance.now(); const e = $('expWhy'); if (!e) { say(t); return; } e.textContent = t; e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); }
function showExpedition() {
  endBuildMode(true); closeP(); expOpen = true; $('it').textContent = 'Explore'; const t = S.trip;
  if (t) {
    const d = EXP_DEFS[t.dest];
    $('ib').innerHTML = `<b>${d.icon} ${d.name}</b> · ${EXP_RISK[t.risk].label} risk<br><span id="expStage">${t.phase === 'back' ? 'Walking home' : `Stage ${Math.min(EXP_STAGES, t.stage + 1)} of ${EXP_STAGES}`}</span> · <b id="expTime">${mmss(expTripLeft(t))}</b> left<br>
      Squad: ${t.members.map((m) => `${esc(m.name)} (${m.job}, HP ${Math.ceil(m.hp)}/${m.max})`).join(', ')}<br>
      Loot so far: ${['food', 'water', 'wood', 'stone', 'mat'].filter((k) => k !== 'wood' && k !== 'stone' || t.loot[k]).map((k) => `${RES_ICON[k]} ${t.loot[k] || 0}`).join('  ')}<br>${t.enc ? `<div class="card encCard"><b>${EXP_ENC[t.enc.k].title}</b><div class="sm">${EXP_ENC[t.enc.k].text} Decide before the next stage, or the squad decides.</div>${encButtons(t).map((b, i) => `<button class="act${i === 0 ? ' go' : ''}" data-enc="${i}" style="width:100%;margin:4px 0 0">${b.label}</button>`).join('')}</div>` : ''}<small>${t.log.map(esc).join('<br>')}</small><br>
      ${t.phase === 'out' ? '<button class="act danger" id="expRecall">RECALL SQUAD</button><br><small>Recall keeps the loot from finished stages and skips the risk of the rest. Leaving mid-stage forfeits that stage’s loot. The trip keeps running while the game is closed.</small>' : '<small>The squad is heading back.</small>'}`;
    const rb = $('expRecall'); if (rb) rb.onclick = () => { if (expRecall()) showExpedition(); };
    $('ib').querySelectorAll('[data-enc]').forEach((b) => { const en = t.enc; b.onclick = () => encChoose(en, +b.dataset.enc); });
  } else {
    if (expSel.force && EXP_DEFS[expSel.force] && !expLocked(expSel.force)) { expSel.dest = expSel.force; expSel.risk = 'high'; }   /* 3D.114 a raid picked from the Factions card */
    else {   /* V3D.18: you can only go where a lead points */
      leadsTidy(); const L = S.leads || [];
      if (!L.length) { $('ib').innerHTML = `<div class="card leadNone"><div class="lnIc">${window.ZHIcons ? ZHIcons.svg('radio', 44) : '📻'}</div><div><b>No leads right now</b><div class="sm">Scouts and the radio bring new places to search in the morning and the afternoon. Each lead lasts about 10 hours.</div></div></div>${S.lastTrip ? `<div class="sm">Last trip: ${EXP_DEFS[S.lastTrip.dest].name}${S.lastTrip.lost.length ? ' · lost ' + S.lastTrip.lost.join(', ') : ''}</div>` : ''}`; showPanel(); return; }
      if (!L.some((l) => l.id === expSel.lead)) expSel.lead = L[0].id; const ld = L.find((l) => l.id === expSel.lead); expSel.dest = ld.dest; expSel.risk = ld.risk;
    }
    if (!EXP_DEFS[expSel.dest] || expLocked(expSel.dest)) expSel.dest = 'houses';
    const d = EXP_DEFS[expSel.dest]; if (!d.risks.includes(expSel.risk)) expSel.risk = d.risks[0];
    let ids = (expSel.ids || []).filter((id) => S.sv.some((q) => q.id === id && expEligible(q))); if (!ids.length) ids = expAutoSquad().map((q) => q.id); expSel.ids = ids;
    const members = ids.map((id) => S.sv.find((q) => q.id === id)).filter(Boolean), pv = expPreview(expSel.dest, expSel.risk, members), rk = EXP_RISK[expSel.risk];
    const ready = S.sv.filter(expEligible);
    const where = (`<div class="sm">Leads</div><div class="lst">${(S.leads || []).map((l) => { const v = EXP_DEFS[l.dest], on = l.id === expSel.lead; return `<div class="card" data-lead="${l.id}" style="${on ? 'border-color:var(--gold)' : ''}"><span style="font-size:28px">${v.icon}</span><div class="sp"><b>${v.name}</b> <span class="sm">${EXP_RISK[l.risk].label} risk · ${EXP_HOURS[l.risk]} h trip</span><div class="sm">${esc(l.text)} · gone in ${Math.max(1, Math.round(l.untilH - nowH()))} h</div></div>${on ? '<b>✔</b>' : ''}</div>`; }).join('')}</div>`);
    const lootTxt = Object.entries(d.loot || {}).map(([r, [a0, a1]]) => `${(RES_ICON[r] || RES_NAME[r] || r)} ${Math.round(a0 * EXP_STAGES * pv.mult)}–${Math.round(a1 * EXP_STAGES * pv.mult)}`).join('  ');   /* 3D.41: a rough total for the whole trip */
    $('ib').innerHTML = (`<div class="card expTop"><div class="etRow"><span class="etN"><b>${ids.length}/${expMax()}</b><small>squad</small></span><button class="act go" id="expGo">${(SH_DEFS[expSel.dest]) ? 'Enter the stronghold' : `Send squad · ${EXP_HOURS[expSel.risk]} h`}</button></div>${vehCard()}${EXP_DEFS[expSel.dest].raid ? `<div class="etLine sm">Their camp: pick which buildings to bring down and what to loot. Gear, ammo and the leader are in the middle. Get out through the gate with what you took.</div>` : ''}${(SH_DEFS[expSel.dest]) ? (() => { const pw = shPower(members), rc = SH_DEFS[expSel.dest].rec; return `<div class="etLine"><span class="etK">Power</span> <b style="color:${pw >= rc ? 'var(--good)' : pw >= rc * .85 ? '#c98a1e' : 'var(--bad)'}">${pw}</b> / ${rc} recommended · you watch the fight and give the calls</div>` + shCardLine(expSel.dest); })() : ''}<div class="etLine"><span class="etK">Cost</span> 🍖${pv.need} 💧${pv.need}${pv.short ? ' <span style="color:var(--bad)">(short: riskier)</span>' : ''}</div><div class="etLine"><span class="etK">Loot</span> ${lootTxt || '×' + pv.mult.toFixed(1)}</div>${(SH_DEFS[expSel.dest]) ? '' : tripCheck(expSel.dest, expSel.risk, members, pv)}${ready.length ? '' : '<div class="sm">Nobody is healthy and free right now.</div>'}<div id="expWhy" class="expWhy">${expPreWhy(ids)}</div></div>`
      + where + `<div class="sm">Squad (1–${expMax()}, ${EXP_HOME_MIN} stay home)</div>${pfBar()}<div class="lst">${pfList(S.sv.slice()).map((q) => { const on = ids.includes(q.id), ok = expEligible(q); return `<div class="card" data-s="${q.id}" style="${on ? 'border-color:var(--good)' : ''}${ok || on ? '' : ';opacity:.45'}">${portrait(q)}<div class="sp">${esc(q.name)} ${traitIcon(q)} <span class="sm">${q.job} Lv.${q.l}</span><div class="sm">${ok ? 'Ready' : expBlock(q) || 'Busy'}</div></div>${on ? '<b style="color:var(--good)">✔</b>' : ''}</div>`; }).join('')}</div>`);
    $('ib').querySelectorAll('[data-lead]').forEach((b) => { b.onclick = () => { expSel.lead = b.dataset.lead; showExpedition(); }; }); pfWire($('ib'), showExpedition);
    $('ib').querySelectorAll('[data-d]').forEach((b) => { b.onclick = () => { if (expLocked(b.dataset.d)) { say(expLocked(b.dataset.d)); return; } expSel.dest = b.dataset.d; showExpedition(); }; });
    $('ib').querySelectorAll('[data-r]').forEach((b) => { b.onclick = () => { expSel.risk = b.dataset.r; showExpedition(); }; });
    $('ib').querySelectorAll('[data-s]').forEach((b) => { b.onclick = () => { const id = +b.dataset.s, q = S.sv.find((x) => x.id === id); if (ids.includes(id)) expSel.ids = ids.filter((x) => x !== id); else if (q && expEligible(q) && ids.length < expMax()) expSel.ids = [...ids, id]; else expMsg(q && !expEligible(q) ? `${q.name} can’t go: ${expBlock(q) || 'busy right now'}` : ids.length >= EXP_MAX_SQUAD ? `A squad is at most ${EXP_MAX_SQUAD}` : 'That survivor can’t go right now'); showExpedition(); }; });
    $('ib').querySelectorAll('[data-goal]').forEach((b) => { b.onclick = () => { expSel.goal = b.dataset.goal; showExpedition(); }; }); $('ib').querySelectorAll('[data-veh]').forEach((b) => { b.onclick = () => { expSel.veh = b.dataset.veh || null; showExpedition(); }; }); $('ib').querySelectorAll('[data-vbuild]').forEach((b) => { b.onclick = () => { vehBuildCart(); showExpedition(); }; }); $('ib').querySelectorAll('[data-vfix]').forEach((b) => { b.onclick = () => { vehRepair(b.dataset.vfix); showExpedition(); }; });   /* 3D.109 */
    $('expGo').onclick = () => { const r = startExpedition(expSel.dest, expSel.risk, expSel.ids); if (!r.ok) { expMsg(r.why); return; } if (!expSel.force) S.leads = (S.leads || []).filter((l) => l.id !== expSel.lead); closeP(); expSel.ids = null; expSel.force = null;  };
  }
  showPanel();
}
/* V2.9 death and recovery model */
const BLEED_TICKS = { none: 7200, medic: 10800, clinic: 12600, hospital: 14400 };
const CARE_TICKS = { medic: 3600, clinic: 2700, hospital: 1800 };   // the Camp: 1.5 x medic (careTicks)
let BANDAGE_COST = 2, BANDAGE_TICKS = 3600;   /* Field Medicine research: 1 part, longer */
function medTier() { const m = medSite(); return m ? m.type : 'none'; }
function bleedMax() { return Math.round(BLEED_TICKS[medTier()] * DF().bleed * ((window.ZH_BAL || {}).bleed || 1.5)   /* balance study (Nov 8): every long-run death was a bleed-out; the downed hold on 50% longer */ * (medTier() === 'hospital' && anyPowered('hospital') ? 1.4 : 1)); }   /* 3D.77: surgery: a powered Hospital gives the dying 40% longer */
function careTicks(b) { if (b !== undefined && (!b || isCamp(b))) return Math.round(CARE_TICKS.medic * 1.5);   /* 3D.46 camp care: half again as long as a Medical Tent */
  const t = b ? b.type : medTier(), m = b || medSite(), st = m && isWorking(m) ? Math.max(.6, 1 - (stat(m.staff, 'int') - 5) * .03) : 1; return Math.round((CARE_TICKS[t] || CARE_TICKS.medic) * st * (m ? 1 - combos(m).care : 1) * (m && m.unpaid ? 1.4 : 1) * (m && !(isWorking(m) && m.staff && m.staff.job === 'Medic') ? 1.3 : 1) * (m && isWorking(m) && gearFx(m.staff, 'medic') ? .8 : 1)); }   /* 3D.69: care without a Medic on staff is 1.3x slower (was 1.6x in 3D.67: made the Medic too essential) */
