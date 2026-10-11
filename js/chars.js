/* Zombie Haven V3 characters + items (art from tools/chars/gen.py and tools/chars/items.py).
   ZHChars: per-survivor recoloured sheets (skin + hair keys), animation table, hand points, portraits.
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
  function keyMap(skin, hair) {
    const k = new Map(), S = SKINS[skin], H = HAIRS[hair];
    [[[255, 0, 200], 1.08], [[230, 0, 180], 1], [[200, 0, 160], .86], [[170, 0, 140], .72]].forEach(([c, f]) => k.set(c.join(), sh(S, f)));
    k.set([255, 0, 120].join(), [240, 120, 120]);
    [[[0, 255, 200], 1.3], [[0, 220, 170], 1], [[0, 185, 140], .78], [[0, 150, 115], .6]].forEach(([c, f]) => k.set(c.join(), sh(H, f)));
    return k;
  }
  function sheetKey(job, sex) { if (M.sheets[job + '|' + sex]) return job + '|' + sex; if (M.sheets[job + '|m']) return job + '|m'; return 'Civilian|' + sex; }
  function sheet(job, sex, skin, hair) {   /* recoloured once per look, kept */
    const sk = sheetKey(job, sex), key = sk + '|' + skin + '|' + hair; let c = cache.get(key); if (c) return c;
    const im = raw[sk]; if (!im) return null;
    c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), p = d.data, km = keyMap(skin, hair);
    for (let i = 0; i < p.length; i += 4) if (p[i + 3]) { const r = km.get(p[i] + ',' + p[i + 1] + ',' + p[i + 2]); if (r) { p[i] = r[0]; p[i + 1] = r[1]; p[i + 2] = r[2]; } }
    g.putImageData(d, 0, 0); c.complete = true; c.naturalWidth = c.width; cache.set(key, c); return c;
  }
  function sheetFor(s, job) { const L = look(s); return sheet(job || s.job, L.sex, L.skin, L.hair); }
  function portrait(s) {   /* head-and-shoulders crop of the idle frame, 3x */
    if (!M) return null; const L = look(s), key = s.job + L.sex + L.skin + L.hair; let u = portraits.get(key); if (u) return u;
    const sc = sheetFor(s); if (!sc) return null; const c = document.createElement('canvas'), Z = 3, x0 = 10, y0 = 7, w = 22, h = 22; c.width = w * Z; c.height = h * Z;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(sc, x0, y0, w, h, 0, 0, w * Z, h * Z); u = c.toDataURL(); portraits.set(key, u); return u;
  }
  const Items = { meta: null, icons: {}, held: null, idx: {} }; let ZM = null; const zim = {};
  async function load() {
    try { M = await (await fetch('assets/characters/v6/meta.json?v=' + V)).json(); } catch (e) { console.warn('char meta missing', e); return; }
    await Promise.all(Object.entries(M.sheets).map(async ([k, f]) => { raw[k] = await img('assets/characters/v6/' + f); }));
    try { ZM = await (await fetch('assets/zombies/v6/meta.json?v=' + V)).json(); await Promise.all(Object.keys(ZM).map(async (k) => { zim[k] = await img('assets/zombies/v6/' + k + '.png'); })); } catch (e) { console.warn('zombie art missing', e); }
    try {
      Items.meta = await (await fetch('assets/items/items.json?v=' + V)).json(); const [ic, hd] = await Promise.all([img('assets/items/icons.png'), img('assets/items/held.png')]);
      const n = Items.meta.ic, Z = 2;
      Items.meta.icons.forEach((id, i) => { const c = document.createElement('canvas'); c.width = n * Z; c.height = n * Z; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; if (ic) g.drawImage(ic, i * n, 0, n, n, 0, 0, n * Z, n * Z); Items.icons[id] = c.toDataURL(); });
      Items.held = hd; Items.meta.weapons.forEach((w, i) => { Items.idx[w] = i; });
    } catch (e) { console.warn('items missing', e); }
  }
  window.ZHChars = {
    load, look, sheetFor, sheet, portrait, get meta() { return M; }, get ready() { return !!M; },
    frame(anim, i) { const a = M.frames[anim]; return a[0] + (i % a[1]); }, count(anim) { return M.frames[anim][1]; },
    hand(view, f) { return M.hand[view][f]; }, wpose(f) { return M.wpose[f]; },
    zmeta: (t) => ZM && ZM[t], zsheet: (t) => zim[t] || null,
  };
  window.ZHItems = {
    icon: (id) => Items.icons[id] || null, get held() { return Items.held; }, has: (w) => w in Items.idx,
    cell(w, pose) { const m = Items.meta; if (!m || !(w in Items.idx)) return null; const c = m.poses.indexOf(pose); return c < 0 ? null : { x: c * m.hc, y: Items.idx[w] * m.hc, s: m.hc }; },
  };
})();
