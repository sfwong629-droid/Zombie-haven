/* Zombie Haven — isometric geometry (single source of truth).
 *
 * Master tile: approved grass diamond, 1440x960 => TH/TW = 2/3, edge angle atan(2/3) = 33.690 deg.
 * World coordinates are TILE UNITS (floats). Tile (x,y) covers [x,x+1] x [y,y+1].
 *   north corner = (x,y)   east corner = (x+1,y)   south corner = (x+1,y+1)   west corner = (x,y+1)
 * screen = origin + ((wx-wy)*TW/2, (wx+wy)*TH/2) * zoom
 * A building footprint is (x,y,w,h) in whole tiles. Its ANCHOR is the SOUTH ground-contact corner
 * (x+w, y+h). Sprites, ghost, hit-tests, collision, depth sort and saves all use that definition.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZHIso = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const MASTER = { w: 1440, h: 960 };
  const RATIO = MASTER.h / MASTER.w; // 2/3
  const ANGLE_DEG = Math.atan(RATIO) * 180 / Math.PI; // 33.690...

  function make(TW) {
    const TH = TW * RATIO;
    return {
      TW, TH,
      plane(wx, wy) { return { x: (wx - wy) * TW / 2, y: (wx + wy) * TH / 2 }; },
      unplane(px, py) { const a = px / (TW / 2), b = py / (TH / 2); return { x: (a + b) / 2, y: (b - a) / 2 }; },
    };
  }

  function footprintCorners(b) {
    return {
      north: { x: b.x, y: b.y },
      east: { x: b.x + b.w, y: b.y },
      south: { x: b.x + b.w, y: b.y + b.h }, // ANCHOR
      west: { x: b.x, y: b.y + b.h },
    };
  }
  const southAnchor = (b) => ({ x: b.x + b.w, y: b.y + b.h });
  // placement convention: the tapped tile is the footprint's SOUTH-MOST tile
  const originFromSouthTile = (tx, ty, w, h) => ({ x: tx - (w - 1), y: ty - (h - 1) });
  const footprintContains = (b, wx, wy) => wx >= b.x && wx < b.x + b.w && wy >= b.y && wy < b.y + b.h;
  const rectsOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  /* Painter ordering. Items are axis-aligned footprints {x1,y1,x2,y2} in tile units
   * (units/props are tiny boxes around their feet). The viewer sits at +x,+y.
   * A is BEHIND B when A lies entirely on the lower-x or lower-y side of B. */
  function behind(A, B) { return A.x2 <= B.x1 + 1e-6 || A.y2 <= B.y1 + 1e-6; }
  function sortDrawables(items) {
    const n = items.length, indeg = new Array(n).fill(0), out = items.map(() => []);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = items[i], b = items[j], ab = behind(a, b), ba = behind(b, a);
      if (ab && !ba) { out[i].push(j); indeg[j]++; } else if (ba && !ab) { out[j].push(i); indeg[i]++; }
      else if (!ab && !ba) {
        if (a.x2 + a.y2 <= b.x2 + b.y2) { out[i].push(j); indeg[j]++; } else { out[j].push(i); indeg[i]++; }
      }
    }
    const key = (it) => it.x2 + it.y2 + (it.bias || 0);
    const ready = [], res = [], done = new Array(n).fill(false);
    for (let i = 0; i < n; i++) if (!indeg[i]) ready.push(i);
    while (res.length < n) {
      if (!ready.length) {
        let m = -1; for (let i = 0; i < n; i++) if (!done[i] && (m < 0 || indeg[i] < indeg[m] || (indeg[i] === indeg[m] && key(items[i]) < key(items[m])))) m = i;
        indeg[m] = 0; ready.push(m);
      }
      let bi = 0; for (let k = 1; k < ready.length; k++) if (key(items[ready[k]]) < key(items[ready[bi]])) bi = k;
      const i = ready.splice(bi, 1)[0]; if (done[i]) continue; done[i] = true; res.push(items[i]);
      for (const j of out[i]) if (--indeg[j] === 0 && !done[j]) ready.push(j);
    }
    return res;
  }

  return { MASTER, RATIO, ANGLE_DEG, make, footprintCorners, southAnchor, originFromSouthTile, footprintContains, rectsOverlap, sortDrawables };
});
