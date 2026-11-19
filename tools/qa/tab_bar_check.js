// tools/qa/tab_bar_check.js [sizes] [tag] — 3D.216 (owner, 18 Nov; W113, U21, U25, U39): the tab rows.
// At six phone sizes, opens Town, Build, People and a survivor's details and checks every tab row:
//   each tab is its own button at least 44 px tall; a row with icons fills the menu's width without scrolling, with the icon above the word;
//   no tab runs past the menu's edge; the selected tab is white and no tab is lime (lime is only for Build / go / recommended).
// Optional: a tag to save pictures as <tag>_<size>_<menu>.png. Exit 0 ok, 1 a check failed, 2 a menu could not be opened.
const Q = require('./lib');
const SIZES = (process.argv[2] || 'phone:390x844,phoneS:360x640,phoneM:375x667,phoneXL:430x932,phoneN:320x568,phoneT:412x915').split(',').map((s) => { const [n, d] = s.split(':'); const [w, h] = d.split('x'); return [n, +w, +h]; });
const TAG = process.argv[3] || '';
(async () => { const b = await Q.launch(); const p = await Q.page(b, {}); await Q.newGame(p); await Q.clearCards(p); let bad = 0, stuck = 0;
  for (const [nm, w, h] of SIZES) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(800);
    for (const m of ['town', 'build', 'people', 'person']) {
      await p.evaluate(() => { const x = document.getElementById('closeInfo'); if (document.getElementById('infoPanel').classList.contains('show') && x) x.click(); const e = document.getElementById('eventModal'); if (e) e.style.display = 'none'; }); await p.waitForTimeout(250);
      const opened = await p.evaluate((m) => { const $ = (i) => document.getElementById(i); if (m === 'person') { $('mSurv').click(); const row = document.querySelector('#ib .card'); if (row) row.click(); } else $({ town: 'mTown', build: 'mBuild', people: 'mSurv' }[m]).click(); return $('infoPanel').classList.contains('show') ? $('it').textContent : null; }, m);
      await p.waitForTimeout(450); if (!opened) { stuck++; console.log(`STUCK ${nm} ${m}`); continue; }
      const r = await p.evaluate(() => { const P = document.getElementById('infoPanel').getBoundingClientRect(), out = [], rows = [...document.querySelectorAll('#ib .tabs')];
        const rgb = (c) => (c.match(/\d+(\.\d+)?/g) || []).map(Number), isLime = (c) => { const [r, g, b2] = rgb(c); return r > 170 && g > 230 && b2 < 140; }, isWhite = (c) => { const [r, g, b2, a = 1] = rgb(c); return r > 240 && g > 240 && b2 > 240 && a > .9; };
        for (const row of rows) { const bs = [...row.querySelectorAll('button')], icons = bs.every((x) => x.querySelector('.zi-ti'));
          for (const x of bs) { const r2 = x.getBoundingClientRect(), cs = getComputedStyle(x), name = x.textContent.trim();
            if (r2.height < 44) out.push(`"${name}" is ${Math.round(r2.height)} px tall`); if (r2.right > P.right - 4 || r2.left < P.left + 4) out.push(`"${name}" runs past the menu's edge`);
            if (isLime(cs.backgroundColor) || /198, 255, 77/.test(cs.backgroundImage)) out.push(`"${name}" is lime`);
            if (x.classList.contains('on') && !isWhite(cs.backgroundColor)) out.push(`the selected tab "${name}" is not white`);
            if (icons) { const ic = x.querySelector('.zi-ti').getBoundingClientRect(), tx = document.createRange(); tx.selectNodeContents(x); if (ic.bottom > r2.top + r2.height * .7) out.push(`"${name}": the icon is not above the word`); } }
          if (icons) { if (row.scrollWidth > row.clientWidth + 1) out.push('the row scrolls'); const used = bs.reduce((s, x) => s + x.getBoundingClientRect().width, 0); if (used < row.clientWidth * .85) out.push(`the row fills only ${Math.round(100 * used / row.clientWidth)}% of the width`);
            for (let i = 1; i < bs.length; i++) if (bs[i].getBoundingClientRect().left - bs[i - 1].getBoundingClientRect().right < 2) out.push('two tabs touch: they should be separate buttons'); } }
        return { out, rows: rows.length, n: rows.map((x) => x.children.length).join('+') }; });
      if (r.out.length) bad++; console.log(`${r.out.length ? 'FAIL' : 'PASS'} ${nm} ${w}x${h} ${m} ("${opened}") tab rows: ${r.rows} (${r.n})${r.out.length ? '\n   ' + [...new Set(r.out)].join('; ') : ''}`);
      if (TAG) await Q.shot(p, `${TAG}_${nm}_${m}.png`); } }
  if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad ? 1 : stuck ? 2 : 0); })();
