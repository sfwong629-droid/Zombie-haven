/* Zombie Haven — procedural pixel-art buildings (V2.25).
   Draws every building type in true pixel art on the 2:1 grid (one tile = 42 x 21 art px), darker
   post-apocalyptic palette. Used for any building that has no hand-made/AI-made sprite yet, so the
   whole town always shares one pixel size and one angle. Returns { im: canvas, ax, ay } where
   (ax, ay) is the SOUTH ground corner in art px. */
(function () {
  const TX = 21, TY = 10.5, ZS = 1.55;   // half tile in art px; ZS = height scale (DV2-like tall buildings next to 30-px people)
  const PAL = {
    outline: '#1b1713', wallA: '#6e5b47', wallB: '#5a4a3a', wallC: '#4a3d31', plankLine: '#3e3329',
    stoneA: '#7a7670', stoneB: '#64615b', stoneC: '#504d48',
    window: '#e8c46a', windowDark: '#3a3530', door: '#2e241c',
    roofs: { red: ['#7a3a2c', '#5e2c22', '#46201a'], slate: ['#4c5868', '#3c4654', '#2e3641'], rust: ['#7a5230', '#5f3f25', '#47301c'], moss: ['#4d6440', '#3c4f32', '#2e3d27'], grey: ['#6c6a64', '#57554f', '#43413c'], tarp: ['#5d6b4a', '#4a563a', '#38412c'] },
    soil: ['#4a3828', '#3d2e21', '#57422f'], crop: ['#5f8a3a', '#4c7330', '#77a048'], fence: '#6b5038', water: ['#3f6f86', '#335b6e', '#6aa0b8'],
    canvasA: '#cfc6b4', canvasB: '#b2a993', redCross: '#a8302a', metal: ['#8a8d8f', '#6d7072', '#505355'], target: ['#c8b89a', '#a8302a'],
  };
  const KIND = {
    house: { k: 'box', wall: 13, roof: 'red', rh: 11, win: 1, icon: null, wood: true },
    water: { k: 'tank' }, well: { k: 'well' },
    farm: { k: 'plot', crop: true }, field: { k: 'plot', crop: true, barn: true },
    medic: { k: 'tent' }, clinic: { k: 'box', wall: 15, roof: 'slate', rh: 9, win: 2, icon: 'cross' },
    hospital: { k: 'box', wall: 22, roof: 'slate', rh: 9, win: 3, icon: 'cross', stone: true, flat: true },
    canteen: { k: 'box', wall: 14, roof: 'rust', rh: 10, win: 2, icon: 'cup', awning: true, wood: true },
    armory: { k: 'box', wall: 15, roof: 'grey', rh: 9, win: 1, icon: 'sword', stone: true },
    workshop: { k: 'box', wall: 15, roof: 'rust', rh: 10, win: 1, icon: 'gear', wood: true, chimney: true },
    storage: { k: 'box', wall: 13, roof: 'grey', rh: 8, win: 0, icon: 'crate', wood: true },
    scrapyard: { k: 'yard', piles: true },
    gym: { k: 'box', wall: 13, roof: 'moss', rh: 9, win: 1, icon: 'dumbbell', wood: true },
    library: { k: 'box', wall: 15, roof: 'slate', rh: 11, win: 2, icon: 'book', stone: true },
    lounge: { k: 'box', wall: 13, roof: 'red', rh: 9, win: 2, icon: 'heart', wood: true, awning: true },
    range: { k: 'yard', targets: true }, track: { k: 'yard', hurdles: true }, sparring: { k: 'yard', ring: true },
    barracks: { k: 'box', wall: 16, roof: 'tarp', rh: 10, win: 3, icon: 'shield', wood: true },
  };
  const ICON = {   // 5x5 emblems ('#' = mark)
    cross: ['.###.', '#####', '#####', '#####', '.###.'].map((r, i) => (i === 0 || i === 4 ? '..#..' : i === 2 ? '#####' : '..#..')),
    cup: ['#...#', '#...#', '.###.', '..#..', '.###.'], sword: ['....#', '...#.', '#.#..', '.#...', '#.#..'], gear: ['.#.#.', '#####', '##.##', '#####', '.#.#.'],
    crate: ['#####', '##.##', '#.#.#', '##.##', '#####'], dumbbell: ['#...#', '#####', '#...#', '.....', '.....'], book: ['.###.', '#.#.#', '#.#.#', '#.#.#', '.###.'],
    heart: ['##.##', '#####', '#####', '.###.', '..#..'], shield: ['#####', '#####', '#####', '.###.', '..#..'],
  };
  function make(type, w, h) {
    const K = KIND[type] || KIND.house, top = 72, W = (w + h) * TX + 4, H = top + (w + h) * TY + 4;
    const cv = document.createElement('canvas'); cv.width = Math.ceil(W); cv.height = Math.ceil(H); const g = cv.getContext('2d');
    const ox = h * TX + 2, oy = top;
    const P = (x, y, z = 0) => [ox + (x - y) * TX, oy + (x + y) * TY - z * ZS];
    const poly = (pts, col) => { g.beginPath(); g.moveTo(...P(...pts[0])); for (const p of pts.slice(1)) g.lineTo(...P(...p)); g.closePath(); g.fillStyle = col; g.fill(); };
    const line = (a, b, col) => { g.beginPath(); g.moveTo(...P(...a)); g.lineTo(...P(...b)); g.strokeStyle = col; g.lineWidth = 1; g.stroke(); };
    const px = (x, y, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), 1, 1); };
    const ground = (col = PAL.soil[0]) => poly([[0, 0], [w, 0], [w, h], [0, h]], col);
    const box = (x0, y0, x1, y1, z0, z1, cs) => {   // axis-aligned block from (x0,y0) to (x1,y1), height z0..z1; cs = [top, south, east]
      poly([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], cs[1]); poly([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], cs[2]); poly([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], cs[0]); };
    const icon = (name, cx, cy, col) => { const I = ICON[name]; if (!I) return; I.forEach((r, j) => [...r].forEach((c, i) => { if (c === '#') px(cx - 2 + i, cy - 2 + j, col); })); };
    if (K.k === 'box') {
      const wh = K.wall, rh = K.flat ? 3 : K.rh, roof = PAL.roofs[K.roof], st = K.stone ? [PAL.stoneA, PAL.stoneB, PAL.stoneC] : [PAL.wallA, PAL.wallB, PAL.wallC];
      ground('#3a3328');
      box(0.06, 0.06, w - .06, h - .06, 0, wh, [st[0], st[1], st[2]]);
      // siding lines on the two visible walls
      for (let z = 3; z < wh; z += 3) { line([0.06, h - .06, z], [w - .06, h - .06, z], K.stone ? '#55524c' : PAL.plankLine); line([w - .06, 0.06, z], [w - .06, h - .06, z], K.stone ? '#46433e' : '#352c24'); }
      if (K.flat) { box(0, 0, w, h, wh, wh + 3, [roof[0], roof[1], roof[2]]); }
      else {   // gable roof, ridge along x
        const zt = wh + rh, m = .0;
        poly([[-m, -0.12, wh], [w + m, -0.12, wh], [w + m, h / 2, zt], [-m, h / 2, zt]], roof[1]);
        poly([[-m, h / 2, zt], [w + m, h / 2, zt], [w + m, h + .12, wh], [-m, h + .12, wh]], roof[0]);
        poly([[w - .06, -0.06, wh], [w - .06, h - .06, wh], [w - .06, h / 2, zt - 1]], st[2]);
        for (let i = 1; i < 4; i++) { const t = i / 4; line([-m, h / 2 + t * (h / 2 + .12), zt - t * rh], [w + m, h / 2 + t * (h / 2 + .12), zt - t * rh], roof[2]); }
        line([-m, h / 2, zt], [w + m, h / 2, zt], roof[2]);
      }
      if (K.chimney) box(w * .7, h * .25, w * .7 + .18, h * .25 + .18, wh, wh + rh + 6, ['#5a5550', '#4a4540', '#3a3632']);
      if (K.awning) poly([[w * .15, h - .06, wh * .62], [w * .85, h - .06, wh * .62], [w * .85, h + .35, wh * .45], [w * .15, h + .35, wh * .45]], '#7a4a2a');
      // door (south wall) and windows
      const d = (w / 2), [dx, dy] = P(d, h - .06, 0); g.fillStyle = PAL.door; g.fillRect(Math.round(dx - 3), Math.round(dy - 8), 5, 8);
      const nw = K.win || 0; for (let i = 0; i < nw; i++) { const t = (i + 1) / (nw + 1), [wx, wy] = P(w - .06, t * h, wh * .55); g.fillStyle = PAL.windowDark; g.fillRect(Math.round(wx - 2), Math.round(wy - 2), 3, 4); g.fillStyle = PAL.window; g.fillRect(Math.round(wx - 1), Math.round(wy - 1), 1, 2); }
      if (K.icon) { const [ix, iy] = P(d + Math.min(.6, w * .3), h - .06, wh * .62); icon(K.icon, ix, iy, '#d9c48a'); }
    } else if (K.k === 'plot') {
      ground(PAL.soil[0]);
      for (let r = 0; r < h * 4; r++) { const y = (r + .5) / 4; line([0.15, y, 0], [w - .15, y, 0], r % 2 ? PAL.soil[1] : PAL.soil[2]); if (r % 2 === 0) for (let c = 0; c < w * 6; c++) { const [cx, cy] = P((c + .5) / 6, y, 0); px(cx, cy - 1, PAL.crop[(c + r) % 3]); px(cx, cy - 2, PAL.crop[(c + r + 1) % 3]); } }
      for (const [a, b] of [[[0, 0], [w, 0]], [[w, 0], [w, h]], [[0, h], [w, h]], [[0, 0], [0, h]]]) { line([...a, 3], [...b, 3], PAL.fence); }
      if (K.barn) box(w * .55, .1, w - .1, h * .45, 0, 14, ['#6e2f2a', '#5a3a2c', '#46302a']);
    } else if (K.k === 'tank') {
      ground('#3a3328');
      for (const [x, y] of [[.2, .2], [.8, .2], [.8, .8], [.2, .8]]) box(x - .04, y - .04, x + .04, y + .04, 0, 12, ['#5a4632', '#5a4632', '#47372a']);
      box(.18, .18, .82, .82, 12, 14, ['#6b5038', '#5a4632', '#47372a']);
      box(.3, .3, .7, .7, 14, 25, [PAL.water[2], PAL.water[0], PAL.water[1]]);
      for (let z = 17; z < 25; z += 4) line([.3, .7, z], [.7, .7, z], '#284a5a');
    } else if (K.k === 'well') {
      ground('#3a3328'); box(.22, .22, .78, .78, 0, 7, [PAL.water[1], PAL.stoneB, PAL.stoneC]); box(.3, .3, .7, .7, 6.5, 7, [PAL.water[0], PAL.water[0], PAL.water[0]]);
      box(.2, .45, .26, .55, 7, 20, ['#5a4632', '#5a4632', '#47372a']); box(.74, .45, .8, .55, 7, 20, ['#5a4632', '#5a4632', '#47372a']);
      poly([[.12, .3, 20], [.88, .3, 20], [.88, .5, 25], [.12, .5, 25]], PAL.roofs.red[1]); poly([[.12, .5, 25], [.88, .5, 25], [.88, .7, 20], [.12, .7, 20]], PAL.roofs.red[0]);
    } else if (K.k === 'tent') {
      ground('#3a3328'); const zt = 20;
      poly([[.1, .1, 0], [.9, .1, 0], [.5, .5, zt]], PAL.canvasB); poly([[.1, .9, 0], [.9, .9, 0], [.5, .5, zt]], PAL.canvasA); poly([[.9, .1, 0], [.9, .9, 0], [.5, .5, zt]], PAL.canvasB);
      const [cx, cy] = P(.5, .9, 7); icon('cross', cx, cy, PAL.redCross);
    } else if (K.k === 'yard') {
      ground('#3d3a30');
      for (const [a, b] of [[[0, 0], [w, 0]], [[w, 0], [w, h]], [[0, h], [w, h]], [[0, 0], [0, h]]]) { line([...a, 4], [...b, 4], PAL.fence); line([...a, 2], [...b, 2], PAL.fence); }
      if (K.piles) { box(.2, .2, .7, .6, 0, 8, [PAL.metal[0], PAL.metal[1], PAL.metal[2]]); box(1.1, .3, 1.7, .7, 0, 6, ['#7a5230', '#5f3f25', '#47301c']); box(.9, .5, 1.2, .8, 0, 10, [PAL.metal[1], PAL.metal[2], PAL.metal[2]]); }
      if (K.targets) for (let i = 0; i < 3; i++) { const x = .4 + i * .6; box(x, .15, x + .08, .2, 0, 12, ['#5a4632', '#5a4632', '#47372a']); const [tx, ty] = P(x + .04, .2, 12); g.fillStyle = PAL.target[0]; g.fillRect(Math.round(tx - 3), Math.round(ty - 3), 6, 6); g.fillStyle = PAL.target[1]; g.fillRect(Math.round(tx - 1), Math.round(ty - 1), 2, 2); }
      if (K.hurdles) for (let i = 0; i < 3; i++) { const x = .35 + i * .6; line([x, .25, 5], [x, .75, 5], '#c8b89a'); line([x, .25, 0], [x, .25, 5], '#5a4632'); line([x, .75, 0], [x, .75, 5], '#5a4632'); }
      if (K.ring) { poly([[.3, .2, 1], [w - .3, .2, 1], [w - .3, .8, 1], [.3, .8, 1]], '#6b3a2c'); for (const z of [5, 8]) { line([.3, .8, z], [w - .3, .8, z], '#c8b89a'); line([w - .3, .2, z], [w - .3, .8, z], '#c8b89a'); } }
    }
    // crisp pixels: threshold alpha, then a 1-px dark outline around the silhouette
    const id = g.getImageData(0, 0, cv.width, cv.height), d = id.data, Wd = cv.width, Hd = cv.height, solid = new Uint8Array(Wd * Hd);
    for (let i = 0; i < Wd * Hd; i++) { solid[i] = d[i * 4 + 3] >= 110 ? 1 : 0; d[i * 4 + 3] = solid[i] ? 255 : 0; }
    const o = [27, 23, 19];
    for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) { const i = y * Wd + x; if (!solid[i]) continue; if (x === 0 || y === 0 || x === Wd - 1 || y === Hd - 1 || !solid[i - 1] || !solid[i + 1] || !solid[i - Wd] || !solid[i + Wd]) { d[i * 4] = o[0]; d[i * 4 + 1] = o[1]; d[i * 4 + 2] = o[2]; } }
    g.putImageData(id, 0, 0);
    cv.complete = true; cv.naturalWidth = cv.width; cv.naturalHeight = cv.height;
    return { im: cv, ax: ox + (w - h) * TX, ay: oy + (w + h) * TY };
  }
  function prop(kind, seed) {   /* small map props in the same pixel size: dark pines, dead trees, rocks, crates, rubble */
    const cv = document.createElement('canvas'); cv.width = 30; cv.height = 48; const g = cv.getContext('2d'), cx = 15, by = 44;
    let r = seed * 9301 + 49297; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
    const px = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); }, rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(cx, by, kind === 'tree' ? 9 : 7, 3, 0, 0, 7); g.fill();
    if (kind === 'tree') {   // layered dark pine
      rect(cx - 1, by - 8, 3, 8, '#3d2b1f'); const G = ['#1f3a26', '#28482d', '#325635', '#3d6440'];
      for (let l = 0; l < 4; l++) { const yb = by - 6 - l * 8, hw = 10 - l * 2; for (let y = 0; y < 10; y++) { const ww = Math.round(hw * (y / 10)); for (let x = -ww; x <= ww; x++) px(cx + x, yb - 10 + y, G[(x < 0 ? 0 : x > ww / 2 ? 2 : 1) + (rnd() < .12 ? 1 : 0)]); } }
    } else if (kind === 'deadtree') {
      rect(cx - 1, by - 22, 3, 22, '#4a3a2c'); for (const [x0, y0, dx] of [[cx, by - 16, -1], [cx + 1, by - 12, 1], [cx, by - 20, 1]]) for (let i = 0; i < 6; i++) px(x0 + dx * i, y0 - Math.floor(i / 2), '#4a3a2c');
    } else if (kind === 'crate') {
      rect(cx - 6, by - 10, 12, 9, '#6b5038'); rect(cx - 6, by - 10, 12, 2, '#7d6046'); for (let i = 0; i < 12; i += 4) rect(cx - 6 + i, by - 10, 1, 9, '#4e3a28');
    } else if (kind === 'rock') {
      rect(cx - 6, by - 6, 12, 5, '#57544e'); rect(cx - 4, by - 9, 8, 3, '#67645d'); rect(cx - 2, by - 10, 4, 1, '#77746c');
    } else {   /* rubble: broken concrete and a rusty bar */
      rect(cx - 8, by - 4, 16, 3, '#5c5852'); rect(cx - 5, by - 7, 6, 3, '#6e6a63'); rect(cx + 1, by - 6, 5, 2, '#4f4c47'); for (let i = 0; i < 7; i++) px(cx - 2 + i, by - 9 + Math.floor(i / 3), '#7a4a2c');
    }
    const id = g.getImageData(0, 0, 30, 48), d = id.data, solid = new Uint8Array(30 * 48);
    for (let i = 0; i < 30 * 48; i++) solid[i] = d[i * 4 + 3] > 200 ? 1 : 0;
    for (let y = 1; y < 47; y++) for (let x = 1; x < 29; x++) { const i = y * 30 + x; if (!solid[i] && (solid[i - 1] || solid[i + 1] || solid[i - 30] || solid[i + 30]) && d[i * 4 + 3] < 120) { d[i * 4] = 22; d[i * 4 + 1] = 19; d[i * 4 + 2] = 16; d[i * 4 + 3] = 255; } }
    g.putImageData(id, 0, 0); cv.complete = true; cv.naturalWidth = 30; cv.naturalHeight = 48; return { im: cv, ax: cx, ay: by };
  }
  const cache = {};
  window.ZHProc = { art(type, w, h) { const k = type + w + 'x' + h; return cache[k] || (cache[k] = make(type, w, h)); }, prop(kind, seed = 1) { const k = 'p' + kind + seed; return cache[k] || (cache[k] = prop(kind, seed)); }, KIND };
})();
