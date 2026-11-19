// tools/qa/radio_open_check.js — 3D.228 (owner, 19 Nov, bug): tapping a radio message shows the message. It used to jump straight
// to where the message pointed (the morning show's tip opened Upgrade Town) and the words were never shown.
// Sends a message that points somewhere and one that doesn't; taps each card. The first must open a card with its words, a lime
// Show me and an OK, and must not jump until Show me is tapped; the second opens its words with OK only. Exit 0 ok, 1 failed, 2 no card.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'radio' }); await Q.newGame(p); await Q.clearCards(p); const out = [];
  const card = () => p.evaluate(() => { const el = document.getElementById('radioCard'); return el ? { open: el.classList.contains('in'), talk: el.classList.contains('talk'), t: el.textContent } : null; });
  const waitFor = async (re) => { for (let i = 0; i < 100; i++) { await p.waitForTimeout(300); await Q.clearCards(p); const c = await card(); if (c && c.open && !c.talk && re.test(c.t)) return true; if (c && c.open && !c.talk) await p.evaluate(() => { const x = document.querySelector('#radioCard .rcX'); if (x) x.click(); }); } return false; };
  await p.evaluate(() => { window.__jumped = 0; ZH.radio('dj', 'Pointer test: the barrels are low.', { key: 'qaA', act: () => { window.__jumped++; } }); });
  if (!(await waitFor(/Pointer test/))) { console.log('no card'); await b.close(); process.exit(2); }
  await p.evaluate(() => document.getElementById('radioCard').click()); await p.waitForTimeout(400);
  const a = await p.evaluate(() => { const box = document.querySelector('#eventModal .evBox'); return { jumped: window.__jumped, text: box ? box.textContent : '', btns: box ? [...box.querySelectorAll('button')].map((x) => [x.textContent.trim(), x.classList.contains('go')]) : [] }; });
  if (a.jumped) out.push('the tap jumped before the message was read'); if (!/barrels are low/.test(a.text)) out.push('the message was not shown');
  if (!a.btns.some(([t, g]) => t === 'Show me' && g)) out.push('no lime Show me'); if (!a.btns.some(([t]) => t === 'OK')) out.push('no OK');
  await p.evaluate(() => { const s = [...document.querySelectorAll('#eventModal .evBox button')].find((x) => x.textContent.trim() === 'Show me'); if (s) s.click(); }); await p.waitForTimeout(300);
  if ((await p.evaluate(() => window.__jumped)) !== 1) out.push('Show me did not go there');
  await p.evaluate(() => ZH.radio('dj', 'Plain test: nothing to see here.', { key: 'qaB' }));
  if (!(await waitFor(/Plain test/))) { console.log('no second card'); await b.close(); process.exit(2); }
  await p.evaluate(() => document.getElementById('radioCard').click()); await p.waitForTimeout(400);
  const c2 = await p.evaluate(() => { const box = document.querySelector('#eventModal .evBox'); return { text: box ? box.textContent : '', btns: box ? [...box.querySelectorAll('button')].map((x) => x.textContent.trim()) : [] }; });
  if (!/nothing to see here/.test(c2.text)) out.push('the plain message was not shown'); if (c2.btns.join() !== 'OK') out.push('plain message buttons: ' + c2.btns.join(', '));
  console.log(out.length ? 'FAIL ' + out.join('; ') : 'PASS: tapping a radio message shows it; Show me goes there; a plain message has OK only');
  await b.close(); process.exit(out.length ? 1 : 0); })();
