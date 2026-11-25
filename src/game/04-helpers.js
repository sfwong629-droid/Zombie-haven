/* ---------------- helpers ---------------- */
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const tileOf = (w) => ({ x: Math.max(0, Math.min(COLS - 1, Math.floor(w.x))), y: Math.max(0, Math.min(ROWS - 1, Math.floor(w.y))) });
const tc = (x, y) => ({ x: x + .5, y: y + .5 });
const rnd = () => Math.random();
/* ======================= 3D.135 RADIO CALLS (owner: tips and news read like a monotone; make them a radio call, funny or at least interesting) =======================
   radio(voice, text, { more, act, key }): a small card slides in above the tab bar with a named voice and one short line.
   Tap it for the details (more = text for a card, act = a function), or let it fade. One at a time, queued (3 at most), every call goes to the event log.
   Voices: dj = Dusk Radio (tips, level-ups, the morning show), toll = the Toll Kings (threats), green = Greenwater Commune (friendly news). */
const RADIO_V = { dj: { name: 'Dusk Radio', who: 'DJ Moth', col: '#f2b84a' }, toll: { name: 'Toll Kings', who: 'the Collector', col: '#e8584a' }, green: { name: 'Greenwater', who: 'Sister June', col: '#7fd35a' }, foundry: { name: 'The Foundry', who: 'Forgemaster Hale', col: '#c9a36a' },
  quar: { name: 'Quarantine Command', who: 'Major Okafor', col: '#8fb7a0' }, helix: { name: 'Helix Biotech', who: 'Dr. Voss', col: '#7fc8e8' }, hollow: { name: 'The Hollow', who: 'the Shepherd', col: '#b49ad6' } };
const RADIO_L = {
  morning: ["Good morning, survivors. Day {day}. The sky is the colour of old soup. Lovely.", "Day {day} and you're still breathing. Statistically, that's showing off.", "This is Dusk Radio, the only station left, which makes us number one. Day {day}.", "Weather for day {day}: cloudy, with a chance of teeth.",
    "Day {day}. Reminder: zombies can't climb fences. Probably. Nobody has checked twice.", "Rise and shine. The dead got up early, so you might as well.", "Day {day} traffic report: one highway, zero cars, several pedestrians. Do not offer them a lift.", "Morning. If you can hear this, your radio works. If you can't, well.",
    "Day {day}. Today's lucky number is however many of you are left. Keep it.", "Good morning. Breakfast is whatever didn't run away.",
    "Day {day}. Horoscope for everyone: avoid tall, quiet strangers who drool.", "Morning. Coffee ran out years ago. We are all just like this now.", "Day {day}. Dusk Radio's listener survey is in: both of you love the show.", "Up you get. That fence won't stare nervously at itself.",
    "Day {day}. Property values in your area are, frankly, incredible. No neighbours.", "Good morning. Today's word is 'perimeter'. Use it in a sentence. Then build one.", "Day {day}. Somebody out there is having a worse morning, and it's chewing on your gate.", "Morning news: still the apocalypse. Sport: running. Weather: outside.",
    "Day {day}. Fun fact: zombies never sleep in. Be more like... no, don't.", "Rise and shine. If the rooster's quiet, check on the rooster.", "Day {day}. This broadcast is brought to you by scrap. Scrap: it's what everything is made of now.", "Good morning. Check your boots for spiders and your yard for uncles.",
    "Day {day}. I had a dream the phones worked. It was mostly spam.", "Morning. Hydrate, stretch, and try not to get bitten. In that order."],
  dusk: ["Sun's going. Lock the gate, count your people, then count them again.", "Dusk Radio signing off. We're called that because this is when it gets bad.", "Night's coming. If something knocks, it is not the post.", "Dark soon. Fighters to the fence. Everyone else, pretend to be furniture.", "That's the sun done for today. Try to be here when it comes back.",
    "Evening. Tonight's film is 'Things At The Fence'. It's a long one.", "Sun's clocking off. The night shift is hungrier and has worse manners.", "Getting dark. Now's a bad time to remember you left the gate open.", "Bedtime story: once upon a time everyone stayed inside. The end.",
    "Dusk. If you've got a favourite weapon, go and stand near it."],
  level: ["Word on the road: the Haven hit level {n}. Somebody out there is actually organised.", "Level {n}! I'd send a cake, but I ate it. Years ago.", "The Haven is level {n} now. Bigger town, bigger target. Congratulations, I think.", "Level {n}. At this rate you'll have a parking problem by spring.", "Level {n}. Somebody tell the zombies you've gone upmarket.", "Level {n}! That's practically a town. Next you'll want a mayor, and then you'll be sorry.", "Hearing good things about the Haven. Level {n}. Do you do tours?", "Level {n}. The zombies have noticed too. They're your biggest fans."],
  trader: ["Trader on the highway, heading your way. Hide the good stuff. No, wait. Show the good stuff.", "A trader's coming. Prices are terrible, but so is everything."],
  guest: ["Somebody's walking up your road. Two legs, normal speed. Promising.", "Visitor on the highway. Walking, not shambling. I'd open the gate."],
  boss: ["Scouts say something big is leading tonight's crowd. Big as in 'bring friends'. 21:00.", "Bad news with a time on it: a boss comes with the horde at 21:00. Sharpen something."],
  convoy: ["A convoy rolled into the Haven with people and supplies. Be nice. They have a truck."],
  goal: ["Listener request:", "Free advice, worth every penny:", "If I were you, and I'm glad I'm not:", "Today's homework:"],
  note: ["New on the dial:", "Fresh gossip:", "Heard about this one?"],
  tip: ["Word is:", "A little bird says:", "Between you and me:"],
  tollRev: ["You took from the Kings. The Kings collect. See you very soon."], tollBack: ["Miss us? The Toll Kings are back on the highway. The toll went up."],
  foundryRev: ["You broke our furnace. We make hammers, you know. Lots of hammers."], foundryBack: ["The Foundry is lit again. We've been busy. You'll see."],
  foundrySab: ["Funny thing happened at your place last night. Terrible luck. Could happen again.", "Heard you had a rough night. We wouldn't know anything about that.", "Small towns have accidents. Smaller is safer. Think about it."],
  foundryJeal: ["People keep talking about the Haven. Fine. You've earned it. Don't let it go to your head.", "Word of the Haven reached our furnace floor. The lads are impressed. I'm merely interested."],
  foundryWar: ["Enough. The Foundry is coming to see how well your walls were welded.", "We asked nicely. Now we're asking with armour on."],
  foundryGift: ["Foundry here. A crate of steel is at your gate. Sister towns look after each other."],
  quarMeet: ["This is Quarantine Command. Stay in your homes. ...Wait. Somebody's actually out there? Hold position. We're sending a team."],
  quarDrop: ["Quarantine Command. Your numbers look clean. Supply drop at your gate. Don't make us regret it.", "Clean bill of health, Haven. Crate's at the gate. Wash your hands anyway."],
  quarWarn: ["Haven, your infection numbers are climbing. Fix it. This is the polite version of this call.", "Command to Haven: we count the sick. You have too many. Get them treated."],
  quarCordon: ["Haven is under cordon. Nobody leaves. Anyone who tries gets a very stern talking-to, followed by warning shots."],
  quarFire: ["Final notice, Haven. Infection is past the line. You have until tomorrow night, or we sterilise a building. Our choice of building."],
  quarBurn: ["We did warn you. Sterilisation complete. Sorry about the mess."], quarOk: ["Numbers are back under the line. Cordon lifted. Good work, Haven."],
  quarRev: ["You fired on soldiers. Captain Vance is on his way to discuss it."], quarBack: ["Quarantine Command is back on the air. New officers. Same rules."],
  quarGift: ["Safe Zone Haven, this is Command. Weekly crate is at your gate. Carry on."],
  helixMeet: ["Hello! Dr. Voss, Helix Biotech. We've had a look at your bite records. One of them is... interesting. We'd love a chat."],
  helixAsk: ["Helix again. Just a small blood sample. Barely a cupful. Science will thank you.", "Dr. Voss here. Our offer stands, and so does our van. It's parked quite close, actually."],
  helixTeam: ["We did ask nicely. A retrieval team is on its way. Please have our asset ready by the gate.", "Helix Asset Recovery is inbound. Nothing personal. It's in the contract you never signed."],
  helixTaken: ["Thank you for your cooperation. The asset is comfortable. Mostly."], helixStalk: ["A test subject seems to have left the lab. It has your friend's scent. We'd stay indoors for about three nights."],
  helixRev: ["That lab was expensive. Recovery teams are authorised to be less polite."], helixBack: ["Helix Biotech has reopened its regional office. We look forward to working on you. With you."],
  helixGift: ["Partner delivery from Helix: supplies and something from the lab. Side effects are unlikely."],
  hollowMeet: ["Shhh. Do you hear them at the fence? They are not angry. They are lonely. So are some of your people. We will be listening."],
  hollowWhisper: ["Someone in your town cried last night. We heard. We always hear.", "Unhappy people leave doors open. We like doors."],
  hollowNight: ["Tonight the flock walks with a shepherd. Leave the gate. It will be easier.", "We are bringing friends tonight. So many friends."],
  hollowRev: ["You burnt our chapel. The flock is very upset. The flock is also very large."], hollowBack: ["Did you think we were gone? We were only walking."],
  hollowAlpha: ["The Shepherd has called the Alpha. It leads the whole flock to you tonight. Be flattered."],
  greenRev: ["That was ours. We're coming to get it back, and we won't be bringing vegetables."], greenGift: ["Greenwater here. We left food and water at your gate. Don't thank us. Just don't raid us."],
};
const radioQ = []; let radioOn = null;
const rLine = (k, v = {}) => { const L = RADIO_L[k]; return L[Math.floor(Math.random() * L.length)].replace(/\{(\w+)\}/g, (_, n) => v[n] ?? ''); };
function radio(voice, text, o = {}) {   /* 3D.147 text can be a list of lines: they are spoken one after another on the same card */
  const lines = (Array.isArray(text) ? text : [text]).filter(Boolean); text = lines.join(' ');
  const V = RADIO_V[voice] || RADIO_V.dj; logEvent(`📻 ${V.name}: ${text}`, o.level || 'routine');
  if (typeof document === 'undefined' || S.cut || titleOn) return; if (o.key && (radioQ.some((q) => q.key === o.key) || (radioOn && radioOn.key === o.key))) return;
  radioQ.push({ voice, text, lines, more: o.more || null, act: o.act || null, key: o.key || null, title: o.title || null, urgent: o.urgent || o.level === 'important' || o.level === 'critical' }); if (radioQ.length > 3) radioQ.shift(); radioNext();
}
/* 3D.221 (owner, 16 Nov rule, U23): nothing floats over an open menu. A radio message waits while a menu is open; one that is already
   playing when a menu opens is stopped, put back at the front of the queue and plays again from the start when the menu closes
   (it types out on a real-time clock, so hiding it would let it run on unseen). */
const menuOpenNow = () => { const p = $('infoPanel'); return !!(p && p.classList.contains('show')); };
function radioHold() {
  if (!radioOn) return; const c = radioOn, el = $('radioCard'); clearTimeout(radioNext.t); clearTimeout(radioNext.ty); radioOn = null;
  if (el) el.classList.remove('in', 'talk'); radioQ.unshift(c); if (radioQ.length > 3) radioQ.pop(); clearTimeout(radioNext.wt); radioNext.wt = setTimeout(radioNext, 800);
}
function radioNext() {
  if (!radioNext.mo && window.MutationObserver && $('infoPanel')) { radioNext.mo = new MutationObserver(() => { if (menuOpenNow()) radioHold(); }); radioNext.mo.observe($('infoPanel'), { attributes: true, attributeFilter: ['class'] }); }
  if (radioOn || !radioQ.length) return; const w = nStack('nBot'); if (!w) return; if (menuOpenNow() || cardOpen() || (!radioQ[0].urgent && fightOn())) { clearTimeout(radioNext.wt); radioNext.wt = setTimeout(radioNext, 800); return; }   /* 3D.159 the radio waits while a card is open, and ordinary chatter waits out a fight */ const c = radioQ.shift(), V = RADIO_V[c.voice] || RADIO_V.dj; radioOn = c; radioLast = c; radioBtn();
  let el = $('radioCard'); if (!el) { el = document.createElement('button'); el.id = 'radioCard'; w.appendChild(el); } else if (el.parentElement !== w) w.appendChild(el);
  if (phoneOn()) return radioLive(el, c, V);   /* 3D.349 */
  const tap = true;   /* 3D.159 the card shows 2 lines: a tap always opens the full words (or the action) */
  el.className = 'radioCard v-' + c.voice; el.style.setProperty('--rc', V.col);
  el.innerHTML = `<span class="rcI">${window.ZHIcons ? ZHIcons.svg('radio', 30) : '📻'}<i></i><i></i><i></i></span><span class="rcT"><small>${esc(V.name)} · ${esc(V.who)}</small><b></b></span>${tap ? '<span class="rcA">›</span>' : ''}<span class="rcX" role="button" aria-label="Close the radio message">✕</span>`;   /* 3D.224 (owner, 19 Nov, W126): the card stays until it is tapped away: the ✕ closes it, a tap on the card opens the full words */
  const close = () => { clearTimeout(radioNext.t); clearTimeout(radioNext.ty); el.classList.remove('in', 'talk'); radioOn = null; setTimeout(() => { if (!radioOn) radioNext(); }, 350); };
  el.querySelector('.rcX').onclick = (e) => { e.stopPropagation(); close(); };
  el.onclick = (e) => { e.stopPropagation(); close(); showEventPopup({ title: `📻 ${(c.title || V.name).toUpperCase()}`, text: c.more ? `${esc(c.text)}<br><br>${c.more}` : esc(c.text), buttons: c.act ? [{ label: 'Show me', rec: true, fn: c.act }, { label: 'OK' }] : undefined }); };   /* 3D.228 (owner, 19 Nov, bug): a tap always shows the full message; a message that points somewhere (the morning tip, the trader, a guest) gets a Show me button instead of jumping there unread */
  requestAnimationFrame(() => el.classList.add('in')); SFX('radio');
  /* 3D.147 owner: the words come out in order, as if someone is talking, not all at once. Each line types out word by word, a breath between lines */
  const box = el.querySelector('.rcT b'), lines = c.lines && c.lines.length ? c.lines : [c.text], quiet = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const done = () => { el.classList.remove('talk'); };   /* 3D.224 (W126): no timer; the message stays until it is tapped away (it used to close itself after 3 to 9 s) */
  if (quiet) { box.innerHTML = lines.map((l) => `<span class="rcL">${esc(l)}</span>`).join(' '); done(); return; }
  el.classList.add('talk');   /* each word has its own due time; a slow frame shows the late ones together instead of stretching the speech */
  const toks = []; let at = 380; lines.forEach((l, li) => { if (li) at += 520; String(l).split(/(\s+)/).forEach((w) => { if (!w) return; toks.push({ li, w, at }); if (!/\s/.test(w)) at += 40 + w.length * 28 + (/[,:;]$/.test(w) ? 160 : /[.!?]$/.test(w) ? 260 : 0); }); });
  const spans = [], t0 = performance.now(); let k = 0;
  const step = () => { if (radioOn !== c) return; const now = performance.now() - t0;
    while (k < toks.length && toks[k].at <= now) { const q = toks[k++]; if (!spans[q.li]) { if (q.li) box.appendChild(document.createTextNode(' ')); spans[q.li] = box.appendChild(Object.assign(document.createElement('span'), { className: 'rcL' })); } spans[q.li].appendChild(document.createTextNode(q.w)); }
    if (k >= toks.length) { done(); return; } radioNext.ty = setTimeout(step, 45); };
  radioNext.ty = setTimeout(step, 45);   /* a moment of static first */
}
/* 3D.159 the UX study: the night ends with ONE morning card (walkers stopped, damage, who is hurt, who was lost or arrived)
   instead of scattered messages. Facts first, the joke last. */
const allIds = () => S.sv.map((q) => q.id).concat(S.trip ? S.trip.members.map((m) => m.id) : [], S.sh && S.sh.units ? S.sh.units.map((m) => m.id) : []);   /* 3D.161 a squad out on a trip still lives here */
function nightStart() { S.nightLog = { day: S.day, kills: S.kills || 0, dmg: 0, ids: allIds(), fallen: (S.fallen || []).length }; }
function morningCard() {
  const L = S.nightLog; S.nightLog = null; if (!L || S.cut || titleOn) return;
  const k = (S.kills || 0) - L.kills, lost = Math.max(0, (S.fallen || []).length - (L.fallen || 0));   /* 3D.161 play-test: squads coming home were counted as "Joined" and squads out as "Lost" */
  const joined = S.sv.filter((q) => !L.ids.includes(q.id)).map((q) => q.name), hurt = S.sv.filter((q) => q.hp < q.max * .6).map((q) => q.name);
  const dmgB = world.buildings.filter((b) => b.max && b.hp < b.max).length;
  const rows = [`🧟 Walkers stopped: ${k}`, `🏚 Buildings damaged: ${dmgB}${L.dmg ? ` (${L.dmg} damage)` : ''}`, `🩹 Hurt: ${hurt.length ? hurt.join(', ') : 'nobody'}`];
  if (lost) rows.push(`🕯 Lost: ${lost}`); if (joined.length) rows.push(`👋 Joined: ${joined.join(', ')}`);
  { const sad = S.sv.filter((q) => q.resident && (q.sat || 0) < 15).sort((a, b) => (a.sat || 0) - (b.sat || 0)); if (sad.length) rows.push(`💔 Unhappy: ${sad.slice(0, 2).map((q) => `${q.name} ${moodLine(q)}`).join('; ')}${sad.length > 2 ? ` and ${sad.length - 2} more` : ''}`); }   /* 3D.168 */
  const quip = lost ? 'We light a candle and get back to work.' : hurt.length ? 'Bandages first, breakfast second.' : dmgB ? 'Grab a hammer, the fence has opinions.' : k === 0 ? 'Quiet night. Suspiciously quiet. Enjoy it.' : 'Not a scratch. The coffee is still terrible.';   /* 3D.161 it said "Not a scratch" under a list of hurt people */
  showEventPopup({ title: `🌅 MORNING · DAY ${S.day}`, text: rows.map(esc).join('<br>') + `<br><br><i>${quip}</i>`, buttons: [{ label: 'Good morning' }] });
}
let radioLast = null;
/* 3D.349 (owner, 24 Nov, W270: "Yes on the radio. It will show up like an iPhone radio"): in the phone look a radio message no longer types out on
   a card. A slim "now playing" capsule shows who is on air (the station, the speaker, moving bars) while the message would be spoken, then goes;
   the radio button keeps a lime dot until it is heard. A tap on the capsule or the button opens the words. */
let radioUnread = null;
function radioOpen(c) {
  const V = RADIO_V[c.voice] || RADIO_V.dj; radioUnread = null; radioDot();
  showEventPopup({ title: `📻 ${(c.title || V.name).toUpperCase()}`, text: `<span class="rcWho">${esc(V.who)}</span>` + (c.more ? `${esc(c.text)}<br><br>${c.more}` : esc(c.text)), buttons: c.act ? [{ label: 'Show me', rec: true, fn: c.act }, { label: 'OK' }] : undefined });
}
function radioDot() { const b = $('radioBtn'); if (b) b.classList.toggle('unread', !!radioUnread); }
function radioLive(el, c, V) {
  el.className = 'radioCard rcLive v-' + c.voice; el.style.setProperty('--rc', V.col);
  el.innerHTML = `<span class="rcI">${window.ZHIcons ? ZHIcons.svg('radio', 22) : '📻'}</span><span class="rcT"><small>${esc(V.name)}</small><b>${esc(V.who)}</b></span><span class="rcEq"><i></i><i></i><i></i><i></i></span>`;
  const words = String(c.text).split(/\s+/).length, ms = Math.max(4000, Math.min(12000, 900 + words * 260));
  const close = (open) => { clearTimeout(radioNext.t); el.classList.remove('in', 'talk'); radioOn = null; if (!open) { radioUnread = c; radioDot(); } setTimeout(() => { if (!radioOn) radioNext(); }, 350); };
  el.onclick = (e) => { e.stopPropagation(); close(true); radioOpen(c); };
  requestAnimationFrame(() => el.classList.add('in', 'talk')); SFX('radio'); radioNext.t = setTimeout(() => { if (radioOn === c) close(false); }, ms);
}
const fightOn = () => S.z.some((z) => z.hp > 0 && !z.human && z.target && z.mode !== 'zleave');
function radioBtn() {   /* 3D.159 a small radio under the ⚠ button: plays the DJ's last message again */
  if (typeof document === 'undefined') return; const w = $('world'); if (!w || !radioLast) return; let b = $('radioBtn');
  if (!b) { b = document.createElement('button'); b.id = 'radioBtn'; b.className = 'alertBtn radioBtn'; b.title = 'Play the last radio message again'; b.innerHTML = `<span class="abI">${window.ZHIcons ? ZHIcons.svg('radio', 28) : '📻'}</span>`; w.appendChild(b);
    b.onclick = (e) => { e.stopPropagation(); if (phoneOn()) { const c = radioOn || radioUnread || radioLast; if (!c) return; if (radioOn) { clearTimeout(radioNext.t); const el = $('radioCard'); if (el) el.classList.remove('in', 'talk'); radioOn = null; } radioOpen(c); return; } if (radioOn || !radioLast) return; radioQ.unshift({ ...radioLast, urgent: true, key: null }); radioNext(); }; }
  b.style.display = 'flex'; alertHub();
}
function radioHour() {   /* the morning show (08:00) and the sign-off at dusk (19:00) */
  if (S.hour === 8 && S.day > 1) { const t = OPTS.advisor && !S.introOff ? advisorTips()[0] : null; radio('dj', rLine('morning', { day: S.day }) + (t ? ` ${rLine('tip')} ${t.text.charAt(0).toLowerCase() + t.text.slice(1)}.` : ''), { key: 'morning', act: t && t.act ? t.act : null }); }
  if (S.hour === 19) radio('dj', rLine('dusk'), { key: 'dusk' });
}
/* 3D.159 owner (UI check: the radio, the speech line and the top notifications overlapped): two layers that stack their messages instead of
   each one sitting at its own fixed spot. nTop hangs under the Mission / Day row (the small news, newest on top, two at a time);
   nBot sits on the tab bar (the radio card, then the speech line and the requests above it), so they push each other up and never overlap. */
function cardOpen() { try { return modalOpen && !($('eventModal') || {}).classList?.contains('live'); } catch (e) { return false; } }
function nStack(id) {
  if (typeof document === 'undefined') return null; let e = $(id); if (e) return e; const w = $('world'), fx = $('fx'); if (!w || !fx) return null;
  e = document.createElement('div'); e.id = id; e.className = 'nStack';
  if (id === 'nTop') fx.appendChild(e); else { w.appendChild(e); for (const k of ['requestBox', 'say']) { const c = $(k); if (c) e.appendChild(c); } }
  return e;
}
function say(t, log = false) { nStack('nBot'); if (log) logEvent(t, 'important'); const e = $('say'); e.textContent = t; e.style.opacity = 1; clearTimeout(say.t); say.t = setTimeout(() => (e.style.opacity = 0), 1700); }
function screenToast(t, log) { note('important', t, log ? { log } : {}); }
function renownGain(n, why = '') { if (!isFinite(n)) n = 0; if (!isFinite(S.ren)) S.ren = 0; S.ren += n; const el = $('ren'); if (el) { el.parentElement.classList.remove('renFlash'); void el.offsetWidth; el.parentElement.classList.add('renFlash'); } note(n >= 5 ? 'important' : 'routine', `★ RENOWN +${n}${why ? ' · ' + why : ''}`); ui(); }   /* V2.34: small gains only flash the Renown wheel and go to the log */
