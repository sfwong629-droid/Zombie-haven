// tools/qa/menu_overlap_check.js [sizes] [tag] — 3D.195 (owner, 16 Nov, U13 and U14): nothing floats over an open menu.
// At six phone sizes, with the alert button and the radio button both on screen, opens Build, People, Town and a survivor's details and checks:
//   the radio button is hidden; the alert button is hidden whole where the menu reaches it, and shows where the menu is clear of it;
//   the "Paused" pill sits centred on the menu's top edge and does not touch the mission card;
//   the menu's first tab (or its close button) is what a tap in its middle hits.
// Optional: a tag to save pictures as <tag>_<size>_<menu>.png. Exit 0 ok, 1 a check failed, 2 a menu could not be opened.
const Q = require('./lib');
const SIZES = (process.argv[2] || 'phone:390x844,phoneS:360x640,phoneM:375x667,phoneXL:430x932,phoneN:320x568,phoneT:412x915').split(',').map((s) => { const [n, d] = s.split(':'); const [w, h] = d.split('x'); return [n, +w, +h]; });
const TAG = process.argv[3] || '';
(async () => { const b = await Q.launch(); const p = await Q.page(b, { expose: 'radio, alertHub, radioBtn' }); await Q.newGame(p); await Q.clearCards(p); let bad = 0, stuck = 0;
  await p.evaluate(() => { const S = ZH.S; S.stage = 3; S.rankReady = true; S.mat = 0; S.wood = 0; ZH.radio('dj', 'Test, test. This is Dusk Radio.'); });
  await p.waitForTimeout(6000); await Q.clearCards(p).catch(() => {});
  for (const [nm, w, h] of SIZES) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(1200);
    for (const m of ['build', 'people', 'town', 'person']) {
      await p.evaluate(() => { const x = document.getElementById('closeInfo'); if (document.getElementById('infoPanel').classList.contains('show') && x) x.click(); const e = document.getElementById('eventModal'); if (e) e.style.display = 'none'; ZH.alertHub(); if (ZH.radioBtn) ZH.radioBtn(); }); await p.waitForTimeout(300);
      const opened = await p.evaluate((m) => { const $ = (i) => document.getElementById(i); try { if (m === 'person') { $('mSurv').click(); const row = document.querySelector('#ib .card'); if (row) row.click(); } else $({ build: 'mBuild', people: 'mSurv', town: 'mTown' }[m]).click(); } catch (e) { return 'ERR ' + e.message; } return $('infoPanel').classList.contains('show') ? $('it').textContent : null; }, m);
      await p.waitForTimeout(500);
      const r = await p.evaluate(() => { const $ = (i) => document.getElementById(i), vis = (e) => { if (!e) return false; const cs = getComputedStyle(e), b = e.getBoundingClientRect(); return b.width > 2 && b.height > 2 && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > .2; };
        const P = $('infoPanel').getBoundingClientRect(), A = $('alertBtn'), R = $('radioBtn'), C = $('pausedChip'), q = $('qt') || $('quest'), out = [];
        const top = (x, y) => document.elementFromPoint(x, y), inside = (e, root) => !!e && (e === root || root.contains(e));
        if (vis(R)) { const rb = R.getBoundingClientRect(); if (inside(top(rb.left + rb.width / 2, rb.top + rb.height / 2), R)) out.push('the radio button is showing'); }
        let meets = null; if (A && getComputedStyle(A).display !== 'none') { const ab = A.getBoundingClientRect(); meets = ab.bottom > P.top + 1 && ab.top < P.bottom && ab.right > P.left && ab.left < P.right; if (meets && vis(A)) out.push('the alert button shows where the menu reaches it'); if (!meets && !vis(A)) out.push('the alert button is hidden though the menu is clear of it'); }
        const ps = getComputedStyle($('infoPanel'), '::after'), pw = parseFloat(ps.width) + parseFloat(ps.paddingLeft) + parseFloat(ps.paddingRight) + 2, ph = parseFloat(ps.height) + parseFloat(ps.paddingTop) + parseFloat(ps.paddingBottom) + 2;
        if (vis(C)) out.push('the old Paused pill is still showing'); if (!/PAUSED/.test(ps.content) || !(pw > 20)) out.push('no Paused pill on the menu');
        else { if (ps.top !== '0px' || !/-50% -50%/.test(ps.translate) || Math.abs(parseFloat(ps.left) - P.width / 2) > 2) out.push('the Paused pill is not centred on the menu\'s top edge');
          const cb = { left: P.left + P.width / 2 - pw / 2, right: P.left + P.width / 2 + pw / 2, top: P.top - ph / 2, bottom: P.top + ph / 2 };
          for (const [nm, e] of [['mission card', $('qt')], ['clock', $('clock')], ['renown', $('gauge')], ['alert button', A], ['close button', $('closeInfo')]]) if (e && vis(e)) { const qb = e.getBoundingClientRect(), ox = Math.min(cb.right, qb.right) - Math.max(cb.left, qb.left), oy = Math.min(cb.bottom, qb.bottom) - Math.max(cb.top, qb.top); if (ox > 1 && oy > 1) out.push('the Paused pill covers the ' + nm + ' by ' + Math.round(ox) + 'x' + Math.round(oy)); } }
        const first = document.querySelector('#ib button') || $('closeInfo'); if (first && vis(first)) { const fb = first.getBoundingClientRect(); if (fb.top < innerHeight && !inside(top(fb.left + fb.width / 2, fb.top + fb.height / 2), first)) out.push('something covers the menu\'s first button (' + first.textContent.trim().slice(0, 12) + ')'); }
        return { out, alert: meets === null ? 'none' : meets ? 'covered' : 'clear', radio: !!R }; });
      if (!opened || /^ERR/.test(opened)) { stuck++; console.log(`STUCK ${nm} ${m}: ${opened}`); continue; }
      if (r.out.length) bad++; console.log(`${r.out.length ? 'FAIL' : 'PASS'} ${nm} ${w}x${h} ${m} ("${opened}") alert:${r.alert} radioBtn:${r.radio}${r.out.length ? '\n   ' + r.out.join('; ') : ''}`);
      if (TAG) await Q.shot(p, `${TAG}_${nm}_${m}.png`); } }
  if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad ? 1 : stuck ? 2 : 0); })();
