#!/usr/bin/env python3
"""Rubble and debris decorations for the ground (PixelLab "zh-debris" objects, 32x32 canvas each).

Every sprite stays at its drawn size (no shrinking). The script
  1. crops each kept sprite to its pixels and packs them into one atlas strip
  2. scatters them in small CLUSTERS of the same family (stone, brick, wood, metal, plant, litter)
     on open tiles only: never on a road tile, never under a building's footprint
and writes  <out>.png  (atlas)  and  <out>.json  ({items: [[x, w, h], ...], place: [[item, tx, ty], ...]}).
tx, ty are tile coordinates of the sprite's foot (bottom centre); the page draws it at P(tx, ty), depth tx + ty.
    python3 tools/art/debris_layer.py <src_dir with dNN.png> <out_base>"""
import sys, os, json, random, math
from PIL import Image

# kept: low, ground-hugging pieces that read right next to a 30-px person at their drawn size.
# left out: single small objects drawn as big as a person (barrel, jerrycan, radio, boots, cans, skull ...),
# town things (bicycle, road barrier, pallet), and the bullet shells (never generated into the set).
FAMILIES = {
    'stone':  [0, 9, 11, 14, 20, 35, 40],
    'brick':  [1, 41, 45, 61],
    'wood':   [4, 12, 24, 39, 43, 52, 59],
    'metal':  [5, 8, 18, 32, 44, 50, 63],
    'plant':  [6, 7, 47],
    'litter': [15, 17, 28, 34, 49],
}
MIXES = [('stone',), ('stone', 'brick'), ('brick',), ('wood',), ('wood', 'plant'), ('metal',), ('metal', 'stone'),
         ('plant',), ('litter', 'wood'), ('litter', 'stone')]

N = 14
ROAD = {(x, y) for x in range(1, 12) for y in (1, 10)} | {(x, y) for x in (1, 11) for y in range(1, 11)}
BUILD = [('tent', 2, 2, 1), ('house', 4, 2, 1), ('water', 6, 2, 1), ('farm', 2, 5, 1), ('well', 4, 5, 1), ('storage', 6, 5, 1),
         ('gym', 4, 7, 1), ('library', 6, 7, 1), ('lounge', 2, 7, 1), ('clinic', 8, 4, 2), ('canteen', 8, 7, 2), ('armory', 10, 4, 2),
         ('workshop', 10, 8, 2), ('scrapyard', 4, 9, 2), ('range', 7, 9, 2), ('track', 4, 11, 2), ('sparring', 7, 11, 2),
         ('hospital', 13, 3, 3), ('field', 13, 6, 3), ('barracks', 13, 9, 3)]

def blocked():
    b = set(ROAD)
    for _, x, y, s in BUILD:   # s: 1 = one tile, 2 = two tiles (either way round), 3 = 2 x 2; the sprite's foot is tile (x, y)
        b.add((x, y))
        if s >= 2: b |= {(x - 1, y), (x, y - 1)}
        if s == 3: b.add((x - 1, y - 1))
    return b

def main(src, out):
    keep = sorted({i for v in FAMILIES.values() for i in v})
    items, idx, ims = [], {}, []
    x = 0
    for i in keep:
        im = Image.open(os.path.join(src, f'd{i:02d}.png')).convert('RGBA'); im = im.crop(im.getbbox())
        idx[i] = len(items); items.append([x, im.width, im.height]); ims.append((x, im)); x += im.width + 1
    atlas = Image.new('RGBA', (x, max(h for _, _, h in items)), (0, 0, 0, 0))
    for ax, im in ims: atlas.paste(im, (ax, 0))
    atlas.save(out + '.png')

    rr = random.Random(7); bad = blocked()
    near = {(x + a, y + b) for _, x, y, _ in BUILD for a in (-2, -1, 0) for b in (-2, -1, 0)}   # keep the yards round buildings clear
    free = [(tx, ty) for tx in range(N) for ty in range(N) if (tx, ty) not in bad and (tx, ty) not in near]
    place, used = [], set()
    rr.shuffle(free)
    for tx, ty in free[:len(free) * 2 // 5]:   # about 2 in 5 open tiles get a cluster: open ground stays between them
        fam = rr.choice(MIXES); n = rr.choice((1, 2, 2, 3))
        pts = []
        for k in range(n):
            for _ in range(20):   # spread inside the tile, not touching a sprite already in this cluster
                u, v = rr.uniform(.2, .8), rr.uniform(.2, .8)
                if all(math.hypot(u - a, v - b) > .42 for a, b in pts): pts.append((u, v)); break
        for u, v in pts:
            pool = FAMILIES[rr.choice(fam)]
            i = rr.choice([j for j in pool if j not in used] or pool); used.add(i)
            if len(used) == len(keep): used.clear()
            place.append([idx[i], round(tx + u, 3), round(ty + v, 3)])
    json.dump({'items': items, 'place': place}, open(out + '.json', 'w'))
    print(len(items), 'sprites,', len(place), 'placed on', len(free) * 2 // 5, 'tiles')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
