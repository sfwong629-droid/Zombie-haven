"""Build the Gear Motion Board: frame PNGs -> one WebP strip per clip, plus index.html with the data."""
import json, re, os, glob
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); FR = os.path.join(D, 'frames'); OUT = os.path.join(D, 's'); os.makedirs(OUT, exist_ok=True)
jobs = json.load(open(os.path.join(FR, 'jobs.json'))); items = json.load(open(os.path.join(FR, 'items.json')))
src = open('/root/Zombie-haven/js/game.js').read()
def stat(id_):
    m = re.search(r'\n  ' + id_ + r': \{ name: "[^"]+", slot: "(\w+)"([^}]*)\}', src)
    if not m: return ''
    body = m.group(2); g = lambda k: (re.search(k + r': ([\d.]+)', body) or [None, None])[1]
    if m.group(1) == 'weapon':
        kind = (re.search(r'kind: "(\w+)"', body) or [None, ''])[1]; s = f"{kind} · ATK {g('atk')} · speed {g('rate')}"
        if g('range'): s += f" · range {g('range')}"
        if g('mag'): s += f" · mag {g('mag')}"
        return s + f" · cost {g('cost')}"
    return f"DEF {g('def')} · cost {g('cost')}"
WM = {'pipe': 'bat', 'bat': 'bat', 'crowbar': 'bat', 'nailbat': 'bat', 'sledge': 'bat', 'spear': 'bat', 'knife': 'axe', 'machete': 'axe', 'axe': 'axe', 'katana': 'axe', 'pistol': 'pistol', 'revolver': 'pistol', 'shotgun': 'rifle', 'rifle': 'rifle', 'bow': 'rifle', 'crossbow': 'rifle', 'smg': 'ak47', 'assault': 'ak47', 'golf': 'bat', 'shovel': 'bat', 'roadsign': 'bat', 'spiked': 'bat', 'hatchet': 'axe', 'cleaver': 'axe', 'magnum': 'pistol'}
OWN = {'bat': 'bat', 'axe': 'axe', 'pistol': 'pistol', 'rifle': 'rifle', 'assault': 'ak47'}
MNAME = {'bat': 'Bat', 'axe': 'Axe', 'pistol': 'Pistol', 'rifle': 'Rifle', 'ak47': 'AK-47'}
LABEL = {'idle': ('Standing', ''), 'walk': ('Walk', ''), 'run': ('Run', ''), 'punch': ('Punch', ''), 'melee_hold_idle': ('Ready stance', ''), 'melee_hold_walk': ('Walk', 'weapon held'),
         'melee_swing_a': ('Swing A', 'normal hit'), 'melee_swing_b': ('Swing B', 'normal hit'), 'melee_swing_d': ('Finisher', '3rd hit of a combo'), 'gun_hold_idle': ('Aim stance', ''),
         'gun_hold_walk': ('Walk', 'gun held'), 'gun_fire': ('Fire', ''), 'pistol_fire': ('Fire', '')}
names = {k: n for k, n, sl, kd in items}; names['fists'] = 'Fists'
cells = {}
for cid, eq, cl in jobs:
    fs = sorted(glob.glob(os.path.join(FR, cid + '__*.png')))
    if not fs: continue
    ims = [Image.open(f).convert('RGBA') for f in fs]; w, h = ims[0].size; st = Image.new('RGBA', (w * len(ims), h))
    for i, im in enumerate(ims): st.paste(im, (i * w, 0))
    st.save(os.path.join(OUT, cid + '.webp'), quality=82, method=6)
    loop = bool(re.search(r'walk|run|idle', cl)); lab, note = LABEL.get(cl, (cl, ''))
    if cid.startswith('a_') and cl == 'melee_swing_a': lab, note = 'Bat swing', 'to see it in a fight'
    cells.setdefault(cid.rsplit('_' + cl, 1)[0], []).append({'src': 's/' + cid + '.webp', 'n': len(ims), 'loop': loop, 'fps': 12 if loop else 14, 'label': lab, 'note': note})
def wrow(id_):
    m = WM.get(id_); return {'name': names.get(id_, id_), 'stats': 'everyone starts here' if id_ == 'fists' else stat(id_), 'model': '', 'shared': False, 'cells': cells.get('w_' + id_, [])}
wl = [k for k, n, sl, kd in items if sl == 'weapon']
melee = [k for k in wl if WM.get(k) in ('bat', 'axe')]; guns = [k for k in wl if WM.get(k) not in ('bat', 'axe')]
# 3D.94 clothing compare: the shirt colour today, rigid add-on pieces, a bending outfit shell
CF = os.path.join(D, 'cmpf'); cmp_rows = []
for cid in ['riot', 'hoodie', 'firecoat']:
    cs = []
    for mode, lab in (('now', 'Today'), ('rigid', 'Rigid pieces'), ('shell', 'Bending outfit')):
        for cl in ('walk', 'melee_swing_a'):
            fs = sorted(glob.glob(os.path.join(CF, f'c_{cid}_{mode}_{cl}__*.png')))
            if not fs: continue
            ims = [Image.open(f).convert('RGBA') for f in fs]; w, h = ims[0].size; st = Image.new('RGBA', (w * len(ims), h))
            for i, im in enumerate(ims): st.paste(im, (i * w, 0))
            nm = f'cmp_{cid}_{mode}_{cl}'; st.save(os.path.join(OUT, nm + '.webp'), quality=82, method=6)
            cs.append({'src': 's/' + nm + '.webp', 'n': len(ims), 'loop': cl == 'walk', 'fps': 12 if cl == 'walk' else 14, 'label': lab, 'note': 'walk' if cl == 'walk' else 'bat swing'})
    cmp_rows.append({'name': names.get(cid, cid), 'stats': stat(cid), 'model': '', 'shared': False, 'cells': cs})
sections = [
  {'id': 'compare', 'title': 'Clothing: two ways', 'note': 'Pick one for all the clothing. Today: only the shirt colour changes (DEF 7+ adds grey plates). Rigid pieces: vest panels, a collar and shoulder pads fixed to the bones, chunky and clear from far away, but stiff when the body twists. Bending outfit: the body\'s own torso skin pushed out into a fitted layer that bends with every move, closer to real clothing but subtler from the game camera. Both are drawn over the survivor\'s own shirt.', 'rows': cmp_rows},
  {'id': 'melee', 'title': 'Melee', 'note': 'Ready stance, walking with the weapon, then the two normal swings and the combo finisher. Every weapon now has its own model. Updated: stop sign, pointed shovel, katana, fire axe, curved machete; cleaver and hatchet edges face away from the body.', 'rows': [wrow('fists')] + [wrow(k) for k in melee]},
  {'id': 'ranged', 'title': 'Guns and bows', 'note': 'Aim stance, walking with the weapon, then firing. Pistols use the one-hand pose; rifles, shotguns, bows and the SMG use the two-hand pose. Every gun and bow now has its own model; the bow still uses the two-hand rifle pose.', 'rows': [wrow(k) for k in guns]},
  {'id': 'clothing', 'title': 'Clothing', 'note': 'Clothing recolours the shirt; DEF 7 and up also adds the grey plate pieces. Shown walking and swinging a bat.', 'rows': [{'name': names[k], 'stats': stat(k), 'model': '', 'shared': False, 'cells': cells.get('a_' + k, [])} for k, n, sl, kd in items if sl == 'armor']},
  {'id': 'hats', 'title': 'Hats', 'note': 'Hats sit on the head bone, fitted to the survivor. Shown standing and walking.', 'rows': [{'name': names[k], 'stats': stat(k), 'model': '', 'shared': False, 'cells': cells.get('h_' + k, [])} for k, n, sl, kd in items if sl == 'head']},
]
html = open(os.path.join(D, 'template.html')).read().replace('/*DATA*/null', json.dumps({'sections': sections}))
open(os.path.join(D, 'index.html'), 'w').write(html)
print('cells', sum(len(r['cells']) for s in sections for r in s['rows']), 'size MB', round(sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT)) / 1e6, 2))
