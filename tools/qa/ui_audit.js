// tools/qa/ui_audit.js [days] [outDir] — UI usability audit (UI chat, 21 Nov 2026; owner: "something that doesn't click properly, any overlap").
// The balance bot plays a town for [days] game days (default 6); then every screen is opened on three phone sizes (390x844, 360x640, 320x568)
// and every visible tappable thing (buttons, links, inputs, [onclick], [role=button], anything with a click/touch listener) is checked:
//   COVERED   the middle of it is under something else, so a tap lands on the other thing (says what covers it)
//   NOTAP     it is drawn but does not take taps (pointer-events off on it or a parent)
//   SMALL     its tap area (found by trying taps round it, so an invisible bigger tap area counts) is under 44 px wide or tall (04-UI.md)
//   OFFSCREEN part of it is outside the screen
//   CLIPPED   part of it is cut off by a box it sits in (not counting boxes that scroll up and down)
//   OVERLAP   two tappable things overlap each other
//   TEXTCUT   its words do not fit and are cut off
//   NOHANDLER a <button> with no tap handler on it or on any box round it (inside the page; may be a false alarm)
// Writes <outDir>/report.md, report.json and a picture per screen and size with each problem boxed in red.
// Serve the repo first:  python3 -m http.server 8765   (from the repo root). About 6 minutes.
const Q = require('./lib'); const fs = require('fs'), path = require('path');
const DAYS = +(process.argv[2] || 6), OUT = process.argv[3] || 'ui_audit';
const AP = fs.readFileSync(path.join(__dirname, '../balance/ap.js'), 'utf8');
const SIZES = [[390, 844], [360, 640], [320, 568]];
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const MARK = `(() => { const ae = EventTarget.prototype.addEventListener; EventTarget.prototype.addEventListener = function (t, f, o) { if (/^(click|pointerdown|pointerup|touchstart|touchend|mousedown|mouseup)$/.test(t) && this && this.nodeType === 1) this.__tap = 1; return ae.call(this, t, f, o); }; })();`;

function audit() {   /* runs in the page */
  const VW = innerWidth, VH = innerHeight, out = [];
  const name = (e) => { if (!e || !e.tagName) return String(e); let s = e.tagName.toLowerCase(); if (e.id) s += '#' + e.id; const c = (typeof e.className === 'string' ? e.className : '').trim().split(/\s+/).filter(Boolean).slice(0, 2); if (c.length) s += '.' + c.join('.'); const t = (e.innerText || e.value || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 28); return t ? `${s} "${t}"` : s; };
  const shown = (e) => { for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false; } const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const tappable = (e) => e.matches('button, a[href], input:not([type=hidden]), select, textarea, [role=button], [onclick]') || e.onclick || e.__tap;
  const inPage = (e) => e !== document.body && e !== document.documentElement && e.tagName !== 'CANVAS';
  let els = [...document.querySelectorAll('body *')].filter((e) => inPage(e) && tappable(e) && shown(e));
  els = els.filter((e) => !els.some((o) => o !== e && o.contains(e) && !e.matches('button, a[href], input, select, textarea')));   /* a tappable box inside a tappable box: keep the outer one unless the inner is a real control */
  const seen = new Set(), add = (kind, e, extra) => { const k = kind + '|' + name(e); if (seen.has(k)) return; seen.add(k); const r = e.getBoundingClientRect(); out.push({ kind, el: name(e), extra: extra || '', box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] }); };
  for (const e of els) {
    const r = e.getBoundingClientRect(), dis = e.disabled || e.getAttribute('aria-disabled') === 'true';
    if (r.right < 0 || r.bottom < 0 || r.left > VW || r.top > VH) continue;   /* scrolled away or parked off the screen: not on view */
    let vis = { l: Math.max(r.left, 0), t: Math.max(r.top, 0), r: Math.min(r.right, VW), b: Math.min(r.bottom, VH) };
    let scrolled = false;
    for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue; const ar = a.getBoundingClientRect();
      const cutX = r.left < ar.left - 1 || r.right > ar.right + 1, cutY = r.top < ar.top - 1 || r.bottom > ar.bottom + 1, scrollY = /auto|scroll/.test(cs.overflowY);
      if (cutY && scrollY) scrolled = true;
      if (cutX && !/auto|scroll/.test(cs.overflowX)) add('CLIPPED', e, `cut at the sides by ${name(a)}`);
      else if (cutY && !scrollY && !scrolled) add('CLIPPED', e, `cut at top or bottom by ${name(a)}`);
      vis = { l: Math.max(vis.l, ar.left), t: Math.max(vis.t, ar.top), r: Math.min(vis.r, ar.right), b: Math.min(vis.b, ar.bottom) }; }
    if (vis.r - vis.l < 2 || vis.b - vis.t < 2) continue;   /* scrolled out of its list */
    if (!scrolled && (r.left < -1 || r.top < -1 || r.right > VW + 1 || r.bottom > VH + 1)) add('OFFSCREEN', e, `${Math.round(r.left)},${Math.round(r.top)} to ${Math.round(r.right)},${Math.round(r.bottom)} on a ${VW}x${VH} screen`);
    const cx = (vis.l + vis.r) / 2, cy = (vis.t + vis.b) / 2, hit = document.elementFromPoint(cx, cy);
    const mine = (x, y) => { const h = document.elementFromPoint(x, y); for (let a = h; a; a = a.parentElement) { if (a === e) return true; if (a.onclick || a.__tap) return false; } return false; };   /* a tap here reaches this control (its own box, a bigger invisible tap area, or a row that does the same) */
    const run = (dx, dy) => { let n = 0; for (let k = 1; k <= 40; k++) if (mine(cx + dx * k, cy + dy * k)) n = k; else break; return n; };
    const whole = vis.b - vis.t >= r.height - 1 && vis.r - vis.l >= r.width - 1;   /* partly scrolled out of its list: its tap area there is cut by the list, not too small */
    if (!dis && whole && !(r.width >= 100 && r.height >= 100) && mine(cx, cy)) {   /* a big box (a list that takes taps) is not a small target, even where its rows take the taps */ const tw = run(-1, 0) + run(1, 0) + 1, th = run(0, -1) + run(0, 1) + 1; if (tw < 43.5 || th < 43.5) add('SMALL', e, `tap area ${tw}x${th} px (drawn ${Math.round(r.width)}x${Math.round(r.height)})`); }
    if (hit && hit !== e && !e.contains(hit) && !(hit.tagName === 'CANVAS' && hit.id === 'game')) {   /* under the game's own canvas: not drawn on top either, so nobody sees it */ if (hit.contains(e)) { if (getComputedStyle(e).pointerEvents === 'none' || !dis) add('NOTAP', e, `a tap in its middle goes to ${name(hit)}`); } else add('COVERED', e, `its middle is under ${name(hit)}`); }
    const cs = getComputedStyle(e); if ((e.scrollWidth > e.clientWidth + 2 && cs.overflowX !== 'visible') || (cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1)) add('TEXTCUT', e, `${e.scrollWidth} px of words in ${e.clientWidth} px`);
    if (e.tagName === 'BUTTON' && !dis && !e.onclick && !e.__tap && !(e.form && e.type === 'submit')) { let h = false; for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) if (a.onclick || a.__tap) { h = true; break; } if (!h) add('NOHANDLER', e, 'no tap handler found on it or its boxes'); }
  }
  const top = els.filter((e) => { const r = e.getBoundingClientRect(); if (r.bottom < 0 || r.top > VH) return false; const h = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2); return h && (h === e || e.contains(h)); });
  for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) { const a = top[i], b = top[j]; if (a.contains(b) || b.contains(a)) continue; const A = a.getBoundingClientRect(), B = b.getBoundingClientRect(); const w = Math.min(A.right, B.right) - Math.max(A.left, B.left), h = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top); if (w > 3 && h > 3) { const ox = Math.max(A.left, B.left) + w / 2, oy = Math.max(A.top, B.top) + h / 2, hh = document.elementFromPoint(ox, oy), sm = A.width * A.height < B.width * B.height ? a : b; if (hh && (hh === sm || sm.contains(hh))) continue;   /* the smaller control is the one on top where they meet: its whole box takes taps */ add('OVERLAP', a, `overlaps ${name(b)} by ${Math.round(w)}x${Math.round(h)} px`); } }
  return out;
}

module.exports = { audit, MARK };
if (require.main === module) (async () => { fs.mkdirSync(OUT, { recursive: true }); const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'showInventory, showInvItem, radio, showSettings, showMore' });
  await p.addInitScript(MARK);
  await Q.newGame(p); await Q.clearCards(p);
  await p.evaluate(() => { window._pop = ZH.showEventPopup; ZH.showEventPopup = () => {}; }); await p.evaluate(AP);
  for (let d = 0; d < DAYS; d++) log(JSON.stringify(await p.evaluate(() => { for (let h = 0; h < 24; h++) { for (let k = 0; k < 1000; k += 60) { ZH.step(60); ZH.tripUpdate(); AP.tick(); } AP.hour(); } return { day: ZH.S.day, people: ZH.S.sv.length, buildings: ZH.world.buildings.length }; })));
  await p.evaluate(() => { ZH.showEventPopup = window._pop; let n = 0; while (!(ZH.S.hour >= 9 && ZH.S.hour < 10) && n < 30000) { ZH.step(60); n += 60; } ZH.S.z.length = 0; });
  await p.waitForTimeout(4000); await Q.clearCards(p); await p.waitForTimeout(1500);
  const close = async () => { await p.evaluate(() => { try { ZH.closeP(); } catch (e) { /* none */ } const x = document.querySelector('#alertPop .apX'); if (x) x.click(); document.querySelectorAll('#eventModal .evX').forEach((x) => x.click()); }); await p.waitForTimeout(500); await Q.clearCards(p); };
  const tabSel = '#ib .tabs button, #ib [data-tab], #ib .tab';
  const SCREENS = [
    ['main_view', async () => {}],
    ['people', async () => p.evaluate(() => ZH.showSurvivors())],
    ...[0, 1, 2, 3].map((i) => [`survivor_tab${i + 1}`, async () => { await p.evaluate(() => ZH.unitPanel(ZH.S.sv[0])); await p.waitForTimeout(300); await p.evaluate(([s, j]) => { const t = document.querySelectorAll(s)[j]; if (t) t.click(); }, [tabSel, i]); }]),
    ...[0, 1, 2, 3].map((i) => [`town_tab${i + 1}`, async () => { await p.evaluate(() => ZH.showTown()); await p.waitForTimeout(300); await p.evaluate(([s, j]) => { const t = document.querySelectorAll(s)[j]; if (t) t.click(); }, [tabSel, i]); }]),
    ['upgrade_town', async () => p.evaluate(() => ZH.showUpgrade())],
    ...[0, 1, 2, 3].map((i) => [`build_tab${i + 1}`, async () => { await p.evaluate(() => ZH.showBuild()); await p.waitForTimeout(300); await p.evaluate(([s, j]) => { const t = document.querySelectorAll(s)[j]; if (t) t.click(); }, [tabSel, i]); }]),
    ['building_info', async () => p.evaluate(() => { const B = ZH.world.buildings; ZH.showBuildingInfo(B.find((x) => x.type !== 'camp') || B[0]); })],
    ['explore', async () => p.evaluate(() => ZH.showExpedition())],
    ['needs_you', async () => p.evaluate(() => { const a = document.getElementById('alertBtn'); if (a) a.click(); })],
    ['event_log', async () => p.evaluate(() => document.getElementById('btnLog').click())],
    ['inventory_gear', async () => p.evaluate(() => ZH.showInventory('gear'))],
    ['inventory_supplies', async () => p.evaluate(() => ZH.showInventory('sup'))],
    ['inventory_item', async () => p.evaluate(() => { const t = document.querySelector('.invT:not(.empty)'); if (t) t.click(); else { ZH.showInventory('gear'); setTimeout(() => { const u = document.querySelector('.invT:not(.empty)'); if (u) u.click(); }, 200); } })],
    ['more', async () => p.evaluate(() => ZH.showMore())],
    ['settings', async () => p.evaluate(() => ZH.showSettings())],
    ['radio_card', async () => p.evaluate(() => ZH.radio('dj', 'Test message from the audit: a long enough line to fill the card and see whether anything overlaps the close button.'))],
    ['choice_card', async () => p.evaluate(() => ZH.showEventPopup({ x: true, title: '🚨 CAR ALARM', text: 'The dead are close to this wreck. Its alarm still works: set it off and up to 6 nearby zombies shamble over to it.', buttons: [{ label: '🚨 Set it off' }, { label: 'Mark for salvage' }] }))],
  ];
  const all = [];
  for (const [W, H] of SIZES) { await p.setViewportSize({ width: W, height: H }); await p.waitForTimeout(1200); await close();
    for (const [nm, open] of SCREENS) { try { await open(); await p.waitForTimeout(nm === 'radio_card' ? 2000 : 700); } catch (e) { log('could not open', nm, e.message.slice(0, 80)); continue; }
      const issues = await p.evaluate(audit); const tag = `${nm}_${W}x${H}`;
      if (issues.length) { await p.evaluate((iss) => { for (const [i, it] of iss.entries()) { const d = document.createElement('div'); d.className = '__aud'; Object.assign(d.style, { position: 'fixed', left: it.box[0] + 'px', top: it.box[1] + 'px', width: it.box[2] + 'px', height: it.box[3] + 'px', outline: '2px solid red', zIndex: 99999, pointerEvents: 'none', font: '700 10px sans-serif', color: '#fff', background: 'rgba(255,0,0,.12)' }); d.textContent = i + 1; document.body.appendChild(d); } }, issues);
        await Q.shot(p, path.join(OUT, tag + '.png')); await p.evaluate(() => document.querySelectorAll('.__aud').forEach((d) => d.remove())); }
      for (const [i, it] of issues.entries()) all.push({ screen: nm, size: `${W}x${H}`, n: i + 1, ...it });
      log(tag, issues.length, 'problems'); fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(all, null, 1)); await close(); } }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(all, null, 1));
  const by = {}; for (const it of all) { const k = it.kind + '|' + it.el + '|' + it.extra.replace(/\d+x\d+ px|\d+ px of words in \d+ px|-?\d+,-?\d+ to -?\d+,-?\d+ on a \d+x\d+ screen/g, '…'); (by[k] = by[k] || { kind: it.kind, el: it.el, extra: it.extra, where: [] }).where.push(`${it.screen} ${it.size} #${it.n}`); }
  const rows = Object.values(by).sort((a, c) => a.kind.localeCompare(c.kind) || c.where.length - a.where.length);
  fs.writeFileSync(path.join(OUT, 'report.md'), `# UI audit, ${new Date().toISOString().slice(0, 10)}, ${await p.evaluate(() => ZH.BUILD_TAG)}\n\n${all.length} findings, ${rows.length} different.\n\n| Kind | Element | Detail (first seen) | Where (screen, size, box number) |\n|---|---|---|---|\n` + rows.map((r) => `| ${r.kind} | ${r.el.replace(/\|/g, '/')} | ${r.extra.replace(/\|/g, '/')} | ${r.where.slice(0, 6).join('; ')}${r.where.length > 6 ? ` (+${r.where.length - 6})` : ''} |`).join('\n') + '\n');
  log('done:', all.length, 'findings,', rows.length, 'different; see', path.join(OUT, 'report.md')); if (p.errs.length) log('page errors:', p.errs.slice(0, 3)); await b.close(); })().catch((e) => { console.error(e); process.exit(1); });
