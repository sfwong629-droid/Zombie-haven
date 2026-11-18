// tools/qa/review_shots.js [days] [outDir] — screenshots for a ChatGPT screenshot review (07-TESTING.md, level 3). Added 18 Nov 2026 (ChatGPT chat).
// The balance bot (tools/balance/ap.js) plays a new town for [days] game days (default 6), then 20 phone screens (390x844) are saved as JPG:
//   main view by day and night, People (day and night), survivor details (4 tabs), the move-in card over People, Town (4 tabs), Upgrade Town,
//   Build, a building's info, Explore, Needs you, the event log and the Zombie test page.
// Why not the live artifact: in the desktop app's built-in browser the game frame goes blank whenever the page changes inside it
// (Start, Zombie test), so a town can't be reached there. This runs the repo's build, which is the published build at the same commit.
// Serve the repo first:  python3 -m http.server 8765   (from the repo root). About 3 minutes in the cloud.
// The town is the bot's, so it is usually short of water and people: tell the reviewer to judge the screens, not the town.
const Q = require('./lib'); const fs = require('fs'), path = require('path');
const DAYS = +(process.argv[2] || 6), OUT = process.argv[3] || 'review_shots';
const AP = fs.readFileSync(path.join(__dirname, '../balance/ap.js'), 'utf8');
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
(async () => { fs.mkdirSync(OUT, { recursive: true }); const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 });
  await Q.newGame(p); await Q.clearCards(p);
  await p.evaluate(() => { window._pop = ZH.showEventPopup; ZH.showEventPopup = () => {}; }); await p.evaluate(AP);
  for (let d = 0; d < DAYS; d++) log(JSON.stringify(await p.evaluate(() => { for (let h = 0; h < 24; h++) { for (let k = 0; k < 1000; k += 60) { ZH.step(60); ZH.tripUpdate(); AP.tick(); } AP.hour(); } return { day: ZH.S.day, people: ZH.S.sv.length, buildings: ZH.world.buildings.length }; })));
  await p.evaluate(() => { ZH.showEventPopup = window._pop; let n = 0; while (!(ZH.S.hour >= 9 && ZH.S.hour < 10) && n < 30000) { ZH.step(60); n += 60; } ZH.S.z.length = 0; });
  await p.waitForTimeout(4000); await Q.clearCards(p); await p.waitForTimeout(1500);
  const shot = async (n) => { await p.waitForTimeout(1200); const f = path.join(OUT, n + '.png'); await Q.shot(p, f); log('shot', n); };
  const close = async () => { await p.evaluate(() => { try { ZH.closeP(); } catch (e) { /* none open */ } const x = document.querySelector('#alertPop .apX'); if (x) x.click(); }); await p.waitForTimeout(600); await Q.clearCards(p); };
  const answer = async () => { for (let i = 0; i < 4; i++) { await p.evaluate(() => { const a = document.getElementById('acceptReq'); if (a) a.click(); const c = document.querySelector('#eventModal .liveCard button'); if (c) c.click(); }); await p.waitForTimeout(800); } await Q.clearCards(p); await p.waitForTimeout(2000); };
  const tabs = async (prefix, names) => { const sel = '#ib .tabs button, #ib [data-tab], #ib .tab'; const n = await p.evaluate((s) => document.querySelectorAll(s).length, sel);
    for (let i = 0; i < n && i < names.length; i++) { await p.evaluate(([s, j]) => document.querySelectorAll(s)[j].click(), [sel, i]); await shot(prefix + names[i]); } };
  await p.evaluate(() => ZH.showSurvivors()); await shot('09_move_in_card_over_people_menu'); await close(); await answer();   /* only if a move-in request is waiting (U22) */
  await shot('01_main_view_day');
  await p.evaluate(() => ZH.showSurvivors()); await shot('03_people_list');
  await p.evaluate(() => ZH.unitPanel(ZH.S.sv[0])); await tabs('', ['04_survivor_status', '05_survivor_gear', '06_survivor_job', '07_survivor_about']); await close();
  await p.evaluate(() => ZH.showTown()); await tabs('', ['10_town_haven', '11_town_defense', '12_town_people', '13_town_more']); await close();
  await p.evaluate(() => ZH.showUpgrade()); await shot('14_upgrade_town'); await close();
  await p.evaluate(() => ZH.showBuild()); await shot('15_build_menu'); await close();
  await p.evaluate(() => { const B = ZH.world.buildings; ZH.showBuildingInfo(B.find((x) => x.type !== 'camp') || B[0]); }); await shot('16_building_info'); await close();
  await p.evaluate(() => ZH.showExpedition()); await shot('17_explore'); await close();
  await p.evaluate(() => { const a = document.getElementById('alertBtn'); if (a) a.click(); }); await shot('18_needs_you_list'); await close();
  await p.evaluate(() => document.getElementById('btnLog').click()); await shot('19_event_log'); await close();
  await p.evaluate(() => { let n = 0; while (!(ZH.S.hour >= 22) && n < 30000) { ZH.step(60); n += 60; } }); await p.waitForTimeout(4000); await answer();
  await shot('02_main_view_night'); await p.evaluate(() => ZH.showSurvivors()); await shot('08_people_list_night'); await close();
  await p.goto(Q.BASE + '/index.html?3d=1'); await p.waitForTimeout(12000); await p.getByText('Zombie test').click(); await p.waitForTimeout(15000); await shot('20_zombie_test_page');
  if (p.errs.length) log('page errors:', p.errs.slice(0, 3)); await b.close();
  log('done:', OUT, '(screen 21, the new game setup, is not taken here)'); })().catch((e) => { console.error(e); process.exit(1); });
