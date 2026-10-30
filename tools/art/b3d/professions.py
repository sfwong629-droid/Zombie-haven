"""Survivor professions as data. Same body, skeleton and animations for all of them.

Add a profession: copy an entry, change body/hair/wear. Every 'wear' item is a
function in wardrobe.py, optionally with settings: ('shirt', {'colour': ...}).
"""
# Body templates: the only body shapes. A survivor = template + skin + hair + face + wear.
TEMPLATES = {
    'average': {'height': 1.0, 'shoulders': 1.0, 'hips': 1.0, 'belly': 1.0, 'bulk': 1.0},
    'broad':   {'height': 1.03, 'shoulders': 1.12, 'hips': 1.04, 'belly': 1.1, 'bulk': 1.09},
    'slight':  {'height': .96, 'shoulders': .92, 'hips': 1.04, 'belly': .95, 'bulk': .93},
    # storybook: about three heads tall, big round head, short torso and legs, stubby arms (ink reference)
    'storybook': {'height': 1.0, 'shoulders': .8, 'hips': .86, 'belly': .9, 'bulk': .84, 'arm_thick': .62, 'delt': .55, 'cloth': .5,
                  'head_scale': 1.38, 'legs': .66, 'torso': .8, 'arm_scale': .52, 'nose': .45, 'eye_size': 1.15, 'smile': True, 'head_up': -6,
                  'eye_y': -.17, 'eye_x': .36, 'mouth_y': .6, 'head_shape': (.88, .94, 1.06), 'chin': True, 'snap_face': True},
}
SKIN = ['#f2c4a0', '#e8b08a', '#d99a72', '#c98e6a', '#a86a48', '#8e5a3e', '#6a4030']
HAIR_COLOURS = ['#d8a854', '#c0602a', '#8a4a2a', '#4a3020', '#2a1f18', '#1a1210', '#b8b0a0']
HAIR_STYLES = ['spiky', 'messy', 'short', 'bun', 'ponytail', 'none']

PROFESSIONS = {
    'farmer': {
        'body': {'template': 'average', 'skin': '#e8b08a', 'beard': '#b8864a', 'brow': '#8a5a2a'},
        'hair': 'swept', 'hair_colour': '#d8a854', 'seed': 3,
        'wear': [('shirt', {'colour': '#7a8a46', 'pattern': 'plaid', 'accent': '#3a4a26', 'sleeves': 'rolled'}),   # muted olive plaid (Look E)
                 ('pants', {'colour': '#8a6e46', 'pockets': True}), ('suspenders', {'colour': '#6a3e1e'}), ('belt', {'colour': '#4a2e18'}), ('boots', {'colour': '#7a5230'}),
                 ('tool', {'kind': 'hoe'})],   # straw hat off while we work on the face; add ('hat', {'kind': 'straw'}) back later
    },
    'medic': {
        'body': {'template': 'slight', 'skin': '#c98e6a', 'brow': '#2a1a10', 'eye_size': 1.08},
        'hair': 'bun', 'hair_colour': '#2a1f18', 'seed': 5,
        'wear': [('shirt', {'colour': '#8fb4cc', 'sleeves': 'rolled'}), ('pants', {'colour': '#5a6a4a', 'pockets': True}),
                 ('boots', {'colour': '#3a2a1e'}), ('belt', {'pouches': 1}), 'armband', 'gloves',
                 ('satchel', {'colour': '#7a5a34', 'cross': '#c0392b'}), ('tool', {'kind': 'medkit'})],
    },
    'guard': {
        'body': {'template': 'broad', 'skin': '#e3a87e', 'beard': '#4a3020', 'brow': '#3a2516', 'brow_tilt': 2},
        'hair': 'short', 'hair_colour': '#4a3020', 'seed': 7,
        'wear': [('jacket', {'colour': '#7a5a3a'}), ('vest', {'colour': '#5a5a3a'}), ('pants', {'colour': '#4a4a36', 'pockets': True}),
                 ('boots', {'colour': '#2b2420', 'tall': True}), ('belt', {'pouches': 2}), ('hat', {'kind': 'cap', 'colour': '#55553a'}),
                 'binoculars', 'rifle_on_back', ('gloves', {'colour': '#2b2420'})],
    },
    'cook': {
        'body': {'template': 'broad', 'skin': '#f0bf98', 'belly': 1.22, 'brow': '#5a2a1a', 'jaw': 1.08},
        'hair': 'bun', 'hair_colour': '#8a4a2a', 'seed': 9,
        'wear': [('shirt', {'colour': '#8a8a90', 'sleeves': 'rolled'}), ('pants', {'colour': '#3e3a44'}), ('boots', {'colour': '#2e2620'}),
                 ('apron', {'colour': '#ece4cc'}), ('hat', {'kind': 'bandana', 'colour': '#c0392b'}), ('tool', {'kind': 'ladle'})],
    },
    'scavenger': {
        'body': {'template': 'slight', 'skin': '#f2c4a0', 'brow': '#8a3a1a', 'brow_tilt': -4},
        'hair': 'spiky', 'hair_colour': '#c0602a', 'seed': 11,
        'wear': [('jacket', {'colour': '#d0742e'}), ('pants', {'colour': '#6a6a4a', 'pockets': True}), ('boots', {'colour': '#4a3626', 'tall': True}),
                 ('scarf', {'colour': '#5a6a7a'}), ('backpack', {'colour': '#6a5a3a', 'bedroll': '#4a6a3a', 'size': 1.15}),
                 ('belt', {'pouches': 2}), ('tool', {'kind': 'crowbar'})],
    },
    'engineer': {
        'body': {'template': 'average', 'skin': '#8e5a3e', 'brow': '#1a1210', 'beard': '#1a1210'},
        'hair': 'short', 'hair_colour': '#1a1210', 'seed': 13,
        'wear': [('shirt', {'colour': '#c9c2ad', 'sleeves': 'rolled'}), ('overalls', {'colour': '#3f5a8a'}), ('boots', {'colour': '#3a2a1e'}),
                 ('belt', {'pouches': 3, 'colour': '#5a3a1e'}), ('hat', {'kind': 'hardhat'}), 'goggles', ('tool', {'kind': 'wrench'}),
                 ('gloves', {'colour': '#a8823a'})],
    },
}
_GUY = {'body': {'template': 'storybook', 'skin': '#f6d0ae', 'brow': '#3a2516'},
        'hair': 'swoop', 'hair_colour': '#6a4428', 'seed': 2,
        'wear': [('shirt', {'colour': '#e4dcc6', 'sleeves': 'rolled', 'buttons': False}), ('pants', {'colour': '#3e5a86'}),
                 ('belt', {'colour': '#4a2e18'}), ('boots', {'colour': '#4a3424'})]}
PROFESSIONS['guy_smooth'] = {**_GUY, 'body': {**_GUY['body'], 'smooth': True}}
PROFESSIONS['guy_facet'] = _GUY
_SB = {**_GUY['body'], 'smooth': True}
PROFESSIONS['guy_scav'] = {'body': {**_SB, 'skin': '#e8bc96'}, 'hair': 'swoop', 'hair_colour': '#7a3e22', 'seed': 4,
    'wear': [('jacket', {'colour': '#c8742e'}), ('pants', {'colour': '#6a6a4a', 'pockets': True}), ('boots', {'colour': '#4a3626'}),
             ('scarf', {'colour': '#5a6a7a'}), ('backpack', {'colour': '#6a5a3a', 'bedroll': '#4a6a3a'}), ('belt', {'pouches': 2}), ('tool', {'kind': 'crowbar'})]}
PROFESSIONS['guy_guard'] = {'body': {**_SB, 'skin': '#c48a62'}, 'hair': 'swoop', 'hair_colour': '#2a1f18', 'seed': 6,
    'wear': [('shirt', {'colour': '#6a7a5a', 'sleeves': 'rolled', 'buttons': False}), ('vest', {'colour': '#4a4a36'}), ('pants', {'colour': '#4a4a3a', 'pockets': True}),
             ('boots', {'colour': '#2b2420', 'tall': True}), ('belt', {'pouches': 2}), 'rifle_on_back', 'binoculars']}
ORDER = ['farmer', 'medic', 'guard', 'cook', 'scavenger', 'engineer']

# Body-shape review: bare figures, same head and face, only the body numbers change.
_BARE = {'hair': 'swoop', 'hair_colour': '#6a4428', 'seed': 2,
         'wear': [('shirt', {'colour': '#c9c4b8', 'sleeves': 'short', 'buttons': False, 'collar': False}), ('pants', {'colour': '#6a6e78'}), ('boots', {'colour': '#4a3a2e'})]}
_SHAPES = {
    'shape_a': {'bulk': 1.12, 'shoulders': .96, 'arm_thick': .85, 'belly': 1.0, 'delt': 1.0, 'cloth': 1.0},   # first version (too buff)
    'shape_b': {},                                                                                          # chosen: now the storybook default
    'shape_c': {'bulk': .72, 'shoulders': .72, 'hips': .9, 'arm_thick': .55, 'belly': .88},                  # slight
    'shape_d': {'bulk': .74, 'shoulders': .74, 'hips': .92, 'arm_thick': .56, 'belly': .9, 'legs': .76, 'torso': .86},   # slight, longer legs
}
for _k, _v in _SHAPES.items():
    PROFESSIONS[_k] = {**_BARE, 'body': {**_GUY['body'], 'smooth': True, **_v}}
