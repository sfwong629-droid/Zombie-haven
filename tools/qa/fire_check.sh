#!/bin/sh
# tools/qa/fire_check.sh — 3D.225 (owner, 19 Nov, W115: "1 for long gun, yes to pistol plan"): the two firing movements.
# gun_fire (rifle, assault rifle, shotgun, SMG, bow, crossbow) is a man aiming a long gun (CMU 79_96); pistol_fire (pistol, revolver, magnum) the
# same body with the pistol in both hands. Each shot replays the clip, so it must start and end in the same aim. Checked on both models, at 31 moments:
#   - the gun is never inside the head, and never inside the body away from the hands (tools/art/b3d/bodyhit.py; the rifle's butt and the
#     arms holding it are in contact on purpose, so only the trunk and legs count for the rifle);
#   - the aim: the gun points straight ahead (within 8 degrees sideways) and level (within 4 degrees) at the start and the end, and the recoil
#     lifts the muzzle at least 4 degrees (at most 20) in between;
#   - it loops: every joint ends within 1 cm of where it started;
#   - the feet stand where the gun stance (gun_hold_idle) has them (each ankle within 3 cm), so starting to fire does not slide them;
#   - both hands on the gun: each hand's middle within 6 cm of the gun.
#   - (3D.226) the long gun's right elbow stands out from the body; (3D.228, W140: "the elbow should not be over the gun or the shoulder. It
#     should be lower") and it hangs low: never above the shoulder, at least 8 cm below the right hand on the gun, and at least
#     8 cm from the spine line. 3D.226 fails it (the elbow 14 to 15 cm above the shoulder).
#   - (3D.234, owner: "the right hand should be here", a circle on the grip in front of the chin) the right hand at least 9 cm in front of the head centre;
#   - (3D.235, owner's drawing: shoulder, elbow low, forearm up to the hand) the right arm bent at most 120 degrees, the elbow at least 5 cm below the
#     shoulder-to-hand line; the hand at least 6 cm in front of the head centre (the rifle sits 4 cm further back into the shoulder).
#     (3D.234:) with the hand that far forward the man's short arm leaves the elbow 6 cm out from the spine line (at least 5.5; further out lifts it and puts the forearm in the gun);
#     the elbow at most level with the shoulder (1.5 cm) and at least 7 cm under the hand.
set -e; cd "$(dirname "$0")/../.."; T=$(mktemp -d); bad=0
for m in m3 f3; do
  node tools/art/decomp.mjs assets/characters/ai3d_v2/survivor_$m.glb $T/$m.glb >/dev/null
  python3 tools/art/b3d/weapdump.py $T/$m.glb $T/r$m.npz 31 "gun_hold_idle:rifle,gun_fire:rifle" >/dev/null 2>&1
  python3 tools/art/b3d/weapdump.py $T/$m.glb $T/p$m.npz 31 "pistol_fire:pistol" >/dev/null 2>&1
  python3 - "$T/r$m.npz" "$T/p$m.npz" "$m" <<'P' || bad=1
import numpy as np, sys
r = np.load(sys.argv[1], allow_pickle=True); p = np.load(sys.argv[2], allow_pickle=True); m = sys.argv[3]; bad = 0
B = list(r['bones']); mid = lambda J, b: (J[B.index(b)][:3] + J[B.index(b)][3:]) / 2
def say(ok, msg):
    global bad
    bad += 0 if ok else 1; print(('ok   ' if ok else 'FAIL ') + m + ' ' + msg)
st = r['J:gun_hold_idle'][0]
for d, c in ((r, 'gun_fire'), (p, 'pistol_fire')):
    M = d['M:' + c]; n = int((M[:, 1] < M[:, 0]).sum()); say(n == 0, c + ': the gun nearest %.3f from the head centre (radius %.3f), inside the head at %d of %d moments' % (M[:, 1].min(), M[:, 0].mean(), n, len(M)))
    D = d['D:' + c]; J = d['J:' + c]; V = d['V:' + c]; nb = int(d['NB:' + c])
    fw = np.array([0, -1., 0]); s = 1 if (D[0] @ fw) > 0 else -1; Dn = D * s
    side = np.degrees(np.arctan2(np.abs(Dn[[0, -1], 0]), -Dn[[0, -1], 1])).max(); up = np.degrees(np.arcsin(np.clip(Dn[:, 2], -1, 1))); kick = up.max() - up[[0, -1]].mean()
    say(side <= 8 and abs(up[0]) <= 4 and abs(up[-1]) <= 4, c + ': aimed straight ahead (%.1f degrees off to the side) and level (%.1f / %.1f degrees at the start / end)' % (side, up[0], up[-1]))
    say(4 <= kick <= 20, c + ': the recoil lifts the muzzle %.1f degrees (4 to 20)' % kick)
    lp = np.abs(J[0] - J[-1]).max(); say(lp <= .01, c + ': it loops (every joint ends within %.4f of its start, limit 0.010)' % lp)
    fe = max(np.linalg.norm(J[0][B.index('foot.' + s_)][:3] - st[B.index('foot.' + s_)][:3]) for s_ in 'LR'); say(fe <= .03, c + ': the feet where the gun stance has them (%.3f off, limit 0.030)' % fe)
    if c == 'gun_fire':   # 3D.226 (owner: "move the right elbow away from the body a bit; it looks like it's part of the body")
        el = []
        for Jx in J:
            e = Jx[B.index('forearm.R')][:3]; ch = Jx[B.index('chest')]; a_, b_ = ch[:3], ch[3:]; u = np.clip((e - a_) @ (b_ - a_) / ((b_ - a_) @ (b_ - a_)), 0, 1); v = e - (a_ + u * (b_ - a_)); v[2] = 0; el.append(np.linalg.norm(v))
        say(min(el) >= .055, c + ': the right elbow stands out from the body (%.3f from the spine line, at least 0.055)' % min(el))
        es = max(Jx[B.index('forearm.R')][2] - Jx[B.index('upperarm.R')][2] for Jx in J); say(es <= .015, c + ': the right elbow is never over the shoulder (%.3f above it at most, limit 0.015: level with it)' % es)
        eh = max(Jx[B.index('forearm.R')][2] - mid(Jx, 'hand.R')[2] for Jx in J); say(eh <= -.07, c + ': the right elbow is under the hand on the gun (%.3f above the hand at most, limit -0.070)' % eh)
        hf = min(((Jx[B.index('head')][:3] + Jx[B.index('head')][3:]) / 2)[1] - mid(Jx, 'hand.R')[1] for Jx in J); say(hf >= .06, c + ': the right hand holds the grip in front of the chin (%.3f in front of the head centre at least, limit 0.060; 3D.228 had it at the cheek, 0.00)' % hf)
        def bendline(Jx):
            S = Jx[B.index('upperarm.R')][:3]; E = Jx[B.index('forearm.R')][:3]; H = Jx[B.index('hand.R')][:3]
            a = S - E; f = H - E; u = (H - S) / np.linalg.norm(H - S); off = E - (S + u * ((E - S) @ u))
            return np.degrees(np.arccos(np.clip(a @ f / np.linalg.norm(a) / np.linalg.norm(f), -1, 1))), -off[2]
        bl = [bendline(Jx) for Jx in J]; mb = max(x[0] for x in bl); md = min(x[1] for x in bl)
        say(mb <= 120, c + ': the right arm is bent, not straight (elbow at most %.0f degrees, limit 120; 3D.234 had 138)' % mb)
        say(md >= .05, c + ': the right elbow hangs below the line from the shoulder to the hand (%.3f at least, limit 0.050; 3D.234 had 0.043)' % md)
    W = V[:, nb:]; hd = max(np.linalg.norm(W[i] - mid(J[i], 'hand.' + s_), axis=1).min() for i in range(len(J)) for s_ in 'LR'); say(hd <= .06, c + ': both hands on the gun (each hand within %.3f of it, limit 0.060)' % hd)
sys.exit(1 if bad else 0)
P
  python3 tools/art/b3d/bodyhit.py $T/r$m.npz RL | sed "s/^\(ok   \|FAIL \)/\1$m /" > $T/b1.txt; grep -v ^BAD $T/b1.txt; grep -q "^BAD 0" $T/b1.txt || bad=1
  python3 tools/art/b3d/bodyhit.py $T/p$m.npz RL | sed "s/^\(ok   \|FAIL \)/\1$m /" > $T/b2.txt; grep -v ^BAD $T/b2.txt; grep -q "^BAD 0" $T/b2.txt || bad=1
done; rm -rf $T; [ $bad = 0 ] && echo "ALL OK" || { echo FAILED; exit 1; }
