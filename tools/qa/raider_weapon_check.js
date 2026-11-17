// tools/qa/raider_weapon_check.js — 3D.187 (owner, W33 and W55): in the town each kind of raider carries its own weapon, one step better per era.
//   Thief: knife, cleaver, machete, katana.  Brute: nail bat, spiked club, sledgehammer, fire axe.  Firebug: pipe, crowbar, hatchet, spear.
// It used to be a random one of five (bat, knife, crowbar, pistol, machete), picked when the raider first came on screen.
// For a town level in each era, sends raids until all three kinds have come and checks every raider's weapon against the table,
// that each weapon has a model of its own, and that the "New: Raiders" note shows the weapon of the raider that came.
// Optional: a file name to save a picture of an era IV raid. Exit 0 ok, 1 a check failed, 2 the raids could not be made.
const Q = require('./lib');
const T = { thief: ['knife', 'cleaver', 'machete', 'katana'], brute: ['nailbat', 'spiked', 'sledge', 'axe'], firebug: ['pipe', 'crowbar', 'hatchet', 'spear'] };
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'spawnRaid, intro' }); await Q.newGame(p); await Q.clearCards(p);
  await p.waitForFunction(() => ZH3D.armorsReady(), null, { timeout: 120000 }).catch(() => {});
  const bad = []; let made = 0;
  for (const [era, lvl] of [[0, 3], [1, 8], [2, 13], [3, 18]]) {
    const r = await p.evaluate(({ lvl }) => { const S = ZH.S; S.lvl = lvl; S.day = Math.max(S.day, 8); const out = [];
      for (let i = 0; i < 40; i++) { const n0 = S.z.length; ZH.spawnRaid('toll', i % 7 === 6); for (const z of S.z.slice(n0)) out.push([z.kind, z.wpn || null, !!z.leader]); S.z.length = n0; }
      return out; }, { lvl });
    made += r.length; const kinds = new Set(r.map((x) => x[0])), wrong = r.filter((x) => x[1] !== T[x[0]][era]);
    console.log('era ' + (era + 1) + ' (level ' + lvl + '): ' + r.length + ' raiders, kinds ' + [...kinds].sort().join(' ') + ', weapons ' + [...new Set(r.map((x) => x[0] + '=' + x[1]))].sort().join(' '));
    if (kinds.size < 3) bad.push('era ' + (era + 1) + ': not all three kinds came'); if (wrong.length) bad.push('era ' + (era + 1) + ': ' + wrong.length + ' raiders with the wrong weapon, e.g. ' + wrong[0].join(' '));
  }
  if (!made) { console.log('no raiders were made'); await b.close(); process.exit(2); }
  const models = await p.evaluate((ids) => ids.filter((i) => ZH3D.wModel(i) !== i), [].concat(...Object.values(T)));
  if (models.length) bad.push('no model of its own for: ' + models.join(' '));
  const note = await p.evaluate(() => { const S = ZH.S; S.lvl = 18; S.introOff = false; if (S.intro) delete S.intro['z:raider']; const n0 = S.z.length; ZH.spawnRaid('toll'); const z = S.z[n0]; ZH.intro('z:raider');
    const box = [...document.querySelectorAll('#eventModal .evBox')].find((e) => /RAIDERS/.test(e.textContent)), img = box && box.querySelector('img'); return { wpn: z.wpn, kind: z.kind, card: !!img, same: !!img && img.src === ZH3D.raiderIso(z.wpn), bat: !!img && img.src === ZH3D.raiderIso('bat') }; });
  console.log('note:', JSON.stringify(note)); if (!note.card || !note.same || note.bat) bad.push('the Raiders note does not show the weapon of the raider that came');
  if (process.argv[2]) { await p.waitForTimeout(800); await Q.shot(p, process.argv[2]); }
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: town raiders carry the weapon of their kind and era'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0); })();
