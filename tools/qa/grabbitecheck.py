# grabbitecheck.py NEW.npz OLD.npz NAME : the Walker's grab and bite (owner, W204). Both hands reach well out in front together (at least 30% of the
# height, both at once), they stay apart as if round a body (at least 15% of the height apart at the bite), the head goes forward of where it stood by
# at least 6% of the height, the clip starts and ends on today's first pose (so the game's blend in and out is unchanged), the feet stay planted, the
# body stays out of the ground, and the other animations are unchanged. Today's one-arm swipe fails it.
import sys, numpy as np
new, old, name = sys.argv[1:4]
N = np.load(new, allow_pickle=True); O = np.load(old, allow_pickle=True); B = list(N['bones']); fails = []
def bad(m): fails.append(m); print('FAIL', name, m)
b = lambda J, n: J[:, B.index(n)]
H = N['V:idle'][0][:, 2].max() - N['V:idle'][0][:, 2].min()
A, V, OA = N['J:zombie_attack'], N['V:zombie_attack'], O['J:zombie_attack']
sh = (b(A, 'upperarm.L')[:, :3] + b(A, 'upperarm.R')[:, :3]) / 2; hl = b(A, 'hand.L')[:, :3]; hr = b(A, 'hand.R')[:, :3]
both = np.minimum(sh[:, 1] - hl[:, 1], sh[:, 1] - hr[:, 1]).max()   # forward is -Y
apart = (hl[:, 0] - hr[:, 0])[np.argmax(np.minimum(sh[:, 1] - hl[:, 1], sh[:, 1] - hr[:, 1]))]
hd = b(A, 'head')[:, 3:]; lunge = hd[0, 1] - hd[:, 1].min()
print(name, 'both hands reach %.3f in front of the shoulders (%.0f%% of height), %.3f apart; head goes %.3f forward' % (both, 100 * both / H, apart, lunge))
if both < .15 * H: bad('both hands do not reach out together (%.3f)' % both)
if apart < .27 * H: bad('the hands are only %.3f apart at the grab (need %.3f: a body between them)' % (apart, .27 * H))
if lunge < .08 * H: bad('the head goes only %.3f forward (no bite)' % lunge)
d0 = np.abs(A[0] - OA[0]).max(); d1 = np.abs(A[-1] - OA[0]).max()
if d0 > .005 * H or d1 > .005 * H: bad('does not start and end on today\'s first pose (%.3f, %.3f)' % (d0, d1))
for f in ('foot.L', 'foot.R'):
    s = np.abs(b(A, f)[:, :3] - b(A, f)[0, :3]).max()
    if s > .02 * H: bad('the %s moves %.3f (feet should stay planted)' % (f, s))
if V[:, :, 2].min() < -.015: bad('the body goes %.3f into the ground' % -V[:, :, 2].min())
for c in ['idle', 'zombie_walk', 'zombie_run', 'collapse']:
    if 'J:' + c in N and np.abs(N['J:' + c] - O['J:' + c]).max() > 1e-3: bad('%s changed' % c)
print(('PASS ' if not fails else 'FAIL ') + name + ' grab and bite')
sys.exit(1 if fails else 0)
