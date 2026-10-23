#!/usr/bin/env python3
"""Grey clay-model guides for ChatGPT: boxes placed in tile units on an exact 2:1 isometric grid.
World: u along the long axis (screen +28,-14 per tile), v along the short axis (+28,+14 per tile), h up in pixels.
Visible faces of a box: top, the u=u0 face (lit, facing down-left) and the v=v1 face (shade, facing down-right)."""
from PIL import Image, ImageDraw

def proj(A, u, v, h): return (A[0] + 28 * u + 28 * v, A[1] - 14 * u + 14 * v - h)

def box(d, A, u0, u1, v0, v1, h0, h1, shade):
    t, l, r = shade
    P = lambda u, v, h: proj(A, u, v, h)
    d.polygon([P(u0, v0, h0), P(u0, v1, h0), P(u0, v1, h1), P(u0, v0, h1)], fill=l, outline=(0, 0, 0, 255))
    d.polygon([P(u0, v1, h0), P(u1, v1, h0), P(u1, v1, h1), P(u0, v1, h1)], fill=r, outline=(0, 0, 0, 255))
    d.polygon([P(u0, v0, h1), P(u1, v0, h1), P(u1, v1, h1), P(u0, v1, h1)], fill=t, outline=(0, 0, 0, 255))

GREYS = [((214, 214, 208, 255), (190, 190, 184, 255), (160, 160, 154, 255)),
         ((176, 172, 164, 255), (150, 146, 140, 255), (120, 116, 110, 255)),
         ((150, 150, 150, 255), (128, 128, 128, 255), (100, 100, 100, 255))]

def scene(objs, W, H, A):
    """objs: list of (u0,u1,v0,v1,h0,h1,grey index); drawn back to front by depth (v - u of the box's near corner)."""
    m = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(m)
    # floor slabs first, then everything else from back to front (by the box centre's v - u)
    for o in sorted(objs, key=lambda o: (o[5] > 0, (o[2] + o[3]) / 2 - (o[0] + o[1]) / 2)):
        box(d, A, *o[:6], GREYS[o[6] if isinstance(o[6], int) else 0])
    return m
