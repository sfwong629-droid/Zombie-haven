// Pixel-art extractor for AI-generated sprite sheets (flat #FF00FF background).
// __zx2(idx, lo, hi): idx = which <img> on the page (-1 = last); lo..hi = art-pixel block size range in source px.
// Results land in window.__zout (one canvas per frame, native 1 art px = 1 px). __zparts(i) returns base64 chunks + hashes.
window.__zhash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h.toString(16) + ':' + s.length; };
window.__zx2 = function (idx, lo, hi) {
  const ims = [...document.querySelectorAll('main img')]; const im = idx < 0 ? ims[ims.length + idx] : ims[idx];
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height;
  const fg = (x, y) => { const i = (y * W + x) * 4; return Math.abs(d[i] - 255) + d[i + 1] + Math.abs(d[i + 2] - 255) > 110; };
  const rowOcc = []; for (let y = 0; y < H; y++) { let n = 0; for (let x = 0; x < W; x += 2) if (fg(x, y)) n++; rowOcc.push(n > 1); }
  const bands = []; let s = -1; for (let y = 0; y < H; y++) { if (rowOcc[y] && s < 0) s = y; if (!rowOcc[y] && s >= 0) { if (y - s > 20) bands.push([s, y - 1]); s = -1; } } if (s >= 0 && H - s > 20) bands.push([s, H - 1]);
  const fr = []; for (const [r0, r1] of bands) { const col = []; for (let x = 0; x < W; x++) { let n = 0; for (let y = r0; y <= r1; y += 2) if (fg(x, y)) n++; col.push(n > 1); }
    let s2 = -1; const segs = []; for (let x = 0; x < W; x++) { if (col[x] && s2 < 0) s2 = x; if (!col[x] && s2 >= 0) { segs.push([s2, x - 1]); s2 = -1; } } if (s2 >= 0) segs.push([s2, W - 1]);
    for (const [a, b] of segs.filter((q) => q[1] - q[0] > 15)) { let y0 = 1e9, y1 = -1; for (let y = r0; y <= r1; y++) for (let x = a; x <= b; x++) if (fg(x, y)) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); break; } fr.push([a, b, y0, y1, bands.findIndex((q) => q[0] === r0)]); } }
  const diff = (i, j) => Math.abs(d[i] - d[j]) + Math.abs(d[i + 1] - d[j + 1]) + Math.abs(d[i + 2] - d[j + 2]);
  function fit(a, b, y0, y1) { const ex = new Float64Array(W), ey = new Float64Array(H); for (let y = y0; y <= y1; y++) for (let x = a; x < b; x++) { const i = (y * W + x) * 4; if (diff(i, i + 4) > 60) ex[x + 1]++; if (y < H - 1 && diff(i, i + W * 4) > 60) ey[y + 1]++; }
    let best = [0, 0, 0, -1]; for (let p = lo; p <= hi; p += 0.0625) { const base = 2.5 / p; const sc = (e, l, hh) => { let bb = [0, 0]; for (let o = 0; o < p; o += 0.25) { let s = 0, t = 0; for (let i = l; i <= hh; i++) { if (!e[i]) continue; t += e[i]; const q = ((i - o) % p + p) % p; if (q < 1.25 || q > p - 1.25) s += e[i]; } const v = t ? (s / t - base) / (1 - base) : 0; if (v > bb[1]) bb = [o, v]; } return bb; };
      const X = sc(ex, a, b), Y = sc(ey, y0, y1); if (X[1] + Y[1] > best[3]) best = [p, X[0], Y[0], X[1] + Y[1]]; } return best; }
  function regrid(a, b, y0, y1, cx, ox, cy, oy) { const gx0 = Math.floor((a - ox) / cx) - 1, gx1 = Math.ceil((b - ox) / cx) + 1, gy0 = Math.floor((y0 - oy) / cy) - 1, gy1 = Math.ceil((y1 - oy) / cy) + 1; const gw = gx1 - gx0, gh = gy1 - gy0;
    const o = document.createElement('canvas'); o.width = gw; o.height = gh; const g = o.getContext('2d'); const id = g.createImageData(gw, gh);
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) { const X0 = ox + (gx0 + gx) * cx, Y0 = oy + (gy0 + gy) * cy, mx = cx * 0.25, my = cy * 0.25; const m = new Map();
      for (let y = Math.round(Y0 + my); y < Y0 + cy - my; y++) for (let x = Math.round(X0 + mx); x < X0 + cx - mx; x++) { if (x < a - 2 || x > b + 2 || y < y0 - 2 || y > y1 + 2 || x < 0 || y < 0 || x >= W || y >= H) continue; const i = (y * W + x) * 4; const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3); m.set(k, (m.get(k) || 0) + 1); }
      let bk = 0, bn = -1; for (const [k, n] of m) if (n > bn) { bn = n; bk = k; } if (bn < 0) continue;
      const r = ((bk >> 10) & 31) * 8 + 4, G = ((bk >> 5) & 31) * 8 + 4, B = (bk & 31) * 8 + 4; const j = (gy * gw + gx) * 4; const bg = Math.abs(r - 255) + G + Math.abs(B - 255) < 130 || (B > G + 35 && r > G + 35 && B > 90);
      id.data[j] = r; id.data[j + 1] = G; id.data[j + 2] = B; id.data[j + 3] = bg ? 0 : 255; }
    g.putImageData(id, 0, 0); let X = [1e9, -1], Y = [1e9, -1]; for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) if (id.data[(y * gw + x) * 4 + 3]) { X = [Math.min(X[0], x), Math.max(X[1], x)]; Y = [Math.min(Y[0], y), Math.max(Y[1], y)]; }
    const t = document.createElement('canvas'); t.width = X[1] - X[0] + 1; t.height = Y[1] - Y[0] + 1; t.getContext('2d').drawImage(o, X[0], Y[0], t.width, t.height, 0, 0, t.width, t.height); return t; }
  const out = [], info = []; for (const [a, b, y0, y1, row] of fr) { const [p, ox, oy, sc] = fit(a, b, y0, y1); const t = regrid(a, b, y0, y1, p, ox, p, oy); out.push(t); info.push([row, +p.toFixed(2), +sc.toFixed(2), t.width, t.height].join(' ')); }
  window.__zout = out; return { size: [W, H], bands, info };
};
window.__zparts = function (i) { const u = window.__zout[i].toDataURL('image/png').slice(22); const parts = []; for (let k = 0; k < u.length; k += 400) parts.push(u.slice(k, k + 400)); return { i, hash: parts.map(window.__zhash), parts }; };
