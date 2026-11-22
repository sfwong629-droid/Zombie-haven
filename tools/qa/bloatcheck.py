# bloatcheck.py NEW.npz OLD.npz NAME [queen] : the Bloater Queen's (and later the Bloated's) arms (owner, 21 Nov, W181: "no arms movement at all"; W199: the
# Queen "looks good"). Reads animdump.py dumps of the game model (NEW) and the model before (OLD). Walk: each hand swings forward and back at least a tenth
# of the body's height and stays out wide of the shoulder; the walk ends where it starts. Attack: the arms sweep across (the queen: both hands on her right,
# later both on her left: the point between the hands at least 8% of her height either side), the chest throws itself forward at least 15 degrees, both hands come round in front of the belly. Never: an elbow or hand above
# the shoulder (it drags the belly skin up), the body in the ground. The other animations unchanged. The old moves fail it.
import sys, numpy as np
new, old, name = sys.argv[1:4]; queen = len(sys.argv) > 4 and sys.argv[4] == 'queen'
N = np.load(new, allow_pickle=True); O = np.load(old, allow_pickle=True); B = list(N['bones']); fails = []
def bad(m): fails.append(m); print('FAIL', name, m)
b = lambda J, n: J[:, B.index(n)]
H = N['V:idle'][0][:, 2].max() - N['V:idle'][0][:, 2].min()
W, V = N['J:bloated_walk'], N['V:bloated_walk']
for s in 'LR':
    h = b(W, 'hand.' + s)[:, :3]; sw = h[:, 1].max() - h[:, 1].min(); sh = b(W, 'upperarm.' + s)[:, :3]
    out = (np.abs(h[:, 0]) - np.abs(sh[:, 0])).min()
    print(name, 'walk hand', s, 'swings %.3f (%.0f%% of height), at least %.3f out from the shoulder' % (sw, 100 * sw / H, out))
    if sw < .10 * H: bad('walk: the %s hand swings only %.3f' % (s, sw))
    if out < .03 * H: bad('walk: the %s hand comes in to %.3f of the shoulder line' % (s, out))
if np.abs(V[0] - V[-1]).max() > .005 * H: bad('walk jumps %.3f at the repeat' % np.abs(V[0] - V[-1]).max())
A, VA = N['J:bloated_attack'], N['V:bloated_attack']; hl = b(A, 'hand.L')[:, :3]; hr = b(A, 'hand.R')[:, :3]
ch = b(A, 'chest'); d = ch[:, 3:] - ch[:, :3]; lean = np.degrees(np.arctan2(-d[:, 1], d[:, 2])).max()
front = np.maximum(hl[:, 1], hr[:, 1]).min()
print(name, 'attack: chest leans up to %.0f degrees forward; both hands reach %.3f in front' % (lean, -front))
if lean < 15: bad('attack: the chest leans only %.0f degrees forward' % lean)
if front > -.25 * H: bad('attack: the hands never come round in front of the belly (%.3f)' % -front)
if queen:
    mid = (hl[:, 0] + hr[:, 0]) / 2   # +X is her left
    print(name, 'attack sweep: the hands together swing from %.3f on her right to %.3f on her left' % (-mid.min(), mid.max()))
    if mid.min() > -.08 * H or mid.max() < .08 * H: bad('attack: no sweep across (the hands together reach %.3f right, %.3f left; need %.3f)' % (-mid.min(), mid.max(), .08 * H))
for c, J in (('bloated_walk', W), ('bloated_attack', A)):
    for s in 'LR':
        top = b(J, 'upperarm.' + s)[:, 2]; up = max((b(J, 'forearm.' + s)[:, 2] - top).max(), (b(J, 'hand.' + s)[:, 2] - top).max())
        if up > .03 * H: bad('%s: the %s arm goes %.3f above the shoulder' % (c, s, up))
    lo = N['V:' + c][:, :, 2].min()
    if lo < -.015: bad('%s: the body goes %.3f into the ground' % (c, -lo))
for c in ['idle', 'zombie_walk', 'zombie_attack', 'collapse']:
    dd = np.abs(N['J:' + c] - O['J:' + c]).max()
    if dd > 1e-3: bad('%s changed (by %.4f)' % (c, dd))   # recompressing the file moves keys by under half a millimetre
print(('PASS ' if not fails else 'FAIL ') + name + ' arms')
sys.exit(1 if fails else 0)
