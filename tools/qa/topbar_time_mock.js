// tools/qa/topbar_time_mock.js — UI chat, 25 Nov (W249; owner: "does it make more sense to have the day and time on the top bar like a phone").
// Mockups on the real town screen, for the picture only: today (the clock in its own capsule under the bar, right); B the time large at the left
// end of the top bar and the day under it, like a phone's status bar, the resources to its right; C the time in the middle of the top bar, the
// resources either side. Pictures: runs/ui_samples/topbar_<now|B|C>_<size>.png, topbar_sheet.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
const css = `
html.glass.phone #plaque .res .tm { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; line-height: 1; padding: 0 6px 0 2px; margin-right: 2px; border-right: 1px solid rgba(255,255,255,.25); }
html.glass.phone #plaque .res .tm b { font: 800 17px Manrope, system-ui, sans-serif; color: #fff; letter-spacing: -.3px; } html.glass.phone #plaque .res .tm small { font: 700 10px Manrope, system-ui, sans-serif; color: rgba(255,255,255,.78); margin-top: 2px; display: flex; align-items: center; gap: 3px; }
html.glass.phone #plaque .res .tm small svg { width: 11px; height: 11px; }
html.glass.phone.tmC #plaque .res .tm { align-items: center; border-right: 1px solid rgba(255,255,255,.25); border-left: 1px solid rgba(255,255,255,.25); padding: 0 8px; margin: 0 2px; }
html.glass.phone.tmMock #quest b#clock { display: none !important; }
html.glass.phone.tmMock #gauge { margin-top: var(--tmUp, 0px); }
`;
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568]]) {
    const p = await Q.page(b, { w, h, look: '' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(1500);
    for (let i = 0; i < 8; i++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(300); }
    await p.screenshot({ path: path.join(out, `topbar_now_${n}.png`) });
    for (const k of ['B', 'C']) {
      await p.evaluate(([css, k]) => { let s = document.getElementById('tmMock'); if (!s) { s = document.createElement('style'); s.id = 'tmMock'; s.textContent = css; document.head.appendChild(s); }
        const H = document.documentElement; if (!H.classList.contains('tmMock')) { const g = document.getElementById('gauge').getBoundingClientRect(), q = document.getElementById('quest').getBoundingClientRect(); H.style.setProperty('--tmUp', Math.round(q.top - g.top + (q.height - g.height) / 2) + 'px'); } H.classList.add('tmMock'); H.classList.toggle('tmC', k === 'C');
        const res = document.querySelector('#plaque .res'), old = res.querySelector('.tm'); if (old) old.remove();
        const ck = document.getElementById('clock'), m = ck.textContent.match(/DAY\s*(\d+)\s*·\s*(\d+:\d+)/), ic = ck.querySelector('svg') ? ck.querySelector('svg').outerHTML : '';
        const t = document.createElement('span'); t.className = 'tm'; t.innerHTML = `<b>${m ? m[2] : '08:00'}</b><small>${ic}Day ${m ? m[1] : 1}</small>`;
        const spans = [...res.children].filter((e) => e.tagName === 'SPAN' && e.style.display !== 'none' && !e.classList.contains('bagChip') && !e.classList.contains('tm'));
        if (k === 'B') res.insertBefore(t, res.firstChild); else res.insertBefore(t, spans[2]); }, [css, k]);
      await p.waitForTimeout(400); await p.screenshot({ path: path.join(out, `topbar_${k}_${n}.png`) }); }
    await p.close(); }
  await b.close(); })();
