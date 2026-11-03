"""Face touch-up for the AI character texture: narrower eyes, a small smile and soft brows, painted in 3D space
(per-texel positions) so it follows the head however the UV islands are cut."""
import numpy as np
SKIN_REF = np.array([250, 195, 159]); EYES = ((-.0779, .8807), (.0843, .8795)); EYE_R = (.0291, .0335); FACE_CX = .0032; MOUTH_Z = .806
EYE_DARK = np.array([30, 21, 16]); EYE_SHINE = np.array([252, 250, 244])
HAIR_REF = np.array([52, 37, 31]); INK = np.array([72, 42, 36])
EXPRESSIONS = ('neutral', 'angry', 'hurt', 'ko', 'happy')
# which face each animation shows (anything not listed: neutral)
EXPR_OF_CLIP = {'punch': 'angry', 'melee_swing_a': 'angry', 'melee_swing_b': 'angry', 'melee_swing_c': 'angry',
                'gun_fire': 'angry', 'pistol_fire': 'angry', 'hurt': 'hurt', 'melee_hold_hurt': 'hurt',
                'gun_hold_hurt': 'hurt', 'collapse': 'ko', 'cheer': 'happy'}

def _seg(X, Z, a, b):
    """Distance from every texel (X, Z) to the segment a-b (front-view coordinates)."""
    ax, az = a; bx, bz = b; dx, dz = bx - ax, bz - az
    t = np.clip(((X - ax) * dx + (Z - az) * dz) / (dx * dx + dz * dz), 0, 1)
    return np.hypot(X - ax - t * dx, Z - az - t * dz)

def fix_gutters(o, inside, grow=4):
    """After padding: the empty texels between UV islands near the eyes took the colour of whatever island was
    nearest (shirt white, eye black), which bilinear sampling shows as a ring along each seam. Refill them from
    the nearest painted face texel instead."""
    from scipy import ndimage
    g = ndimage.binary_dilation(face_paint.cover, iterations=grow) & ~inside
    src = ndimage.binary_dilation(face_paint.cover, iterations=1) & inside       # take colour only from the painted face
    iy, ix = ndimage.distance_transform_edt(~src, return_distances=False, return_indices=True)
    o[g] = o[iy[g], ix[g]]
    return o

def face_paint(pos, nrm, out, expr='neutral', narrow=.74, log=print):
    """Paint the face onto texture `out` (uint8 HxWx3, same UV raster as pos/nrm). pos: per-texel 3D (NaN = not head);
    front = -Y, +X = screen right. expr: 'neutral' (narrowed eyes, small smile, soft brows), 'angry' (sharp brows
    slanting down to the nose, flat mouth: swings, punches, firing), 'hurt' (>< eyes, frown), 'ko' (- - eyes)."""
    v = ~np.isnan(pos[..., 0]) & (nrm[..., 1] < -.25)
    X, Z = pos[..., 0], pos[..., 2]; c = out.astype(int)
    lum = c.mean(2); skin = v & (np.abs(c - SKIN_REF).sum(2) < 110); hair = np.abs(c - HAIR_REF).sum(2) < 60
    face = v & ~hair
    front = ~np.isnan(pos[..., 0]) & (nrm[..., 1] < .3)       # anything not facing backwards: the eye sits in a bowl whose rim faces sideways
    # the rig's eyes, measured once on the head (front view, x/z in model units); same for every decimation level
    eyes = np.array(EYES, float); cx = FACE_CX; ez = eyes[:, 1].mean(); rx, rz = EYE_R
    skin_col = np.median(c[skin & (np.abs(Z - ez) < .05)], 0).astype(np.uint8)
    sep = abs(eyes[1, 0] - eyes[0, 0]); th = .0048
    face_paint.cover = np.zeros(out.shape[:2], bool); face_paint.skin = skin_col
    for ex, eze in eyes:
        face_paint.cover |= front & (((X - ex) / rx) ** 2 + ((Z - eze) / rz) ** 2 < 1.8 ** 2)
        m = front & (((X - ex) / rx) ** 2 + ((Z - eze) / rz) ** 2 < 1.3 ** 2)   # the whole eye incl. its soft pale edge
        if expr in ('neutral', 'angry'):
            k = narrow * (.88 if expr == 'angry' else 1)
            e2 = ((X - ex) / rx) ** 2 + ((Z - eze) / (rz * k)) ** 2
            out[m & (e2 > 1)] = skin_col
            out[m & (e2 <= 1)] = EYE_DARK                                   # clean redraw: dark oval + two highlights
            for hx, hz, hr in ((-.32, .38, .30), (.34, -.42, .13)):
                out[front & (np.hypot((X - ex - hx * rx) / rx, (Z - eze - hz * rz * k) / rx) < hr)] = EYE_SHINE
        else:
            out[m] = skin_col                                   # closed eyes: skin over the whole eye, then strokes
            s = 1 if ex > cx else -1                            # +1 = the eye on screen right
            if expr == 'hurt':                                  # > on the left eye, < on the right: tips point at the nose
                tip = (ex - s * .55 * rx, eze); w = s * .75 * rx; h = .55 * rz
                out[front & (np.minimum(_seg(X, Z, (tip[0] + w, eze + h), tip), _seg(X, Z, tip, (tip[0] + w, eze - h))) < th * .95)] = INK
            elif expr == 'happy':                               # ^ ^ : an upside-down U
                xx_ = (X - ex) / (.8 * rx); arc = eze - .25 * rz + .5 * rz * (1 - xx_ ** 2)
                out[front & (np.abs(xx_) < 1) & (np.abs(Z - arc) < th * .95)] = INK
            else:                                               # - - : a short, slightly drooping line
                out[front & (_seg(X, Z, (ex - .85 * rx, eze - .08 * rz), (ex + .85 * rx, eze - .08 * rz)) < th * .95)] = INK
    # mouth
    zm = MOUTH_Z; xx = X - cx
    old = face & (np.abs(xx) < .03) & (np.abs(Z - zm) < .008); out[old & (lum < 140)] = skin_col   # cover the old slit line
    bend = {'neutral': .42, 'angry': .0, 'hurt': -.45, 'ko': -.15, 'happy': .6}[expr]                      # + smile, - frown
    hw = {'neutral': .15, 'angry': .11, 'hurt': .12, 'ko': .08, 'happy': .2}[expr] * sep
    curve = zm + bend * (xx / hw) ** 2 * hw - (bend < 0) * bend * hw * .5
    mouth = face & (np.abs(xx) < hw) & (np.abs(Z - curve) < th * (1 - .35 * (xx / hw) ** 2))
    out[mouth] = INK
    # brows
    for ex, eze in eyes:
        s = 1 if ex > cx else -1; bx = X - ex; bw = .25 * sep; o = s * bx / bw            # o: -1 inner end .. +1 outer end
        if expr == 'angry':      # straight, thick, steep: inner end low by the nose
            base = eze + rz + .006; a_ = (ex - s * bw, base - .010); b_ = (ex + s * bw, base + .009)
            brow = face & (_seg(X, Z, a_, b_) < .0058 * (1 - .25 * ((o + 1) / 2)))
        elif expr == 'happy':    # raised, round
            bz = eze + rz + .010 + .006 * (1 - o ** 2)
            brow = face & (np.abs(bx) < bw) & (np.abs(Z - bz) < .0048 * (1 - .5 * o ** 2))
        elif expr == 'hurt':     # worried: inner end raised
            bz = eze + rz + .006 + .004 * (1 - o ** 2) - .006 * o
            brow = face & (np.abs(bx) < bw) & (np.abs(Z - bz) < .0048 * (1 - .5 * o ** 2))
        else:
            bz = eze + rz + .004 + .005 * (1 - o ** 2) - .003 * o
            brow = face & (np.abs(bx) < bw) & (np.abs(Z - bz) < .0052 * (1 - .5 * o ** 2))
        out[brow] = INK
    log('face', expr, 'mouth px', int(mouth.sum()))
    return out

def flatten_eyes(me, inner=1.45, outer=2.1, log=print):
    """The AI head has a shallow bowl modelled around each eye; with painted eyes its rim shows up as a ring and an
    under-eye bag. Fit a smooth quadratic surface (depth y as a function of x, z) to the face just outside each eye
    and lay every front vertex inside the eye area onto it, blending out to the fitted ring."""
    co = np.array([v.co[:] for v in me.vertices]); rx, rz = EYE_R; moved = 0
    for ex, ez in EYES:
        d = np.hypot((co[:, 0] - ex) / rx, (co[:, 2] - ez) / rz)
        frontish = (co[:, 1] < np.percentile(co[d < outer, 1], 60)) & (co[:, 2] < ez + 1.2 * rz)   # face surface only: not the back of the head, not the bangs
        ring = frontish & (d > inner) & (d < outer)
        A = lambda P: np.c_[np.ones(len(P)), P[:, 0] - ex, P[:, 2] - ez, (P[:, 0] - ex) ** 2, (P[:, 0] - ex) * (P[:, 2] - ez), (P[:, 2] - ez) ** 2]
        coef = np.linalg.lstsq(A(co[ring]), co[ring, 1], rcond=None)[0]
        ins = frontish & (d < outer)
        w = np.clip((outer - d[ins]) / (outer - inner), 0, 1)               # 1 inside, fading to 0 at the outer ring
        co[ins, 1] = co[ins, 1] * (1 - w) + (A(co[ins]) @ coef) * w; moved += int((w > 0).sum())
    me.vertices.foreach_set('co', co.ravel()); me.update()
    log('eyes flattened, vertices moved', moved)

def head_maps(me, S, zfrac=.62):
    """Per-texel 3D position and face normal for the upper part of the mesh (UV raster S x S, rows = uv.y * S)."""
    co = np.array([v.co[:] for v in me.vertices]); z0, zt = co[:, 2].min(), co[:, 2].max(); uv = me.uv_layers.active.data
    pos = np.full((S, S, 3), np.nan, np.float32); nrm = np.zeros((S, S, 3), np.float32)
    me.calc_loop_triangles()
    for t in me.loop_triangles:
        P = co[list(t.vertices)]
        if P[:, 2].mean() < z0 + zfrac * (zt - z0): continue
        U = np.array([uv[l].uv[:] for l in t.loops]) * S
        x0, y0 = np.floor(U.min(0)).astype(int); x1, y1 = np.ceil(U.max(0)).astype(int)
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1)); q = np.stack([xs.ravel() + .5, ys.ravel() + .5], 1)
        T = np.array([U[1] - U[0], U[2] - U[0]]).T
        if abs(np.linalg.det(T)) < 1e-9: continue
        b = np.linalg.solve(T, (q - U[0]).T).T; l = np.c_[1 - b.sum(1), b]
        ok = (l > -.02).all(1) & (xs.ravel() >= 0) & (xs.ravel() < S) & (ys.ravel() >= 0) & (ys.ravel() < S)
        X, Y = xs.ravel()[ok], ys.ravel()[ok]; pos[Y, X] = l[ok] @ P; nrm[Y, X] = t.normal[:]
    # texels on an island's edge whose centre falls just outside every triangle still show when sampled: give them
    # their nearest neighbour's position, so the paint reaches the very edge (else old eye pixels leave a ring)
    from scipy import ndimage
    miss = np.isnan(pos[..., 0]); dist, (iy, ix) = ndimage.distance_transform_edt(miss, return_indices=True)
    fill = miss & (dist <= 3); pos[fill] = pos[iy[fill], ix[fill]]; nrm[fill] = nrm[iy[fill], ix[fill]]
    return pos, nrm
