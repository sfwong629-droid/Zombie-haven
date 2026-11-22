// tools/qa/inventory_check.js [sizes] [tag] — 3D.227 (owner, 19 Nov; U42, W131): the Inventory, Gear and Supplies tabs.
// At six phone sizes, with spare gear in the stash: taps the backpack on the resource bar and checks the Inventory opens on Gear, with
// the Gear and Supplies tabs; the grid has six boxes to a row (3D.231) and empty slots after the items (at least 24 boxes in all); every item
// box shows a picture (its 3D model or its sticker); the filters are 44 px or more and Weapons shows only weapons. Taps an item and
// checks its page: the big picture (still, with no turn controls: 3D.232), the name, the joke line, and Give to lists people, best first,
// with the lime Give only on the first row and only when it is a gain. Gives the item and checks the survivor now carries it and the stash
// has one fewer. Then Supplies shows the eight resources. Optional tag: pictures as <tag>_<size>_{grid,item}.png.
// 3D.279: the backpack opens the supplies list first; its "Open inventory" button opens the Inventory.
// Exit 0 ok, 1 a check failed, 2 the Inventory could not be opened.
const Q = require('./lib');
const SIZES = (process.argv[2] || 'phone:390x844,phoneS:360x640,phoneM:375x667,phoneXL:430x932,phoneN:320x568,phoneT:412x915').split(',').map((s) => { const [n, d] = s.split(':'); const [w, h] = d.split('x'); return [n, +w, +h]; });
const TAG = process.argv[3] || '';
(async () => { const b = await Q.launch(); const p = await Q.page(b, {}); await Q.newGame(p); await Q.clearCards(p); let bad = 0, stuck = 0;
  for (let i = 0; i < 40; i++) { if (await p.evaluate(() => !!(window.ZH3D && ZH3D.ready))) break; await p.waitForTimeout(500); }
  for (const [nm, w, h] of SIZES) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(400); const out = [];
    await p.evaluate(() => { const S = ZH.S; S.inv = { crowbar: 2, machete: 1, bat: 1, hoodie: 1, riot: 1, hardhat: 1, goggles: 1 }; for (const k of Object.keys(S.inv)) if (!ZH.ITEMS[k]) delete S.inv[k]; for (const q of S.sv) { q.eq = q.eq || {}; q.eq.weapon = null; }
      const x = document.getElementById('closeInfo'); if (document.getElementById('infoPanel').classList.contains('show')) x.click(); for (const bn of document.querySelectorAll('#eventModal .evBox:not(.liveCard) button')) bn.click(); });
    await p.waitForTimeout(300);
    const opened = await p.evaluate(() => { const r = document.getElementById('rare'); const sp = r && r.closest('.res > span'); if (!sp) return false; sp.click(); const inv = document.querySelector('#supPop .supInv'); if (inv) inv.click(); return document.getElementById('infoPanel').classList.contains('show') && document.getElementById('it').textContent; });
    if (opened !== 'Inventory') { stuck++; console.log(`STUCK ${nm}: the backpack opened "${opened}"`); continue; }
    await p.waitForTimeout(1200);
    const g = await p.evaluate(() => { const ib = document.getElementById('ib'), tabs = [...ib.querySelectorAll('.tabs button')].map((x) => x.textContent.trim()), on = (ib.querySelector('.tabs button.on') || {}).textContent;
      const G = ib.querySelector('.invG'), boxes = G ? [...G.children] : [], items = boxes.filter((x) => x.dataset.inv), empty = boxes.filter((x) => x.classList.contains('empty'));
      const cols = G ? getComputedStyle(G).gridTemplateColumns.split(' ').length : 0, firstEmpty = boxes.findIndex((x) => x.classList.contains('empty')), lastItem = boxes.map((x) => !!x.dataset.inv).lastIndexOf(true);
      const pics = items.filter((x) => x.querySelector('img,.icon svg,.icon img')).length, f = [...ib.querySelectorAll('.invF button')].map((x) => x.offsetHeight);
      return { tabs, on: (on || '').trim(), n: boxes.length, items: items.length, empty: empty.length, cols, order: firstEmpty > lastItem, pics, f, imgs: items.filter((x) => x.querySelector('img')).length }; });
    if (!g.tabs.includes('Gear') || !g.tabs.includes('Supplies')) out.push('tabs are ' + g.tabs.join(', ')); if (g.on !== 'Gear') out.push('opens on ' + g.on);
    if (g.cols !== 6) out.push(`${g.cols} boxes to a row`); if (g.n < 24 || g.n % 6) out.push(`${g.n} boxes`); if (!g.empty) out.push('no empty slots'); if (!g.order) out.push('empty slots are not after the items');
    if (g.pics < g.items) out.push(`${g.items - g.pics} items without a picture`); if (g.f.some((x) => x < 44)) out.push('a filter is under 44 px');
    const wf = await p.evaluate(() => { document.querySelector('.invF [data-if=weapon]').click(); return [...document.querySelectorAll('.invG [data-inv]')].map((x) => ZH.ITEMS[x.dataset.inv].slot); });
    if (!wf.length || wf.some((s) => s !== 'weapon')) out.push('Weapons shows ' + wf.join(',')); await p.evaluate(() => document.querySelector('.invF [data-if=all]').click()); await p.waitForTimeout(900);
    if (TAG) await Q.shot(p, `${TAG}_${nm}_grid.png`);
    const before = await p.evaluate(() => ZH.S.inv.crowbar || 0); await p.evaluate(() => document.querySelector('.invG [data-inv=crowbar]').click()); await p.waitForTimeout(600);
    const it = await p.evaluate(() => { const ib = document.getElementById('ib'), img = document.getElementById('reImg'), rows = [...ib.querySelectorAll('.giveR')], go = rows.map((r) => r.querySelector('.act').classList.contains('go'));
      const rot = ib.querySelectorAll('.reRot,.hint').length, src0 = img && img.src;
      return { title: document.getElementById('it').textContent, img: !!img, name: (ib.querySelector('.reName') || {}).textContent, quip: ((ib.querySelector('.reQuip') || {}).textContent || '').trim(), rows: rows.length, go, gains: rows.map((r) => (r.querySelector('.up') ? 1 : 0)), rot, src0, back: getComputedStyle(document.getElementById('pBack')).display !== 'none' }; });
    if (it.title !== 'Crowbar' || !/Crowbar/.test(it.name || '')) out.push('the item page is "' + it.title + '"'); if (!it.img) out.push('no big picture'); if (!it.quip) out.push('no joke line'); if (!it.back) out.push('no back button');
    if (it.rot) out.push('the page still has turn controls'); await p.waitForTimeout(1500); if ((await p.evaluate(() => (document.getElementById('reImg') || {}).src)) !== it.src0) out.push('the picture moves by itself');   /* 3D.232 (W139): a still picture */
    if (!it.rows) out.push('nobody in Give to'); if (it.go.slice(1).some(Boolean)) out.push('more than one lime Give'); if (it.go[0] && !it.gains[0]) out.push('the lime Give is not a gain');
    if (TAG) await Q.shot(p, `${TAG}_${nm}_item.png`);
    const gv = await p.evaluate(() => { const b0 = document.querySelector('.giveR [data-give]'), id = b0.dataset.give; b0.click(); const q = ZH.S.sv.find((v) => String(v.id) === id); return { has: q && q.eq && q.eq.weapon, left: ZH.S.inv.crowbar || 0, title: document.getElementById('it').textContent }; });
    if (gv.has !== 'crowbar') out.push('the survivor did not get the crowbar'); if (gv.left !== before - 1) out.push(`the stash went ${before} → ${gv.left}`);
    const sup = await p.evaluate(() => { document.getElementById('pBack').style.display !== 'none' && document.getElementById('pBack').click(); const t = [...document.querySelectorAll('#ib .tabs button')].find((x) => /Supplies/.test(x.textContent)); if (t) t.click(); return document.querySelectorAll('#ib > .card').length; });
    if (sup !== 8) out.push(`Supplies shows ${sup} rows`); await p.evaluate(() => { const t = [...document.querySelectorAll('#ib .tabs button')].find((x) => /Gear/.test(x.textContent)); if (t) t.click(); });
    if (out.length) bad++; console.log(`${out.length ? 'FAIL' : 'PASS'} ${nm} ${w}x${h} (${g.items} items, ${g.empty} empty, ${g.imgs} 3D pictures)${out.length ? '\n   ' + out.join('; ') : ''}`); }
  if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad ? 1 : stuck ? 2 : 0); })();
