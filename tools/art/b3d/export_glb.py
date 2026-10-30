"""Export one survivor as a skinned, animated GLB for the web viewer.

Run: python3 tools/art/b3d/export_glb.py OUT.glb [farmer]
Materials become plain Principled colours; the ink look (bands, plaid lines)
travels in material extras (zh_base, zh_shadow, zh_lines) for the viewer to rebuild.
"""
import bpy, math, os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import inkstyle, survivor
inkstyle.DEFAULTS.update(bands=3, hatch=False)
from professions import PROFESSIONS

OUT = sys.argv[1]; NAME = sys.argv[2] if len(sys.argv) > 2 else 'farmer'
bpy.ops.wm.read_factory_settings(use_empty=True)
rig = survivor.build(PROFESSIONS[NAME], origin=(0, 0, 0), facing=0, tag=NAME)
ao = rig['arm']

# plain materials + metric line spacing for the viewer
for role, o in rig['parts']:
    o.name = f'{NAME}_{role}_{o.name}'
    dims = o.dimensions
    for i, m in enumerate(o.data.materials):
        if m is None or 'zh_base' not in m: continue
        lines = []
        if 'zh_lines' in m:
            spec = eval(m['zh_lines']); spec = [spec] if isinstance(spec[0], str) else spec
            for sp in spec:
                axis, spacing = sp[0], sp[1]; width = sp[2] if len(sp) > 2 else .09
                col = sp[3] if len(sp) > 3 and sp[3] else '#0d0906'; st = sp[4] if len(sp) > 4 else .75
                if m['zh_coord'] == 'Generated': spacing *= max(dims['XYZ'.index(axis)], 1e-3)
                lines.append([axis, spacing, width, col, st])
        nm = bpy.data.materials.new(m.name + '_web'); nm.use_nodes = True
        bsdf = nm.node_tree.nodes['Principled BSDF']
        bsdf.inputs['Base Color'].default_value = inkstyle.lin(m['zh_base']); bsdf.inputs['Roughness'].default_value = 1
        nm['zh_base'] = m['zh_base']; nm['zh_shadow'] = m['zh_shadow']; nm['zh_lines'] = json.dumps(lines)
        o.data.materials[i] = nm

# animation clips pushed to NLA so the exporter writes them as separate animations
ao.animation_data_create()
def clip(name, fn, n):
    act = bpy.data.actions.new(name); ao.animation_data.action = act
    for i in range(n + 1):
        survivor.pose(rig, fn((i % n) / n))
        for pb in ao.pose.bones:
            pb.keyframe_insert('rotation_euler', frame=i + 1); pb.keyframe_insert('location', frame=i + 1)
    tr = ao.animation_data.nla_tracks.new(); tr.name = name
    tr.strips.new(name, 1, act); ao.animation_data.action = None
clip('idle', survivor.idle, 48)
clip('walk', survivor.walk, 24)
survivor.pose(rig, survivor.idle(0))
bpy.context.scene.render.fps = 24
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_extras=True, export_animations=True,
                          export_animation_mode='NLA_TRACKS', export_apply=False, export_skins=True,
                          export_yup=True, export_materials='EXPORT')
print('exported', OUT, os.path.getsize(OUT))
