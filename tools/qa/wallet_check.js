// tools/qa/wallet_check.js — UI chat, 3D.399 (W249, phone idea 11: the Wallet; owner, 28 Nov: "Do it like you suggested", A with a tap opening the card as D).
// At three phone sizes, phone look:
//  - More has a Wallet app (its own icon tile) that opens a sheet "Wallet" with "N of M earned" and one card per trophy (trophyList), earned first;
//  - earned cards have their colour and ×count, the rest are dark with a lock; every card shows a strip at least 44 px tall that a tap reaches;
//    the last card is open; nothing wider than the sheet;
//  - a tap on an earned card opens it: the big card, "The story" (facts, then the joke) and "Won" with the days known; the back link says Wallet
//    and goes back to the stack; the stack's back link says More;
//  - a faction not met yet shows ??? for its leader and its name (owner, 28 Nov: "Yes show ???");
//  - a locked card opens with its how-to as the story and no Won row.
// Pictures: runs/ui_samples/wallet_built_<size>.png, wallet_card_<size>.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneXL', 430, 932]].filter((x) => !process.env.ONE || x[0] === process.env.ONE)) {
    const p = await Q.page(b, { w, h, look: '', expose: 'BUILD_TAG, showMore, closeP, trophyList, FACTIONS' });
    await Q.newGame(p);
    for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(150); }
    if (n === 'phone') ok(+String(await p.evaluate(() => ZH.BUILD_TAG)).split('.')[1] >= 399, 'build before 3D.399');
    const M = await p.evaluate(() => { const S = ZH.S; S.fac = S.fac || {}; (S.fac.toll = S.fac.toll || {}).beaten = 1; S.fac.toll.met = true; S.trophies = [{ k: 'sh_autumn', day: 21 }]; S.bossKills = 2; S.medals = 3; S.banners = [{ route: 'stronghold', day: 9 }, { route: 'ally', day: 14 }];
      return ZH.trophyList().map((t) => ({ name: ZH.FACTIONS[t.k] && !(S.fac[t.k] || {}).met ? '???' : t.name, n: t.n })); });
    await p.evaluate(() => { ZH.closeP(); ZH.showMore(); }); await p.waitForTimeout(300);
    const app = await p.evaluate(() => { const a = document.getElementById('moWal'); return a ? { t: a.innerText.trim(), tile: !!a.querySelector('.apT svg'), h: a.getBoundingClientRect().height } : null; });
    ok(app && app.t === 'Wallet' && app.tile && app.h >= 44, `${n}: the Wallet app in More: ${JSON.stringify(app)}`);
    await p.click('#moWal'); await p.waitForTimeout(400);
    const s = await p.evaluate(() => { const ib = document.getElementById('ib'), r = ib.getBoundingClientRect(), C = [...ib.querySelectorAll('.wlStack .wlPass')];
      const strips = C.map((c, i) => { const a = c.getBoundingClientRect(), nx = C[i + 1] ? C[i + 1].getBoundingClientRect().top : a.bottom; return Math.round(nx - a.top); });
      const hits = C.map((c) => { c.scrollIntoView({ block: 'center' }); const a = c.getBoundingClientRect(); const e = document.elementFromPoint(a.left + 40, a.top + 20); return !!(e && e.closest('.wlPass') === c); });
      return { title: document.getElementById('it').innerText, cnt: (ib.querySelector('.wlCnt') || {}).innerText, names: C.map((c) => c.querySelector('.wlNm b').innerText), lock: C.map((c) => c.classList.contains('lock')), n: C.map((c) => c.querySelector('.wlN svg.wlLk') ? 'lock' : c.querySelector('.wlN').textContent),
        strips, hits, open: C.length && C[C.length - 1].classList.contains('open'), wide: Math.max(...C.map((c) => c.getBoundingClientRect().right)) <= r.right + 1, back: (document.getElementById('pBack').dataset.t || '') }; });
    const got = M.filter((t) => t.n), L = got.concat(M.filter((t) => !t.n));
    ok(/Wallet/i.test(s.title) && s.cnt === `${got.length} of ${M.length} earned`, `${n}: title and count: ${s.title} / ${s.cnt}`);
    ok(s.names.join('|') === L.map((t) => t.name).join('|'), `${n}: cards earned first: ${s.names.join(', ')}`);
    ok(s.lock.every((x, i) => x === !L[i].n) && s.n.every((x, i) => L[i].n ? x === '×' + L[i].n : x === 'lock'), `${n}: locks and counts: ${JSON.stringify(s.n)} ${JSON.stringify(s.lock)} ${JSON.stringify(L)}`);
    ok(s.strips.slice(0, -1).every((x) => x >= 44) && s.hits.every(Boolean), `${n}: every card's strip 44 px+ and tappable: ${s.strips.join(',')} / ${s.hits.join(',')}`);
    ok(s.open && s.wide && s.back === 'More', `${n}: last card open, inside the sheet, back says More: ${JSON.stringify({ open: s.open, wide: s.wide, back: s.back })}`);
    await p.evaluate(() => document.getElementById('ib').scrollTo(0, 0)); await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(out, `wallet_built_${n}.png`) });
    /* tap the Banners card */
    const bi = s.names.indexOf('Banners'); await p.evaluate((i) => document.querySelectorAll('.wlStack .wlPass')[i].click(), bi); await p.waitForTimeout(300);
    const c = await p.evaluate(() => { const ib = document.getElementById('ib'); return { big: !!ib.querySelector('.wlPass.big'), nm: (ib.querySelector('.wlPass.big .wlNm b') || {}).innerText, back: [...ib.querySelectorAll('.wlBack')].map((x) => x.innerText), bt: document.getElementById('pBack').dataset.t }; });
    ok(c.big && c.nm === 'Banners' && /^THE STORY|^The story/i.test(c.back[0]) && /2 Banners raised/.test(c.back[0]) && /Flags are cheap/.test(c.back[0]) && /Day 9/.test(c.back[1] || '') && /Day 14/.test(c.back[1] || '') && c.bt === 'Wallet', `${n}: an opened card: ${JSON.stringify(c)}`);
    await p.screenshot({ path: path.join(out, `wallet_card_${n}.png`) });
    await p.click('#pBack'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => !!document.querySelector('#ib .wlStack')), `${n}: back goes to the stack`);
    /* a locked card */
    const li = s.lock.indexOf(true); await p.evaluate((i) => document.querySelectorAll('.wlStack .wlPass')[i].click(), li); await p.waitForTimeout(300);
    const lc = await p.evaluate(() => [...document.querySelectorAll('#ib .wlBack')].map((x) => x.innerText));
    ok(lc.length === 1 && /not met yet|Clear it|Kill|Come through|Earn|Call/.test(lc[0]), `${n}: a locked card: ${JSON.stringify(lc)}`);
    await p.close();
  }
  await b.close(); console.log(bad ? `wallet_check: ${bad} FAIL` : 'wallet_check: all ok'); process.exit(bad ? 1 : 0);
})();
