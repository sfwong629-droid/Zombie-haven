// tools/qa/less_reading_mock.js [outDir] — UI chat, 24 Nov 2026 (W270). Before / after pictures for the less-reading session, drawn on the real game
// (phone look, 390x844, a town the balance bot played for 4 days). "After" is a mockup made by changing the page for the picture only; nothing in
// the game is changed. Each pair is measured the same way as tools/qa/reading_audit.js (places with words, sentences, words in view).
const Q = require('./lib'); const fs = require('fs'), path = require('path'); const { measure } = require('./reading_audit');
const OUT = process.argv[2] || 'runs/reading_audit'; const AP = fs.readFileSync(path.join(__dirname, '../balance/ap.js'), 'utf8');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, look: '', expose: 'showSurvivors,showTown,showUpgrade,radio,floats,doneFx' });
  await Q.newGame(p); await Q.clearCards(p); await p.evaluate(() => { window._pop = ZH.showEventPopup; ZH.showEventPopup = () => {}; }); await p.evaluate(AP);
  for (let d = 0; d < 4; d++) await p.evaluate(() => { for (let h = 0; h < 24; h++) { for (let k = 0; k < 1000; k += 60) { ZH.step(60); ZH.tripUpdate(); AP.tick(); } AP.hour(); } });
  await p.evaluate(() => { ZH.showEventPopup = window._pop; let n = 0; while (!(ZH.S.hour >= 10 && ZH.S.hour < 11) && n < 30000) { ZH.step(60); n += 60; } ZH.S.z.length = 0; }); await p.waitForTimeout(3000); await Q.clearCards(p);
  const R = []; const shot = async (nm) => { await p.waitForTimeout(500); const m = await p.evaluate(measure); await p.screenshot({ path: path.join(OUT, `less_${nm}.png`) }); R.push({ nm, spots: m.spots, sentences: m.sentences, words: m.words }); console.log(nm, m.spots, m.sentences, m.words); };
  const close = async () => { await p.evaluate(() => { try { ZH.closeP(); } catch (e) { /* none */ } const x = document.querySelector('#alertPop .apX'); if (x) x.click(); }); await p.waitForTimeout(400); await Q.clearCards(p); };
  /* A. the play screen: words drawn over the town, and the radio card */
  await p.evaluate(() => { ZH.radio('dj', 'Moth here. The Toll Kings raised the bridge toll again. Bring snacks, not scrap.'); ZH.floats.push({ w: { x: 30, y: 30 }, t: 'COMBO!', col: '#C6FF4D', a: 400, big: true }); }); await p.waitForTimeout(1800); await shot('A_before');
  await p.evaluate(() => { const keep = ZH.floats.filter((f) => !/[A-Za-z]/.test(f.t)); ZH.floats.length = 0; ZH.floats.push(...keep); ZH.doneFx.forEach((e) => { e.label = '✓'; });
    const c = document.getElementById('radioCard'); if (c) c.style.display = 'none'; const rb = document.getElementById('radioBtn'); if (rb) { const d = document.createElement('i'); Object.assign(d.style, { position: 'absolute', right: '2px', top: '2px', width: '12px', height: '12px', borderRadius: '50%', background: '#c6ff4d', boxShadow: '0 0 0 2px rgba(0,0,0,.5)' }); rb.style.position = rb.style.position || 'absolute'; rb.appendChild(d); } });
  await shot('A_after'); await close(); await p.evaluate(() => { const c = document.getElementById('radioCard'); if (c) c.style.display = ''; });
  /* B. Needs you: the same advice once, short titles */
  await p.evaluate(() => { const a = document.getElementById('alertBtn'); if (a) a.click(); }); await shot('B_before');
  await p.evaluate(() => { const rows = [...document.querySelectorAll('#alertPop .apRow')], t = (r) => r.querySelector('.apT'); const dup = rows.filter((r) => /has no .*profession/i.test(t(r).textContent));
    if (dup.length > 1) { t(dup[0]).textContent = `${dup.length} jobs need a worker`; dup.slice(1).forEach((r) => r.remove()); }
    const SHORT = [[/^The Haven can reach the next level.*/i, 'Ready to level up'], [/^(.*) has no (\w+): change someone's profession/i, '$1: no $2'], [/^Out of (\w+)\b.*/i, 'Out of $1'], [/^(\w+) runs out in about (.*)/i, '$1 gone in $2'], [/^Your wall ring has (\d+) gaps?/i, '$1 gaps in the wall'], [/^No backup this week.*/i, 'No backup this week']];
    for (const r of document.querySelectorAll('#alertPop .apRow')) { const e = t(r); let x = e.textContent; for (const [re, to] of SHORT) x = x.replace(re, to); e.textContent = x; }
    const c = document.getElementById('radioCard'); if (c) c.style.display = 'none'; });
  await shot('B_after'); await close();
  /* C. People: one line per person (the group already says what they are doing) */
  await p.evaluate(() => ZH.showSurvivors()); await shot('C_before');
  await p.evaluate(() => document.querySelectorAll('#ib .phRow .phTx small').forEach((s) => { s.textContent = s.textContent.split(' · ')[0]; })); await shot('C_after'); await close();
  /* D. Town, Defense: how-it-works paragraphs become one row that opens them */
  await p.evaluate(() => ZH.showTown()); await p.waitForTimeout(300); await p.evaluate(() => { const t = document.querySelectorAll('#ib [data-tab]')[1]; if (t) t.click(); }); await shot('D_before');
  await p.evaluate(() => { const ib = document.getElementById('ib'); ib.querySelectorAll('*').forEach((e) => { if (!e.children.length && /: an open tile/.test(e.textContent)) e.remove(); }); for (const e of [...ib.querySelectorAll('*')]) { if (e.children.length || e.closest('button')) continue; const w = e.textContent.trim().split(/\s+/).length; if (w < 12) continue;
      const box = e.closest('.phR, p, .sm, div') || e; box.innerHTML = '<span style="flex:1;color:rgba(255,255,255,.75)">How it works</span><span style="opacity:.5">›</span>'; Object.assign(box.style, { display: 'flex', alignItems: 'center', minHeight: '44px', padding: '0 14px', fontSize: '15px' }); } });
  await shot('D_after'); await close();
  /* E. Events: the joke goes to the event's own page; the row keeps what you get and what it costs */
  await p.evaluate(() => ZH.showUpgrade('events')); await shot('E_before');
  await p.evaluate(() => { document.querySelectorAll('#ib .phEv .tx small:not(.m):not(.bad)').forEach((s) => s.remove()); const f = document.querySelector('#ib .phUp > .phFootN'); if (f) f.textContent = 'One a day'; }); await shot('E_after');
  fs.writeFileSync(path.join(OUT, 'less_mock.json'), JSON.stringify(R, null, 1)); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); })().catch((e) => { console.error(e); process.exit(1); });
