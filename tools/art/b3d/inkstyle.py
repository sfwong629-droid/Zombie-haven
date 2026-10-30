"""Ink-cartoon look for Blender scenes (direction B, round 3 target).

import inkstyle; inkstyle.setup(scene)          # outlines, paper, colour management
mat = inkstyle.ink('wood', '#8a5a34')           # toon material: lit / shadow bands,
                                                # ink speckle, hatching in shadow
The look: two hard tone bands driven by real light, darker hatching lines in the
shadow band (screen-space, so they stay the same size like pen strokes), a little
mottled speckle for a hand-painted feel, wobbly dark-brown outlines (Freestyle with
spatial noise), and a paper-grain overlay in the compositor.
"""
import bpy, colorsys

def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c] + [1]

def shade_of(hexcol, k=0.62, hue_shift=-0.02, sat=1.12):
    h = hexcol.lstrip('#'); r, g, b = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    hh, ll, ss = colorsys.rgb_to_hls(r, g, b)
    r, g, b = colorsys.hls_to_rgb((hh + hue_shift) % 1, ll * k, min(1, ss * sat))
    return '#%02x%02x%02x' % tuple(int(v * 255) for v in (r, g, b))

_cache = {}
def ink(name, base, shadow=None, speckle=0.18, hatch=True, emit=None, lines=None, flecks=0.0, patches=0.0, fleck_scale=9):
    key = (name, base, shadow, speckle, hatch, emit, str(lines), flecks, patches, fleck_scale)
    if key in _cache: return _cache[key]
    shadow = shadow or shade_of(base)
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    N = nt.nodes.new; L = nt.links.new
    out = N('ShaderNodeOutputMaterial')
    dif = N('ShaderNodeBsdfDiffuse')
    s2r = N('ShaderNodeShaderToRGB'); L(dif.outputs[0], s2r.inputs[0])
    bw = N('ShaderNodeRGBToBW'); L(s2r.outputs[0], bw.inputs[0])
    # tone bands
    ramp = N('ShaderNodeValToRGB'); ramp.color_ramp.interpolation = 'CONSTANT'
    e = ramp.color_ramp.elements
    e[0].position, e[0].color = 0.0, lin(shadow); e[1].position, e[1].color = 0.16, lin(base)
    L(bw.outputs[0], ramp.inputs[0])
    col = ramp.outputs[0]
    # shadow mask (1 in shadow)
    sm = N('ShaderNodeMath'); sm.operation = 'LESS_THAN'; sm.inputs[1].default_value = 0.16; L(bw.outputs[0], sm.inputs[0])
    tc = N('ShaderNodeTexCoord')
    if hatch:
        wv = N('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'DIAGONAL'
        wv.inputs['Scale'].default_value = 26; wv.inputs['Distortion'].default_value = 1.5
        wv.inputs['Detail'].default_value = 1
        L(tc.outputs['Window'], wv.inputs['Vector'])
        th = N('ShaderNodeMath'); th.operation = 'GREATER_THAN'; th.inputs[1].default_value = 0.8; L(wv.outputs['Fac'], th.inputs[0])
        hm = N('ShaderNodeMath'); hm.operation = 'MULTIPLY'; L(th.outputs[0], hm.inputs[0]); L(sm.outputs[0], hm.inputs[1])
        hs = N('ShaderNodeMath'); hs.operation = 'MULTIPLY'; hs.inputs[1].default_value = 0.45; L(hm.outputs[0], hs.inputs[0])
        mix = N('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.inputs['B'].default_value = (0.05, 0.035, 0.025, 1)
        L(hs.outputs[0], mix.inputs['Factor']); L(col, mix.inputs['A']); col = mix.outputs['Result']
    if lines:   # ink lines in object space: plank seams, roof boards, plaid
        # lines = (axis, spacing) or a list of (axis, spacing[, width, hexcolour, strength])
        specs = [lines] if isinstance(lines[0], str) else list(lines)
        for sp in specs:
            axis, spacing = sp[0], sp[1]
            width = sp[2] if len(sp) > 2 else 0.09
            colr = lin(sp[3]) if len(sp) > 3 and sp[3] else (0.05, 0.035, 0.025, 1)
            strength = sp[4] if len(sp) > 4 else 0.75
            sx = N('ShaderNodeSeparateXYZ'); L(tc.outputs['Object'], sx.inputs[0])
            mu = N('ShaderNodeMath'); mu.operation = 'DIVIDE'; mu.inputs[1].default_value = spacing; L(sx.outputs[axis], mu.inputs[0])
            fr = N('ShaderNodeMath'); fr.operation = 'FRACT'; L(mu.outputs[0], fr.inputs[0])
            lt = N('ShaderNodeMath'); lt.operation = 'LESS_THAN'; lt.inputs[1].default_value = width; L(fr.outputs[0], lt.inputs[0])
            lk = N('ShaderNodeMath'); lk.operation = 'MULTIPLY'; lk.inputs[1].default_value = strength; L(lt.outputs[0], lk.inputs[0])
            lm = N('ShaderNodeMix'); lm.data_type = 'RGBA'; lm.inputs['B'].default_value = colr
            L(lk.outputs[0], lm.inputs['Factor']); L(col, lm.inputs['A']); col = lm.outputs['Result']
    if flecks:  # scattered dark ink marks (ground, bark)
        fn = N('ShaderNodeTexVoronoi'); fn.inputs['Scale'].default_value = fleck_scale
        L(tc.outputs['Object'], fn.inputs['Vector'])
        fl = N('ShaderNodeMath'); fl.operation = 'LESS_THAN'; fl.inputs[1].default_value = 0.07; L(fn.outputs['Distance'], fl.inputs[0])
        fk = N('ShaderNodeMath'); fk.operation = 'MULTIPLY'; fk.inputs[1].default_value = flecks; L(fl.outputs[0], fk.inputs[0])
        fm = N('ShaderNodeMix'); fm.data_type = 'RGBA'; fm.inputs['B'].default_value = (0.06, 0.04, 0.025, 1)
        L(fk.outputs[0], fm.inputs['Factor']); L(col, fm.inputs['A']); col = fm.outputs['Result']
    if patches:  # broad lighter / darker patches, like uneven watercolour wash
        pn = N('ShaderNodeTexNoise'); pn.inputs['Scale'].default_value = 0.18; pn.inputs['Detail'].default_value = 3
        L(tc.outputs['Object'], pn.inputs['Vector'])
        pr = N('ShaderNodeValToRGB'); pe = pr.color_ramp.elements
        pe[0].position, pe[0].color = 0.35, (1 - patches, 1 - patches * 0.8, 1 - patches * 1.1, 1)
        pe[1].position, pe[1].color = 0.65, (1 + patches * 0.5, 1 + patches * 0.45, 1 + patches * 0.2, 1)
        L(pn.outputs['Fac'], pr.inputs[0])
        pm = N('ShaderNodeMix'); pm.data_type = 'RGBA'; pm.blend_type = 'MULTIPLY'; pm.inputs['Factor'].default_value = 1
        L(col, pm.inputs['A']); L(pr.outputs[0], pm.inputs['B']); col = pm.outputs['Result']
    if speckle:
        nz = N('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 7; nz.inputs['Detail'].default_value = 8
        nz.inputs['Roughness'].default_value = 0.7
        L(tc.outputs['Object'], nz.inputs['Vector'])
        sr = N('ShaderNodeValToRGB'); se = sr.color_ramp.elements
        se[0].position, se[0].color = 0.35, (1 - speckle, 1 - speckle, 1 - speckle * 0.9, 1)
        se[1].position, se[1].color = 0.75, (1.04, 1.03, 1.0, 1)
        L(nz.outputs['Fac'], sr.inputs[0])
        mm = N('ShaderNodeMix'); mm.data_type = 'RGBA'; mm.blend_type = 'MULTIPLY'; mm.inputs['Factor'].default_value = 1
        L(col, mm.inputs['A']); L(sr.outputs[0], mm.inputs['B']); col = mm.outputs['Result']
    em = N('ShaderNodeEmission'); L(col, em.inputs[0])
    if emit:
        e2 = N('ShaderNodeEmission'); e2.inputs[0].default_value = lin(emit[0]); e2.inputs[1].default_value = emit[1]
        ad = N('ShaderNodeAddShader'); L(em.outputs[0], ad.inputs[0]); L(e2.outputs[0], ad.inputs[1])
        L(ad.outputs[0], out.inputs[0])
    else:
        L(em.outputs[0], out.inputs[0])
    _cache[key] = m
    return m

def setup(S, line_px=2.2, wobble=1.4):
    S.view_settings.view_transform = 'Standard'
    S.render.use_freestyle = True
    S.render.line_thickness_mode = 'ABSOLUTE'; S.render.line_thickness = 1.0
    fs = S.view_layers[0].freestyle_settings
    ls = fs.linesets[0] if fs.linesets else fs.linesets.new('ink')
    lst = ls.linestyle or bpy.data.linestyles.new('ink'); ls.linestyle = lst
    lst.color = (0.07, 0.045, 0.03); lst.thickness = line_px; lst.alpha = 1.0
    lst.thickness_position = 'CENTER'
    ls.select_by_visibility = True; ls.select_by_edge_types = True
    ls.select_silhouette = True; ls.select_border = True; ls.select_crease = True; ls.select_external_contour = True
    fs.crease_angle = 2.2   # radians: only sharp edges
    for g in list(lst.geometry_modifiers): lst.geometry_modifiers.remove(g)
    sn = lst.geometry_modifiers.new('wobble', 'SPATIAL_NOISE'); sn.amplitude = wobble; sn.scale = 12; sn.octaves = 2
    tn = lst.thickness_modifiers.new('ink', 'NOISE'); tn.amplitude = line_px * 0.55; tn.period = 18; tn.blend = 'ADD'

def paper(path, strength=0.5, seed=3):
    """Multiply a warm paper grain over a rendered image (keeps alpha). Run after rendering."""
    from PIL import Image, ImageFilter
    import random
    im = Image.open(path).convert('RGBA'); w, h = im.size
    rnd = random.Random(seed)
    # grain: blurred noise at two scales, warm tint
    def layer(scale, blur):
        sw, sh = max(1, w // scale), max(1, h // scale)
        n = Image.new('L', (sw, sh)); n.putdata([rnd.randint(0, 255) for _ in range(sw * sh)])
        return n.resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(blur))
    big, fine = layer(24, 6), layer(2, 0.6)
    g = Image.blend(big, fine, 0.45)
    lo, hi = (226, 214, 188), (255, 251, 240)
    tint = Image.merge('RGB', [g.point(lambda v, a=a, b=b: int(a + (b - a) * v / 255)) for a, b in zip(lo, hi)])
    rgb = im.convert('RGB')
    from PIL import ImageChops
    mult = ImageChops.multiply(rgb, tint)
    out = Image.blend(rgb, mult, strength)
    out.putalpha(im.getchannel('A'))
    out.save(path)
