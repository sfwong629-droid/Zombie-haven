# bvhref.py OUT.png "TITLE|BVH|f0|f1|N|grip" ... : a reference sheet of real recordings: stick figures (side view and from the front-left),
# with a weapon drawn through both hands (grip: 'RL' = right hand on top, weapon runs from the left hand through the right; 'LR' the other way;
# 'none' = no weapon). Each recording is one row of side views and one row of front views.
import sys, numpy as np
sys.path.insert(0, '/home/claude/zwork/mocap'); import bvh
from PIL import Image, ImageDraw, ImageFont
out = sys.argv[1]; rows = [a.split('|') for a in sys.argv[2:]]
FW, FH = 120, 170; PAD = 34
try: F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16); F2 = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12)
except Exception: F = F2 = ImageFont.load_default()
BONES = [('Hips', 'LowerBack'), ('LowerBack', 'Spine'), ('Spine', 'Spine1'), ('Spine1', 'Neck'), ('Neck', 'Neck1'), ('Neck1', 'Head'),
         ('Spine1', 'LeftShoulder'), ('LeftShoulder', 'LeftArm'), ('LeftArm', 'LeftForeArm'), ('LeftForeArm', 'LeftHand'),
         ('Spine1', 'RightShoulder'), ('RightShoulder', 'RightArm'), ('RightArm', 'RightForeArm'), ('RightForeArm', 'RightHand'),
         ('Hips', 'LHipJoint'), ('LHipJoint', 'LeftUpLeg'), ('LeftUpLeg', 'LeftLeg'), ('LeftLeg', 'LeftFoot'), ('LeftFoot', 'LeftToeBase'),
         ('Hips', 'RHipJoint'), ('RHipJoint', 'RightUpLeg'), ('RightUpLeg', 'RightLeg'), ('RightLeg', 'RightFoot'), ('RightFoot', 'RightToeBase')]
blocks = []
for title, path, f0, f1, N, grip in rows:
    f0, f1, N = int(f0), int(f1), int(N)
    n, par, off, ch, D, dt = bvh.load(path); I = n.index
    P = np.array([bvh.fk(n, par, off, ch, D[f], True)[0] for f in range(f0, f1 + 1)])
    up = np.array([0, 1., 0]); lf = (P[:, I('LeftUpLeg')] - P[:, I('RightUpLeg')]).mean(0); fw = np.cross(lf, up); fw[1] = 0; fw /= np.linalg.norm(fw); rt = np.cross(fw, up)
    H = np.linalg.norm(P[0, I('Head')] - (P[0, I('LeftFoot')] + P[0, I('RightFoot')]) / 2); S = (FH - 40) / (H * 1.25)
    g = min(P[:, I('LeftToeBase'), 1].min(), P[:, I('RightToeBase'), 1].min())
    # the weapon: through both hands, smoothed (the recorded hands are rough); length 1.9 x the forearm
    R = P[:, I('RightHand')]; L = P[:, I('LeftHand')]; fl = np.linalg.norm(P[0, I('RightHand')] - P[0, I('RightForeArm')])
    if grip != 'none':
        d = (R - L) if grip == 'RL' else (L - R); k = 9; d = np.array([d[max(0, i - k):i + k + 1].mean(0) for i in range(len(d))]); d /= np.linalg.norm(d, axis=1, keepdims=True)
        top = R if grip == 'RL' else L; low = L if grip == 'RL' else R
    img = Image.new('RGB', (FW * N, FH * 2 + PAD), 'white'); dr = ImageDraw.Draw(img)
    dr.text((6, 6), title, fill=(20, 20, 20), font=F); dr.text((6, 23), '%s, frames %d to %d (%.2f s)' % (path.split('/')[-1], f0, f1, (f1 - f0) * dt), fill=(90, 90, 90), font=F2)
    for v, (ax, row) in enumerate((((fw, up), 0), ((nz := (rt * .55 - fw * .84) / np.linalg.norm(rt * .55 - fw * .84), up), 1))):
        a, b = ax
        for j in range(N):
            i = int(round(j * (len(P) - 1) / (N - 1))); ox = FW * j + FW / 2; oy = PAD + FH * row + FH - 12
            c = P[i, 0]; pr = lambda p: (ox + float((p - c) @ a) * S, oy - float((p[1] - g)) * S)
            dr.line([(FW * j + 4, oy), (FW * j + FW - 4, oy)], fill=(190, 190, 190))
            for p0, p1 in BONES:
                col = (200, 60, 50) if p1.startswith('Right') or p0.startswith('Right') else (50, 90, 200) if p1.startswith('Left') or p0.startswith('Left') else (40, 40, 40)
                dr.line([pr(P[i, I(p0)]), pr(P[i, I(p1)])], fill=col, width=3)
            hp = pr(P[i, I('Head')]); dr.ellipse([hp[0] - 7, hp[1] - 9, hp[0] + 7, hp[1] + 5], outline=(40, 40, 40), width=2)
            if grip != 'none':
                e0 = low[i] - d[i] * fl * .25; e1 = top[i] + d[i] * fl * 1.9; dr.line([pr(e0), pr(e1)], fill=(60, 60, 60), width=5); hd = pr(e1); dr.ellipse([hd[0] - 4, hd[1] - 4, hd[0] + 4, hd[1] + 4], fill=(60, 60, 60))
    dr.text((FW * N - 190, 6), 'top: side   bottom: front', fill=(120, 120, 120), font=F2)
    blocks.append(img)
Wd = max(b.width for b in blocks); out_im = Image.new('RGB', (Wd, sum(b.height + 8 for b in blocks)), 'white'); y = 0
for b in blocks: out_im.paste(b, (0, y)); y += b.height + 8
out_im.save(out); print(out, out_im.size)
