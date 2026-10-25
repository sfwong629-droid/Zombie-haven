#!/usr/bin/env python3
"""Farm (2x2) animation, front and back: crop leaves ripple (farm_anim.frames with no row sway) and the scarecrow's own
pixels sway 1 px (farm_anim.masked_sway), so the crops and barn behind it stay put.
    python3 tools/art/field_anim.py"""
import sys
from PIL import Image
sys.path.insert(0, 'tools/art')
import farm_anim as fa
T = 'assets/buildings/t56/'
for name, box in (('field', (56, 19, 88, 34)), ('field_back', (42, 7, 75, 22))):
    im = Image.open(T + name + '.png').convert('RGBA')
    base = fa.frames(im, (0, 0, 0, 0), -1, 12)          # empty scarecrow box: crops only
    fr = fa.masked_sway(im, base, [box])
    st = Image.new('RGBA', (im.width * len(fr), im.height), (0, 0, 0, 0))
    for i, f in enumerate(fr): st.alpha_composite(f, (i * im.width, 0))
    st.save(T + name + '_anim.png'); print(name, len(fr), im.size)
