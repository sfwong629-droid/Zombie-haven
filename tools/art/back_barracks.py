#!/usr/bin/env python3
"""Barracks back-view guide: approved front on the left, the model turned 180 degrees on the right (the doorway is on the
far side now, so it is left out; the sandbags go behind the hut, the watch platform is drawn last)."""
import sys
sys.path.insert(0, 'tools/art')
from PIL import Image, ImageDraw
import model_barracks as m, guide_2x2 as g
from clay_model import box
from model_scrapyard import sh
B = g.back
order = B([m.OBJ[0]]) + B(m.YARD) + B(m.HUT) + B(m.TOWER)
c = Image.new('RGBA', (g.W, g.H), (255, 0, 255, 255))
f = Image.open('assets/buildings/t56/barracks.png').convert('RGBA')
c.alpha_composite(f, (2, g.BOTTOM - f.height + 1))
mm = Image.new('RGBA', (g.W, g.H), (0, 0, 0, 0)); d = ImageDraw.Draw(mm); A2 = (g.W - 2 - 112 - 4, g.A[1])
for o in order: box(d, A2, *o[:6], sh(o[6]))
c.alpha_composite(mm)
c.resize((g.W * 12, g.H * 12), Image.NEAREST).convert('RGB').save('tools/art/templates/t56/back_model_2x2_barracks.png')
if len(sys.argv) > 1: c.resize((g.W * 3, g.H * 3), Image.NEAREST).save(sys.argv[1])
