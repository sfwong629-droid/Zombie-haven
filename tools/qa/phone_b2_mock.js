// tools/qa/phone_b2_mock.js — UI chat, 23 Nov (W249, second round). Owner on the look-B pictures: "i think these circle should be colored"
// (the tab bar's icons) and "we should have the option be able to see the character half body shot for each character instead of the letter";
// and of the fun ideas: "i dont understand 7" (the town's rings). MOCKUP ONLY, nothing in the game changes.
// Pictures (runs/ui_samples/): phoneB2_tabs_{sticker,tint,badge}.png (the town screen with each tab bar), phoneB2_people.png,
// phoneB2_card.png, phoneB2_trip.png, phoneB2_item.png (the game's own pictures of the survivors in place of letters), phoneB2_townrings.png.
// Usage: node tools/qa/phone_b2_mock.js   (needs the game served on :8765)
const Q = require('./lib');
const { SCREEN } = require('./phone_b_mock');
const { MOCK: VALLEY } = require('./valley_map_mock');
(async () => {
  const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
  const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'ITEMS, invPic, itemRar, RARITY' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(2500); await Q.clearCards(p);
  /* the game's own survivor pictures: the People page's chest-up shot (ZH3D.portrait) and a half-body shot of the same 3D person */
  const faces = await p.evaluate(() => {
    const base = ZH.S.sv, by = {}; base.forEach((s) => { by[s.name] = s; });
    const extra = [['Rosa', 'Builder', 21, 'f'], ['Theo', 'Fighter', 22, 'm'], ['Ada', 'Mechanic', 23, 'f']];
    for (const [n, job, id, sex] of extra) { const c = { ...JSON.parse(JSON.stringify(base[0])), id, name: n, job }; delete c.look; ZHChars.look(c).sex = sex; by[n] = c; }   /* three more people for the list: their own looks, not copies */
    const gear = { Marcus: ['bat', 'kevlar', null], Amy: ['pistol', 'riot', null], Lena: ['bow', null, null], Ben: ['axe', null, 'hardhat'], Rosa: ['crowbar', null, 'hardhat'], Theo: ['machete', 'military', null], Ada: ['shotgun', 'kevlar', null] };
    for (const n of Object.keys(by)) { const [weapon, armor, head] = gear[n]; by[n] = { ...by[n], eq: { weapon, armor, head, acc: null } }; }
    /* owner, 23 Nov 10:26: "It should zoom out just be a bit more so you can see the weapon and armor": round spots from the hips up, the card from the knees up */
    const o = {}; for (const n of Object.keys(by)) o[n] = { bust: ZH3D.snap(by[n], { key: 'hipsup', W: 224, H: 224, half: .43, dy: .77 }), half: ZH3D.snap(by[n], { key: 'kneesup', W: 208, H: 256, half: .54, dy: .67 }), fem: ZH3D.isFem(by[n]) };
    return o; });
  console.log('faces', Object.entries(faces).map(([n, f]) => n + (f.fem ? ' f' : ' m') + (f.bust ? '' : ' NO BUST') + (f.half ? '' : ' NO HALF')).join(', '));
  const pics = await p.evaluate(async () => { for (let i = 0; i < 8; i++) { const u = ZH.invPic('crowbar', 160); if (u) return { crowbar: u, weapon: [], armor: [] }; await new Promise((r) => setTimeout(r, 200)); } return { crowbar: '', weapon: [], armor: [] }; });
  await p.click('#mExp'); await p.waitForTimeout(500); await p.evaluate(VALLEY, { look: 'gmap', scene: 'mid', card: '', mood: 'word' }); await p.waitForTimeout(300);
  const { mapHtml, mapCss } = await p.evaluate(() => ({ mapHtml: document.querySelector('.vmMap').innerHTML, mapCss: document.getElementById('vmStyle').textContent }));
  await p.evaluate(() => { document.getElementById('closeInfo') && document.getElementById('closeInfo').click(); });
  const shot = async (file, name, opt) => { await p.evaluate(SCREEN, { name, mapHtml, mapCss, pics, opt }); await p.waitForTimeout(350); await p.screenshot({ path: path.join(out, file) }); console.log('shot', file); };
  for (const t of ['sticker', 'tint', 'badge']) await shot(`phoneB2_tabs_${t}.png`, 'town', { tabs: t, faces });   /* owner, 10:26: "use A" (sticker) */
  if (process.env.PB2_BARS) { await shot('phoneB2_card_bars.png', 'card', { tabs: 'sticker', faces }); await shot('phoneB2_town_bars.png', 'townrings', { tabs: 'sticker', faces }); await b.close(); return; }
  /* PB2_MENUS (owner, 23 Nov 16:49: the frame-only sheet "doesn't have the iphone UI feel like you had for the previous mock up"): the five menus as full phone screens, with everything decided since: sticker tabs, pictures, bars with water, the Paused pill */
  if (process.env.PB2_MENUS) { for (const [n, f] of [['people', 'people'], ['card', 'person'], ['build', 'build'], ['townrings', 'town'], ['settings', 'settings']]) await shot(`phoneD_${f}.png`, n, { tabs: 'sticker', faces, paused: true }); await b.close(); return; }
  for (const n of ['people', 'card', 'trip', 'item']) await shot(`phoneB2_${n}.png`, n, { tabs: 'sticker', faces });
  await shot('phoneB2_townrings.png', 'townrings', { tabs: 'sticker', faces });
  await b.close();
})();
