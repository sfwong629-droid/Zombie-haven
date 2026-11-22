// tools/qa/tap_size_check.js — 3D.268 (owner, 21 Nov, W202: "YES FIX all"; UI audit U46 to U50). The bot plays a town for 2 days, then
// on a 390x844 and a 320x568 phone: the main view (Renown chip), Needs you (close, Go, the tip's ✕), Settings (the switches),
// a survivor's Status (→ the Camp ›, Gather switch, stat icons) and People (the filters). Every control the UI audit finds there
// must take taps over at least 44x44 px (tried tap by tap round it, as tools/qa/ui_audit.js does). Also: tapping a setting's words
// flips its switch. Controls of the main view under an open menu are skipped (hidden on purpose). On 3D.267 it fails.
// Exit 0 ok, 1 a check failed.
const Q = require('./lib'), fs = require('fs'), path = require('path'), { audit, MARK } = require('./ui_audit');
const AP = fs.readFileSync(path.join(__dirname, '../balance/ap.js'), 'utf8');
const HUD = /#(mBuild|mExp|mSurv|mTown|mGuide|btnSpeed|btnCenter|alertBtn|radioBtn|btnLog|plaque|quest|closeInfo)\b/;
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'showSettings' }); await p.addInitScript(MARK);
  await Q.newGame(p); await Q.clearCards(p);
  await p.evaluate(() => { window._pop = ZH.showEventPopup; ZH.showEventPopup = () => {}; }); await p.evaluate(AP);
  await p.evaluate(() => { for (let d = 0; d < 2; d++) for (let h = 0; h < 24; h++) { for (let k = 0; k < 1000; k += 60) { ZH.step(60); ZH.tripUpdate(); AP.tick(); } AP.hour(); } ZH.showEventPopup = window._pop; let n = 0; while (!(ZH.S.hour >= 9 && ZH.S.hour < 10) && n < 30000) { ZH.step(60); n += 60; } ZH.S.z.length = 0; });
  await p.waitForTimeout(3000); await Q.clearCards(p);
  const close = async () => { await p.evaluate(() => { try { ZH.closeP(); } catch (e) { /* none */ } const x = document.querySelector('#alertPop .apX'); if (x) x.click(); }); await p.waitForTimeout(400); await Q.clearCards(p); };
  const SCREENS = [['main view', async () => {}], ['Needs you', async () => p.evaluate(() => document.getElementById('alertBtn').click())], ['Settings', async () => p.evaluate(() => ZH.showSettings())],
    ['survivor Status', async () => p.evaluate(() => ZH.unitPanel(ZH.S.sv.find((u) => !u.child) || ZH.S.sv[0]))], ['People', async () => p.evaluate(() => ZH.showSurvivors())]];
  const bad = []; let seen = 0;
  for (const [W, H] of [[390, 844], [320, 568]]) { await p.setViewportSize({ width: W, height: H }); await p.waitForTimeout(800); await close();
    for (const [nm, open] of SCREENS) { await open(); await p.waitForTimeout(800);
      const iss = (await p.evaluate(audit)).filter((x) => x.kind === 'SMALL' && !(nm !== 'main view' && HUD.test(x.el)));
      const n = await p.evaluate(() => document.querySelectorAll('.apX, .apA, .apM, .tgl, #uDest, [data-si], .pfSort, #gauge').length); seen += n;
      console.log(`${nm} ${W}x${H}: ${n} of the controls in question on view; ${iss.length} too small`); for (const x of iss) bad.push(`${nm} ${W}x${H}: ${x.el} ${x.extra}`);
      if (nm === 'Settings' && W === 390) { const r = await p.evaluate(() => { const row = [...document.querySelectorAll('.setRow')].find((x) => x.querySelector('#stAdv')); const t = row.querySelector('.moT'), was = row.querySelector('.tgl').classList.contains('on'); t.click(); const now = document.querySelector('#stAdv').classList.contains('on'); document.querySelector('#stAdv').click(); return { was, now }; });
        console.log('tap the words "Advisor tips":', JSON.stringify(r)); if (r.was === r.now) bad.push('tapping a setting\'s words did not flip its switch'); }
      await close(); } }
  if (seen < 20) bad.push(`only ${seen} of the controls in question were on view: the check did not reach them`);
  console.log(bad.length ? 'FAIL:\n  ' + bad.join('\n  ') : 'ok: every control on these screens takes taps over 44x44 px, and a setting\'s words flip its switch'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0); })();
