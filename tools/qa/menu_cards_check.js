// tools/qa/menu_cards_check.js [sizes] — 3D.220 (owner's rule of 16 Nov, U22 and U23): the move-in card and the radio card don't float over an open menu.
// At six phone sizes, with a move-in card ("Wants to stay for good") and a radio message on screen, opens Build, People, Town and a survivor's
// details and checks that neither card can be seen. Then, at the first size, opens a menu while a radio message is still typing, waits
// longer than the message would have lasted, closes the menu and checks the move-in card is back unchanged and the radio message plays
// in full (it is held, not lost). Exit 0 ok, 1 a check failed, 2 the cards could not be made.
// Second argument 'nohold' skips the held-message part. The browser page sometimes closes by itself after about five menus in a row
// (seen on 3D.219 too, so not this change); tools/qa/menu_cards_check.sh runs one size per browser.
const Q = require('./lib');
const SIZES = (process.argv[2] || 'phone:390x844,phoneS:360x640,phoneM:375x667,phoneXL:430x932,phoneN:320x568,phoneT:412x915').split(',').map((s) => { const [n, d] = s.split(':'); const [w, h] = d.split('x'); return [n, +w, +h]; });
const MSG = 'Test, test. This is Dusk Radio checking the board, and the last word is pumpkin.';
(async () => { const b = await Q.launch(); const p = await Q.page(b, { expose: 'radio, queueResidentRequest' }); p.on('crash', () => console.log('PAGE CRASHED')); p.on('close', () => console.log('PAGE CLOSED')); p.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text().slice(0, 160)); }); await Q.newGame(p); await Q.clearCards(p); let bad = 0;
  const seen = () => p.evaluate(() => { const vis = (e) => { if (!e) return false; const cs = getComputedStyle(e), r = e.getBoundingClientRect(); if (r.width < 3 || r.height < 3 || cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < .2) return false; const h = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 20)); return !!h && (h === e || e.contains(h)); };
    const rq = document.getElementById('requestBox'), rc = document.getElementById('radioCard'); return { req: vis(rq) && !!rq.innerHTML, reqText: rq ? rq.textContent : '', radio: vis(rc) && rc.classList.contains('in'), radioText: rc ? rc.textContent : '' }; });
  const closeMenu = () => p.evaluate(() => { const x = document.getElementById('closeInfo'); if (document.getElementById('infoPanel').classList.contains('show') && x) x.click(); });
  const openMenu = (m) => p.evaluate((m) => { const $ = (i) => document.getElementById(i); if (m === 'person') { $('mSurv').click(); const row = document.querySelector('#ib .card'); if (row) row.click(); } else $({ town: 'mTown', build: 'mBuild', people: 'mSurv' }[m]).click(); return $('infoPanel').classList.contains('show'); }, m);
  const setup = async () => { await p.evaluate((msg) => { const S = ZH.S; if (!S.requests.length) ZH.queueResidentRequest(S.sv[1] || S.sv[0]); ZH.radio('dj', msg); }, MSG); let r; for (let i = 0; i < 40; i++) { await p.waitForTimeout(400); r = await seen(); if (r.req && r.radio) break; } return r; };   /* the game's own radio lines may be ahead in the queue */
  const s0 = await setup(); if (!s0.req || !s0.radio) { console.log('could not show both cards before opening a menu:', JSON.stringify(s0)); await b.close(); process.exit(2); }
  for (const [nm, w, h] of SIZES) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(500);
    for (const m of ['build', 'people', 'town', 'person']) { await closeMenu(); await p.waitForTimeout(300); await setup();
      if (!(await openMenu(m))) { console.log(`STUCK ${nm} ${m}`); bad++; continue; } await p.waitForTimeout(400); const r = await seen(), out = [];
      if (r.req) out.push('the move-in card shows over the menu'); if (r.radio) out.push('the radio card shows over the menu'); if (out.length) bad++;
      console.log(`${out.length ? 'FAIL' : 'PASS'} ${nm} ${w}x${h} ${m}${out.length ? ': ' + out.join('; ') : ''}`); } }
  if (process.argv[3] === 'nohold') { await b.close(); process.exit(bad ? 1 : 0); }
  await closeMenu(); await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(12000);   /* let any message finish */
  const before = (await seen()).reqText; await p.evaluate((msg) => ZH.radio('dj', msg + ' Again.'), MSG); await p.waitForTimeout(900); await openMenu('build'); await p.waitForTimeout(11000);   /* longer than the message would have lasted (at most 9 s after typing) */
  await closeMenu(); let full = false; for (let i = 0; i < 60 && !full; i++) { await p.waitForTimeout(500); await Q.clearCards(p);   /* a field note (a new zombie) may open: the radio rightly waits for it, as since 3D.159 */ const r = await seen(); full = r.radio && /pumpkin\. Again\./.test(r.radioText); }
  const after = await seen(), out = []; if (!after.req || after.reqText !== before) out.push('the move-in card did not come back unchanged'); if (!full) out.push('the radio message held during the menu did not play in full after it closed');
  if (out.length) bad++; console.log(`${out.length ? 'FAIL' : 'PASS'} after closing the menu: ${out.length ? out.join('; ') : 'move-in card back unchanged, radio message played in full'}`);
  if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad ? 1 : 0); })();
