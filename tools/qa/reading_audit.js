// tools/qa/reading_audit.js [days] [outDir] — UI chat, 24 Nov 2026 (W270, owner: "lots of reading all over the place will not be helping to keep the
// attention of the players"). Plays a town for [days] game days with the balance bot, then opens every main screen in the phone look on a 390x844
// phone and measures the reading on it AS FIRST SEEN (no scrolling): how many separate places hold words, how many of them are sentences (6 words
// or more), and the words in view; also the words on the whole screen if scrolled. Each picture is marked: orange boxes round sentences, yellow
// round shorter labels. Writes <outDir>/report.md, report.json and one picture per screen. Serve the repo first (python3 -m http.server 8765).
const Q = require('./lib'); const fs = require('fs'), path = require('path');
const DAYS = +(process.argv[2] || 4), OUT = process.argv[3] || 'runs/reading_audit';
const AP = fs.readFileSync(path.join(__dirname, '../balance/ap.js'), 'utf8');
function measure() {   /* runs in the page: the words a player sees right now */
  const VW = innerWidth, VH = innerHeight, groups = new Map();
  const shown = (e) => { for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.1) return false; } return true; };
  const blockOf = (e) => { let x = e; while (x && x !== document.body) { const d = getComputedStyle(x).display; if (!/^inline/.test(d) || x.tagName === 'BUTTON') return x; x = x.parentElement; } return e; };
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n, all = 0;
  while ((n = tw.nextNode())) { const t = n.textContent.replace(/\s+/g, ' ').trim(); if (!t || !/[A-Za-z]/.test(t)) continue; const e = n.parentElement; if (!e || /^(SCRIPT|STYLE|TITLE)$/.test(e.tagName) || !shown(e)) continue;
    const rg = document.createRange(); rg.selectNodeContents(n); const r = rg.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const words = t.split(' ').filter((w) => /[A-Za-z0-9]/.test(w)).length; all += words;
    let vis = r.bottom > 0 && r.top < VH && r.right > 0 && r.left < VW; if (vis) { const cx = Math.min(VW - 2, Math.max(2, (r.left + r.right) / 2)), cy = Math.min(VH - 2, Math.max(2, (r.top + r.bottom) / 2)), h = document.elementFromPoint(cx, cy); vis = !!h && (h === e || e.contains(h) || h.contains(e) || blockOf(e).contains(h)); }
    if (!vis) continue; const b = blockOf(e); const g = groups.get(b) || { words: 0, text: '', box: null }; g.words += words; g.text = (g.text + ' ' + t).trim();
    const br = b.getBoundingClientRect(); g.box = [Math.max(0, br.left), Math.max(0, br.top), Math.min(VW, br.right), Math.min(VH, br.bottom)]; groups.set(b, g); }
  const spots = [...groups.values()]; return { spots: spots.length, sentences: spots.filter((s) => s.words >= 6).length, words: spots.reduce((a, s) => a + s.words, 0), all, list: spots.map((s) => ({ w: s.words, t: s.text.slice(0, 90), box: s.box })) };
}
module.exports = { measure };
if (require.main === module) (async () => { fs.mkdirSync(OUT, { recursive: true }); const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, look: '', expose: 'showInventory,showSettings,showMore,showSurvivors,unitPanel,showTown,showBuild,showUpgrade,showBuildingInfo,showExpedition,showJobs,showGuide,showLog,buildDetail,radio,world' });
  const SHOTS = []; const snap = async (nm) => { await p.waitForTimeout(700); const m = await p.evaluate(measure);
    await p.evaluate((L) => { for (const s of L) { if (!s.box) continue; const d = document.createElement('div'); d.className = '__rd'; Object.assign(d.style, { position: 'fixed', left: s.box[0] + 'px', top: s.box[1] + 'px', width: (s.box[2] - s.box[0]) + 'px', height: (s.box[3] - s.box[1]) + 'px', outline: `2px solid ${s.w >= 6 ? '#ff8a1e' : 'rgba(255,230,80,.85)'}`, background: s.w >= 6 ? 'rgba(255,138,30,.13)' : 'none', zIndex: 2147483647, pointerEvents: 'none' }); document.body.appendChild(d); } }, m.list);
    await p.screenshot({ path: path.join(OUT, nm + '.png') }); await p.evaluate(() => document.querySelectorAll('.__rd').forEach((d) => d.remove()));
    SHOTS.push({ nm, ...m }); console.log(nm.padEnd(18), 'spots', m.spots, 'sentences', m.sentences, 'words in view', m.words, 'whole', m.all); };
  await Q.newGame(p); await p.waitForTimeout(2500); await snap('01_first_minute');   /* the opening tip cards, as a new player sees them */
  await Q.clearCards(p); await p.evaluate(() => { window._pop = ZH.showEventPopup; ZH.showEventPopup = () => {}; }); await p.evaluate(AP);
  for (let d = 0; d < DAYS; d++) await p.evaluate(() => { for (let h = 0; h < 24; h++) { for (let k = 0; k < 1000; k += 60) { ZH.step(60); ZH.tripUpdate(); AP.tick(); } AP.hour(); } });
  await p.evaluate(() => { ZH.showEventPopup = window._pop; let n = 0; while (!(ZH.S.hour >= 10 && ZH.S.hour < 11) && n < 30000) { ZH.step(60); n += 60; } ZH.S.z.length = 0; }); await p.waitForTimeout(3000); await Q.clearCards(p);
  const close = async () => { await p.evaluate(() => { try { ZH.closeP(); } catch (e) { /* none */ } const x = document.querySelector('#alertPop .apX'); if (x) x.click(); document.querySelectorAll('#eventModal .evX').forEach((x) => x.click()); }); await p.waitForTimeout(400); await Q.clearCards(p); };
  const S = [
    ['02_town_day', async () => {}],
    ['03_needs_you', async () => p.evaluate(() => { const a = document.getElementById('alertBtn'); if (a) a.click(); })],
    ['04_radio', async () => p.evaluate(() => ZH.radio('dj', 'Moth here. The Toll Kings raised the bridge toll again. Bring snacks, not scrap. That was the news, this is the music.'))],
    ['05_people', async () => p.evaluate(() => ZH.showSurvivors())],
    ['06_survivor', async () => p.evaluate(() => ZH.unitPanel(ZH.S.sv[0]))],
    ['07_survivor_job', async () => { await p.evaluate(() => ZH.unitPanel(ZH.S.sv[0])); await p.waitForTimeout(300); await p.evaluate(() => { const t = document.querySelectorAll('#unitExtra [data-tab]')[2]; if (t) t.click(); }); }],
    ['08_town', async () => p.evaluate(() => ZH.showTown())],
    ['09_town_defense', async () => { await p.evaluate(() => ZH.showTown()); await p.waitForTimeout(300); await p.evaluate(() => { const t = document.querySelectorAll('#ib [data-tab]')[1]; if (t) t.click(); }); }],
    ['10_build', async () => p.evaluate(() => ZH.showBuild())],
    ['11_building_page', async () => p.evaluate(() => ZH.buildDetail('farm'))],
    ['12_placed_building', async () => p.evaluate(() => { const B = ZH.world.buildings; ZH.showBuildingInfo(B.find((x) => x.type === 'farm') || B.find((x) => x.type !== 'camp') || B[0]); })],
    ['13_upgrade', async () => p.evaluate(() => ZH.showUpgrade('rank'))],
    ['14_events', async () => p.evaluate(() => ZH.showUpgrade('events'))],
    ['15_explore', async () => p.evaluate(() => ZH.showExpedition())],
    ['16_inventory', async () => p.evaluate(() => ZH.showInventory('gear'))],
    ['17_item', async () => { await p.evaluate(() => ZH.showInventory('gear')); await p.waitForTimeout(300); await p.evaluate(() => { const t = document.querySelector('.invT:not(.empty)'); if (t) t.click(); }); }],
    ['18_jobs', async () => p.evaluate(() => ZH.showJobs())],
    ['19_guide', async () => p.evaluate(() => ZH.showGuide())],
    ['20_settings', async () => p.evaluate(() => ZH.showSettings())],
    ['21_event_log', async () => p.evaluate(() => ZH.showLog())],
  ];
  for (const [nm, open] of S) { try { await open(); } catch (e) { console.log('could not open', nm, e.message.slice(0, 80)); continue; } await snap(nm); await close(); }
  const tag = await p.evaluate(() => ZH.BUILD_TAG); fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(SHOTS, null, 1));
  fs.writeFileSync(path.join(OUT, 'report.md'), `# Reading audit, ${new Date().toISOString().slice(0, 10)}, ${tag}, 390x844, phone look\n\nAs first seen, no scrolling. A spot is one separate place with words; a sentence is a spot of 6 words or more.\n\n| Screen | Spots | Sentences | Words in view | Words if scrolled |\n|---|---|---|---|---|\n` + SHOTS.map((s) => `| ${s.nm} | ${s.spots} | ${s.sentences} | ${s.words} | ${s.all} |`).join('\n') + '\n\n## Sentences in view\n' + SHOTS.map((s) => `\n### ${s.nm}\n` + s.list.filter((x) => x.w >= 6).map((x) => `- (${x.w}) ${x.t}`).join('\n')).join('\n') + '\n');
  if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); })().catch((e) => { console.error(e); process.exit(1); });
