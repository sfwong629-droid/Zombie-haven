// tools/qa/raider_note_check.js — bug A5 (3D.178): the "New: Raiders" field note must show a raider, not a zombie.
// The note is stored with the zombie notes (key z:raider), and the card used to draw a zombie picture for it; "raider" is
// not a zombie model, so the picture fell back to the plain walker. Opens the note in a new game and checks that its picture
// is the raider picture (in the Toll Kings' kit) and is not the picture the zombie drawer makes for "raider". Optional: a file name to save the card.
// Exit 0 ok, 1 the note shows the zombie picture (or no picture), 2 the note could not be opened.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'intro' }); await Q.newGame(p); await Q.clearCards(p);
  await p.waitForFunction(() => ZH3D.armorsReady(), null, { timeout: 120000 }).catch(() => {});   // the raider wears the Toll Kings' kit once that model is in
  const r = await p.evaluate(() => { ZH.S.introOff = false; if (ZH.S.intro) delete ZH.S.intro['z:raider']; ZH.intro('z:raider');
    const box = [...document.querySelectorAll('#eventModal .evBox')].find((e) => /RAIDERS/.test(e.textContent)), img = box && box.querySelector('img');
    const src = img ? img.src : null, z = ZH3D.zombieIso('raider'), w = ZH3D.zombieIso('walker'), rd = ZH3D.raiderIso ? ZH3D.raiderIso() : null;
    return { card: !!box, pic: !!src, isRaider: !!src && src === rd, isZombie: !!src && (src === z || src === w), kit: ZH3D.armor3d('toll') }; });
  console.log(JSON.stringify(r)); if (!r.card) { console.log('could not open the Raiders note'); await b.close(); process.exit(2); }
  if (process.argv[2]) { await p.waitForTimeout(800); await Q.shot(p, process.argv[2]); }
  const bad = !r.pic || !r.isRaider || r.isZombie || !r.kit; console.log(bad ? 'FAIL (bug A5): the Raiders note does not show the raider picture' : 'ok: the Raiders note shows a raider');
  if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad ? 1 : 0); })();
