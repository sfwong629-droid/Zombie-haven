#!/usr/bin/env python3
"""Give every building its own colour identity and brighten the set (V2.29).
Reads assets/buildings/v5_src/<type>.png (the drawn originals), writes assets/buildings/v5/<type>.png.
Warm brown/orange pixels in the roof band (top part of the sprite) get the building's roof hue; warm pixels below can get
an accent hue on a few buildings; everything is lifted in brightness and saturation. Pixel positions never change."""
import colorsys, os, sys
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC, DST = os.path.join(ROOT, 'assets/buildings/v5_src'), os.path.join(ROOT, 'assets/buildings/v5')
# roof hue (degrees) and saturation/value multipliers; wall: optional hue for warm pixels below the roof band; band = roof band fraction
SCHEME = {
  'house':     dict(roof=(4, 1.25, 1.10), band=.55),                    # red tile roof
  'water':     dict(roof=(205, 1.1, 1.15), wall=(205, .8, 1.1), band=.6),  # blue tank
  'well':      dict(roof=(190, .9, 1.15), band=.5),                     # teal roof, grey stone
  'farm':      dict(roof=(95, 1.2, 1.12), wall=(95, 1.0, 1.08), band=1.0),# green garden
  'field':     dict(roof=(85, 1.25, 1.1), band=.8),                     # green crops
  'medic':     dict(roof=(0, .0, 1.45), band=.65, keepred=True),        # white tent, red cross kept
  'clinic':    dict(roof=(175, .55, 1.3), band=.55, keepred=True),      # pale teal
  'hospital':  dict(roof=(0, .05, 1.35), wall=(200, .25, 1.25), band=.5, keepred=True),
  'canteen':   dict(roof=(48, 1.35, 1.2), band=.6, keepred=True),       # yellow awning
  'armory':    dict(roof=(205, .3, .95), wall=(90, .3, .85), band=.6),  # olive steel
  'workshop':  dict(roof=(215, .6, 1.05), band=.55),                    # blue-grey sheds
  'storage':   dict(roof=(150, .7, 1.1), band=.6),                      # green-teal containers
  'scrapyard': dict(roof=(22, 1.2, 1.1), band=.7),                      # rust orange (kept warm)
  'gym':       dict(roof=(215, .8, 1.05), band=.55),
  'library':   dict(roof=(255, .6, 1.05), band=.55),                   # purple roof
  'lounge':    dict(roof=(325, .6, 1.12), band=.6),                     # pink awning
  'range':     dict(roof=(70, .55, 1.0), band=.6),                     # khaki
  'track':     dict(roof=(40, .8, 1.2), band=.9),                      # sand
  'sparring':  dict(roof=(355, .85, 1.05), band=.6),                       # red ring
  'barracks':  dict(roof=(95, .6, .9), wall=(95, .35, .9), band=.55),# military green
}
def warm(h, s, v): return (h < 50 / 360 or h > 340 / 360) and s > .25 and v > .15
def main():
    for t, sc in SCHEME.items():
        src = os.path.join(SRC, t + '.png')
        if not os.path.exists(src): continue
        im = Image.open(src).convert('RGBA'); px = im.load(); w, h = im.size
        ys = [y for y in range(h) for x in range(w) if px[x, y][3]]; top, bot = min(ys), max(ys)
        coltop = {x: min([y for y in range(h) if px[x, y][3]] or [h]) for x in range(w)}   # roof band follows the silhouette's top edge (iso roofs slope)
        depth = (bot - top) * sc['band'] * .62
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if not a: continue
                hh, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
                red = (hh < 12 / 360 or hh > 345 / 360) and s > .55 and v > .45
                tgt = None
                if warm(hh, s, v) and not (sc.get('keepred') and red):
                    d = y - coltop[x]
                    if d <= depth + ((x * 7 + y * 3) % 3) - 1: tgt = sc['roof']
                    elif sc.get('wall'): tgt = sc['wall']
                    else: s *= .62; v = min(1, v * 1.04)   # walls: weathered wood, so the roof colour reads
                if tgt:
                    hh = tgt[0] / 360; s = min(.82, s * tgt[1]); v = min(1, v * tgt[2])
                v = min(1, v * 1.12 + .03); s = min(1, s * 1.08)   # brighter overall
                r, g, b = colorsys.hsv_to_rgb(hh, s, v); px[x, y] = (round(r * 255), round(g * 255), round(b * 255), a)
        im.save(os.path.join(DST, t + '.png'))
    print('recoloured', len(SCHEME))
if __name__ == '__main__': main()
