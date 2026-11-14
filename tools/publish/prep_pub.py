# tools/publish/prep_pub.py PLAY_DIR [armour ids...]
# Gets the "play" folder ready for publishing the game as the claude.ai artifact: copies the changed game files in,
# base64-wraps any new armour models (the artifact host serves them as .glb.txt), lists them in files.json / files.txt,
# and bumps the cache tag v=3d.N in PLAY_DIR/index.html. Prints the files map to publish.
# The publish itself happens from a claude.ai session (Artifact tool, url https://claude.ai/artifact/PidbC3srwbxmFqhfPkqJmn);
# PLAY_DIR is that session's copy of the published files (index.html there is NOT the repo's index.html: never overwrite it with it,
# copy only the lines that changed, e.g. a new element).
# Publish only COMMITTED code: after running this, replace the copied files with `git show HEAD:<file>` if the tree has unfinished work.
import json, sys, shutil, base64, re, os
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')) + '/'
P = os.path.abspath(sys.argv[1]) + '/'
fm = {}
for f in ['js/game.js', 'js/render3d.js', 'js/itemicons.js', 'css/glass.css']: shutil.copy(R + f, P + f); fm[f] = f
d = json.load(open(P + 'files.json')); t = [x for x in open(P + 'files.txt').read().split('\n') if x]
for id in sys.argv[2:]:
    k = f'assets/characters/ai3d_v2/armor_{id}_m3.glb.txt'; open(P + k, 'w').write(base64.b64encode(open(R + k[:-4], 'rb').read()).decode()); d[k] = k; fm[k] = k
    if k not in t: t.append(k)
json.dump(d, open(P + 'files.json', 'w')); open(P + 'files.txt', 'w').write('\n'.join(t)); fm['files.json'] = 'files.json'; fm['files.txt'] = 'files.txt'
h = open(P + 'index.html').read(); n = int(re.search(r'v=3d\.(\d+)', h).group(1)); h = h.replace('v=3d.%d' % n, 'v=3d.%d' % (n + 1)); open(P + 'index.html', 'w').write(h)
print('v=3d.%d' % (n + 1)); print(json.dumps(fm))
