#!/usr/bin/env python3
"""Keep a character's face steady through a clip: PixelLab sometimes blinks one eye or redraws the eyes on idle and
walk frames. The head (top rows: hair, face, eyes) of the first frame is pasted onto every frame, following that
frame's own head bob (best match of the hair outline), so only the body moves.
    python3 tools/art/steady_head.py <strip.png> [head_rows=12]"""
import sys
import numpy as np
from PIL import Image

def main(path, rows=12):
    s = np.array(Image.open(path).convert('RGBA')); n = s.shape[1] // 48
    F = [s[:, 48 * i:48 * i + 48].copy() for i in range(n)]
    ys = np.where(F[0][..., 3].any(1))[0]; t0 = ys.min()
    head = F[0][t0:t0 + rows].copy()
    for i in range(1, n):
        f = F[i]; t = np.where(f[..., 3].any(1))[0].min(); best = None
        for dx in range(-2, 3):
            reg = np.roll(f[t:t + rows], -dx, 1)
            d = ((reg[..., 3] > 0) != (head[..., 3] > 0)).sum()
            if best is None or d < best[0]: best = (d, dx)
        dx = best[1]; h = np.roll(head, dx, 1)
        f[t:t + rows][h[..., 3] > 0] = h[h[..., 3] > 0]
        # clear old head pixels that the steady head does not cover in its top rows (no double hair)
        top = f[t:t + rows - 4]; top[h[:rows - 4, :, 3] == 0] = 0
    Image.fromarray(np.concatenate(F, 1)).save(path)

if __name__ == '__main__':
    main(sys.argv[1], *(int(x) for x in sys.argv[2:]))
