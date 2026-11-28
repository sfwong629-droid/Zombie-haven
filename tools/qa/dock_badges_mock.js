// tools/qa/dock_badges_mock.js — UI chat, 28 Nov (owner: "Do it one at a time, many mock up for approval"): idea 1, red badges on the dock.
// Mockup only, drawn on the real game. People: hurt or down; Explore: a squad home or a new lead; Town: the level-up ready; Build: jobs waiting
// for materials; More: unread messages and new Memories.
// A: the phone's red count badge on every icon; B: a red dot only, no numbers; C: counts, coloured by urgency (red now, amber can wait);
// D: like A, and the icon with a red badge gently bounces once. Pictures: runs/ui_samples/badge_<A..D>.png, badge_sheet.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
const SETS = {
  A: { mSurv: ['2', 'r'], mExp: ['1', 'r'], mTown: ['1', 'r'], mBuild: ['3', 'r'], mGuide: ['4', 'r'] },
  B: { mSurv: ['', 'r'], mExp: ['', 'r'], mTown: ['', 'r'], mBuild: ['', 'r'], mGuide: ['', 'r'] },
  C: { mSurv: ['2', 'r'], mExp: ['1', 'a'], mTown: ['1', 'a'], mBuild: ['3', 'a'], mGuide: ['4', 'a'] },
  D: { mSurv: ['2', 'r'], mExp: ['1', 'r'], mTown: ['1', 'r'], mBuild: ['3', 'r'], mGuide: ['4', 'r'] } };
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, look: '' }); await Q.newGame(p);
  for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(150); }
  await p.addStyleTag({ content: `.mkB{position:absolute;top:-7px;right:-7px;min-width:22px;height:22px;padding:0 6px;box-sizing:border-box;border-radius:11px;background:#ff3b30;color:#fff;font:800 13px/22px Manrope,system-ui,sans-serif;text-align:center;box-shadow:0 0 0 2px rgba(20,22,26,.85);z-index:3}
    .mkB.dot{min-width:13px!important;width:13px!important;height:13px!important;max-height:13px!important;padding:0;top:-4px;right:-4px;inset:auto -4px auto auto}.mkB.a{background:#ff9f0a;color:#2a1a00}
    .mkJ{animation:mkJ 1.2s ease-out 1}@keyframes mkJ{0%{transform:none}15%{transform:translateY(-9px)}30%{transform:none}42%{transform:translateY(-4px)}55%,100%{transform:none}}` });
  const shots = {};
  for (const [k, set] of Object.entries(SETS)) {
    await p.evaluate(([set, k]) => { document.querySelectorAll('.mkB').forEach((x) => x.remove()); document.querySelectorAll('.mkJ').forEach((x) => { x.classList.remove('mkJ'); x.style.transform = ''; });
      for (const [id, [n, c]] of Object.entries(set)) { const d = document.querySelector('#' + id + ' .dkI'); if (!d) continue; d.style.overflow = 'visible'; d.insertAdjacentHTML('beforeend', `<i class="mkB ${c}${n ? '' : ' dot'}">${n}</i>`); }
      if (k === 'D') { const d = document.querySelector('#mSurv .dkI'); d.style.transform = 'translateY(-8px)'; } }, [set, k]);
    await p.waitForTimeout(300); const f = path.join(out, `badge_${k}.png`); await p.screenshot({ path: f }); shots[k] = f; }
  await b.close(); console.log('ok');
})();
