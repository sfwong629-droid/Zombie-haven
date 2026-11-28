// tools/qa/calendar_mock.js — UI chat, 28 Nov (idea 6, a Calendar app in More; "many mock up for approval"). Mockup only, in the real menu sheet.
// What is coming: boss nights, the trader, the weekly crisis, the season changing, a faction's visit, the squad home, the level-up done, Memories.
// A: the phone's month grid (dots on days) with the chosen day's list under it; B: "Up next", a list grouped by day with coloured bars;
// C: a strip of the week's days and today's hours as a timeline; D: the month grid with every day's events written in it (bigger cells).
// Pictures: runs/ui_samples/cal_<A..D>.png, cal_sheet.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
const EV = [ // day, hour, kind, title, sub
  [1, 9, 'trader', 'Trader at the gate', 'Leaves 19:00'], [1, 21, 'boss', 'Horde night', 'Walkers from the east'], [2, 12, 'squad', 'Squad home', 'From the gas station'],
  [3, 0, 'level', 'Haven level 3 done', 'About 2 h'], [4, 10, 'faction', 'Toll Kings visit', 'They want a toll'], [5, 21, 'boss', 'Boss night', 'The Brute leads it'],
  [7, 6, 'crisis', 'Weekly crisis', 'Greenwater needs aid'], [8, 6, 'mem', 'Memories · Week 1', 'Plays in the morning'], [10, 6, 'season', 'Winter begins', 'Crops stop, water freezes'], [12, 21, 'boss', 'Boss night', '']];
const COL = { trader: '#e3a33b', boss: '#ff453a', squad: '#4a82c8', level: '#cf9a3d', faction: '#4f9c5e', crisis: '#ff9f0a', mem: '#3fa39a', season: '#8f9fb3' };
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, look: '', expose: 'showMore, closeP' }); await Q.newGame(p);
  for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(150); }
  await p.waitForTimeout(5000);
  await p.addStyleTag({ content: `#nfBox{display:none!important}.cal{font-family:-apple-system,"SF Pro Text",system-ui,sans-serif;color:#fff}
    .mo{display:flex;justify-content:space-between;align-items:baseline;margin:2px 4px 8px}.mo b{font-size:20px}.mo small{color:#ff453a;font-weight:600}
    .wd,.gr{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));text-align:center}.wd span{font-size:11px;color:rgba(255,255,255,.5);padding-bottom:6px}
    .gr span{height:44px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:6px;font-size:17px;position:relative}
    .gr span.t b{background:#ff453a;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;margin-top:-5px}
    .gr span.s b{background:rgba(255,255,255,.9);color:#111;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;margin-top:-5px}
    .gr i{display:flex;gap:2px;margin-top:3px}.gr i u{width:5px;height:5px;border-radius:50%;text-decoration:none}
    .ev{display:flex;gap:10px;align-items:stretch;padding:9px 12px;border-bottom:1px solid rgba(255,255,255,.07)}.ev:last-child{border:0}.ev .bar{width:4px;border-radius:2px}.ev .tm{width:46px;font-size:13px;color:rgba(255,255,255,.6);padding-top:2px}
    .ev .tx b{display:block;font-size:15px;font-weight:600}.ev .tx small{font-size:13px;color:rgba(255,255,255,.6)}
    .dh{font-size:13px;font-weight:600;color:rgba(255,255,255,.55);margin:14px 6px 6px;text-transform:uppercase}.dh.today{color:#ff453a}
    .wk{display:grid;grid-template-columns:repeat(7,1fr);text-align:center;margin-bottom:10px}.wk span{display:flex;flex-direction:column;gap:4px;align-items:center;font-size:11px;color:rgba(255,255,255,.55)}.wk span b{font-size:17px;color:#fff;width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:50%}.wk span.t b{background:#ff453a}
    .tl{position:relative;margin-left:44px;border-left:1px solid rgba(255,255,255,.12)}.tl .h{height:34px;position:relative}.tl .h small{position:absolute;left:-44px;top:-8px;font-size:11px;color:rgba(255,255,255,.45)}
    .tl .blk{position:absolute;left:6px;right:6px;border-radius:8px;padding:5px 9px;font-size:13px;font-weight:600}.tl .now{position:absolute;left:-6px;right:0;height:2px;background:#ff453a}.tl .now:before{content:'';position:absolute;left:-4px;top:-4px;width:10px;height:10px;border-radius:50%;background:#ff453a}
    .gr2 span{min-width:0;overflow:hidden;height:62px;font-size:13px;justify-content:flex-start;align-items:stretch;padding:4px 2px 0;border-top:1px solid rgba(255,255,255,.08);text-align:left}.gr2 span em{display:block;font-style:normal;font-size:9.5px;font-weight:600;border-radius:3px;padding:1px 3px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff}` });
  const cell = (d) => { const es = EV.filter((e) => e[0] === d); return `<span class="${d === 1 ? 't' : ''}"><b>${d}</b>${es.length ? `<i>${es.slice(0, 3).map((e) => `<u style="background:${COL[e[2]]}"></u>`).join('')}</i>` : ''}</span>`; };
  const days = Array.from({ length: 21 }, (_, i) => i + 1);
  const grid = `<div class="wd">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x) => `<span>${x}</span>`).join('')}</div><div class="gr">${days.map(cell).join('')}</div>`;
  const ev = (e) => `<div class="ev"><span class="tm">${String(e[1]).padStart(2, '0')}:00</span><span class="bar" style="background:${COL[e[2]]}"></span><span class="tx"><b>${e[3]}</b>${e[4] ? `<small>${e[4]}</small>` : ''}</span></div>`;
  const V = {
    A: `<div class="cal"><div class="mo"><b>Autumn</b><small>Day 1 · Today</small></div>${grid}<div class="dh today">Today · Day 1</div><div class="phCard">${EV.filter((e) => e[0] === 1).map(ev).join('')}</div></div>`,
    B: `<div class="cal"><div class="mo"><b>Up next</b><small>Day 1</small></div>${[1, 2, 3, 4, 5, 7].map((d) => `<div class="dh${d === 1 ? ' today' : ''}">${d === 1 ? 'Today' : d === 2 ? 'Tomorrow' : 'Day ' + d}</div><div class="phCard">${EV.filter((e) => e[0] === d).map(ev).join('')}</div>`).join('')}</div>`,
    C: `<div class="cal"><div class="wk">${[1, 2, 3, 4, 5, 6, 7].map((d, i) => `<span class="${d === 1 ? 't' : ''}">${['S', 'M', 'T', 'W', 'T', 'F', 'S'][i]}<b>${d}</b></span>`).join('')}</div><div class="tl">${[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map((h) => `<div class="h"><small>${String(h).padStart(2, '0')}:00</small></div>`).join('')}
      <div class="blk" style="top:${(9 - 8) * 34}px;height:${10 * 34 - 4}px;background:rgba(227,163,59,.28);border-left:3px solid #e3a33b">Trader at the gate<br><small style="font-weight:500;opacity:.7">09:00 to 19:00</small></div><div class="blk" style="top:${(21 - 8) * 34}px;height:62px;background:rgba(255,69,58,.3);border-left:3px solid #ff453a">Horde night</div><div class="now" style="top:4px"></div></div></div>`,
    D: `<div class="cal"><div class="mo"><b>Autumn</b><small>Day 1</small></div><div class="wd">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x) => `<span>${x}</span>`).join('')}</div><div class="gr gr2">${days.map((d) => `<span${d === 1 ? ' style="background:rgba(255,69,58,.12)"' : ''}><b style="font-size:13px${d === 1 ? ';color:#ff453a' : ''}">${d}</b>${EV.filter((e) => e[0] === d).map((e) => `<em style="background:${COL[e[2]]}">${e[3]}</em>`).join('')}</span>`).join('')}</div></div>` };
  for (const [k, h] of Object.entries(V)) { await p.evaluate((h) => { ZH.closeP(); ZH.showMore(); document.getElementById('it').textContent = 'Calendar'; document.getElementById('ib').innerHTML = h; }, h); await p.waitForTimeout(400); await p.screenshot({ path: path.join(out, `cal_${k}.png`) }); }
  await b.close(); console.log('ok');
})();
