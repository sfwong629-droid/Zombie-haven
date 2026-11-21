# gallopcheck.py NEW.npz OLD.npz NAME : the Dog's and the Stag's run is a real gallop (owner, 21 Nov, W193: "a real dog doesn't run with both legs
# landing at the same time"; "yes give it the same gallop" for the Stag). Reads animdump.py dumps of the game model (NEW) and the model before (OLD).
# Checks: each of the four feet comes down at its own moment, at least a tenth of the stride apart; each foot really reaches the ground; at some
# moment all four feet are in the air; the body never goes into the ground; the run ends where it starts; the other animations are unchanged.
# The old run fails it (each pair of feet landed 0.08 of the stride apart).
import sys, numpy as np
new, old, name = sys.argv[1], sys.argv[2], sys.argv[3]
N = np.load(new, allow_pickle=True); O = np.load(old, allow_pickle=True); B = list(N['bones'])
J = N['J:zombie_run']; V = N['V:zombie_run']; rest = N['J:idle'][0]
H = V[0][:, 2].max() - V[0][:, 2].min(); fails = []
def bad(msg): fails.append(msg); print('FAIL', name, msg)
feet = ['bpaw.L', 'bpaw.R', 'fpaw.R', 'fpaw.L']; n = len(J) - 1   # the last sample is the first again
down = {}
for f in feet:
    z = J[:n, B.index(f), 2] - rest[B.index(f), 2]; d = z < .02 * H; down[f] = d
    if not d.any(): bad('%s never reaches the ground (lowest %.3f above its standing height)' % (f, z.min()))
lands = {}
for f, d in down.items():
    s = [i for i in range(n) if d[i] and not d[i - 1]]
    if len(s) != 1: bad('%s lands %d times in one stride (should be once)' % (f, len(s)))
    if s: lands[f] = s[0] / n
order = sorted(lands.items(), key=lambda x: x[1]); print(name, 'feet land at', ', '.join('%s %.2f' % x for x in order))
for i in range(len(order)):
    a, b = order[i], order[(i + 1) % len(order)]; gap = (b[1] - a[1]) % 1
    if gap < .099: bad('%s and %s land together (%.2f of the stride apart; must be at least 0.10)' % (a[0], b[0], gap))
air = ~np.any(np.array(list(down.values())), axis=0)
if not air.any(): bad('there is no moment with all four feet in the air')
low = V[:, :, 2].min(axis=1)
if low.min() < -.015: bad('the body goes %.3f into the ground (at most 0.015, as in zombie_ground_check.sh)' % -low.min())
if low.min() > .02 * H: bad('the run never touches the ground (lowest %.3f)' % low.min())
gap = np.abs(V[0] - V[-1]).max()
if gap > .005 * H: bad('the run jumps %.3f at every repeat' % gap)
for c in ['idle', 'zombie_walk', 'zombie_attack', 'collapse']:
    d = np.abs(N['J:' + c] - O['J:' + c]).max()   # the bones (the file's points may be stored in another order)
    if d > 1e-4: bad('%s changed (by %.4f) and should not have' % (c, d))
print(name, 'height %.2f, lowest %.3f, all four in the air in %d of %d moments, loop gap %.4f' % (H, low.min(), air.sum(), n, gap))
print(('PASS ' if not fails else 'FAIL ') + name + ' gallop')
sys.exit(1 if fails else 0)
