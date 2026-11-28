/* Zombie Haven characters + items.
   ZHChars: a survivor's look (sex, skin tone, hair colour), picked once and stored on the survivor. The 3D renderer draws the people.
   ZHItems: item icons (data URLs) from the pixel icon sheet, the fallback for items that have no drawn SVG icon (js/itemicons.js).
   3D.129: the 2D sprite sheets, carts, zombie sheets, hand points and sheet portraits are gone with the 2D renderer. */
(function () {
  'use strict';
  const V = (window.ZH_VERSION || '1');
  const SKINS = 4, HAIRS = 8;   /* how many skin tones and hair colours the renderer has */
  const FEMALE = new Set(['Amy', 'Lena', 'Maya', 'June', 'Rosa', 'Iris', 'Mara', 'Hana', 'Lark', 'Quinn', 'Nora', 'Ivy', 'Wren', 'Juno', 'Tess', 'Bea', 'Dot', 'Fern', 'Sage', 'Lux', 'Cass', 'Sol']);
  const MALE = new Set(['Marcus', 'Ben', 'Noah', 'Eli', 'Theo', 'Omar', 'Dex', 'Ozzy', 'Vince', 'Rook', 'Finn', 'Kai', 'Milo', 'Pip', 'Remy', 'Zane', 'Ash', 'Rio', 'Cole', 'Hugo']);
  const img = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src + '?v=' + V; });
  const hash = (t) => { let h = 7; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  function look(s) {   /* sex, skin tone and hair colour: stored on the survivor, picked once */
    if (!s.look) { const h = hash(s.name + (s.id || '')); s.look = { sex: FEMALE.has(s.name) ? 'f' : MALE.has(s.name) ? 'm' : (h % 2 ? 'f' : 'm'), skin: h % SKINS, hair: (h >> 3) % HAIRS }; }
    return s.look;
  }
  const Items = { meta: null, icons: {} };
  async function load() {
    try {
      Items.meta = await (await fetch('assets/items/items.json?v=' + V)).json(); const ic = await img('assets/items/icons.png');
      const n = Items.meta.ic, Z = 2;
      Items.meta.icons.forEach((id, i) => { const c = document.createElement('canvas'); c.width = n * Z; c.height = n * Z; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; if (ic) g.drawImage(ic, i * n, 0, n, n, 0, 0, n * Z, n * Z); Items.icons[id] = c.toDataURL(); });
    } catch (e) { console.warn('items missing', e); }
  }
  window.ZHChars = { load, look };
  window.ZHItems = { icon: (id) => Items.icons[id] || null };
})();
