// tools/qa/old_town_shots.js BACKUP.json OUT_DIR — phone screenshots (390x844) of the main menus in a saved town (Balance chat, 21 Nov 2026).
// BACKUP.json is a backup as the game exports it (tools/balance/long_study.py writes one every 10 game days). Serve the repo first (python3 -m http.server 8765).
// Also prints, per screen, anything that is wider than the menu or sticks out of the screen.
const Q = require('./lib'); const fs = require('fs'), path = require('path');
const BAK = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), OUT = process.argv[3] || 'old_town_shots';
const log = (...a) => console.log(...a);
(async () => { fs.mkdirSync(OUT, { recursive: true }); const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'showInventory, showGoals2: showGoals, showMore, showLog, showJobs, showResidents, showTrader' });
  const save = JSON.stringify({ ...(BAK.save || BAK), sid: 'import', time: Date.now() });
  await p.addInitScript((s) => { try { if (!sessionStorage.getItem('zhPut')) { localStorage.setItem('zombieHavenR1', s); localStorage.setItem('zhSlot', '1'); sessionStorage.setItem('zhPut', '1'); } } catch (e) { /* */ } }, save);
  await p.goto(Q.BASE + '/index.html?3d=1&play=1');
  await p.waitForFunction(() => window.ZH3D && window.ZH && ZH.S && ZH.S.sv.length && ZH3D.people().size, null, { timeout: 240000 }); await p.waitForTimeout(5000);
  await p.evaluate(() => { const k = document.getElementById('cutSkip'); if (k) k.click(); }); await Q.clearCards(p);
  log('town: day', await p.evaluate(() => ZH.S.day), 'level', await p.evaluate(() => ZH.S.lvl), 'people', await p.evaluate(() => ZH.S.sv.length), 'buildings', await p.evaluate(() => ZH.world.buildings.length));
  const audit = (n) => p.evaluate((n) => { const out = [], W = innerWidth, H = innerHeight; const root = document.querySelector('#info') || document.body;
    for (const e of document.querySelectorAll('#ib *, #alertPop *, #hud *, #top *, #eventModal *')) { const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      if (r.right > W + 2 || r.left < -2) out.push('off the side: ' + e.tagName + '.' + e.className + ' "' + (e.textContent || '').trim().slice(0, 40) + '" ' + Math.round(r.left) + '..' + Math.round(r.right));
      else if (e.children.length === 0 && e.scrollWidth > e.clientWidth + 2 && cs.overflow !== 'visible' && (e.textContent || '').trim()) out.push('text cut: ' + e.tagName + '.' + e.className + ' "' + (e.textContent || '').trim().slice(0, 50) + '"'); }
    const ib = document.getElementById('ib'); return { n, rows: ib ? ib.querySelectorAll('.card, .row, button').length : 0, scrollH: ib ? ib.scrollHeight : 0, issues: [...new Set(out)].slice(0, 12) }; }, n);
  const shot = async (n) => { await p.waitForTimeout(1200); await Q.shot(p, path.join(OUT, n + '.png')); log(JSON.stringify(await audit(n))); };
  const close = async () => { await p.evaluate(() => { try { ZH.closeP(); } catch (e) { /* none */ } const x = document.querySelector('#alertPop .apX'); if (x) x.click(); }); await p.waitForTimeout(500); await Q.clearCards(p); };
  const tabs = async (prefix) => { const sel = '#ib .tabs button, #ib [data-tab], #ib .tab'; const n = await p.evaluate((s) => document.querySelectorAll(s).length, sel);
    for (let i = 0; i < n && i < 6; i++) { await p.evaluate(([s, j]) => document.querySelectorAll(s)[j].click(), [sel, i]); await shot(prefix + '_tab' + (i + 1)); } };
  const tryDo = async (name, fn, withTabs) => { try { await p.evaluate(fn); await shot(name); if (withTabs) await tabs(name); } catch (e) { log('FAILED', name, String(e).slice(0, 200)); } await close(); };
  await shot('01_main');
  await tryDo('02_people', () => ZH.showSurvivors());
  await tryDo('03_survivor', () => ZH.unitPanel(ZH.S.sv[0]), true);
  await tryDo('04_town', () => ZH.showTown(), true);
  await tryDo('05_upgrade', () => ZH.showUpgrade());
  await tryDo('06_build', () => ZH.showBuild(), true);
  await tryDo('07_inventory', () => ZH.showInventory(), true);
  await tryDo('08_explore', () => ZH.showExpedition());
  await tryDo('09_needs_you', () => { const a = document.getElementById('alertBtn'); if (a) a.click(); });
  await tryDo('10_log', () => document.getElementById('btnLog').click());
  await tryDo('11_workshop', () => { const B = ZH.world.buildings; const w = B.find((x) => /workshop|bench/.test(x.type)); if (w) ZH.showBuildingInfo(w); });
  await tryDo('12_goals', () => ZH.showGoals());
  await tryDo('13_trophies', () => ZH.showTrophies());
  if (p.errs.length) log('page errors:', JSON.stringify(p.errs.slice(0, 5))); await b.close(); log('done', OUT);
})().catch((e) => { console.error(e); process.exit(1); });
