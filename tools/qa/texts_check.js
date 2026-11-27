// tools/qa/texts_check.js — UI chat, 3D.388 (W249, fun idea 5: factions text you). At three phone sizes, phone look:
//  - the Toll Kings' toll opens a message thread: their name, the Collector, their mood face and word on top; what happens as a grey line,
//    "typing..." and then what they say as their bubble on the left; the two choices as replies on the right, each 44 px+, inside the screen;
//  - Pay sends your reply (a blue bubble on the right) and their answer comes back as a message (TOLL PAID's words), then one lime OK;
//    the scrap is paid; OK closes it; no second card for the outcome;
//  - everything said is kept (S.fac.toll.msgs) and the next time the thread opens it shows the earlier messages under a day;
//  - 3D.389: they write several short texts like a real chat, your choice shows what you text with its cost under it, every no gets an answer;
//    the old look keeps the old card.
// Pictures: runs/ui_samples/texts_<size>.png, texts_reply.png, texts_history.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); try { require('fs').appendFileSync('/tmp/texts_fail.txt', m + '\n'); } catch (e) {} } };
const clear = async (p) => { for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(150); } };
const waitO = (p) => p.waitForFunction(() => document.querySelector('.txO'), null, { timeout: 25000 }).then(() => p.waitForTimeout(350)).catch(() => {});
const box = (p) => p.evaluate(() => { const b = document.querySelector('#eventModal .txBox'); if (!b) return null; const r = b.getBoundingClientRect();
  return { x: r.x, y: r.y, r: r.right, b: r.bottom, vw: innerWidth, vh: innerHeight, head: b.querySelector('.txHd').innerText, face: !!b.querySelector('.txMood svg'),
    ctx: [...b.querySelectorAll('.txCtx')].map((x) => x.innerText), them: [...b.querySelectorAll('.txB.them:not(.txTy)')].map((x) => ({ t: x.innerText, l: x.getBoundingClientRect().x - r.x })),
    me: [...b.querySelectorAll('.txB.me')].map((x) => ({ t: x.innerText, rr: r.right - x.getBoundingClientRect().right })), days: [...b.querySelectorAll('.txDay')].map((x) => x.innerText),
    rep: [...b.querySelectorAll('.txO')].map((x) => { const q = x.getBoundingClientRect(); return { t: x.innerText, h: q.height, in: q.x >= r.x && q.right <= r.right + .5, cls: x.className, bg: getComputedStyle(x).backgroundColor }; }) }; });
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneXL', 430, 932]]) {
    const p = await Q.page(b, { w, h, look: '', expose: 'BUILD_TAG, STORY, fac, OPTS, saveOpts, applyLook, showMore, closeP' });
    await Q.newGame(p); await clear(p); await p.waitForTimeout(400);
    if (n === 'phone') ok(+String(await p.evaluate(() => ZH.BUILD_TAG)).split('.')[1] >= 388, 'build before 3D.388');
    const ty = await p.evaluate(() => { ZH.S.mat = 200; ZH.STORY.toll1.run(); return !!document.querySelector('.txTy') && !document.querySelector('.txB.them:not(.txTy)') && !document.querySelector('.txO'); });
    const t0 = await box(p); ok(!!t0, `${n}: no thread`); if (!t0) { await p.close(); continue; }
    ok(ty, `${n}: no "typing..." before their message`);
    await waitO(p); const t = await box(p);
    await p.screenshot({ path: path.join(out, `texts_${n}.png`) });
    ok(t.x >= 0 && t.r <= t.vw + .5 && t.y >= 0 && t.b <= t.vh + .5, `${n}: the thread leaves the screen`);
    ok(/The Toll Kings/.test(t.head) && /the Collector/.test(t.head) && t.face && /Neutral|Wary|Hostile|Friendly/.test(t.head), `${n}: the top: ${t.head.replace(/\n/g, ' | ')}`);
    ok(t.ctx.some((x) => /road-sign armour/.test(x)), `${n}: what happens is not a grey line: ${t.ctx}`);
    ok(t.them.length === 4 && /Toll Kings here/.test(t.them[0].t) && /scrap and your people/.test(t.them[1].t) && /pressure actually/.test(t.them[3].t) && t.them.every((x) => x.l < 20), `${n}: their texts, several short ones: ${JSON.stringify(t.them)}`);
    ok(t.rep.length === 2 && /^Fine\. \d+ scrap, coming over\.[\s\S]{0,4}−\d+$/.test(t.rep[0].t) && /^It's a public road\.\n?They will attack$/.test(t.rep[1].t) && t.rep.every((x) => x.h >= 44 && x.in), `${n}: the replies say what you text, the cost under it: ${JSON.stringify(t.rep)}`);
    if (n === 'phone') {
      const mat0 = await p.evaluate(() => ZH.S.mat);
      await p.click('.txO[data-i="0"]'); await p.waitForTimeout(150);
      const s1 = await box(p); ok(s1.me.length === 1 && /^Fine\. \d+ scrap, coming over\.$/.test(s1.me[0].t) && s1.me[0].rr < 20, `phone: your reply: ${JSON.stringify(s1)}`);
      await waitO(p); const s2 = await box(p); await p.screenshot({ path: path.join(out, 'texts_reply.png') });
      ok(s2.them.length === 7 && /pleasure doing business/.test(s2.them[4].t) && /no raids for 4 days/.test(s2.them[5].t) && /charge them too/.test(s2.them[6].t), `phone: their answer, facts first, joke last: ${JSON.stringify(s2.them.slice(4))}`);
      ok(s2.rep.length === 1 && s2.rep[0].t === 'OK' && s2.rep[0].bg === 'rgb(198, 255, 77)', `phone: one lime OK: ${JSON.stringify(s2.rep)}`);
      ok(await p.evaluate((m) => ZH.S.mat < m, mat0), 'phone: the toll was not paid');
      await p.click('.txOk'); await p.waitForTimeout(300);
      ok(await p.evaluate(() => !document.querySelector('#eventModal').innerHTML), 'phone: OK did not close, or a second card for the outcome');
      const msgs = await p.evaluate(() => ZH.fac('toll').msgs.map((x) => x.w)); ok(msgs.join() === 'ctx,them,them,them,them,me,them,them,them', `phone: the history: ${msgs}`);
      /* next day: the history shows */
      await p.evaluate(() => { ZH.S.day += 1; ZH.fac('toll').next = 0; ZH.STORY.toll1.run(); }); await waitO(p);
      const s3 = await box(p); await p.screenshot({ path: path.join(out, 'texts_history.png') });
      ok(s3.days.join() === 'Yesterday,Today' && s3.them.length === 11 && s3.me.length === 1, `phone: earlier messages: ${JSON.stringify(s3.days)} ${JSON.stringify(s3)}`);
      await p.click('.txO[data-i="1"]'); await waitO(p); await p.click('.txOk').catch(() => ok(false, 'phone: Refuse got no answer')); await clear(p);
      /* a reply with no answer closes by itself */
      await p.evaluate(() => { ZH.fac('green').att = 0; ZH.STORY.green1.run(); }); await p.waitForFunction(() => document.querySelector('.txO'), null, { timeout: 5000 }).catch(() => {}); await p.waitForTimeout(300);
      const g = await box(p); ok(!!g && /Greenwater/.test(g.head) && /Sister June/.test(g.head) && g.rep.length === 3, `phone: Greenwater thread: ${JSON.stringify(g)}`);
      await p.click('.txO[data-i="2"]'); await waitO(p);
      const g2 = await box(p); ok(g2 && /^Not today, sorry\.$/.test(g2.me[g2.me.length - 1].t) && /safe travels/.test(g2.them[g2.them.length - 1].t), `phone: Greenwater answers a no: ${g2 && JSON.stringify(g2.them.slice(-1))}`);
      await p.click('.txOk'); await p.waitForTimeout(300); ok(await p.evaluate(() => !document.querySelector('#eventModal .txBox')), 'phone: OK did not close Greenwater');
      /* the old look keeps the old card */
      await clear(p); await p.evaluate(() => { ZH.OPTS.look = 'glass'; ZH.saveOpts && ZH.saveOpts(); ZH.applyLook && ZH.applyLook(); ZH.fac('toll').next = 0; ZH.STORY.toll1.run(); }); await p.waitForTimeout(400);
      ok(await p.evaluate(() => !document.querySelector('.txBox') && /THE TOLL KINGS|Toll Kings/i.test(document.querySelector('#eventModal').innerText)), 'phone: the old look lost its card');
    }
    await p.close();
  }
  await b.close(); console.log(bad ? `texts_check: ${bad} FAIL` : 'texts_check: all passed'); process.exit(bad ? 1 : 0);
})();
