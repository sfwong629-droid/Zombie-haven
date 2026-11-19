# Turns the man's approved grunt (oofm0) into a woman's voice with the WORLD vocoder (pip install pyworld soundfile):
# pitch up 12/14/16 semitones and the spectral envelope warped up 17-23% so it is not a sped-up man. Writes /tmp/fem/n|o|p.wav (ooff13-15).
import numpy as np, soundfile as sf, pyworld as pw, sys
x, fs = sf.read('/tmp/fem/man.wav'); x = x.astype(np.float64)
f0, t = pw.harvest(x, fs, f0_floor=60, f0_ceil=700, frame_period=2.0)
sp = pw.cheaptrick(x, f0, t, fs); ap = pw.d4c(x, f0, t, fs)
v = f0[f0 > 0]; print('man f0 median', np.median(v) if len(v) else 0, 'voiced frames', len(v), 'of', len(f0))
def warp(env, a):   # move the voice's resonances up by factor a
    n = env.shape[1]; src = np.arange(n) / a
    return np.array([np.interp(src, np.arange(n), row) for row in env])
for name, semis, a in [('n', 12, 1.17), ('o', 14, 1.2), ('p', 16, 1.23)]:
    y = pw.synthesize(f0 * 2 ** (semis / 12), warp(sp, a), warp(ap, a), fs, 2.0)
    y = y / max(1e-9, np.abs(y).max()) * np.abs(x).max()
    sf.write(f'/tmp/fem/{name}.wav', y, fs); print(name, semis, a, 'f0 median', np.median(v) * 2 ** (semis / 12))
