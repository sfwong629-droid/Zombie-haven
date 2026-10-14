/* Zombie Haven characters + items. V7 art: tools/art/build_chars.py (people), build_zombies.py; items: tools/chars/items.py.
   ZHChars: per-job, per-sex sheets, animation table, per-sheet hand points, portraits.
   ZHItems: item icons (data URLs) and held-weapon overlay cells. */
(function () {
  'use strict';
  const V = (window.ZH_VERSION || '1');
  const SKINS = [[255, 214, 170], [236, 178, 128], [196, 132, 88], [132, 86, 58]];
  const HAIRS = [[74, 48, 30], [36, 30, 30], [226, 178, 84], [178, 72, 42], [230, 230, 220], [120, 80, 50], [60, 60, 70], [200, 110, 60]];
  const FEMALE = new Set(['Amy', 'Lena', 'Maya', 'June', 'Rosa', 'Iris', 'Mara', 'Hana', 'Lark', 'Quinn', 'Nora', 'Ivy', 'Wren', 'Juno', 'Tess', 'Bea', 'Dot', 'Fern', 'Sage', 'Lux', 'Cass', 'Sol']);
  const MALE = new Set(['Marcus', 'Ben', 'Noah', 'Eli', 'Theo', 'Omar', 'Dex', 'Ozzy', 'Vince', 'Rook', 'Finn', 'Kai', 'Milo', 'Pip', 'Remy', 'Zane', 'Ash', 'Rio', 'Cole', 'Hugo']);
  const sh = (c, f) => c.map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  let M = null, IM = null; const raw = {}, cache = new Map(), portraits = new Map();
  const img = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src + '?v=' + V; });
  const hash = (t) => { let h = 7; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

  function look(s) {   /* sex, skin tone and hair colour: stored on the survivor, picked once */
    if (!s.look) { const h = hash(s.name + (s.id || '')); s.look = { sex: FEMALE.has(s.name) ? 'f' : MALE.has(s.name) ? 'm' : (h % 2 ? 'f' : 'm'), skin: h % SKINS.length, hair: (h >> 3) % HAIRS.length }; }
    return s.look;
  }
  /* V7 (tools/art/build_chars.py): one hand-drawn sheet per job and sex, no recolouring; 42-px people on 96-px tiles */
  const JOBTAG = { Civilian: 'civ', Guard: 'guard', 'Police Officer': 'police', Medic: 'medic', Scavenger: 'scav', Engineer: 'eng', Cook: 'cook', Farmer: 'farm', Mechanic: 'mech', Paramedic: 'para', SWAT: 'swat', Raider: 'raider', Trader: 'trader' };
  function sheetTag(job, sex) { const j = JOBTAG[job] || 'civ'; return [j + '_' + sex, j + '_m', j + '_f', 'civ_' + sex].find((t) => raw[t]) || null; }
  function sheet(job, sex) { const t = sheetTag(job, sex || 'm'); return t ? raw[t] : null; }
  function sheetFor(s, job) { const L = look(s); return sheet(job || s.job, L.sex); }
  function portrait(s) {   /* head-and-shoulders crop of the front idle frame, 3x */
    if (!M) return null; const L = look(s), t = sheetTag(s.job, L.sex); if (!t) return null; let u = portraits.get(t); if (u) return u;
    const sc = raw[t], D = dims(sc), hp = D.h || 42 * D.res, k = hp / 42, c = document.createElement('canvas'), Z = 3, w = 30, h = 30; c.width = w * Z; c.height = h * Z;   /* the V7 crop (x 17, y 12 for a 42-px body) scaled to the sheet's body height */
    const x0 = Math.round(D.fw / 2 - 15 * k), y0 = Math.round(D.foot + 1 - hp - 3 * k);
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(sc, x0, y0, w * k, h * k, 0, 0, w * Z, h * Z); u = c.toDataURL(); portraits.set(t, u); return u;
  }
  const Items = { meta: null, icons: {}, held: null, idx: {} }; let ZM = null; const zim = {};
  async function load() {
    try { M = await (await fetch('assets/characters/v7/meta.json?v=' + V)).json(); } catch (e) { console.warn('char meta missing', e); return; }
    await loadCarts();
    await Promise.all(Object.entries(M.sheets).map(async ([k, f]) => { const im = await img('assets/characters/v7/' + f); if (im) { im.zhTag = k; raw[k] = im; } }));
    if (window.ZH_C64) await loadHD('c64'); else if (window.ZH_HD) await loadHD('hd');
    try { ZM = await (await fetch('assets/zombies/v7/meta.json?v=' + V)).json(); await Promise.all(Object.keys(ZM).map(async (k) => { zim[k] = await img('assets/zombies/v7/' + k + '.png'); })); } catch (e) { console.warn('zombie art missing', e); }
    try {
      Items.meta = await (await fetch('assets/items/items.json?v=' + V)).json(); const [ic, hd] = await Promise.all([img('assets/items/icons.png'), img('assets/items/held.png')]);
      const n = Items.meta.ic, Z = 2;
      Items.meta.icons.forEach((id, i) => { const c = document.createElement('canvas'); c.width = n * Z; c.height = n * Z; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; if (ic) g.drawImage(ic, i * n, 0, n, n, 0, 0, n * Z, n * Z); Items.icons[id] = c.toDataURL(); });
      Items.held = hd; Items.meta.weapons.forEach((w, i) => { Items.idx[w] = i; });
    } catch (e) { console.warn('items missing', e); }
  }
  /* V2.50 HD (V8) sheets (tools/art/build_hd_char.py, PixelLab animations): 2 sheet pixels per V7 pixel, their own frame table
     (walk 6 frames), drawn at half scale so they stand exactly where a V7 sheet stands. Opt-in preview: ?hd=1 (remembered; ?hd=0 to leave). */
  async function loadHD(dir) {   /* 'hd' (V8, half-size pixels) or 'c64' (V2.52: 58-px people at the normal pixel size) */
    let H = null; try { H = await (await fetch('assets/characters/' + dir + '/meta.json?v=' + V)).json(); } catch (e) { console.warn(dir + ' meta missing', e); return; }
    await Promise.all(Object.entries(H.sheets || {}).map(async ([k, e]) => { const d = H.defs[e.def], im = d && await img('assets/characters/' + dir + '/' + e.file);
      if (im) { im.zhTag = k; im.zhD = { res: d.res, fw: d.fw, fh: d.fh, foot: d.foot, frames: d.frames, wpose: d.wpose, hands: e.hands, h: e.h }; raw[k] = im; } }));
  }
  function dims(sheetIm) {   /* frame box, feet row, resolution and animation table of one sheet (V7 sheets share the global table) */
    if (sheetIm && sheetIm.zhD) return sheetIm.zhD;
    return { res: 1, fw: M.fw, fh: M.fh, foot: M.foot, frames: M.frames, wpose: M.wpose, hands: M.hands[sheetIm && sheetIm.zhTag] || M.hands[Object.keys(M.hands)[0]] };
  }
  /* V2.33 rescue carts (tools/art/build_carts.py): a survivor pushing a hand cart; the injured person is drawn lying in it */
  let CM = null; const carts = {}, lieBox = {};
  async function loadCarts() { try { CM = await (await fetch('assets/characters/v7/cart/meta.json?v=' + V)).json(); await Promise.all(Object.keys(CM.beds).map(async (t) => { const im = await img('assets/characters/v7/cart/' + t + '.png'); if (im) carts[t] = im; })); } catch (e) { CM = null; } }
  function lying(sheetIm) {   /* bbox centre of the 'lying' collapse frame on the front row (cached per sheet) */
    const t = sheetIm.zhTag; if (lieBox[t]) return lieBox[t]; const D = dims(sheetIm), f = D.frames.collapse[0] + 3, c = document.createElement('canvas'); c.width = D.fw; c.height = D.fh;
    const g = c.getContext('2d'); g.drawImage(sheetIm, f * D.fw, 0, D.fw, D.fh, 0, 0, D.fw, D.fh); const d = g.getImageData(0, 0, D.fw, D.fh).data; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < D.fh; y++) for (let x = 0; x < D.fw; x++) if (d[(y * D.fw + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return (lieBox[t] = { f, cx: (x0 + x1 + 1) / 2, cy: y1 + 1 });
  }
  function cart(tag, sex) { if (!CM) return null; const t = [tag, 'civ_' + (sex || 'm'), 'civ_m'].find((k) => carts[k]); return t ? { im: carts[t], beds: CM.beds[t], m: CM, key: 'cart' + t } : null; }
  window.ZHChars = {
    cart, lying, dims,
    load, look, sheetFor, sheet, portrait, get meta() { return M; }, get ready() { return !!M; },
    frame(anim, i, sheetIm) { const a = dims(sheetIm).frames[anim]; return a[0] + (i % a[1]); }, count(anim, sheetIm) { return dims(sheetIm).frames[anim][1]; },
    hand(view, f, tag) { const im = raw[tag]; return dims(im || { zhTag: tag }).hands[view][f]; }, wpose(f, sheetIm) { return dims(sheetIm).wpose[f]; },
    get hdSheets() { return Object.keys(raw).filter((k) => raw[k].zhD); },
    zmeta: (t) => ZM && ZM[t], zsheet: (t) => zim[t] || null,
  };
  window.ZHItems = {
    icon: (id) => Items.icons[id] || null, get held() { return Items.held; }, has: (w) => w in Items.idx,
    cell(w, pose) { const m = Items.meta; if (!m || !(w in Items.idx)) return null; const c = m.poses.indexOf(pose); return c < 0 ? null : { x: c * m.hc, y: Items.idx[w] * m.hc, s: m.hc }; },
  };
})();
